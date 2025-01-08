// src/scenes/Game.ts

import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';
import Phaser from 'phaser';
import { client } from '../socket';  // socket.ts에서 import

export class Game extends Scene {
    
    currentPlayerId: string;
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    player: Phaser.Physics.Arcade.Sprite;        
    private layer1!: Phaser.Tilemaps.TilemapLayer;
    private layer2!: Phaser.Tilemaps.TilemapLayer;
    private layer3!: Phaser.Tilemaps.TilemapLayer;

    // 온라인으로 접속한 플레이어들의 스프라이트 목록
    playerMap: { [key: string]: { sprite: Phaser.Physics.Arcade.Sprite, character: string, isFrozen: boolean, isDead: boolean } } = {};
    private playersGroup!: Phaser.Physics.Arcade.Group;
    playersInRoom: any;
    playerIndex: number;
    myCharacter: string; // 내 sprite에 인물 저장.
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    map: string;
    myNickname: string;
    myScore: number; // 술래면 게임 남은 시간, 그 외 플레이어면 잡힌 시점의 시각 

    isFrozen: boolean = false; // 얼음 상태 관리
    overlapCooldown: boolean;

    isDead: boolean = false;

    isTaggerFrozen: boolean = false; // 술래 움직임 제한 상태
    taggerId: string; // 술래의 socket ID
    taggerFrozenText!: Phaser.GameObjects.Text; // 술래에게 표시할 텍스트

    taggerCountdownText!: Phaser.GameObjects.Text; // 타이머 텍스트

    gameCountdownText!: Phaser.GameObjects.Text; // 전체 게임 타이머 텍스트
    timerFlag: boolean = false; // 태거 타이머 표시 끝남.
    nowTime: number; // 현재 남은 시간 나타냄. (ms단위)


    // --------- 추가: 타이머 관련 프로퍼티 ---------
    // 3분 = 180초 (ms 단위로는 180*1000 = 180000)
    private GAME_DURATION: number = 180000; 
    private startOverlay!: Phaser.GameObjects.Rectangle;
    private startOverlay2!: Phaser.GameObjects.Rectangle;
    private startText!: Phaser.GameObjects.Text;
    private endOverlay!: Phaser.GameObjects.Rectangle;
    private endText!: Phaser.GameObjects.Text;


    constructor() {
        super('Game');
    }

    init(data: any) {
        this.map = data.map || 'map1'; // 기본 맵 설정
        console.log("현재맵은: ", this.map);
        this.currentPlayerId = data.myId;
        this.playersInRoom = data.playersInRoom;
        this.playerIndex = (data.playersInRoom).findIndex( element => element.id === this.currentPlayerId);
        console.log(`index: ${this.playerIndex}, id: ${this.currentPlayerId}`);
        this.isDead = false;
        this.timerFlag = false; // 술래의 타이머를 이미 실행했는가?
    }

    create() {
        console.log('Game scene is creating...');
              
        this.cursors = this.input?.keyboard?.createCursorKeys()!;
         
        let map 
        switch (this.map) {
            case 'map1': map = this.make.tilemap({ key: 'map1'}); break;
            case 'map2': map = this.make.tilemap({ key: 'map2'}); break;
            case 'map3': map = this.make.tilemap({ key: 'map3'}); break;
            default: map = this.make.tilemap({ key: 'map1'}); console.log("this.map에 다른 값이 있어 기본으로 설정됨.");
        }

        const tileset1 = map.addTilesetImage('IceTileset', 'tile1', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset2 = map.addTilesetImage('tf_winter_tileA1', 'tile2', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset3 = map.addTilesetImage('tf_winter_tileA2', 'tile3', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset4 = map.addTilesetImage('tf_winter_tileA5_cave', 'tile4', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset5 = map.addTilesetImage('tf_winter_tileA5_outside', 'tile5', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset6 = map.addTilesetImage('tf_winter_tileC', 'tile6', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset7 = map.addTilesetImage('tf_winter_tileD', 'tile7', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset8 = map.addTilesetImage('tf_winter_tileB', 'tile8', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        this.layer1 = map.createLayer('Tile Layer 1', [tileset1, tileset2, tileset3, tileset4, tileset5, tileset6, tileset7, tileset8], 0, 0) as Phaser.Tilemaps.TilemapLayer;
        this.layer2 = map.createLayer('Tile Layer 2', [tileset1, tileset2, tileset3, tileset4, tileset5, tileset6, tileset7, tileset8], 0, 0) as Phaser.Tilemaps.TilemapLayer;
        this.layer3 = map.createLayer('Tile Layer 3', [tileset1, tileset2, tileset3, tileset4, tileset5, tileset6, tileset7, tileset8], 0, 0) as Phaser.Tilemaps.TilemapLayer;
        console.log('createLayer success');
    
        this.layer1.setCollisionByProperty({ collides: true });
        this.layer2.setCollisionByProperty({ collides: true });
        this.layer3.setCollisionByProperty({ collides: true });
        this.layer2.setDepth(2);
        this.layer3.setDepth(3);

        const { texture: character, sprite: player } = this.createCharacter(this.currentPlayerId, this.playerIndex, 520, 420);
        this.myCharacter = character;
        this.player = player;
        console.log('Player body:', this.player.body);

        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        // 선택된 맵을 배경으로 설정
        // this.background = this.add.image(512, 384, this.map).setAlpha(0.5);

        this.playersInRoom.forEach((p: { id: string; playerIndex: number, nickname: string}, i: number) => {
            // 자기 자신이면 pass
            if (p.id === this.currentPlayerId) {
                this.myNickname = p.nickname;
                console.log(`나의 닉네임: ${this.myNickname}`);
                this.playerMap[this.currentPlayerId] = {sprite: this.player, character: this.myCharacter, isFrozen: false, isDead: false};
                return; 
            }
            
            const { texture: someTexture, sprite: otherSprite } = this.createCharacter(p.id, p.playerIndex, 520, 420);
            
            // playerMap에 등록해서 추후 위치 갱신 등에서 참조
            this.playerMap[p.id] = {sprite: otherSprite, character: someTexture, isFrozen: false, isDead: false};
        });


        
        fetch('http://172.10.7.17:3000/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: this.currentPlayerId,
                nickname: this.myNickname,
                score: 0
            })
        })
        .then(res => {
            if (!res.ok) {
                throw new Error(`서버 에러: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            console.log('DB 저장 결과:', data);
        })
        .catch(error => {
            console.error('User Insert error:', error);
        });

        // 만약 내가 술래라면,
        if (this.playerIndex === 2) {
            this.taggerId = this.currentPlayerId; // 이미 createCharacter에서 넣어줬지만 한 번 더 넣어줌.
            this.displayTaggerMessage();  
        }

        // 위에서 playerMap[id]에 모든 유저가 저장된 뒤에,
        this.playersGroup = this.physics.add.group({
            // optional config
            runChildUpdate: true
        });
        Object.keys(this.playerMap).forEach((playerId) => {
            const { sprite } = this.playerMap[playerId];
            this.playersGroup.add(sprite);
        });
        this.physics.add.overlap(
            this.playersGroup,
            this.playersGroup,
            this.handlePlayerOverlap, // 겹칠 때 호출할 콜백
            undefined,
            // this.processPlayerOverlap, // optional, 어떤 Overla만 처리할지 필터
            this
        );

        
        this.handleSocketEvents();

        // 충돌 설정
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(1);

        // '얼음' 상태 토글 이벤트
        if (this.playerIndex != 2) {
            this.input.keyboard?.on('keydown-F', () => {
                client.emit('frozenRequest');
            })
        }
        // this.input.keyboard?.on('keydown-F', () => {
        //     client.emit('frozenRequest');
        //     // 술래면 해당 토글 이벤트 자체를 없애야 겠다.
        //     this.isFrozen = true; // F 키로 얼음 상태로 만듦.
        //     this.playerMap[this.currentPlayerId].isFrozen = true;
        //     if (this.isDead) return;
        //     // 해당 눈사람 이미지 모두 변경시키기
        //     if (this.isFrozen) {
        //         this.player.setVelocity(0); // 얼음 상태면 움직임을 멈춤
        //         switch(this.myCharacter) {
        //             case 'princess': 
        //                 this.player.setTexture('snowman_with_yellow');
        //                 break;
        //             case 'knight': 
        //                 this.player.setTexture('snowman_with_green');
        //                 break;
        //             case 'townfolk': 
        //                 this.player.setTexture('snowman_with_red');
        //                 break;
        //             default:
        //                 console.log("[client.on(frozen)] 오류 발생");
        //         }
        //         // this.player.setTexture('snowman_with_red');
        //         client.emit('frozen', true);
        //         //얼음 상태이면 눈사람으로 변신.
        //     } 
        // })
        
        

        this.cursors = this.input?.keyboard?.createCursorKeys()!;

        // -----------------------------
        // 1) 게임 시작 시 어둑한 배경 + "Game Start!" 표시
        // -----------------------------
        if (this.playerIndex !== 2) {
            this.showGameStartOverlay();
        }

        console.log('Game scene created successfully.');

        EventBus.emit('current-scene-ready', this);
    }

    update(time: number, delta: number) {
        if (!this.player || !this.cursors) return;
        let moving = false;
        // 기존 이동 로직
        this.player.setVelocity(0);

        if (this.isFrozen) {
            client.emit('move', { dir: 'stop' });
            this.player.anims.stop();
            return
        };
        if (this.isDead) {
            this.player.anims.stop();
            client.emit('move', { dir: 'stop' });
            this.player.setTexture('dead_snowman');
            return;
        }

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-170);
            client.emit('move', { dir: 'left' });
            moving = true;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(170);
            client.emit('move', { dir: 'right' });
            moving = true;
        } else if (this.cursors.up.isDown) {
            this.player.setVelocityY(-170);
            client.emit('move', { dir: 'up' });
            moving = true;
            // this.player.setTexture('snowman_with_red');
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(170);
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

    displayTaggerMessage() {
        const { width, height } = this.sys.game.canvas;
        
        // 살짝 어두워진 반투명 사각형(씬 전체 덮음)
        this.startOverlay2 = this.add.rectangle(
            width / 2, 
            height / 2, 
            width, 
            height, 
            0x000000, 
            0.4
        );
        this.startOverlay2.setScrollFactor(0);  
        this.startOverlay2.setDepth(100);
        
        this.taggerFrozenText = this.add.text(width / 2, height / 2, '당신은 술래입니다! 10초 동안 움직일 수 없습니다!', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#ffffff',
            stroke: '#ff0000',
            strokeThickness: 4,
        }).setOrigin(0.5);
        this.taggerFrozenText.setScrollFactor(0);
        this.taggerFrozenText.setDepth(101);

        this.isTaggerFrozen = true; // 술래 움직임 제한 시작
        this.isFrozen = true;
        client.emit('frozen', true);
        client.emit('startGameTimer', 10000 );  // 술래가 타이머 시작을 요청.
        console.log('startGameTimer emitted');

        this.time.delayedCall(8000, () => {
            client.emit('startGameTimer', this.GAME_DURATION);
        })

        this.time.delayedCall(9000, () => {
            this.isTaggerFrozen = false; // 10초 후 움직임 제한 해제
            this.isFrozen = false;
            client.emit('frozen', false);
            this.startOverlay2.destroy();
            this.taggerFrozenText.destroy(); // 텍스트 제거
            console.log('타이머 해제');
        });
    }

    // 술래 못 움직이는 시간 출력
    displayCountdownText(countdown: number) {
        const { width, height } = this.sys.game.canvas;
        this.taggerCountdownText = this.add.text(width *0.05, height * 0.05, `Timer: ${countdown}s`, {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0,0);
        this.taggerCountdownText.setScrollFactor(0);
        this.taggerCountdownText.setDepth(200);
    }

    // 전체 시간 출력
    displayCountdownText2(countdown: number) {
        const { width, height } = this.sys.game.canvas;
        const countfordisplay = countdown / 1000; 
        this.gameCountdownText = this.add.text(width / 2, height * 0.1, `Timer: ${countfordisplay}s`, {
            fontSize: '42px',
            color: '#000000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.taggerCountdownText.setScrollFactor(0);
        this.taggerCountdownText.setDepth(200);
    }
    
    handlePlayerOverlap(obj1: Phaser.Types.Physics.Arcade.GameObjectWithBody, obj2: Phaser.Types.Physics.Arcade.GameObjectWithBody){
        // 두 스프라이트가 누군지 식별
        const spriteA = obj1 as Phaser.Physics.Arcade.Sprite;
        const spriteB = obj2 as Phaser.Physics.Arcade.Sprite;

        // 이미 처리중이거나 방금 처리했다면 return;
        if (this.overlapCooldown) return;

        // playerMap에서 해당 sprite를 가진 playerId를 찾음.
        const idA = this.findPlayerIdBySprite(spriteA);
        const idB = this.findPlayerIdBySprite(spriteB);
        if (!idA || !idB) return;
        if (idA === idB) return;

        console.log(`Overlap between player ${idA} and player ${idB}`);

        //서버에 알림
        client.emit('players_overlap', { aId: idA, bId: idB });
        
        this.overlapCooldown = true;
        setTimeout(() => {
            this.overlapCooldown = false;
        }, 1000); 
    }

    findPlayerIdBySprite(sprite: Phaser.Physics.Arcade.Sprite) : string | null {
        for (const [pid, data] of Object.entries(this.playerMap)) {
            if (data.sprite === sprite) {
                return pid;
            }
        }
        return null;
    }

    /**
     * 소켓 이벤트들을 모아서 처리
     */
    handleSocketEvents() {
        client.off('timerStart');
        client.off('timerUpdate');
        client.off('timerEnd');
        client.off('frozen');
        client.off('move');
        client.off('remove');
        client.off('syncPosition');

        client.on('timerStart', (data) => {
            console.log('time_start in client');
            let duration = data;
            if (!this.timerFlag) {// this.timerFlag가 false이면 (즉, 술래 타이머를 아직 실행하지 않았으면,)
                this.displayCountdownText(duration);
                // this.timerFlag
            } else {
                this.displayCountdownText2(duration);
                this.nowTime = duration;
                console.log(this.nowTime);
            }
        });

        client.on('timerUpdate', (data) => {
            const { countdown } = data;
            if (!this.timerFlag) {// this.timerFlag가 false이면 (즉, 술래 타이머를 아직 실행하지 않았으면,)
                this.taggerCountdownText.setText(`Timer: ${countdown}s`);
                // this.timerFlag
            } else {
                this.gameCountdownText.setText(`Timer: ${countdown}s`);
                this.nowTime = countdown * 1000;
                console.log(this.nowTime);
            }
        });
        
        client.on('timerEnd', () => { // 타이머가 종료
            if (!this.timerFlag) {
                if (this.taggerCountdownText) {
                    this.taggerCountdownText.setText('Time\'s up!');
                    setTimeout(() => {
                        this.taggerCountdownText.destroy();
                        this.timerFlag = true;
                    }, 1000);
                }
            } else {
                if (this.gameCountdownText) {
                    this.gameCountdownText.setText('Time\'s up!');
                    setTimeout(() => {
                        this.gameCountdownText.destroy();
                    }, 1000);
                    // 타이머가 종료되면서 게임이 종료됨.
                    if (this.playerIndex ===2 ) {
                        this.myScore = 0;
                    } else if (!this.isDead) { // 게임이 끝날때까지 죽지 않은 경우,
                        console.log("마지막까지 생존함.");
                        this.myScore = 180000;
                    }
                    this.showGameEndText()
                }
            }
        });

        client.on('gameover', () => {
            // 술래가 모두 잡아서 게임이 종료됨.
            if (this.playerIndex == 2) {
                this.myScore = 180000;
                console.log("나의 스코어는: ", this.myScore);
            }
            this.showGameEndText()
        })

        client.on('playerOut', (data) => {
            // if (this.isDead) return;
            const playerId = data;
            this.playerMap[playerId].isDead = true;
            this.playerMap[playerId].isFrozen = true;
            this.playerMap[playerId].sprite.setVelocity(0);
            this.playerMap[playerId].sprite.setTexture('dead_snowman');

            console.log(`${this.currentPlayerId}의 화면에서 ${playerId}의 아웃이 처리됨.`); 

            if (this.currentPlayerId == playerId) {
                // 아웃된 사람이 나일때,
                this.myScore = this.nowTime;
                console.log("나의 스코어는: ", this.myScore);
                this.isDead = true;
                this.isFrozen = true;
                // this.player.anims.stop();
                this.player.setTexture('dead_snowman');
                this.player.setVelocity(0);
            }
            // this.playerMap[playerId].sprite.anims.stop();
            console.log(`플레이어 ${playerId}가 탈락됨`);
            // 플레이어 탈락시 모든 플레이어 얼음 상태를 해제시켜야함.
        })

        client.on('frozen', (data) => {
            // if (this.isDead) return;
            const isFrozen = data.isFrozen;
            const id = data.id;
            const character = this.playerMap[data.id].character;

            // 이미 해당 상태라면 추가 처리 없이 종료
            if (this.playerMap[id].isFrozen === isFrozen) {
                console.log("No change in frozen state for player:", id);
                return; // 이 이벤트에 대한 처리를 여기서 종료
            }

            this.playerMap[id].isFrozen = isFrozen;

            if (id == this.currentPlayerId ) {
                this.isFrozen = isFrozen;
                if (isFrozen) {
                    this.player.setVelocity(0); // 얼음 상태면 움직임을 멈춤
                }
            }
            console.log("Frozen state changed for player:", id);


            switch (character) {
                case 'princess': 
                    if (isFrozen) {
                        this.playerMap[data.id].sprite.setTexture('snowman_with_yellow');
                    } else {
                        this.playerMap[data.id].sprite.setTexture(character);
                    } break;
                case 'knight': 
                    if (isFrozen) {
                        this.playerMap[data.id].sprite.setTexture('snowman_with_green');
                    } else {
                        this.playerMap[data.id].sprite.setTexture(character);
                    } break;
                case 'townfolk': 
                    if (isFrozen) {
                        this.playerMap[data.id].sprite.setTexture('snowman_with_red');
                    } else {
                        this.playerMap[data.id].sprite.setTexture(character);
                    } break;
                case 'executioner': 
                    if (isFrozen) {
                        console.log("술래가 frozen 상태");
                    } else {
                        console.log("술래가 frozen 해제 상태");
                    } break;
                default:
                    console.log("[client.on(frozen)] 오류 발생");
            }
        })

        // 소켓 이벤트 처리
        client.on('move', (data: { id: string; dir: string }) => {
            const sprite = this.playerMap[data.id].sprite;
            // if (this.isDead) return;
            if (!sprite) return;  // 혹은 아직 안 만들어진 경우 무시
        
            // 1) 우선 이전 속도 리셋
            sprite.setVelocity(0);
            const speed = 170;

            let fileName = `${this.playerMap[data.id].character}_walk`;
        
            // 2) 받은 방향에 따라 속도 설정
            switch (data.dir) {
              case 'left':
                sprite.setVelocityX(-speed);
                sprite.anims.play(fileName, true);
                break;
              case 'right':
                sprite.setVelocityX(speed);
                sprite.anims.play(fileName, true);
                break;
              case 'up':
                sprite.setVelocityY(-speed);
                sprite.anims.play(fileName, true);
                break;
              case 'down':
                sprite.setVelocityY(speed);
                sprite.anims.play(fileName, true);
                // this.player.anims.play(fileName, true);
                break;
              case 'stop':
                // 아무것도 안 함 (이미 0이므로)
                sprite.anims.stop();
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
                this.playerMap[data.id].sprite.x = data.x;
                this.playerMap[data.id].sprite.y = data.y;
                return;
            }

            const sprite = this.playerMap[data.id].sprite;
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
        const sprite = this.playerMap[id].sprite;
        if (!sprite) return;
        sprite.destroy();
        delete this.playerMap[id];
    }

    createCharacter(id: string, playerIndex: number, x: number, y: number) {
        let texture = 'princess';
        switch (playerIndex) {
            case 0: texture = 'princess'; break;
            case 1: texture = 'knight'; break;
            case 2: texture = 'executioner'; this.taggerId = id; break;
            case 3: texture = 'townfolk'; break;
        }
        const sprite = this.physics.add.sprite(x, y, texture);
        sprite.setCollideWorldBounds(true);
        if (this.layer1) this.physics.add.collider(sprite, this.layer1);
        if (this.layer2) this.physics.add.collider(sprite, this.layer2);
        if (this.layer3) this.physics.add.collider(sprite, this.layer3);
        return { texture, sprite };
    }        

    // -----------------------------
    //  (추가) 게임 시작 시 오버레이를 깔고 텍스트 표시
    // -----------------------------
    private showGameStartOverlay() {
        const { width, height } = this.sys.game.canvas;
        // 살짝 어두워진 반투명 사각형(씬 전체 덮음)
        this.startOverlay = this.add.rectangle(
            width / 2, 
            height / 2, 
            width, 
            height, 
            0x000000, 
            0.4
        );
        this.startOverlay.setScrollFactor(0);  
        this.startOverlay.setDepth(100);
        
        // 중앙에 "Game Start!" 텍스트
        this.startText = this.add.text(
            width / 2,
            height / 2,
            'Game Start!',
            {
                fontSize: '40px',
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        this.startText.setScrollFactor(0);
        this.startText.setDepth(101);

        // 원하는 시점에 제거 (예: 1초 후)
        this.time.delayedCall(1000, () => {
            this.startOverlay.destroy();
            this.startText.destroy();
        });
    }

    // -----------------------------
    //  (추가) 3분 뒤 표시할 텍스트
    // -----------------------------
    private showGameEndText() {
        const { width, height } = this.sys.game.canvas;

        this.endOverlay = this.add.rectangle(
            width / 2, 
            height / 2, 
            width, 
            height, 
            0x000000, 
            0.4
        );
        this.endOverlay.setScrollFactor(0);  
        this.endOverlay.setDepth(100);

        this.endText = this.add.text(
            width / 2,
            height / 2,
            'Game end!',
            {
                fontSize: '40px',
                color: '#ff0000',
                fontStyle: 'bold',
                backgroundColor: '#000000'
            }
        )
        .setOrigin(0.5)
        .setDepth(200);
        this.endText.setScrollFactor(0);

        // 필요하다면 씬 전환이나 다른 로직 수행도 가능
        this.time.delayedCall(3000, () => { this.changeScene(); });
    }
    

    changeScene() {
        this.scene.start('GameOver');
    }
}

