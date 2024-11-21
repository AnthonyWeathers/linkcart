import os
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

favorited_products = db.Table(
    'favorited_products',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('product_id', db.Integer, db.ForeignKey('products.id'), primary_key=True)
)

class User(db.Model):

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    username = db.Column(db.String(50) , nullable = False)
    password = db.Column(db.String(50) , nullable = False)
    description = db.Column(db.Text, nullable=True, default="This user has not added a description yet.")
    products = db.relationship("Products", backref = "user", lazy = True)
    favorited_products = db.relationship("Products", secondary=favorited_products, backref="favorited_by_users")

    def to_dict(self):
        """Convert User object to dictionary."""
        return {
            "id": self.id,
            "username": self.username,
            "password": self.password,
            "description": self.description,
            "favorited_products": [product.id for product in self.favorited_products],
        }
    
class Products(db.Model):

    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable = False)
    url = db.Column(db.String(500) , nullable = False)
    price = db.Column(db.String(50), nullable = False)
    productName = db.Column(db.String(255))
    category = db.Column(db.String(255))
    favorited = db.Column(db.String(255) , nullable = False)

    def to_dict(self):
        """Convert Video object to dictionary."""
        # do i need to add userId to this?
        return {
            "id": self.id,
            "user_id": self.user_id,
            "url": self.url,
            "price": self.price,
            "productName": self.productName,
            "category": self.category,
            "favorited": self.favorited
        }
    
class CommunityMessage(db.Model):
    __tablename__ = "community_messages"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())

    # enables retrieving all community messages of a user through user.community_messages
    # enables getting username of a community message (if using variable named message; message.user.username)
    user = db.relationship("User", backref="community_messages")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "content": self.content,
            "timestamp": self.timestamp
        }

class FriendRequest(db.Model):
    __tablename__ = "friend_requests"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(50), nullable=False, default="pending")
    timestamp = db.Column(db.DateTime, server_default=db.func.now())

    sender = db.relationship("User", foreign_keys=[sender_id], backref="sent_requests")
    receiver = db.relationship("User", foreign_keys=[receiver_id], backref="received_requests")

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "status": self.status,
            "timestamp": self.timestamp
        }
    
class Friends(db.Model):
    __tablename__ = 'friendship'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user1_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    user2_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user1_id": self.user1_id,
            "user2_id": self.user2_id
        }