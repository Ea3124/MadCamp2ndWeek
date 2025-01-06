// src/scenes/Create.ts
import { Scene, GameObjects, Input } from 'phaser';
import { client } from '../socket';
import { EventBus } from '../EventBus';

interface CreateData {
    nickname: string;
}

export class Create extends Scene {
    background: GameObjects.Image;
    title: GameObjects.Text;
    nickname: string;  // Intro에서 전달받은 닉네임

    roomNameText: GameObjects.Text;
    roomNameInput: GameObjects.Text;
    mapText: GameObjects.Text;
    mapOptions: GameObjects.Text[];
    selectedMapIndex: number = 0;
    passwordText: GameObjects.Text;
    passwordInput: GameObjects.Text;
    createButton: GameObjects.Image;

    // 입력 상태
    activeInput: 'roomName' | 'password' | null = null;

    // 입력 내용
    roomName: string = '';
    password: string = '';
    maps: string[] = ['Map1', 'Map2', 'Map3']; // 실제 맵 이름으로 변경 필요

    constructor() {
        super('Create');
    }

    init(data: CreateData) {
        this.nickname = data.nickname || 'noname';
    }

    private handleCreateRoomResponse = (data: { success: boolean; message?: string; roomName?: string; leader?: string }) => {
        console.log('createroom_response received:', data);
        if (data.success) {
            const roomName = data.roomName!;
            const selectedMap = this.maps[this.selectedMapIndex];
            const leader = data.leader!;  // 방장 socket.id
            // WaitingRoom 씬으로 이동
            this.scene.start('WaitingRoom', { 
                roomName, 
                nickname: this.nickname, 
                map: selectedMap,
                leader  // 추가!
            });
        } else {
            alert(`방 생성 실패: ${data.message}`);
        }
    };

    create() {
        // 배경
        this.background = this.add.image(512, 384, 'background');

        // 제목
        this.title = this.add.text(512, 100, '방 생성', {
            fontFamily: 'Arial Black',
            fontSize: 48,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // nickname을 포함하여 newplayer 이벤트 전송
        client.emit('newplayer', { nickname: this.nickname });

        // 방 이름
        this.roomNameText = this.add.text(200, 200, '방 이름:', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.roomNameInput = this.add.text(300, 200, '방 이름 입력', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffFFFF',
            backgroundColor: 'rgba(255, 255, 255, 0.1)', // 배경색 반투명 설정
            padding: { left: 10, right: 10, top: 8, bottom: 8 }
        }).setOrigin(0, 0.5).setInteractive();

        this.roomNameInput.on('pointerdown', () => {
            this.setActiveInput('roomName');
        });

        // 맵 선택
        this.mapText = this.add.text(200, 300, '맵 선택:', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        // 맵 옵션 텍스트 생성
        this.mapOptions = this.maps.map((map, index) => {
            const mapText = this.add.text(300, 300 + index * 40, map, {
                fontFamily: 'Arial',
                fontSize: 24,
                color: index === this.selectedMapIndex ? '#ffcc00' : '#ffffff'
            }).setOrigin(0, 0.5).setInteractive();

            mapText.on('pointerdown', () => {
                this.selectedMapIndex = index;
                this.updateMapOptions();
            });

            return mapText;
        });

        this.updateMapOptions();

        // 비밀번호 (선택)
        this.passwordText = this.add.text(200, 400, '비밀번호:', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.passwordInput = this.add.text(300, 400, '비밀번호 입력 (선택)', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffFFFF',
            backgroundColor: 'rgba(255, 255, 255, 0.1)', // 배경색 반투명 설정
            padding: { left: 10, right: 10, top: 5, bottom: 5 }
        }).setOrigin(0, 0.5).setInteractive();

        this.passwordInput.on('pointerdown', () => {
            this.setActiveInput('password');
        });

        // createButton
        this.createButton = this.add.image(512, 500, 'createButton').setInteractive();
        this.createButton.on('pointerdown', () => {
            this.createRoom();
        });

        // 방 생성 응답
        client.on('createroom_response', this.handleCreateRoomResponse);

        // 키보드 입력 처리
        this.input?.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if (this.activeInput === 'roomName') {
                this.handleTextInput(event, 'roomName');
            } else if (this.activeInput === 'password') {
                this.handleTextInput(event, 'password');
            }
        });

        // ESC 키로 입력 필드 비활성화
        this.input?.keyboard?.on('keydown-ESC', () => {
            this.setActiveInput(null);
        });

        EventBus.emit('current-scene-ready', this);
    }

    // 활성 입력 필드 설정
    setActiveInput(field: 'roomName' | 'password' | null) {
        this.activeInput = field;
        this.updateInputStyles();
    }

    // 입력 필드 스타일 업데이트
    updateInputStyles() {
        if (this.activeInput === 'roomName') {
            this.roomNameInput.setStyle({ color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.1)', // 배경색 반투명 설정
             });
            this.passwordInput.setStyle({ color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.1)', // 배경색 반투명 설정
             });
        } else if (this.activeInput === 'password') {
            this.roomNameInput.setStyle({ color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.1)', // 배경색 반투명 설정
             });
            this.passwordInput.setStyle({ color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.1)', // 배경색 반투명 설정
             });
        } else {
            this.roomNameInput.setStyle({ color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.1)', // 배경색 반투명 설정
             });
            this.passwordInput.setStyle({ color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.1)', // 배경색 반투명 설정
             });
        }
    }

    // 맵 옵션 업데이트
    updateMapOptions() {
        this.mapOptions.forEach((mapText, index) => {
            if (index === this.selectedMapIndex) {
                mapText.setStyle({ color: '#ffcc00' });
            } else {
                mapText.setStyle({ color: '#ffffff' });
            }
        });
    }

    // 텍스트 입력 처리
    handleTextInput(event: KeyboardEvent, field: 'roomName' | 'password') {
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
            // 문자 입력
            if (field === 'roomName') {
                this.roomName += event.key;
                this.roomNameInput.setText(this.roomName || '방 이름 입력');
            } else if (field === 'password') {
                this.password += event.key;
                this.passwordInput.setText(this.password || '비밀번호 입력 (선택)');
            }
        } else if (event.key === 'Backspace') {
            // 백스페이스
            if (field === 'roomName') {
                this.roomName = this.roomName.slice(0, -1);
                this.roomNameInput.setText(this.roomName || '방 이름 입력');
            } else if (field === 'password') {
                this.password = this.password.slice(0, -1);
                this.passwordInput.setText(this.password || '비밀번호 입력 (선택)');
            }
        } else if (event.key === 'Enter') {
            // 엔터 키: 입력 필드 비활성화
            this.setActiveInput(null);
        }
    }

    createRoom() {
        const roomName = this.roomName.trim();
        const map = this.maps[this.selectedMapIndex];
        const password = this.password.trim();

        if (!roomName) {
            alert('방 이름을 입력해주세요.');
            return;
        }

        client.emit('createroom', { roomName, map, password: password || null });
    }

    shutdown() {
        client.off('createroom_response', this.handleCreateRoomResponse);

        // Phaser GameObjects는 DOM 요소가 아니므로 별도로 정리할 필요가 없습니다.
    }
}
