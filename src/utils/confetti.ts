import type confettiTypes from 'canvas-confetti';

export const safeConfetti = (options?: confettiTypes.Options): void => {
  void import('canvas-confetti')
    .then((mod) => {
      const fn = typeof mod.default === 'function' ? mod.default : (mod as any);
      if (typeof fn === 'function') {
        fn(options);
      }
    })
    .catch((err) => {
      console.warn('Confetti execution skipped safely:', err);
    });
};
