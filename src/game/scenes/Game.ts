import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import Phaser from 'phaser';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;
    player: Phaser.Physics.Arcade.Sprite; // Add this
    cursors: Phaser.Types.Input.Keyboard.CursorKeys; // Add this

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        console.log('Game scene is creating...');

        const map = this.make.tilemap({key: 'map'});
        console.log('map is created')

        const tileset1 = map.addTilesetImage('IceTileset', 'tile1', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset2 = map.addTilesetImage('tf_winter_tileA2', 'tile2', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset3 = map.addTilesetImage('tf_winter_tileA5_cave', 'tile3', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset4 = map.addTilesetImage('tf_winter_tileB', 'tile4', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        const tileset5 = map.addTilesetImage('tf_winter_tileD', 'tile5', 32, 32, 0, 0) as Phaser.Tilemaps.Tileset;
        console.log('addTilesetImage success');


        const layer1 = map.createLayer('Tile Layer 1', [tileset1, tileset2, tileset3, tileset4, tileset5], 0, 0) as Phaser.Tilemaps.TilemapLayer;
        const layer2 = map.createLayer('Tile Layer 2', [tileset1, tileset2, tileset3, tileset4, tileset5], 0, 0) as Phaser.Tilemaps.TilemapLayer;
        console.log('createLayer success');

        this.player = this.physics.add.sprite(500, 500, 'executioner'); 
        console.log('Player body:', this.player.body);
    
        layer1.setCollisionByProperty({ collides: true});
        layer2.setCollisionByProperty({ collides: true});
        layer2.setDepth(2);

        // Arcade Physics로 충돌 처리
        this.physics.add.collider(this.player, layer1);
        this.physics.add.collider(this.player, layer2);
        
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        this.player.setCollideWorldBounds(true);
        this.player.setDepth(1)
        console.log('Player visibility:', this.player.visible, 'Alpha:', this.player.alpha);
        
        this.cursors = this.input?.keyboard?.createCursorKeys()!;

        console.log('Game scene created successfully.');

        // 스프라이트가 화면 범위 내에 있는지 확인
        if (this.player.x > this.cameras.main.width || this.player.y > this.cameras.main.height) {
            console.warn('Player is out of camera bounds.');
        }

        EventBus.emit('current-scene-ready', this);

    }

    update() {
        console.log('Game update loop running...');
        if (!this.player || !this.cursors) {
            return; // Early return if player or cursors are not initialized
        } 

        this.player.setVelocity(0); // Reset velocity each frame
        let moving = false;

        console.log('Maybe doing well ~ ')
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
        }
        
        if (moving) {
            this.player.anims.play('executioner_walk', true);
        } else {
            // Stop the animation if no movement keys are pressed
            this.player.anims.stop();
        }
        
        console.log('Is animation playing:', this.player.anims.isPlaying);
        // console.log('Current animation:', this.player.anims.currentAnim.key);

    }

    changeScene ()
    {
        console.log('Changing scene to GameOver.');
        this.scene.start('GameOver');
    }
}