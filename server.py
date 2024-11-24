from flask import Flask, request, jsonify, session
from flask_socketio import SocketIO, join_room
import eventlet
import jinja2

# probably used if I'm making batches of
# 5+ saved products per viewing page
# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker

# from model import connect_to_db, db
import os
import crud

# used to get the batches of 5 videos
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from flask_cors import CORS

app = Flask(__name__)
app.secret_key = 'dev'
socketio = SocketIO(app, cors_allowed_origins='*')  # Enable CORS if needed

# Ensure session cookies are secure and http-only
app.config['SESSION_COOKIE_SECURE'] = True  # Only send cookies over HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Disable access to cookies via JavaScript

# Optionally set SameSite to Lax or Strict for better CSRF protection
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

app.jinja_env.undefined = jinja2.StrictUndefined # for debugging purposes

CORS(app, supports_credentials=True, origins=["http://localhost:3000"])  # Enable CORS for all routes
# setting origins ensures that the backend connects to the port 3000 that the React server is hosted on, change if using a different
# port for the React side

@app.route("/current-user", methods=['GET'])
def check_user():
    user_id = session.get("user_id")
    user = crud.get_user(id=user_id)

    pending_request = True if crud.get_friend_requests(receiver_id=user_id) else False
    if user:
        return jsonify({"user": user.username, "hasNewRequests": pending_request})
    else:
        return jsonify({"message": "Couldn't retrieve user"}), 404

@app.route('/messages/community', methods=['GET'])
def get_public_messages():
    messages = crud.get_community_messages()  # Fetch all messages
    return jsonify([
        {
            'id': message.id,
            'username': message.user.username,  # Use the relationship to get the username
            'content': message.content,
            'timestamp': message.timestamp.isoformat()  # Format timestamp as string
        }
        for message in messages
    ])

# would replace the post public message function
@socketio.on('message')
def handle_message(data):
    print('Received message: ' + data['message'])
    # Get user ID from session
    user_id = session.get('user_id')
    
    if user_id is None:
        # If no user ID is in the session, you might want to handle this case
        socketio.emit('message_response', {'success': False, 'error': 'User not authenticated'})
        return

    user = crud.get_user(id=user_id)

    if not user:
        socketio.emit('message_response', {'success': False, 'error': 'User not found'})
        return

    message = crud.create_community_message(user_id, data['message'])

    # new_message = {
    #     'user_id': user_id,
    #     'username': user.username,  # Store username for frontend display
    #     'message': data['message']
    # }

    # Emit the message to all connected clients
    socketio.emit('message_response', {
        'success': True,
        'id': message.id,
        'username': user.username,  # Use the user object for the username
        'content': message.content,
        'timestamp': message.timestamp.isoformat()  # Format timestamp as string
    })
    # socketio.emit('message_response', {'success': True, 'username': user.username, 'message': data['message']})

""" User Login/Registration related endpoints """
@app.route("/login", methods=["POST"])
def login():
    username = request.json.get("username")
    password = request.json.get("password")

    # Uncomment this line once you implement a database query
    user = crud.get_user(username=username, password=password)

    # for session usage
    if user:
        session['user_id'] = user['id'] # Save user ID in session
        return jsonify({"success": True, "message": "Logged in successfully", "user": user['username']})
    else:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401
    
@app.route("/register", methods=["POST"])
def register():
    username = request.json.get("username")
    password = request.json.get("password")
    if crud.get_user(username=username, password=password):
        return jsonify({"success": False, "message": "This username is already in use, please use another."}), 400
    
    new_user = crud.create_user(username, password)
    session['user_id'] = new_user['id']
    return jsonify({
        "success": True, 
        "message": "Your account was successfully created",
        "user": new_user.username
        #"user": new_user.to_dict()  # Include user info in the response if needed, likely to bring user to the main part
        # of the app upon registering
        }), 201

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()  # Clear the session data
    return jsonify({"success": True, "message": "Logged out successfully"})

@socketio.on('connect')
def handle_connect():
    user_id = session.get("user_id")
    if user_id is not None:
        # Join a room with the user's ID
        join_room(user_id)
        print(f"User {user_id} connected and joined room.")
    else:
        print("User not logged in, connection attempt rejected.")

@socketio.on('disconnect')
def handle_disconnect():
    user_id = session.get("user_id")
    if user_id is not None:
        print(f"User {user_id} disconnected.")

""" Add Products Endpoints """
@app.route("/submit-product", methods=["POST"])
def save():
    # when user saves/adds a new product
    url = request.json.get("url")
    price = request.json.get("price")
    productName = request.json.get("productName")
    category = request.json.get("category")
    user_id = session.get("user_id")

    product = crud.create_product(user_id, url, price, productName, category) # maybe add false, or set default false in crud
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
        user_products = crud.get_products(user_id)
        return jsonify({
            "success": True,
            "message": "Product deleted",
            "products": user_products  # Only return remaining products for this user
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

    return jsonify({
        "success": True,
        "message": "User products fetched successfully",
        "products": user_products
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

    # likely need to do if product then update data of product, commit, then return list
    if product:
        return jsonify({
            "success": True,
            "products": crud.get_products(user_id=user_id)
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
        user_products = crud.get_products(user_id=user_id)
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

    if not user:
        return jsonify({'error': 'User not found'}), 404
    is_friend = False
    sent_request = False
    received_request = False

    # Check if the current user is friends with the profile user
    is_friend = any((f[0] == current_user_id and f[1] == user['id']) or (f[1] == current_user_id and f[0] == user['id']) for f in friendships)
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
    # simply user.favoriteProducts and such
    print(user)
    return jsonify({
        'favoriteProducts': user.favorited_products,
        'user': {
            "username": user.username,
            "description": user.description
        },
        'isFriend': is_friend,
        'sentRequest': sent_request,
        'receivedRequest': received_request
    })

@app.route('/user/<username>/edit-description', methods=['POST'])
def editDescription(username):
    user_id = session.get('user_id')
    user = crud.get_user(username=username)
    new_description = request.json.get("description")
    if user and new_description:
        user = crud.update_user(user_id, description=new_description)
        return jsonify({'success': True, 'message': 'Description updated successfully!'})
    return jsonify({'success': False, 'message': 'User not found'}), 404

""" Friend Request Endpoints """
@app.route('/make-request', methods=['POST'])
def make_request():
    user_id = session.get("user_id")
    receiver_username = request.json.get('friend_username')
    
    receiver = crud.get_user(username=receiver_username)

    if receiver:
        receiver_id = receiver.id

        # Check if they are already friends
        if crud.check_friendship(user_id, receiver_id):
            return jsonify({'success': False, 'message': 'You are already friends with this user.'})

        # Check for an existing request
        if (crud.get_friend_requests(receiver_id=receiver.id, sender_id=user_id, status='pending') or 
        crud.get_friend_requests(receiver_id=user_id, sender_id=receiver.id, status='pending')):
            return jsonify({'success': False, 'message': 'A friend request is already pending.'})
        
        # Add the new friend request
        new_request = crud.create_friend_request(user_id, receiver.id)
        
        # Emit a WebSocket event to notify the receiving user
        currentUser = crud.get_user(id=user_id)
        # Emit to the room of the receiving user with their username as the room name
        socketio.emit('new_friend_request', {
            'sender_username': currentUser.username,
            'receiver_username': receiver_username
        }, room=receiver_id)

        return jsonify({'success': True, 'message': 'Friend request sent successfully!'})

    return jsonify({'success': False, 'message': 'User not found.'}), 404

@app.route('/accept-friend', methods=['POST'])
def accept_friend():
    # Retrieve user and friend details
    user_id = session.get("user_id")
    friend_username = request.json.get('friend_username')
    
    # Find the friend's user object by their username
    friend = crud.get_user(username=friend_username)

    if friend:
        # Check if they are already friends
        if crud.check_friendship(user_id, friend.id):
            return jsonify({'success': False, 'message': 'You are already friends with this user.'})
        
        # Find the friend request and validate it
        friend_request = crud.get_friend_requests(receiver_id=user_id, sender_id=friend.id, status='pending')

        if not friend_request:
            return jsonify({'success': False, 'message': 'No pending friend request found from this user.'}), 404
        
        # Add the friendship
        friendship = crud.create_friendship(user_id, friend.id)
        
        # Remove the request from the requests list
        request = crud.delete_friend_request(friend_request.id)
        
        return jsonify({'success': True, 'message': 'Friend request accepted successfully!', 'friend': friend})

    return jsonify({'success': False, 'message': 'User of the friend request not found.'}), 404

@app.route('/decline-friend', methods=['POST'])
def decline_friend():
    # Retrieve user and friend details
    user_id = session.get("user_id")
    other_username = request.json.get('friend_username')
    
    # Find the friend's user object by their username
    other_user = crud.get_user(username=other_username)

    if other_user:
        
        # Get the pending friend request
        friend_request = crud.get_friend_requests(receiver_id=user_id, sender_id=other_user.id, status='pending')
        
        if not friend_request:
            return jsonify({'success': False, 'message': 'No pending friend request found from this user.'}), 404

        # Remove the pending friend request
        request = crud.delete_friend_request(friend_request.id)
        
        return jsonify({'success': True, 'message': 'Friend request declined successfully!'})
    
    return jsonify({'success': False, 'message': 'User of the friend request not found.'}), 404

@app.route('/friend-requests', methods=['GET'])
def get_friend_requests():
    # Retrieve the current user's ID from the session
    user_id = session.get("user_id")
    
    # Get all pending requests where the current user is the receiver
    user_requests = crud.get_friend_requests(receiver_id=user_id)

    # Find the usernames of the senders
    # Friend Request has 
    # sender = db.relationship("User", foreign_keys=[sender_id], backref="sent_requests")
    # so means you can access sender, which are a user object meaning it has
    # access to username, but can i do .sender.username on a list of objects
    sender_usernames = user_requests.sender.username

    # Return the list of usernames
    return jsonify({'success': True, 'sender_usernames': sender_usernames})

""" Friends endpoints """
@app.route('/remove-friend', methods=['POST'])
def remove_friend():
    user_id = session.get("user_id")
    friend_username = request.json.get('friend_username')
    
    # Find the friend's user object by their username
    friend_user = crud.get_user(username=friend_username)

    if friend_user:

        deleted_friendship = crud.delete_friendship(user_id, friend_user.id)

        return jsonify({'success': True, 'message': 'Friend removed successfully!'})
    
    return jsonify({'success': False, 'message': 'User not found.'}), 404

@app.route('/friends', methods=['GET'])
def get_friends():
    user_id = session.get('user_id')  # Get current user's ID from session

    # Find all friend relationships where the current user is the "user_id"
    # need to figure out how to get all friends of user when friendships is a list of tuples
    # friend_ids = [f['friend_id'] for f in friendships if f['user_id'] == user_id]
    # adds friend_id to friend_ids list if friend_id does not match the user_id, else adds other_id
    # loops through friendships list with variables of other_id and friend_id for the element 0 and 1 of the tuple
    # only checks the tuples where user_id exists, otherwise skips the tuples containing ids of other users
    friend_ids = [
        friend_id if friend_id != user_id else other_id
        for (other_id, friend_id) in friendships
        if user_id in (other_id, friend_id) 
    ]

    friendships = crud.get_friends(user_id)

    # Retrieve the user data for all the friends
    friend_list = [crud.get_user(id=friendship.user1_id) 
                  if friendship.user1_id != user_id 
                  else crud.get_user(id=friendship.user2_id) 
                  for friendship in friendships]

    return jsonify({'success': True, 'friends': friend_list})

if __name__ == "__main__":
#    app.env = "development"
    # connect_to_db(app, echo=False)
    # app.run(debug = True, port = 8000, host = "localhost")
    # socketio.run(app, host='0.0.0.0', port=5000)
    # replace app.run with line below so Flask server runs with
    # WebSocket support
    socketio.run(app, debug=True, port=8000, host="localhost")