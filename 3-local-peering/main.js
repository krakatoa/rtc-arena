function getUserMedia() {
  navigator.getUserMedia({video: { optional: [{ sourceId: "ddaa72d062e78373191fe666c51dee6dd3861aca1ffa58ced545793db280eab5" }] }, audio: true}, function(s) {
    var video = document.querySelector('video');
    video.src = window.URL.createObjectURL(s);
    window.stream = s;
    window.stream.getAudioTracks().forEach(function(track) {track.stop();})
  }, function(err) {});
}

function stopTracks() {
  window.stream.getTracks().forEach(function(track) {
    track.stop();
  })
}

getUserMedia();

var pc1;
var pc2;

function webrtcCall() {
  servers = null;

  pc1 = new webkitRTCPeerConnection(servers);
  pc1.onicecandidate = function(e) {
    pc2.addIceCandidate(e.candidate).then(function() { console.log("added ICE candidate") }, function() {})
  };

  pc2 = new webkitRTCPeerConnection(servers);
  pc2.onicecandidate = function(e) {
    pc1.addIceCandidate(e.candidate).then(function() { console.log("added ICE candidate") }, function() {})
  };

  pc1.oniceconnectionstatechange = function(e) {
    console.log("pc1 change" + e);
  };
  pc2.oniceconnectionstatechange = function(e) {
    console.log("pc2 change" + e);
  };

  pc2.onaddstream = function(e) {
    var remoteVideo = document.getElementById('remotevideo');
    console.log("onaddstream")
    remoteVideo.srcObject = e.stream;
  };
  pc1.addStream(window.stream);

  //
  pc1.createOffer({
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
  }).then(
    function(desc) {
      pc1.setLocalDescription(desc);/*.then(
        function() {
          onSetLocalSuccess(pc1);
        },
        function(err) { console.log("error: " + error.toString()); }
      );*/
      pc2.setRemoteDescription(desc); /*.then(
        function() {
          onSetRemoteSuccess(pc2);
        },
        function(err) { console.log("error: " + error.toString()); }
      );*/
      pc2.createAnswer().then(
        function(desc) {
          pc2.setLocalDescription(desc);
          pc1.setRemoteDescription(desc);
        },
        function(err) { console.log("error: " + error.toString()); }
      );
    },
    function(err) { console.log("error: " + error.toString()); }
  );
};

btnGetVideoTracks.addEventListener("click", function(){
  navigator.mediaDevices.enumerateDevices().then(function(res) {
    var arr = res.filter(function(device) { return device.kind === "videoinput" })
    for (let device of arr) {
      console.log(device.label + "===" + device.deviceId)
    }
  })
});

btnCall.addEventListener("click", function() {
  webrtcCall();
});

btnStopTracks.addEventListener("click", function() {
  stopTracks()
});
