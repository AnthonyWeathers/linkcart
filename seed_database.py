"""
    Script to seed database.
    You'll have to enter the password to your server twice to have your database perform the drop and create db
    After doing that and no errors pop up, you're good to run 
"""

import os
from datetime import datetime
import model
from model import db, User, Products, CommunityMessage, FriendRequest, Friends
import server

# Drop and recreate the database
os.system("dropdb product-central")
os.system("createdb product-central")

model.connect_to_db(server.app)

with server.app.app_context():
    def create_users():
        # Create sample users
        user1 = User(username="alice", password="password123")
        user2 = User(username="bob", password="securepass")
        user3 = User(username="charlie", password="charliepass")
        db.session.add_all([user1, user2, user3])
        db.session.commit()

    def create_products():
        # Create sample products
        product1 = Products(user_id=1, url="https://example.com/product1", price="$19.99", productName="Widget A", category="Gadgets", favorited="No")
        product2 = Products(user_id=2, url="https://example.com/product2", price="$29.99", productName="Widget B", category="Gadgets", favorited="Yes")
        product3 = Products(user_id=3, url="https://example.com/product3", price="$39.99", productName="Widget C", category="Tools", favorited="No")
        db.session.add_all([product1, product2, product3])
        db.session.commit()

    def create_community_messages():
        # Create sample community messages
        message1 = CommunityMessage(user_id=1, content="Hello, world!", timestamp=datetime.now())
        message2 = CommunityMessage(user_id=2, content="Welcome to the community!", timestamp=datetime.now())
        db.session.add_all([message1, message2])
        db.session.commit()

    def create_friend_requests():
        # Create sample friend requests
        friend_request1 = FriendRequest(sender_id=1, receiver_id=2, status="pending", timestamp=datetime.now())
        db.session.add(friend_request1)
        db.session.commit()

    def create_friendship():
        # Create sample friendships
        friendship1 = Friends(user1_id=1, user2_id=3)
        db.session.add(friendship1)
        db.session.commit()

    db.create_all()
    create_users()
    create_products()
    create_community_messages()
    create_friend_requests()
    create_friendship()

    # Commit all changes
    # db.session.commit()