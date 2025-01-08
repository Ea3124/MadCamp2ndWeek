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
        
        this.load.image('snowman_with_red', 'images/players/snowman_with_red.png');
        this.load.image('snowman_with_yellow', 'images/players/snowman_with_yellow.png');
        this.load.image('snowman_with_green', 'images/players/snowman_with_green.png');
        this.load.image('dead_snowman', 'images/players/dead_snowman.png');
        //executioner 프레임 및 애니메이션 로드
        this.load.atlas(
            'executioner',
            'images/players/executioner.png',
            'images/players/executioner_atlas.json'
        );
        this.load.animation('executioner_anim', 'images/players/executioner_anim.json');
        
        //princess 프레임 및 애니메이션 로드
        this.load.atlas(
            'princess',
            'images/players/princess.png',
            'images/players/princess_atlas.json'   
        );
        this.load.animation('princess_anim', 'images/players/princess_anim.json');
        
        //knight 프레임 및 애니메이션 로드
        this.load.atlas(
            'knight',
            'images/players/knight.png',
            'images/players/knight_atlas.json'
        );
        this.load.animation('knight_anim', 'images/players/knight_anim.json');
        
        //townfolk 프레임 및 애니메이션 로드
        this.load.atlas(
            'townfolk',
            'images/players/townfolk.png',
            'images/players/townfolk_atlas.json'
        );
        this.load.animation('townfolk_anim', 'images/players/townfolk_anim.json');
        
        this.load.image('tile1', 'maps/IceTileset.png');
        this.load.image('tile2', 'maps/tf_winter_tileA1.png');
        this.load.image('tile3', 'maps/tf_winter_tileA2.png');
        this.load.image('tile4', 'maps/tf_winter_tileA5_cave.png');
        this.load.image('tile5', 'maps/tf_winter_tileA5_outside.png');
        this.load.image('tile6', 'maps/tf_winter_tileC.png');
        this.load.image('tile7', 'maps/tf_winter_tileD.png');
        this.load.image('tile8', 'maps/tf_winter_tileB.png');
        
        this.load.tilemapTiledJSON('map1', 'maps/tilemap1.json' );
        this.load.tilemapTiledJSON('map2', 'maps/tilemap2.json' );
        this.load.tilemapTiledJSON('map3', 'maps/tilemap3.json' );



        this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
        

        console.log('Load tilemap in preloader well');
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.
        const input = this.input;
        const add = this.add;

        WebFont.load({
            google: {
                families: [ 'Rubik Pixels', 'Jua' ]
            },
            active: function ()
            {
                add.text(0, 0, '.', { fontFamily: 'Rubik Pixels', fontSize: 1, color: '#ffffff' });
                add.text(0, 0, '.', { fontFamily: 'Jua', fontSize: 1, color: '#5656ee' });


                input.once('pointerdown', () =>
                {
                    t.setFontSize(64);
                });
            }
        });

        console.log('All assets loaded, transitioning to MainMenu.');
        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        // this.scene.start('MainMenu');

        //  Move to the Game. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('Intro');
    }
}
