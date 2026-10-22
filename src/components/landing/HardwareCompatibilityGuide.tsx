import React from 'react';

export const HardwareCompatibilityGuide: React.FC<{ onLaunchDemo?: () => void }> = () => {
  return (
    <section id="hardware-guide" className="w-full py-14 px-4 sm:px-6 bg-slate-950 relative">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            Save on Hardware.
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Gone are the days vendors would charge Ksh 60,000 to Ksh 100,000 kes on proprietary hardware bundles. SokoPoS runs fast on your current tablet, phone, laptop, and standard receipt printers.
          </p>
        </div>
      </div>
    </section>
  );
};
