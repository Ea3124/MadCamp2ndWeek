// server/server.js 
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 정적 파일 또는 라우팅 설정
app.get('/', (req, res) => {
  res.send('Hello MMO');
});


let players = {}; // { socketId: { x, y, ... } }

// 소켓 연결
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('newplayer', () => {
    // 새 플레이어 좌표, 상태를 아무렇게나 초기화
    players[socket.id] = {
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600),
    };

    // 1) 현재 접속중인 모든 플레이어 목록을 본인에게 전송
    const allPlayersArr = Object.keys(players).map((id) => {
      console.log('id', id);
      return { id, x: players[id].x, y: players[id].y };
    });
    socket.emit('allplayers', allPlayersArr);
    console.log('allplayers', allPlayersArr);

    // 2) 다른 모든 플레이어에게 새 플레이어 정보 전송
    socket.broadcast.emit('newplayer', { id: socket.id, ...players[socket.id] });
  });

  // 클라이언트에서 "click" 이벤트로 좌표를 전달받으면 갱신
  socket.on('click', (data) => {
    if (!players[socket.id]) return;
    players[socket.id].x = data.x;
    players[socket.id].y = data.y;

    console.log('click', data.x);

    // 모든 클라이언트에게 브로드캐스트
    io.emit('move', { id: socket.id, x: data.x, y: data.y });
  });

  // 연결 해제
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
    // 모두에게 "이 플레이어 제거" 알림
    io.emit('remove', socket.id);
  });
});

server.listen(3000, () => {
  console.log('listening on http://localhost:3000');
});
