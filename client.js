const socket = io();

let localStream;
let peerConnection;

const myVideo = document.getElementById("myVideo");
const userVideo = document.getElementById("userVideo");

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

async function startVideo() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  myVideo.srcObject = localStream;
}

function createPeer() {
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = e => {
    userVideo.srcObject = e.streams[0];
  };

  peerConnection.onicecandidate = e => {
    if (e.candidate) socket.emit("ice-candidate", e.candidate);
  };
}

socket.on("message", async msg => {
  document.getElementById("chat").innerHTML += "<p>"+msg+"</p>";

  if (msg === "Connected!") {
    createPeer();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
  }
});

socket.on("offer", async offer => {
  createPeer();
  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);
});

socket.on("answer", async answer => {
  await peerConnection.setRemoteDescription(answer);
});

socket.on("ice-candidate", async candidate => {
  if (peerConnection) await peerConnection.addIceCandidate(candidate);
});

function sendMsg(){
  let msg = document.getElementById("msg").value;
  socket.emit("message", msg);
}

function nextUser(){
  socket.emit("next");
}

function startChat() {
  const gender = document.getElementById("gender").value;
  const looking = document.getElementById("looking").value;
  socket.emit("join", { gender, looking });
}

startVideo();
