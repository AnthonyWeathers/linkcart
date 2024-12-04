from flask import Flask, request, jsonify, session
from flask_socketio import SocketIO, join_room, emit, disconnect
import eventlet
import jinja2

from functools import wraps  # For creating decorators
import logging  # For logging events and errors
from flask_limiter import Limiter  # For rate limiting
from flask_limiter.util import get_remote_address  # Utility for rate limiter
from flask_wtf.csrf import CSRFProtect, generate_csrf
import jwt  # For token-based authentication
import datetime  # For token expiration

# need to install flask limited and jwt?

# probably used if I'm making batches of
# 5+ saved products per viewing page
# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker

from model import connect_to_db, db
import os
import crud

# used to get the batches of 5 videos
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from flask_cors import CORS

app = Flask(__name__)
app.secret_key = 'dev' # think of a separate key for jwt
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000")
#socketio = SocketIO(app, cors_allowed_origins='*')  # Enable CORS if needed

csrf = CSRFProtect(app)  # Enable CSRF protection

# Rate limiter initialization
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per day", "50 per hour"])

# Logging configuration
logging.basicConfig(level=logging.INFO)

# Ensure session cookies are secure and http-only
app.config['SESSION_COOKIE_SECURE'] = True  # Only send cookies over HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Disable access to cookies via JavaScript

# Optionally set SameSite to Lax or Strict for better CSRF protection
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

app.jinja_env.undefined = jinja2.StrictUndefined # for debugging purposes

CORS(app, supports_credentials=True, origins=["http://localhost:3000"])  # Enable CORS for all routes
# setting origins ensures that the backend connects to the port 3000 that the React server is hosted on, change if using a different
# port for the React side

def create_jwt(user):
    """Generates a JWT token for a user."""
    payload = {
        "user_id": user.id,
        "username": user.username,
        "isOnline": user.isOnline,  # Include the mode in the token
        "exp": datetime.utcnow() + timedelta(hours=12)  # Token expiry
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token


@app.route('/refresh', methods=['POST'])
def refresh_token():
    refresh_token = request.json.get("refresh_token")
    if not refresh_token:
        return jsonify({"error": "No refresh token provided"}), 400
    
    try:
        payload = jwt.decode(refresh_token, app.secret_key, algorithms=["HS256"])
        user_id = payload['user_id']
        # Optionally validate against a list of valid refresh tokens if tracking them server-side.
        
        # Create a new access token
        user = crud.get_user_by_id(user_id)
        new_access_token = create_jwt(user)
        return jsonify({"access_token": new_access_token})
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Refresh token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid refresh token"}), 403

# JWT token verification helper
def verify_token(token):
    try:
        payload = jwt.decode(token, app.secret_key, algorithms=["HS256"])
        return payload  # Return the decoded payload if valid
    except jwt.ExpiredSignatureError:
        logging.warning("Token expired")
        return None
    except jwt.InvalidTokenError:
        logging.error("Invalid token")
        return None

def token_required(f):
    """Unified token decorator for Flask routes and Socket.IO events."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if this is a Flask request or Socket.IO event
        token = None
        if request:  # REST API
            token = request.headers.get('Authorization')
        elif args and hasattr(args[0], 'args'):  # Socket.IO
            token = args[0].args.get('token')

        if not token:
            logging.warning("No token provided")
            if not request:
                disconnect()# For Socket.IO
            return jsonify({"error": "Token is required"}), 401
        
        user_payload = verify_token(token)
        if not user_payload:
            if not request:
                disconnect() # For Socket.IO
            return jsonify({"error": "Invalid or expired token"}), 401
        
        # Attach the user payload to the request or pass via kwargs
        if request:
            request.user_payload = user_payload
        else:
            kwargs['user'] = user_payload
        return f(*args, **kwargs)
    return decorated_function

@app.route("/current-user", methods=['GET'])
@csrf.exempt  # Exempt from CSRF to simplify GET request handling
@limiter.limit("10 per minute")  # Rate limiting for login checks
def check_user():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({"error": "Missing token"}), 401
    
    token = token.split(" ")[1]  # Strip the 'Bearer ' part
    user_payload = verify_token(token)
    
    if not user_payload:
        return jsonify({"error": "Invalid or expired token"}), 401
    
    user_id = user_payload['user_id']  # Extract user_id from the token payload
    user = crud.get_user(id=user_id)

    pending_request = True if crud.get_friend_requests(receiver_id=user_id) else False
    if user:
        logging.info(f"User check successful for user {user.username}")
        return jsonify({"user": user.username, "hasNewRequests": pending_request})
    else:
        logging.warning("Couldn't retrieve user")
        return jsonify({"error": "Couldn't retrieve user"}), 404

@app.route('/messages/community', methods=['GET'])
@csrf.exempt  # Exempt because it's a safe GET request
@limiter.limit("15 per minute")  # Rate limiting
def get_public_messages():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Missing token'}), 401
    
    token = token.split(" ")[1]  # Strip the 'Bearer ' part
    user_payload = verify_token(token)
    
    if not user_payload:
        return jsonify({"error": "Invalid or expired token"}), 401
    
    isOnline = user_payload.get('isOnline', False)  # Extract 'isOnline' from the token payload
    if not isOnline:
        logging.warning("User tried accessing community messages while offline")
        return jsonify({'error': 'You are offline. Community features are not available.'}), 403
    
    messages = crud.get_community_messages()  # Fetch all messages
    logging.info(f"Fetched {len(messages)} community messages")
    return jsonify([
        {
            'id': message.id,
            'username': message.user.username,  # Use the relationship to get the username
            'content': message.content,
            'timestamp': message.timestamp.isoformat()  # Format timestamp as string
        }
        for message in messages
    ])

@socketio.on('message')
@token_required  # Require token-based authentication
def handle_message(data, user):
    # The 'user' object is passed from the token_required decorator, which contains the user details
    if not user:
        socketio.emit('message_response', {'success': False, 'error': 'User not authenticated'})
        return

    # Get message content and username from the data payload
    message_content = data.get('message')

    logging.info(f"Message received from {user['username']}: {message_content}")

    message = crud.create_community_message(user['user_id'], message_content)
    logging.info(f"Created new message with ID {message.id}")

    # Emit the message to all connected clients
    socketio.emit('message_response', {
        'success': True,
        'id': message.id,
        'username': user['username'],  # Use the user object for the username
        'content': message.content,
        'timestamp': message.timestamp.isoformat()  # Format timestamp as string
    }, broadcast=True)

""" User Login/Registration related endpoints """
@app.route("/login", methods=["POST"])
@csrf.exempt  # Exempt from CSRF as JWT will be used
def login():
    username = request.json.get("username")
    password = request.json.get("password")

    user = crud.get_user(username=username, password=password)

    # for session usage
    if user:
        #session['user_id'] = user.id # Save user ID in session
        #session['mode'] = user.isOnline  # Store the user's mode (online/offline) in session
        token = create_jwt(user)
        return jsonify({"message": "Logged in successfully", 
                        # "user": user.username,
                        # "isOnline": user.isOnline
                        "token": token
                        })
    else:
        return jsonify({"error": "Invalid credentials"}), 401
    
@app.route("/register", methods=["POST"])
def register():
    username = request.json.get("username")
    password = request.json.get("password")
    if crud.get_user(username=username, password=password):
        logging.warning(f"Registration failed: Username {username} already in use.")
        return jsonify({"error": "This username is already in use, please use another."}), 400
    
    new_user = crud.create_user(username, password)
    #session['user_id'] = new_user.id
    #session['mode'] = new_user.isOnline  # Store the user's mode (online/offline) in session
    token = create_jwt(new_user)
    logging.info(f"User {new_user.username} registered successfully.")
    return jsonify({
        "message": "Your account was successfully created",
        # "user": new_user.username,
        # "isOnline": new_user.isOnline
        "token": token
        }), 201

@app.route("/logout", methods=["POST"])
@csrf.exempt  # Exempt as there’s no state-changing server-side logic in logout here
def logout():
    session.clear()  # Clear the session data
    logging.info("User logged out.")
    return jsonify({"message": "Logged out successfully"})

# with connect and disconnect, are linked with online or offline
# so could call toggle isOnline here
@socketio.on('connect')
@token_required
def handle_connect(user=None):
    user_id = user["id"]
    toggled_user = crud.set_user_online_status(user_id, True)  # Update the database to online
    if toggled_user:
        logging.info(f"User {toggled_user.username} is now online")
        join_room("community")  # Join the community room

        # For future features involving updating ui based off
        # a user's online stauts
        # socketio.emit('status_update', {
        #     "user_id": user_id,
        #     "isOnline": True
        # }, broadcast=True)  # Notify all clients
    else:
        logging.error("Failed to toggle mode during connection")
    # user_id = session.get("user_id")
    # if user_id is not None:
    #     # Join a room with the user's ID
    #     join_room(user_id)
    #     print(f"User {user_id} connected and joined room.")
    # else:
    #     print("User not logged in, connection attempt rejected.")

@socketio.on('disconnect')
@token_required
def handle_disconnect(user=None):
    user_id = user["id"]
    toggled_user = crud.set_user_online_status(user_id, False)  # Explicit toggle
    if toggled_user:
        logging.info(f"User {toggled_user.username} is now offline")

        # For future features involving updating ui based off
        # a user's online stauts
        # socketio.emit('status_update', {
        #     "user_id": user_id,
        #     "isOnline": False
        # }, broadcast=True)
    else:
        logging.error("Failed to update online status on disconnect")
    # user_id = session.get("user_id")
    # if user_id is not None:
    #     print(f"User {user_id} disconnected.")

""" Toggle mode endpoint """
# @app.route("/toggle-mode", methods=["POST"])
# def toggle_mode():
#     user_id = session.get('user_id')  # Get user ID from session
#     if not user_id:
#         return jsonify({"error": "User not logged in"}), 401

#     # Call the crud function to toggle the mode
#     user = crud.toggle_mode(user_id)
#     if user:
#         # Update the session with the new mode
#         session['mode'] = user.isOnline
#         return jsonify({
#             "message": f"User is now {'online' if user.isOnline else 'offline'}",
#             "isOnline": user.isOnline
#         })
#     else:
#         return jsonify({"error": "Failed to toggle mode"}), 400

""" Add Products Endpoints """
@app.route("/submit-product", methods=["POST"])
def save():
    # when user saves/adds a new product
    url = request.json.get("url")
    price = request.json.get("price")
    productName = request.json.get("productName")
    category = request.json.get("category")
    user_id = session.get("user_id")

    product = crud.create_product(user_id, url, price, productName, category)
    if product:
        return jsonify({
                "save": True,
                "message": 'Product added'
        })
    else:
        return jsonify({
            "save": False,
            "message": 'Failed to add product'
        })

@app.route("/delete-product", methods=["DELETE"])
def delete():
    user_id = session.get("user_id")  # Assuming you have session user_id
    productId = int(request.json.get("id"))

    product = crud.delete_product(productId)
    if product:
        user_products = crud.get_products(user_id=user_id)
        user_products_data = [{
            "productId": product.id,
            "url": product.url,
            "price": product.price,
            "productName": product.productName,
            "category": product.category,
            "favorited": product.favorited
        } for product in user_products]
        return jsonify({
            "success": True,
            "message": "Product deleted",
            "products": user_products_data  # Only return remaining products for this user
        })
    else:
        return jsonify({
            "success": False,
            "message": "Product not found or doesn't belong to the user"
        }), 404

@app.route("/products", methods=["GET"])
def getProducts():
    user_id = session.get("user_id")  # Assuming you have session user_id tracking the current user
    user_products = crud.get_products(user_id=user_id)

    # Convert each product object to a dictionary
    user_products_data = [{
        "productId": product.id,
        "url": product.url,
        "price": product.price,
        "productName": product.productName,
        "category": product.category,
        "favorited": product.favorited
    } for product in user_products]

    return jsonify({
        "success": True,
        "message": "User products fetched successfully",
        "products": user_products_data,
    })

@app.route("/edit-product", methods=["PUT"])
def editProduct():
    user_id = session.get("user_id")
    product_id = int(request.json.get("id"))

    url = request.json.get("url")
    price = request.json.get("price")
    productName = request.json.get("productName")
    category = request.json.get("category")

    product = crud.update_product(
        product_id, 
        url=url, 
        price=price, 
        productName=productName, 
        category=category
    )

    if product:
        return jsonify({
            "success": True,
            "products": [{
                "productId": product.id,
                "url": product.url,
                "price": product.price,
                "productName": product.productName,
                "category": product.category,
                "favorited": product.favorited
            } for product in crud.get_products(user_id=user_id)]
        })

    # If no matching product was found
    return jsonify({
        "success": False,
        "message": 'Product not found or editing failed'
    }), 400
    
@app.route("/favorite-product", methods=["PUT"])
def favoriteProduct():
    user_id = session.get("user_id")
    productId = int(request.json.get("id"))

    product = crud.toggle_favorited(productId)
    if product:
        user_products = [{
            "productId": product.id,
            "url": product.url,
            "price": product.price,
            "productName": product.productName,
            "category": product.category,
            "favorited": product.favorited
        } for product in crud.get_products(user_id=user_id)]
        return jsonify({
                "success": True,
                "products": user_products
        })
    return jsonify({
        "success": False,
        "error-msg": "Product favoriting process failed"
    }), 400

""" Profile Endpoints """
@app.route('/user/<username>')
def profile(username):
    user = crud.get_user(username=username)
    current_user_id = session.get('user_id')
    isOnline = session.get('mode')

    # If the user is offline, return an error message
    if not isOnline:
        return jsonify({'error': 'You are offline. Community features are not available.'}), 403

    if isOnline:
        if not user:
            return jsonify({'error': 'User not found'}), 404
        is_friend = False
        sent_request = False
        received_request = False

        favorited_products = [product for product in crud.get_products(user_id=user.id, favorited=True)]

        # Check if the current user is friends with the profile user
        if user.id != current_user_id:
            are_friends = crud.check_friendship(user.id, current_user_id)
            existing_sent_request = crud.get_friend_requests(receiver_id=user.id, sender_id=current_user_id, status='pending')
            existing_received_request = crud.get_friend_requests(receiver_id=current_user_id, sender_id=user.id, status='pending')

            if are_friends:
                is_friend = True
            elif existing_sent_request:
                sent_request = True
            elif existing_received_request:
                received_request = True

        # Return profile data, favorites, and friend status
        return jsonify({
            'favoriteProducts': [{
                "productId": product.id,
                "productName": product.productName,
                "url": product.url,
                "price": product.price,
                "category": product.category
            } for product in favorited_products],
            'user': {
                "username": user.username,
                "description": user.description
            },
            'isFriend': is_friend,
            'sentRequest': sent_request,
            'receivedRequest': received_request
        })
    # If mode is neither online nor valid
    return jsonify({'error': 'Invalid user mode status'}), 400

@app.route('/user/<username>/edit-description', methods=['POST'])
def editDescription(username):
    user_id = session.get('user_id')
    user = crud.get_user(username=username)
    new_description = request.json.get("description")

    isOnline = session.get('mode')

    if not isOnline:
        return jsonify({'error': 'You are offline. Community features are not available.'}), 403
    
    if user_id != user.id:
        return jsonify({'error': 'You can only edit your own description'}), 403
    
    if user and new_description:
        user = crud.update_user(user_id, description=new_description)
        return jsonify({'message': 'Description updated successfully!'})
    return jsonify({'error': 'User not found'}), 404

""" Friend Request Endpoints """
@app.route('/make-request', methods=['POST'])
def make_request():
    user_id = session.get("user_id")
    receiver_username = request.json.get('friend_username')
    
    receiver = crud.get_user(username=receiver_username)

    isOnline = session.get('mode')

    if not isOnline:
        return jsonify({'error': 'You are offline. Community features are not available.'}), 403

    if receiver:
        receiver_id = receiver.id

        # Check if they are already friends
        if crud.check_friendship(user_id, receiver_id):
            return jsonify({'error': 'You are already friends with this user.'})

        # Check for an existing request
        if (crud.get_friend_requests(receiver_id=receiver.id, sender_id=user_id, status='pending') or 
        crud.get_friend_requests(receiver_id=user_id, sender_id=receiver.id, status='pending')):
            return jsonify({'error': 'A friend request is already pending.'})
        
        # Add the new friend request
        new_request = crud.create_friend_request(user_id, receiver.id)
        
        # Emit a WebSocket event to notify the receiving user
        currentUser = crud.get_user(id=user_id)
        # Emit to the room of the receiving user with their username as the room name
        socketio.emit('new_friend_request', {
            'sender_username': currentUser.username,
            'receiver_username': receiver_username
        }, room=receiver_id)

        return jsonify({'message': 'Friend request sent successfully!'})

    return jsonify({'error': 'User not found.'}), 404

@app.route('/accept-friend', methods=['POST'])
def accept_friend():
    # Retrieve user and friend details
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({'error': 'Authentication required.'}), 401

    friend_username = request.json.get('friend_username')
    
    # Find the friend's user object by their username
    friend = crud.get_user(username=friend_username)

    isOnline = session.get('mode')

    if not isOnline:
        return jsonify({'error': 'You are offline. Community features are not available.'}), 403

    if friend:
        # Check if they are already friends
        if crud.check_friendship(user_id, friend.id):
            return jsonify({'error': 'You are already friends with this user.'})
        
        # Find the friend request and validate it
        friend_request = crud.get_friend_requests(receiver_id=user_id, sender_id=friend.id, status='pending')

        if not friend_request:
            return jsonify({'error': 'No pending friend request found from this user.'}), 404
        
        # Add the friendship
        friendship = crud.create_friendship(user_id, friend.id)
        
        # Remove the request from the requests list
        deleted_request = crud.delete_friend_request(friend_request[0].id)
        
        return jsonify({'message': 'Friend request accepted successfully!', 
                        'friend': {'id': friend.id, 'username': friend.username}})

    return jsonify({'error': 'User of the friend request not found.'}), 404

@app.route('/decline-friend', methods=['POST'])
def decline_friend():
    # Retrieve user and friend details
    user_id = session.get("user_id")
    isOnline = session.get('mode')
    if not isOnline:
        return jsonify({'error': 'You are offline. Community features are not available.'}), 403
    
    other_username = request.json.get('friend_username')
    
    # Find the friend's user object by their username
    other_user = crud.get_user(username=other_username)

    if other_user:
        
        # Get the pending friend request
        friend_request = crud.get_friend_requests(receiver_id=user_id, sender_id=other_user.id, status='pending')
        
        if not friend_request:
            return jsonify({'error': 'No pending friend request found from this user.'}), 404

        # Remove the pending friend request
        deleted_request = crud.delete_friend_request(friend_request[0].id)
        
        return jsonify({'success': True, 'message': 'Friend request declined successfully!'})
    
    return jsonify({'error': 'User of the friend request not found.'}), 404

@app.route('/friend-requests', methods=['GET'])
def get_friend_requests():
    # Retrieve the current user's ID from the session
    user_id = session.get("user_id")
    isOnline = session.get('mode')
    if not isOnline:
        return jsonify({'error': 'You are offline. Community features are not available.'}), 403
    
    # Get all pending requests where the current user is the receiver
    user_requests = crud.get_friend_requests(receiver_id=user_id)

    # Find the usernames of the senders
    sender_usernames = [request.sender.username for request in user_requests]

    # Return the list of usernames
    return jsonify({'success': True, 'sender_usernames': sender_usernames})

""" Friends endpoints """
@app.route('/remove-friend', methods=['POST'])
def remove_friend():
    user_id = session.get("user_id")
    isOnline = session.get('mode')
    if not isOnline:
        return jsonify({'error': 'You are offline. Community features are not available.'}), 403
    
    friend_username = request.json.get('friend_username')
    
    # Find the friend's user object by their username
    friend_user = crud.get_user(username=friend_username)

    if friend_user:

        deleted_friendship = crud.delete_friendship(user_id, friend_user.id)

        return jsonify({'message': 'Friend removed successfully!'})
    
    return jsonify({'error': 'User not found.'}), 404

@app.route('/friends', methods=['GET'])
def get_friends():
    user_id = session.get('user_id')  # Get current user's ID from session
    if not user_id:
        return jsonify({'error': 'User not logged in'}), 401
    
    isOnline = session.get('mode')
    if not isOnline:
        return jsonify({'error': 'You are offline. Community features are not available.'}), 403
    
    print(f"Received request to /friends from user_id: {user_id}")  # Debug

    # Find all friend relationships

    friendships = crud.get_friends(user_id)

    # Retrieve the user data for all the friends
    friend_list = [
        {
            'id': friend.id,
            'username': friend.username
        }
        for friendship in friendships
        for friend in [crud.get_user(id=friendship.user1_id if friendship.user1_id != user_id else friendship.user2_id)]
    ]

    return jsonify({'friends': friend_list})

if __name__ == "__main__":
    connect_to_db(app, echo=False)
    socketio.run(app, debug=True, port=8000, host="localhost")