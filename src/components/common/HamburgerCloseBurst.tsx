import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface HamburgerCloseBurstProps {
  isOpen: boolean;
}

interface SparkParticle {
  tx: string;
  ty: string;
  rot: string;
  color: string;
  size: string;
  delay: string;
  dur: string;
  isStar?: boolean;
}

interface SmokeParticle {
  sx: string;
  sy: string;
  scale: string;
  size: string;
  delay: string;
  dur: string;
}

const SPARK_COLORS = [
  'bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.9)]',
  'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]',
  'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.85)]',
  'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)]',
  'bg-orange-300 shadow-[0_0_10px_rgba(253,186,116,0.85)]',
  'bg-yellow-200 shadow-[0_0_12px_rgba(254,240,138,0.95)]',
];

function generateViewportParticles(originX: number, originY: number): {
  sparks: SparkParticle[];
  smoke: SmokeParticle[];
} {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
  const maxRadius = Math.max(vw, vh) * 0.72;

  const sparks: SparkParticle[] = Array.from({ length: 22 }, (_, i) => {
    const baseAngle = (i / 22) * Math.PI * 2;
    const angle = baseAngle + (Math.random() - 0.5) * 0.35;
    const distance = 70 + Math.random() * maxRadius;
    const rawTx = Math.cos(angle) * distance;
    const rawTy = Math.sin(angle) * distance;

    // Keep scatter within viewport bounds with slight margin
    const clampedTx = Math.max(-originX + 12, Math.min(vw - originX - 12, rawTx));
    const clampedTy = Math.max(-originY + 12, Math.min(vh - originY - 12, rawTy));

    return {
      tx: `${Math.round(clampedTx)}px`,
      ty: `${Math.round(clampedTy)}px`,
      rot: `${Math.round((Math.random() - 0.5) * 320)}deg`,
      color: SPARK_COLORS[i % SPARK_COLORS.length],
      size: i % 3 === 0 ? 'w-2 h-2' : i % 2 === 0 ? 'w-1.5 h-1.5' : 'w-1 h-1',
      delay: `${Math.round(Math.random() * 140)}ms`,
      dur: `${950 + Math.round(Math.random() * 450)}ms`,
      isStar: i % 4 === 0,
    };
  });

  const smoke: SmokeParticle[] = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const distance = 45 + Math.random() * (maxRadius * 0.35);
    return {
      sx: `${Math.round(Math.cos(angle) * distance)}px`,
      sy: `${Math.round(Math.sin(angle) * distance)}px`,
      scale: (1.8 + Math.random() * 1.4).toFixed(2),
      size: i % 2 === 0 ? 'w-6 h-6' : 'w-5 h-5',
      delay: `${Math.round(Math.random() * 110)}ms`,
      dur: `${1100 + Math.round(Math.random() * 380)}ms`,
    };
  });

  return { sparks, smoke };
}

export const HamburgerCloseBurst: React.FC<HamburgerCloseBurstProps> = ({ isOpen }) => {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const prevOpenRef = useRef(isOpen);
  const [burstState, setBurstState] = useState<{
    key: number;
    x: number;
    y: number;
    sparks: SparkParticle[];
    smoke: SmokeParticle[];
  } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (prevOpenRef.current && !isOpen) {
      const rect = anchorRef.current?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect ? rect.top + rect.height / 2 : 32;
      const { sparks, smoke } = generateViewportParticles(x, y);

      setBurstState({
        key: Date.now(),
        x,
        y,
        sparks,
        smoke,
      });

      timer = setTimeout(() => {
        setBurstState(null);
      }, 1550);
    }

    prevOpenRef.current = isOpen;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen]);

  return (
    <>
      <span ref={anchorRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
      {burstState &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            key={burstState.key}
            aria-hidden="true"
            className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
          >
            {/* Smoke Wisps */}
            {burstState.smoke.map((puff, idx) => (
              <span
                key={`smoke-${idx}`}
                style={
                  {
                    left: `${burstState.x}px`,
                    top: `${burstState.y}px`,
                    '--sx': puff.sx,
                    '--sy': puff.sy,
                    '--s-scale': puff.scale,
                    '--dur': puff.dur,
                    animationDelay: puff.delay,
                  } as React.CSSProperties
                }
                className={`fixed rounded-full bg-slate-300/65 blur-[6px] animate-hamburger-smoke ${puff.size}`}
              />
            ))}

            {/* Smooth Viewport-Scattering Sparks */}
            {burstState.sparks.map((spark, idx) => (
              <span
                key={`spark-${idx}`}
                style={
                  {
                    left: `${burstState.x}px`,
                    top: `${burstState.y}px`,
                    '--tx': spark.tx,
                    '--ty': spark.ty,
                    '--rot': spark.rot,
                    '--dur': spark.dur,
                    animationDelay: spark.delay,
                  } as React.CSSProperties
                }
                className={`fixed animate-hamburger-spark ${
                  spark.isStar ? 'rounded-[2px] rotate-45' : 'rounded-full'
                } ${spark.size} ${spark.color}`}
              />
            ))}
          </div>,
          document.body
        )}
    </>
  );
};
