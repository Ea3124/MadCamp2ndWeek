// src/scenes/Join.ts
import { Scene, GameObjects } from 'phaser';
import { client } from '../socket';
import { EventBus } from '../EventBus';

interface JoinData {
    nickname: string;
}

export class Join extends Scene {
    background: GameObjects.Image;
    title: GameObjects.Text;
    nickname: string;  // Intro 씬에서 전달받은 닉네임

    roomListContainer: GameObjects.Container;
    selectedRoom: string | null;
    passwordInput: HTMLInputElement | null;
    joinButton: GameObjects.Image;

    constructor() {
        super('Join');
    }

    init(data: JoinData) {
        this.nickname = data.nickname || 'noname';
    }

    create() {
        // 배경
        this.background = this.add.image(512, 384, 'background');

        // 제목
        this.title = this.add.text(512, 100, '방 참가', {
            fontFamily: 'Arial Black',
            fontSize: 48,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // 방 목록 컨테이너
        this.roomListContainer = this.add.container(512, 200);

        // 서버에 방 목록 요청
        client.emit('getrooms');

        // nickname을 포함하여 newplayer 이벤트 전송
        client.emit('newplayer', { nickname: this.nickname });

        // 방 목록 수신
        client.on('roomlist', (rooms: { roomName: string; map: string; playerCount: number; passwordProtected: boolean; status: string }[]) => {
            this.displayRoomList(rooms);
        });

        // 방 목록 업데이트 수신
        client.on('roomlist_update', (rooms: { roomName: string; map: string; playerCount: number; passwordProtected: boolean; status: string }[]) => {
            this.displayRoomList(rooms);
        });

        // 방 참가 버튼
        this.joinButton = this.add.image(512, 600, 'joinButton').setInteractive();
        this.joinButton.on('pointerdown', () => {
            this.attemptJoin();
        });

        // 비밀번호 입력
        this.createPasswordInput();

        // 방 참가 응답 처리
        client.on('joinroom_response', (data: { success: boolean; message?: string; roomName?: string; map?: string; leader?: string }) => {
            if (data.success) {
                const roomName = data.roomName!;
                const selectedMap = data.map!;
                const leader = data.leader!; // 현재 방장 socket.id
                // WaitingRoom 씬으로 이동
                this.scene.start('WaitingRoom', { 
                roomName, 
                nickname: this.nickname, 
                map: selectedMap,
                leader
                });
            } else {
                alert(`방 참가 실패: ${data.message}`);
            }
        });


        EventBus.emit('current-scene-ready', this);
    }

    displayRoomList(rooms: { roomName: string; map: string; playerCount: number; passwordProtected: boolean; status: string }[]) {
        this.roomListContainer.removeAll(true);

        rooms.forEach((room, index) => {
            const yOffset = index * 60;

            // 방이 이미 시작된 경우 표시하지 않음
            if (room.status === 'started') return;

            const roomButton = this.add.image(-200, yOffset, 'roomButton').setInteractive();
            roomButton.on('pointerdown', () => {
                this.selectRoom(room.roomName, room.passwordProtected);
            });

            const roomText = this.add.text(-200, yOffset, `${room.roomName} (${room.playerCount}/4명)${room.passwordProtected ? ' [비밀번호]' : ''}`, {
                fontFamily: 'Arial',
                fontSize: 24,
                color: '#ffffff'
            }).setOrigin(0, 0.5);

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
        this.passwordInput = document.createElement('input');
        this.passwordInput.type = 'password';
        this.passwordInput.placeholder = '방 비밀번호 입력';
        this.passwordInput.style.position = 'absolute';
        this.passwordInput.style.top = '580px';
        this.passwordInput.style.left = '312px';
        this.passwordInput.style.width = '400px';
        this.passwordInput.style.padding = '10px';
        this.passwordInput.style.fontSize = '16px';
        this.passwordInput.style.display = 'none'; 
        document.body.appendChild(this.passwordInput);
    }

    attemptJoin() {
        if (!this.selectedRoom) {
            alert('참가할 방을 선택해주세요.');
            return;
        }
        const password = this.passwordInput?.value || null;

        client.emit('joinroom', { roomName: this.selectedRoom, password });
        if (this.passwordInput) {
            this.passwordInput.style.display = 'none';
            this.passwordInput.value = '';
        }
    }

    shutdown() {
        client.off('roomlist');
        client.off('roomlist_update');
        client.off('joinroom_response');

        // 비밀번호 Input 제거
        if (this.passwordInput) {
            document.body.removeChild(this.passwordInput);
        }
    }
}
