import React from 'react';

interface PricingFeatureTextProps {
  text: string;
  className?: string;
  metricClassName?: string;
}

const METRIC_HIGHLIGHT_REGEX =
  /(Ksh\s+[\d,]+(?:\/mo)?|58mm\s*&\s*80mm|24\/7|1-time|1-on-1|\b\d+(?:,\d{3})*\+?|\bUnlimited\b|\bKRA\s+VAT\b|\bRBAC\b)/gi;

export const PricingFeatureText: React.FC<PricingFeatureTextProps> = ({
  text,
  className = '',
  metricClassName = 'font-bold tabular-nums',
}) => {
  const parts = text.split(METRIC_HIGHLIGHT_REGEX);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (!part) return null;
        if (idx % 2 === 1) {
          return (
            <strong key={idx} className={metricClassName}>
              {part}
            </strong>
          );
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </span>
  );
};
