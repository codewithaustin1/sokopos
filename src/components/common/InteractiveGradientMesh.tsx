import React, { useEffect, useRef } from 'react';

export const InteractiveGradientMesh: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const blob1Ref = useRef<HTMLDivElement>(null);
  const blob2Ref = useRef<HTMLDivElement>(null);
  const blob3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    let animationFrameId: number;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const updateMesh = () => {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

      if (blob1Ref.current) {
        const x1 = (currentX / window.innerWidth) * 40 - 20;
        const y1 = (currentY / window.innerHeight) * 40 - 20;
        blob1Ref.current.style.transform = `translate(${x1}px, ${y1}px) scale(1.1)`;
      }
      if (blob2Ref.current) {
        const x2 = (currentX / window.innerWidth) * -30 + 15;
        const y2 = (currentY / window.innerHeight) * -30 + 15;
        blob2Ref.current.style.transform = `translate(${x2}px, ${y2}px) scale(1.05)`;
      }
      if (blob3Ref.current) {
        const x3 = (currentX / window.innerWidth) * 20 - 10;
        const y3 = (currentY / window.innerHeight) * -25 + 12;
        blob3Ref.current.style.transform = `translate(${x3}px, ${y3}px) scale(1.15)`;
      }

      animationFrameId = requestAnimationFrame(updateMesh);
    };

    animationFrameId = requestAnimationFrame(updateMesh);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-60 dark:opacity-75 transition-opacity duration-700"
    >
      {/* Floating Blob 1: Vibrant Cobalt / Blue */}
      <div
        ref={blob1Ref}
        className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tr from-blue-600/10 via-indigo-500/10 to-transparent blur-[140px] will-change-transform transition-transform duration-200 ease-out animate-pulse"
        style={{ animationDuration: '8s' }}
      />

      {/* Floating Blob 2: Emerald / Teal Accent */}
      <div
        ref={blob2Ref}
        className="absolute top-[35%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-emerald-500/10 via-teal-500/10 to-transparent blur-[150px] will-change-transform transition-transform duration-200 ease-out"
      />

      {/* Floating Blob 3: Deep Indigo / Violet Base */}
      <div
        ref={blob3Ref}
        className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-r from-indigo-600/10 via-blue-700/10 to-transparent blur-[160px] will-change-transform transition-transform duration-200 ease-out"
      />
    </div>
  );
};
