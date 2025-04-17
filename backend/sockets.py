from extensions import socketio

@socketio.on("connect")
def handle_connect():
    socketio.emit("server_ready", {"msg": "connected and acknowledged"})


@socketio.on_error()
def handle_error(e):
    print("Socket.IO error:", e)

@socketio.on('*')
def catch_all(event, data=None):
    print(f"SocketIO received: {event}, data={data}")