from flask import Blueprint, request, jsonify
from extensions import csrf, limiter
from token_utils import token_required
import crud
import logging

user_bp = Blueprint('user', __name__, url_prefix='/user')
# routes are /user/[]

@user_bp.route("/current-user", methods=['GET'])
@csrf.exempt
@limiter.limit("10 per minute")
@token_required
def check_user():
    try:
        user = request.user_payload
        print("current user is: ", user)
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        
        user_id = user["user_id"]
        username = user["username"]
        
        pending_request = True if crud.get_friend_requests(receiver_id=user_id) else False

        logging.info(f"User check successful for user {username}")
        return jsonify({"user": username, "hasNewRequests": pending_request})

    except Exception as e:
        logging.exception("Unexpected error in /current-user")
        return jsonify({"error": "An unexpected error occurred in getting current user"}), 500