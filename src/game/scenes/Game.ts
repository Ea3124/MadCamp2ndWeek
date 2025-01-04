// import { EventBus } from '../EventBus';
// import { Scene } from 'phaser';
// import { client } from '../socket';  // 방금 만든 socket.ts에서 import

// export class Game extends Scene
// {

//     currentPlayerId: string;

//     camera: Phaser.Cameras.Scene2D.Camera;
//     background: Phaser.GameObjects.Image;
//     gameText: Phaser.GameObjects.Text;

//     // (추가) 온라인으로 접속한 플레이어들의 스프라이트 목록
//     playerMap: { [key: string]: Phaser.GameObjects.Sprite } = {};

//     // 방향키를 사용해서 움직이게 하기
//     cursors: Phaser.Types.Input.Keyboard.CursorKeys;

//     wasd: {
//         up: Phaser.Input.Keyboard.Key,
//         down: Phaser.Input.Keyboard.Key,
//         left: Phaser.Input.Keyboard.Key,
//         right: Phaser.Input.Keyboard.Key
//     };

//     constructor ()
//     {
//         super('Game');
//     }

//     create ()
//     {

//         this.cursors = this.input?.keyboard?.createCursorKeys()!;

//         this.camera = this.cameras.main;
//         this.camera.setBackgroundColor(0x00ff00);

//         this.background = this.add.image(512, 384, 'background');
//         this.background.setAlpha(0.5);

//         this.gameText = this.add.text(512, 384, 'Make something fun!\nand share it with us:\nsupport@phaser.io', {
//             fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
//             stroke: '#000000', strokeThickness: 8,
//             align: 'center'
//         }).setOrigin(0.5).setDepth(100);

//         // **Socket.io: 1) 새 플레이어 접속 알림**
//         client.emit('newplayer');

//         client.on('yourId', (id: string) => {
//             this.currentPlayerId = id;
//         });

//         // **Socket.io: 2) 서버에서 오는 이벤트 처리**
//         this.handleSocketEvents();

//         // 맵(백그라운드)을 클릭하면 좌표 전송
//         this.background.setInteractive();
//         this.background.on('pointerup', (pointer: Phaser.Input.Pointer) => {
//             client.emit('click', {
//                 x: pointer.worldX,
//                 y: pointer.worldY
//             });
//         });

//         this.wasd = {
//             up: this.input?.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W)!,
//             down: this.input?.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S)!,
//             left: this.input?.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A)!,
//             right: this.input?.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D)!
//         };

//         EventBus.emit('current-scene-ready', this);
//     }

//     update() {
//         if (this.cursors.left.isDown) {
//             client.emit('move', { dir: 'left' });
//         } else if (this.cursors.right.isDown) {
//             client.emit('move', { dir: 'right' });
//         } else if (this.cursors.up.isDown) {
//             client.emit('move', { dir: 'up' });
//         } else if (this.cursors.down.isDown) {
//             client.emit('move', { dir: 'down' });
//         }

//         // bell 스프라이트에 대한 WASD 입력 처리
//         this.handleBellMovement();
//     }

//     handleBellMovement() {
//         const bellSpeed = 2;
//         const humanSprite = this.playerMap[this.currentPlayerId];  // 실제 플레이어 ID 사용
        
//         if (!humanSprite) {
//             console.warn(`현재 플레이어 ID ${this.currentPlayerId}에 해당하는 스프라이트를 찾을 수 없습니다.`);
//             return;
//         }
    
//         const bellSprite = humanSprite.getData('bell');
        
//         if (!bellSprite) {
//             console.warn(`플레이어 ID ${this.currentPlayerId}에 해당하는 bell 스프라이트를 찾을 수 없습니다.`);
//             return;
//         }
    
//         if (this.wasd.left.isDown) {
//             bellSprite.x = Math.max(humanSprite.x - humanSprite.width / 2, bellSprite.x - bellSpeed);
//         } else if (this.wasd.right.isDown) {
//             bellSprite.x = Math.min(humanSprite.x + humanSprite.width / 2, bellSprite.x + bellSpeed);
//         }
    
//         if (this.wasd.up.isDown) {
//             bellSprite.y = Math.max(humanSprite.y - humanSprite.height / 2, bellSprite.y - bellSpeed);
//         } else if (this.wasd.down.isDown) {
//             bellSprite.y = Math.min(humanSprite.y + humanSprite.height / 2, bellSprite.y + bellSpeed);
//         }
//     }
    

//         /**
//      * 소켓 이벤트들을 모아서 처리
//      */
//         handleSocketEvents()
//         {
//             // (a) 이미 접속 중인 플레이어 목록 받기
//             client.on('allplayers', (players: { id: string, x: number, y: number }[]) => {
//                 players.forEach((p) => {
//                     this.addNewPlayer(p.id, p.x, p.y);
//                     console.log("111",p.id);
//                 });
//             });
    
//             // (b) 새 플레이어가 들어왔을 때
//             client.on('newplayer', (player: { id: string, x: number, y: number }) => {
//                 this.addNewPlayer(player.id, player.x, player.y);
//             });
    
//             // (c) 특정 플레이어가 이동했을 때
//             client.on('move', (player: { id: string, x: number, y: number }) => {
//                 this.movePlayer(player.id, player.x, player.y);
//                 console.log("move",player.id);
//             });
    
//             // (d) 플레이어가 떠났을 때
//             client.on('remove', (playerId: string) => {
//                 this.removePlayer(playerId);
//             });
//         }

//         addNewPlayer(id: string, x: number, y: number)
//     {
//         // 이미 존재하면 무시
//         if (this.playerMap[id]) return;

//         const sprite = this.add.sprite(x, y, 'human'); // 예: star.png
//         sprite.setTint(Math.random() * 0xffffff);     // 임의 색상(예시)

//         const bellSprite = this.add.sprite(x, y, 'bell');  // bell 이미지 추가
//         sprite.setData('bell', bellSprite);  // bellSprite를 human 스프라이트에 연결


//         this.playerMap[id] = sprite;
//     }

//     movePlayer(id: string, x: number, y: number)
//     {
//         const sprite = this.playerMap[id];
//         if (!sprite) return;

//         // 간단히 즉시 위치 이동 (혹은 트윈 이동)
//         sprite.x = x;
//         sprite.y = y;

//         // 트윈 예시
//         // const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, x, y);
//         // const duration = dist * 4;
//         // this.tweens.add({
//         //   targets: sprite,
//         //   x, y,
//         //   duration,
//         //   ease: 'Power2'
//         // });
//     }

//     removePlayer(id: string)
//     {
//         const sprite = this.playerMap[id];
//         if (!sprite) return;
//         sprite.destroy();
//         delete this.playerMap[id];
//     }

//     changeScene ()
//     {
//         this.scene.start('GameOver');
//     }
// }


// src/scenes/Game.ts

import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { client } from '../socket';  // socket.ts에서 import

export class Game extends Scene {
    currentPlayerId: string;

    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;

    // 온라인으로 접속한 플레이어들의 스프라이트 목록
    playerMap: { [key: string]: Phaser.GameObjects.Sprite } = {};

    // 방향키
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    wasd: {
        up: Phaser.Input.Keyboard.Key,
        down: Phaser.Input.Keyboard.Key,
        left: Phaser.Input.Keyboard.Key,
        right: Phaser.Input.Keyboard.Key
    };

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
        this.load.image('bell', 'assets/bell.png');
        // 기타 필요한 자산 로드
    }

    create() {
        this.cursors = this.input?.keyboard?.createCursorKeys()!;

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x00ff00);

        // 선택된 맵을 배경으로 설정
        this.background = this.add.image(512, 384, this.map).setAlpha(0.5);

        this.gameText = this.add.text(512, 384, '게임을 시작합니다!', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // **Socket.io: 1) 새 플레이어 접속 알림**
        client.emit('newplayer');

        client.on('yourId', (id: string) => {
            this.currentPlayerId = id;
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

        this.wasd = {
            up: this.input?.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W)!,
            down: this.input?.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S)!,
            left: this.input?.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A)!,
            right: this.input?.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D)!
        };

        EventBus.emit('current-scene-ready', this);
    }

    update() {
        if (this.cursors.left.isDown) {
            client.emit('move', { dir: 'left' });
        } else if (this.cursors.right.isDown) {
            client.emit('move', { dir: 'right' });
        } else if (this.cursors.up.isDown) {
            client.emit('move', { dir: 'up' });
        } else if (this.cursors.down.isDown) {
            client.emit('move', { dir: 'down' });
        }

        // bell 스프라이트에 대한 이동 처리
        this.handleBellMovement();
    }

    handleBellMovement() {
        const bellSpeed = 2;
        const humanSprite = this.playerMap[this.currentPlayerId];  // 현재 플레이어의 human 스프라이트
        
        if (!humanSprite) {
            console.warn(`현재 플레이어 ID ${this.currentPlayerId}에 해당하는 스프라이트를 찾을 수 없습니다.`);
            return;
        }
    
        const bellSprite = humanSprite.getData('bell');
        
        if (!bellSprite) {
            console.warn(`플레이어 ID ${this.currentPlayerId}에 해당하는 bell 스프라이트를 찾을 수 없습니다.`);
            return;
        }
    
        if (this.wasd.left.isDown) {
            bellSprite.x = Math.max(humanSprite.x - humanSprite.width / 2, bellSprite.x - bellSpeed);
        } else if (this.wasd.right.isDown) {
            bellSprite.x = Math.min(humanSprite.x + humanSprite.width / 2, bellSprite.x + bellSpeed);
        }
    
        if (this.wasd.up.isDown) {
            bellSprite.y = Math.max(humanSprite.y - humanSprite.height / 2, bellSprite.y - bellSpeed);
        } else if (this.wasd.down.isDown) {
            bellSprite.y = Math.min(humanSprite.y + humanSprite.height / 2, bellSprite.y + bellSpeed);
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

        // (c) 특정 플레이어가 이동했을 때
        client.on('move', (player: { id: string, x: number, y: number }) => {
            this.movePlayer(player.id, player.x, player.y);
            console.log("Player moved:", player.id);
        });

        // (d) 플레이어가 떠났을 때
        client.on('remove', (playerId: string) => {
            this.removePlayer(playerId);
            console.log("Player removed:", playerId);
        });
    }

    addNewPlayer(id: string, x: number, y: number) {
        // 이미 존재하면 무시
        if (this.playerMap[id]) return;

        const sprite = this.add.sprite(x, y, 'human'); // 예: star.png
        sprite.setTint(Math.random() * 0xffffff);     // 임의 색상(예시)

        const bellSprite = this.add.sprite(x, y, 'bell');  // bell 이미지 추가
        bellSprite.setDepth(sprite.depth + 1); // bell이 human 위에 있도록 설정
        sprite.setData('bell', bellSprite);  // bellSprite를 human 스프라이트에 연결

        this.playerMap[id] = sprite;
    }

    movePlayer(id: string, x: number, y: number) {
        const sprite = this.playerMap[id];
        if (!sprite) return;

        // human의 위치 업데이트
        sprite.x = x;
        sprite.y = y;

        // bell의 위치 업데이트 (human과 동기화)
        const bellSprite = sprite.getData('bell');
        if (bellSprite) {
            // 예: bell을 human의 위쪽에 위치시키기
            const offsetX = 0;
            const offsetY = -sprite.height / 2 - bellSprite.height / 2;
            bellSprite.x = sprite.x + offsetX;
            bellSprite.y = sprite.y + offsetY;
        }

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
