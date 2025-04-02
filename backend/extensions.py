from flask_socketio import SocketIO
from flask_wtf.csrf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_mailman import Mail

csrf = CSRFProtect()
socketio = SocketIO(cors_allowed_origins="http://localhost:3000", ping_timeout=30000, ping_interval=25000)
limiter = Limiter(get_remote_address, default_limits=["200 per day", "50 per hour"])
mail = Mail()