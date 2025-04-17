from flask import Flask
# import eventlet
# eventlet.monkey_patch()
import jinja2

import logging

from model import connect_to_db
import os

from flask_cors import CORS

from extensions import csrf, socketio, limiter, mail

app = Flask(__name__)
# app.secret_key = 'dev' 
app.secret_key = os.getenv("APP_SECRET_KEY")

# logging.basicConfig(level=logging.DEBUG)
logging.getLogger("werkzeug").setLevel(logging.DEBUG)

app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True

app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

app.jinja_env.undefined = jinja2.StrictUndefined

# Configure Flask-Mailman
app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("MAIL_DEFAULT_SENDER", "noreply@linkcart.com")

csrf.init_app(app)
socketio.init_app(app)
limiter.init_app(app)
mail.init_app(app)

CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

from routes.auth import auth_bp
from routes.community import community_bp
from routes.friends import friends_bp
from routes.products import products_bp
from routes.profile import profile_bp
from routes.user import user_bp
from sockets import *

app.register_blueprint(auth_bp)
app.register_blueprint(community_bp)
app.register_blueprint(friends_bp)
app.register_blueprint(products_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(user_bp)

if __name__ == "__main__":
    connect_to_db(app, echo=False)
    socketio.run(app, debug=True, port=8000, host="localhost")