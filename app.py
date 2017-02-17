from flask import Flask, request, send_from_directory
from flask_socketio import SocketIO, join_room, leave_room, send, emit
from redis.client import StrictRedis

app = Flask(__name__)
socketio = SocketIO(app)
r = StrictRedis(host='localhost', port=6379, db=0)

@app.route("/")
def hello():
  return send_from_directory('./', 'index.html')

@app.route("/main.js")
def main_js():
  return send_from_directory('./', 'main.js')

@app.route("/signaling.js")
def signaling_js():
  return send_from_directory('./', 'signaling.js')

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
  json['event'] = 'joined'
  r.sadd('room:' + room, user)

  v, current_users = r.sscan('room:' + room)
  json['currentUsers'] = current_users

  send(json, room=room)

@socketio.on('leave')
def on_leave(json):
  user = json['user']
  room = json['room']
  leave_room(room)
  json['event'] = 'leaved'

  r.srem('room:' + room, user)
  v, current_users = r.sscan('room:' + room)
  json['currentUsers'] = current_users

  send(json, room=room)

if __name__ == "__main__":
  socketio.run(app)
