import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { Intro } from './scenes/Intro';
import { Join } from './scenes/Join';
import { Create } from './scenes/Create';
import { WaitingRoom } from './scenes/WaitingRoom';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    physics: {
        default: 'arcade', // arcade만 사용
        arcade: {
            debug: false,
            gravity: { x: 0, y: 0 }
        }
    },
    parent: 'game-container',
    backgroundColor: '#000000',
    input: {
        keyboard: true
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        MainGame,
        GameOver,
        Intro,
        Join,
        Create,
        WaitingRoom
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
