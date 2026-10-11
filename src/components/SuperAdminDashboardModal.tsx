import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Building2,
  FileText,
  PlusCircle,
  X,
  CheckCircle2,
  ExternalLink,
  Search,
  Database,
  Calendar,
  User,
  ArrowRight,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  Lock,
  Eye,
  RotateCcw,
  Palette,
  Globe,
  LayoutTemplate,
  Crop,
  CreditCard,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Tag,
  Sliders,
  Zap,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Business, PricingTier } from '../types';
import { processAndOptimizeImage } from '../utils/imageOptimizer';
import { SUPER_ADMIN_EMAIL, isSuperAdminEmail } from '../data/initialData';
import { PricingSlider } from './pricing/PricingSlider';
import { PackageTierId } from '../types/pricing';

interface SuperAdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'tenants' | 'subscriptions' | 'pricing' | 'audit' | 'provision' | 'branding';
}

const BRANDING_PRESETS = [
  {
    id: 'preset-hypermarket',
    name: 'Modern Hypermarket',
    tag: 'Retail Flagship',
    url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'preset-night-market',
    name: 'Evening City Market',
    tag: 'Warm & Vibrant',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'preset-minimal-store',
    name: 'Minimal Luxury Store',
    tag: 'Crisp Architectural',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'preset-tech-carbon',
    name: 'Digital High-Tech Hub',
    tag: 'Geometric Dark',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=300&auto=format&fit=crop',
  },
];

const LOGO_PRESETS = [
  {
    id: 'logo-preset-sokomart',
    name: 'SokoMart Pro Retail',
    tag: '4:1 Horizontal Lockup',
    aspect: '4:1',
    dimensions: '400 × 100 px',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100"><rect width="400" height="100" fill="none"/><g transform="translate(15, 15)"><rect width="70" height="70" rx="18" fill="%232563eb"/><path d="M22 24h6l4 22h24l3.5-14H32" fill="none" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="36" cy="54" r="3.5" fill="white"/><circle cx="52" cy="54" r="3.5" fill="white"/></g><text x="100" y="55" fill="%230f172a" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="32" letter-spacing="-0.03em">SOKOMART</text><rect x="306" y="32" width="68" height="24" rx="6" fill="%23fbbf24"/><text x="340" y="48" fill="%230f172a" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="12" text-anchor="middle" letter-spacing="0.05em">PRO</text><text x="102" y="73" fill="%2364748b" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="700" font-size="10.5" letter-spacing="0.1em">ENTERPRISE POINT OF SALE</text></svg>',
  },
  {
    id: 'logo-preset-apex',
    name: 'Apex Supermarket',
    tag: '4:1 Horizontal Lockup',
    aspect: '4:1',
    dimensions: '400 × 100 px',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100"><rect width="400" height="100" fill="none"/><g transform="translate(15, 15)"><rect width="70" height="70" rx="18" fill="%23059669"/><path d="M22 30h26l-3 24H25L22 30z" fill="none" stroke="white" stroke-width="4" stroke-linejoin="round"/><path d="M28 30V24a7 7 0 0 1 14 0v6" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/></g><text x="100" y="55" fill="%23064e3b" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="32" letter-spacing="-0.03em">APEX MART</text><rect x="306" y="32" width="76" height="24" rx="6" fill="%2310b981"/><text x="344" y="48" fill="white" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="11" text-anchor="middle" letter-spacing="0.05em">RETAIL</text><text x="102" y="73" fill="%23047857" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="700" font-size="10.5" letter-spacing="0.1em">FRESH FOODS & GROCERY</text></svg>',
  },
  {
    id: 'logo-preset-metro',
    name: 'Metro Retail Co.',
    tag: '1:1 Square Emblem / Mark',
    aspect: '1:1',
    dimensions: '512 × 512 px',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="44" fill="%234f46e5"/><g transform="translate(30, 30)"><path d="M70 20l50 30v60l-50 30-50-30v-60z" fill="none" stroke="white" stroke-width="12" stroke-linejoin="round"/><circle cx="70" cy="70" r="18" fill="%23fbbf24"/><text x="70" y="125" fill="white" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="16" text-anchor="middle" letter-spacing="0.1em">METRO</text></g></svg>',
  },
];

const FAVICON_PRESETS = [
  {
    id: 'fav-preset-default',
    name: 'SokoPoS Classic S (Default)',
    tag: '1:1 Square • Blue S',
    aspect: '1:1',
    dimensions: '64 × 64 px',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%232563eb"/><text x="16" y="23" font-size="20" font-family="sans-serif" font-weight="900" fill="white" text-anchor="middle">S</text></svg>',
  },
  {
    id: 'fav-preset-emerald-cart',
    name: 'Emerald POS Cart',
    tag: '1:1 Square • Green Till',
    aspect: '1:1',
    dimensions: '64 × 64 px',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%23059669"/><path d="M7 8h3l2.5 9h10l2-6H11" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="13" cy="21" r="1.5" fill="white"/><circle cx="21" cy="21" r="1.5" fill="white"/></svg>',
  },
  {
    id: 'fav-preset-amber-bag',
    name: 'Amber Store Bag',
    tag: '1:1 Square • Gold Store',
    aspect: '1:1',
    dimensions: '64 × 64 px',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%23d97706"/><path d="M9 11h14l-1.5 12h-11L9 11z" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/><path d="M12 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>',
  },
  {
    id: 'fav-preset-indigo-star',
    name: 'Indigo Tech Hub',
    tag: '1:1 Square • Indigo Star',
    aspect: '1:1',
    dimensions: '64 × 64 px',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%234f46e5"/><path d="M16 6l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="white"/></svg>',
  },
];

export const SuperAdminDashboardModal: React.FC<SuperAdminDashboardModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'tenants',
}) => {
  const {
    businesses,
    activeBusinessId,
    setActiveBusinessId,
    superAdminAuditLogs,
    provisionBusiness,
    currentUser,
    loginBgGraphic,
    loginBgGraphicName,
    setLoginBgGraphic,
    removeLoginBgGraphic,
    platformLogo,
    platformLogoName,
    setPlatformLogo,
    removePlatformLogo,
    platformFavicon,
    platformFaviconName,
    setPlatformFavicon,
    removePlatformFavicon,
    performSystemCleanup,
    isRealGoogleAccount,
    updateBusinessStatus,
    soundFx,
    showToast,
    pricingTiers,
    updatePricingTier,
    resetPricingTiersToDefault,
  } = usePos();

  const isSuperAdminUser = isSuperAdminEmail(currentUser?.email);

  const [activeTab, setActiveTab] = useState<'tenants' | 'subscriptions' | 'pricing' | 'audit' | 'provision' | 'branding'>(
    defaultTab === 'subscriptions' && !isSuperAdminUser ? 'tenants' : (defaultTab || 'tenants')
  );
  const [brandingSubTab, setBrandingSubTab] = useState<'logo' | 'favicon' | 'login-bg'>('logo');
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Pricing Tiers Architecture Config State
  const [selectedPricingTierId, setSelectedPricingTierId] = useState<string>('business');
  const [newFeatureText, setNewFeatureText] = useState<{ [tierId: string]: string }>({});
  const [isResettingPricing, setIsResettingPricing] = useState(false);

  // Subscriptions Tab State
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [subPlanFilter, setSubPlanFilter] = useState<'all' | 'starter' | 'professional' | 'enterprise'>('all');
  const [togglingBizId, setTogglingBizId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && defaultTab) {
      if (defaultTab === 'subscriptions' && !isSuperAdminUser) {
        setActiveTab('tenants');
      } else {
        setActiveTab(defaultTab);
      }
    }
  }, [isOpen, defaultTab, isSuperAdminUser]);

  // Platform Brand Logo upload state
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [isLogoDragging, setIsLogoDragging] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [customLogoUrlInput, setCustomLogoUrlInput] = useState('');
  const [isApplyingLogoUrl, setIsApplyingLogoUrl] = useState(false);

  // Browser Favicon upload state
  const faviconFileInputRef = useRef<HTMLInputElement>(null);
  const [isFaviconDragging, setIsFaviconDragging] = useState(false);
  const [isProcessingFavicon, setIsProcessingFavicon] = useState(false);
  const [faviconUploadError, setFaviconUploadError] = useState<string | null>(null);
  const [customFaviconUrlInput, setCustomFaviconUrlInput] = useState('');
  const [isApplyingFaviconUrl, setIsApplyingFaviconUrl] = useState(false);

  // Background Graphic upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isApplyingUrl, setIsApplyingUrl] = useState(false);

  // Search filter for audit log
  const [auditFilter, setAuditFilter] = useState('');
  const [selectedAuditEntry, setSelectedAuditEntry] = useState<string | null>(null);

  // Provisioning Form State
  const [newBizName, setNewBizName] = useState('');
  const [newBizOwnerEmail, setNewBizOwnerEmail] = useState('');
  const [newBizOwnerName, setNewBizOwnerName] = useState('');
  const [newBizPlan, setNewBizPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional');

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, SVG).');
      return;
    }
    setUploadError(null);
    setIsProcessingImage(true);
    try {
      const optimized = await processAndOptimizeImage(file, 1920, 1080, 0.85);
      await setLoginBgGraphic(optimized, file.name);
    } catch (err: any) {
      console.error('Failed to process image:', err);
      setUploadError(err.message || 'Failed to process and optimize image. Please try another file.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  // Logo handlers
  const handleProcessLogoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Please select a valid image file (PNG, SVG, WebP, JPG).');
      return;
    }
    setLogoUploadError(null);
    setIsProcessingLogo(true);
    try {
      // 4:1 wide or 1:1 square; preserve PNG alpha transparency
      const optimized = await processAndOptimizeImage(file, 800, 400, 0.95, 'image/png');
      await setPlatformLogo(optimized, file.name);
    } catch (err: any) {
      console.error('Failed to process platform logo:', err);
      setLogoUploadError(err.message || 'Failed to process logo image. Please try another file.');
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsLogoDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleLogoFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessLogoFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleApplyCustomLogoUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = customLogoUrlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) {
      setLogoUploadError('Please enter a valid HTTP, HTTPS, or data image URL.');
      return;
    }
    setLogoUploadError(null);
    setIsApplyingLogoUrl(true);
    try {
      await setPlatformLogo(url, 'Web Logo Asset');
      setCustomLogoUrlInput('');
    } catch (err: any) {
      setLogoUploadError('Could not apply logo URL.');
    } finally {
      setIsApplyingLogoUrl(false);
    }
  };

  // Favicon handlers
  const handleProcessFaviconFile = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.ico')) {
      setFaviconUploadError('Please select a valid icon file (PNG, ICO, SVG, WebP).');
      return;
    }
    setFaviconUploadError(null);
    setIsProcessingFavicon(true);
    try {
      // 1:1 square icon; max 128x128
      const optimized = await processAndOptimizeImage(file, 128, 128, 0.95, 'image/png');
      await setPlatformFavicon(optimized, file.name);
    } catch (err: any) {
      console.error('Failed to process platform favicon:', err);
      setFaviconUploadError(err.message || 'Failed to process favicon file. Please try another file.');
    } finally {
      setIsProcessingFavicon(false);
    }
  };

  const handleFaviconDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFaviconDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFaviconFile(e.dataTransfer.files[0]);
    }
  };

  const handleFaviconFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFaviconFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleApplyCustomFaviconUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = customFaviconUrlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) {
      setFaviconUploadError('Please enter a valid HTTP, HTTPS, or data icon URL.');
      return;
    }
    setFaviconUploadError(null);
    setIsApplyingFaviconUrl(true);
    try {
      await setPlatformFavicon(url, 'Web Favicon Asset');
      setCustomFaviconUrlInput('');
    } catch (err: any) {
      setFaviconUploadError('Could not apply favicon URL.');
    } finally {
      setIsApplyingFaviconUrl(false);
    }
  };

  const handleApplyCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = customUrlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) {
      setUploadError('Please enter a valid HTTP or HTTPS image URL.');
      return;
    }
    setUploadError(null);
    setIsApplyingUrl(true);
    try {
      await setLoginBgGraphic(url, 'Web Image URL');
      setCustomUrlInput('');
    } catch (err: any) {
      setUploadError('Could not apply image URL.');
    } finally {
      setIsApplyingUrl(false);
    }
  };

  if (!isOpen) return null;

  const handleProvisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim() || !newBizOwnerEmail.trim()) return;

    provisionBusiness(
      newBizName.trim(),
      newBizOwnerEmail.trim(),
      newBizOwnerName.trim() || 'Business Owner',
      newBizPlan
    );

    setNewBizName('');
    setNewBizOwnerEmail('');
    setNewBizOwnerName('');
    setActiveTab('tenants');
  };

  const filteredAuditLogs = superAdminAuditLogs.filter((entry) => {
    if (!auditFilter) return true;
    const q = auditFilter.toLowerCase();
    return (
      entry.businessName.toLowerCase().includes(q) ||
      entry.businessId.toLowerCase().includes(q) ||
      entry.action.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q) ||
      entry.recordType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Platform Super-Admin Oversight</h2>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  ROOT PRIVILEGES
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-tenant provisioning, cross-business isolation control & write audit ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 flex items-center gap-4 text-xs font-bold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'tenants'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Business Tenants ({businesses.length})</span>
          </button>

          {isSuperAdminUser && (
            <button
              id="superadmin-tab-subscriptions-btn"
              onClick={() => setActiveTab('subscriptions')}
              className={`py-3 flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'subscriptions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Subscriptions & Access ({businesses.length})</span>
              {businesses.some((b) => b.status === 'suspended') && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Suspended / Inactive Subscriptions Exist" />
              )}
            </button>
          )}

          <button
            id="superadmin-tab-pricing-btn"
            onClick={() => setActiveTab('pricing')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'pricing'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-4 h-4 text-purple-600" />
            <span>Pricing Tiers ({pricingTiers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Super-Admin Write Audit Log ({superAdminAuditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('provision')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'provision'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Provision Business Account</span>
          </button>

          <button
            id="superadmin-tab-branding-btn"
            onClick={() => setActiveTab('branding')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'branding'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Platform Branding & Assets</span>
            {(loginBgGraphic || platformLogo || platformFavicon) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Custom Assets Active" />
            )}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {/* TAB 1: ALL BUSINESS TENANTS */}
          {activeTab === 'tenants' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Managed Business Tenants</h3>
                  <p className="text-xs text-slate-400">
                    Each tenant is strictly isolated with independent product catalogs, locations, sales, and system users.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      setIsCleaningUp(true);
                      try {
                        await performSystemCleanup();
                      } finally {
                        setIsCleaningUp(false);
                      }
                    }}
                    disabled={isCleaningUp}
                    className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Remove all business owner accounts that lack a real Google account"
                  >
                    {isCleaningUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    <span>{isCleaningUp ? 'Cleaning System...' : 'Run System Cleanup'}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('provision')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Provision New Tenant</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businesses.map((biz) => {
                  const isActive = biz.id === activeBusinessId;
                  return (
                    <div
                      key={biz.id}
                      className={`bg-white rounded-2xl p-5 border transition shadow-2xs ${
                        isActive
                          ? 'border-blue-600 ring-2 ring-blue-600/10'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {biz.code}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              {biz.plan}
                            </span>
                          </div>
                          <h4 className="font-black text-base text-slate-900 mt-1.5">{biz.name}</h4>
                        </div>
                        {isActive ? (
                          <span className="flex items-center gap-1 bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active Scope
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveBusinessId(biz.id);
                              onClose();
                            }}
                            className="text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-xl transition cursor-pointer"
                          >
                            Switch to Tenant
                          </button>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Google Account Owner:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{biz.ownerEmail}</span>
                            {isRealGoogleAccount(biz.ownerEmail) ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                                <Check className="w-2.5 h-2.5" /> Google Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">
                                ⚠️ No Google Account
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Owner Name:</span>
                          <span className="font-medium text-slate-700">{biz.ownerName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Tax PIN (KRA):</span>
                          <span className="font-mono text-slate-700">{biz.taxNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Tenant ID:</span>
                          <span className="font-mono text-[11px] text-slate-400">{biz.id}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: POS SUBSCRIPTIONS & ACCESS CONTROL (Restricted to upfrontretaile@gmail.com only) */}
          {activeTab === 'subscriptions' && (
            isSuperAdminUser ? (
              <div className="space-y-6">
              {/* Header Title & Subtitle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800">
                      POS Subscriptions & Terminal Access Management
                    </h3>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Manual Controls
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monitor subscriber billing tiers and manually toggle POS terminal access ON or OFF for missed payments or administrative holds.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('provision')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add New Subscriber</span>
                  </button>
                </div>
              </div>

              {/* Subscription Overview KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">Total Subscribed</span>
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {businesses.length}
                  </div>
                  <span className="text-[10px] text-slate-400">Registered POS tenants</span>
                </div>

                <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700">Access Active</span>
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </div>
                  <div className="text-xl font-black text-emerald-700 mt-1">
                    {businesses.filter((b) => b.status === 'active').length}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">Terminals Trading Online</span>
                </div>

                <div className="bg-white border border-rose-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-700">Access Suspended</span>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl font-black text-rose-700 mt-1">
                    {businesses.filter((b) => b.status === 'suspended').length}
                  </div>
                  <span className="text-[10px] text-rose-600 font-semibold">Missed Payment / Holds</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">Est. MRR (KES)</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    KES{' '}
                    {businesses
                      .reduce((sum, b) => {
                        const fee = b.plan === 'enterprise' ? 12000 : b.plan === 'professional' ? 5500 : 2500;
                        return sum + fee;
                      }, 0)
                      .toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400">Monthly Recurring Revenue</span>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={subSearchQuery}
                    onChange={(e) => setSubSearchQuery(e.target.value)}
                    placeholder="Search by business name, code, owner email, or PIN..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white w-full font-medium"
                  />
                </div>

                {/* Status and Plan Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                    <button
                      onClick={() => setSubStatusFilter('all')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        subStatusFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({businesses.length})
                    </button>
                    <button
                      onClick={() => setSubStatusFilter('active')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        subStatusFilter === 'active'
                          ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Active ({businesses.filter((b) => b.status === 'active').length})
                    </button>
                    <button
                      onClick={() => setSubStatusFilter('suspended')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        subStatusFilter === 'suspended'
                          ? 'bg-white text-rose-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Suspended ({businesses.filter((b) => b.status === 'suspended').length})
                    </button>
                  </div>

                  <select
                    value={subPlanFilter}
                    onChange={(e) => setSubPlanFilter(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="all">All Plan Tiers</option>
                    <option value="starter">Starter (KES 2,500/mo)</option>
                    <option value="professional">Professional (KES 5,500/mo)</option>
                    <option value="enterprise">Enterprise (KES 12,000/mo)</option>
                  </select>
                </div>
              </div>

              {/* Subscribed Businesses List */}
              <div className="space-y-3">
                {businesses
                  .filter((biz) => {
                    const q = subSearchQuery.trim().toLowerCase();
                    const matchQuery =
                      !q ||
                      biz.name.toLowerCase().includes(q) ||
                      biz.code.toLowerCase().includes(q) ||
                      biz.ownerEmail.toLowerCase().includes(q) ||
                      biz.ownerName.toLowerCase().includes(q) ||
                      biz.taxNumber.toLowerCase().includes(q);

                    const matchStatus =
                      subStatusFilter === 'all' ||
                      (subStatusFilter === 'active' && biz.status === 'active') ||
                      (subStatusFilter === 'suspended' && biz.status === 'suspended');

                    const matchPlan = subPlanFilter === 'all' || biz.plan === subPlanFilter;

                    return matchQuery && matchStatus && matchPlan;
                  })
                  .map((biz) => {
                    const isBizActive = biz.status === 'active';
                    const planFee =
                      biz.plan === 'enterprise'
                        ? 'KES 12,000 / month'
                        : biz.plan === 'professional'
                        ? 'KES 5,500 / month'
                        : 'KES 2,500 / month';

                    return (
                      <div
                        key={biz.id}
                        className={`bg-white rounded-2xl p-5 border transition shadow-2xs ${
                          isBizActive
                            ? 'border-slate-200 hover:border-slate-300'
                            : 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-200'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Business Info & Plan */}
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                {biz.code}
                              </span>
                              <span
                                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  biz.plan === 'enterprise'
                                    ? 'bg-purple-100 text-purple-800'
                                    : biz.plan === 'professional'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {biz.plan} Plan
                              </span>
                              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                {planFee}
                              </span>

                              {isBizActive ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> POS Access Enabled
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                                  <AlertTriangle className="w-3.5 h-3.5" /> POS Access Suspended
                                </span>
                              )}
                            </div>

                            <h4 className="font-black text-base text-slate-900">{biz.name}</h4>

                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">Owner:</span>
                                <span className="font-semibold text-slate-700">{biz.ownerName}</span>
                                <span className="text-slate-400 font-mono">({biz.ownerEmail})</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">PIN:</span>
                                <span className="font-mono font-medium text-slate-600">{biz.taxNumber}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">Subscribed:</span>
                                <span>{new Date(biz.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Access Control Toggle & Action Buttons */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                            {/* THE INTERACTIVE TOGGLE */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-xs font-black text-slate-800">
                                  {isBizActive ? 'POS Access: ON' : 'POS Access: OFF'}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {isBizActive ? 'Terminals authorized' : 'Access blocked'}
                                </div>
                              </div>

                              <button
                                type="button"
                                role="switch"
                                aria-checked={isBizActive}
                                aria-label={`Toggle POS access for ${biz.name}`}
                                disabled={togglingBizId === biz.id}
                                onClick={async () => {
                                  const newStatus = isBizActive ? 'suspended' : 'active';
                                  setTogglingBizId(biz.id);
                                  try {
                                    await updateBusinessStatus(biz.id, newStatus);
                                  } finally {
                                    setTogglingBizId(null);
                                  }
                                }}
                                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                                  isBizActive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 hover:bg-slate-400'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                    isBizActive ? 'translate-x-6' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Tenant Scope switch shortcut */}
                            <button
                              onClick={() => {
                                setActiveBusinessId(biz.id);
                                onClose();
                              }}
                              className="text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition cursor-pointer whitespace-nowrap"
                            >
                              Switch to Store
                            </button>
                          </div>
                        </div>

                        {/* Bottom Status Explanation Banner */}
                        <div
                          className={`mt-3 pt-2.5 border-t text-[11px] flex items-center justify-between ${
                            isBizActive
                              ? 'border-slate-100 text-slate-500'
                              : 'border-rose-200 text-rose-800 bg-rose-50/60 -mx-5 -mb-5 px-5 py-2.5 rounded-b-2xl font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {isBizActive ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>
                                  Subscription current. All branch terminals, registers, inventory, and staff logins are enabled.
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>
                                  Subscription access suspended manually. Cashiers and store owners receive a "Subscription Inactive" barrier upon opening POS.
                                </span>
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setAuditFilter(biz.code);
                              setActiveTab('audit');
                            }}
                            className="text-slate-500 hover:text-blue-600 underline cursor-pointer shrink-0 ml-2 font-semibold"
                          >
                            View Audit Log
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {businesses.filter((biz) => {
                  const q = subSearchQuery.trim().toLowerCase();
                  const matchQuery =
                    !q ||
                    biz.name.toLowerCase().includes(q) ||
                    biz.code.toLowerCase().includes(q) ||
                    biz.ownerEmail.toLowerCase().includes(q) ||
                    biz.ownerName.toLowerCase().includes(q) ||
                    biz.taxNumber.toLowerCase().includes(q);

                  const matchStatus =
                    subStatusFilter === 'all' ||
                    (subStatusFilter === 'active' && biz.status === 'active') ||
                    (subStatusFilter === 'suspended' && biz.status === 'suspended');

                  const matchPlan = subPlanFilter === 'all' || biz.plan === subPlanFilter;

                  return matchQuery && matchStatus && matchPlan;
                }).length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                    <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-700">No matching subscriptions</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      No business accounts match the current filter or search criteria.
                    </p>
                  </div>
                )}
              </div>
            </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                <Lock className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                <h3 className="text-base font-black text-slate-900">Restricted Access Panel</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  The Subscriptions panel is restricted exclusively to the platform super administrator (<strong>{SUPER_ADMIN_EMAIL}</strong>). All other accounts are strictly blocked from viewing or managing subscriptions.
                </p>
                <button
                  onClick={() => setActiveTab('tenants')}
                  className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Return to Business Tenants
                </button>
              </div>
            )
          )}

          {/* TAB: PRICING TIERS CONFIGURATION (Basic, Pro, Enterprise POS Packages) */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              {/* Header Title & Subtitle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        POS Packages & Pricing Tiers Architecture
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Define live subscription price points, billing cycles, store limits, and feature sets for <strong>Starter (Basic)</strong>, <strong>Business (Pro)</strong>, and <strong>Premium (Enterprise)</strong> POS packages.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Reset all package pricing and feature sets to the canonical architecture: STARTER (KES 399/mo), BUSINESS (KES 899/mo - Best Value), PREMIUM (KES 1,499/mo)?')) {
                        resetPricingTiersToDefault();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                    title="Restore default packages"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset to Proposed Packages</span>
                  </button>
                </div>
              </div>

              {/* Architecture KPI Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {pricingTiers.map((tier) => {
                  const subscriberCount = businesses.filter((b) => {
                    if (tier.id === 'starter') return b.plan === 'starter';
                    if (tier.id === 'business') return b.plan === 'business' || b.plan === 'professional';
                    if (tier.id === 'premium') return b.plan === 'premium' || b.plan === 'enterprise';
                    return b.plan === tier.id;
                  }).length;

                  return (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedPricingTierId(tier.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                        selectedPricingTierId === tier.id
                          ? 'bg-purple-50/60 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {tier.badge && (
                        <span className={`absolute top-3 right-3 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          tier.isPopular
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {tier.badge}
                        </span>
                      )}
                      <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>{tier.name}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-purple-600 font-bold">{tier.alias}</span>
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900">
                          {tier.currency} {tier.monthlyPrice.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500">/ mo</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Annual: {tier.currency} {tier.annualPrice.toLocaleString()} / yr
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Active Tenants:</span>
                        <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          {subscriberCount} stores
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Portfolio Summary Card */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-linear-to-br from-slate-900 to-slate-950 text-white flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        Monthly Recurring Revenue
                      </span>
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="mt-2 text-xl font-black text-white">
                      KES{' '}
                      {businesses
                        .reduce((acc, b) => {
                          if (b.status === 'suspended') return acc;
                          if (b.plan === 'starter') return acc + 399;
                          if (b.plan === 'business' || b.plan === 'professional') return acc + 899;
                          if (b.plan === 'premium' || b.plan === 'enterprise') return acc + 1499;
                          return acc + 399;
                        }, 0)
                        .toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      From {businesses.filter((b) => b.status === 'active').length} active paying stores
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Packages: 3 Core Tiers</span>
                    <span className="text-emerald-400 font-bold">100% Isolated</span>
                  </div>
                </div>
              </div>

              {/* Live Interactive Package & Scale Slider (Preview for Super Admin) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                  <span>Live Merchant Slider Simulation:</span>
                  <span className="text-purple-600">Drag or click to test & switch package editor</span>
                </div>
                <PricingSlider
                  tiers={pricingTiers}
                  selectedTierId={selectedPricingTierId as PackageTierId}
                  onSelectTier={(tId) => setSelectedPricingTierId(tId)}
                  billingCycle="monthly"
                  isSuperAdminView={true}
                />
              </div>

              {/* Package Selector Pills */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-500 mr-1">Configure Package:</span>
                {pricingTiers.map((tier) => {
                  const isSelected = selectedPricingTierId === tier.id;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedPricingTierId(tier.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{tier.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-purple-700 text-purple-100' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {tier.alias}
                      </span>
                      {tier.isPopular && (
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                          isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
                        }`}>
                          Best Value
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Tier Editor Form */}
              {(() => {
                const currentTier = pricingTiers.find((t) => t.id === selectedPricingTierId) || pricingTiers[0];
                if (!currentTier) return null;

                const annualSavingsPercent = Math.round(
                  ((currentTier.monthlyPrice * 12 - currentTier.annualPrice) / (currentTier.monthlyPrice * 12)) * 100
                );

                return (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                    {/* Tier Editor Header */}
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                          {currentTier.name.substring(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900">{currentTier.name} POS Package</h4>
                            <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                              Alias: {currentTier.alias} Tier
                            </span>
                            {currentTier.badge && (
                              <span className="text-xs font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md">
                                {currentTier.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{currentTier.tagline}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer shadow-2xs">
                          <input
                            type="checkbox"
                            checked={Boolean(currentTier.isPopular)}
                            onChange={(e) => {
                              updatePricingTier(currentTier.id, {
                                isPopular: e.target.checked,
                                badge: e.target.checked ? 'Best Value' : (currentTier.badge === 'Best Value' ? '' : currentTier.badge),
                              });
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                          <span>Highlight as "Best Value"</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer shadow-2xs">
                          <input
                            type="checkbox"
                            checked={Boolean(currentTier.isActive)}
                            onChange={(e) => updatePricingTier(currentTier.id, { isActive: e.target.checked })}
                            className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span>{currentTier.isActive ? 'Active for Tenants' : 'Archived'}</span>
                        </label>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Price Points & Billing Rates */}
                      <div>
                        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-purple-600" />
                          <span>Subscription Price Points & Billing</span>
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Monthly Fee ({currentTier.currency})
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                                {currentTier.currency}
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={currentTier.monthlyPrice}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  updatePricingTier(currentTier.id, { monthlyPrice: val });
                                }}
                                className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 block">Billed monthly per tenant</span>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Annual Fee ({currentTier.currency})
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                                {currentTier.currency}
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={currentTier.annualPrice}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  updatePricingTier(currentTier.id, { annualPrice: val });
                                }}
                                className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                              />
                            </div>
                            <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                              Saves {annualSavingsPercent > 0 ? `${annualSavingsPercent}%` : '0%'} compared to monthly
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Badge / Ribbon Tag
                            </label>
                            <input
                              type="text"
                              value={currentTier.badge || ''}
                              placeholder="e.g. Best Value, Starter, Flagship"
                              onChange={(e) => updatePricingTier(currentTier.id, { badge: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">Appears as pill on pricing card</span>
                          </div>
                        </div>
                      </div>

                      {/* Package Identity & Limits */}
                      <div className="pt-4 border-t border-slate-100">
                        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-purple-600" />
                          <span>Tenant Architecture & Resource Limits</span>
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Max Branch Locations (-1 for Unlimited)
                            </label>
                            <input
                              type="number"
                              min="-1"
                              value={currentTier.maxBranches}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                updatePricingTier(currentTier.id, { maxBranches: isNaN(val) ? 1 : val });
                              }}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {currentTier.maxBranches === -1 ? 'Unlimited branches allowed' : `Max ${currentTier.maxBranches} store branches`}
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Max Staff / Cashier Logins (-1 for Unlimited)
                            </label>
                            <input
                              type="number"
                              min="-1"
                              value={currentTier.maxStaffUsers}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                updatePricingTier(currentTier.id, { maxStaffUsers: isNaN(val) ? 2 : val });
                              }}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {currentTier.maxStaffUsers === -1 ? 'Unlimited staff accounts' : `Max ${currentTier.maxStaffUsers} staff user logins`}
                            </span>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Support Level
                            </label>
                            <input
                              type="text"
                              value={currentTier.supportLevel}
                              onChange={(e) => updatePricingTier(currentTier.id, { supportLevel: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">Displayed in feature comparison</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Tagline / Marketing Subtitle
                            </label>
                            <input
                              type="text"
                              value={currentTier.tagline}
                              onChange={(e) => updatePricingTier(currentTier.id, { tagline: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Package Alias Tag
                            </label>
                            <input
                              type="text"
                              value={currentTier.alias}
                              onChange={(e) => updatePricingTier(currentTier.id, { alias: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">e.g. Basic, Pro, or Enterprise</span>
                          </div>
                        </div>
                      </div>

                      {/* Feature Entitlements Checklist */}
                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                            <span>Feature Entitlements Checklist ({currentTier.features.length})</span>
                          </h5>
                          <span className="text-[11px] text-slate-400">
                            Features visible to store owners in their pricing dashboard
                          </span>
                        </div>

                        {/* Existing Features List */}
                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {currentTier.features.map((feature, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs transition"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                                <span className="font-semibold text-slate-800">{feature}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = currentTier.features.filter((_, i) => i !== idx);
                                  updatePricingTier(currentTier.id, { features: updated });
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
                                title="Remove feature"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add New Feature Row */}
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Enter a new capability to include in this package..."
                            value={newFeatureText[currentTier.id] || ''}
                            onChange={(e) =>
                              setNewFeatureText((prev) => ({ ...prev, [currentTier.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const text = (newFeatureText[currentTier.id] || '').trim();
                                if (text) {
                                  updatePricingTier(currentTier.id, {
                                    features: [...currentTier.features, text],
                                  });
                                  setNewFeatureText((prev) => ({ ...prev, [currentTier.id]: '' }));
                                }
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const text = (newFeatureText[currentTier.id] || '').trim();
                              if (text) {
                                updatePricingTier(currentTier.id, {
                                  features: [...currentTier.features, text],
                                });
                                setNewFeatureText((prev) => ({ ...prev, [currentTier.id]: '' }));
                              }
                            }}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-2xs"
                          >
                            + Add Feature
                          </button>
                        </div>

                        {/* Preset Quick Suggestions */}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="text-slate-400 font-medium">Quick suggestions:</span>
                          {[
                            '15+ Advanced Reports with CSV export',
                            'Optical barcode scanning & fast SKU lookup',
                            'Multi-branch stock transfers & sync',
                            'Customer loyalty points & credit ledgers',
                            'Automated VAT / KRA tax rate calculation',
                            'M-Pesa STK Push direct integration',
                            'White-label receipt branding & logo',
                            'Batch expiry alerts & serial numbers',
                          ].map((suggestion, sIdx) => {
                            const alreadyAdded = currentTier.features.includes(suggestion);
                            if (alreadyAdded) return null;
                            return (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => {
                                  updatePricingTier(currentTier.id, {
                                    features: [...currentTier.features, suggestion],
                                  });
                                }}
                                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 text-slate-600 text-[10px] font-semibold transition cursor-pointer"
                              >
                                + {suggestion}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2: SUPER-ADMIN WRITE AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    Super-Admin Write Audit Ledger
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mandatory audit trail: Every super-admin write across any business is cryptographically logged with before/after snapshots.
                  </p>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    placeholder="Filter audit events..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 font-medium w-full sm:w-64"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredAuditLogs.map((entry) => {
                  const isExpanded = selectedAuditEntry === entry.id;
                  return (
                    <div
                      key={entry.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs text-xs"
                    >
                      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-amber-50 text-amber-700 rounded-lg mt-0.5 shrink-0">
                            <Database className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900">{entry.description}</span>
                              <span className="bg-slate-100 text-slate-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                {entry.action}
                              </span>
                              <span className="bg-blue-50 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded">
                                {entry.recordType}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                              <span className="font-bold text-slate-700">{entry.businessName}</span>
                              <span>•</span>
                              <span>Admin: {entry.adminEmail}</span>
                              <span>•</span>
                              <span>{new Date(entry.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedAuditEntry(isExpanded ? null : entry.id)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition underline shrink-0 cursor-pointer"
                        >
                          {isExpanded ? 'Hide Values Diff' : 'View Before/After Snapshot'}
                        </button>
                      </div>

                      {/* Expandable JSON Before / After Diff */}
                      {isExpanded && (
                        <div className="bg-slate-900 text-slate-200 p-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
                          <div>
                            <span className="text-amber-400 font-bold block mb-1">
                              BEFORE VALUE (Snapshot):
                            </span>
                            <pre className="bg-slate-950 p-2.5 rounded-lg overflow-x-auto max-h-48">
                              {entry.beforeValue
                                ? JSON.stringify(entry.beforeValue, null, 2)
                                : '(null - record created)'}
                            </pre>
                          </div>
                          <div>
                            <span className="text-emerald-400 font-bold block mb-1">
                              AFTER VALUE (Snapshot):
                            </span>
                            <pre className="bg-slate-950 p-2.5 rounded-lg overflow-x-auto max-h-48">
                              {entry.afterValue
                                ? JSON.stringify(entry.afterValue, null, 2)
                                : '(null - record deleted)'}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PROVISION BUSINESS FORM */}
          {activeTab === 'provision' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
              <div className="mb-5">
                <h3 className="text-base font-black text-slate-800">
                  Provision New Business Tenant
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Associates a new enterprise tenant with a designated Google Account. The owner will gain administrative ownership upon signing in with Google.
                </p>
              </div>

              <form onSubmit={handleProvisionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Business / Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBizName}
                    onChange={(e) => setNewBizName(e.target.value)}
                    placeholder="e.g. Coastline Supermarkets Ltd"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Business Owner Google Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={newBizOwnerEmail}
                      onChange={(e) => setNewBizOwnerEmail(e.target.value)}
                      placeholder="e.g. owner@coastlinesuper.com"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Must match their Google Account login
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Owner Full Name
                    </label>
                    <input
                      type="text"
                      value={newBizOwnerName}
                      onChange={(e) => setNewBizOwnerName(e.target.value)}
                      placeholder="e.g. Hassan Mohamed"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subscription Tier Plan
                  </label>
                  <select
                    value={newBizPlan}
                    onChange={(e) => setNewBizPlan(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-bold bg-white"
                  >
                    <option value="starter">Starter (Single Store, 2 Terminals)</option>
                    <option value="professional">Professional (Multi-Branch, Unlimited Cloud Sync)</option>
                    <option value="enterprise">Enterprise (Cross-Region, Dedicated SLA)</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('tenants')}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Provision Tenant & Assign Google Owner</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: PLATFORM BRANDING & ASSETS (LOGO, FAVICON, LOGIN GRAPHIC) */}
          {activeTab === 'branding' && (
            <div className="space-y-6">
              {/* Asset Sub-Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/70 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setBrandingSubTab('logo')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    brandingSubTab === 'logo'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  <span>Platform Brand Logo</span>
                  {platformLogo && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Custom Logo Active" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setBrandingSubTab('favicon')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    brandingSubTab === 'favicon'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Browser Favicon</span>
                  {platformFavicon && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Custom Favicon Active" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setBrandingSubTab('login-bg')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    brandingSubTab === 'login-bg'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Login Screen Graphic</span>
                  {loginBgGraphic && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Custom Graphic Active" />
                  )}
                </button>
              </div>

              {/* ======================================================== */}
              {/* SUB-TAB 1: PLATFORM BRAND LOGO                           */}
              {/* ======================================================== */}
              {brandingSubTab === 'logo' && (
                <div className="space-y-6">
                  {/* Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">
                          Platform Brand Logo
                        </h3>
                        {platformLogo ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                            Custom Logo Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            Default Setup (SokoPoS PRO Typography)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                        Upload a platform brand logo to appear across the POS header, top navigation bar, and terminal sign-in screens. Defaults to the current setup (SokoPoS PRO typography) when no custom logo is uploaded.
                      </p>
                    </div>

                    {platformLogo && (
                      <button
                        type="button"
                        onClick={() => removePlatformLogo()}
                        className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert to Default SokoPoS Setup</span>
                      </button>
                    )}
                  </div>

                  {/* Error Alert */}
                  {logoUploadError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-800">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1 font-medium">{logoUploadError}</div>
                      <button
                        onClick={() => setLogoUploadError(null)}
                        className="text-red-600 hover:text-red-800 font-bold ml-2 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Main Grid: Upload & Placeholder (Left 7 cols) + In-Context Previews (Right 5 cols) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Dimensions, Placeholder & Upload */}
                    <div className="lg:col-span-7 space-y-5">
                      {/* Gray Aspect Ratio & Dimension Placeholder */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Crop className="w-4 h-4 text-blue-600" />
                            <span>Suitable Aspect Ratio & Dimension Guide</span>
                          </label>
                          <span className="text-[11px] text-slate-400 font-medium">
                            PNG (Transparent) or SVG
                          </span>
                        </div>

                        {/* Dedicated Gray Aspect Ratio Placeholder Frame */}
                        <div className="bg-slate-100 rounded-2xl p-5 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center relative overflow-hidden">
                          {/* 4:1 Wide Aspect Ratio Silhouette */}
                          <div className="w-full max-w-md aspect-[4/1] bg-slate-200/90 rounded-xl border border-slate-300/80 flex items-center justify-center p-3 relative overflow-hidden shadow-inner group">
                            {/* Blueprint grid dots */}
                            <div
                              className="absolute inset-0 opacity-20 pointer-events-none"
                              style={{
                                backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)',
                                backgroundSize: '12px 12px',
                              }}
                            />

                            {/* Coordinate crosshair tags */}
                            <span className="absolute top-1 left-2 text-[9px] font-mono text-slate-400 font-bold select-none">
                              0,0
                            </span>
                            <span className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-400 font-bold select-none">
                              400 × 100 px (4:1)
                            </span>

                            {platformLogo ? (
                              <div className="relative z-10 max-h-full max-w-full flex items-center justify-center p-2 bg-slate-900/5 rounded-lg">
                                <img
                                  src={platformLogo}
                                  alt="Current Platform Logo"
                                  className="max-h-14 max-w-[280px] object-contain drop-shadow-xs"
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1 text-slate-400 relative z-10 select-none">
                                <div className="flex items-center gap-2">
                                  <LayoutTemplate className="w-5 h-5 text-slate-400" />
                                  <span className="font-mono text-xs font-bold text-slate-600 tracking-tight">
                                    4:1 Horizontal Lockup Frame
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-300/60 px-2 py-0.5 rounded">
                                  Recommended: 400 × 100 px (or 1:1 • 512 × 512 px)
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Dimensions & Spec Badges */}
                          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">Suitable Dimensions:</span>
                            <span className="bg-slate-200/90 text-slate-800 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-slate-300">
                              4:1 • 400 × 100 px
                            </span>
                            <span className="text-slate-400 font-bold">or</span>
                            <span className="bg-slate-200/90 text-slate-800 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-slate-300">
                              1:1 • 512 × 512 px
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              · Transparent background recommended
                            </span>
                          </div>

                          {/* Default indicator notice */}
                          {!platformLogo && (
                            <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span>Current setup: Defaulting to standard SokoPoS PRO typography</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Upload Control (File Selector & Drag & Drop) */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <UploadCloud className="w-4 h-4 text-blue-600" />
                            <span>Upload Custom Brand Logo</span>
                          </label>
                          <span className="text-[11px] text-slate-400 font-medium">
                            PNG, SVG, WebP, JPG
                          </span>
                        </div>

                        <input
                          id="platform-logo-file-input"
                          ref={logoFileInputRef}
                          type="file"
                          accept="image/png,image/svg+xml,image/webp,image/jpeg"
                          onChange={handleLogoFileInputChange}
                          className="hidden"
                        />

                        <div
                          id="platform-logo-dropzone"
                          onDrop={handleLogoDrop}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsLogoDragging(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsLogoDragging(false);
                          }}
                          onClick={() => logoFileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-7 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                            isLogoDragging
                              ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                              : isProcessingLogo
                              ? 'border-slate-300 bg-slate-50 pointer-events-none'
                              : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/80 bg-slate-50/40'
                          }`}
                        >
                          {isProcessingLogo ? (
                            <>
                              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 animate-spin" />
                              </div>
                              <p className="text-sm font-bold text-slate-800">
                                Optimizing Brand Logo...
                              </p>
                              <p className="text-xs text-slate-400">
                                Preserving PNG transparency and scaling for crisp retina display
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-inner">
                                <LayoutTemplate className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">
                                  Click to browse or drag and drop logo here
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  Scales automatically to fit header and sign-in view
                                </p>
                              </div>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition">
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Choose Logo File</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Direct Asset URL Input */}
                        <div className="pt-2 border-t border-slate-100">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                            Or enter an external Logo URL / SVG Data:
                          </label>
                          <form onSubmit={handleApplyCustomLogoUrl} className="flex gap-2">
                            <div className="relative flex-1">
                              <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="url"
                                value={customLogoUrlInput}
                                onChange={(e) => setCustomLogoUrlInput(e.target.value)}
                                placeholder="https://... or brand logo URL"
                                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium bg-white"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={isApplyingLogoUrl || !customLogoUrlInput.trim()}
                              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              {isApplyingLogoUrl ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Apply Logo</span>
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Active Status Card / Revert Button */}
                      {platformLogo ? (
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-16 h-10 rounded-lg overflow-hidden border border-emerald-300 bg-white shrink-0 p-1 flex items-center justify-center shadow-xs">
                              <img
                                src={platformLogo}
                                alt="Platform Logo"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-emerald-900 truncate">
                                  {platformLogoName || 'Custom Platform Brand Logo'}
                                </span>
                                <span className="bg-emerald-200/60 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                  Active
                                </span>
                              </div>
                              <p className="text-[11px] text-emerald-700 mt-0.5">
                                Live across POS header bar, mobile drawer & sign-in screen
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removePlatformLogo()}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-white hover:bg-red-50 border border-red-200 transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revert to Default</span>
                          </button>
                        </div>
                      ) : (
                        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-600">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 px-2.5 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                              SokoPoS PRO
                            </div>
                            <div>
                              <span className="font-bold text-slate-800">Default Typography Active</span>
                              <p className="text-[11px] text-slate-500">
                                Using standard SokoPoS brand typography and badges
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500">No logo uploaded</span>
                        </div>
                      )}

                      {/* Curated Enterprise Retail Logo Presets */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Or Select a Curated Retail Logo Preset</span>
                          </h4>
                          <span className="text-[11px] text-slate-400 font-medium">1-click instant test</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {LOGO_PRESETS.map((preset) => {
                            const isSelected = platformLogo === preset.url;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => setPlatformLogo(preset.url, preset.name)}
                                className={`group rounded-xl border text-left transition cursor-pointer p-3 flex flex-col justify-between gap-2.5 ${
                                  isSelected
                                    ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/50'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                                }`}
                              >
                                <div className="h-10 bg-slate-50 rounded-lg p-1.5 flex items-center justify-center border border-slate-200/80">
                                  <img
                                    src={preset.url}
                                    alt={preset.name}
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-xs text-slate-800 truncate">
                                      {preset.name}
                                    </span>
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    )}
                                  </div>
                                  <span className="text-[10px] font-medium text-slate-400 block truncate">
                                    {preset.tag} · {preset.dimensions}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: In-Context Live Simulations (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Eye className="w-4 h-4 text-blue-600" />
                          <span>Live In-App Integration Preview</span>
                        </label>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          Real-time
                        </span>
                      </div>

                      {/* Mockup 1: POS Application Top Header Bar */}
                      <div className="bg-slate-900 rounded-2xl p-3 shadow-lg border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                          <span>1. POS Top Navigation Header</span>
                          <span className="text-blue-400">Desktop / Tablet</span>
                        </div>

                        <div className="bg-white rounded-xl p-2.5 border border-slate-200 flex items-center justify-between shadow-xs">
                          {/* Left: Brand logo area */}
                          <div className="flex items-center gap-2">
                            {platformLogo ? (
                              <div className="flex items-center gap-1.5">
                                <img
                                  src={platformLogo}
                                  alt="Preview Logo"
                                  className="h-6 max-w-[120px] object-contain"
                                />
                                <span className="bg-amber-400 text-slate-900 text-[8px] font-black px-1 py-0.2 rounded">
                                  PRO
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-black text-blue-600 tracking-tight">
                                  SokoPoS
                                </span>
                                <span className="bg-amber-400 text-slate-900 text-[8px] font-black px-1 py-0.2 rounded">
                                  PRO
                                </span>
                              </div>
                            )}

                            <span className="text-[9px] text-slate-400 font-bold border-l border-slate-200 pl-2">
                              Flagship Branch
                            </span>
                          </div>

                          {/* Right: Mock status icons */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              Online
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Mockup 2: Terminal Sign-in Screen Header */}
                      <div className="bg-slate-950 rounded-2xl p-3.5 shadow-lg border border-slate-800 space-y-2 text-white">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                          <span>2. Terminal Sign-In Header</span>
                          <span className="text-emerald-400">POS Login</span>
                        </div>

                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between backdrop-blur-md">
                          {platformLogo ? (
                            <div className="flex items-center gap-2">
                              <img
                                src={platformLogo}
                                alt="Preview Logo"
                                className="h-6 max-w-[120px] object-contain drop-shadow-sm"
                              />
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                PRO RETAIL
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white text-xs">
                                S
                              </div>
                              <span className="font-black text-xs tracking-tight text-white">
                                SokoPoS
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                PRO RETAIL
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-[9px] text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Terminal Ready</span>
                          </div>
                        </div>
                      </div>

                      {/* Info & Persistence Card */}
                      <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Platform-Wide Synchronized</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Your brand logo is stored persistently in Google Cloud Firestore (<code className="text-slate-700 font-mono text-[10px] bg-slate-200 px-1 py-0.2 rounded">platform_settings/global</code>) and local cache, rendering seamlessly for all terminals and registers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* SUB-TAB 2: BROWSER FAVICON                               */}
              {/* ======================================================== */}
              {brandingSubTab === 'favicon' && (
                <div className="space-y-6">
                  {/* Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">
                          Browser Tab Favicon & Shortcut Asset
                        </h3>
                        {platformFavicon ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                            Custom Favicon Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            Default SokoPoS 'S' Icon Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                        Upload a square favicon icon for browser tabs, bookmarks, and mobile PWA shortcuts. When no custom favicon is uploaded, the browser defaults to the official SokoPoS blue 'S' mark.
                      </p>
                    </div>

                    {platformFavicon && (
                      <button
                        type="button"
                        onClick={() => removePlatformFavicon()}
                        className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert to Default Favicon</span>
                      </button>
                    )}
                  </div>

                  {/* Error Alert */}
                  {faviconUploadError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-800">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1 font-medium">{faviconUploadError}</div>
                      <button
                        onClick={() => setFaviconUploadError(null)}
                        className="text-red-600 hover:text-red-800 font-bold ml-2 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Main Grid: Upload & Placeholder (Left 7 cols) + In-Browser Tab Mockup (Right 5 cols) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Dimensions, Placeholder & Upload */}
                    <div className="lg:col-span-7 space-y-5">
                      {/* Gray Aspect Ratio & Dimension Placeholder */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Crop className="w-4 h-4 text-blue-600" />
                            <span>Suitable Aspect Ratio & Dimension Guide</span>
                          </label>
                          <span className="text-[11px] text-slate-400 font-medium">
                            1:1 Square • PNG / ICO / SVG
                          </span>
                        </div>

                        {/* Dedicated Gray 1:1 Square Placeholder Frame */}
                        <div className="bg-slate-100 rounded-2xl p-5 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center relative overflow-hidden">
                          {/* 1:1 Square Silhouette Frame */}
                          <div className="w-28 h-28 aspect-square bg-slate-200/90 rounded-2xl border border-slate-300/80 flex items-center justify-center p-3 relative overflow-hidden shadow-inner group">
                            {/* Blueprint grid dots */}
                            <div
                              className="absolute inset-0 opacity-20 pointer-events-none"
                              style={{
                                backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)',
                                backgroundSize: '10px 10px',
                              }}
                            />

                            {/* Coordinate tags */}
                            <span className="absolute top-1 left-1.5 text-[8px] font-mono text-slate-400 font-bold select-none">
                              0,0
                            </span>
                            <span className="absolute bottom-1 right-1.5 text-[8px] font-mono text-slate-400 font-bold select-none">
                              64 × 64 px
                            </span>

                            {platformFavicon ? (
                              <div className="relative z-10 w-16 h-16 flex items-center justify-center p-1 bg-white rounded-xl shadow-xs border border-slate-200">
                                <img
                                  src={platformFavicon}
                                  alt="Current Platform Favicon"
                                  className="w-12 h-12 object-contain"
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1 text-slate-400 relative z-10 select-none">
                                <Globe className="w-7 h-7 text-slate-400" />
                                <span className="font-mono text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                                  1:1 Square
                                </span>
                                <span className="text-[9px] font-mono text-slate-500 bg-slate-300/60 px-1.5 py-0.2 rounded">
                                  64 × 64 px
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Dimensions & Spec Badges */}
                          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">Suitable Dimensions:</span>
                            <span className="bg-slate-200/90 text-slate-800 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-slate-300">
                              1:1 Square • 64 × 64 px (Retina)
                            </span>
                            <span className="text-slate-400 font-bold">or</span>
                            <span className="bg-slate-200/90 text-slate-800 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-slate-300">
                              32 × 32 px / 128 × 128 px
                            </span>
                          </div>

                          {/* Default indicator notice */}
                          {!platformFavicon && (
                            <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span>Current setup: Defaulting to standard SokoPoS Blue 'S' favicon</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Upload Control (File Selector & Drag & Drop) */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <UploadCloud className="w-4 h-4 text-blue-600" />
                            <span>Upload Custom Favicon Asset</span>
                          </label>
                          <span className="text-[11px] text-slate-400 font-medium">
                            PNG, ICO, SVG, WebP
                          </span>
                        </div>

                        <input
                          id="platform-favicon-file-input"
                          ref={faviconFileInputRef}
                          type="file"
                          accept="image/png,image/x-icon,image/svg+xml,image/webp,image/jpeg,.ico"
                          onChange={handleFaviconFileInputChange}
                          className="hidden"
                        />

                        <div
                          id="platform-favicon-dropzone"
                          onDrop={handleFaviconDrop}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsFaviconDragging(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsFaviconDragging(false);
                          }}
                          onClick={() => faviconFileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-7 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                            isFaviconDragging
                              ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                              : isProcessingFavicon
                              ? 'border-slate-300 bg-slate-50 pointer-events-none'
                              : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/80 bg-slate-50/40'
                          }`}
                        >
                          {isProcessingFavicon ? (
                            <>
                              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 animate-spin" />
                              </div>
                              <p className="text-sm font-bold text-slate-800">
                                Optimizing Favicon Asset...
                              </p>
                              <p className="text-xs text-slate-400">
                                Formatting for 64×64 retina and browser tab display
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-inner">
                                <Globe className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">
                                  Click to browse or drag and drop favicon here
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  Renders crisply inside browser tabs and mobile shortcuts
                                </p>
                              </div>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition">
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Choose Favicon File</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Direct Asset URL Input */}
                        <div className="pt-2 border-t border-slate-100">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                            Or enter an external Favicon / Icon URL:
                          </label>
                          <form onSubmit={handleApplyCustomFaviconUrl} className="flex gap-2">
                            <div className="relative flex-1">
                              <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="url"
                                value={customFaviconUrlInput}
                                onChange={(e) => setCustomFaviconUrlInput(e.target.value)}
                                placeholder="https://... or favicon URL"
                                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium bg-white"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={isApplyingFaviconUrl || !customFaviconUrlInput.trim()}
                              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              {isApplyingFaviconUrl ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Apply Favicon</span>
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Curated Retail Favicon Presets */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Or Select a Curated Favicon Preset</span>
                          </h4>
                          <span className="text-[11px] text-slate-400 font-medium">1-click instant test</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {FAVICON_PRESETS.map((preset) => {
                            const isSelected = platformFavicon === preset.url;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => setPlatformFavicon(preset.url, preset.name)}
                                className={`group rounded-xl border text-center transition cursor-pointer p-3 flex flex-col items-center gap-2 ${
                                  isSelected
                                    ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/50'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                                }`}
                              >
                                <div className="w-10 h-10 bg-slate-100 rounded-lg p-1.5 flex items-center justify-center border border-slate-200/80 shadow-2xs">
                                  <img
                                    src={preset.url}
                                    alt={preset.name}
                                    className="w-7 h-7 object-contain"
                                  />
                                </div>
                                <div className="min-w-0 w-full">
                                  <span className="font-bold text-xs text-slate-800 truncate block">
                                    {preset.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {preset.tag}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: In-Browser Tab Mockup & Live Sync (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Eye className="w-4 h-4 text-blue-600" />
                          <span>Browser Tab Window Simulation</span>
                        </label>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          Desktop Tab
                        </span>
                      </div>

                      {/* Realistic Browser Window Chrome Mockup */}
                      <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800 text-left">
                        {/* Browser Top Window Bar */}
                        <div className="bg-slate-950 px-3.5 py-2.5 flex items-center gap-3 border-b border-slate-800">
                          {/* Window Control Buttons (Red, Amber, Green) */}
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                          </div>

                          {/* Simulated Browser Tab */}
                          <div className="bg-slate-800 text-slate-100 px-3.5 py-1.5 rounded-t-lg text-xs font-semibold flex items-center gap-2 max-w-xs shadow-xs border-t border-x border-slate-700">
                            <img
                              src={
                                platformFavicon ||
                                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%232563eb"/><text x="16" y="23" font-size="20" font-family="sans-serif" font-weight="900" fill="white" text-anchor="middle">S</text></svg>'
                              }
                              alt="Active Favicon"
                              className="w-4 h-4 rounded-xs object-contain shrink-0"
                            />
                            <span className="truncate text-[11px] font-bold">
                              SokoPoS Point of Sale
                            </span>
                            <span className="text-slate-400 text-[10px] ml-1 select-none">
                              ×
                            </span>
                          </div>
                        </div>

                        {/* Browser Address Bar */}
                        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center gap-2 text-xs font-mono text-slate-400">
                          <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="text-slate-300 text-[11px]">https://sokopos.co.ke/app</span>
                        </div>

                        {/* Browser Viewport Preview Area */}
                        <div className="p-6 bg-slate-950 text-center space-y-2">
                          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center p-2 shadow-inner">
                            <img
                              src={
                                platformFavicon ||
                                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%232563eb"/><text x="16" y="23" font-size="20" font-family="sans-serif" font-weight="900" fill="white" text-anchor="middle">S</text></svg>'
                              }
                              alt="Favicon Scaled"
                              className="w-8 h-8 object-contain"
                            />
                          </div>
                          <div className="text-xs font-bold text-slate-200">
                            {platformFavicon ? 'Custom Favicon Live' : 'Default SokoPoS Favicon'}
                          </div>
                          <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                            Displays in browser tabs, address bars, and bookmarks across Chrome, Safari, Edge, Firefox, and mobile Android/iOS home screens.
                          </p>
                        </div>
                      </div>

                      {/* Live Sync Notice */}
                      <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Real-Time Tab Synchronization</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Applying a favicon immediately injects the updated icon into your browser window's actual <code className="text-slate-700 font-mono text-[10px] bg-slate-200 px-1 py-0.2 rounded">&lt;link rel="icon"&gt;</code> tag and syncs across all user terminals.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* SUB-TAB 3: POS TERMINAL LOGIN PAGE BACKGROUND GRAPHIC    */}
              {/* ======================================================== */}
              {brandingSubTab === 'login-bg' && (
                <div className="space-y-6">
                  {/* Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">
                          POS Terminal Login Page Background Graphic
                        </h3>
                        {loginBgGraphic ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                            Custom Graphic Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            Default Dark Style (No Graphic)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                        Upload a custom background graphic to render full-bleed on the POS terminal sign-in page, replacing the default solid dark slate style. Removing the graphic instantly restores the original default design.
                      </p>
                    </div>

                    {loginBgGraphic && (
                      <button
                        id="remove-login-bg-top-btn"
                        type="button"
                        onClick={() => removeLoginBgGraphic()}
                        className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Revert to Default Appearance</span>
                      </button>
                    )}
                  </div>

                  {/* Error Alert */}
                  {uploadError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-800">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1 font-medium">{uploadError}</div>
                      <button
                        onClick={() => setUploadError(null)}
                        className="text-red-600 hover:text-red-800 font-bold ml-2 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Main Grid: Upload & Presets (Left) + Interactive Live Preview (Right) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Upload Control, URL Form & Presets (7 cols) */}
                    <div className="lg:col-span-7 space-y-5">
                      {/* The Upload Control (Drag & Drop + File Selector) */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <UploadCloud className="w-4 h-4 text-blue-600" />
                            <span>Upload Custom Background Graphic</span>
                          </label>
                          <span className="text-[11px] text-slate-400 font-medium">
                            16:9 • 1920 × 1080 px recommended
                          </span>
                        </div>

                        <input
                          id="login-bg-file-input"
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />

                        <div
                          id="login-bg-dropzone"
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
                            isDragging
                              ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                              : isProcessingImage
                              ? 'border-slate-300 bg-slate-50 pointer-events-none'
                              : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/80 bg-slate-50/40'
                          }`}
                        >
                          {isProcessingImage ? (
                            <>
                              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">
                                  Optimizing & Compressing Graphic...
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  Generating high-performance full-bleed asset for cloud & local cache
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-inner">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">
                                  Click to browse or drag and drop image here
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  Renders full-bleed across the entire sign-in viewport (16:9)
                                </p>
                              </div>
                              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition">
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Select Image File</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Direct Image URL input */}
                        <div className="pt-2 border-t border-slate-100">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                            Or enter an external Image / Asset URL:
                          </label>
                          <form onSubmit={handleApplyCustomUrl} className="flex gap-2">
                            <div className="relative flex-1">
                              <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <input
                                type="url"
                                value={customUrlInput}
                                onChange={(e) => setCustomUrlInput(e.target.value)}
                                placeholder="https://images.unsplash.com/... or brand asset URL"
                                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium bg-white"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={isApplyingUrl || !customUrlInput.trim()}
                              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              {isApplyingUrl ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Apply URL</span>
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Current Active Graphic Status / Controls */}
                      {loginBgGraphic ? (
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-14 h-10 rounded-lg overflow-hidden border border-emerald-300 bg-slate-900 shrink-0 shadow-xs">
                              <img
                                src={loginBgGraphic}
                                alt="Current Login Background"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-emerald-900 truncate">
                                  {loginBgGraphicName || 'Custom Login Background Graphic'}
                                </span>
                                <span className="bg-emerald-200/60 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                  Active
                                </span>
                              </div>
                              <p className="text-[11px] text-emerald-700 mt-0.5">
                                Rendering as full-bleed background on POS sign-in terminal
                              </p>
                            </div>
                          </div>

                          <button
                            id="remove-login-bg-card-btn"
                            type="button"
                            onClick={() => removeLoginBgGraphic()}
                            className="px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-white hover:bg-red-50 border border-red-200 transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove & Revert</span>
                          </button>
                        </div>
                      ) : (
                        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-600">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs border border-slate-800 font-bold">
                              #02
                            </div>
                            <div>
                              <span className="font-bold text-slate-800">Default Dark Style Active</span>
                              <p className="text-[11px] text-slate-500">Solid dark slate background (#020617)</p>
                            </div>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500">No graphic applied</span>
                        </div>
                      )}

                      {/* Curated Enterprise Retail Graphic Presets */}
                      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Or Select a Curated Retail Preset</span>
                          </h4>
                          <span className="text-[11px] text-slate-400 font-medium">1-click instant preview</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {BRANDING_PRESETS.map((preset) => {
                            const isSelected = loginBgGraphic === preset.url;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => setLoginBgGraphic(preset.url, preset.name)}
                                className={`group relative rounded-xl overflow-hidden border text-left transition cursor-pointer p-2 flex items-center gap-3 ${
                                  isSelected
                                    ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/50'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                                }`}
                              >
                                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200/80 bg-slate-900">
                                  <img
                                    src={preset.thumbnail}
                                    alt={preset.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-xs text-slate-800 truncate">
                                      {preset.name}
                                    </span>
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    )}
                                  </div>
                                  <span className="text-[10px] font-medium text-slate-400 block truncate">
                                    {preset.tag}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Live Interactive Mockup (5 cols) */}
                    <div className="lg:col-span-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Eye className="w-4 h-4 text-blue-600" />
                          <span>Live Sign-In View Simulation</span>
                        </label>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          16:9 Kiosk View
                        </span>
                      </div>

                      {/* Scaled Kiosk Frame */}
                      <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl aspect-[16/10] flex flex-col justify-between select-none">
                        {/* Background Layer */}
                        <div
                          className={`absolute inset-0 transition-all duration-300 ${
                            loginBgGraphic ? '' : 'bg-slate-950'
                          }`}
                          style={
                            loginBgGraphic
                              ? {
                                  backgroundImage: `url(${loginBgGraphic})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                }
                              : undefined
                          }
                        />

                        {/* Dimming overlay if graphic is set */}
                        {loginBgGraphic && (
                          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" />
                        )}

                        {/* Simulated Top Bar */}
                        <div className="relative z-10 px-3 py-2 border-b border-white/10 bg-slate-950/60 backdrop-blur-md flex items-center justify-between text-white">
                          <div className="flex items-center gap-1.5">
                            {platformLogo ? (
                              <img
                                src={platformLogo}
                                alt="Platform Logo"
                                className="h-5 max-w-[90px] object-contain"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center font-black text-[10px]">
                                  S
                                </div>
                                <span className="text-[11px] font-bold tracking-tight">SokoPoS</span>
                              </div>
                            )}
                            <span className="text-[8px] font-bold px-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              PRO
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Terminal Ready</span>
                          </div>
                        </div>

                        {/* Simulated Centered Login Card */}
                        <div className="relative z-10 flex items-center justify-center p-2 my-auto">
                          <div className="w-44 rounded-xl border shadow-2xl overflow-hidden text-center bg-[#18202c] border-slate-700/60">
                            {/* Top area */}
                            <div className="p-2 space-y-1.5">
                              {/* Pill tabs */}
                              <div className="grid grid-cols-2 gap-0.5 bg-[#0e131c] p-0.5 rounded-lg border border-slate-800 text-[7px] font-bold">
                                <span className="bg-[#343e4f] text-white rounded py-0.5">Login</span>
                                <span className="text-slate-400 py-0.5">PIN Pad</span>
                              </div>
                              <div className="text-[9px] font-black text-white leading-tight py-0.5">
                                Log In to POS Terminal
                              </div>
                              <div className="w-full py-1 px-1.5 rounded-lg bg-[#1d8af3] text-white font-bold text-[8px] flex items-center justify-center gap-1 shadow-xs">
                                <span className="w-2.5 h-2.5 rounded bg-white text-[6px] font-black text-blue-600 flex items-center justify-center">G</span>
                                <span>Continue with Google</span>
                              </div>
                            </div>
                            {/* Bottom area */}
                            <div className="bg-[#283243] p-1.5 border-t border-slate-700/60 space-y-1">
                              <div className="text-[6.5px] text-slate-300">Need to register a new location?</div>
                              <div className="w-full py-0.5 px-1.5 rounded-md bg-white text-slate-900 font-bold text-[7px] flex items-center justify-center gap-1 shadow-2xs">
                                <span>Set Up a New Store</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Simulated Bottom Bar */}
                        <div className="relative z-10 px-3 py-1.5 border-t border-white/10 bg-slate-950/60 text-center text-[8px] text-slate-400">
                          © 2026 SokoPoS Enterprise Platform
                        </div>
                      </div>

                      {/* Legend / Status explanation */}
                      <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-1">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Full-Bleed Responsive Layout</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Custom graphic scales automatically across all display resolutions. Automatically optimized and synced to Firestore for persistent platform-wide branding.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
