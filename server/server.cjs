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

let players = {}; // { socketId: { x, y, roomId } }
let rooms = {}; // { roomName: { map, password, players: [socketId, ...] } }

// 소켓 연결
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // 'newplayer' 이벤트 처리 (초기 플레이어 정보 설정)
  socket.on('newplayer', () => {
    // 새 플레이어 좌표, 상태를 초기화
    players[socket.id] = {
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600),
      roomId: null // 초기에는 어떤 방에도 속하지 않음
    };

    // 1) 현재 접속 중인 모든 플레이어 목록을 본인에게 전송
    const allPlayersArr = Object.keys(players).map((id) => {
      return { id, x: players[id].x, y: players[id].y };
    });
    socket.emit('allplayers', allPlayersArr);
    console.log('allplayers', allPlayersArr);

    socket.emit('yourId', socket.id);

    // 2) 다른 모든 플레이어에게 새 플레이어 정보 전송
    socket.broadcast.emit('newplayer', { id: socket.id, ...players[socket.id] });
  });

  // 'createroom' 이벤트 처리
  socket.on('createroom', (data) => {
    const { roomName, map, password } = data;

    if (rooms[roomName]) {
      // 방이 이미 존재함
      socket.emit('createroom_response', { success: false, message: '이미 존재하는 방 이름입니다.' });
      return;
    }

    // 새로운 방 생성
    rooms[roomName] = {
      map: map,
      password: password || null,
      players: [socket.id]
    };

    // 플레이어를 방에 추가
    players[socket.id].roomId = roomName;
    socket.join(roomName);

    // 성공 응답 전송
    socket.emit('createroom_response', { success: true, roomName: roomName });

    // 모든 클라이언트에게 방 목록 업데이트 알림
    io.emit('roomlist_update', getRoomList());

    console.log(`방 생성됨: ${roomName} by ${socket.id}`);
  });

  // 'getrooms' 이벤트 처리 (방 목록 요청)
  socket.on('getrooms', () => {
    socket.emit('roomlist', getRoomList());
  });

  // 'joinroom' 이벤트 처리
  socket.on('joinroom', (data) => {
    const { roomName, password } = data;

    const room = rooms[roomName];
    if (!room) {
      socket.emit('joinroom_response', { success: false, message: '존재하지 않는 방입니다.' });
      return;
    }

    if (room.password && room.password !== password) {
      socket.emit('joinroom_response', { success: false, message: '비밀번호가 틀렸습니다.' });
      return;
    }

    // 플레이어를 방에 추가
    room.players.push(socket.id);
    players[socket.id].roomId = roomName;
    socket.join(roomName);

    // 성공 응답 전송
    socket.emit('joinroom_response', { success: true, roomName: roomName, map: room.map });

    // 방 내 다른 플레이어들에게 새 플레이어 정보 전송
    socket.to(roomName).emit('newplayer', { id: socket.id, x: players[socket.id].x, y: players[socket.id].y });

    // 모든 클라이언트에게 방 목록 업데이트 알림
    io.emit('roomlist_update', getRoomList());

    console.log(`플레이어 ${socket.id}가 방 ${roomName}에 참여함`);
  });

  // 'leaveroom' 이벤트 처리
  socket.on('leaveroom', () => {
    const roomName = players[socket.id].roomId;
    if (!roomName) {
      socket.emit('leaveroom_response', { success: false, message: '현재 방에 속해 있지 않습니다.' });
      return;
    }

    // 방에서 플레이어 제거
    const room = rooms[roomName];
    if (room) {
      room.players = room.players.filter(id => id !== socket.id);
      socket.leave(roomName);
      players[socket.id].roomId = null;

      // 방이 비었으면 삭제
      if (room.players.length === 0) {
        delete rooms[roomName];
        console.log(`방 ${roomName}이(가) 비어서 삭제됨.`);
      } else {
        // 방 내 다른 플레이어들에게 플레이어가 떠났음을 알림
        socket.to(roomName).emit('remove', socket.id);
      }

      // 성공 응답 전송
      socket.emit('leaveroom_response', { success: true });

      // 모든 클라이언트에게 방 목록 업데이트 알림
      io.emit('roomlist_update', getRoomList());

      console.log(`플레이어 ${socket.id}가 방 ${roomName}을(를) 떠남`);
    } else {
      socket.emit('leaveroom_response', { success: false, message: '방이 존재하지 않습니다.' });
    }
  });

  // 클라이언트에서 "click" 이벤트로 좌표를 전달받으면 갱신
  socket.on('click', (data) => {
    if (!players[socket.id]) return;

    const roomName = players[socket.id].roomId;
    if (roomName) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;

      console.log('click', data.x, data.y);

      // 해당 방 내 모든 클라이언트에게 브로드캐스트
      io.to(roomName).emit('move', { id: socket.id, x: data.x, y: data.y });
    } else {
      // 방에 속해 있지 않으면 모든 클라이언트에게 브로드캐스트
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;

      io.emit('move', { id: socket.id, x: data.x, y: data.y });
    }
  });

  // 'move' 이벤트 핸들러 수정 (방 내에서만 처리)
  socket.on('move', (data) => {
    if (!players[socket.id]) return;
    const roomName = players[socket.id].roomId;
    if (!roomName) return;

    let newX = players[socket.id].x;
    let newY = players[socket.id].y;
    
    switch (data.dir) {
        case 'left': newX -= 5; break;
        case 'right': newX += 5; break;
        case 'up': newY -= 5; break;
        case 'down': newY += 5; break;
    }

    if (!checkCollision(players[socket.id], newX, newY)) {
        players[socket.id].x = newX;
        players[socket.id].y = newY;
        io.to(roomName).emit('move', { id: socket.id, x: newX, y: newY });
    }
  });

  // 연결 해제
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // 방에서 플레이어 제거
    const roomName = players[socket.id]?.roomId;
    if (roomName) {
      const room = rooms[roomName];
      if (room) {
        room.players = room.players.filter(id => id !== socket.id);
        socket.leave(roomName);

        if (room.players.length === 0) {
          delete rooms[roomName];
          console.log(`방 ${roomName}이(가) 비어서 삭제됨.`);
        } else {
          // 방 내 다른 플레이어들에게 플레이어가 떠났음을 알림
          socket.to(roomName).emit('remove', socket.id);
        }

        // 방 목록 업데이트
        io.emit('roomlist_update', getRoomList());
      }
    }

    // 플레이어 목록에서 제거
    delete players[socket.id];
    // 모든 클라이언트에게 플레이어 제거 알림
    io.emit('remove', socket.id);
  });
});

// 방 목록을 반환하는 헬퍼 함수
function getRoomList() {
  return Object.keys(rooms).map((roomName) => {
    const room = rooms[roomName];
    return {
      roomName,
      map: room.map,
      playerCount: room.players.length,
      passwordProtected: room.password ? true : false
    };
  });
}

server.listen(3000, '0.0.0.0', () => {
  console.log('listening on http://localhost:3000');
});
