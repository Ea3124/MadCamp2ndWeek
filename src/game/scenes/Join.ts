// src/scenes/Join.ts
import { Scene, GameObjects } from 'phaser';
import { client } from '../socket';
import { EventBus } from '../EventBus';

interface JoinData {
    nickname: string;
}

interface SelectedRoom {
    roomName: string;
    passwordProtected: boolean;
}

export class Join extends Scene {
    background: GameObjects.Image;
    title: GameObjects.Text;
    nickname: string;  // Intro 씬에서 전달받은 닉네임

    roomListContainer: GameObjects.Container;
    selectedRoom: SelectedRoom | null = null;
    
    // 이 프로퍼티로 선택된 방의 버튼을 저장해둠
    selectedRoomButton: GameObjects.Image | null = null;

    joinButton: GameObjects.Image;

    constructor() {
        super('Join');
    }

    init(data: JoinData) {
        this.nickname = data.nickname || 'noname';
    }
    
    preload() {
        // 기존 이미지
        this.load.image('background', 'assets/images/background.png');
        this.load.image('joinButton', 'assets/images/joinButton.png');
        
        // 새로 추가된 버튼 상태 이미지들
        this.load.image('joinButtonHover', 'assets/images/check_btn.png');
        this.load.image('joinButtonSelected', 'assets/images/check_btn.png');
        
        // key 아이콘
        this.load.image('key', 'assets/images/key.png');
    }

    create() {
        // 배경
        this.background = this.add.image(512, 384, 'background');

        // 제목
        this.title = this.add.text(512, 100, 'Join a Room !', {
            fontFamily: 'Rubik Pixels',
            fontSize: '72px',
            color: '#ffffff',
            stroke: '#bfefeb',
            strokeThickness: 3,
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
        this.joinButton = this.add.image(400, 600, 'joinButton').setInteractive();

        let joinButtonText = this.add.text(450, 600, 'Join Room!', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'left'
        }).setOrigin(0, 0.5).setDepth(100);

        // joinButton hover/scale 이벤트
        this.joinButton.on('pointerover', () => {
            this.joinButton.setScale(1.1);
            joinButtonText.setScale(1.1);
        });
        this.joinButton.on('pointerout', () => {
            joinButtonText.setScale(1.0);
            this.joinButton.setScale(1.0);
        });

        // 방 참가 버튼 클릭
        this.joinButton.on('pointerdown', () => {
            this.joinButton.setTint(0xaaaaaa);  // 버튼에 음영 추가
            this.attemptJoin();
        });

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

        // Listen for password submission from Svelte
        EventBus.on('password-submitted', this.handlePasswordSubmitted.bind(this));

        EventBus.emit('current-scene-ready', this);
    }

    displayRoomList(rooms: { roomName: string; map: string; playerCount: number; passwordProtected: boolean; status: string }[]) {
        this.roomListContainer.removeAll(true);

        rooms.forEach((room, index) => {
            const yOffset = index * 60;

            // 방이 이미 시작된 경우 표시하지 않음
            if (room.status === 'started') return;

            // 각 방 버튼 생성
            const roomButton = this.add.image(-200, yOffset, 'joinButton').setInteractive();

            // Hover 시 1.1배, 이미지 변경
            roomButton.on('pointerover', () => {
                // 아직 클릭으로 선택되지 않았다면 hover 이미지를 사용
                if (this.selectedRoomButton !== roomButton) {
                    roomButton.setTexture('joinButtonHover');
                }
                roomButton.setScale(1.1);
            });

            // Hover 빠져나갈 때
            roomButton.on('pointerout', () => {
                // 클릭으로 선택된 버튼이 아니면 원래 이미지로 복귀
                if (this.selectedRoomButton !== roomButton) {
                    roomButton.setTexture('joinButton');
                }
                roomButton.setScale(1.0);
            });

            // 클릭 시 (방 선택)
            roomButton.on('pointerdown', () => {
                this.selectRoom(room.roomName, room.passwordProtected, roomButton);
            });

            const roomText = this.add.text(-150, yOffset, `Room: ${room.roomName}`, {
                fontFamily: 'Jua',
                fontSize: '24px',
                color: '#ffffff'
            }).setOrigin(0, 0.5);

            const roomInfo = this.add.text(100, yOffset, `(${room.playerCount}/4명)`, {
                fontFamily: 'Jua',
                fontSize: '24px',
                color: '#ffffff'
            }).setOrigin(0, 0.5);
    
            this.roomListContainer.add([roomButton, roomText, roomInfo]);
    
            if (room.passwordProtected) {
                const icon = this.add.image(200, yOffset, 'key').setScale(0.5);
                this.roomListContainer.add(icon);
            }
        });
    }

    /**
     * 방을 선택했을 때 호출
     */
    selectRoom(roomName: string, isProtected: boolean, roomButton: GameObjects.Image) {
        // 기존에 선택된 버튼이 있으면 원래 이미지로 되돌림
        if (this.selectedRoomButton && this.selectedRoomButton !== roomButton) {
            this.selectedRoomButton.setTexture('joinButton');
            this.selectedRoomButton.setScale(1.0);
        }

        this.selectedRoom = { roomName, passwordProtected: isProtected };

        // 현재 클릭한 버튼을 "선택 상태" 이미지로 변경
        roomButton.setTexture('joinButtonSelected');
        roomButton.setScale(1.0);

        // 새로 선택된 버튼을 저장
        this.selectedRoomButton = roomButton;

        console.log(`선택된 방: ${roomName}`);
    }

    attemptJoin() {
        if (!this.selectedRoom) {
            alert('참가할 방을 선택해주세요.');
            return;
        }

        const { roomName, passwordProtected } = this.selectedRoom;

        if (passwordProtected) {
            // 비밀번호가 필요한 경우 팝업 표시 요청
            EventBus.emit('show-password-popup', { roomName });
        } else {
            // 비밀번호가 필요 없는 경우 바로 참가 시도
            client.emit('joinroom', { roomName, password: null });
        }
    }

    // 비밀번호 제출 이벤트 처리
    handlePasswordSubmitted(data: { roomName: string; password: string }) {
        if (this.selectedRoom && data.roomName === this.selectedRoom.roomName) {
            this.attemptJoinWithPassword(data.password);
        }
    }

    // 비밀번호와 함께 참가 시도
    attemptJoinWithPassword(password: string) {
        if (!this.selectedRoom) {
            alert('참가할 방을 선택해주세요.');
            return;
        }
        client.emit('joinroom', { roomName: this.selectedRoom.roomName, password });

        // 비밀번호 창 닫기 후 초기화
        EventBus.emit('hide-password-popup');
    }

    shutdown() {
        client.off('roomlist');
        client.off('roomlist_update');
        client.off('joinroom_response');
        EventBus.off('password-submitted', this.handlePasswordSubmitted.bind(this));
    }
}
