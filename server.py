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
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000", ping_timeout=30000, ping_interval=25000)
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
    token = jwt.encode(payload, app.secret_key, algorithm="HS256")
    return token

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

@app.route('/refresh', methods=['POST'])
@token_required
def refresh_token(user=None):
    """Refreshes the user's access token."""
    try:
        # User is injected by the `token_required` decorator
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        
        # Generate a new access token using the current user's data
        new_access_token = create_jwt(user)
        response = jsonify({"message": "Token refreshed successfully"})
        response.set_cookie(
            "access_token", 
            new_access_token, 
            httponly=True, 
            secure=False,  # False for local dev; True for production with HTTPS
            # secure=True,
            samesite='Strict') # or Lax
        return response
    
    except Exception as e:
        logging.exception("Error during token refresh")
        return jsonify({"error": "Failed to refresh token"}), 500



@app.route("/current-user", methods=['GET'])
@csrf.exempt  # Exempt from CSRF to simplify GET request handling
@limiter.limit("10 per minute")  # Rate limiting for login checks
@token_required  # Use the unified token decorator
def check_user(user=None):
    try:
        # User is injected by the @token_required decorator
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        
        user_id = user["user_id"]
        username = user["username"]
        
        # Check for pending friend requests
        pending_request = True if crud.get_friend_requests(receiver_id=user_id) else False

        logging.info(f"User check successful for user {username}")
        return jsonify({"user": username, "hasNewRequests": pending_request})

    except Exception as e:
        logging.exception("Unexpected error in /current-user")
        return jsonify({"error": "An unexpected error occurred in getting current user"}), 500

@app.route('/messages/community', methods=['GET'])
@csrf.exempt  # Exempt because it's a safe GET request
@limiter.limit("15 per minute")  # Rate limiting
@token_required  # Use the unified token decorator
def get_public_messages(user=None):
    try:
        # User is injected by the @token_required decorator
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        isOnline = user['isOnline']  # Extract 'isOnline' from the user payload
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

    except Exception as e:
        logging.exception("Unexpected error in retrieving community messages")
        return jsonify({"error": "An unexpected error occurred getting community messages"}), 500

@socketio.on('message')
@token_required  # Require token-based authentication
def handle_message(data, user):
    try:
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

    except Exception as e:
        logging.exception("Unexpected error in adding new message")
        return jsonify({"error": "An unexpected error occurred in adding new message"}), 500

""" User Login/Registration related endpoints """
@app.route("/login", methods=["POST"])
@csrf.exempt  # Exempt from CSRF as JWT will be used
def login():
    try:
        username = request.json.get("username")
        password = request.json.get("password")

        user = crud.get_user(username=username, password=password)

        if user:
            token = create_jwt(user)

            # Response object
            response = jsonify({
                "message": "Logged in successfully",
                "username": user.username,
                "isOnline": user.isOnline
                })

            # Set JWT token as HttpOnly cookie
            response.set_cookie(
                "jwtToken",
                token,
                httponly=True,  # Prevent JavaScript access
                # secure=True,  # Only allow over HTTPS
                secure=False,  # False for local dev; True for production with HTTPS
                samesite='Lax',  # CSRF protection
            )
            return response
        else:
            return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        logging.exception("Unexpected error in /login")
        return jsonify({"error": "An unexpected error occurred while logging in"}), 500
    
@app.route("/register", methods=["POST"]) # update register and login frontend to use the returned data
@csrf.exempt  # Exempt from CSRF as JWT will be used
def register():
    try:
        username = request.json.get("username")
        password = request.json.get("password")
        if crud.get_user(username=username, password=password):
            logging.warning(f"Registration failed: Username {username} already in use.")
            return jsonify({"error": "This username is already in use, please use another."}), 400
        
        new_user = crud.create_user(username, password)
        
        if new_user:
            token = create_jwt(new_user)
            logging.info(f"User {new_user.username} registered successfully.")

            # Response object
            response = jsonify({
                "message": "Logged in successfully",
                "user": new_user.username,
                "isOnline": new_user.isOnline
            })
            # Set JWT token as HttpOnly cookie
            response.set_cookie(
                "jwtToken",
                token,
                httponly=True,  # Prevent JavaScript access
                # secure=True,  # Only allow over HTTPS
                secure=False,  # False for local dev; True for production with HTTPS
                samesite='Lax',  # CSRF protection
            )
            return response
        else:
            return jsonify({"error": "Failed to register user"}), 401

    except Exception as e:
        logging.exception("Unexpected error in /register")
        return jsonify({"error": "An unexpected error occurred while registing user"}), 500

@app.route("/logout", methods=["POST"])
@csrf.exempt  # Exempt as there’s no state-changing server-side logic in logout here
def logout():
    session.clear()  # Clear the session data
    logging.info("User logged out.")
    response = jsonify({"message": "Logged out successfully"})
    response.set_cookie(
        "jwtToken", 
        "", 
        expires=0, 
        httponly=True, 
        secure=True,
        samesite='Lax',  # CSRF protection
    )
    return response
    # return jsonify({"message": "Logged out successfully"})

@socketio.on('connect')
@token_required
def handle_connect(user=None):
    try:
        user_id = user["id"]
        toggled_user = crud.set_user_online_status(user_id, True)  # Update the database to online
        if toggled_user:
            logging.info(f"User {toggled_user.username} is now online")
            join_room("community")  # Join the community room

            # For future features involving updating ui based off
            # a user's online stauts
            socketio.emit('status_update', {
                "user_id": user_id,
                "isOnline": True
            }, broadcast=True)  # Notify all clients
        else:
            logging.error("Failed to toggle mode during connection")

    except Exception as e:
        logging.exception("Unexpected error in connecting socketio")
        return jsonify({"error": "An unexpected error occurred in connecting user to socketio"}), 500

@socketio.on('disconnect')
@token_required
def handle_disconnect(user=None):
    try:
        user_id = user["id"]
        toggled_user = crud.set_user_online_status(user_id, False)  # Explicit toggle
        if toggled_user:
            logging.info(f"User {toggled_user.username} is now offline")

            # For future features involving updating ui based off
            # a user's online stauts
            socketio.emit('status_update', {
                "user_id": user_id,
                "isOnline": False
            }, broadcast=True)
        else:
            logging.error("Failed to update online status on disconnect")

    except Exception as e:
        logging.exception("Unexpected error in disconnecting socketio")
        return jsonify({"error": "An unexpected error occurred while disconnecting from socketio"}), 500

""" Products Endpoints """
@app.route("/submit-product", methods=["POST"])
@csrf.exempt  # CSRF protection is typically applied to forms; for JSON requests, use exemptions carefully
@token_required
@limiter.limit("10/minute")  # Restrict this endpoint to 10 requests per minute per IP
def save(user=None):
    try:
        logging.info("User %s is attempting to save a product", user["id"])
        
        # when user saves/adds a new product
        url = request.json.get("url")
        price = request.json.get("price")
        productName = request.json.get("productName")
        category = request.json.get("category")

        # For if want all 4 fields to be filled
        # Validate required fields
            # if not all([url, price, productName, category]):
                # logger.warning("User %s submitted incomplete product data", user["id"])
                # return jsonify({"error": "Missing required fields"}), 400

        product = crud.create_product(user['id'], url, price, productName, category)
        if product:
            logging.info("User %s successfully saved a product", user["id"])
            return jsonify({
                    "save": True,
                    "message": 'Product added'
            }), 201
        else:
            logging.error("Failed to save product for user %s", user["id"])
            return jsonify({
                "save": False,
                "message": 'Failed to add product'
            })
    except Exception as e:
        logging.exception("Error saving product for user %s", user["id"])
        return jsonify({"error": "An error occurred while adding the product", "details": str(e)}), 500

@app.route("/delete-product", methods=["DELETE"])
@csrf.exempt
@token_required
@limiter.limit("5/minute")  # Restrict this endpoint to 5 requests per minute
def delete(user=None):
    try:
        logging.info("User %s is attempting to delete a product", user["id"])
        
        productId = int(request.json.get("id"))
        if not productId:
            logging.warning("User %s failed to provide a product ID for deletion", user["id"])
            return jsonify({"error": "Product ID is required"}), 400

        products = crud.get_products(id=productId)
        if not products:
            logging.warning("User %s attempted to delete a nonexistent product", user["id"])
            return jsonify({"error": "Product not found"}), 404
        
        product = products[0]
        if product.user_id != user["id"]:
            logging.warning("User %s attempted to delete an unauthorized product", user["id"])
            return jsonify({"error": "Access denied"}), 403

        crud.delete_product(productId)
        logging.info("User %s successfully deleted product %s", user["id"], productId)

        return jsonify({
            "message": "Product deleted",
            #"products": user_products_data  # Only return remaining products for this user
        })
    except Exception as e:
        logging.exception("Error deleting product for user %s", user["id"])
        return jsonify({"error": "Failed to delete product", "details": str(e)}), 500

@app.route("/products", methods=["GET"])
@token_required
@limiter.limit("20/minute")
def getProducts(user=None):
    try:
        logging.info("User %s is fetching their products", user["id"])
        user_products = crud.get_products(user_id=user['id'])

        # Convert each product object to a dictionary
        user_products_data = [{
            product.to_dict()
        } for product in user_products]

        return jsonify({
            "message": "User products fetched successfully",
            "products": user_products_data,
        })
    except Exception as e:
        logging.exception("Error fetching products for user %s", user["id"])
        return jsonify({"error": "Failed to fetch products", "details": str(e)}), 500

@app.route("/edit-product", methods=["PUT"])
@csrf.exempt
@token_required
@limiter.limit("5/minute")
def editProduct(user=None):
    try:
        logging.info("User %s is attempting to edit a product", user["id"])

        product_id = int(request.json.get("id"))
        if not product_id: #or not all([url, price, productName, category]):
            logging.warning("User %s failed to provide a product ID for editing", user["id"])
            return jsonify({"error": "Missing product or required fields"}), 400

        products = crud.get_products(id=product_id)
        if not products:
            logging.warning("User %s attempted to edit a nonexistent product", user["id"])
            return jsonify({"error": "Product not found"}), 404
        
        product = products[0]
        if product.user_id != user["id"]:
            logging.warning("User %s attempted to edit an unauthorized product", user["id"])
            return jsonify({"error": "Access denied"}), 403

        updated_product = crud.update_product(
            product_id, 
            url=request.json.get("url"), 
            price=request.json.get("price"), 
            productName=request.json.get("productName"), 
            category=request.json.get("category")
        )
        if updated_product:
            logging.info("User %s successfully edited product %s", user["id"], product_id)
            return jsonify({
                "product": updated_product.to_dict()
            })

        # If no matching product was found
        logging.error("Failed to edit product %s for user %s", product_id, user["id"])
        return jsonify({
            "error": 'Error occurred while updating product'
        }), 400
    except Exception as e:
        logging.exception("Error editing product for user %s", user["id"])
        return jsonify({"error": "Failed to edit product", "details": str(e)}), 500
    
@app.route("/favorite-product", methods=["PUT"])
@csrf.exempt
@token_required
@limiter.limit("5/minute")
def favoriteProduct(user=None):
    try:
        productId = int(request.json.get("id"))
        if not productId:
            logging.warning("User %s failed to provide a product ID for favoriting", user["id"])
            return jsonify({"error": "Product ID is required"}), 400
        
        products = crud.get_products(id=productId)
        if not products:
            logging.warning("User %s attempted to favorite a nonexistent product", user["id"])
            return jsonify({"error": "Product not found"}), 404
        
        product = products[0]
        if product.user_id != user["id"]:
            logging.warning("User %s attempted to favorite an unauthorized product", user["id"])
            return jsonify({"error": "Access denied"}), 403
        
        updated_product = crud.toggle_favorited(productId)
        if updated_product:
            logging.info("User %s successfully favorited product %s", user["id"], productId)
            return jsonify({
                    "favorited": updated_product.favorited
            })
        logging.error("Failed to favorite product %s for user %s", productId, user["id"])
        return jsonify({
            "error": "Product favoriting process failed"
        }), 400
    except Exception as e:
        logging.exception("Error favoriting product for user %s", user["id"])
        return jsonify({"error": "Failed to toggle favorite", "details": str(e)}), 500

""" Profile Endpoints """
@app.route('/user/<username>')
@limiter.limit("10/minute")  # Rate-limiting: 10 requests per minute
@csrf.exempt  # Enforce CSRF protection
@token_required
def profile(username, user=None):
    """Fetch profile details of the given username."""
    # `user` is the authenticated user, injected by @token_required
    # `username` is the user profile being accessed
    try:
        logging.info(f"Authenticated user {user['username']} is accessing profile of {username}")
        current_user_id = user["user_id"]

        # Check if authenticated user is online
        if not user["isOnline"]:
            logging.warning(f"User {user['username']} attempted to access profiles while offline.")
            return jsonify({'error': 'You are offline. Community features are not available.'}), 403

        # Fetch the target user's data
        target_user = crud.get_user(username=username)
        if not target_user:
            logging.error(f"Profile for username {username} not found.")
            return jsonify({'error': 'User not found'}), 404

        # Determine friend/request status
        is_friend = False
        sent_request = False
        received_request = False

        if target_user.id != current_user_id:
            if crud.check_friendship(target_user.id, current_user_id):
                is_friend = True
            elif crud.get_friend_requests(receiver_id=target_user.id, sender_id=current_user_id, status='pending'):
                sent_request = True
            elif crud.get_friend_requests(receiver_id=current_user_id, sender_id=target_user.id, status='pending'):
                received_request = True

        # Fetch favorited products
        favorited_products = crud.get_products(user_id=target_user.id, favorited=True)

        logging.info(f"User {user['username']} successfully fetched profile data for {username}")
        return jsonify({
            'favoriteProducts': [product.to_dict() for product in favorited_products],
            'user': {
                "username": target_user.username,
                "description": target_user.description
            },
            'isFriend': is_friend,
            'sentRequest': sent_request,
            'receivedRequest': received_request
        })

    except Exception as e:
        logging.error(f"Error while fetching profile for username {username}: {str(e)}")
        return jsonify({'error': 'An error occurred while fetching the profile'}), 500

@app.route('/user/<username>/edit-description', methods=['POST'])
@limiter.limit("5/minute")  # Rate-limiting: 5 requests per minute
@csrf.exempt  # Enforce CSRF protection
@token_required
def editDescription(username, user=None):
    """Edit the description of the authenticated user's profile."""
    # `user` is the authenticated user
    try:
        logging.info(f"Authenticated user {user['username']} is attempting to edit their profile description.")
        current_user_id = user["user_id"]

        # Ensure the user is online
        if not user["isOnline"]:
            logging.warning(f"User {user['username']} attempted to edit description while offline.")
            return jsonify({'error': 'You are offline. Community features are not available.'}), 403

        # Ensure user is editing their own profile
        target_user = crud.get_user(username=username)
        if not target_user or target_user.id != current_user_id:
            logging.warning(f"User {user['username']} tried to edit the description of {username}.")
            return jsonify({'error': 'You can only edit your own description'}), 403

        # Validated the new description
        new_description = request.json.get("description")
        if not new_description:
            logging.warning(f"User {user['username']} submitted an empty description.")
            return jsonify({'error': 'Description cannot be empty'}), 400

        # Update description
        updated_user = crud.update_user(user_id=user.id, description=new_description)
        logging.info(f"User {user['username']} successfully updated their description.")
        return jsonify({'message': 'Description updated successfully!', 'description': updated_user.description})

    except Exception as e:
        logging.error(f"Error while editing description for {user['username']}: {str(e)}")
        return jsonify({'error': 'An error occurred while updating the description'}), 500

""" Friend Request Endpoints """
@app.route('/make-request', methods=['POST'])
@csrf.exempt  # Optional if you rely solely on token auth
@token_required
def make_request(user=None):
    try:
        if not user["isOnline"]:
            logging.warning(f"Offline user {user['username']} attempted to send a friend request.")
            return jsonify({'error': 'You are offline.'}), 403

        receiver_username = request.json.get('friend_username')
        receiver = crud.get_user(username=receiver_username)

        if not receiver:
            logging.error(f"User {user['username']} tried to request a non-existent user: {receiver_username}")
            return jsonify({'error': 'User not found.'}), 404
        
        # check if they're already friends
        if crud.check_friendship(user["id"], receiver.id):
            logging.info(f"User {user['username']} attempted to re-friend {receiver_username}.")
            return jsonify({'error': 'You are already friends.'}), 400
        # check if a pending request already exists
        if (crud.get_friend_requests(receiver_id=receiver.id, sender_id=user["id"], status="pending") or
        crud.get_friend_requests(receiver_id=user["id"], sender_id=receiver.id, status="pending")):
            logging.info(f"Duplicate friend request from {user['username']} to {receiver_username}.")
            return jsonify({'error': 'A friend request is already pending.'}), 400
        
        # Add the new friend request
        crud.create_friend_request(user["id"], receiver.id)
        logging.info(f"User {user['username']} sent a friend request to {receiver_username}.")

        # Emit to the room of the receiving user with their username as the room name
        socketio.emit('new_friend_request', {
            'sender_username': user['username'],
            'receiver_username': receiver_username
        }, room=receiver.id)

        return jsonify({'message': 'Friend request sent successfully!'})
    except Exception as e:
        logging.exception(f"Error processing friend request by {user['username']}: {str(e)}")
        return jsonify({'error': 'An error occurred'}), 404

@app.route('/accept-friend', methods=['POST'])
@csrf.exempt
@limiter.limit("5/minute")  # Accept requests are less frequent
@token_required
def accept_friend(user=None):
    try:
        if not user.get("isOnline"):
            logging.warning(f"Offline user {user['username']} attempted to accept a friend request.")
            return jsonify({'error': 'You are offline.'}), 403
        
        friend_username = request.json.get('friend_username')
        friend = crud.get_user(username=friend_username)

        if not friend:
            logging.error(f"User {user['username']} tried to accept a request from a non-existent user: {friend_username}.")
            return jsonify({'error': 'User not found.'}), 404
        
        friend_request = crud.get_friend_requests(receiver_id=user["id"], sender_id=friend.id, status="pending")
        if not friend_request:
            logging.info(f"No pending friend request from {friend_username} to {user['username']}.")
            return jsonify({'error': 'No pending friend request found.'}), 404
        
        crud.create_friendship(user["id"], friend.id)
        crud.delete_friend_request(friend_request[0].id)

        logging.info(f"User {user['username']} accepted a friend request from {friend_username}.")
        return jsonify({'message': 'Friend request accepted successfully!', 'friend': {'id': friend.id, 'username': friend.username}})
    except Exception as e:
        logging.exception(f"Error accepting friend request by {user['username']}: {str(e)}")
        return jsonify({'error': 'An error occurred.'}), 500

@app.route('/decline-friend', methods=['POST'])
@csrf.exempt
@limiter.limit("5/minute")  # Decline requests are infrequent
@token_required
def decline_friend(user=None):
    try:
        if not user.get("isOnline"):
            logging.warning(f"Offline user {user['username']} attempted to decline a friend request.")
            return jsonify({'error': 'You are offline.'}), 403

        other_username = request.json.get('friend_username')
        other_user = crud.get_user(username=other_username)

        if not other_user:
            logging.error(f"User {user['username']} tried to decline a request from a non-existent user: {other_username}.")
            return jsonify({'error': 'User not found.'}), 404

        friend_request = crud.get_friend_requests(receiver_id=user["id"], sender_id=other_user.id, status="pending")
        if not friend_request:
            logging.info(f"No pending friend request from {other_username} to {user['username']}.")
            return jsonify({'error': 'No pending friend request found.'}), 404

        crud.delete_friend_request(friend_request[0].id)
        logging.info(f"User {user['username']} declined a friend request from {other_username}.")
        return jsonify({'message': 'Friend request declined successfully!'})
    except Exception as e:
        logging.exception(f"Error declining friend request by {user['username']}: {str(e)}")
        return jsonify({'error': 'An error occurred.'}), 500

@app.route('/friend-requests', methods=['GET'])
@limiter.limit("10/minute")  # Can be queried frequently
@token_required
def get_friend_requests(user=None):
    try:
        if not user["isOnline"]:
            logging.warning(f"Offline user {user['username']} attempted to view friend requests.")
            return jsonify({'error': 'You are offline.'}), 403

        user_requests = crud.get_friend_requests(receiver_id=user["id"], status="pending")
        sender_usernames = [request.sender.username for request in user_requests]

        logging.info(f"User {user['username']} retrieved their pending friend requests.")
        return jsonify({'sender_usernames': sender_usernames})
    except Exception as e:
        logging.exception(f"Error retrieving friend requests for {user['username']}: {str(e)}")
        return jsonify({'error': 'An error occurred.'}), 500

""" Friends endpoints """
@app.route('/remove-friend', methods=['POST'])
@csrf.exempt  # CSRF exemption for token-based authentication
@limiter.limit("5/minute")  # Rate limiting: Max 5 requests per minute
@token_required
def remove_friend(user=None):
    try:
        # Ensure user is online
        if not user["isOnline"]:
            logging.warning(f"Offline user {user['username']} attempted to view friend requests.")
            return jsonify({'error': 'You are offline. Community features are not available.'}), 403
    
        friend_username = request.json.get('friend_username')
        friend_user = crud.get_user(username=friend_username)

        if not friend_user:
            logging.error(f"Friend user with {user['username']}, was not found.")
            return jsonify({'error': 'User not found.'}), 404

        # Delete the friendship
        deleted_friendship = crud.delete_friendship(user['id'], friend_user.id)
        if deleted_friendship:
            logging.info(f"Friendship removed: {user['username']} -> {friend_username}")
            return jsonify({'message': 'Friend removed successfully!'}), 200
    
        logging.warning(f"Failed to remove friendship: {user['username']} -> {friend_username}")
        return jsonify({'error': 'Failed to remove friend.'}), 500

    except Exception as e:
        logging.exception(f"Error in removing friend: {str(e)}")
        return jsonify({'error': 'An error occurred while removing the friend.'}), 500

@app.route('/friends', methods=['GET'])
@limiter.limit("10/minute")  # Rate limiting: Max 10 requests per minute
@token_required
def get_friends(user=None):
    try:
        # Ensure user is online
        if not user["isOnline"]:
            logging.warning(f"Offline user {user['username']} attempted to view friend requests.")
            return jsonify({'error': 'You are offline. Community features are not available.'}), 403

        # Find all friend relationships
        friendships = crud.get_friends(user["id"])

        # Retrieve the user data for all the friends
        friend_list = [
            {
                'id': friend.id,
                'username': friend.username
            }
            for friendship in friendships
            for friend in [crud.get_user(id=friendship.user1_id if friendship.user1_id != user["id"] else friendship.user2_id)]
        ]

        logging.info(f"Friend list retrieved for user_id: {user['id']} ({len(friend_list)} friends)")
        return jsonify({'friends': friend_list}), 200

    except Exception as e:
        logging.exception(f"Error in retrieving friends: {str(e)}")
        return jsonify({'error': 'An error occurred while retrieving friends.'}), 500

if __name__ == "__main__":
    connect_to_db(app, echo=False)
    socketio.run(app, debug=True, port=8000, host="localhost")