"""
    Script to seed database.
    You'll have to enter the password to your server twice to have your database perform the drop and create db.
    After doing that and no errors pop up, you're good to run.
"""

import os
from datetime import datetime, timedelta
import model
from model import db, User, Products, CommunityMessage, FriendRequest, Friends
import server
import crud  # Importing CRUD functions

# Drop and recreate the database
os.system("dropdb linkcart")
os.system("createdb linkcart")

model.connect_to_db(server.app)

with server.app.app_context():
    def create_users():
        """Create sample users using the create_user function (which hashes passwords)."""
        alice = crud.create_user("alice", "alice@example.com", "password123")
        bob = crud.create_user("bob", "bob@example.com",  "securepass")
        charlie = crud.create_user("charlie", "charlie@example.com",  "charliepass")
        return alice, bob, charlie  # Return user objects

    def create_products(alice_id, bob_id, charlie_id):
        """Create sample products for users."""
        products = [
            Products(user_id=alice_id, url=f"https://example.com/product{i}", price=10.99 + i, 
                     productName=f"Widget {chr(65 + i)}", category=["Gadgets"], favorited=i % 2 == 0)
            for i in range(1, 15)  # 14 products for Alice
        ]
        
        # Additional products for other users
        products.extend([
            Products(user_id=bob_id, url="https://example.com/product6", price=34.99, productName="Widget H", category=["Gadgets"], favorited=True),
            Products(user_id=bob_id, url="https://example.com/product7", price=64.99, productName="Widget J", category=["Electronics", "Accessories"], favorited=False),
            Products(user_id=charlie_id, url="https://example.com/product8", price=54.99, productName="Widget I", category=["Tools"], favorited=False),
            Products(user_id=charlie_id, url="https://example.com/product9", price=74.99, productName="Widget K", category=["Tools", "Home"], favorited=True)
        ])

        db.session.add_all(products)
        db.session.commit()

    def create_community_messages(alice_id, bob_id, charlie_id):
        """Create 30 community messages to test pagination."""
        messages = [
            CommunityMessage(user_id=[alice_id, bob_id, charlie_id][i % 3], content=f"Test message {i}", timestamp=datetime.now() - timedelta(minutes=i))
            for i in range(1, 31)
        ]

        db.session.add_all(messages)
        db.session.commit()

    def create_friend_requests(alice_id, bob_id):
        """Create sample friend requests."""
        friend_request1 = FriendRequest(sender_id=alice_id, receiver_id=bob_id, status="pending", timestamp=datetime.now())
        db.session.add(friend_request1)
        db.session.commit()

    def create_friendship(alice_id, charlie_id):
        """Create sample friendships."""
        friendship1 = Friends(user1_id=alice_id, user2_id=charlie_id)
        db.session.add(friendship1)
        db.session.commit()

    db.create_all()

    # Create users and get their IDs
    alice, bob, charlie = create_users()
    create_products(alice.id, bob.id, charlie.id)
    create_community_messages(alice.id, bob.id, charlie.id)
    create_friend_requests(alice.id, bob.id)
    create_friendship(alice.id, charlie.id)