// src/scenes/Game.ts

import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import Phaser from 'phaser';
import { client } from '../socket';  // socket.ts에서 import

export class Game extends Scene {
    currentPlayerId: string;

    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;
    player: Phaser.Physics.Arcade.Sprite;        
    private layer1!: Phaser.Tilemaps.TilemapLayer;
    private layer2!: Phaser.Tilemaps.TilemapLayer;

    // 온라인으로 접속한 플레이어들의 스프라이트 목록
    playerMap: { [key: string]: Phaser.Physics.Arcade.Sprite } = {};

    // 방향키
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    map: string;

    constructor() {
        super('Game');
    }

    init(data: any) {
        this.map = data.map || 'defaultMap'; // 기본 맵 설정
    }

    preload() {
        // 선택된 맵 로드
        this.load.image(this.map, `assets/maps/${this.map}.png`);
        this.load.image('human', 'assets/human.png');
        this.load.spritesheet('princess', 'assets/princess.png', { frameWidth: 32, frameHeight: 32 });

        // 기타 필요한 자산 로드
    }

    create() {
        this.cursors = this.input?.keyboard?.createCursorKeys()!;

        console.log('Game scene is creating...');

        const map = this.make.tilemap({ key: 'map' });
        console.log('map is created')

        const tileset1 = map.addTilesetImage('IceTileset', 'tile1', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset2 = map.addTilesetImage('tf_winter_tileA2', 'tile2', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset3 = map.addTilesetImage('tf_winter_tileA5_cave', 'tile3', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset4 = map.addTilesetImage('tf_winter_tileB', 'tile4', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset5 = map.addTilesetImage('tf_winter_tileD', 'tile5', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        console.log('addTilesetImage success');

        this.layer1 = map.createLayer('Tile Layer 1', [tileset1, tileset2, tileset3, tileset4, tileset5], 0, 0) as Phaser.Tilemaps.TilemapLayer;
        this.layer2 = map.createLayer('Tile Layer 2', [tileset1, tileset2, tileset3, tileset4, tileset5], 0, 0) as Phaser.Tilemaps.TilemapLayer;
        console.log('createLayer success');

        this.player = this.physics.add.sprite(500, 500, 'executioner'); 
        console.log('Player body:', this.player.body);
    
        this.layer1.setCollisionByProperty({ collides: true });
        this.layer2.setCollisionByProperty({ collides: true });
        this.layer2.setDepth(2);

        // Arcade Physics로 충돌 처리
        this.physics.add.collider(this.player, this.layer1);
        this.physics.add.collider(this.player, this.layer2);
        
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);


        // 선택된 맵을 배경으로 설정
        this.background = this.add.image(512, 384, this.map).setAlpha(0.5);

        // **Socket.io: 1) 새 플레이어 접속 알림**
        client.askNewPlayer();

        client.on('yourId', (id: string) => {
            this.currentPlayerId = id;
            console.log(`Your player ID: ${id}`);

            // 이미 추가된 플레이어 중 현재 플레이어 ID와 일치하는 것이 있으면 숨김
            if (this.playerMap[id]) {
                this.playerMap[id].setVisible(false);
                console.log(`서버에서 로컬 플레이어 (${id})를 숨겼습니다.`);
            }
        });

        // **Socket.io: 2) 서버에서 오는 이벤트 처리**
        this.handleSocketEvents();

        // 맵을 클릭하면 좌표 전송
        this.background.setInteractive();
        this.background.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            client.emit('click', {
                x: pointer.worldX,
                y: pointer.worldY
            });
        });

        this.player.setCollideWorldBounds(true);
        this.player.setDepth(1);
        console.log('Player visibility:', this.player.visible, 'Alpha:', this.player.alpha);
        
        this.cursors = this.input?.keyboard?.createCursorKeys()!;

        console.log('Game scene created successfully.');

        // 스프라이트가 화면 범위 내에 있는지 확인
        if (this.player.x > this.cameras.main.width || this.player.y > this.cameras.main.height) {
            console.warn('Player is out of camera bounds.');
        }

        EventBus.emit('current-scene-ready', this);
    }

    update(time: number, delta: number) {
        if (!this.player || !this.cursors) return;

        let moving = false;
      
        // 기존 이동 로직
        this.player.setVelocity(0);
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-200);
            moving = true;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(200);
            moving = true;
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-200);
            moving = true;
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(200);
            moving = true;
            client.emit('move', { dir: 'down' });
        } else {
            client.emit('move', { dir: 'stop' });
        }

        if (moving) {
            this.player.anims.play('executioner_walk', true);
        } else {
            // Stop the animation if no movement keys are pressed
            this.player.anims.stop();
        }
      
        // 예: 500ms마다 서버에 내 위치 보고
        if (time % 10 < delta) {  // 500ms로 변경
            client.emit('reportPosition', { x: this.player.x, y: this.player.y });
        }
    }
    

    /**
     * 소켓 이벤트들을 모아서 처리
     */
    handleSocketEvents() {
        // (a) 이미 접속 중인 플레이어 목록 받기
        client.on('allplayers', (players: { id: string, x: number, y: number }[]) => {
            players.forEach((p) => {
                this.addNewPlayer(p.id, p.x, p.y);
                console.log("Existing player added:", p.id);
            });
        });

        // (b) 새 플레이어가 들어왔을 때
        client.on('newplayer', (player: { id: string, x: number, y: number }) => {
            this.addNewPlayer(player.id, player.x, player.y);
        });

        // 소켓 이벤트 처리
        client.on('move', (data: { id: string; dir: string }) => {
            const sprite = this.playerMap[data.id];
            if (!sprite) return;  // 혹은 아직 안 만들어진 경우 무시
        
            // 1) 우선 이전 속도 리셋
            sprite.setVelocity(0);
        
            // 2) 받은 방향에 따라 속도 설정
            switch (data.dir) {
              case 'left':
                sprite.setVelocityX(-200);
                break;
              case 'right':
                sprite.setVelocityX(200);
                break;
              case 'up':
                sprite.setVelocityY(-200);
                break;
              case 'down':
                sprite.setVelocityY(200);
                break;
              case 'stop':
                // 아무것도 안 함 (이미 0이므로)
                break;
            }
          });
  
        // (d) 플레이어가 떠났을 때
        client.on('remove', (playerId: string) => {
            this.removePlayer(playerId);
            console.log("Player removed:", playerId);
        });

        client.on('syncPosition', (data: { id: string, x: number, y: number }) => {
            const sprite = this.playerMap[data.id];
            if (!sprite) return;
        
            // 내 로컬 시뮬레이션과 살짝 차이가 있더라도 "스르륵" 보정(또는 그냥 덮어쓰기)
            // 간단히: 즉시 덮어쓰기
            sprite.x = data.x;
            sprite.y = data.y;
        });
    }

    addNewPlayer(id: string, x: number, y: number) {
        // 이미 존재하면 무시
        if (this.playerMap[id]) return;

        // 플레이어 스프라이트 생성
        const sprite = this.physics.add.sprite(500, 500, 'princess', 'princess_idle_1');
        sprite.setTint(Math.random() * 0xffffff);     // 임의 색상(예시)
        sprite.setCollideWorldBounds(true);
        sprite.setDepth(1);

        this.physics.add.collider(sprite, this.layer1);
        this.physics.add.collider(sprite, this.layer2);

        // 동일 ID일 경우 스프라이트 숨기기
        if (this.currentPlayerId && id === this.currentPlayerId) {
            sprite.setVisible(false);
            console.log(`서버 플레이어 (${id})가 로컬 플레이어와 동일하여 숨김 처리되었습니다.`);
        }

        this.playerMap[id] = sprite;
    }

    movePlayer(id: string, x: number, y: number) {
        const sprite = this.playerMap[id];
        if (!sprite) return;

        // human의 위치 업데이트
        sprite.x = x;
        sprite.y = y;

        console.log(`플레이어 ID: ${id}가 (${x}, ${y})로 이동됨`);
    }

    removePlayer(id: string) {
        const sprite = this.playerMap[id];
        if (!sprite) return;
        sprite.destroy();
        delete this.playerMap[id];
    }

    changeScene() {
        this.scene.start('GameOver');
    }
}
