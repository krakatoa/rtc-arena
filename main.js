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

var pc;
var stream;
var setupStarts;
var setupFinishes;

function getUserMedia() {
  // navigator.getUserMedia({video: { optional: [{ sourceId: "ddaa72d062e78373191fe666c51dee6dd3861aca1ffa58ced545793db280eab5" }] }, audio: true}, function(s) {
  navigator.getUserMedia({video: true, audio: true}, function(s) {
    var video = document.querySelector('video');
    video.src = window.URL.createObjectURL(s);

    stream = s
    stream.getAudioTracks().forEach(function(track) {track.stop();})

    pc = webrtcCreatePeerConnection();
  }, function(err) {});
}

function webrtcCreatePeerConnection() {
  var conn = new webkitRTCPeerConnection(servers);

  conn.onicecandidate = function(e) {
    console.log(e.candidate);
    if (e != null && e.candidate != null) {
      socket.emit('new-ice-candidate', { from: queryParams().user, candidate: e.candidate, room: queryParams().room })
    }
  };

  conn.oniceconnectionstatechange = function(e) {
    console.log(queryParams().user + " ice change" + e.target.iceGatheringState);
  };

  conn.onaddstream = function(e) {
    var remoteVideo = document.getElementById('remotevideo');
    // remoteVideo.srcObject = e.stream
    remoteVideo.src = window.URL.createObjectURL(e.stream);
  }

  socket.on('new-ice-candidate', function(msg) {
    if (msg.candidate != null && msg.from != queryParams().user) {
      console.log("new ice candidate from: " + msg.from + ": " + msg.candidate.candidate);
      // console.log(new RTCIceCandidate(msg.candidate));
      pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).then(function() {
        console.log("successfully added ICE candidate: " + msg.candidate.candidate);
      }, function(err) {
        console.log("error adding ICE candidate: " + err.toString());
      });
    }
  });

  return conn
}

function webrtcCall() {
  pc.addStream(stream);

  socket.on('new-answer', function(msg) {
    console.log("received answer");
    pc.setRemoteDescription(msg.sdp).then(function() {
      setupFinishes = performance.now();
      console.log("setup time: " + ((setupFinishes - setupStarts) / 1000));
    }, function(err) {
      console.log("error setting remote sdp");
    });
  });

  setupStarts = performance.now();

  pc.createOffer({
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
  }).then(
    function(desc) {
      pc.setLocalDescription(desc).then(function() {
        socket.emit('new-offer', { from: queryParams().user, sdp: desc, room: queryParams().room });
      }, function(err) {
        console.log("failed setting localDescription");
      });
    },
    function(err) { console.log("error: " + error.toString()); }
  );
};

function webrtcListen() {
  // console.log("waiting offer")
  socket.emit('broadcast', { e: 'waiting_offer', user: queryParams().user, room: queryParams().room});

  pc.onicecandidate = function(e) {
    console.log(e.candidate);
    if (e != null && e.candidate != null) {
      socket.emit('new-ice-candidate', { from: queryParams().user, candidate: e.candidate, room: queryParams().room })
    }
  };

  socket.on('new-offer', function(msg) {
    console.log("received offer")
    pc.setRemoteDescription(msg.sdp).then(function() {
      pc.addStream(stream);
      pc.createAnswer().then(
        function(desc) {
          pc.setLocalDescription(desc).then(function() {
            socket.emit('new-answer', { from: queryParams().user, sdp: desc, room: queryParams().room });
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

  });
}

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

btnListen.addEventListener("click", function(){
  webrtcListen();
});

btnCall.addEventListener("click", function() {
  webrtcCall();
});

btnStopTracks.addEventListener("click", function() {
  stopTracks()
});

getUserMedia();
runPcStatsGatherer();
