<script lang="ts">
    import type { Scene } from "phaser";
    import PhaserGame, { type TPhaserRef } from "../game/PhaserGame.svelte";

    let canMoveSprite = false;
    let phaserRef: TPhaserRef = { game: null, scene: null };

    const currentScene = (scene: Scene) => {
        canMoveSprite = (scene.scene.key !== "MainMenu");
    }

</script>

<div id="app">
    <PhaserGame bind:phaserRef={phaserRef} currentActiveScene={currentScene} />
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
</style>