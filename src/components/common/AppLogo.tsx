import React from 'react';
import { usePos } from '../../context/PosContext';

export interface AppLogoProps {
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
  onClick?: () => void;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  theme = 'dark',
  size = 'md',
  className = '',
  showText = true,
  onClick,
}) => {
  const { platformLogo } = usePos();

  const iconSizes = {
    sm: 'w-7 h-7 text-xs rounded-lg',
    md: 'w-9 h-9 text-sm rounded-xl',
    lg: 'w-10 h-10 text-base rounded-2xl',
  };

  const imgSizes = {
    sm: 'h-6 max-h-7 max-w-[120px]',
    md: 'h-8 max-h-9 max-w-[150px]',
    lg: 'h-9 max-h-10 max-w-[180px]',
  };

  const textSizes = {
    sm: 'text-sm font-black',
    md: 'text-base sm:text-lg font-black',
    lg: 'text-lg sm:text-xl font-black',
  };

  const textColor = theme === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 sm:gap-3 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {platformLogo ? (
        <img
          src={platformLogo}
          alt="SokoPoS Platform Logo"
          className={`${imgSizes[size]} object-contain drop-shadow-sm`}
        />
      ) : (
        <div
          className={`${iconSizes[size]} bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-md shadow-blue-500/20 shrink-0`}
        >
          S
        </div>
      )}
      {showText && (
        <span className={`${textSizes[size]} tracking-tight ${textColor}`}>
          SokoPoS
        </span>
      )}
    </div>
  );
};
