<script context="module" lang="ts">
    import type { Game, Scene } from 'phaser';

    // Svelte 부모 컴포넌트 등에서 "phaserRef"에 접근할 때 쓰는 타입
    export type TPhaserRef = {
        game: Game | null,
        scene: Scene | null
    };
</script>

<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import StartGame from "./main";         // main.ts에서 export default한 함수
    import { EventBus } from './EventBus';  

    // MMO Socket.io를 쓴다면 아래 주석 해제
    import { client } from './socket';  

    // 부모로부터 받는 props
    export let phaserRef: TPhaserRef = {
        game: null,
        scene: null
    };

    // Scene이 새로 활성화될 때 호출할 콜백 (부모 컴포넌트에서 넘겨줄 수 있음)
    export let currentActiveScene: ((scene: Scene) => void) | undefined;

    let eventHandler: (sceneInstance: Scene) => void; 
    // EventBus.on / off 를 위해, 핸들러 레퍼런스를 저장

    onMount(() => {
        // 1) Phaser 게임 인스턴스 생성
        //    main.ts 의 StartGame 함수에 parent DOM id를 넘겨준다.
        phaserRef.game = StartGame("game-container");

        // 2) 'current-scene-ready' 이벤트에 반응할 핸들러를 준비
        eventHandler = (sceneInstance: Scene) => {
            // phaserRef.scene 에 현재 Scene 할당
            phaserRef.scene = sceneInstance;

            // 부모에서 currentActiveScene을 넘겼다면, 거기에도 알림
            if (currentActiveScene) {
                currentActiveScene(sceneInstance);
            }
        };

        // EventBus에서 'current-scene-ready'가 emit 되면 이 핸들러 실행
        EventBus.on('current-scene-ready', eventHandler);
    });

    onDestroy(() => {
        // 3) 컴포넌트가 언마운트되면, EventBus 리스너 정리
        EventBus.off('current-scene-ready', eventHandler);

        // 게임 인스턴스를 제거하려면 아래 코드 사용.
        // (라우팅 상황에 따라, 혹은 필요에 따라 파괴하지 않을 수도 있음)
        if (phaserRef.game) {
            phaserRef.game.destroy(true);
            phaserRef.game = null;
        }
        phaserRef.scene = null;
    });
</script>

<!-- Phaser 게임이 그려질 DOM 컨테이너 -->
<div id="game-container" style="width:1024px; height:768px; margin:0 auto;"></div>
