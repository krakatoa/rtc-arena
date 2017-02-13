from flask import Flask, request, send_from_directory
from flask_socketio import SocketIO, join_room, leave_room, send, emit
app = Flask(__name__)
socketio = SocketIO(app)

@app.route("/")
def hello():
  return send_from_directory('./', 'index.html')

@app.route("/main.js")
def main_js():
  return send_from_directory('./', 'main.js')

@socketio.on('broadcast')
def handle_message(json):
  room = json['room']
  send(json, room=room)

@socketio.on('new-offer')
def handle_new_call(json):
  room = json['room']
  emit('new-offer', json, room=room)

@socketio.on('new-answer')
def handle_new_answer(json):
  room = json['room']
  emit('new-answer', json, room=room)

@socketio.on('new-ice-candidate')
def handle_json(json):
  room = json['room']
  emit('new-ice-candidate', json, room=room)

@socketio.on('join')
def on_join(json):
  user = json['user']
  room = json['room']
  join_room(room)
  send(user + ' has entered the room.', room=room)

if __name__ == "__main__":
  socketio.run(app)
