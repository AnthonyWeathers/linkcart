import os
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    username = db.Column(db.String(255) , nullable = False)
    password = db.Column(db.String(255) , nullable = False)

    products = db.relationship("Products", backref = "move", lazy = True)

    def to_dict(self):
        """Convert User object to dictionary."""
        return {
            "id": self.id,
            "username": self.username,
            "password": self.password
        }
    
class Products(db.Model):

    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key = True, autoincrement = True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable = False)
    url = db.Column(db.String(255) , nullable = False)
    productName = db.Column(db.String(255) , nullable = False)
    category = db.Column(db.String(255) , nullable = False)
    favorited = db.Column(db.String(255) , nullable = False)

    def to_dict(self):
        """Convert Video object to dictionary."""
        # do i need to add userId to this?
        return {
            "id": self.id,
            "user_id": self.user_id,
            "url": self.username,
            "productName": self.password,
            "category": self.category,
            "favorited": self.favorited
        }