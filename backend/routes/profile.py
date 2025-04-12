from flask import Blueprint, request, jsonify
from extensions import csrf, limiter
from token_utils import token_required
import crud
import logging

profile_bp = Blueprint('profile', __name__, url_prefix='/profile')

""" Profile Endpoints """
@profile_bp.route('/<username>')
@limiter.limit("10/minute")
@csrf.exempt
@token_required
def profile(username):
    """Fetch profile details of the given username."""
    # `user` is the authenticated user, injected by @token_required
    # `username` is the user profile being accessed
    try:
        user = request.user_payload
        currentUser_id = user["user_id"]
        currentUser_username = user['username']
        logging.info(f"Authenticated user {currentUser_username} is accessing profile of {username}")

        if not user["isOnline"]:
            logging.warning(f"User {currentUser_username} attempted to access profiles while offline.")
            return jsonify({'error': 'You are offline. Community features are not available.'}), 403

        target_user = crud.get_user(username=username)
        if not target_user:
            logging.error(f"Profile for username {username} not found.")
            return jsonify({'error': 'User not found'}), 404

        is_friend = False
        sent_request = False
        received_request = False

        if target_user.id != currentUser_id:
            if crud.check_friendship(target_user.id, currentUser_id):
                is_friend = True
            elif crud.get_friend_requests(receiver_id=target_user.id, sender_id=currentUser_id, status='pending'):
                sent_request = True
            elif crud.get_friend_requests(receiver_id=currentUser_id, sender_id=target_user.id, status='pending'):
                received_request = True

        favorited_products = crud.get_products(user_id=target_user.id, favorited=True)

        logging.info(f"User {currentUser_username} successfully fetched profile data for {username}")
        return jsonify({
            'favoriteProducts': [product.to_dict() for product in favorited_products],
            'user': {
                "username": target_user.username,
                "description": target_user.description
            },
            'isFriend': is_friend,
            'sentRequest': sent_request,
            'receivedRequest': received_request
        })

    except Exception as e:
        logging.error(f"Error while fetching profile for username {username}: {str(e)}")
        return jsonify({'error': 'An error occurred while fetching the profile'}), 500

@profile_bp.route('/<username>/edit-description', methods=['POST'])
@limiter.limit("5/minute")
@csrf.exempt
@token_required
def editDescription(username):
    """Edit the description of the authenticated user's profile."""
    try:
        user = request.user_payload
        currentUser_id = user["user_id"]
        currentUser_username = user['username']
        logging.info(f"Authenticated user {currentUser_username} is attempting to edit their profile description.")

        if not user["isOnline"]:
            logging.warning(f"User {currentUser_username} attempted to edit description while offline.")
            return jsonify({'error': 'You are offline. Community features are not available.'}), 403

        target_user = crud.get_user(username=username)
        if not target_user or target_user.id != currentUser_id:
            logging.warning(f"User {currentUser_username} tried to edit the description of {username}.")
            return jsonify({'error': 'You can only edit your own description'}), 403

        new_description = request.json.get("description")
        if not new_description:
            logging.warning(f"User {currentUser_username} submitted an empty description.")
            return jsonify({'error': 'Description cannot be empty'}), 400

        updated_user = crud.update_user_description(user_id=currentUser_id, description=new_description)
        logging.info(f"User {currentUser_username} successfully updated their description.")
        return jsonify({'message': 'Description updated successfully!', 'description': updated_user.description})

    except Exception as e:
        logging.error(f"Error while editing description for {currentUser_username}: {str(e)}")
        return jsonify({'error': 'An error occurred while updating the description'}), 500
    
@profile_bp.route('/delete', methods=['POST'])
@limiter.limit("2/minute")
@csrf.exempt
@token_required
def delete_user():
    """
    Deletes the authenticated user's account.
    """
    try:
        user = request.user_payload
        currentUser_id = user["user_id"]
        currentUser_username = user['username']
        logging.info(f"Authenticated user {currentUser_username} is attempting to delete their account")

        response = crud.delete_user_account(currentUser_id)
        print("The response from crud deleting user is: ", response)
        if not response.get("success"):
            logging.warning(f"Failed to delete account for {currentUser_username}: {response['message']}")
            return jsonify(response), 404 if response["message"] == "User not found" else 400
        logging.info(f"User {currentUser_username} successfully deleted their account.")
        return jsonify(response), 200

    except Exception as e:
        logging.error(f"Error deleting user {user.username}: {e}")
        return jsonify({'error': 'Failed to delete user account.'}), 500