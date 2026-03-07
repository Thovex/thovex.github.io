import { useEffect, useRef } from 'react';
import { useGameStore } from '../game/store';

export function useGameLoop() {
  const tick = useGameStore((s) => s.tick);
  const checkAchievements = useGameStore((s) => s.checkAchievements);
  const checkExpeditionCompletion = useGameStore((s) => s.checkExpeditionCompletion);
  const lastTime = useRef(0);
  const achievementTimer = useRef(0);

  useEffect(() => {
    lastTime.current = performance.now();
    let raf: number;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime.current) / 1000, 0.1);
      lastTime.current = now;
      tick(dt);

      // Check achievements every ~3 seconds
      achievementTimer.current += dt;
      if (achievementTimer.current >= 3) {
        achievementTimer.current = 0;
        checkAchievements();
        checkExpeditionCompletion();
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick, checkAchievements, checkExpeditionCompletion]);
}
