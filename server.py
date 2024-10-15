from flask import Flask, request, jsonify, session
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

def get_user_products(user_id):
    # Assuming `products` is a list of dicts or objects where each product has a `user_id` field
    user_products = [product for product in products if product['user_id'] == user_id]
    return user_products

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

    return jsonify({
            "save": True,
            "message": 'Product added'
    })

@app.route("/delete-product", methods=["DELETE"])
def delete():
    user_id = session.get("user_id")  # Assuming you have session user_id
    productId = int(request.json.get("id"))

    # Find product by ID and ensure it belongs to the user
    for i, product in enumerate(products):
        if product['id'] == productId and product['user_id'] == user_id:
            products[i] = ''  # This symbolizes deletion from your "database"
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

    return jsonify({
        "success": True,
        "message": "User products fetched successfully",
        "products": user_products
    })

@app.route("/edit-product", methods=["PUT"])
def editProduct():
    user_id = session.get("user_id")
    product_id = int(request.json.get("id"))
    
    # Retrieve the list of products for the current user
    user_products = get_user_products(user_id)

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

    # Retrieve the list of products for the current user
    user_products = get_user_products(user_id)
    return jsonify({
            "success": True,
            "products": user_products
    })

@app.route('/api/user/<username>', methods=['GET'])
def get_user_profile(username):
    # Fetch the user profile by username (likely with database)
    # user = find_user_by_username(username)
    user = username # likely need to make a users array with
    # preset info, and use users[username] or users[userId]
    if user:
        favorite_products = [product for product in products if product['favorited']]
        return jsonify({
            "user": {
                "username": user['username'],
                "description": user['description'],
            },
            "favoriteProducts": favorite_products
        })
    else:
        return jsonify({
            "error": "User not found"
        }), 404
    
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

    # if user is None:
    #     return jsonify({"success": False, "message": "Invalid username or password"}), 401
    
    # # Convert user object to dictionary for JSON response
    # return jsonify({
    #     "success": True,
    #     "message": "Login successful",
    #     "user": user.to_dict()  # Send user info back as dictionary
    # }), 200

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

@app.route('/user/<username>')
def profile(username):
    # username = request.args.get("username")
    user = next((u for u in users if u['username'] == username), None)
    if user:
        user_products = get_user_products(user['id'])
        # would loop through user_products to grab all products whose favorited attribute is true
        # Filter only the products where favorited is True
        favorite_products = [p for p in user_products if p['favorited']]

        return jsonify({
            "favoriteProducts": favorite_products,
            "user": {
                "username": user["username"],
                "description": user["description"]
            }
        })

@app.route('/user/<username>/edit-description', methods=['POST'])
def editDescription(username):
    user = next((u for u in users if u['username'] == username), None)
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
    if user:
        return jsonify({"user": user['username']})
    else:
        return jsonify({"message": "Couldn't retrieve user"}), 404


if __name__ == "__main__":
#    app.env = "development"
    # connect_to_db(app, echo=False)
    app.run(debug = True, port = 8000, host = "localhost")