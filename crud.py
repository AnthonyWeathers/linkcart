"""CRUD operations."""

from model import User, Products, Friends, FriendRequest, CommunityMessage, db
from sqlalchemy import or_, and_, asc, desc

# -- User Operations --

def create_user(username, password):
    """Create a new user with a hashed password and default description."""
    from werkzeug.security import generate_password_hash
    hashed_password = generate_password_hash(password)
    user = User(username=username, password=hashed_password, description=User.description.default.arg, isOnline=True)
    db.session.add(user)
    db.session.commit()
    return user

def get_user(**filters):
    """Fetch a single user based on dynamic filters."""
    return User.query.filter_by(**filters).first()

def update_user(user_id, **kwargs):
    """Update user details and commit changes."""
    user = User.query.get(user_id)
    if not user:
        return None
    for key, value in kwargs.items():
        setattr(user, key, value)
    db.session.commit()
    return user

def delete_user(user_id):
    """Delete a user by ID and commit changes."""
    user = User.query.get(user_id)
    if user:
        db.session.delete(user)
        db.session.commit()
    return user is not None

def set_user_online_status(user_id, new_status):
    """Toggles the mode for the user (online/offline) and updates the database."""
    user = User.query.get(user_id)
    if not user:
        return None
    user.isOnline = new_status  # Set the status
    db.session.commit()  
    return user

# -- Product Operations --

def create_product(user_id, url, price, productName, category, favorited=False):
    """Create a new product for a user."""
    product = Products(
        user_id=user_id,
        url=url,
        price=price,
        productName=productName,
        category=category,
        favorited=favorited
    )
    db.session.add(product)
    db.session.commit()
    return product

# def get_products(**filters):
    """Fetch products based on dynamic filters."""
    # return Products.query.filter_by(**filters).all()
def get_products(user_id, sort_by=None, extra_sort_by=None, min_price=None, max_price=None, category_filter=None, **extra_filters):
    """
    Fetch products based on dynamic filters, sorting, and ranges.
    
    Parameters:
        user_id (int): ID of the user whose products to fetch.
        sort_by (str): Field to sort by ('price', 'category').
        extra_sort_by (str): Sort direction ('ascending', 'descending').
        min_price (float): Minimum price filter.
        max_price (float): Maximum price filter.
        category_filter (str): Filter by category.
        **extra_filters: Any additional exact-match filters.
    """
    query = Products.query.filter_by(user_id=user_id, **extra_filters)

    # Handle price range filters
    if min_price is not None:
        query = query.filter(Products.price >= min_price)
    if max_price is not None:
        query = query.filter(Products.price <= max_price)

    # Handle category filter (e.g., partial match or specific criteria)
    if category_filter:
        query = query.filter(Products.category.contains(category_filter))

    # Handle sorting
    if sort_by == 'price':
        query = query.order_by(desc(Products.price) if extra_sort_by == 'descending' else asc(Products.price))
    elif sort_by == 'category':
        query = query.order_by(desc(Products.category) if extra_sort_by == 'descending' else asc(Products.category))
    else:
        query = query.order_by(desc(Products.id))  # Default sort by newest products

    return query.all()

def get_product_by_id(user_id, product_id):
    """
    Fetch a single product by ID for a specific user.
    
    Parameters:
        user_id (int): ID of the user.
        product_id (int): ID of the product.
    
    Returns:
        Product object if found, else None.
    """
    return Products.query.filter_by(user_id=user_id, id=product_id).first()

def update_product(product_id, **kwargs):
    """Update a product's details."""
    product = Products.query.get(product_id)
    if not product:
        return None
    for key, value in kwargs.items():
        setattr(product, key, value)
    db.session.commit()
    return product

def toggle_favorited(product_id):
    """Toggle the favorited status of a product."""
    product = Products.query.get(product_id)
    if not product:
        return None
    product.favorited = not product.favorited  # Invert the current value
    db.session.commit()
    return product

def delete_product(product_id):
    """Delete a product by ID."""
    product = Products.query.get(product_id)
    if product:
        db.session.delete(product)
        db.session.commit()
    return product is not None

# -- Friend Operations --

def create_friendship(user1_id, user2_id):
    """Create a friendship between two users."""
    friendship = Friends(user1_id=user1_id, user2_id=user2_id)
    db.session.add(friendship)
    db.session.commit()
    return friendship

def get_friends(user_id):
    """Fetch all friends for a user."""
    return Friends.query.filter(
        or_(Friends.user1_id == user_id, Friends.user2_id == user_id)
    ).all()

def check_friendship(user1_id, user2_id):
    """Check if a friendship exists between two users."""
    return Friends.query.filter(
        or_(
            and_(Friends.user1_id == user1_id, Friends.user2_id == user2_id),
            and_(Friends.user1_id == user2_id, Friends.user2_id == user1_id)
        )
    ).first()  # Use `.first()` to return the first matching relationship or None


def delete_friendship(user1_id, user2_id):
    """Delete a friendship between two users."""
    friendship = Friends.query.filter(
        or_(
            (Friends.user1_id == user1_id) & (Friends.user2_id == user2_id),
            (Friends.user1_id == user2_id) & (Friends.user2_id == user1_id)
        )
    ).first()
    if friendship:
        db.session.delete(friendship)
        db.session.commit()
    return friendship is not None

# -- Friend Request Operations --

def create_friend_request(sender_id, receiver_id):
    """Create a friend request."""
    friend_request = FriendRequest(sender_id=sender_id, receiver_id=receiver_id)
    db.session.add(friend_request)
    db.session.commit()
    return #friend_request

def get_friend_requests(receiver_id=None, sender_id=None, status=None):
    """Fetch friend requests dynamically based on filters."""
    query = FriendRequest.query
    if receiver_id:
        query = query.filter_by(receiver_id=receiver_id)
    if sender_id:
        query = query.filter_by(sender_id=sender_id)
    if status:
        query = query.filter_by(status=status)
    return query.all()

def update_friend_request(request_id, status):
    """Update the status of a friend request."""
    friend_request = FriendRequest.query.get(request_id)
    if friend_request:
        friend_request.status = status
        db.session.commit()
    return friend_request

def delete_friend_request(request_id):
    """Delete a friend request."""
    friend_request = FriendRequest.query.get(request_id)
    if friend_request:
        db.session.delete(friend_request)
        db.session.commit()
    return friend_request is not None

# -- Community Message Operations --

def create_community_message(user_id, content):
    """Create a new community message."""
    message = CommunityMessage(user_id=user_id, content=content)
    db.session.add(message)
    db.session.commit()
    return message

def get_community_messages():
    """Fetch all community messages."""
    return CommunityMessage.query.order_by(CommunityMessage.timestamp.asc()).all()