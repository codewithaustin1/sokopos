import React from 'react';

interface AnalyticsIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * Analytics icon matching the user-specified design:
 * Bar chart with upward trending zigzag arrow line.
 */
export const AnalyticsIcon: React.FC<AnalyticsIconProps> = ({
  className = 'w-4 h-4',
  size,
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Chart column bars */}
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      
      {/* Upward zigzag growth trendline */}
      <polyline points="3 15 8 10 13 13 21 5" />
      
      {/* Trendline arrowhead pointing top-right */}
      <polyline points="16 5 21 5 21 10" />
    </svg>
  );
};

export default AnalyticsIcon;
