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

# test to ensure I code my project to handle the data correctly before adding in database handling
products = [
    {
        "productId": 1,
        "user_id": 1,  # Belongs to user "john_doe"
        "url": "http://example.com/product1",
        "price": 49.99,
        "productName": "Wireless Mouse",
        "category": "Electronics",
        "favorited": False
    },
    {
        "productId": 2,
        "user_id": 1,  # Belongs to user "john_doe"
        "url": "http://example.com/product2",
        "price": 299.99,
        "productName": "Mechanical Keyboard",
        "category": "Electronics",
        "favorited": False
    },
    {
        "productId": 3,
        "user_id": 1,  # Belongs to user "john_doe"
        "url": "http://example.com/product3",
        "price": 79.99,
        "productName": "Gaming Headset",
        "category": "Electronics",
        "favorited": False
    },
    {
        "productId": 4,
        "user_id": 2,  # Belongs to user "jane_smith"
        "url": "http://example.com/product4",
        "price": 19.99,
        "productName": "Phone Stand",
        "category": "Accessories",
        "favorited": False
    },
    {
        "productId": 5,
        "user_id": 2,  # Belongs to user "jane_smith"
        "url": "http://example.com/product5",
        "price": 499.99,
        "productName": "Smartwatch",
        "category": "Wearables",
        "favorited": False
    }
]

users = [
    {
        "id": 1,
        # "username": "john_doe",
        "username": "mei",
        # "password": "password123",  # Ideally, this would be hashed
        "password": "123",  # Ideally, this would be hashed
        "description": "Tech enthusiast",
        "favoriteProducts": []  # Will populate later through interactions
    },
    {
        "id": 2,
        # "username": "jane_smith",
        "username": "kiana",
        # "password": "securepass456",
        "password": "test",
        "description": "Loves gadgets",
        "favoriteProducts": []  # Will populate later
    }
]

# Temporary storage for friendships
friendships = []

# Temporary storage for friend requests
requests = []
    
# Simulated array of public messages
public_messages = []

def get_user_products(user_id):
    # Assuming `products` is a list of dicts or objects where each product has a `user_id` field
    user_products = [product for product in products if product['user_id'] == user_id]
    # user_products = crud.getProductsByUserId(user_id)
    return user_products

def add_friendship(friendships, userA, userB):
    friendship = tuple(sorted([userA, userB]))  # Sort to avoid duplicates
    if friendship not in friendships:
        friendships.append(friendship)

@app.route("/submit-product", methods=["POST"])
def save():
    # when user saves/adds a new product
    url = request.json.get("url")
    price = request.json.get("price")
    productName = request.json.get("productName")
    category = request.json.get("category")
    user_id = session.get("user_id")

    # Create a product dictionary to store product details
    product = {
        "productId": len(products) + 1,  # Assigns a productId to match how the database would assign ids to products
        "user_id": user_id,
        "url": url,
        "price": price,
        "productName": productName,
        "category": category,
        "favorited": False
    }
    products.append(product)

    # product = crud.createProduct(user_id, url, price, productName, category) # maybe add false, or set default false in crud
    # if product:
    #       db.session.add(product)
    #       db.session.commit()
    return jsonify({
            "save": True,
            "message": 'Product added'
    })

@app.route("/delete-product", methods=["DELETE"])
def delete():
    user_id = session.get("user_id")  # Assuming you have session user_id
    productId = int(request.json.get("id"))

    # product = crud.getProductById(productId)
    # if product:
    #   db.session.delete(product)
    #   db.session.commit()

    # Find product by ID and ensure it belongs to the user
    for i, product in enumerate(products):
        if product['id'] == productId and product['user_id'] == user_id:
            products[i] = ''  # This symbolizes deletion from your "database"
            # products.pop(i) more memory efficient way to simulate deleting the product
            # products = [product for product in products if product['id'] != productId] would remove the need for for and if statement
            break
        else:
            return jsonify({
                "success": False,
                "message": "Product not found or doesn't belong to the user"
            }), 404

    # Fetch remaining user products using the helper function
    user_products = get_user_products(user_id)

    print("Supposedly deleted a product, the id is:", productId)

    # returning a jsonify object has a default 200 code, so no need to explicitly write it, unlike with any other code like 404
    return jsonify({
        "success": True,
        "message": "Product deleted",
        "products": user_products  # Only return remaining products for this user
    })


@app.route("/products", methods=["GET"])
def getProducts():
    user_id = session.get("user_id")  # Assuming you have session user_id tracking the current user
    user_products = get_user_products(user_id)
    # user_products = crud.getProductsByUserId(user_id)

    return jsonify({
        "success": True,
        "message": "User products fetched successfully",
        "products": user_products
    })

@app.route("/edit-product", methods=["PUT"])
def editProduct():
    user_id = session.get("user_id")
    product_id = int(request.json.get("id"))
    # product = crud.getProductById(product_id)
    # product.url = request.json.get("url")
    # product.price = request.json.get("price")
    # product.productName = request.json.get("productName")
    # product.category = request.json.get("category")
    # product.favorited = product.get("favorited", False)
    # db.session.commit()
    
    # Retrieve the list of products for the current user
    user_products = get_user_products(user_id)

    # likely need to do if product then update data of product, commit, then return list
    # return jsonify({
    #     "success": True,
    #     "products": user_products
    # })

    # Find the product that needs to be updated
    for product in user_products:
        if product["productId"] == product_id:
            # Update the product fields with the new data
            product["url"] = request.json.get("url")
            product["price"] = request.json.get("price")
            product["productName"] = request.json.get("productName")
            product["category"] = request.json.get("category")
            # Keep the existing "favorited" status
            product["favorited"] = product.get("favorited", False)

            # Normally, here you would save the changes back to the database

            # Fetch updated user products again using the helper function
            updated_user_products = get_user_products(user_id)
            
            return jsonify({
                "success": True,
                "products": updated_user_products
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
    products[productId - 1]["favorited"] = not products[productId - 1]["favorited"]
    # product = crud.getProductById(productId)
    # product.favorited = not product.favorited
    # db.session.commit()
    # return product, or get list of products and return it

    # Retrieve the list of products for the current user
    user_products = get_user_products(user_id)
    user = next((u for u in users if (u['id'] == user_id)), None)
    if products[productId - 1]["favorited"]:
        user['favoriteProducts'].append(products[productId - 1])
    else:
        user['favoriteProducts'].remove(products[productId - 1])
    return jsonify({
            "success": True,
            "products": user_products
    })
    
@app.route("/register", methods=["POST"])
def register():
    username = request.json.get("username")
    password = request.json.get("password")
    # Check to see if a registered user exists with this username
    if any(user['username'] == username for user in users):
        return jsonify({"success": False, "message": "This username is already in use, please use another."}), 400
    # if crud.get_user_by_username(username):
    #     return jsonify({"success": False, "message": "This username is already in use, please use another."}), 400
    # new_user = crud.create_user(username, password)

    # simulate creating a new user
    new_user = {
        "id": len(users) + 1,# Assigns a user id to match how the database would assign ids to users
        "username": username,
        "password": password,
        "description": '', # not used at creation
        "favoriteProducts": [] # not used at creation
    }
    # db.session.add(user)
    # db.session.commit()
    # for database simulation
    users.append(new_user)
    session['user_id'] = new_user['id']
    return jsonify({
        "success": True, 
        "message": "Your account was successfully created",
        "user": new_user['username']
        #"user": new_user.to_dict()  # Include user info in the response if needed, likely to bring user to the main part
        # of the app upon registering
        }), 201

@app.route("/login", methods=["POST"])
def login():
    username = request.json.get("username")
    password = request.json.get("password")
    
    # Simulate user lookup in the users array (a list of User objects for now)
    user = next((u for u in users if u['username'] == username and u['password'] == password), None)

    # Uncomment this line once you implement a database query
    # user = crud.get_user_by_username_and_password(username, password)

    # for session usage
    if user:
        session['user_id'] = user['id'] # Save user ID in session
        return jsonify({"success": True, "message": "Logged in successfully", "user": user['username']})
    else:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

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

@app.route('/user/<username>')
def profile(username):
    user = next((u for u in users if u['username'] == username), None)
    # user = crud.getUserByUsername(username)
    current_user_id = session.get('user_id')

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Check if the current user is friends with the profile user
    is_friend = any((f[0] == current_user_id and f[1] == user['id']) or (f[1] == current_user_id and f[0] == user['id']) for f in friendships)
    # error while running code: TypeError: tuple indices must be integers or slices, not str
    # is_friend = crud.getFriendshipById(current_user_id, user.id)
    existing_sent_request = any((r["sender_id"] == current_user_id and r["receiver_id"] == user['id']) for r in requests)
    existing_received_request = any((r["receiver_id"] == current_user_id and r["sender_id"] == user['id']) for r in requests)
    # existing_request = crud.getFriendRequestByIds(current_user_id, user.id)
    # may need to check other order if order of variable names matters in sql query
    
    # Return profile data, favorites, and friend status
    # simply user.favoriteProducts and such
    print(user)
    return jsonify({
        'favoriteProducts': user.get('favoriteProducts', []),
        # 'favoriteProducts': user['favoriteProducts'],
        'user': {
            "username": user["username"],
            "description": user["description"]
        },
        'isFriend': is_friend,
        'sentRequest': existing_sent_request,
        'receivedRequest': existing_received_request
    })

@app.route('/user/<username>/edit-description', methods=['POST'])
def editDescription(username):
    user_id = session.get('user_id')
    user = next((u for u in users if (u['id'] == user_id and u['username'] == username)), None)
    # user = crud.getUserById(user_id)
    new_description = request.json.get("description")
    if user and new_description:
        user['description'] = new_description
        # user.description = new_description
        # db.session.commit()
        return jsonify({'success': True, 'message': 'Description updated successfully!'})
    return jsonify({'success': False, 'message': 'User not found'}), 404

@app.route("/current-user", methods=['GET'])
def check_user():
    user_id = session.get("user_id")
    user = next((u for u in users if u['id'] == user_id), None)
    # user = crud.getUserById(user_id)
    if user:
        return jsonify({"user": user['username']})
    else:
        return jsonify({"message": "Couldn't retrieve user"}), 404

@app.route('/messages/community', methods=['GET'])
def get_public_messages():
    # return crud.getPublicMessages()
    return jsonify(public_messages)

# would replace the post public message function
@socketio.on('message')
def handle_message(data):
    print('Received message: ' + data['message'])
    # Get user ID from session
    user_id = session.get('user_id')
    # print('current session user_id is: ', user_id)
    
    if user_id is None:
        # If no user ID is in the session, you might want to handle this case
        socketio.emit('message_response', {'success': False, 'error': 'User not authenticated'})
        return
    
    # user = crud.getUserById(user_id)  # Retrieve current user from session
    # username = user.username  # Fetch the username
    # message = data['message']

    # Here you might want to save the message to your database
    # For example:
    # new_message = Message(username=username, message=message)
    # new_message = crud.createPublicMessage(user_id=user_id, username=username, message=message)
    # db.session.add(new_message)
    # db.session.commit()

    user = next((u for u in users if u['id'] == user_id), None)
    # print('current user of message: ', user)
    message = data['message']

    new_message = {
        'user_id': user_id,
        'username': user['username'],  # Store username for frontend display
        'message': message
    }
    public_messages.append(new_message)

    # Emit the message to all connected clients
    # socketio.emit('message_response', {'success': True, 'username': username, 'message': message})
    socketio.emit('message_response', {'success': True, 'username': user['username'], 'message': message})


# Below endpoint not used, above endpoint does the same job but also for websocket
@app.route('/messages/community', methods=['POST'])
def post_public_message():
    print('Entered post public message endpoint')
    print(request.headers)  # Print request headers to check for cookies
    data = request.get_json()
    user_id = session.get('user_id')  # Get user ID from session
    print(user_id)
    # Check if user is authenticated
    if not user_id:
        print('User not authenticated')
        return jsonify({'success': False, 'message': 'User not authenticated'}), 401
    
    # Fetch username based on user_id (pseudo-code, adjust based on your user model)
    user = next((u for u in users if u['id'] == user_id), None)
    # user = crud.getUserById(user_id)
    if not user:
        print('User not found')
        return jsonify({'success': False, 'message': 'User not found'}), 404
    
    # new_message = crud.createPublicMessage(user_id, user.username, data['message'])
    # db.session.add(new_message)
    # db.session.commit()
    new_message = {
        'user_id': user_id,
        'username': user['username'],  # Store username for frontend display
        'message': data['message']
    }
    public_messages.append(new_message)

    print('Message posted successfully:', new_message)
    return jsonify({'success': True, 'message': 'Message posted successfully!'}), 200

@app.route('/add-friend', methods=['POST'])
def add_friend():
    user_id = session.get("user_id")
    friend_username = request.json.get('friend_username')
    
    # Find the friend's user object by their username
    friend_user = next((u for u in users if u['username'] == friend_username), None)
    # friend_user = crud.getUserByUsername(friend_username)

    if friend_user:
        friend_id = friend_user['id']

        # Check if the friendship already exists
        existing_friendship = next(((f[0] == user_id and f[1] == friend_id) or (f[1] == user_id and f[0] == friend_id) for f in friendships), None)
        # existing_friendship = crud.getFriendshipById(user_id, friend_user.id)

        if existing_friendship:
            return jsonify({'success': False, 'message': 'You are already friends with this user.'})
        
        # may need to add two extra elements; friendship status (pending, true), and maybe who added the other, so the request
        # is sent to the person being added than both

        # Example usage
        # friendships = []
        add_friendship(friendships, user_id, friend_id)
        add_friendship(friendships, friend_id, user_id)  # This won't create a duplicate
        # print(friendships)  # Output: [(1, 2)]

        # Add the friendship (both directions for bidirectional friendship)
        # friendships.append({'user_id': user_id, 'friend_id': friend_id})
        # friendships.append({'user_id': friend_id, 'friend_id': user_id})
        # new_friendship1 = crud.createFriendship(user_id, friend_id)
        # new_friendship2 = crud.createFriendship(friend_id, user_id)
        # db.session.add(new_friendship1, new_friendship2)
        # db.session.commit()

        return jsonify({'success': True, 'message': 'Friend added successfully!'})
    
    return jsonify({'success': False, 'message': 'User not found.'}), 404

@app.route('/remove-friend', methods=['POST'])
def remove_friend():
    user_id = session.get("user_id")
    friend_username = request.json.get('friend_username')
    
    # Find the friend's user object by their username
    friend_user = next((u for u in users if u['username'] == friend_username), None)
    # friend_user = crud.getUserByUsername(friend_username)

    if friend_user:
        friend_id = friend_user['id']

        # Remove the friendship in both directions
        global friendships
        friendships = [f for f in friendships if not 
                    #    ((f['user_id'] == user_id and f['friend_id'] == friend_id) or
                    #     (f['user_id'] == friend_id and f['friend_id'] == user_id))]
                    # should achieve same state
                        ((f[0] == user_id and f[1] == friend_id) or
                        (f[1] == user_id and f[0] == friend_id))]
        # crud.deleteFriendship(user_id, friend_id)
        # crud.deleteFriendship(friend_id, user_id)
        # db.session.commit()

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

    # Retrieve the user data for all the friends
    friend_list = [u for u in users if u['id'] in friend_ids]
    # friends = crud.getFriendsByUserId(user_id)
    # friend_list = [friend.to_dict() for friend in friends]

    return jsonify({'success': True, 'friends': friend_list})

@app.route('/make-request', methods=['POST'])
def make_request():
    user_id = session.get("user_id")
    receiver_username = request.json.get('friend_username')
    
    receiver = next((u for u in users if u['username'] == receiver_username), None)
    # receiver = crud.get_user_by_username(receiver_username)

    if receiver:
        receiver_id = receiver['id']

        # Check if they are already friends
        if any((f[0] == user_id and f[1] == receiver_id) or (f[1] == user_id and f[0] == receiver_id) for f in friendships):
            return jsonify({'success': False, 'message': 'You are already friends with this user.'})
        
        # Check for an existing request
        if any((r["sender_id"] == user_id and r["receiver_id"] == receiver_id) or 
               (r["receiver_id"] == user_id and r["sender_id"] == receiver_id) for r in requests):
            return jsonify({'success': False, 'message': 'A friend request is already pending.'})
        
        # Add the new friend request
        requests.append({"sender_id": user_id, "receiver_id": receiver_id})
        
        # Emit a WebSocket event to notify the receiving user
        currentUser = next((u for u in users if u['id'] == user_id), None)
        # Emit to the room of the receiving user with their username as the room name
        socketio.emit('new_friend_request', {
            'sender_username': currentUser['username'],
            'receiver_username': receiver_username
        }, room=receiver_id)

        # Uncomment for actual database interaction
        # new_request = crud.create_friend_request(user_id, receiver.id)
        # db.session.add(new_request)
        # db.session.commit()

        # socketio.emit('message_response', {'success': True, 'username': user['username'], 'message': message})

        return jsonify({'success': True, 'message': 'Friend request sent successfully!'})

    return jsonify({'success': False, 'message': 'User not found.'}), 404

@app.route('/accept-friend', methods=['POST'])
def accept_friend():
    # Retrieve user and friend details
    user_id = session.get("user_id")
    friend_username = request.json.get('friend_username')
    
    # Find the friend's user object by their username
    friend = next((u for u in users if u['username'] == friend_username), None)
    # friend = crud.get_user_by_username(friend_username)

    if friend:
        friend_id = friend['id']
        
        # Check if they are already friends
        if any((f[0] == user_id and f[1] == friend_id) or (f[1] == user_id and f[0] == friend_id) for f in friendships):
            return jsonify({'success': False, 'message': 'You are already friends with this user.'})
        
        # Find the friend request and validate it
        friend_request = next((r for r in requests if r["receiver_id"] == user_id and r["sender_id"] == friend_id), None)
        
        if not friend_request:
            return jsonify({'success': False, 'message': 'No pending friend request found from this user.'}), 404
        
        # Add the friendship
        friendships.append((user_id, friend_id))
        
        # Remove the request from the requests list
        requests.remove(friend_request)

        # Uncomment for actual database interaction
        # friend_request = crud.getFriendRequest(user_id, friend.id)

        # crud.create_friendship(user_id, friend.id)
        # crud.create_friendship(friend.id, user_id)
        # crud.delete_friend_request(friend_request.id)
        # db.session.commit()
        
        return jsonify({'success': True, 'message': 'Friend request accepted successfully!', 'friend': friend})

    return jsonify({'success': False, 'message': 'User of the friend request not found.'}), 404

@app.route('/decline-friend', methods=['POST'])
def decline_friend():
    # Retrieve user and friend details
    user_id = session.get("user_id")
    other_username = request.json.get('friend_username')
    
    # Find the friend's user object by their username
    other_user = next((u for u in users if u['username'] == other_username), None)
    # other_user = crud.get_user_by_username(other_username)

    if other_user:
        other_user_id = other_user['id']
        
        # Get the pending friend request
        friend_request = next((r for r in requests if r["receiver_id"] == user_id and r["sender_id"] == other_user_id), None)
        # friend_request = crud.getFriendRequest(user_id, other_user.id)
        
        if not friend_request:
            return jsonify({'success': False, 'message': 'No pending friend request found from this user.'}), 404

        # Remove the pending friend request
        requests.remove(friend_request)
        # Uncomment for actual database interaction
        # crud.delete_friend_request(friend_request.id)
        # db.session.commit()
        
        return jsonify({'success': True, 'message': 'Friend request declined successfully!'})
    
    return jsonify({'success': False, 'message': 'User of the friend request not found.'}), 404

@app.route('/friend-requests', methods=['GET'])
def get_friend_requests():
    # Retrieve the current user's ID from the session
    user_id = session.get("user_id")
    
    # Get all pending requests where the current user is the receiver
    user_requests = [r for r in requests if r["receiver_id"] == user_id]
    # user_requests = crud.getReceivedRequests(user_id)

    # Find the usernames of the senders
    sender_usernames = [
        next((user['username'] for user in users if user['id'] == r['sender_id']), None) 
        for r in user_requests
    ]

    # Return the list of usernames
    return jsonify({'success': True, 'sender_usernames': sender_usernames})

if __name__ == "__main__":
#    app.env = "development"
    # connect_to_db(app, echo=False)
    # app.run(debug = True, port = 8000, host = "localhost")
    # socketio.run(app, host='0.0.0.0', port=5000)
    # replace app.run with line below so Flask server runs with
    # WebSocket support
    socketio.run(app, debug=True, port=8000, host="localhost")