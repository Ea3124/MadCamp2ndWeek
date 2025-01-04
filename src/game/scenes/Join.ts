// src/scenes/Join.ts

import { Scene, GameObjects, Input } from 'phaser';
import { client } from '../socket'; // socket.ts에서 import
import { EventBus } from '../EventBus';

export class Join extends Scene {
    background: GameObjects.Image;
    title: GameObjects.Text;
    roomListContainer: GameObjects.Container;
    selectedRoom: string | null;
    passwordInput: HTMLInputElement | null;
    joinButton: GameObjects.Image;

    constructor() {
        super('Join');
    }

    create() {
        // 배경
        this.background = this.add.image(512, 384, 'background');

        // 제목
        this.title = this.add.text(512, 100, '방 참가', {
            fontFamily: 'Arial Black', fontSize: 48, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // 방 목록 컨테이너
        this.roomListContainer = this.add.container(512, 200);

        // 서버에 방 목록 요청
        client.emit('getrooms');

        // 방 목록 수신
        client.on('roomlist', (rooms: { roomName: string, map: string, playerCount: number, passwordProtected: boolean }[]) => {
            this.displayRoomList(rooms);
        });

        // 방 목록 업데이트 수신
        client.on('roomlist_update', (rooms: { roomName: string, map: string, playerCount: number, passwordProtected: boolean }[]) => {
            this.displayRoomList(rooms);
        });

        // 방 참가 버튼
        this.joinButton = this.add.image(512, 600, 'joinButton').setInteractive();
        this.joinButton.on('pointerdown', () => {
            this.attemptJoin();
        });

        // 비밀번호 입력 (숨김)
        this.createPasswordInput();

        // 방 참가 응답 수신
        client.on('joinroom_response', (data: { success: boolean, message?: string, roomName?: string, map?: string }) => {
            if (data.success) {
                // 게임 씬으로 전환하면서 맵 정보 전달
                this.scene.start('Game', { map: data.map });
            } else {
                alert(`방 참가 실패: ${data.message}`);
            }
        });

        EventBus.emit('current-scene-ready', this);
    }

    displayRoomList(rooms: { roomName: string, map: string, playerCount: number, passwordProtected: boolean }[]) {
        // 기존 방 목록 삭제
        this.roomListContainer.removeAll(true);
        
        rooms.forEach((room, index) => {
            const yOffset = index * 60;

            // 방 버튼
            const roomButton = this.add.image(-200, yOffset, 'roomButton').setInteractive();
            roomButton.on('pointerdown', () => {
                this.selectRoom(room.roomName, room.passwordProtected);
            });

            // 방 정보 텍스트
            const roomText = this.add.text(-200, yOffset, `${room.roomName} (${room.playerCount}명)${room.passwordProtected ? ' [비밀번호]' : ''}`, {
                fontFamily: 'Arial', fontSize: 24, color: '#ffffff'
            }).setOrigin(0, 0.5);

            // 컨테이너에 추가
            this.roomListContainer.add([roomButton, roomText]);
        });
    }

    selectRoom(roomName: string, isProtected: boolean) {
        this.selectedRoom = roomName;
        console.log(`선택된 방: ${roomName}`);

        if (isProtected) {
            if (this.passwordInput) {
                this.passwordInput.style.display = 'block';
            }
        } else {
            this.attemptJoin();
        }
    }

    createPasswordInput() {
        // 비밀번호 입력 HTML 요소 생성
        this.passwordInput = document.createElement('input');
        this.passwordInput.type = 'password';
        this.passwordInput.placeholder = '방 비밀번호 입력';
        this.passwordInput.style.position = 'absolute';
        this.passwordInput.style.top = '580px';
        this.passwordInput.style.left = '312px';
        this.passwordInput.style.width = '400px';
        this.passwordInput.style.padding = '10px';
        this.passwordInput.style.fontSize = '16px';
        this.passwordInput.style.display = 'none'; // 기본적으로 숨김

        document.body.appendChild(this.passwordInput);
    }

    attemptJoin() {
        if (!this.selectedRoom) {
            alert('참가할 방을 선택해주세요.');
            return;
        }

        const password = this.passwordInput?.value || null;

        // 'joinroom' 이벤트 전송
        client.emit('joinroom', { roomName: this.selectedRoom, password: password });

        // 비밀번호 입력 숨김 및 초기화
        if (this.passwordInput) {
            this.passwordInput.style.display = 'none';
            this.passwordInput.value = '';
        }
    }

    shutdown() {
        // 씬 종료 시 이벤트 리스너 제거
        client.off('roomlist');
        client.off('roomlist_update');
        client.off('joinroom_response');
    }
}
