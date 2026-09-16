import React from 'react';

interface BarcodeVisualProps {
  value: string;
  className?: string;
  showText?: boolean;
  height?: number;
}

export const BarcodeVisual: React.FC<BarcodeVisualProps> = ({
  value,
  className = '',
  showText = true,
  height = 48,
}) => {
  // Generate deterministic bar widths based on the value's characters
  const generateBars = (code: string) => {
    const bars: Array<{ width: number; isBlack: boolean }> = [];
    // Start guard
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 1, isBlack: false });
    bars.push({ width: 2, isBlack: true });

    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = (hash * 31 + code.charCodeAt(i)) % 10007;
      const charCode = code.charCodeAt(i);
      const w1 = 1 + (charCode % 3);
      const w2 = 1 + ((charCode >> 1) % 2);
      const w3 = 1 + ((charCode >> 2) % 3);
      bars.push({ width: 1, isBlack: false });
      bars.push({ width: w1, isBlack: true });
      bars.push({ width: w2, isBlack: false });
      bars.push({ width: w3, isBlack: true });
    }

    // Center guard
    bars.push({ width: 1, isBlack: false });
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 1, isBlack: false });
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 1, isBlack: false });

    // Middle/end patterns
    for (let i = code.length - 1; i >= 0; i--) {
      const charCode = code.charCodeAt(i);
      const w1 = 1 + ((charCode + hash) % 3);
      const w2 = 1 + (((charCode + hash) >> 1) % 2);
      bars.push({ width: w1, isBlack: true });
      bars.push({ width: w2, isBlack: false });
    }

    // Stop guard
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 1, isBlack: false });
    bars.push({ width: 2, isBlack: true });

    return bars;
  };

  const bars = generateBars(value || '000000000000');
  const totalWidth = bars.reduce((sum, b) => sum + b.width, 0);

  let currentX = 0;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full max-w-[220px] h-auto bg-white p-1 rounded border border-slate-200 shadow-2xs"
        style={{ height: `${height}px` }}
      >
        {bars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width;
          if (!bar.isBlack) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={0}
              width={bar.width}
              height={height}
              fill="#0f172a"
            />
          );
        })}
      </svg>
      {showText && (
        <span className="font-mono text-[11px] font-bold tracking-widest text-slate-700 mt-1">
          {value}
        </span>
      )}
    </div>
  );
};
