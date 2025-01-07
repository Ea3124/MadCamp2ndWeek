<!-- +page.svelte -->
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import type { Scene } from "phaser";
    import PhaserGame, { type TPhaserRef } from "../game/PhaserGame.svelte";
    import { EventBus } from '../game/EventBus';

    let canMoveSprite = false;
    let phaserRef: TPhaserRef = { game: null, scene: null };

    // State for password popup
    let showPasswordPopup = false;
    let selectedRoomName: string = '';
    let password: string = '';

    const currentScene = (scene: Scene) => {
        canMoveSprite = (scene.scene.key !== "MainMenu");
    }

    // Function to handle showing the password popup
    const handleShowPasswordPopup = (data: { roomName: string }) => {
        selectedRoomName = data.roomName;
        showPasswordPopup = true;
        password = '';
    }

    // Function to handle password submission
    const submitPassword = () => {
        if (password.trim() === '') {
            alert('비밀번호를 입력해주세요.');
            return;
        }
        // Emit the password to Phaser
        EventBus.emit('password-submitted', { roomName: selectedRoomName, password });
        showPasswordPopup = false;
    }

    // Listen for 'show-password-popup' event
    onMount(() => {
        EventBus.on('show-password-popup', handleShowPasswordPopup);
    });

    // Clean up event listener
    onDestroy(() => {
        EventBus.off('show-password-popup', handleShowPasswordPopup);
    });
</script>

<div id="app">
    <PhaserGame bind:phaserRef={phaserRef} currentActiveScene={currentScene} />
    
    <!-- Password Popup -->
    {#if showPasswordPopup}
        <div class="popup-overlay">
            <div class="popup">
                <h2>방 비밀번호 입력</h2>
                <input 
                    type="password" 
                    bind:value={password} 
                    placeholder="방 비밀번호 입력" 
                    on:keydown={(e) => { if (e.key === 'Enter') submitPassword(); }}
                />
                <div class="buttons">
                    <button on:click={submitPassword}>확인</button>
                    <button on:click={() => showPasswordPopup = false}>취소</button>
                </div>
            </div>
        </div>
    {/if}

    <div style="font-family:font1; position:absolute; left:-1000px; visibility:hidden;">.</div>
</div>

<style>
    #app {
        width: 100%;
        height: 100vh;
        overflow: hidden;
        position: relative; /* Overlay를 위한 부모 요소 상대 위치 설정 */
        display: flex;
        justify-content: center; /* 가로 방향 중앙 정렬 */
        align-items: center; /* 세로 방향 중앙 정렬 */
    }

    /* Popup Overlay */
    .popup-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10;
    }

    /* Popup Box */
    .popup {
        background: (255, 255, 255, 0.1);
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        width: 300px;
    }

    .popup h2 {
        margin-bottom: 15px;
        color: #ffffff;
    }

    .popup input {
        width: 100%;
        padding: 10px;
        margin-bottom: 15px;
        border: none;
        border-radius: 4px;
        font-size: 16px;
    }

    .popup .buttons {
        display: flex;
        justify-content: space-between;
    }

    .popup button {
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        background: #FF000000;
        /* font-family:''; */
        color: #FFFFFF;
        font-size: 16px;
        cursor: pointer;
    }

    .popup button:hover {
        background: (255, 255, 255, 0.3);
    }
</style>
