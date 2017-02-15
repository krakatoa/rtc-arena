const servers = {
  iceServers: [
    {url:'stun:stun01.sipphone.com'},
    {url:'stun:stun.ekiga.net'},
    {url:'stun:stun.fwdnet.net'},
    {url:'stun:stun.ideasip.com'},
    {url:'stun:stun.iptel.org'},
    {url:'stun:stun.rixtelecom.se'},
    {url:'stun:stun.schlund.de'},
    {url:'stun:stun.l.google.com:19302'},
    {url:'stun:stun1.l.google.com:19302'},
    {url:'stun:stun2.l.google.com:19302'},
    {url:'stun:stun3.l.google.com:19302'},
    {url:'stun:stun4.l.google.com:19302'},
    {url:'stun:stunserver.org'},
    {url:'stun:stun.softjoys.com'},
    {url:'stun:stun.voiparound.com'},
    {url:'stun:stun.voipbuster.com'},
    {url:'stun:stun.voipstunt.com'},
    {url:'stun:stun.voxgratia.org'},
    {url:'stun:stun.xten.com'},
    {
      url: 'turn:numb.viagenie.ca',
      credential: 'muazkh',
      username: 'webrtc@live.com'
    },
    {
      url: 'turn:192.158.29.39:3478?transport=udp',
      credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      username: '28224511:1379330808'
    },
    {
      url: 'turn:192.158.29.39:3478?transport=tcp',
      credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      username: '28224511:1379330808'
    }
  ]
};

var peerConnections = {}
var stream;
var setupStarts;
var setupFinishes;

function getUserMedia() {
  // navigator.getUserMedia({video: { optional: [{ sourceId: "ddaa72d062e78373191fe666c51dee6dd3861aca1ffa58ced545793db280eab5" }] }, audio: true}, function(s) {
  navigator.getUserMedia({video: true, audio: true}, function(s) {
    var loopbackVideoEl = document.getElementById('video-loopback');
    loopbackVideoEl.src = window.URL.createObjectURL(s);

    stream = s;
    stream.getAudioTracks().forEach(function(track) { track.stop(); });
  }, function(err) {});
}

function appendVideoEl(username) {
  if (!document.getElementById('video-' + username)) {
    console.log("  create VideoEl for: " + username);
    var ul = document.getElementById('videos');
    var videoEl = document.createElement('video');
    videoEl.autoplay = true;
    videoEl.id = 'video-' + username;
    ul.appendChild(videoEl);
  }
}

function createPeerConnectionFor(username) {
  if (peerConnections[username]) {
    peerConnections[username].close();
  }

  console.log("  create PeerConnection for: " + username);
  var conn = new webkitRTCPeerConnection(servers);

  conn.onicecandidate = function(e) {
    if (e != null && e.candidate != null) {
      socket.emit('new-ice-candidate', { from: queryParams().user, to: username, candidate: e.candidate, room: queryParams().room })
    }
  };

  conn.oniceconnectionstatechange = function(e) {
    // console.log(queryParams().user + " ice change" + e.target.iceGatheringState);
  };

  conn.onaddstream = function(e) {
    var videoEl = document.getElementById('video-' + username);
    videoEl.src = window.URL.createObjectURL(e.stream);
  }

  peerConnections[username] = conn;
}

function prepareConnectionFor(username) {
  console.log("  prepare connection with: " + username);

  appendVideoEl(username);
  createPeerConnectionFor(username);

  socket.on('new-ice-candidate', function(msg) {
    if (msg.candidate != null && msg.to === queryParams().user) {
      console.log("new ice candidate from: " + msg.from + ": " + msg.candidate.candidate);
      peerConnections[msg.from].addIceCandidate(new RTCIceCandidate(msg.candidate)).then(function() {
        console.log("successfully added ICE candidate: " + msg.candidate.candidate);
      }, function(err) {
        console.log("error adding ICE candidate: " + err.toString());
      });
    }
  });
}

function webrtcCall(username) {
  var pc = peerConnections[username];
  pc.addStream(stream);

  // setupStarts = performance.now();

  pc.createOffer({
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
  }).then(
    function(desc) {
      pc.setLocalDescription(desc).then(function() {
        socket.emit('new-offer', { from: queryParams().user, to: username, sdp: desc, room: queryParams().room });
      }, function(err) {
        console.log("failed setting localDescription");
      });
    },
    function(err) { console.log("error: " + error.toString()); }
  );
};

function webrtcCallEveryone() {
  for (let username in peerConnections) {
    webrtcCall(username);
  }
};

function queryParams() {
  var m = {};
  for (let p of window.location.search.substring(1).split("&")) {
    p = p.split("=");
    m[p[0]] = p[1]
  }
  return m
}

function stopTracks() {
  window.stream.getTracks().forEach(function(track) {
    track.stop();
  })
}

function runPcStatsGatherer() {
  window.setInterval(function() {
    if (!window.pc) {
      return;
    }
    window.pc.getStats(function(res) {
      res.result()
        .filter(function(report) {
          return report.type === "ssrc" && report.stat('mediaType') === "video";
        })
        .forEach(function(report) {
          console.log("REPORT: " + report.id + "(" + report.type + ")");
          console.log("  packetsLost: " + report.stat('packetsLost'));
          if (report.id.includes('recv')) {
            console.log("  packetsReceived: " + report.stat('packetsReceived'));
            console.log("  frameRateReceived: " + report.stat('googFrameRateReceived'));
            console.log("  jitterBufferMs: " + report.stat('googJitterBufferMs'));
            // console.log(report.names());
          } else {
            console.log("  packetsSent: " + report.stat('packetsSent'));
            console.log("  frameRateSend: " + report.stat('googFrameRateSent'));
            console.log("  googRtt: " + report.stat('googRtt'));
            // console.log(report.names());
          };
          // report.names().forEach(function(name) {
          //   console.log("  " + name + ": " + report.stat(name));
          // });
        });
    }, null);
  }, 10000);
}

btnCall.addEventListener("click", function() {
  webrtcCallEveryone();
});

btnStopTracks.addEventListener("click", function() {
  stopTracks()
});

getUserMedia();
runPcStatsGatherer();
