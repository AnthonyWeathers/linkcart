from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta, timezone
from flask_socketio import disconnect
from functools import wraps
import logging
import jwt

token_bp = Blueprint('token', __name__, url_prefix='/token')

def create_jwt(user, app):
    """Generates a JWT token for a user."""
    payload = {
        "user_id": user.id,
        "username": user.username,
        "isOnline": user.isOnline,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12)
    }
    token = jwt.encode(payload, app.secret_key, algorithm="HS256")
    return token

def verify_token(token, app):
    try:
        payload = jwt.decode(token, app.secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        logging.warning("Token expired")
        return None
    except jwt.InvalidTokenError:
        logging.error("Invalid token")
        return None

# def token_required(f):
#     """Unified token decorator for Flask routes and Socket.IO events."""
#     @wraps(f)
#     def decorated_function(*args, **kwargs):
#         from flask import current_app
        
#         app = current_app

#         if request.path.startswith('/socket.io') and request.method == 'GET':
#             token = request.cookies.get('jwtToken')
#             logging.debug(f"Token from initial Socket.IO connection: {token}")

#             if not token:
#                 logging.warning("No token provided for Socket.IO connection")
#                 disconnect()
#                 return jsonify({"error": "Token is required for Socket.IO"}), 401
            
#         elif request and request.cookies.get('jwtToken') and request.method in ['GET', 'POST', 'PUT', 'DELETE']:
#             token = request.cookies.get('jwtToken')
#             logging.debug(f"Token from API cookies: {token}")

#         else:
#             token = request.cookies.get('jwtToken')
#             logging.debug(f"Token from socketio event handler: {token}")

#         if not token:
#             logging.warning("No token provided")
#             return jsonify({"error": "Token is required"}), 401
        
#         user_payload = verify_token(token, app)
#         logging.debug(f"User payload after verification: {user_payload}")

#         if not user_payload:
#             logging.warning("Invalid or expired token")
#             return jsonify({"error": "Invalid or expired token"}), 401

#         if request.path.startswith('/socket.io'):
#             kwargs['user'] = user_payload
#         else:
#             request.user_payload = user_payload

#         return f(*args, **kwargs)

#     return decorated_function

def token_required(f):
    """Unified token decorator for Flask routes and Socket.IO events."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask import current_app

        app = current_app

        if request.path.startswith('/socket.io') and request.method == 'GET':
            token = request.cookies.get('jwtToken')
            logging.debug(f"Token from initial Socket.IO connection: {token}")

            if not token:
                logging.warning("No token provided for Socket.IO connection")
                disconnect()
                return jsonify({"error": "Token is required for Socket.IO"}), 401
            
        elif request and request.cookies.get('jwtToken') and request.method in ['GET', 'POST', 'PUT', 'DELETE']:
            token = request.cookies.get('jwtToken')
            logging.debug(f"Token from API cookies: {token}")

        else:
            token = request.cookies.get('jwtToken')
            logging.debug(f"Token from socketio event handler: {token}")

        if not token:
            logging.warning("No token provided")
            return jsonify({"error": "Token is required"}), 401
        
        user_payload = verify_token(token, app)
        logging.debug(f"User payload after verification: {user_payload}")

        if not user_payload:
            logging.warning("Invalid or expired token")
            return jsonify({"error": "Invalid or expired token"}), 401

        if request.path.startswith('/socket.io'):
            kwargs['user'] = user_payload
        else:
            request.user_payload = user_payload

        return f(*args, **kwargs)

    return decorated_function

@token_bp.route('/refresh', methods=['POST'])
@token_required
def refresh_token(user=None):
    """Refreshes the user's access token."""
    try:
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        
        from flask import current_app
        app = current_app

        new_access_token = create_jwt(user, app)
        response = jsonify({"message": "Token refreshed successfully"})
        response.set_cookie(
            "access_token", 
            new_access_token, 
            httponly=True, 
            secure=False,  # False for local dev; True for production with HTTPS
            samesite='Strict') # or Lax
        return response
    
    except Exception as e:
        logging.exception("Error during token refresh")
        return jsonify({"error": "Failed to refresh token"}), 500