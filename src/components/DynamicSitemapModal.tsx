import React, { useState, useEffect, useMemo } from 'react';
import {
  Globe,
  X,
  Copy,
  Check,
  ExternalLink,
  Search,
  Download,
  FileCode,
  ShieldCheck,
  Lock,
  Layers,
  Sparkles,
  Terminal,
  Activity,
  Compass,
} from 'lucide-react';
import {
  SitemapEntry,
  getSystemPaths,
  generateSitemapXml,
  generateSitemapJson,
} from '../utils/sitemapManifest';

interface DynamicSitemapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DynamicSitemapModal: React.FC<DynamicSitemapModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sokopos.co.ke';
  const systemPaths = useMemo(() => getSystemPaths(origin), [origin]);

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredPaths = useMemo(() => {
    return systemPaths.filter((item) => {
      const matchesCategory =
        activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [systemPaths, activeCategory, searchQuery]);

  if (!isOpen) return null;

  const publicCount = systemPaths.filter((p) => !p.authRequired).length;
  const protectedCount = systemPaths.filter((p) => p.authRequired).length;

  const handleCopyText = (text: string, actionId: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAction(actionId);
      setTimeout(() => setCopiedAction(null), 2500);
    }
  };

  const handleDownloadXml = () => {
    const xml = generateSitemapXml(origin);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="dynamic-sitemap-modal-overlay"
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl shadow-blue-950/60 overflow-hidden flex flex-col max-h-[92vh] text-slate-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sitemap-modal-title"
      >
        {/* Header Bar */}
        <div className="bg-slate-950 px-4 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-inner">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="sitemap-modal-title"
                  className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2"
                >
                  <span>SokoPoS Dynamic System Sitemap</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Console Command Active
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                <span>Domain: <strong className="font-mono text-cyan-300">{origin}</strong></span>
                <span>•</span>
                <span>{systemPaths.length} System Pathways</span>
                <span>•</span>
                <span className="text-emerald-400">{publicCount} Public / Crawlable</span>
                <span>•</span>
                <span className="text-amber-400">{protectedCount} Operational Guarded</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Close Sitemap (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar & Quick Exports */}
        <div className="bg-slate-950/60 px-4 sm:px-6 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Quick Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pathways (e.g. /terms, #kenya-payments, inventory)..."
              className="w-full bg-slate-900 border border-slate-700 focus:border-blue-400 text-xs rounded-xl pl-8 pr-3 py-2 outline-none text-white transition placeholder:text-slate-500 font-medium"
            />
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleCopyText(generateSitemapXml(origin), 'xml')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedAction === 'xml' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>{copiedAction === 'xml' ? 'Copied XML!' : 'Copy XML'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadXml}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download sitemap.xml</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleCopyText(JSON.stringify(generateSitemapJson(origin), null, 2), 'json')
              }
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedAction === 'json' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-purple-400" />
              )}
              <span>{copiedAction === 'json' ? 'Copied JSON!' : 'Copy JSON'}</span>
            </button>

            <a
              href={`${origin}/sitemap.xml`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Live Endpoint</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>
        </div>

        {/* Category Pills */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs shrink-0 dark-scrollbar">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Pathways ({systemPaths.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('public_landing')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 ${
              activeCategory === 'public_landing'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Public Landing ({systemPaths.filter((p) => p.category === 'public_landing').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('legal_compliance')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 ${
              activeCategory === 'legal_compliance'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Legal & Compliance ({systemPaths.filter((p) => p.category === 'legal_compliance').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('pos_operational')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 ${
              activeCategory === 'pos_operational'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            POS Operational ({systemPaths.filter((p) => p.category === 'pos_operational').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('system_endpoints')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 ${
              activeCategory === 'system_endpoints'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Crawler Feeds ({systemPaths.filter((p) => p.category === 'system_endpoints').length})
          </button>
        </div>

        {/* Pathways List / Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 dark-scrollbar">
          {filteredPaths.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No pathways matching &quot;{searchQuery}&quot; in category &quot;{activeCategory}&quot;.
            </div>
          ) : (
            filteredPaths.map((item) => (
              <div
                key={item.path}
                className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-3 sm:p-4 transition space-y-2 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs sm:text-sm font-bold text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-cyan-500/20 truncate">
                      {item.path}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(`${origin}${item.path}`, `path-${item.path}`)}
                      className="p-1 text-slate-500 hover:text-cyan-300 transition cursor-pointer"
                      title="Copy Full URL"
                    >
                      {copiedAction === `path-${item.path}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={`${origin}${item.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-500 hover:text-white transition cursor-pointer"
                      title="Visit URL"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    {/* Priority Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold font-mono ${
                        item.priority >= 0.9
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : item.priority >= 0.7
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      Priority: {item.priority.toFixed(1)}
                    </span>

                    {/* Change Frequency */}
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
                      Freq: {item.changeFreq}
                    </span>

                    {/* Robots Directive */}
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold ${
                        item.robotsDirective.includes('index')
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/50'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                      }`}
                    >
                      {item.robotsDirective}
                    </span>

                    {/* Auth Status */}
                    {item.authRequired ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-950/60 text-red-300 border border-red-800/50 flex items-center gap-1 font-semibold">
                        <Lock className="w-3 h-3" />
                        <span>Protected</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-teal-950/60 text-teal-300 border border-teal-800/50 flex items-center gap-1 font-semibold">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Public</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Pathway Details */}
                <div className="text-xs">
                  <div className="font-bold text-slate-200">{item.title}</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    {item.description}
                  </p>
                  {item.targetRole && (
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <span>Access Scope:</span>
                      <strong className="text-slate-400 font-medium">{item.targetRole}</strong>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Console trigger: <code className="text-cyan-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded">sitemap()</code> or <code className="text-cyan-300 font-mono bg-slate-900 px-1.5 py-0.5 rounded">window.sitemap()</code></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            Close Viewer (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
