import { useMotionValue, useSpring, useAnimationFrame } from "framer-motion";
import { useRef, useState, useEffect } from "react";

export default function useShakeAndBounceAnimation(nudgeText, openingMessage) {
  const sharedX = useMotionValue(0);
  const sharedY = useMotionValue(0);
  const startTime = useRef(performance.now());
  const bounceStartTime = useRef(performance.now());
  const [isShaking, setIsShaking] = useState(true);

  const springX = useSpring(sharedX, { stiffness: 150, damping: 15 });
  const springY = useSpring(sharedY, { stiffness: 150, damping: 15 });

  useEffect(() => {
    if (nudgeText === openingMessage) {
      sharedX.set(0);
      sharedY.set(0);
      setIsShaking(false);
      return;
    }

    const shakeDuration = 2000; 
    const shakeAmplitudeX = 5; // px left/right
    const shakeAmplitudeY = 5; // px up/down for arc
    const shakeFrequency = 2; // Number of shake cycles

    let start = performance.now();

    const animateShake = (t) => {
      const elapsed = t - start;
      const progress = Math.min(elapsed / shakeDuration, 1);

      // Sinusoidal X motion for left-right shake
      const x =
        Math.sin(progress * shakeFrequency * 2 * Math.PI) *
        shakeAmplitudeX *
        (1 - progress);

      // Sinusoidal Y motion for arc-like curve, offset to create wave
      const y =
        Math.cos(progress * shakeFrequency * 2 * Math.PI) *
        shakeAmplitudeY *
        (1 - progress);

      sharedX.set(x);
      sharedY.set(y);

      if (progress >= 1) {
        setIsShaking(false);
        bounceStartTime.current = performance.now(); // Start bounce timer
      }

      return elapsed;
    };

    // Run shake animation
    let frameId;
    const run = (t) => {
      const elapsed = animateShake(t);
      if (isShaking && elapsed < shakeDuration) {
        frameId = requestAnimationFrame(run);
      }
    };
    frameId = requestAnimationFrame(run);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [sharedX, sharedY, isShaking, nudgeText, openingMessage]);

  useAnimationFrame((t) => {
    if (nudgeText === openingMessage || isShaking) {
      return;
    }

    const elapsed = (t - bounceStartTime.current) / 1000; // Time since bounce started
    const bounceDuration = 1; // 2 seconds
    if (elapsed < bounceDuration) {
      const progress = elapsed / bounceDuration;
      const amplitude = 10 * (1 - progress); // Linearly reduce amplitude
      const period = 2;
      const y = Math.sin((elapsed / period) * 2 * Math.PI) * amplitude;
      sharedY.set(y);
    } else {
      sharedY.set(0); // Ensure Y is reset to 0 when bounce stops
    }
  });

  // Reset isShaking and times when nudgeText changes
  useEffect(() => {
    setIsShaking(true);
    startTime.current = performance.now();
    bounceStartTime.current = performance.now();
  }, [nudgeText]);

  // Ensure no motion when nudgeText equals openingMessage
  useEffect(() => {
    if (nudgeText === openingMessage) {
      sharedX.set(0);
      sharedY.set(0);
      setIsShaking(false);
    }
  }, [nudgeText, openingMessage]);

  return { x: springX, y: springY };
}
