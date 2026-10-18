import React from 'react';

export const HardwareCompatibilityGuide: React.FC<{ onLaunchDemo?: () => void }> = () => {
  return (
    <section id="hardware-guide" className="w-full py-12 px-4 sm:px-6 bg-[#0c111a] border-t border-slate-800/80 relative">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            Use the Hardware You Already Own. Or Buy What You Need.
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Traditional vendors charge KSh 60,000 to KSh 100,000+ for proprietary hardware bundles. SokoPoS runs seamlessly on your current tablet, phone, laptop, and standard receipt printers.
          </p>
        </div>
      </div>
    </section>
  );
};
