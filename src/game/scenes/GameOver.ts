import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class GameOver extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameOverText : Phaser.GameObjects.Text;

    constructor ()
    {
        super('GameOver');
    }

    create ()
    {
        this.camera = this.cameras.main
        this.camera.setBackgroundColor(0xff0000);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.5);

        this.gameOverText = this.add.text(512, 384, 'Game Over', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);


        // (예시) 게임 씬이 실행될 때, 서버의 /api/users 엔드포인트로 GET 요청을 보내고 싶다면:
        fetch('http://172.10.7.17:3000/api/users')
        .then((res) => res.json())
        .then((data) => {
            console.log('서버로부터 받은 데이터:', data);
        })
        .catch((error) => {
            console.error('데이터 가져오기 에러:', error);
        });
    
        
        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        this.scene.start('Game');
    }
}
