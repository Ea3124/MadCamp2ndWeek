// src/scenes/Intro.ts
import { GameObjects, Scene, Input } from 'phaser';
import { EventBus } from '../EventBus';
import { client } from '../socket';

export class Intro extends Scene {
    background: GameObjects.Image;
    title: GameObjects.Image;

    // 버튼
    joinButton: GameObjects.Image;
    createButton: GameObjects.Image;

    // 닉네임
    private nickname: string = '';

    // 닉네임 입력 필드
    nicknameText: GameObjects.Text;
    isNicknameActive: boolean = false;

    constructor() {
        super('Intro');
    }

    preload() {
        this.load.image('background', 'assets/images/background.png');
        this.load.image('joinButton', 'assets/images/joinButton.png');
        this.load.image('createButton', 'assets/images/createButton.png');
        this.load.image('logo3', 'assets/images/logo3.png');
    }

    create() {
        // 배경
        this.background = this.add.image(512, 384, 'background');

        // 타이틀
        this.title = this.add.image(512, 150, 'logo3').setOrigin(0.5).setDepth(100);

        // joinButton

        this.joinButton = this.add.image(400, 420, 'joinButton').setInteractive();
        
        let joinButtonText = this.add.text(450, 420, 'Join Game', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'left'
        }).setOrigin(0, 0.5).setDepth(100);

        this.joinButton.on('pointerdown', () => {
            this.handleJoinGame();
            this.joinButton.setTint(0xaaaaaa);  // 버튼에 음영 추가
        });
        this.joinButton.on('pointerover', () => {
            this.joinButton.setScale(1.1);
            joinButtonText.setScale(1.1);  // 텍스트 크기도 10% 증가
        });
        this.joinButton.on('pointerout', () => {
            this.joinButton.setScale(1.0);
            joinButtonText.setScale(1.0);
            this.joinButton.clearTint();  // 음영 제거
        });
        

        // createButton
        this.createButton = this.add.image(400, 520, 'createButton').setInteractive();
        let createButtonText = this.add.text(450, 520, 'Create Game', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'left'
        }).setOrigin(0, 0.5).setDepth(100);

        this.createButton.on('pointerdown', () => {
            this.handleCreateGame();
            this.createButton.setTint(0xaaaaaa);  // 버튼에 음영 추가
        });
        this.createButton.on('pointerover', () => {
            this.createButton.setScale(1.1);
            createButtonText.setScale(1.1);  // 텍스트 크기도 10% 증가
        });
        this.createButton.on('pointerout', () => {
            this.createButton.setScale(1.0);
            createButtonText.setScale(1.0);
            this.createButton.clearTint();  // 음영 제거
        });

        // 닉네임 입력 텍스트 생성
        this.nicknameText = this.add.text(512, 300, 'Write your Nickname', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffFFFF',
            backgroundColor: 'rgba(255, 255, 255, 0.1)', // 배경색 반투명 설정
            padding: { left: 20, right: 20, top: 15, bottom: 15 }
        }).setOrigin(0.5,0.5).setInteractive();

        this.nicknameText.on('pointerdown', () => {
            this.setNicknameActive(true);
        });

        // 키보드 입력 처리
        this.input?.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if (this.isNicknameActive) {
                this.handleNicknameInput(event);
            }
        });

        // ESC 키로 입력 비활성화
        this.input?.keyboard?.on('keydown-ESC', () => {
            this.setNicknameActive(false);
        });

        // 방 생성 응답 처리
        client.on('createroom_response', (data: { success: boolean; message?: string; roomName?: string; leader?: string }) => {
            if (data.success) {
                const roomName = data.roomName!;
                const leader = data.leader!;  // 방장 socket.id
                // WaitingRoom 씬으로 이동
                this.scene.start('WaitingRoom', { 
                    roomName, 
                    nickname: this.nickname, 
                    leader  // 추가!
                });
            } else {
                alert(`방 생성 실패: ${data.message}`);
            }
        });

        EventBus.emit('current-scene-ready', this);
    }

    // 닉네임 입력 활성화/비활성화
    setNicknameActive(active: boolean) {
        this.isNicknameActive = active;
        if (active) {
            this.nicknameText.setStyle({ backgroundColor: 'rgba(0, 0, 0, 0.1)' });
        } else {
            this.nicknameText.setStyle({ backgroundColor: 'rgba(255, 255, 255, 0.1)' });
        }
    }

    // 닉네임 입력 처리
    handleNicknameInput(event: KeyboardEvent) {
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
            // 문자 입력
            this.nickname += event.key;
            this.updateNicknameText();
        } else if (event.key === 'Backspace') {
            // 백스페이스
            this.nickname = this.nickname.slice(0, -1);
            this.updateNicknameText();
        } else if (event.key === 'Enter') {
            // 엔터 키: 입력 비활성화 및 액션 수행
            this.setNicknameActive(false);
            // 현재 활성화된 버튼에 따라 액션 수행
            if (this.currentAction === 'join') {
                this.handleJoinGame();
            } else if (this.currentAction === 'create') {
                this.handleCreateGame();
            }
        }
    }

    // 닉네임 텍스트 업데이트
    updateNicknameText() {
        this.nicknameText.setText(this.nickname || 'Enter your nickname');
    }

    // 현재 액션 (join 또는 create)
    currentAction: 'join' | 'create' | null = null;

    // joinButton 클릭 핸들러
    handleJoinButtonClick() {
        this.currentAction = 'join';
        this.setNicknameActive(true);
    }

    // createButton 클릭 핸들러
    handleCreateButtonClick() {
        this.currentAction = 'create';
        this.setNicknameActive(true);
    }

    // 닉네임을 사용하여 게임 참여
    handleJoinGame() {
        if (!this.nickname) {
            alert('닉네임을 입력하세요!');
            return;
        }

        // 서버로 닉네임 전송 (예시)
        client.emit('joinGame', { nickname: this.nickname });

        // Join 씬으로 닉네임을 전달
        this.scene.start('Join', { nickname: this.nickname });
    }

    // 닉네임을 사용하여 게임 생성
    handleCreateGame() {
        if (!this.nickname) {
            alert('닉네임을 입력하세요!');
            return;
        }

        // 서버로 닉네임 전송 (예시)
        client.emit('createGame', { nickname: this.nickname });

        // Create 씬으로 닉네임 전달
        this.scene.start('Create', { nickname: this.nickname });
    }

    shutdown() {
        client.off('createroom_response');
    }
}
