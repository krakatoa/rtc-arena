var socket = io.connect('wss://' + document.domain + ':' + 8943);

socket.on('connect', function(msg) {
  console.log("connected as " + queryParams().user);
  socket.emit('join', { user: queryParams().user, room: queryParams().room });
});

window.addEventListener("beforeunload", function (e) {
  var confirmationMessage = "Seguro?";

  (e || window.event).returnValue = confirmationMessage; //Gecko + IE
  return confirmationMessage;                            //Webkit, Safari, Chrome
});

window.onunload = function() {
  socket.emit('leave', { user: queryParams().user, room: queryParams().room });
};

socket.on('disconnect', function(msg) {
  console.log("disconnected!");
});

socket.on('message', function(msg) {
  switch (msg.event) {
    case 'joined':
      console.log("user " + msg.user + " joined.");
      var currentUsers = removeFromList(msg.currentUsers, queryParams().user);
      console.log("  currentUsers: " + currentUsers);
      currentUsers.forEach(function(username) {
        prepareConnectionFor(username);
      });
      break;
    case 'leaved':
      console.log("user " + msg.user + " leaved.");
      removeConnectionFor(msg.user);
      break;
    default:
      console.log('unhandled msg: ');
      console.log(msg);
  }
});

socket.on('new-offer', function(msg) {
  if (msg.to === queryParams().user) {
    console.log("received offer from: " + msg.from);
    var pc = peerConnections[msg.from];
    pc.setRemoteDescription(msg.sdp).then(function() {
      pc.addStream(stream);
      pc.createAnswer().then(
        function(desc) {
          pc.setLocalDescription(desc).then(function() {
            socket.emit('new-answer', { from: queryParams().user, to: msg.from, sdp: desc, room: queryParams().room });
          }, function(err) {
            console.log("error setting LocalDescription");
          });
        }, function(err) {
          console.log("error: " + error.toString());
        }
      );
    }, function(err) {
      console.log("error setting RemoteDescription")
    });
  }
});

socket.on('new-answer', function(msg) {
  if (msg.to === queryParams().user) {
    console.log("received answer from: " + msg.from);
    var pc = peerConnections[msg.from];
    pc.setRemoteDescription(msg.sdp).then(function() {
      // setupFinishes = performance.now();
      // console.log("setup time: " + ((setupFinishes - setupStarts) / 1000));
    }, function(err) {
      console.log("error setting remote sdp");
    });
  }
});

function removeFromList(list, rem) {
  if (list.indexOf(rem) < 0) {
    return list
  } else {
    return list.slice(0, list.indexOf(rem)).concat(list.slice(list.indexOf(rem) + 1, list.length));
  }
};
