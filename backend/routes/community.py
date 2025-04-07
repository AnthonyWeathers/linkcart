from flask import Blueprint, request, jsonify
from extensions import csrf, limiter, socketio
from token_utils import token_required
import crud
import logging

community_bp = Blueprint('community', __name__, url_prefix='/community')

""" Community Endpoints """
@community_bp.route('/messages', methods=['GET'])
@csrf.exempt
@limiter.limit("15 per minute")
@token_required
def get_public_messages():
    try:
        user = request.user_payload
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        isOnline = user['isOnline']
        if not isOnline:
            logging.warning("User tried accessing community messages while offline")
            return jsonify({'error': 'You are offline. Community features are not available.'}), 403
        
        messages = crud.get_community_messages()
        logging.info(f"Fetched {len(messages)} community messages")
        return jsonify([
            {
                'id': message.id,
                'username': message.user.username if message.user else "Deleted User",
                'content': message.content,
                'timestamp': message.timestamp.isoformat()
            }
            for message in messages
        ])

    except Exception as e:
        logging.exception("Unexpected error in retrieving community messages")
        return jsonify({"error": "An unexpected error occurred getting community messages"}), 500

@socketio.on('message')
@token_required
def handle_message(*args, **kwargs):
    try:
        user = kwargs.get('user')
        if not user:
            socketio.emit('message_response', {'success': False, 'error': 'User not authenticated'})
            return

        message_content = args[0].get('message')

        logging.info(f"Message received from {user['username']}: {message_content}")

        message = crud.create_community_message(user['user_id'], message_content)
        logging.info(f"Created new message with ID {message.id}")

        socketio.emit('message_response', {
            'success': True,
            'id': message.id,
            'username': user['username'],
            'content': message.content,
            'timestamp': message.timestamp.isoformat()
        }, to='community')

    except Exception as e:
        logging.exception("Unexpected error in adding new message")
        return jsonify({"error": "An unexpected error occurred in adding new message"}), 500