// src/scenes/WaitingRoom.ts
import { Scene, GameObjects} from 'phaser';
import { client } from '../socket';

interface WaitingRoomData {
    roomName: string;
    nickname: string;
    map: string;
    leader?: string; // 추가
}

export class WaitingRoom extends Scene {
    background: GameObjects.Image;
    title: GameObjects.Text;
    roomName: string;
    nickname: string;
    map: string;
    startButton: GameObjects.Image | null;
    isLeader: boolean;
    playersListText: GameObjects.Text;

    constructor() {
        super('WaitingRoom');
        this.roomName = '';
        this.nickname = '';
        this.map = '';
        this.startButton = null;
        this.isLeader = false;
    }

    init(data: WaitingRoomData) {
        this.roomName = data.roomName;
        this.nickname = data.nickname;
        this.map = data.map;
        
        // ★ 처음부터 방장인지 체크
        if (data.leader && data.leader === client.id) {
            this.isLeader = true;
        } else {
            this.isLeader = false;
        }
    }

    create() {
        // 배경
        this.background = this.add.image(512, 384, 'background');

        // 제목
        this.title = this.add.text(512, 100, `방: ${this.roomName}`, {
            fontFamily: 'Arial Black',
            fontSize: 32,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);

        // 플레이어 목록
        this.playersListText = this.add.text(512, 200, '플레이어 목록:\n', {
            fontFamily: 'Arial',
            fontSize: 24,
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // "게임 시작" 버튼
        this.startButton = this.add.image(512, 600, 'startButton')
            .setInteractive()
            .setVisible(false); // 기본적으로 숨김
        this.startButton.on('pointerdown', () => {
            this.startGame();
        });

        // ★ 만약 처음부터 내가 방장이라면 버튼 보이기
        if (this.isLeader) {
            this.showStartButton();
        }

        // 플레이어 목록 갱신
        this.updatePlayerList();
        
        // ### 이벤트 리스너 설정 ###
        // 새 플레이어 들어옴
        client.on('newplayer', () => {
            this.updatePlayerList();
        });

        // 플레이어 퇴장
        client.on('remove', () => {
            this.updatePlayerList();
        });

        // 4명 꽉 찼을 때
        client.on('room_ready', (data: { leader?: string }) => {
            // 보통 서버에서 emit('room_ready', { leader: 방장 id }) 형태로 보낸다고 가정
            this.updatePlayerList();
            if (data?.leader) {
                this.isLeader = (data.leader === client.id);
                if (this.isLeader) {
                    this.showStartButton();
                } else {
                    this.hideStartButton();
                }
            }
        });

        // 새 방장 발생(new_leader)
        client.on('new_leader', (data: { leader: string }) => {
            if (data.leader === client.id) {
                this.isLeader = true;
                this.showStartButton();
            } else {
                this.isLeader = false;
                this.hideStartButton();
            }
        });

        // 실제 게임 시작
        client.on('startgame', (playersInRoom) => {
            console.log('Received player data:', playersInRoom);
            const playerData = playersInRoom.find(player => player.id === client.id); // 자신의 데이터 추출
            this.scene.start('Game', {
            map: this.map,
            playerIndex: playerData.playerIndex // 자신의 플레이어 인덱스 설정
            });
            // // 실제 게임 씬으로 넘어가기
            // this.scene.start('Game', { map: this.map });
        });

        // ★ yourId 이벤트는 "소켓 ID 알림" 용도로만 쓸 것이면 아래처럼 단순 로그로 처리
        client.on('yourId', (id: string) => {
            console.log('My socket ID is:', id);
            // 더 이상 여기서 방장 여부를 세팅하지 않는다!
        });
    }

    updatePlayerList() {
        client.emit('getplayersinroom', { roomName: this.roomName });
        client.once('playersinroom', (players: { id: string, nickname: string }[]) => {
            let playerNames = '플레이어 목록:\n';
            players.forEach(player => {
                playerNames += `${player.nickname}\n`;
            });
            this.playersListText.setText(playerNames);
            console.log('[updatePlayerList]updatde_player:',players)
        });
    }

    showStartButton() {
        if (this.startButton) {
            this.startButton.setVisible(true);
        }
    }

    hideStartButton() {
        if (this.startButton) {
            this.startButton.setVisible(false);
        }
    }

    startGame() {
        // 방장만 게임을 시작할 수 있도록 서버에 알림
        client.emit('startgame', { roomName: this.roomName });
    }

    shutdown() {
        // 리스너 해제
        client.off('newplayer');
        client.off('remove');
        client.off('room_ready');
        client.off('new_leader');
        client.off('startgame');
        client.off('yourId');
        client.off('playersinroom'); 
        // (필요에 따라 이벤트명을 정확히 구분/정리)
    }
}