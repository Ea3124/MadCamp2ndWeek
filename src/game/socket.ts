// src/game/socket.ts
import { io } from 'socket.io-client';

export const client = io('http://172.10.7.17:3000/');

// 백엔드 서버 주소/포트를 맞춰서 기입
// 배포 시에는 도메인이나 프록시 설정에 맞추어 변경
