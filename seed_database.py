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
os.system("dropdb linkcart")
os.system("createdb linkcart")

model.connect_to_db(server.app)

with server.app.app_context():
    def create_users():
        """Create sample users."""
        user1 = User(username="alice", password="password123", description="Alice loves gadgets.")
        user2 = User(username="bob", password="securepass", description="Bob is a tech enthusiast.")
        user3 = User(username="charlie", password="charliepass", description="Charlie enjoys DIY projects.")
        db.session.add_all([user1, user2, user3])
        db.session.commit()

    def create_products():
        # Create sample products for user 1
        product1 = Products(user_id=1, url="https://example.com/product1", price="$19.99", productName="Widget A", category=["Gadgets"], favorited=False)
        product2 = Products(user_id=1, url="https://example.com/product2", price="$24.99", productName="Widget D", category=["Electronics", "Gadgets"], favorited=True)
        product3 = Products(user_id=1, url="https://example.com/product3", price="$14.99", productName="Widget E", category=["Accessories"], favorited=False)
        product4 = Products(user_id=1, url="https://example.com/product4", price="$49.99", productName="Widget F", category=["Home", "Kitchen"], favorited=True)
        product5 = Products(user_id=1, url="https://example.com/product5", price="$9.99", productName="Widget G", category=["Office"], favorited=False)
        
        # Additional products for user 2
        product6 = Products(user_id=2, url="https://example.com/product6", price="$34.99", productName="Widget H", category=["Gadgets"], favorited=True)
        product7 = Products(user_id=2, url="https://example.com/product7", price="$64.99", productName="Widget J", category=["Electronics", "Accessories"], favorited=False)
        
        # Additional products for user 3
        product8 = Products(user_id=3, url="https://example.com/product8", price="$54.99", productName="Widget I", category=["Tools"], favorited=False)
        product9 = Products(user_id=3, url="https://example.com/product9", price="$74.99", productName="Widget K", category=["Tools", "Home"], favorited=True)
        
        db.session.add_all([product1, product2, product3, product4, product5, product6, product7, product8, product9])
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