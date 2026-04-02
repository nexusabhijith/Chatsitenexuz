const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

let waitingUsers = [];

function removeFromQueue(socket) {
  waitingUsers = waitingUsers.filter(u => u !== socket);
}

io.on("connection", (socket) => {

  socket.on("join", (data) => {
    socket.gender = data.gender || "any";
    socket.looking = data.looking || "any";

    removeFromQueue(socket);

    let matchIndex = waitingUsers.findIndex(user => {
      return (
        (user.looking === "any" || user.looking === socket.gender) &&
        (socket.looking === "any" || socket.looking === user.gender)
      );
    });

    if (matchIndex !== -1) {
      let partner = waitingUsers.splice(matchIndex, 1)[0];
      socket.partner = partner;
      partner.partner = socket;

      socket.emit("message", "Connected!");
      partner.emit("message", "Connected!");
    } else {
      waitingUsers.push(socket);
      socket.emit("message", "Waiting...");
    }
  });

  socket.on("message", (msg) => {
    if (socket.partner) socket.partner.emit("message", msg);
  });

  socket.on("next", () => {
    if (socket.partner) {
      socket.partner.emit("message", "User skipped");
      socket.partner.partner = null;
    }
    socket.partner = null;
    removeFromQueue(socket);
    waitingUsers.push(socket);
  });

  socket.on("offer", data => socket.partner?.emit("offer", data));
  socket.on("answer", data => socket.partner?.emit("answer", data));
  socket.on("ice-candidate", data => socket.partner?.emit("ice-candidate", data));

  socket.on("disconnect", () => {
    removeFromQueue(socket);
    if (socket.partner) {
      socket.partner.emit("message", "User disconnected");
      socket.partner.partner = null;
    }
  });

});

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on " + PORT));
