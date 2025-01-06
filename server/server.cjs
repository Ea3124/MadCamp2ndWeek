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

//정적 파일 또는 라우팅 설정
app.get('/', (req, res) => {
  res.send('Hello MMO');
});

// 플레이어와 방 정보를 저장 -> 이때 플레이어에 roomId를 부여해서 같은 방에 참여한 애들을 구분할 수 있게함.
let players = {}; // { socketId: {x, y, roomDetails, nickname}, .. }  socketId를 key로, x, y, roomDetails, nickname을 value로
// 이때, roomDetails = [roomName, playerIndex] 배열
let rooms = {}; // {roomName: { map, password, player}}


//플레이어 초기화 함수
function initializePlayer(socket, nickname) {
  if (!players[socket.id]) {
    players[socket.id] = {
      x: 500,
      y: 500,
      roomDetails: null,
      nickname: nickname || 'noname'
    }; // player의 속성으로 x, y, roomDeatils, nickname 생성
    console.log(`[initializePlayer] socket id = ${socket.id}, nickname: ${players[socket.id].nickname}`);
  }
}

// 방 목록 반환 함수
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

  // ex)
  // [
  //   {
  //     "roomName": "Room1",
  //     "map": "Forest",
  //     "playerCount": 3,
  //     "passwordProtected": true,
  //     "status": "waiting"
  //   },
  //   ...
  // ]
}
  
  
// 1초마다 전체 플레이어 좌표를 syncPosition 이벤트로 전송
setInterval(() => {
  for (const [id, p] of Object.entries(players)) { // players의 key-value쌍을 iterate. id = socket
    // players 가 { socketId: {x, y, roomDetails, nickname}, .. } 니까 id가 socketId, p가  {x, y, roomDetails, nickname}
    const roomDetails = p.roomDetails;
    let roomName = null; // 일단 roomName를 null로 선언. 이후 roomDetails가 존재하면 바꿈.
    if (roomDetails === null) {
      console.log('[setInterval] roomDetails is null');
    } else if (roomDetails == null) {
      console.log('[setInterval] roomDetails is undefined');
    } else {
      roomName = roomDetails[0];
    }

    io.emit('syncPosition', { // 서버에 연결된 모든 클라이언트에 전송
      id, 
      x: p.x,
      y: p.y
    });
  }
}, 10);



io.on('connection', (socket) => {
  console.log('[io.on(connection)] A new user connected: ', socket.id);
  
  // 클라이언트에게 본인의 socket.id 알려줌
  socket.emit('yourId', socket.id);
  

  // *** 클라이언트로부터 받은 'newplayer' 이벤트 처리 ***
  socket.on('newplayer', (data) => {

    const { nickname } = data || {}; // data 객체에서 nickname 속성 추출 (즉, data.nickname)
    console.log('[socket.on(newPlayer)] new player name: ', data);
    initializePlayer(socket, nickname);
    
    // 현재 접속 중인 모든 플레이어 목록
    // ex) allPlayersArr = [ { id: 'player1', x: 100, y: 200, nickname: 'Alice' },{ id: 'player2', x: 150, y: 250, nickname: 'Bob' }]
    const allPlayersArr = Object.keys(players).map((id) => { // .map으로 각 요소로 함수 실행 후 반환 값으로 새 배열생성
      const p = players[id];
      return { id, x: p.x, y: p.y, nickname: p.nickname};
    });
    socket.emit('allplayers', allPlayersArr);

    // 클라이언트에게 'newplayer' 이벤트를 보냄
    // socket.broadcast.emit('newplayer', { id: socket.id, ...players[socket.id] }); //...으로 객체 내의 속성을 펼침
    socket.broadcast.emit('newplayer', {
      id: socket.id,
      x: players[socket.id].x,
      y: players[socket.id].y,
      nickname: players[socket.id].nickname,
      roomDetails: players[socket.id].roomDetails || null
    });
    // ex)
    // {
    //   "id": "소켓아이디",
    //   "x": 100,
    //   "y": 200,
    // "roomDetails":
    //   "nickname": "Alice",
    // } 
  });


  // *** 'createroom' 이벤트 처리 ***
  socket.on('createroom', (data) => {
    const { roomName, map, password } = data;

    if (rooms[roomName]) {
      // 방이 이미 존재함
      socket.emit('createroom_response', { succes: false, message: '이미 존재하는 방 이름입니다. '});
      return;
    }

    if (!players[socket.id]) {
      console.log('[socket.on(createroom)] createroom 처리중, 아직 newPlayer도착안함.')
    }
    // 클라이언트측의 newPlayer가 도착하기 이전이면, 안되었을수 있음. 근데 있을까 ?
    initializePlayer(socket, players[socket.id]?.nickname);
    // 플레이어의 roomDetail 추가 
    players[socket.id].roomDetails = [roomName, 0];

    // 새로운 방 생성
    rooms[roomName] = {
      map: map,
      password: password || null,
      players: [socket.id],
      leader: socket.id, // 방장
      status: 'waiting' // 초기상태는 waiting
    };

    socket.join(roomName);
    //socket을 roomName이라는 이름의 방에 조인 (자동생성)
    // join 후, io.to(roomName).emit('message') 같은 방식으로 서버가 특정 방 클라이언트에만 메세지를 보낼 수 있음

    // 클라이언트의 socket.id를 방장 소켓id로 함께 보냄
    socket.emit('createroom_response', {
      success: true,
      roomName: roomName,
      leader: socket.id
    });

    io.emit('roomlist_update', getRoomList());
    console.log(`[socket.on(createroom)] 방 생성됨 = ${roomName}, leader = ${socket.id}`);
  });

  // 'getrooms' 이벤트 처리 (방 목록 요청)
  socket.on('getrooms', () => {
    socket.emit('roomlist', getRoomList());
  });

  // *** 'joinroom' 이벤트 처리 ***
  socket.on('joinroom', (data) => {
    const { roomName, password } = data;
    const room = rooms[roomName];
    if (!room) {
      socket.emit('joinroom_response', { success: false, message: '존재하지 않는 방입니다.' });
      return;
    }
    if (room.status !== 'waiting') {
      socket.emit('joinroom_response', { success: false, message: '이미 게임이 시작된 방입니다. '});
      return;
    }
    if (room.players.length >= 4) {
      socket.emit('joinroom_response', { success: false, message: '방이 꽉 찼습니다.'});
      return;
    }
    
    playerIndex = room.players.length; // 0, 1, 2, 3
    console.log("playerIndex: ",playerIndex);
    console.log("myId",socket.id);
    room.players.push(socket.id);
    players[socket.id].roomDetails = [roomName, playerIndex];
    socket.join(roomName);

    // joinroom_response 성공
    socket.emit('joinroom_response', {
      success: true,
      roomName: roomName,
      map: room.map,
      leader: room.leader
    });

    // joinroom한 player에 대해 newplayer임을 알려줌.
    socket.to(roomName).emit('newplayer', {
      id: socket.id,
      x: players[socket.id].x,
      y: players[socket.id].y,
      nickname: players[socket.id].nickname,
      roomDetails: players[socket.id].roomDetails
    });

    io.emit('roomlist_update', getRoomList());
    console.log(`[socket.on(joinroom)] 플레이어 ${socket.id}가 방 ${roomName}에 참여함`);

    if (room.players.length == 4) { // 방 인원이 꽉 참.
      room.status = 'ready';
      io.to(roomName).emit('room_ready', {
        leader: room.leader
      });
      io.emit('roomlist_update', getRoomList());
      console.log(`[socket.on(createroom)] 방 ${roomName}이(가) 꽉 찼습니다.`);
    }
  });

  // *** 'startgame' 이벤트 처리 ***
  socket.on('startgame', (data) => {
    const { roomName } = data;
    const room = rooms[roomName];

    if (!room) {
      socket.emit('startgame_response', { succes: false, message: '존재하지 않는 방입니다.' });
      return;
    }
    if (room.leader !== socket.id) {
      socket.emit('startgame_response', { succes: false, message: '게임을 시작할 권한이 없습니다.' });
      return;
    }
    if (room.players.length < 4) {
      socket.emit('startgame_response', { succes: false, message: '플레이어가 충분하지 않습니다.' });
      return;
    }

    // 게임 시작
    room.status = 'started';
    const playersInRoom = room.players.map(id => {
      return { id, playerIndex: players[id].roomDetails[1] };
    });
    io.to(roomName).emit('startgame', playersInRoom); // 방 내 모든 클라이언트에게 게임 시작 신호 전송
    
    io.emit('roomlist_update', getRoomList());
    console.log(`[socket.on(startgame)] 방 ${roomName}에서 게임을 시작합니다.`);
  });


  // *** 'leaveroom' 이벤트 처리 ***
  socket.on('leaveroom', () => {
    const roomName = players[socket.id]?.roomDetails[0];
    if (!roomName) {
      socket.emit('leaveroom_response', { success: false, message: '현재 방에 속해있지 않습니다.' });
      return;
    }

    // 방에서 플레이어 제거
    const room = rooms[roomName];
    if (room) {
      room.players = room.players.filter(id => id !== socket.id);
      socket.leave(roomName);
      players[socket.id].roomDetails = null;

      // 방이 비었으면 삭제
      if (room.players.length === 0) {
        delete rooms[roomName];
        console.log(`방 ${roomName}이(가) 비어서 삭제됨.`);
      } else {
        // 방장이 떠났다면 새로운 방장을 지정
        if (room.leader === socket.id) {
          room.leader == room.players[0];
          io.to(roomName).emit('new_leader', { leader: room.leader});
          console.log(`[socket.on(leaveroom)] 방 ${roomName}의 새로운 방장: ${room.leader}`);
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


  // *** 클라이언트에서 "move" 이벤트에서 서버도 x, y를 업데이트해서 '대략적인' 위치를 저장 ***
  socket.on('move', (data) => {
    if (!players[socket.id]) return;
 
    const roomName = players[socket.id].roomDetails
    ? players[socket.id].roomDetails[0]
    : null;
    
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

  // *** 'getplayersinroom' 이벤트 처리 ***
  socket.on('getplayersinroom', (data) => {
    const { roomName } = data;
    const room = rooms[roomName];
    if (!room) {
      socket.emit('playersinroom', []);
      return;
    }

    const playersInRoom = room.players.map(id => {
      return { id, nickname: players[id].nickname || null };
    });

    socket.emit('playersinroom', playersInRoom);
  });

  socket.on('reportPosition', (data) => {
    console.log("players[socket.id]가 존재?")
    if (!players[socket.id]) return;
    console.log("존재")
    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
  });
  

});

server.listen(3000, '0.0.0.0', () => {
  console.log('listening on http://localhost:3000'); 

});