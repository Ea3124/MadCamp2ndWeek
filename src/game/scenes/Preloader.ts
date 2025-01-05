import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        // const board = this.add.rectangle(100, 100)

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');
        this.load.image('human', 'human.png');
        this.load.image('joinButton', 'joinButton.png');
        this.load.image('startButton', 'startButton.png');
        this.load.image('createButton', 'createButton.png');
        // this.load.spritesheet('player', 'star.png', {
        //     frameWidth: 20, // 각 프레임의 너비
        //     frameHeight: 20, // 각 프레임의 높이
        // });

        this.load.atlas(
            'executioner',
            'images/players/executioner.png',
            'images/players/executioner_atlas.json'
        );
        this.load.animation('executioner_anim', 'images/players/executioner_anim.json');
        
        this.load.atlas(
            'princess',
            'images/players/princess.png',
            'images/players/princess_atlas.json'   
        );

        this.load.atlas(
            'player2',
            'images/players/princess.png',
            'images/players/princess_atlas.json'   
        );
        this.load.atlas(
            'player3',
            'images/players/knight.png',
            'images/players/knight_atlas.json'
        );
        this.load.atlas(
            'player4',
            'images/players/townfolk.png',
            'images/players/townfolk_atlas.json'
        );
        this.load.image('tile1', 'images/IceTileset.png');
        this.load.image('tile2', 'images/tf_winter_tileA2.png');
        this.load.image('tile3', 'images/tf_winter_tileA5_cave.png');
        this.load.image('tile4', 'images/tf_winter_tileB.png');
        this.load.image('tile5', 'images/tf_winter_tileD.png');

        this.load.tilemapTiledJSON('map', 'images/real_map2.json');
        

        console.log('Load tilemap in preloader well');
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.
        
        console.log('All assets loaded, transitioning to MainMenu.');
        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        // this.scene.start('MainMenu');

        //  Move to the Game. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('Intro');
    }
}
