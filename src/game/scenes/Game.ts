// src/scenes/Game.ts

import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import Phaser from 'phaser';
import { client } from '../socket';  // socket.ts에서 import

interface GameInitData {
    map: string;
    myId: string;
    playersInRoom: any; // 정확하게 바꿀것.
}

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
    playersInRoom: any;
    playerIndex: number;
    myCharacter: string; // 내 sprite에 인물 저장.
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    map: string;

    // private reportTimer = 0;
    // private readonly REPORT_INTERVAL = 100;

    constructor() {
        super('Game');
    }

    init(data: any) {
        this.map = data.map || 'defaultMap'; // 기본 맵 설정
        this.currentPlayerId = data.myId;
        this.playersInRoom = data.playersInRoom;
        this.playerIndex = (data.playersInRoom).findIndex( element => element.id === this.currentPlayerId);
        console.log(`index: ${this.playerIndex}, id: ${this.currentPlayerId}`);
    }

    preload() {
    }

    create() {
        console.log('Game scene is creating...');
              
        this.cursors = this.input?.keyboard?.createCursorKeys()!;
         
        const map = this.make.tilemap({ key: 'map' });
        const tileset1 = map.addTilesetImage('IceTileset', 'tile1', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset2 = map.addTilesetImage('tf_winter_tileA2', 'tile2', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset3 = map.addTilesetImage('tf_winter_tileA5_cave', 'tile3', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset4 = map.addTilesetImage('tf_winter_tileB', 'tile4', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset5 = map.addTilesetImage('tf_winter_tileD', 'tile5', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        this.layer1 = map.createLayer('Tile Layer 1', [tileset1, tileset2, tileset3, tileset4, tileset5], 0, 0) as Phaser.Tilemaps.TilemapLayer;
        this.layer2 = map.createLayer('Tile Layer 2', [tileset1, tileset2, tileset3, tileset4, tileset5], 0, 0) as Phaser.Tilemaps.TilemapLayer;
        console.log('createLayer success');

        this.player = this.physics.add.sprite(500, 500, 'executioner'); 
        console.log('Player body:', this.player.body);
    
        this.layer1.setCollisionByProperty({ collides: true });
        this.layer2.setCollisionByProperty({ collides: true });
        this.layer2.setDepth(2);

        const { texture: character, sprite: player } = this.createCharacter(this.playerIndex, 500, 500);
        this.myCharacter = character;
        this.player = player;
        console.log('Player body:', this.player.body);
            
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        // 선택된 맵을 배경으로 설정
        this.background = this.add.image(512, 384, this.map).setAlpha(0.5);

        this.playersInRoom.forEach((p: { id: string; playerIndex: number }, i: number) => {
            // 자기 자신이면 pass
            if (p.id === this.currentPlayerId) {
                this.playerMap[this.currentPlayerId] = this.player;
                return; 
            }
            
            const { texture: someTexture, sprite: otherSprite } = this.createCharacter(p.playerIndex, 500, 500);
            
            // playerMap에 등록해서 추후 위치 갱신 등에서 참조
            this.playerMap[p.id] = otherSprite;
        });
        
        this.handleSocketEvents();

        // 충돌 설정
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
            client.emit('move', { dir: 'left' });
            moving = true;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(200);
            client.emit('move', { dir: 'right' });
            moving = true;
        } else if (this.cursors.up.isDown) {
            this.player.setVelocityY(-200);
            client.emit('move', { dir: 'up' });
            moving = true;
            // this.player.setTexture('snowman_with_red');
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(200);
            client.emit('move', { dir: 'down' });
            moving = true;
        } else {
          client.emit('move', { dir: 'stop' });
        }

        let fileName = `${this.myCharacter}_walk`;
        if (moving) {
            this.player.anims.play(fileName, true);
        } else {
            // Stop the animation if no movement keys are pressed
            this.player.anims.stop();
        }

        // 일정 주기(100ms)마다 서버에 내 위치 보고
        if (time % 10 < delta) {
            client.emit('reportPosition', { x: this.player.x, y: this.player.y });
        }  
    }
    

    /**
     * 소켓 이벤트들을 모아서 처리
     */
    handleSocketEvents() {

        // 소켓 이벤트 처리
        client.on('move', (data: { id: string; dir: string }) => {
            const sprite = this.playerMap[data.id];
            if (!sprite) return;  // 혹은 아직 안 만들어진 경우 무시
        
            // 1) 우선 이전 속도 리셋
            sprite.setVelocity(0);

            const speed = 200;
        
            // 2) 받은 방향에 따라 속도 설정
            switch (data.dir) {
              case 'left':
                sprite.setVelocityX(-speed);
                break;
              case 'right':
                sprite.setVelocityX(speed);
                break;
              case 'up':
                sprite.setVelocityY(-speed);
                break;
              case 'down':
                sprite.setVelocityY(speed);
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
            if (data.id !== this.currentPlayerId) {
                this.playerMap[data.id].x = data.x;
                this.playerMap[data.id].y = data.y;
                return;
            }

            const sprite = this.playerMap[data.id];
            if (!sprite) return;

            const dx = data.x - sprite.x;
            const dy = data.y - sprite.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // 만약 오차(dist)가 어느 임계값(예: 50px 이상) 넘어가면 보정
            if (dist > 50) {
                // 즉시 덮어쓰기보다는, Tween 등으로 서서히 맞출 수도 있음
                sprite.x = data.x;
                sprite.y = data.y;
                console.log('보정 발생!', dist);
            }
        });
    }

    removePlayer(id: string) {
        const sprite = this.playerMap[id];
        if (!sprite) return;
        sprite.destroy();
        delete this.playerMap[id];
    }

    createCharacter(playerIndex: number, x: number, y: number) {
        let texture = 'princess';
        switch (playerIndex) {
            case 0: texture = 'princess'; break;
            case 1: texture = 'knight'; break;
            case 2: texture = 'executioner'; break;
            case 3: texture = 'townfolk'; break;
        }
        const sprite = this.physics.add.sprite(x, y, texture);
        sprite.setCollideWorldBounds(true);
        if (this.layer1) this.physics.add.collider(sprite, this.layer1);
        if (this.layer2) this.physics.add.collider(sprite, this.layer2);
        return { texture, sprite };
    }        
    

    changeScene() {
        this.scene.start('GameOver');
    }
}
