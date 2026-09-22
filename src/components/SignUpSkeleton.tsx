import React from 'react';

interface SignUpSkeletonProps {
  theme?: 'dark' | 'light';
  mode?: 'signup' | 'terminal' | 'google';
  variant?: 'card' | 'form-only';
  message?: string;
  fieldsCount?: number;
}

export const SignUpSkeleton: React.FC<SignUpSkeletonProps> = ({
  theme = 'dark',
  mode = 'signup',
  variant = 'card',
  message,
  fieldsCount = 3,
}) => {
  const isDark = theme === 'dark';
  const shimmerClass = isDark ? 'skeleton-shimmer-dark' : 'skeleton-shimmer-light';
  const baseBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200';

  const formFields = (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Informative Prompt Shimmer Bar */}
      <div className={`h-3 w-4/5 rounded-md mb-3 ${shimmerClass} opacity-70`} />

      {/* Input Field 1: Store / Business Name */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className={`h-3.5 w-36 rounded-md ${shimmerClass}`} />
          <div className={`h-2.5 w-12 rounded ${shimmerClass} opacity-40`} />
        </div>
        <div
          className={`w-full h-10.5 rounded-xl border ${inputBg} ${shimmerClass} flex items-center px-3.5`}
        >
          <div className={`h-3 w-44 rounded ${shimmerClass} opacity-30`} />
        </div>
      </div>

      {/* Input Field 2: Owner Email */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className={`h-3.5 w-48 rounded-md ${shimmerClass}`} />
          <div className={`h-2.5 w-12 rounded ${shimmerClass} opacity-40`} />
        </div>
        <div
          className={`w-full h-10.5 rounded-xl border ${inputBg} ${shimmerClass} flex items-center px-3.5`}
        >
          <div className={`h-3 w-52 rounded ${shimmerClass} opacity-30`} />
        </div>
      </div>

      {/* Input Field 3: Owner Full Name */}
      {fieldsCount >= 3 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className={`h-3.5 w-32 rounded-md ${shimmerClass}`} />
            <div className={`h-2.5 w-16 rounded ${shimmerClass} opacity-30`} />
          </div>
          <div
            className={`w-full h-10.5 rounded-xl border ${inputBg} ${shimmerClass} flex items-center px-3.5`}
          >
            <div className={`h-3 w-36 rounded ${shimmerClass} opacity-30`} />
          </div>
        </div>
      )}

      {/* Action CTA Button Shimmer */}
      <div className="pt-2">
        <div
          className={`w-full h-11 rounded-xl ${shimmerClass} shadow-md flex items-center justify-center gap-2.5 border ${
            isDark ? 'border-blue-900/40 bg-blue-950/40' : 'border-blue-200 bg-blue-50/50'
          }`}
        >
          <div className={`w-4 h-4 rounded-md ${shimmerClass} opacity-80`} />
          <div className={`h-3.5 w-48 rounded-md ${shimmerClass} opacity-90`} />
        </div>
      </div>

      {/* Status Notice / Mental Model Hint */}
      {message ? (
        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
          <p className="text-center text-xs font-semibold text-blue-400">
            {message}
          </p>
        </div>
      ) : (
        <div className={`h-2.5 w-48 mx-auto rounded-md mt-2 ${shimmerClass} opacity-40`} />
      )}
    </div>
  );

  if (variant === 'form-only') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading sign-up form"
        className="p-6 sm:p-8"
      >
        {formFields}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading sign-up form"
      className={`w-full max-w-xl ${baseBg} border rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-300 animate-in fade-in duration-300`}
    >
      {/* Skeleton Header */}
      <div
        className={`p-6 sm:p-8 pb-5 text-center border-b ${
          isDark ? 'border-slate-800/70' : 'border-slate-100'
        }`}
      >
        {/* Brand / Lock Icon Placeholder */}
        <div
          className={`w-14 h-14 rounded-2xl mx-auto mb-3.5 ${shimmerClass} border ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        />

        {/* Title Headline Placeholder */}
        <div className={`h-6 w-48 mx-auto rounded-lg mb-2.5 ${shimmerClass}`} />

        {/* Subtitle Description Placeholder */}
        <div className={`h-3 w-72 max-w-full mx-auto rounded-md ${shimmerClass}`} />

        {/* Segmented Mode Tabs Placeholder */}
        <div
          className={`mt-6 grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl border ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100/80 border-slate-200'
          }`}
        >
          <div className={`h-8 rounded-xl ${shimmerClass} ${mode === 'google' ? 'opacity-100' : 'opacity-40'}`} />
          <div className={`h-8 rounded-xl ${shimmerClass} ${mode === 'terminal' ? 'opacity-100' : 'opacity-40'}`} />
          <div className={`h-8 rounded-xl ${shimmerClass} ${mode === 'signup' ? 'opacity-100' : 'opacity-40'}`} />
        </div>
      </div>

      {/* Skeleton Body */}
      <div className="p-6 sm:p-8">
        {formFields}
      </div>
    </div>
  );
};
