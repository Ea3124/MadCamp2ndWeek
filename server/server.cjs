// server/server.cjs
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 정적 파일 또는 라우팅 설정
app.get('/', (req, res) => {
  res.send('Hello MMO');
});

// 플레이어와 방 정보를 저장할 객체
let players = {}; // { socketId: { x, y, roomId, nickname }, ... }
let rooms = {};   // { roomName: { map, password, players: [socketId, ...], leader: socketId, status: 'waiting' | 'started' }, ... }

// 플레이어 초기화 함수
function initializePlayer(socket, nickname) {
  if (!players[socket.id]) {
    players[socket.id] = {
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600),
      roomId: null,
      nickname: nickname || 'noname'
    };
    console.log(`[initializePlayer] Player: ${socket.id}, nickname: ${players[socket.id].nickname}`);
  }
}

// 충돌 검사 함수
function checkCollision(player, newX, newY) {
  return Object.values(players).some(p => {
    if (p.id === player.id) return false; // 자신과의 충돌은 무시
    const distance = Math.hypot(p.x - newX, p.y - newY);
    return distance < 50; 
  });
}


// 방 목록을 반환하는 헬퍼 함수
function getRoomList() {
  return Object.keys(rooms).map((roomName) => {
    const room = rooms[roomName];
    return {
      roomName,
      map: room.map,
      playerCount: room.players.length,
      passwordProtected: room.password ? true : false,
      status: room.status
    };
  });
}

// 예) 1초마다 전체 플레이어 좌표를 syncPosition 이벤트로 전송
setInterval(() => {
  for (const [id, p] of Object.entries(players)) {
    // roomId가 있을 경우, 그 방에만 보내거나, 전역으로 보내거나 결정은 자유
    // 여기서는 간단히 모두에게 보낸다고 가정
    io.emit('syncPosition', {
      id,
      x: p.x,
      y: p.y
    });
  }
}, 1000);

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // 클라이언트에게 자신의 socket.id 전송
  socket.emit('yourId', socket.id);

  // 클라이언트에서 닉네임을 포함하여 'newplayer'를 보냄
  socket.on('newplayer', (data) => {
    const { nickname } = data || {};
    initializePlayer(socket, nickname);

    // 현재 접속 중인 모든 플레이어 목록
    const allPlayersArr = Object.keys(players).map((id) => {
      const p = players[id];
      return { id, x: p.x, y: p.y, nickname: p.nickname };
    });
    socket.emit('allplayers', allPlayersArr);

    // 본인의 ID를 알려줌
    socket.emit('yourId', socket.id);

    // 다른 모든 플레이어에게 새 플레이어 정보 전송
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

    // 플레이어 초기화 (이미 초기화되어 있을 수도 있으므로)
    initializePlayer(socket, players[socket.id]?.nickname);

    // 새로운 방 생성
    rooms[roomName] = {
      map: map,
      password: password || null,
      players: [socket.id],
      leader: socket.id,      // 방장 설정
      status: 'waiting'       // 초기 상태는 대기 중
    };

    // 플레이어 roomId 설정
  players[socket.id].roomId = roomName;

  // 소켓 join
  socket.join(roomName);

  // => 클라이언트에게 "방장(socket.id)" 정보를 함께 보냄
  socket.emit('createroom_response', { 
    success: true, 
    roomName: roomName, 
    leader: socket.id
  });

  io.emit('roomlist_update', getRoomList());
  console.log(`방 생성됨: ${roomName}, leader=${socket.id}`);
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
    if (room.status !== 'waiting') {
      socket.emit('joinroom_response', { success: false, message: '이미 게임이 시작된 방입니다.' });
      return;
    }
    if (room.players.length >= 4) {
      socket.emit('joinroom_response', { success: false, message: '방이 꽉 찼습니다.' });
      return;
    }
  
    initializePlayer(socket, players[socket.id]?.nickname);
    room.players.push(socket.id);
    players[socket.id].roomId = roomName;
    socket.join(roomName);
  
    // => joinroom_response에서 leader 정보도 함께 보내줌
    socket.emit('joinroom_response', { 
      success: true, 
      roomName: roomName, 
      map: room.map,
      leader: room.leader
    });
  
    socket.to(roomName).emit('newplayer', { 
      id: socket.id, 
      x: players[socket.id].x, 
      y: players[socket.id].y, 
      nickname: players[socket.id].nickname 
    });
  
    io.emit('roomlist_update', getRoomList());
    console.log(`플레이어 ${socket.id}가 방 ${roomName}에 참여함`);
  
    if (room.players.length === 4) {
      room.status = 'ready';
      // => 4명 찼을 때 'room_ready'에도 leader를 함께 보내면 편하다
      io.to(roomName).emit('room_ready', {
        leader: room.leader
      });
      io.emit('roomlist_update', getRoomList());
      console.log(`방 ${roomName}이(가) 꽉 찼습니다.`);
    }
  });
  

  // 'startgame' 이벤트 처리 (방장이 게임 시작 버튼 클릭)
  socket.on('startgame', (data) => {
    const { roomName } = data;

    const room = rooms[roomName];
    if (!room) {
      socket.emit('startgame_response', { success: false, message: '존재하지 않는 방입니다.' });
      return;
    }

    if (room.leader !== socket.id) {
      socket.emit('startgame_response', { success: false, message: '게임을 시작할 권한이 없습니다.' });
      return;
    }

    if (room.players.length < 4) {
      socket.emit('startgame_response', { success: false, message: '플레이어가 충분하지 않습니다.' });
      console.log('아직 4명이 다 모이지 않았습니다');
      return;
    }

    // 방 상태를 'started'로 변경
    room.status = 'started';
    io.to(roomName).emit('startgame'); // 방 내 모든 클라이언트에게 게임 시작 신호 전송
    io.emit('roomlist_update', getRoomList()); // 방 목록 업데이트

    console.log(`방 ${roomName}에서 게임을 시작합니다.`);
  });

  // 'leaveroom' 이벤트 처리
  socket.on('leaveroom', () => {
    const roomName = players[socket.id]?.roomId;
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
        // 방장이 떠났다면 새로운 방장 지정
        if (room.leader === socket.id) {
          room.leader = room.players[0];
          io.to(roomName).emit('new_leader', { leader: room.leader });
          console.log(`방 ${roomName}의 새로운 방장: ${room.leader}`);
        }

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
  // socket.on('move', (data) => {
  //   if (!players[socket.id]) return;
  //   const roomName = players[socket.id].roomId;
  //   if (!roomName) return;

  //   let newX = players[socket.id].x;
  //   let newY = players[socket.id].y;

  //   switch (data.dir) {
  //     case 'left': newX -= 5; break;
  //     case 'right': newX += 5; break;
  //     case 'up': newY -= 5; break;
  //     case 'down': newY += 5; break;
  //   }

  //   if (!checkCollision(players[socket.id], newX, newY)) {
  //     players[socket.id].x = newX;
  //     players[socket.id].y = newY;
  //     io.to(roomName).emit('move', { id: socket.id, x: newX, y: newY });
  //   } else {
  //     console.log(`플레이어 ${socket.id}의 이동이 충돌로 인해 취소됨.`);
  //   }
  // });

  // (선택) move 이벤트에서 서버도 x,y를 업데이트해서 '대략적인' 위치를 저장
  socket.on('move', (data) => {
    if (!players[socket.id]) return;
    const roomName = players[socket.id].roomId;
    if (!roomName) return;

    // data.dir = 'left'|'right'|'up'|'down'|'stop'
    // 간단히 속도 5로 계산
    const speed = 5;
    switch (data.dir) {
      case 'left':  players[socket.id].x -= speed; break;
      case 'right': players[socket.id].x += speed; break;
      case 'up':    players[socket.id].y -= speed; break;
      case 'down':  players[socket.id].y += speed; break;
      // stop이면 변화 없음
    }

    // 그리고 이 방향 정보를 그대로 방에 브로드캐스트
    io.to(roomName).emit('move', {
      id: socket.id,
      dir: data.dir,
    });
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
          // 방장이 떠났다면 새로운 방장 지정
          if (room.leader === socket.id) {
            room.leader = room.players[0];
            io.to(roomName).emit('new_leader', { leader: room.leader });
            console.log(`방 ${roomName}의 새로운 방장: ${room.leader}`);
          }

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

  // 'getplayersinroom' 이벤트 처리
  socket.on('getplayersinroom', (data) => {
    const { roomName } = data;
    const room = rooms[roomName];
    if (!room) {
      socket.emit('playersinroom', []);
      return;
    }

    const playersInRoom = room.players.map(id => {
      return { id, nickname: players[id].nickname };
    });

    socket.emit('playersinroom', playersInRoom);
  });

  socket.on('reportPosition', (data) => {
    if (!players[socket.id]) return;
    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
  });
  

});

server.listen(3000, '0.0.0.0', () => {
  console.log('listening on http://localhost:3000');
});
