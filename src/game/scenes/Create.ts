// src/scenes/Create.ts

import { Scene, GameObjects, Input } from 'phaser';
import { client } from '../socket'; // socket.ts에서 import
import { EventBus } from '../EventBus';

export class Create extends Scene {
    background: GameObjects.Image;
    title: GameObjects.Text;
    roomNameText: GameObjects.Text;
    roomNameInput: HTMLInputElement;
    mapText: GameObjects.Text;
    mapDropdown: HTMLSelectElement;
    passwordText: GameObjects.Text;
    passwordInput: HTMLInputElement;
    createButton: GameObjects.Image;

    constructor() {
        super('Create');
    }

    create() {
        // 배경
        this.background = this.add.image(512, 384, 'background');

        // 제목
        this.title = this.add.text(512, 100, '방 생성', {
            fontFamily: 'Arial Black', fontSize: 48, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        // 방 이름 입력
        this.roomNameText = this.add.text(200, 200, '방 이름:', {
            fontFamily: 'Arial', fontSize: 24, color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.roomNameInput = document.createElement('input');
        this.roomNameInput.type = 'text';
        this.roomNameInput.placeholder = '방 이름 입력';
        this.roomNameInput.style.position = 'absolute';
        this.roomNameInput.style.top = '180px';
        this.roomNameInput.style.left = '300px';
        this.roomNameInput.style.width = '400px';
        this.roomNameInput.style.padding = '10px';
        this.roomNameInput.style.fontSize = '16px';
        document.body.appendChild(this.roomNameInput);

        // 맵 선택
        this.mapText = this.add.text(200, 300, '맵 선택:', {
            fontFamily: 'Arial', fontSize: 24, color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.mapDropdown = document.createElement('select');
        this.mapDropdown.style.position = 'absolute';
        this.mapDropdown.style.top = '280px';
        this.mapDropdown.style.left = '300px';
        this.mapDropdown.style.width = '400px';
        this.mapDropdown.style.padding = '10px';
        this.mapDropdown.style.fontSize = '16px';

        // 사용 가능한 맵 목록 (실제 맵 이름으로 대체)
        const maps = ['Map1', 'Map2', 'Map3']; // 실제 맵 이름으로 변경 필요
        maps.forEach(map => {
            const option = document.createElement('option');
            option.value = map;
            option.text = map;
            this.mapDropdown.appendChild(option);
        });
        document.body.appendChild(this.mapDropdown);

        // 비밀번호 입력 (선택사항)
        this.passwordText = this.add.text(200, 400, '비밀번호 (선택):', {
            fontFamily: 'Arial', fontSize: 24, color: '#ffffff'
        }).setOrigin(0, 0.5);

        this.passwordInput = document.createElement('input');
        this.passwordInput.type = 'password';
        this.passwordInput.placeholder = '비밀번호 입력 (선택)';
        this.passwordInput.style.position = 'absolute';
        this.passwordInput.style.top = '380px';
        this.passwordInput.style.left = '300px';
        this.passwordInput.style.width = '400px';
        this.passwordInput.style.padding = '10px';
        this.passwordInput.style.fontSize = '16px';
        document.body.appendChild(this.passwordInput);

        // 방 생성 버튼
        this.createButton = this.add.image(512, 500, 'createButton').setInteractive();
        this.createButton.on('pointerdown', () => {
            this.createRoom();
        });

        // 방 생성 응답 수신
        client.on('createroom_response', (data: { success: boolean, message?: string, roomName?: string }) => {
            if (data.success) {
                // 게임 씬으로 전환하면서 선택된 맵 정보 전달
                const selectedMap = this.mapDropdown.value;
                this.scene.start('Game', { map: selectedMap });
            } else {
                alert(`방 생성 실패: ${data.message}`);
            }
        });

        EventBus.emit('current-scene-ready', this);
    }

    createRoom() {
        const roomName = this.roomNameInput.value.trim();
        const map = this.mapDropdown.value;
        const password = this.passwordInput.value.trim();

        if (!roomName) {
            alert('방 이름을 입력해주세요.');
            return;
        }

        // 방 생성 요청 전송
        client.emit('createroom', { roomName, map, password: password || null });
    }

    shutdown() {
        // 씬 종료 시 이벤트 리스너 제거
        client.off('createroom_response');
    }
}
