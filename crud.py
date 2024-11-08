"""CRUD operations."""

from model import User, Products
from sqlalchemy import or_, func

def create_user(username, password):
    """Create and return a new user."""
    """Used when registering as a new user"""
    user = User(username=username, password=password)
    return user

def get_user_by_id(id):
    """Return a user's profile."""
    """Used when viewing own profile"""
    return User.query.get(id)

def get_user_by_username(username):
    """Return a user's profile."""
    """Used when viewing another user's profile page"""
    return User.query.filter(User.username == username).first()

def get_user(username, password):
    """Return user"""
    """Used to check if user with username and password exists"""
    return User.query.filter(User.username == username and User.password == password).first()

"""Product database operations"""
def get_products_by_user(user_id):
    """Return all products saved by a user"""
    """Used when viewing saved products when logged in"""
    return Products.query.filter(User.id == user_id)

def get_favorited_products_by_user(user_id):
    """Return all favorited products saved by a user"""
    """Used on viewing profile page of a user"""
    return Products.query.filter((user_id == user_id) and (Products.favorited == True))

def get_product_by_id(product_id):
    """Returns product given product_id"""
    """Used for editing/deleting a product"""
    return Products.query.filter_by(id=product_id)

# def check_friendship(user_id1, user_id2):
#     """Check if a friendship exists between two users in an order-agnostic way."""
#     friendship = (
#         db.session.query(Friendship)
#         .filter(
#             func.LEAST(Friendship.user1_id, Friendship.user2_id) == func.LEAST(user_id1, user_id2),
#             func.GREATEST(Friendship.user1_id, Friendship.user2_id) == func.GREATEST(user_id1, user_id2)
#         )
#         .first()
#     )
#     return friendship is not None  # Returns True if a friendship exists, otherwise False