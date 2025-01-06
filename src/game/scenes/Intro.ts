// src/scenes/Intro.ts
import { type GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { client } from '../socket';

export class Intro extends Scene {
    background: GameObjects.Image;
    title: GameObjects.Text;

    
    // 버튼
    joinButton: GameObjects.Image;
    createButton: GameObjects.Image;
    
    // 닉네임
    private nickname: string = '';

    constructor() {
        super('Intro');
    }

    payload(){
    }

    create() {
        // 배경
        this.background = this.add.image(512, 384, 'background');

        // 타이틀
        this.title = this.add.text(512, 250, '얼음 땡', {
            fontFamily: 'Arial Black', fontSize: 58, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // joinButton
        this.joinButton = this.add.image(400, 420, 'joinButton').setInteractive();
        this.joinButton.on('pointerdown', () => {
            // this.handleJoinGame();
            this.handleJoinButtonClick();
        });
        this.add.text(450, 420, 'join game', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'left'
        }).setOrigin(0, 0.5).setDepth(100);

        // createButton
        this.createButton = this.add.image(400, 520, 'createButton').setInteractive();
        this.createButton.on('pointerdown', () => {
            // this.handleCreateGame();
            this.handleCreateButtonClick();
        });
        this.add.text(450, 520, 'create game', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'left'
        }).setOrigin(0, 0.5).setDepth(100);

        EventBus.emit('current-scene-ready', this);
    }

    // joinButton 클릭 핸들러
    handleJoinButtonClick() {
        EventBus.emit('action-button-clicked', 'join');
    }

    // createButton 클릭 핸들러
    handleCreateButtonClick() {
        EventBus.emit('action-button-clicked', 'create');
    }

    // Svelte에서 전달된 닉네임 및 액션 설정 메서드
    setNickname(nickname: string, action: string) {
        this.nickname = nickname;
        console.log(`Nickname set to: ${this.nickname}, Action: ${action}`);

        if (action === 'join') {
            this.handleJoinGame();
        } else if (action === 'create') {
            this.handleCreateGame();
        }
    }

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
    }
}
