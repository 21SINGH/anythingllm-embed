import { useMotionValue, useSpring, useAnimationFrame } from "framer-motion";
import { useRef, useEffect } from "react";

export default function useShakeAndBounceAnimation(nudgeText, openingMessage) {
  const sharedY = useMotionValue(0);
  const bounceStartTime = useRef(performance.now());

  const springY = useSpring(sharedY, { stiffness: 300, damping: 15 });

  // Bounce animation (up and down) for 1 second, two cycles
  useAnimationFrame((t) => {
    if (nudgeText === openingMessage) {
      sharedY.set(0);
      return;
    }

    const elapsed = (t - bounceStartTime.current) / 1000; // Time since bounce started
    const bounceDuration = 0.5; // 1 second for two cycles
    if (elapsed < bounceDuration) {
      const progress = elapsed / bounceDuration;
      const amplitude = 20 * (1 - progress); // Amplitude for ±30px movement
      const period = 0.5; // 0.5s per cycle, two cycles in 1s
      const y = Math.sin((elapsed / period) * 2 * Math.PI) * amplitude;
      sharedY.set(y);
    } else {
      sharedY.set(0); // Reset Y to 0 when bounce stops
    }
  });

  // Reset bounceStartTime when nudgeText changes
  useEffect(() => {
    if (nudgeText !== openingMessage) {
      bounceStartTime.current = performance.now();
    }
  }, [nudgeText]);

  // Ensure no motion when nudgeText equals openingMessage
  useEffect(() => {
    if (nudgeText === openingMessage) {
      sharedY.set(0);
    }
  }, [nudgeText, openingMessage]);

  return { y: springY };
}
