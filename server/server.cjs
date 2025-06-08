require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Pool } = require('pg');
const socketIo = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL 연결 재시도 함수
async function waitForPostgres(retries = 5, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const pool = new Pool({
        host: 'db',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password',
        database: process.env.POSTGRES_DB || 'mydb'
      });

      await pool.query('SELECT 1'); // 연결 테스트
      console.log('✅ PostgreSQL 연결 성공!');
      return pool;
    } catch (err) {
      console.log(`🔄 PostgreSQL 연결 재시도 (${i}/${retries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('❌ PostgreSQL 연결 실패: 재시도 모두 실패함.');
}

// 서버 및 소켓 초기화
(async () => {
  try {
    const pool = await waitForPostgres();

    // 라우터 예시
    app.get('/api/users', async (req, res) => {
      try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
      } catch (error) {
        console.error('쿼리 실행 에러:', error);
        res.status(500).json({ error: 'DB 에러' });
      }
    });

    app.post('/api/users', async (req, res) => {
      try {
        const { id, nickname, score } = req.body;
        const query = `
          INSERT INTO users (id, nickname, score) 
          VALUES ($1, $2, $3)
          ON CONFLICT (id) DO NOTHING
        `;
        await pool.query(query, [id, nickname, score]);
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('쿼리 실행 에러:', error);
        res.status(500).json({ error: 'DB 에러' });
      }
    });

    app.patch('/api/users/score', async (req, res) => {
      try {
        const { id, score } = req.body;
        const result = await pool.query(
          'UPDATE users SET score = $1 WHERE id = $2 RETURNING *',
          [score, id]
        );

        if (result.rowCount === 0) {
          return res.status(404).json({ error: '사용자 없음' });
        }

        res.json({ success: true, updatedUser: result.rows[0] });
      } catch (error) {
        console.error('score 업데이트 에러:', error);
        res.status(500).json({ error: 'DB 에러' });
      }
    });

    app.get('/', (req, res) => {
      res.send('Hello MMO');
    });

    const server = http.createServer(app);
    const io = socketIo(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // socket.io 이벤트 핸들링은 여기에 붙이세요

    // 플레이어와 방 정보를 저장 -> 이때 플레이어에 roomId를 부여해서 같은 방에 참여한 애들을 구분할 수 있게함.
let players = {}; // { socketId: {x, y, roomDetails, nickname}, .. }  socketId를 key로, x, y, roomDetails, nickname을 value로
// 이때, roomDetails = [roomName, playerIndex, frozen, isDead] 배열
let rooms = {}; // {roomName: { map, password, player, aliveNum}}
// 방별 타이머 관리를 위한 객체
let roomTimers = {}; //{roomName: {countdown, intervalId}}

//플레이어 초기화 함수
function initializePlayer(socket, nickname) {
  if (!players[socket.id]) {
    players[socket.id] = {
      x: 520,
      y: 420,
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
    io.emit('syncPosition', { // 서버에 연결된 모든 클라이언트에 전송
      id, 
      x: p.x,
      y: p.y
    });
  }
}, 100);

// 타이머 시작 함수
function startTimer(data) {
  // const roomName = players[socket.id].roomDetails[0]; 
  const { roomName, duration } = data;
  const countdown = duration / 1000;
  const room = rooms[roomName];
  
  // 이미 타이머가 실행 중인지 확인
  if (roomTimers[roomName]?.intervalId) {
    console.log(`타이머가 이미 실행 중인 방: ${roomName}`);
    return; // 타이머가 이미 실행 중이라면 중복 시작하지 않음
  }
  
  roomTimers[roomName] = { countdown };
  console.log(`Timer started for room ${roomName} with ${countdown} seconds.`);
  console.log(room.players);

  const intervalId = setInterval(() => {
    if (roomTimers[roomName].countdown > 0) {
      roomTimers[roomName].countdown--;
      console.log(`Timer ticking for room ${roomName}: ${roomTimers[roomName].countdown} seconds left.`);
      // 타이머 업데이트를 방에 브로드캐스트
      io.to(roomName).emit('timerUpdate', { countdown: roomTimers[roomName].countdown });
    } else {
      clearInterval(intervalId);
      delete roomTimers[roomName];
      io.to(roomName).emit('timerEnd');
      console.log(`Timer ended for room ${roomName}.`);
    }
  }, 1000);
  roomTimers[roomName].intervalId = intervalId; // intervalId 저장
}
    io.on('connection', (socket) => {
      console.log('🟢 New socket connection:', socket.id);
      socket.emit('yourId', socket.id);
      // ... 나머지 socket 관련 로직

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

  socket.on('frozenRequest', () => {
    // frozenRequest에 응답
    // 생존자 수
    const player = players[socket.id];
    if (!player || !player.roomDetails) {
      console.warn(`[frozenRequest] Player data or roomDetails missing for socket id: ${socket.id}`);
      return;
    }
    const roomName = player.roomDetails[0];
    const room = rooms[roomName];
    let aliveCount = 0; // 생존자 수를 0으로 초기화
    const alive = room.aliveNum;
    // roomName이 같고, frozen 상태가 아니며, dead 상태도 아닌 플레이어 수 계산
    for (const id in players) {
      const p = players[id];
      if (p.roomDetails[0] === roomName && !p.roomDetails[2] && !p.roomDetails[3]) {// 죽은 것도 아니고, frozen도 아니어야함.
        aliveCount++;
      }
    }
    console.log(`현재 룸에 남은 생존자는: ${alive}, 생존자 중 frozen상태가 아닌 사람은: ${aliveCount}`);
    if (aliveCount !== 2 ) {
      players[socket.id].roomDetails[2] = true;
      io.to(roomName).emit('frozen', {id: socket.id, isFrozen: true});
    } else if (aliveCount == 1) {
      console.log('뭐지 왜 aliveCount in frozenRequest가 1이지');
    } 
  })
  
  // *** 'frozen' 이벤트 처리 ***
  socket.on('frozen', (data) => {
    const isFrozen = data;
    
    if (players[socket.id] && players[socket.id].roomDetails) {
      // roomDetails 있는지 확인
      const roomName = players[socket.id].roomDetails[0];
      const room = rooms[roomName];
      if (players[socket.id].roomDetails[3]) return;

      players[socket.id].roomDetails[2] = isFrozen; // **** 추가함 ****

      console.log("frozen 들어옴: ", isFrozen);
      console.log(room.players);

      if (isFrozen) {
        io.to(roomName).emit('frozen', {id: socket.id, isFrozen: true});
      } else {
        io.to(roomName).emit('frozen', {id: socket.id, isFrozen: false});
      }
    }
  })

  // *** 'startGameTimer' 이벤트 처리 ***
  socket.on('startGameTimer', (data) => {
    const duration  = data;
    const roomName = players[socket.id].roomDetails[0]; 
    startTimer({roomName: roomName, duration: duration});
    io.to(roomName).emit('timerStart', duration);
  });
  
  
  // *** 'players_overlap' 이벤트 처리 ***
  socket.on('players_overlap', (data) => {
    const { aId, bId } = data;
    // console.log(`서버가 받음: 플레이어 ${aId}와 ${bId}가 겹침`);
    
    // 플레이어 존재 여부 확인
    if (!players[aId] || !players[bId]) {
      console.log(`Error: One of the players is not found in the room. Player IDs: ${aId}, ${bId}`);
      return; // 플레이어가 존재하지 않으면 함수 실행 중단
    }
    
    const aPlayer = players[aId];
    const bPlayer = players[bId];
    const roomName = aPlayer.roomDetails[0];
    // const room = rooms[roomName];
    let playerTaggerId = null; 

    if (aPlayer.roomDetails[3] || bPlayer.roomDetails[3]) {
      // 둘 중 하나라도 죽었다면,
      return;
    }

    // console.log("aPlayerIndex: ",aPlayerIndex);
    // console.log("bPlayerIndex: ", bPlayerIndex);
    if ( aPlayer.roomDetails[1] == 2) {
      playerTaggerId = aId;
    }
    if ( bPlayer.roomDetails[1] == 2) {
      playerTaggerId = bId;
    }

    // *** 만약에 둘 다 술래이면 문제가 발생할 수 있음 *** 

    if ( playerTaggerId === null ) {
      // 둘 다 술래가 아님
      
      // 둘 중 하나라도 isFrozen 이 true
      if ( aPlayer.roomDetails[2] && !bPlayer.roomDetails[2]) {  
        // aPlayer가 frozen, bPlayer가 not frozen
        console.log(`서버가 받음: 플레이어 a: ${aId}와 b: ${bId}가 겹쳐서 a가 땡됨`);
        aPlayer.roomDetails[2] = false;
        io.to(roomName).emit('frozen', {id: aId, isFrozen: false});   
      } 
      if ( bPlayer.roomDetails[2] && !aPlayer.roomDetails[2]) {
        // bPlayer가 frozen, aPlayer가 not frozen
        console.log(`서버가 받음: 플레이어 a: ${aId}와 b: ${bId}가 겹쳐서 b가 땡됨`); 
        bPlayer.roomDetails[2] = false;
        io.to(roomName).emit('frozen', {id: bId, isFrozen: false});
      }
    } else { // 둘 중 하나가 술래임.
      // console.log("술래와 겹침");
      if ( !aPlayer.roomDetails[2] && !bPlayer.roomDetails[2] ) {
        // aPlayer와 bPlayer 모두 isFrozen이 false
        if (playerTaggerId == aId) {
          io.to(roomName).emit('playerOut', bId );
          bPlayer.roomDetails[3] = true;
          rooms[roomName].aliveNum = rooms[roomName].aliveNum - 1;
          console.log(`서버가 받음: 플레이어 a: ${aId}와 b: ${bId}가 겹쳐서 ${bId}가 탈락됨`); 
        } else if (playerTaggerId == bId) {
          io.to(roomName).emit('playerOut', aId );
          aPlayer.roomDetails[3] = true;
          rooms[roomName].aliveNum = rooms[roomName].aliveNum - 1;
          console.log(`서버가 받음: 플레이어 a: ${aId}와 b: ${bId}가 겹쳐서 ${aId}가 탈락됨`); 
        }
        // 탈락한 플레이어가 발생했으므로, 방에 있는 사람중 죽지 않은 사람은 모두 isFrozen을 해제하기
        for (const [id, p] of Object.entries(players)) {
          if (p.roomDetails[0] == roomName) {
            if (!p.roomDetails[3]) {
              io.to(roomName).emit('frozen', {id: id, isFrozen: false});
              p.roomDetails[2] = false;
            }
          }
        }
        if (rooms[roomName].aliveNum == 1) {
          setTimeout(() => {
            io.to(roomName).emit('gameover');
            console.log('생존자 1명 (술래)이므로 게임을 종료합니다.');
          }, 5000); // 5000ms = 5초
        } else if (rooms[roomName].aliveNum == 0) {
          console.log("왜 생존자가 0 명 ??");
        }
        console.log(`플레이어의 탈락으로 현재 생존자 수는 ${rooms[roomName].aliveNum}`);
      }
    }
    // 원하는 로직 수행
    //닿은 사람이 얼음이라면, 땡 상태로 바꿈.
    
  })

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
    players[socket.id].roomDetails = [roomName, 0, false, false];

    // 새로운 방 생성
    rooms[roomName] = {
      map: map,
      password: password || null,
      players: [socket.id],
      leader: socket.id, // 방장
      status: 'waiting', // 초기상태는 waiting
      aliveNum: 1
    };

    socket.join(roomName);
    console.log(`socket(${socket.id}) join the room(${roomName})`);
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

  // *** 'getrooms' 이벤트 처리 ***
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
    
    const playerIndex = room.players.length; // 0, 1, 2, 3
    room.aliveNum += 1; // 플레이어가 추가될 때 aliveNum 증가
    console.log("playerIndex: ",playerIndex);
    console.log("myId",socket.id);
    room.players.push(socket.id);
    players[socket.id].roomDetails = [roomName, playerIndex, false, false];
    
    socket.join(roomName);
    console.log(`socket(${socket.id}) join the room(${roomName})`)

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
      // players 객체에서 id를 사용해 해당 플레이어의 정보를 가져옵니다.
      const player = players[id];
      return {
        id: id,
        playerIndex: player.roomDetails[1],
        nickname: player.nickname // player 객체에서 nickname 속성을 추가합니다.
      };
    });

    // 이제 playersInRoom 배열의 각 요소에 nickname이 포함되어 있습니다.
    playersInRoom.forEach(player => {
      console.log(`${player.id}의 닉네임으로 ${player.nickname}이 전달됨`);
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
      delete players[socket.id];
      players[socket.id].roomDetails = null;

      // 1. 방이 비었으면 삭제 (타이머도 정리)
      if (room.players.length === 0) {
        if (roomTimers[roomName]?.intervalId) {
          clearInterval(roomTimers[roomName].intervalId);
          delete roomTimers[roomName];
        }
        delete rooms[roomName];
        console.log(`방 ${roomName}이(가) 비어서 삭제됨.`);
      } else { 
        // 2. 방장이 떠났다면 새로운 방장을 지정
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
    const roomName = players[socket.id]?.roomDetails?players[socket.id].roomDetails[0]: null;
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
      // Ensure the player object exists and also check for nickname property
      const player = players[id];
      if (!player) console.log("소켓이 갑작스럽게 삭제된 듯 함.");
      return {
        id: id,
        nickname: player ? (player.nickname || 'noname') : 'noname'
      };
    });

    socket.emit('playersinroom', playersInRoom);
  });

  socket.on('reportPosition', (data) => {
    // console.log("players[socket.id]가 존재?")
    if (!players[socket.id]) return;
    // console.log("존재")
    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
  });
    });

    server.listen(3000, '0.0.0.0', () => {
      console.log('🚀 서버 실행 중: http://0.0.0.0:3000');
    });

  } catch (err) {
    console.error(err.message);
    process.exit(1); // 치명적 실패 시 종료
  }
})();
