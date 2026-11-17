import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Crop,
  Eye,
  Globe,
  Image as ImageIcon,
  LayoutTemplate,
  Link as LinkIcon,
  Loader2,
  Lock,
  Menu,
  Moon,
  RefreshCw,
  RotateCcw,
  Sun,
  Trash2,
  UploadCloud,
  X,
  Store,
} from 'lucide-react';
import { usePos } from '../../context/PosContext';
import { BrandingSlotId, IndustrySolutionId } from '../../types';
import { AppLogo } from '../common/AppLogo';
import { SettingsSectionHeader } from '../common/SettingsSectionHeader';
import { RETAIL_INDUSTRIES } from '../landing/SolutionsGallery';
import {
  BRANDING_SLOT_SPECS,
  detectImageFormatLabel,
  estimateAssetSizeKb,
  inspectImageAsset,
  InspectedImageAsset,
  optimizeBrandingSlotFile,
  validateBrandingAssetUrl,
} from '../../utils/imageOptimizer';
import bgModernHypermarket from '../../assets/images/bg_modern_hypermarket_1794745035042.jpg';
import bgEveningMarket from '../../assets/images/bg_evening_market_1794745035836.jpg';
import bgMinimalBoutique from '../../assets/images/bg_minimal_boutique_1794745035140.jpg';
import bgDarkTechPos from '../../assets/images/bg_dark_tech_pos_1794745035491.jpg';
import heroKenyanPos from '../../assets/images/hero_kenyan_pos_1794857444336.jpg';

type BrandingAssetTab = 'logo' | 'favicon' | 'login-bg' | 'industries';

const DEFAULT_FAVICON_SVG =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%232563eb"/><text x="16" y="23" font-size="20" font-family="sans-serif" font-weight="900" fill="white" text-anchor="middle">S</text></svg>';

const LOGO_PRESETS = [
  {
    id: 'logo-preset-sokomart',
    name: 'SokoMart Pro Retail',
    tag: '4:1 Horizontal Lockup',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100"><rect width="400" height="100" fill="none"/><g transform="translate(15, 15)"><rect width="70" height="70" rx="18" fill="%232563eb"/><path d="M22 24h6l4 22h24l3.5-14H32" fill="none" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="36" cy="54" r="3.5" fill="white"/><circle cx="52" cy="54" r="3.5" fill="white"/></g><text x="100" y="55" fill="%230f172a" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="32" letter-spacing="-0.03em">SOKOMART</text><rect x="306" y="32" width="68" height="24" rx="6" fill="%23fbbf24"/><text x="340" y="48" fill="%230f172a" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="12" text-anchor="middle" letter-spacing="0.05em">PRO</text><text x="102" y="73" fill="%2364748b" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="700" font-size="10.5" letter-spacing="0.1em">ENTERPRISE POINT OF SALE</text></svg>',
  },
  {
    id: 'logo-preset-apex',
    name: 'Apex Supermarket',
    tag: '4:1 Horizontal Lockup',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100" viewBox="0 0 400 100"><rect width="400" height="100" fill="none"/><g transform="translate(15, 15)"><rect width="70" height="70" rx="18" fill="%23059669"/><path d="M22 30h26l-3 24H25L22 30z" fill="none" stroke="white" stroke-width="4" stroke-linejoin="round"/><path d="M28 30V24a7 7 0 0 1 14 0v6" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/></g><text x="100" y="55" fill="%23064e3b" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="32" letter-spacing="-0.03em">APEX MART</text><rect x="306" y="32" width="76" height="24" rx="6" fill="%2310b981"/><text x="344" y="48" fill="white" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="11" text-anchor="middle" letter-spacing="0.05em">RETAIL</text><text x="102" y="73" fill="%23047857" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="700" font-size="10.5" letter-spacing="0.1em">FRESH FOODS &amp; GROCERY</text></svg>',
  },
  {
    id: 'logo-preset-metro',
    name: 'Metro Retail Co.',
    tag: '1:1 Square Mark',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" rx="44" fill="%234f46e5"/><g transform="translate(30, 30)"><path d="M70 20l50 30v60l-50 30-50-30v-60z" fill="none" stroke="white" stroke-width="12" stroke-linejoin="round"/><circle cx="70" cy="70" r="18" fill="%23fbbf24"/><text x="70" y="125" fill="white" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" font-size="16" text-anchor="middle" letter-spacing="0.1em">METRO</text></g></svg>',
  },
];

const FAVICON_PRESETS = [
  {
    id: 'fav-preset-default',
    name: 'SokoPoS Classic',
    tag: 'Blue Mark',
    url: DEFAULT_FAVICON_SVG,
  },
  {
    id: 'fav-preset-emerald-cart',
    name: 'Emerald Cart',
    tag: 'Green Till',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%23059669"/><path d="M7 8h3l2.5 9h10l2-6H11" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="13" cy="21" r="1.5" fill="white"/><circle cx="21" cy="21" r="1.5" fill="white"/></svg>',
  },
  {
    id: 'fav-preset-amber-bag',
    name: 'Amber Bag',
    tag: 'Gold Store',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%23d97706"/><path d="M9 11h14l-1.5 12h-11L9 11z" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/><path d="M12 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>',
  },
  {
    id: 'fav-preset-indigo-star',
    name: 'Indigo Hub',
    tag: 'Indigo Star',
    url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%234f46e5"/><path d="M16 6l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="white"/></svg>',
  },
];

const LOGIN_BG_PRESETS = [
  {
    id: 'preset-kenyan-flagship',
    name: 'Nairobi Retail Till (Curated Default)',
    tag: 'Kenyan Flagship · 16:9',
    url: heroKenyanPos,
  },
  {
    id: 'preset-hypermarket',
    name: 'Modern Hypermarket',
    tag: 'Retail Flagship · 16:9',
    url: bgModernHypermarket,
  },
  {
    id: 'preset-night-market',
    name: 'Evening Market & Cafe',
    tag: 'Warm Ambient · 16:9',
    url: bgEveningMarket,
  },
  {
    id: 'preset-minimal-store',
    name: 'Minimal Travertine Boutique',
    tag: 'Architectural · 16:9',
    url: bgMinimalBoutique,
  },
  {
    id: 'preset-tech-carbon',
    name: 'Dark Anodized Terminal',
    tag: 'Slate Geometric · 16:9',
    url: bgDarkTechPos,
  },
];

function getFormatAdvisory(
  tab: BrandingAssetTab,
  metrics: InspectedImageAsset | null
): string | null {
  if (!metrics || !metrics.valid) return null;
  const { width, height, aspectRatio } = metrics;

  if (tab === 'logo') {
    if (width < 120 || height < 32) {
      return `Low resolution (${width} × ${height} px). Aim for at least 400 × 100 px or a vector SVG so headers stay crisp on retina screens.`;
    }
    if (aspectRatio < 0.75) {
      return `Tall portrait ratio (${width} × ${height} px). Horizontal 4:1 lockups or 1:1 square marks fit the POS navigation bar cleanly.`;
    }
  }

  if (tab === 'favicon') {
    if (width < 32 || height < 32) {
      return `Small icon (${width} × ${height} px). Use at least 64 × 64 px so browser tabs and mobile shortcuts look sharp.`;
    }
    if (Math.abs(aspectRatio - 1) > 0.25) {
      return `Non-square aspect ratio (${width} × ${height} px). A 1:1 square icon prevents edge clipping inside browser tabs.`;
    }
  }

  if (tab === 'login-bg') {
    if (width < 960 || height < 540) {
      return `Low background resolution (${width} × ${height} px). Recommend 1920 × 1080 px (16:9) for sharp full-bleed terminal sign-in screens.`;
    }
    if (aspectRatio < 1.1) {
      return `Portrait orientation (${width} × ${height} px). Landscape 16:9 images avoid heavy cropping on desktop and tablet POS displays.`;
    }
  }

  return null;
}

interface ReadinessCheck {
  label: string;
  passed: boolean;
  detail: string;
}

function getAssetReadinessChecks(
  tab: BrandingAssetTab,
  assetUrl: string | null,
  metrics: InspectedImageAsset | null,
  previewLoadError: boolean,
  assetSizeKb: number
): ReadinessCheck[] {
  if (!assetUrl) {
    return [
      { label: 'Active Asset', passed: true, detail: 'Using built-in SokoPoS default' },
      { label: 'Renderable', passed: true, detail: 'Verified SVG fallback' },
    ];
  }

  const format = metrics?.format || detectImageFormatLabel(assetUrl);
  const renderOk = Boolean(!previewLoadError && metrics?.valid);

  let ratioOk = renderOk;
  let ratioDetail = renderOk && metrics ? `${metrics.width} × ${metrics.height} px` : 'Pending check';
  if (renderOk && metrics) {
    if (tab === 'logo') {
      ratioOk = metrics.aspectRatio >= 0.75 && metrics.width >= 120;
      ratioDetail = ratioOk ? `${metrics.width} × ${metrics.height} px (Header fit)` : `Suboptimal (${metrics.width} × ${metrics.height} px)`;
    } else if (tab === 'favicon') {
      ratioOk = Math.abs(metrics.aspectRatio - 1) <= 0.25 && metrics.width >= 32;
      ratioDetail = ratioOk ? `${metrics.width} × ${metrics.height} px (Square)` : `Non-square or small (${metrics.width} × ${metrics.height} px)`;
    } else {
      ratioOk = metrics.aspectRatio >= 1.1 && metrics.width >= 960;
      ratioDetail = ratioOk ? `${metrics.width} × ${metrics.height} px (16:9 fit)` : `Low-res or portrait (${metrics.width} × ${metrics.height} px)`;
    }
  }

  const payloadOk = assetSizeKb === 0 || assetSizeKb <= 900;
  const payloadDetail = assetSizeKb > 0 ? `${assetSizeKb} KB / 900 KB limit` : 'Asset URL reference';

  return [
    {
      label: `Format (${format})`,
      passed: renderOk,
      detail: renderOk ? 'Decoded & verified' : 'Failed to decode image',
    },
    {
      label: 'Dimensions & Fit',
      passed: ratioOk,
      detail: ratioDetail,
    },
    {
      label: 'Cloud Sync Budget',
      passed: payloadOk,
      detail: payloadDetail,
    },
  ];
}

export const SuperAdminBrandingTab: React.FC = () => {
  const {
    platformLogo,
    platformLogoName,
    setPlatformLogo,
    removePlatformLogo,
    platformFavicon,
    platformFaviconName,
    setPlatformFavicon,
    removePlatformFavicon,
    loginBgGraphic,
    loginBgGraphicName,
    setLoginBgGraphic,
    removeLoginBgGraphic,
    industryImages,
    setIndustryImage,
    removeIndustryImage,
    refreshPlatformSettings,
    resetAllPlatformBranding,
    isRealGoogleAccount,
  } = usePos();

  const [subTab, setSubTab] = useState<BrandingAssetTab>('logo');
  const [previewSurface, setPreviewSurface] = useState<'light' | 'dark'>('light');
  const [enableBgScrim, setEnableBgScrim] = useState(true);
  const [isResettingAll, setIsResettingAll] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Per-tab upload & URL states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewDragging, setIsPreviewDragging] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isApplyingUrl, setIsApplyingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [assetError, setAssetError] = useState<string | null>(null);
  const [previewLoadError, setPreviewLoadError] = useState(false);
  const [activeMetrics, setActiveMetrics] = useState<InspectedImageAsset | null>(null);

  // Per-industry card upload, drag-drop, URL & dimension metrics state
  const industryFileInputRefs = useRef<Partial<Record<IndustrySolutionId, HTMLInputElement | null>>>({});
  const [industryDraggingId, setIndustryDraggingId] = useState<IndustrySolutionId | null>(null);
  const [industryProcessingId, setIndustryProcessingId] = useState<IndustrySolutionId | null>(null);
  const [industryUrlOpenId, setIndustryUrlOpenId] = useState<IndustrySolutionId | null>(null);
  const [industryUrlValues, setIndustryUrlValues] = useState<Partial<Record<IndustrySolutionId, string>>>({});
  const [industryErrors, setIndustryErrors] = useState<Partial<Record<IndustrySolutionId, string | null>>>({});
  const [industryMetrics, setIndustryMetrics] = useState<Partial<Record<IndustrySolutionId, InspectedImageAsset>>>({});

  const currentAssetUrl =
    subTab === 'logo'
      ? platformLogo
      : subTab === 'favicon'
      ? platformFavicon
      : subTab === 'login-bg'
      ? loginBgGraphic
      : null;

  const currentAssetName =
    subTab === 'logo'
      ? platformLogoName || 'Custom Platform Brand Logo'
      : subTab === 'favicon'
      ? platformFaviconName || 'Custom Browser Favicon'
      : loginBgGraphicName || 'Custom Login Background';

  // Reset transient form errors when switching asset tabs
  useEffect(() => {
    setAssetError(null);
    setUrlInput('');
    setIsDragging(false);
    setIsPreviewDragging(false);
    setPreviewLoadError(false);
    setConfirmResetAll(false);
  }, [subTab]);

  // Inspect active asset dimensions & integrity whenever the active asset changes
  useEffect(() => {
    let cancelled = false;
    if (!currentAssetUrl) {
      setActiveMetrics(null);
      setPreviewLoadError(false);
      return;
    }

    inspectImageAsset(currentAssetUrl).then((res) => {
      if (cancelled) return;
      if (res.valid) {
        setActiveMetrics(res);
        setPreviewLoadError(false);
      } else {
        setActiveMetrics(null);
        setPreviewLoadError(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentAssetUrl]);

  // Inspect natural dimensions for any custom industry images
  useEffect(() => {
    let cancelled = false;
    const ids: IndustrySolutionId[] = ['retail', 'bars', 'supermarkets', 'pharmacies'];
    ids.forEach((id) => {
      const customUrl = industryImages[id]?.url;
      if (!customUrl) {
        setIndustryMetrics((prev) => {
          if (!prev[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
        return;
      }
      inspectImageAsset(customUrl).then((res) => {
        if (cancelled) return;
        if (res.valid) {
          setIndustryMetrics((prev) => ({ ...prev, [id]: res }));
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [industryImages]);

  const applyAssetForTab = async (
    url: string,
    name: string,
    meta?: { width?: number; height?: number; format?: string }
  ) => {
    setAssetError(null);
    if (subTab === 'logo') {
      await setPlatformLogo(url, name, meta);
    } else if (subTab === 'favicon') {
      await setPlatformFavicon(url, name, meta);
    } else if (subTab === 'login-bg') {
      await setLoginBgGraphic(url, name, meta);
    }
  };

  const revertAssetForTab = async () => {
    setAssetError(null);
    if (subTab === 'logo') {
      await removePlatformLogo();
    } else if (subTab === 'favicon') {
      await removePlatformFavicon();
    } else if (subTab === 'login-bg') {
      await removeLoginBgGraphic();
    }
  };

  const handleResetAllBranding = async () => {
    setIsResettingAll(true);
    setAssetError(null);
    setIndustryErrors({});
    try {
      await resetAllPlatformBranding();
      setConfirmResetAll(false);
    } finally {
      setIsResettingAll(false);
    }
  };

  const handleCloudSync = async () => {
    setIsSyncingCloud(true);
    setAssetError(null);
    try {
      await refreshPlatformSettings();
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleProcessFile = async (file: File) => {
    const slotId: BrandingSlotId =
      subTab === 'logo' ? 'logo' : subTab === 'favicon' ? 'favicon' : 'hero';

    setAssetError(null);
    setIsProcessingFile(true);
    try {
      const { dataUrl, metrics } = await optimizeBrandingSlotFile(slotId, file);
      await applyAssetForTab(dataUrl, file.name, {
        width: metrics.width,
        height: metrics.height,
        format: metrics.format,
      });
    } catch (err: any) {
      setAssetError(err?.message || 'Failed to process image file.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleProcessIndustryFile = async (industryId: IndustrySolutionId, file: File) => {
    const slotId = `industry_${industryId}` as BrandingSlotId;
    setIndustryErrors((prev) => ({ ...prev, [industryId]: null }));
    setIndustryProcessingId(industryId);
    try {
      const { dataUrl, metrics } = await optimizeBrandingSlotFile(slotId, file);
      await setIndustryImage(industryId, dataUrl, file.name, {
        width: metrics.width,
        height: metrics.height,
        format: metrics.format,
      });
    } catch (err: any) {
      setIndustryErrors((prev) => ({
        ...prev,
        [industryId]: err?.message || 'Failed to process industry photo.',
      }));
    } finally {
      setIndustryProcessingId(null);
    }
  };

  const handleApplyIndustryUrl = async (e: React.FormEvent, industryId: IndustrySolutionId) => {
    e.preventDefault();
    const raw = (industryUrlValues[industryId] || '').trim();
    const urlCheck = validateBrandingAssetUrl(raw);
    if (!urlCheck.valid) {
      setIndustryErrors((prev) => ({
        ...prev,
        [industryId]: urlCheck.error || 'Enter a valid image URL.',
      }));
      return;
    }

    setIndustryErrors((prev) => ({ ...prev, [industryId]: null }));
    setIndustryProcessingId(industryId);
    try {
      const check = await inspectImageAsset(raw);
      if (!check.valid) {
        setIndustryErrors((prev) => ({
          ...prev,
          [industryId]:
            check.error || 'URL did not resolve to a loadable image. Verify the link and CORS headers.',
        }));
        return;
      }
      await setIndustryImage(industryId, raw, `External ${industryId} Image`, {
        width: check.width,
        height: check.height,
        format: check.format,
      });
      setIndustryUrlValues((prev) => ({ ...prev, [industryId]: '' }));
      setIndustryUrlOpenId(null);
    } catch {
      setIndustryErrors((prev) => ({
        ...prev,
        [industryId]: 'Could not validate or apply this image URL.',
      }));
    } finally {
      setIndustryProcessingId(null);
    }
  };

  const handleApplyUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = urlInput.trim();
    const urlCheck = validateBrandingAssetUrl(raw);
    if (!urlCheck.valid) {
      setAssetError(urlCheck.error || 'Enter a valid image URL.');
      return;
    }

    setAssetError(null);
    setIsApplyingUrl(true);
    try {
      const check = await inspectImageAsset(raw);
      if (!check.valid) {
        setAssetError(
          check.error || 'URL did not resolve to a loadable image. Verify the link and CORS headers.'
        );
        return;
      }

      const fallbackLabel =
        subTab === 'logo'
          ? 'External Brand Logo'
          : subTab === 'favicon'
          ? 'External Favicon Asset'
          : 'External Hero Visual';
      await applyAssetForTab(raw, fallbackLabel, {
        width: check.width,
        height: check.height,
        format: check.format,
      });
      setUrlInput('');
    } catch {
      setAssetError('Could not validate or apply this image URL.');
    } finally {
      setIsApplyingUrl(false);
    }
  };

  const customIndustryCount = Object.values(industryImages).filter((v) => Boolean(v?.url)).length;
  const advisoryWarning = getFormatAdvisory(subTab, activeMetrics);
  const hasAnyCustomAsset = Boolean(
    platformLogo || platformFavicon || loginBgGraphic || customIndustryCount > 0
  );
  const activeCount =
    [platformLogo, platformFavicon, loginBgGraphic].filter(Boolean).length + customIndustryCount;
  const assetSizeKb = currentAssetUrl ? estimateAssetSizeKb(currentAssetUrl) : 0;
  const assetFormat = currentAssetUrl
    ? activeMetrics?.format || detectImageFormatLabel(currentAssetUrl, currentAssetName)
    : 'SVG';
  const readinessChecks = getAssetReadinessChecks(
    subTab,
    currentAssetUrl,
    activeMetrics,
    previewLoadError,
    assetSizeKb
  );

  const inlineUrlValidation = urlInput.trim() ? validateBrandingAssetUrl(urlInput) : null;

  const coreTabKey = subTab === 'industries' ? 'login-bg' : subTab;
  const tabMeta = {
    logo: {
      title: 'Platform Brand Logo',
      subtitle: 'Rendered in the POS top bar, mobile drawer, and terminal sign-in header.',
      accept: BRANDING_SLOT_SPECS.logo.accept,
      formatsLabel: BRANDING_SLOT_SPECS.logo.formatsLabel,
      dimensionsHint: BRANDING_SLOT_SPECS.logo.recommendedHint,
      recommendedBadge: BRANDING_SLOT_SPECS.logo.recommendedDimensions,
      inputId: 'platform-logo-file-input',
      dropzoneId: 'platform-logo-dropzone',
      urlPlaceholder: 'https://cdn.example.com/brand-logo.svg',
      buttonLabel: 'Verify & Apply',
      selectButtonLabel: 'Choose Logo File',
    },
    favicon: {
      title: 'Browser Favicon & Shortcut Icon',
      subtitle: 'Updates browser tabs, bookmarks, and mobile home-screen shortcut icons immediately.',
      accept: BRANDING_SLOT_SPECS.favicon.accept,
      formatsLabel: BRANDING_SLOT_SPECS.favicon.formatsLabel,
      dimensionsHint: BRANDING_SLOT_SPECS.favicon.recommendedHint,
      recommendedBadge: '64 × 64 px / 128 × 128 px',
      inputId: 'platform-favicon-file-input',
      dropzoneId: 'platform-favicon-dropzone',
      urlPlaceholder: 'https://cdn.example.com/favicon.png',
      buttonLabel: 'Verify & Apply',
      selectButtonLabel: 'Choose Favicon File',
    },
    'login-bg': {
      title: 'Landing Hero Showcase Image',
      subtitle: 'Primary visual featured in the landing page Hero Showcase frame. Overrides the default curated Kenyan POS photograph.',
      accept: BRANDING_SLOT_SPECS.hero.accept,
      formatsLabel: BRANDING_SLOT_SPECS.hero.formatsLabel,
      dimensionsHint: BRANDING_SLOT_SPECS.hero.recommendedHint,
      recommendedBadge: BRANDING_SLOT_SPECS.hero.recommendedDimensions,
      inputId: 'login-bg-file-input',
      dropzoneId: 'login-bg-dropzone',
      urlPlaceholder: 'https://cdn.example.com/hero-showcase.jpg',
      buttonLabel: 'Verify & Apply',
      selectButtonLabel: 'Select Image File',
    },
  }[coreTabKey];

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Platform Branding"
        description="Manage the global brand logo, browser favicon, Hero showcase visual, and Industry cards synced across all POS terminals."
        meta={
          <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
            <span
              className={
                hasAnyCustomAsset
                  ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                  : 'text-slate-500 dark:text-slate-400'
              }
            >
              {activeCount} of 7 custom assets active
            </span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              platform_settings/branding_*
            </span>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
              ·
            </span>
            <span
              className={
                isRealGoogleAccount
                  ? 'text-slate-600 dark:text-slate-300 font-medium'
                  : 'text-amber-600 dark:text-amber-400 font-medium'
              }
            >
              {isRealGoogleAccount ? 'Cloud sync ready' : 'Local cache only'}
            </span>
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCloudSync}
              disabled={isSyncingCloud}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'Syncing...' : 'Sync from Cloud'}</span>
            </button>

            {hasAnyCustomAsset && !confirmResetAll && (
              <button
                type="button"
                onClick={() => setConfirmResetAll(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
            )}

            {hasAnyCustomAsset && confirmResetAll && (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleResetAllBranding}
                  disabled={isResettingAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {isResettingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetAll(false)}
                  disabled={isResettingAll}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
        }
      />

      {/* Segmented Asset Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Branding asset type"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
        >
          {[
            { id: 'logo' as const, label: 'Brand Logo', icon: LayoutTemplate, active: Boolean(platformLogo) },
            { id: 'favicon' as const, label: 'Browser Favicon', icon: Globe, active: Boolean(platformFavicon) },
            { id: 'login-bg' as const, label: 'Hero Visual', icon: ImageIcon, active: Boolean(loginBgGraphic) },
            {
              id: 'industries' as const,
              label: 'Industry Cards (4)',
              icon: Store,
              active: customIndustryCount > 0,
              countLabel: customIndustryCount > 0 ? `${customIndustryCount}/4` : undefined,
            },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = subTab === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => setSubTab(item.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
                {item.active && (
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {item.countLabel || 'Custom'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {currentAssetUrl && subTab !== 'industries' && (
          <button
            id={subTab === 'login-bg' ? 'remove-login-bg-top-btn' : undefined}
            type="button"
            onClick={revertAssetForTab}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-800/60 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Revert {subTab === 'logo' ? 'Logo' : subTab === 'favicon' ? 'Favicon' : 'Hero Visual'}</span>
          </button>
        )}
      </div>

      {/* Validation Error Banner */}
      {assetError && (
        <div
          role="alert"
          className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{assetError}</div>
          <button
            type="button"
            onClick={() => setAssetError(null)}
            className="text-rose-600 dark:text-rose-400 hover:underline font-medium shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Format / Resolution Advisory */}
      {subTab !== 'industries' && !assetError && advisoryWarning && (
        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{advisoryWarning}</div>
        </div>
      )}

      {/* Industry Solutions 4-Card Upload Studio */}
      {subTab === 'industries' ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Industry Solutions Gallery Imagery (4 Slots)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Click any highlighted card preview or drop an image file from your computer to replace the landing page sector photography. Oversized images auto-optimize to 1200 × 900 px.
              </p>
            </div>
            <span className="font-mono tabular-nums text-[11px] font-semibold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 whitespace-nowrap shrink-0">
              Recommended: 1200 × 900 px (4:3)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {RETAIL_INDUSTRIES.map((industry) => {
              const slotId = `industry_${industry.id}` as BrandingSlotId;
              const spec = BRANDING_SLOT_SPECS[slotId];
              const customEntry = industryImages[industry.id];
              const activeUrl = customEntry?.url || industry.image;
              const isCustom = Boolean(customEntry?.url);
              const isCardDragging = industryDraggingId === industry.id;
              const isCardProcessing = industryProcessingId === industry.id;
              const cardError = industryErrors[industry.id];
              const cardMetrics = industryMetrics[industry.id];
              const sizeKb = isCustom && customEntry?.url ? estimateAssetSizeKb(customEntry.url) : 0;
              const urlVal = industryUrlValues[industry.id] || '';
              const inlineIndUrlCheck = urlVal.trim() ? validateBrandingAssetUrl(urlVal) : null;
              const isPortraitWarning =
                isCustom && cardMetrics?.valid && cardMetrics.aspectRatio < 1.05;

              return (
                <div
                  key={industry.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
                >
                  {/* Top Spec Bar */}
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-950/40">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                        <span>{industry.name}</span>
                        <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                        <span
                          className={
                            isCustom
                              ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                              : 'text-slate-500 dark:text-slate-400 font-normal'
                          }
                        >
                          {isCustom ? 'Custom upload' : 'Default photo'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {industry.sectorLabel}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 whitespace-nowrap shrink-0">
                      {spec.recommendedDimensions} · {spec.aspectRatioLabel}
                    </span>
                  </div>

                  {/* Hidden Per-Card File Input */}
                  <input
                    id={`industry-file-input-${industry.id}`}
                    ref={(el) => {
                      industryFileInputRefs.current[industry.id] = el;
                    }}
                    type="file"
                    accept={spec.accept}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleProcessIndustryFile(industry.id, e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />

                  {/* Clickable & Drag-Drop 4:3 Preview Upload Target */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Upload custom image for ${industry.name} (${spec.recommendedDimensions})`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        industryFileInputRefs.current[industry.id]?.click();
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIndustryDraggingId(null);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleProcessIndustryFile(industry.id, e.dataTransfer.files[0]);
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIndustryDraggingId(industry.id);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIndustryDraggingId(null);
                    }}
                    onClick={() => industryFileInputRefs.current[industry.id]?.click()}
                    className={`group relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-950 overflow-hidden cursor-pointer border-b transition focus-visible:outline-2 focus-visible:outline-blue-600 ${
                      isCardDragging
                        ? 'border-blue-500 ring-2 ring-inset ring-blue-500/40'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <img
                      src={activeUrl}
                      alt={industry.imageAlt}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div
                      className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-center transition-opacity ${
                        isCardProcessing || isCardDragging
                          ? 'bg-slate-950/70 opacity-100'
                          : 'bg-slate-950/55 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                      }`}
                    >
                      {isCardProcessing ? (
                        <>
                          <Loader2 className="w-6 h-6 text-white animate-spin mb-1.5" />
                          <span className="text-xs font-semibold text-white">
                            Optimizing for {spec.recommendedDimensions}...
                          </span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-6 h-6 text-white mb-1.5" />
                          <span className="text-xs font-semibold text-white">
                            {isCardDragging ? 'Drop image to upload' : 'Click or drop image from computer'}
                          </span>
                          <span className="text-[11px] font-mono tabular-nums text-blue-200 mt-0.5">
                            Recommended: {spec.recommendedDimensions} ({spec.aspectRatioLabel})
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Metadata, Advisories & Controls */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        <span className="truncate font-sans font-medium text-slate-700 dark:text-slate-300">
                          {isCustom ? customEntry?.name || 'Custom Asset' : 'Bundled Kenyan Retail Asset'}
                        </span>
                        {isCustom && cardMetrics?.valid && (
                          <span>
                            {cardMetrics.width} × {cardMetrics.height} px · {sizeKb > 0 ? `${sizeKb} KB` : 'URL'}
                          </span>
                        )}
                      </div>

                      {cardError && (
                        <div className="text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg px-2.5 py-2 flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="flex-1">{cardError}</span>
                        </div>
                      )}

                      {!cardError && isPortraitWarning && (
                        <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            Portrait image ({cardMetrics?.width} × {cardMetrics?.height} px); landscape 4:3 fits best.
                          </span>
                        </div>
                      )}

                      {industryUrlOpenId === industry.id && (
                        <form
                          onSubmit={(e) => handleApplyIndustryUrl(e, industry.id)}
                          className="flex items-center gap-1.5 pt-1"
                        >
                          <input
                            type="url"
                            value={urlVal}
                            onChange={(e) =>
                              setIndustryUrlValues((prev) => ({
                                ...prev,
                                [industry.id]: e.target.value,
                              }))
                            }
                            placeholder="https://cdn.example.com/shop-photo.jpg"
                            className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="submit"
                            disabled={
                              isCardProcessing ||
                              !urlVal.trim() ||
                              Boolean(inlineIndUrlCheck && !inlineIndUrlCheck.valid)
                            }
                            className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium whitespace-nowrap cursor-pointer"
                          >
                            Apply
                          </button>
                        </form>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => industryFileInputRefs.current[industry.id]?.click()}
                          disabled={isCardProcessing}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium transition cursor-pointer whitespace-nowrap"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Upload Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setIndustryUrlOpenId((prev) =>
                              prev === industry.id ? null : industry.id
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition cursor-pointer whitespace-nowrap"
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span>{industryUrlOpenId === industry.id ? 'Hide URL' : 'URL'}</span>
                        </button>
                      </div>

                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => removeIndustryImage(industry.id)}
                          disabled={isCardProcessing}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 transition cursor-pointer whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Revert</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Two-Column Studio Workspace for Logo, Favicon & Hero Visual */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Upload, URL Validation, Active Asset & Presets */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Upload & External URL */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {tabMeta.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {tabMeta.subtitle}
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {tabMeta.formatsLabel}
              </span>
            </div>

            <input
              id={tabMeta.inputId}
              ref={fileInputRef}
              type="file"
              accept={tabMeta.accept}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleProcessFile(e.target.files[0]);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />

            <div
              id={tabMeta.dropzoneId}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleProcessFile(e.dataTransfer.files[0]);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2.5 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30'
                  : isProcessingFile
                  ? 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pointer-events-none'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 bg-slate-50/40 dark:bg-slate-950/30'
              }`}
            >
              {isProcessingFile ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Validating &amp; optimizing asset...
                  </p>
                </>
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Drag &amp; drop an image file here, or click to upload from your computer
                    </p>
                    <p className="inline-block font-mono tabular-nums text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/70 text-blue-700 dark:text-blue-300">
                      {tabMeta.dimensionsHint}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition whitespace-nowrap">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{tabMeta.selectButtonLabel}</span>
                  </span>
                </>
              )}
            </div>

            {/* External Verified URL Input */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <label
                htmlFor={`branding-url-input-${subTab}`}
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Or apply a verified image URL
              </label>
              <form onSubmit={handleApplyUrl} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id={`branding-url-input-${subTab}`}
                    type="url"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (assetError) setAssetError(null);
                    }}
                    placeholder={tabMeta.urlPlaceholder}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isApplyingUrl || !urlInput.trim() || Boolean(inlineUrlValidation && !inlineUrlValidation.valid)}
                  className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  {isApplyingUrl ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{isApplyingUrl ? 'Verifying...' : tabMeta.buttonLabel}</span>
                </button>
              </form>
              {inlineUrlValidation && !inlineUrlValidation.valid && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  {inlineUrlValidation.error}
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Active Asset Status */}
          {currentAssetUrl ? (
            <div
              className={`rounded-xl p-4 border flex items-center justify-between gap-4 ${
                previewLoadError
                  ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-16 h-11 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 shrink-0 p-1 flex items-center justify-center">
                  {previewLoadError ? (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  ) : (
                    <img
                      src={currentAssetUrl}
                      alt={currentAssetName}
                      referrerPolicy="no-referrer"
                      onError={() => setPreviewLoadError(true)}
                      className={
                        subTab === 'login-bg'
                          ? 'w-full h-full object-cover rounded-sm'
                          : 'max-h-full max-w-full object-contain'
                      }
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {currentAssetName}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                    {previewLoadError ? (
                      <span className="text-rose-600 dark:text-rose-400 font-sans font-medium">
                        Preview unreachable — revert or upload a new asset
                      </span>
                    ) : (
                      <>
                        <span className="text-emerald-600 dark:text-emerald-400 font-sans font-medium">
                          Active
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{assetFormat}</span>
                        {activeMetrics?.valid && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              {activeMetrics.width} × {activeMetrics.height} px
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{assetSizeKb > 0 ? `${assetSizeKb} KB` : 'Static / URL'}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                id={subTab === 'login-bg' ? 'remove-login-bg-card-btn' : undefined}
                type="button"
                onClick={revertAssetForTab}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 transition inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Revert</span>
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <span>
                {subTab === 'logo' && 'Default SokoPoS wordmark and badge lockup active.'}
                {subTab === 'favicon' && 'Default SokoPoS blue S mark active in browser tabs.'}
                {subTab === 'login-bg' && 'Default curated Kenyan retail POS showcase photograph active.'}
              </span>
            </div>
          )}

          {/* Card 3: Curated Presets */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {subTab === 'logo'
                  ? 'Curated Brand Logo Presets'
                  : subTab === 'favicon'
                  ? 'Curated Favicon Presets'
                  : 'Curated Terminal Background Presets'}
              </h4>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">1-click apply</span>
            </div>

            {subTab === 'logo' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LOGO_PRESETS.map((preset) => {
                  const isSelected = platformLogo === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyAssetForTab(preset.url, preset.name)}
                      className={`group rounded-lg border text-left transition cursor-pointer p-3 flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'border-blue-600 ring-1 ring-blue-600/30 bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/40'
                      }`}
                    >
                      <div className="h-10 bg-slate-50 rounded-md p-1.5 flex items-center justify-center border border-slate-200/80">
                        <img
                          src={preset.url}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                            {preset.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                          {preset.tag}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {subTab === 'favicon' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FAVICON_PRESETS.map((preset) => {
                  const isSelected = platformFavicon === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyAssetForTab(preset.url, preset.name)}
                      className={`group rounded-lg border text-center transition cursor-pointer p-3 flex flex-col items-center gap-2 ${
                        isSelected
                          ? 'border-blue-600 ring-1 ring-blue-600/30 bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/40'
                      }`}
                    >
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-900 rounded-lg p-1.5 flex items-center justify-center border border-slate-200/80 dark:border-slate-800">
                        <img
                          src={preset.url}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 object-contain"
                        />
                      </div>
                      <div className="min-w-0 w-full">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate block">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                          {preset.tag}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {subTab === 'login-bg' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LOGIN_BG_PRESETS.map((preset) => {
                  const isSelected = loginBgGraphic === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyAssetForTab(preset.url, preset.name)}
                      className={`group rounded-lg border text-left transition cursor-pointer p-2.5 flex items-center gap-3 ${
                        isSelected
                          ? 'border-blue-600 ring-1 ring-blue-600/30 bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/40'
                      }`}
                    >
                      <div className="w-16 h-10 rounded-md overflow-hidden shrink-0 border border-slate-200/80 dark:border-slate-700 bg-slate-900">
                        <img
                          src={preset.url}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                            {preset.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                          {preset.tag}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Real-Time Interactive Preview Canvas */}
        <div className="lg:col-span-5 lg:sticky lg:top-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Canvas Toolbar */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-950/50">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Real-Time Preview Canvas</span>
              </span>

              {subTab === 'login-bg' ? (
                <button
                  type="button"
                  onClick={() => setEnableBgScrim(!enableBgScrim)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer transition whitespace-nowrap"
                >
                  <span>{enableBgScrim ? 'Scrim: On' : 'Scrim: Off'}</span>
                </button>
              ) : (
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPreviewSurface('light')}
                    className={`px-2 py-0.5 rounded-md inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap ${
                      previewSurface === 'light'
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Sun className="w-3 h-3" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSurface('dark')}
                    className={`px-2 py-0.5 rounded-md inline-flex items-center gap-1 cursor-pointer transition whitespace-nowrap ${
                      previewSurface === 'dark'
                        ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Moon className="w-3 h-3" />
                    <span>Dark</span>
                  </button>
                </div>
              )}
            </div>

            {/* Canvas Body */}
            <div className="p-4 space-y-4">
              {subTab === 'logo' && (
                <>
                  {/* 1. POS Top Header Simulation */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium">POS Header Bar</span>
                      <span>{previewSurface === 'light' ? 'Light surface' : 'Dark surface'}</span>
                    </div>
                    <div
                      className={`rounded-xl p-3 border transition flex items-center justify-between ${
                        previewSurface === 'light'
                          ? 'bg-white border-slate-200 text-slate-900'
                          : 'bg-slate-950 border-slate-800 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AppLogo theme={previewSurface} size="sm" />
                        <span
                          className={`text-[10px] font-medium border-l pl-2 truncate ${
                            previewSurface === 'light'
                              ? 'text-slate-500 border-slate-200'
                              : 'text-slate-400 border-slate-800'
                          }`}
                        >
                          Flagship Branch
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                        Online
                      </span>
                    </div>
                  </div>

                  {/* 2. Mobile Drawer Simulation */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium">Mobile Drawer Header</span>
                      <span>Compact width (280 px)</span>
                    </div>
                    <div className="flex justify-start">
                      <div
                        className={`w-[260px] rounded-xl p-3 border transition flex items-center justify-between ${
                          previewSurface === 'light'
                            ? 'bg-white border-slate-200 text-slate-900'
                            : 'bg-slate-950 border-slate-800 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Menu
                            className={`w-4 h-4 shrink-0 ${
                              previewSurface === 'light' ? 'text-slate-600' : 'text-slate-300'
                            }`}
                          />
                          <AppLogo theme={previewSurface} size="sm" />
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">Close</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Sign-In Navigation Bar + Safe Frame */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium">Sign-In &amp; Landing Bar</span>
                      <span>Light header</span>
                    </div>
                    <div className="rounded-xl p-3 border border-slate-200 dark:border-slate-800 bg-[#f4f7f6] flex items-center justify-between">
                      <AppLogo theme="light" size="sm" />
                      <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
                        <span>Pricing</span>
                        <span className="px-2 py-0.5 rounded bg-blue-600 text-white">Launch POS</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2">
                      <span className="font-medium flex items-center gap-1">
                        <Crop className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>Safe Frame Alignment (4:1)</span>
                      </span>
                      <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 tabular-nums">
                        {activeMetrics?.valid
                          ? `${activeMetrics.width} × ${activeMetrics.height} px`
                          : '400 × 100 px'}
                      </span>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Upload platform logo from computer (Recommended 400 by 100 px)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsPreviewDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          handleProcessFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsPreviewDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsPreviewDragging(false);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`group aspect-[4/1] rounded-xl border border-dashed flex items-center justify-center p-3 relative overflow-hidden cursor-pointer transition focus-visible:outline-2 focus-visible:outline-blue-600 ${
                        isPreviewDragging
                          ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/70 dark:bg-blue-950/30'
                          : previewSurface === 'light'
                          ? 'bg-slate-50 border-slate-300 hover:border-blue-500'
                          : 'bg-slate-950 border-slate-700 hover:border-blue-500'
                      }`}
                    >
                      {platformLogo && !previewLoadError ? (
                        <>
                          <img
                            src={platformLogo}
                            alt="Logo blueprint fit"
                            referrerPolicy="no-referrer"
                            onError={() => setPreviewLoadError(true)}
                            className="max-h-14 max-w-[240px] object-contain"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-medium">
                            <UploadCloud className="w-4 h-4" />
                            <span>Replace logo from computer (400 × 100 px)</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1 text-center">
                          <span className="text-[11px] font-mono font-semibold text-blue-700 dark:text-blue-300">
                            400 × 100 px lockup area
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Click or drop to upload from computer</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {subTab === 'favicon' && (
                <>
                  {/* Browser Tab Simulation */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium">Desktop Browser Tab</span>
                      <span className="tabular-nums">16 × 16 px rendering</span>
                    </div>
                    <div
                      className={`rounded-xl overflow-hidden border ${
                        previewSurface === 'light'
                          ? 'bg-slate-100 border-slate-200'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div
                        className={`px-3 pt-2.5 flex items-center gap-3 border-b ${
                          previewSurface === 'light'
                            ? 'bg-slate-200/80 border-slate-200'
                            : 'bg-slate-900 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1 pb-2" aria-hidden="true">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                        </div>

                        <div
                          className={`px-3 py-1.5 rounded-t-lg text-xs font-medium flex items-center gap-2 max-w-[210px] border-t border-x ${
                            previewSurface === 'light'
                              ? 'bg-white text-slate-900 border-slate-200'
                              : 'bg-slate-950 text-slate-100 border-slate-800'
                          }`}
                        >
                          <img
                            src={!previewLoadError && platformFavicon ? platformFavicon : DEFAULT_FAVICON_SVG}
                            alt="Tab Favicon"
                            referrerPolicy="no-referrer"
                            onError={() => setPreviewLoadError(true)}
                            className="w-4 h-4 rounded-xs object-contain shrink-0"
                          />
                          <span className="truncate text-[11px] font-semibold">SokoPoS Point of Sale</span>
                        </div>
                      </div>

                      <div
                        className={`px-3 py-2 flex items-center gap-2 text-[11px] font-mono ${
                          previewSurface === 'light'
                            ? 'bg-white text-slate-500'
                            : 'bg-slate-950 text-slate-400'
                        }`}
                      >
                        <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">https://sokopos.co.ke/app</span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile / Bookmark Tile Preview (Clickable Upload Target) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2">
                      <span className="font-medium">App Shortcut &amp; Bookmark Tile</span>
                      <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 tabular-nums">
                        64 × 64 px / 128 × 128 px
                      </span>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Upload favicon from computer (Recommended 64 by 64 px or 128 by 128 px)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsPreviewDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          handleProcessFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsPreviewDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsPreviewDragging(false);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`group p-5 rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition focus-visible:outline-2 focus-visible:outline-blue-600 ${
                        isPreviewDragging
                          ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-50/70 dark:bg-blue-950/30'
                          : previewSurface === 'light'
                          ? 'bg-slate-50 border-slate-300 hover:border-blue-500'
                          : 'bg-slate-950 border-slate-700 hover:border-blue-500'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className={`w-14 h-14 rounded-2xl border flex items-center justify-center p-2 shadow-2xs ${
                            previewSurface === 'light'
                              ? 'bg-white border-slate-200'
                              : 'bg-slate-900 border-slate-800'
                          }`}
                        >
                          <img
                            src={!previewLoadError && platformFavicon ? platformFavicon : DEFAULT_FAVICON_SVG}
                            alt="Shortcut Tile"
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 object-contain"
                          />
                        </div>
                        <span
                          className={`text-[11px] font-medium ${
                            previewSurface === 'light' ? 'text-slate-700' : 'text-slate-300'
                          }`}
                        >
                          SokoPoS
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Click or drop icon to upload from computer</span>
                      </span>
                    </div>
                  </div>
                </>
              )}

              {subTab === 'login-bg' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2">
                    <span className="font-medium">Landing Hero Showcase Simulation</span>
                    <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 tabular-nums">
                      {activeMetrics?.valid
                        ? `${activeMetrics.width} × ${activeMetrics.height} px`
                        : '1920 × 1080 px (16:9)'}
                    </span>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md">
                    {/* Top Device Header Strip */}
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                        <span>SokoPoS Terminal</span>
                        <span className="font-mono text-slate-400">v2.4</span>
                      </div>
                    </div>

                    {/* Clickable & Drag-Drop Hero Showcase Image Viewport */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Upload Hero Showcase image from computer (Recommended 1920 by 1080 px)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsPreviewDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          handleProcessFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsPreviewDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsPreviewDragging(false);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`group relative aspect-[16/10] bg-slate-950 overflow-hidden cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
                        isPreviewDragging ? 'ring-2 ring-inset ring-blue-500' : ''
                      }`}
                    >
                      <img
                        src={loginBgGraphic || heroKenyanPos}
                        alt="Landing Hero Showcase Simulation"
                        referrerPolicy="no-referrer"
                        onError={() => setPreviewLoadError(true)}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <div
                        className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-center transition-opacity ${
                          isPreviewDragging
                            ? 'bg-slate-950/70 opacity-100'
                            : 'bg-slate-950/55 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                        }`}
                      >
                        <UploadCloud className="w-6 h-6 text-white mb-1.5" />
                        <span className="text-xs font-semibold text-white">
                          Click or drop image from computer
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-blue-200 mt-0.5">
                          Recommended: 1920 × 1080 px (16:9)
                        </span>
                      </div>
                    </div>

                    {/* Frame Bottom Feature Strip */}
                    <div className="p-2.5 bg-slate-50/70 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
                      <span className="font-medium">M-Pesa STK Instant Sync</span>
                      <span className="font-medium">eTIMS Auto-Filing</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Asset Validation & Readiness Checklist */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Validation &amp; Readiness
                </div>
                <div className="space-y-1.5">
                  {readinessChecks.map((chk) => (
                    <div
                      key={chk.label}
                      className="flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        {chk.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                        <span className="font-medium">{chk.label}</span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 text-right truncate">
                        {chk.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
