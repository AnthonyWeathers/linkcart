import os
from flask_sqlalchemy import SQLAlchemy

from sqlalchemy.dialects.postgresql import JSONB

import secrets

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
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(250) , nullable = False)
    description = db.Column(db.Text, nullable=True, default="This user has not added a description yet.")
    products = db.relationship("Products", backref = "user", lazy = True)
    favorited_products = db.relationship("Products", secondary=favorited_products, backref="favorited_by_users")
    isOnline = db.Column(db.Boolean, nullable = False, default=True)

    reset_code_hash = db.Column(db.String(255), nullable=True)
    reset_code_expiry = db.Column(db.DateTime, nullable=True)
    
class Products(db.Model):

    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable = False)
    url = db.Column(db.String(500) , nullable = False)
    price = db.Column(db.Float, nullable=False)
    productName = db.Column(db.String(255))
    category = db.Column(JSONB, nullable=False, default=list)
    favorited = db.Column(db.Boolean , nullable = False, default=False)

    def to_dict(self):
        """Convert Video object to dictionary."""
        
        return {
            "productId": self.id,
            "url": self.url,
            "price": self.price,
            "productName": self.productName,
            "category": self.category,
            "favorited": self.favorited
        }
    
class CommunityMessage(db.Model):
    __tablename__ = "community_messages"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())

    user = db.relationship("User", backref="community_messages")

class FriendRequest(db.Model):
    __tablename__ = "friend_requests"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(50), nullable=False, default="pending")
    timestamp = db.Column(db.DateTime, server_default=db.func.now())

    sender = db.relationship("User", foreign_keys=[sender_id], backref="sent_requests")
    receiver = db.relationship("User", foreign_keys=[receiver_id], backref="received_requests")
    
class Friends(db.Model):
    __tablename__ = 'friendship'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user1_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    user2_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    
def connect_to_db(flask_app, echo=True):
    flask_app.config["SQLALCHEMY_DATABASE_URI"] = os.environ["POSTGRES_URI"]
    flask_app.config["SQLALCHEMY_ECHO"] = echo
    flask_app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.app = flask_app
    db.init_app(flask_app)

    print("Connected to the db!")