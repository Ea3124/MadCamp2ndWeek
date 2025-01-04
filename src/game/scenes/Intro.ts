import { type GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';
import { client } from '../socket';

export class Intro extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;
    joinButton: GameObjects.Image;
    createButton: GameObjects.Image;

    constructor ()
    {
        super('Intro');
    }

    create ()
    {
        this.background = this.add.image(512, 384, 'background');

        this.title = this.add.text(512, 250, '얼음 땡', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // this.logo = this.add.image(512, 300, 'logo').setDepth(100);

        // 시작 버튼 추가
        this.joinButton = this.add.image(400, 420, 'joinButton').setInteractive();
        this.joinButton.on('pointerdown', () => {
            this.joinGame();
        });

        this.title = this.add.text(450, 420, 'join game', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'left'
        }).setOrigin(0, 0.5).setDepth(100);

        // 옵션 버튼 추가
        this.createButton = this.add.image(400, 520, 'createButton').setInteractive();
        this.createButton.on('pointerdown', () => {
            this.createGame();
        });

        this.title = this.add.text(450, 520, 'create game', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'left'
        }).setOrigin(0, 0.5).setDepth(100);

        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {
        this.scene.start('Game');
    }

    joinGame() {
        this.scene.start('Join');
    }

    createGame() {
        // 옵션 씬을 여는 로직 구현
        this.scene.start('Create');
        console.log('옵션을 여는 로직을 여기에 구현');
    }
}
