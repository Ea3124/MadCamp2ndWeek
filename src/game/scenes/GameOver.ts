import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

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
        
    }

    create ()
    {
        // 1) 카메라 초기화
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0xff0000);

        // 2) 배경 이미지
        this.background = this.add.image(512, 384, 'background');
        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);
        this.background.setAlpha(0.5);

        // 3) "Game Over" 텍스트
        this.gameOverText = this.add.text(512, 200, 'Ranking Board', {
            fontFamily: 'Arial Black', 
            fontSize: '64px', 
            color: '#ffffff',
            stroke: '#000000', 
            strokeThickness: 8,
            align: 'center'
        })
        .setOrigin(0.5)
        .setDepth(100);

        // 5) 서버의 /api/users 엔드포인트로 GET 요청
        fetch('http://172.10.7.17:3000/api/users')
        .then((res) => res.json())
        .then((data) => {
            console.log('서버로부터 받은 데이터:', data);

            // (a) 데이터 정렬 (score 내림차순)
            data.sort((a: any, b: any) => b.score - a.score);

            // (b) 각각의 플레이어를 순위대로 텍스트로 표시
            let startY = 320; // Ranking Board 제목 아래쪽부터 시작
            data.forEach((user: any, index: number) => {
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
            });
        })
        .catch((error) => {
            console.error('데이터 가져오기 에러:', error);
            // 에러 상황에서도 화면이 깨지지 않도록 대비할 수 있음
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
