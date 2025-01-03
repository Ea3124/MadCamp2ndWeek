import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { client } from '../socket';  // 방금 만든 socket.ts에서 import

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;

    // (추가) 온라인으로 접속한 플레이어들의 스프라이트 목록
    playerMap: { [key: string]: Phaser.GameObjects.Sprite } = {};

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x00ff00);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.5);

        this.gameText = this.add.text(512, 384, 'Make something fun!\nand share it with us:\nsupport@phaser.io', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // **Socket.io: 1) 새 플레이어 접속 알림**
        client.emit('newplayer');

        // **Socket.io: 2) 서버에서 오는 이벤트 처리**
        this.handleSocketEvents();

        // 맵(백그라운드)을 클릭하면 좌표 전송
        this.background.setInteractive();
        this.background.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            client.emit('click', {
                x: pointer.worldX,
                y: pointer.worldY
            });
        });

        EventBus.emit('current-scene-ready', this);
    }

        /**
     * 소켓 이벤트들을 모아서 처리
     */
        handleSocketEvents()
        {
            // (a) 이미 접속 중인 플레이어 목록 받기
            client.on('allplayers', (players: { id: string, x: number, y: number }[]) => {
                players.forEach((p) => {
                    this.addNewPlayer(p.id, p.x, p.y);
                });
            });
    
            // (b) 새 플레이어가 들어왔을 때
            client.on('newplayer', (player: { id: string, x: number, y: number }) => {
                this.addNewPlayer(player.id, player.x, player.y);
            });
    
            // (c) 특정 플레이어가 이동했을 때
            client.on('move', (player: { id: string, x: number, y: number }) => {
                this.movePlayer(player.id, player.x, player.y);
            });
    
            // (d) 플레이어가 떠났을 때
            client.on('remove', (playerId: string) => {
                this.removePlayer(playerId);
            });
        }

        addNewPlayer(id: string, x: number, y: number)
    {
        // 이미 존재하면 무시
        if (this.playerMap[id]) return;

        const sprite = this.add.sprite(x, y, 'star'); // 예: star.png
        sprite.setTint(Math.random() * 0xffffff);     // 임의 색상(예시)

        this.playerMap[id] = sprite;
    }

    movePlayer(id: string, x: number, y: number)
    {
        const sprite = this.playerMap[id];
        if (!sprite) return;

        // 간단히 즉시 위치 이동 (혹은 트윈 이동)
        sprite.x = x;
        sprite.y = y;

        // 트윈 예시
        // const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, x, y);
        // const duration = dist * 4;
        // this.tweens.add({
        //   targets: sprite,
        //   x, y,
        //   duration,
        //   ease: 'Power2'
        // });
    }

    removePlayer(id: string)
    {
        const sprite = this.playerMap[id];
        if (!sprite) return;
        sprite.destroy();
        delete this.playerMap[id];
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
