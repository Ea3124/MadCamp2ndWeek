<script lang="ts">
    import type { Scene } from "phaser";
    import type { MainMenu } from "../game/scenes/MainMenu";
    import PhaserGame, { type TPhaserRef } from "../game/PhaserGame.svelte";
    import type { client } from "../game/socket";
    import { onMount, onDestroy } from 'svelte';
    import { EventBus } from '../game/EventBus'; // EventBus 임포트
    import type { Intro } from '../game/scenes/Intro';

    let canMoveSprite = false;
    let phaserRef: TPhaserRef = { game: null, scene: null };
    const spritePosition = { x: 0, y: 0 };
    let nickname: string = '';
    let showNicknameInput: boolean = false; // 닉네임 입력 필드 표시 여부
    let currentAction: 'join' | 'create' | null = null; // 현재 액션


    const currentScene = (scene: Scene) => {
        canMoveSprite = (scene.scene.key !== "MainMenu");
    }

     // 닉네임 제출 핸들러
    const setNicknameInPhaser = () => {
        if (!currentAction) {
            alert('액션을 선택하세요!');
            return;
        }

        const trimmedNickname = nickname.trim();
        if (trimmedNickname === "") {
            alert('닉네임을 입력하세요!');
            return;
        }

        const scene = phaserRef.scene as Intro;
        if (scene) {
            scene.setNickname(trimmedNickname, currentAction);
            showNicknameInput = false; // 닉네임 입력 창 숨기기
            nickname = ''; // 입력 필드 초기화
            currentAction = null; // 액션 초기화
        } else {
            alert('게임 씬을 찾을 수 없습니다.');
        }
    }

    // Phaser에서 버튼 클릭 시 이벤트 수신
    const handleActionButtonClicked = (action: string) => {
        if (action === 'join' || action === 'create') {
            currentAction = action;
            showNicknameInput = true;
        }
    }

    // 이벤트 리스너 등록
    onMount(() => {
        EventBus.on('action-button-clicked', handleActionButtonClicked);
    });

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    onDestroy(() => {
        EventBus.off('action-button-clicked', handleActionButtonClicked);
    });

</script>

<div id="app">
    <PhaserGame bind:phaserRef={phaserRef} currentActiveScene={currentScene} />
    
    {#if showNicknameInput}
    <div class="overlay">
        <div class="nickname-container">
            <h2>{currentAction === 'join' ? '게임 참여' : '게임 생성'}을 위한 닉네임 입력</h2>
            <input 
                type="text" 
                bind:value={nickname} 
                placeholder="Enter your nickname" 
                class="nickname-input"
                on:keydown={(e) => { if (e.key === 'Enter') setNicknameInPhaser() }}
            />
            <button class="button" on:click={setNicknameInPhaser}>Submit</button>
        </div>
    </div>
    {/if}

</div>

<style>
    #app {
        width: 100%;
        height: 100vh;
        overflow: hidden;
        position: relative; /* Overlay를 위한 부모 요소 상대 위치 설정 */
    }

    .controls {
        position: absolute;
        top: 20px;
        left: 20px;
        z-index: 10; /* Overlay보다 위에 표시 */
        display: flex;
        flex-direction: column;
    }

    .spritePosition {
        margin: 10px 0 0 10px;
        font-size: 0.8em;
    }

    .button {
        width: 140px;
        margin: 10px;
        padding: 10px;
        background-color: #000000;
        color: rgba(255, 255, 255, 0.87);
        border: 1px solid rgba(255, 255, 255, 0.87);
        cursor: pointer;
        transition: all 0.3s;
    
        &:hover {
            border: 1px solid #0ec3c9;
            color: #0ec3c9;
        }
    
        &:active {
            background-color: #0ec3c9;
        }
    
        /* Disabled styles */
        &:disabled {
            cursor: not-allowed;
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: rgba(255, 255, 255, 0.3);
        }
    }

    /* Overlay 스타일 */
    .overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5); /* 반투명 배경 */
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100; /* Phaser 게임보다 위에 표시 */
    }

    .nickname-container {
        background: white;
        padding: 30px;
        border-radius: 8px;
        text-align: center;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .nickname-container h2 {
        margin-bottom: 20px;
        font-size: 24px;
        color: #333;
    }

    .nickname-input {
        font-size: 18px;
        padding: 10px;
        width: 100%;
        margin-bottom: 20px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    /* 추가적인 스타일 */
</style>
