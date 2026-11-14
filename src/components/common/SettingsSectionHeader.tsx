import React from 'react';

interface SettingsSectionHeaderProps {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({
  title,
  description,
  meta,
  actions,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800 ${className}`}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          {meta && (
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 tabular-nums">
              {meta}
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  );
};
