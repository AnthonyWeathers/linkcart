from flask import Blueprint, request, jsonify
from extensions import csrf, limiter, socketio
from token_utils import token_required
import crud
import logging

friends_bp = Blueprint('friends', __name__, url_prefix='/friends')

""" Friend Request Endpoints """
@friends_bp.route('/make-request', methods=['POST'])
@csrf.exempt
@token_required
def make_request():
    try:
        user = request.user_payload
        currentUser_id = user["user_id"]
        currentUser_username = user['username']
        if not user["isOnline"]:
            logging.warning(f"Offline user {currentUser_username} attempted to send a friend request.")
            return jsonify({'error': 'You are offline.'}), 403

        receiver_username = request.json.get('friend_username')
        receiver = crud.get_user(username=receiver_username)

        if not receiver:
            logging.error(f"User {currentUser_username} tried to request a non-existent user: {receiver_username}")
            return jsonify({'error': 'User not found.'}), 404
        
        if crud.check_friendship(currentUser_id, receiver.id):
            logging.info(f"User {currentUser_username} attempted to re-friend {receiver_username}.")
            return jsonify({'error': 'You are already friends.'}), 400
        if (crud.get_friend_requests(receiver_id=receiver.id, sender_id=currentUser_id, status="pending") or
        crud.get_friend_requests(receiver_id=currentUser_id, sender_id=receiver.id, status="pending")):
            logging.info(f"Duplicate friend request from {currentUser_username} to {receiver_username}.")
            return jsonify({'error': 'A friend request is already pending.'}), 400
        
        crud.create_friend_request(currentUser_id, receiver.id)
        logging.info(f"User {currentUser_username} sent a friend request to {receiver_username}.")

        socketio.emit("new-friend-request", {
            "requester": currentUser_username,
            "receiver": receiver_username
        })

        return jsonify({'message': 'Friend request sent successfully!'})
    except Exception as e:
        logging.exception(f"Error processing friend request by {currentUser_username}: {str(e)}")
        return jsonify({'error': 'An error occurred'}), 404

@friends_bp.route('/accept-friend', methods=['POST'])
@csrf.exempt
@limiter.limit("5/minute")
@token_required
def accept_friend():
    try:
        user = request.user_payload
        currentUser_id = user["user_id"]
        currentUser_username = user["username"]
        if not user.get("isOnline"):
            logging.warning(f"Offline user {currentUser_username} attempted to accept a friend request.")
            return jsonify({'error': 'You are offline.'}), 403
        
        friend_username = request.json.get('friend_username')
        friend = crud.get_user(username=friend_username)

        if not friend:
            logging.error(f"User {currentUser_username} tried to accept a request from a non-existent user: {friend_username}.")
            return jsonify({'error': 'User not found.'}), 404
        
        friend_request = crud.get_friend_requests(receiver_id=currentUser_id, sender_id=friend.id, status="pending")
        if not friend_request:
            logging.info(f"No pending friend request from {friend_username} to {currentUser_username}.")
            return jsonify({'error': 'No pending friend request found.'}), 404
        
        crud.create_friendship(currentUser_id, friend.id)
        crud.delete_friend_request(friend_request[0].id)

        socketio.emit('new-friend', {
            "requester": friend.username,
            'receiver': {"id": currentUser_id, "username": currentUser_username}
            
        })

        logging.info(f"User {currentUser_username} accepted a friend request from {friend_username}.")
        return jsonify({'message': 'Friend request accepted successfully!', 'friend': {'id': friend.id, 'username': friend.username}})
    except Exception as e:
        logging.exception(f"Error accepting friend request by {currentUser_username}: {str(e)}")
        return jsonify({'error': 'An error occurred.'}), 500

@friends_bp.route('/decline-friend', methods=['POST'])
@csrf.exempt
@limiter.limit("5/minute")
@token_required
def decline_friend():
    try:
        user = request.user_payload
        currentUser_username = user["username"]
        if not user.get("isOnline"):
            logging.warning(f"Offline user {currentUser_username} attempted to decline a friend request.")
            return jsonify({'error': 'You are offline.'}), 403

        other_username = request.json.get('friend_username')
        other_user = crud.get_user(username=other_username)

        if not other_user:
            logging.error(f"User {currentUser_username} tried to decline a request from a non-existent user: {other_username}.")
            return jsonify({'error': 'User not found.'}), 404

        friend_request = crud.get_friend_requests(receiver_id=user["user_id"], sender_id=other_user.id, status="pending")
        if not friend_request:
            logging.info(f"No pending friend request from {other_username} to {currentUser_username}.")
            return jsonify({'error': 'No pending friend request found.'}), 404

        crud.delete_friend_request(friend_request[0].id)

        socketio.emit('declined-friend', {
            "requester": other_username,
            'receiver': currentUser_username
        })
        
        logging.info(f"User {currentUser_username} declined a friend request from {other_username}.")
        return jsonify({'message': 'Friend request declined successfully!'})
    except Exception as e:
        logging.exception(f"Error declining friend request by {currentUser_username}: {str(e)}")
        return jsonify({'error': 'An error occurred.'}), 500

@friends_bp.route('/friend-requests', methods=['GET'])
@limiter.limit("10/minute")
@token_required
def get_friend_requests():
    try:
        user = request.user_payload
        currentUser_username = user['username']
        if not user["isOnline"]:
            logging.warning(f"Offline user {currentUser_username} attempted to view friend requests.")
            return jsonify({'error': 'You are offline.'}), 403

        user_requests = crud.get_friend_requests(receiver_id=user["user_id"], status="pending")
        sender_usernames = [request.sender.username for request in user_requests]

        logging.info(f"User {currentUser_username} retrieved their pending friend requests.")
        return jsonify({'sender_usernames': sender_usernames})
    except Exception as e:
        logging.exception(f"Error retrieving friend requests for {currentUser_username}: {str(e)}")
        return jsonify({'error': 'An error occurred.'}), 500

""" Friends endpoints """
@friends_bp.route('/remove-friend', methods=['POST'])
@csrf.exempt
@limiter.limit("5/minute")
@token_required
def remove_friend():
    try:
        user = request.user_payload
        currentUser_username = user['username']
        if not user["isOnline"]:
            logging.warning(f"Offline user {currentUser_username} attempted to view friend requests.")
            return jsonify({'error': 'You are offline. Community features are not available.'}), 403
    
        friend_username = request.json.get('friend_username')
        friend_user = crud.get_user(username=friend_username)

        if not friend_user:
            logging.error(f"Friend user with {currentUser_username}, was not found.")
            return jsonify({'error': 'User not found.'}), 404

        deleted_friendship = crud.delete_friendship(user['user_id'], friend_user.id)
        if deleted_friendship:
            
            socketio.emit('removed-friend', {
                'remover': {"id": user['id'], "username": currentUser_username},
                'removed': friend_username,
            })
            logging.info(f"Friendship removed: {currentUser_username} -> {friend_username}")
            return jsonify({'message': 'Friend removed successfully!'}), 200
    
        logging.warning(f"Failed to remove friendship: {currentUser_username} -> {friend_username}")
        return jsonify({'error': 'Failed to remove friend.'}), 500

    except Exception as e:
        logging.exception(f"Error in removing friend: {str(e)}")
        return jsonify({'error': 'An error occurred while removing the friend.'}), 500

@friends_bp.route('/', methods=['GET'])
@csrf.exempt
@limiter.limit("10/minute")
@token_required
def get_friends():
    try:
        print("Entered fetching all friends")
        user = request.user_payload
        currentUser_id = user['user_id']
        if not user["isOnline"]:
            logging.warning(f"Offline user {user['username']} attempted to view friend requests.")
            return jsonify({'error': 'You are offline. Community features are not available.'}), 403

        friendships = crud.get_friends(currentUser_id)

        friend_list = [
            {
                'id': friend.id,
                'username': friend.username
            }
            for friendship in friendships
            for friend in [crud.get_user(id=friendship.user1_id if friendship.user1_id != currentUser_id else friendship.user2_id)]
        ]

        logging.info(f"Friend list retrieved for user_id: {currentUser_id} ({len(friend_list)} friends)")
        return jsonify({'friends': friend_list}), 200

    except Exception as e:
        logging.exception(f"Error in retrieving friends: {str(e)}")
        return jsonify({'error': 'An error occurred while retrieving friends.'}), 500