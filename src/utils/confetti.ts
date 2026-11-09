import confetti from 'canvas-confetti';

export const safeConfetti = (options?: confetti.Options): void => {
  try {
    const fn = typeof confetti === 'function' ? confetti : (confetti as any)?.default;
    if (typeof fn === 'function') {
      fn(options);
    }
  } catch (err) {
    console.warn('Confetti execution skipped safely:', err);
  }
};
