import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { API } from '../../lib/api';

export class GameOver extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameOverText: Phaser.GameObjects.Text;
    
    constructor ()
    {
        super('GameOver');
    }

    preload(){
        this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
    }

    create ()
{
    const add = this.add;

    WebFont.load({
        google: {
            families: [ 'Rubik Pixels', 'Jua' ]
        },
        active: function ()
        {
            add.text(0, 0, '.', { fontFamily: 'Rubik Pixels', fontSize: 1, color: '#ffffff' });
            add.text(0, 0, '.', { fontFamily: 'Jua', fontSize: 1, color: '#5656ee' });
        }
    });

    // 1) 카메라 초기화
    this.camera = this.cameras.main;
    // this.camera.setBackgroundColor(0xff0000);

    // 2) 배경 이미지
    this.background = this.add.image(512, 384, 'background');
    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);
    this.background.setAlpha(0.5);

    // 3) "Game Over" 텍스트
    this.gameOverText = this.add.text(512, 200, 'Ranking Board', {
        fontFamily: 'Rubik Pixels',
        fontSize: 72,
        color: '#ffffff',
        stroke: '#bfefeb',
        strokeThickness: 3,
        align: 'center'
    })
    .setOrigin(0.5)
    .setDepth(100);

    // 5) 서버의 /api/users 엔드포인트로 GET 요청
    fetch(API.users)
    .then((res) => res.json())
    .then((data) => {
        console.log('서버로부터 받은 데이터:', data);

        // (a) 데이터 정렬 (score 내림차순)
        data.sort((a: any, b: any) => b.score - a.score);

        // (b) 각각의 플레이어를 순위대로 텍스트로 표시 (최대 10명)
        let startY = 320; // Ranking Board 제목 아래쪽부터 시작
        data.forEach((user: any, index: number) => {
            if (index < 10) { // 상위 10명만 표시
                const rank = index + 1;
                const { nickname, score } = user;

                this.add.text(512, startY, 
                    `${rank}위: ${nickname} - ${score}`, 
                {
                    fontFamily: 'Arial', 
                    fontSize: '24px',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 4,
                    align: 'center'
                })
                .setOrigin(0.5)
                .setDepth(100);

                startY += 40; // 한 줄에 40px 간격
            }
        });
    })
    .catch((error) => {
        console.error('데이터 가져오기 에러:', error);
    });

    // 6) 씬이 준비되었음을 EventBus에 알림
    EventBus.emit('current-scene-ready', this);
}


    changeScene ()
    {
        // 원하는 시점에 다시 Game 씬으로 전환
        this.scene.start('Game');
    }
}
