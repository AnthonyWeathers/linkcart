from flask import Blueprint, request, jsonify, session, current_app
from flask_socketio import join_room, disconnect
from extensions import csrf, socketio, mail
from token_utils import token_required, create_jwt
import crud
import logging
from flask_mailman.message import Message

app = current_app

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

""" User Login/Registration related endpoints """
@auth_bp.route("/login", methods=["POST"])
@csrf.exempt
def login():
    try:
        username = request.json.get("username")
        password = request.json.get("password")

        user = crud.authenticate_user(username=username, password=password)

        if user:
            token = create_jwt(user, app)

            response = jsonify({
                "message": "Logged in successfully",
                "username": user.username,
                })

            response.set_cookie(
                "jwtToken",
                token,
                httponly=True,
                secure=False,
                samesite='Lax',
            )
            return response
        else:
            return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        logging.exception("Unexpected error in /login")
        return jsonify({"error": "An unexpected error occurred while logging in"}), 500
    
@auth_bp.route("/register", methods=["POST"])
@csrf.exempt
def register():
    try:
        username = request.json.get("username")
        email = request.json.get("email")
        password = request.json.get("password")
        if crud.get_user(username=username, password=password):
            logging.warning(f"Registration failed: Username {username} already in use.")
            return jsonify({"error": "This username is already in use, please use another."}), 400
        
        new_user = crud.create_user(username, email, password)
        
        if new_user:
            token = create_jwt(new_user, app)
            logging.info(f"User {new_user.username} registered successfully.")

            response = jsonify({
                "message": "Logged in successfully",
                "user": new_user.username,
            })
            response.set_cookie(
                "jwtToken",
                token,
                httponly=True,
                secure=False,
                samesite='Lax',
            )
            return response
        else:
            return jsonify({"error": "Failed to register user"}), 401

    except Exception as e:
        logging.exception("Unexpected error in /register")
        return jsonify({"error": "An unexpected error occurred while registing user"}), 500

@auth_bp.route("/logout", methods=["POST"])
@csrf.exempt
def logout():
    session.clear()
    logging.info("User logged out.")
    response = jsonify({"message": "Logged out successfully"})
    response.set_cookie(
        "jwtToken", 
        "", 
        expires=0, 
        httponly=True, 
        secure=True,
        samesite='Lax',
    )
    return response

@auth_bp.route("/request-reset-code", methods=["POST"])
@csrf.exempt
def request_reset_code():
    try:
        username = request.json.get("username")
        email = request.json.get("email")

        reset_code = crud.request_new_reset_code(username=username, email=email)

        if reset_code:
            msg = Message()
            msg.subject = "Password Reset Code"
            msg.recipients = [email]
            msg.body = f"Hello {username},\n\nUse this code to reset your password: {reset_code}\n\nThis code is valid for 15 minutes.\n\nIf you did not request a password reset, please ignore this email."
            
            mail.send_mail(msg.subject, msg.body, None, msg.recipients)
            return jsonify({"message": "Reset code sent to email"})
        else:
            return jsonify({"error": "Error in generating reset code, try again"}), 401

    except Exception as e:
        logging.exception("Unexpected error in /request-reset-code")
        return jsonify({"error": "An unexpected error occurred while attempting to reset password"}), 500
    
@auth_bp.route("/reset-password", methods=["POST"])
@csrf.exempt
def reset_password():
    try:
        username = request.json.get("username")
        reset_code = request.json.get("resetCode")
        new_password = request.json.get("newPassword")

        user = crud.get_user(username=username)
        if not user:
            return jsonify({"error": "User not found"}), 404

        if not crud.validate_reset_code(user.id, reset_code):
            return jsonify({"error": "Invalid reset code"}), 401

        if not crud.clear_reset_code(user.id):
            return jsonify({"error": "Failed to clear reset code."}), 500

        if not crud.update_password(user.id, new_password):
            return jsonify({"error": "Failed to update password."}), 500
        
        return jsonify({"message": "Password has been successfully resetted"})

    except Exception as e:
        logging.exception("Unexpected error in /reset-password")
        return jsonify({"error": "An unexpected error occurred while attempting to reset password"}), 500
    
@auth_bp.route("/request-username", methods=["POST"])
@csrf.exempt
def request_username():
    try:
        email = request.json.get("email")

        username = crud.request_username(email=email)

        if username:
            msg = Message()
            msg.subject = "Username reminder"
            msg.recipients = [email]
            msg.body = f"Hello there,\n\nYour username associated with this email on the linkcart app is: {username}\n\nIf you did not request a reminder of your username, please ignore this email."
            
            mail.send_mail(msg.subject, msg.body, None, msg.recipients)
            return jsonify({"message": "Username sent to email"})
        else:
            return jsonify({"error": "Error in retrieving username"}), 401

    except Exception as e:
        logging.exception("Unexpected error in /request-username")
        return jsonify({"error": "An unexpected error occurred while attempting to send username"}), 500

@socketio.on("go-online")
@token_required
def handle_go_online(*args, **kwargs):
    try:
        user = kwargs.get('user')

        print(f"[Socket.IO] User in handle_connect: {user}")
        if not user:
            logging.warning("No user provided to handle_connect")
            disconnect()
            return
        
        user_id = user["user_id"]
        toggled_user = crud.set_user_online_status(user_id, True)
        if toggled_user:
            logging.info(f"User {toggled_user.username} (ID: {user_id})  is now online")
            
            user["isOnline"] = True
            socketio.emit('status_update', {
                "username": toggled_user.username,
                "isOnline": True
            })
        else:
            logging.error(f"Failed to toggle online status for user ID {user_id}")
            disconnect()

    except Exception as e:
        logging.exception("Unexpected error in connecting socketio")
        disconnect()

@socketio.on('disconnect')
@token_required
def handle_disconnect(*args, **kwargs):
    try:
        user = kwargs.get('user')
        if not user:
            logging.warning("No user provided to handle_disconnect")
            disconnect()
            return
    except Exception as e:
        logging.exception("Unexpected error in disconnecting socketio")
        return jsonify({"error": "An unexpected error occurred while disconnecting from socketio"}), 500
    
@socketio.on('manual-disconnect')
@token_required
def handle_manual_disconnect(*args, **kwargs):
    print(f"Entered backend manual-disconnect with args: {args} and kwargs: {kwargs}")
    print("Have entered the manual-disconnect backend endpoint")

    cb = None
    if args and callable(args[-1]):
        cb = args[-1]

    try:
        user = kwargs.get('user')
        if not user:
            logging.debug(f"No user provided in handle_manual_disconnect")
            disconnect()
            if(cb):
                cb(False)
            return
        
        user_id = user["user_id"]
        toggled_user = crud.set_user_online_status(user_id, False)
        if toggled_user:
            logging.info(f"User {toggled_user.username} is now offline")
            user["isOnline"] = False
            socketio.emit('status_update', {
                "username": toggled_user.username,
                "isOnline": False
            })
            if cb:
                cb(True)

    except Exception as e:
        logging.exception("Unexpected error in disconnecting socketio")
        if cb:
            cb(False)
    
@auth_bp.route('/sync-status', methods=['GET'])
@token_required
def sync_online_status():
    try:
        user = request.user_payload

        if not user:
            logging.warning("Unauthorized access to /sync-status")
            return jsonify({"error": "Unauthorized"}), 401

        username = user.get("username")
        toggled_user = crud.get_user(username=username)

        if toggled_user:
            logging.info(f"User {username} sync status: {toggled_user.isOnline}")

            new_token = create_jwt(toggled_user, app)

            response = jsonify({"isOnline": toggled_user.isOnline})
            response.set_cookie('jwtToken', new_token, httponly=True, samesite='Lax', secure=False)
            
            logging.debug(f"Updated jwtToken with isOnline status: {toggled_user.isOnline}")
            return response, 200
        else:
            logging.warning(f"User not found: {username}")
            return jsonify({"error": "User not found"}), 404

    except Exception as e:
        logging.exception("Error syncing online status")
        return jsonify({"error": "Failed to sync online status"}), 500