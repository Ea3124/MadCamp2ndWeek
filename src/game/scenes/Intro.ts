// src/scenes/Intro.ts
import { type GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { client } from '../socket';

export class Intro extends Scene {
    background: GameObjects.Image;
    title: GameObjects.Text;

    // 닉네임 입력 필드
    nicknameInput: HTMLInputElement;

    // 버튼
    joinButton: GameObjects.Image;
    createButton: GameObjects.Image;

    constructor() {
        super('Intro');
    }

    create() {
        // 배경
        this.background = this.add.image(512, 384, 'background');

        // 타이틀
        this.title = this.add.text(512, 250, '얼음 땡', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // 닉네임 입력 필드 생성
        this.createNicknameInput();

        // joinButton
        this.joinButton = this.add.image(400, 420, 'joinButton').setInteractive();
        this.joinButton.on('pointerdown', () => {
            this.handleJoinGame();
        });
        this.add.text(450, 420, 'join game', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'left'
        }).setOrigin(0, 0.5).setDepth(100);

        // createButton
        this.createButton = this.add.image(400, 520, 'createButton').setInteractive();
        this.createButton.on('pointerdown', () => {
            this.handleCreateGame();
        });
        this.add.text(450, 520, 'create game', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'left'
        }).setOrigin(0, 0.5).setDepth(100);

        EventBus.emit('current-scene-ready', this);
    }

    createNicknameInput() {
        // HTML input
        this.nicknameInput = document.createElement('input');
        this.nicknameInput.type = 'text';
        this.nicknameInput.placeholder = 'Enter your nickname';
        this.nicknameInput.style.position = 'absolute';
        this.nicknameInput.style.top = '340px';
        this.nicknameInput.style.left = '312px';
        this.nicknameInput.style.width = '400px';
        this.nicknameInput.style.padding = '10px';
        this.nicknameInput.style.fontSize = '16px';

        document.body.appendChild(this.nicknameInput);
    }

    handleJoinGame() {
        const nickname = this.nicknameInput.value.trim();
        if (!nickname) {
            alert('닉네임을 입력하세요!');
            return;
        }

        // Join 씬으로 닉네임을 전달
        this.scene.start('Join', { nickname });
    }

    handleCreateGame() {
        const nickname = this.nicknameInput.value.trim();
        if (!nickname) {
            alert('닉네임을 입력하세요!');
            return;
        }

        // Create 씬으로 닉네임 전달
        this.scene.start('Create', { nickname });
    }

    shutdown() {
        // 씬이 종료되거나 전환될 때, HTML input 제거
        if (this.nicknameInput) {
            document.body.removeChild(this.nicknameInput);
        }
    }
}
