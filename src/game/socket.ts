// src/game/socket.ts
import { io, Socket } from 'socket.io-client';

// 모듈 확장 선언
declare module 'socket.io-client' {
    interface Socket {
        askNewPlayer: () => void;
    }
}

// 클라이언트 생성
export const client: Socket = io('http://172.10.7.17:3000/');

// 커스텀 메서드 구현
client.askNewPlayer = () => {
    client.emit('newplayer');
};

// 백엔드 서버 주소/포트를 맞춰서 기입
// 배포 시에는 도메인이나 프록시 설정에 맞추어 변경
