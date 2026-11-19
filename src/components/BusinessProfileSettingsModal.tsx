import React, { useState } from 'react';
import {
  Building2,
  Store,
  Users,
  KeyRound,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  MapPin,
  Receipt,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  Globe,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  Palette,
  Monitor,
  Sparkles,
  RotateCcw,
  Download,
  ShieldAlert,
  History,
  Printer,
  Coffee,
  Leaf,
  Wrench,
  Star,
  Tag,
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  Bluetooth,
  Smartphone,
  QrCode,
  Copy,
  Mail,
  Landmark,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Location, Cashier, BusinessSecuritySettings } from '../types';
import { resizeImageToStandardAspectRatio, estimateAssetSizeKb } from '../utils/imageOptimizer';
import { RETAIL_THEMES } from '../data/retailThemes';
import { SUPER_ADMIN_EMAIL } from '../data/initialData';
import { ResetStoreModal } from './ResetStoreModal';
import { TaxManagementPanel } from './TaxManagementPanel';
import { LoyaltySettingsPanel } from './LoyaltySettingsPanel';
import { PaystackSubaccountPanel } from './common/PaystackSubaccountPanel';
import { BillingHistoryPanel } from './BillingHistoryPanel';
import { SettingsSectionHeader } from './common/SettingsSectionHeader';
import {
  generateTotpSecret,
  generateOtpAuthUrl,
  generateQrCodeDataUrl,
  verifyTotpOnServer,
} from '../lib/totpService';
import {
  normalizePlanTier,
  formatTierDisplayName,
  getRequiredTierForBranchCount,
  getRequiredTierForStaffCount,
  isQuotaAtOrAboveLimit,
} from '../utils/subscriptionEntitlements';

export type BusinessSettingsTabId =
  | 'profile'
  | 'branches'
  | 'billing'
  | 'settlement'
  | 'tax'
  | 'loyalty'
  | 'pricing'
  | 'accounts'
  | 'credentials'
  | 'appearance'
  | 'hardware'
  | 'reset';

export interface BusinessProfileSettingsViewProps {
  initialTab?: BusinessSettingsTabId;
  onClose?: () => void;
}

interface NavItemConfig {
  id: BusinessSettingsTabId;
  domId: string;
  label: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  isExternal?: boolean;
  isDanger?: boolean;
}

const NAV_GROUPS: Array<{
  label: string;
  items: NavItemConfig[];
}> = [
  {
    label: 'Store & Catalog',
    items: [
      { id: 'profile', domId: 'tab-profile-btn', label: 'Store Profile', group: 'Store & Catalog', icon: Building2 },
      { id: 'branches', domId: 'tab-branches-btn', label: 'Branches', group: 'Store & Catalog', icon: Store },
      {
        id: 'pricing',
        domId: 'tab-pricing-btn',
        label: 'Packages & Pricing',
        group: 'Store & Catalog',
        icon: Tag,
        isExternal: true,
      },
    ],
  },
  {
    label: 'Payments & Compliance',
    items: [
      {
        id: 'billing',
        domId: 'tab-billing-btn',
        label: 'Billing & Receipts',
        group: 'Payments & Compliance',
        icon: CreditCard,
      },
      {
        id: 'settlement',
        domId: 'tab-settlement-btn',
        label: 'Paystack Settlement',
        group: 'Payments & Compliance',
        icon: Landmark,
      },
      {
        id: 'tax',
        domId: 'tab-tax-btn',
        label: 'Taxes & eTIMS',
        group: 'Payments & Compliance',
        icon: Receipt,
      },
      {
        id: 'loyalty',
        domId: 'tab-loyalty-btn',
        label: 'Loyalty Rewards',
        group: 'Payments & Compliance',
        icon: Star,
      },
    ],
  },
  {
    label: 'Team & Access',
    items: [
      {
        id: 'accounts',
        domId: 'tab-accounts-btn',
        label: 'Staff & Roles',
        group: 'Team & Access',
        icon: Users,
      },
      {
        id: 'credentials',
        domId: 'tab-credentials-btn',
        label: 'Security & 2FA',
        group: 'Team & Access',
        icon: KeyRound,
      },
    ],
  },
  {
    label: 'Hardware & System',
    items: [
      {
        id: 'appearance',
        domId: 'tab-appearance-btn',
        label: 'Appearance',
        group: 'Hardware & System',
        icon: Palette,
      },
      {
        id: 'hardware',
        domId: 'tab-hardware-btn',
        label: 'Printing & Hardware',
        group: 'Hardware & System',
        icon: Printer,
      },
      {
        id: 'reset',
        domId: 'tab-reset-store-btn',
        label: 'Store Reset',
        group: 'Hardware & System',
        icon: RotateCcw,
        isDanger: true,
      },
    ],
  },
];

const ALL_NAV_ITEMS: NavItemConfig[] = NAV_GROUPS.flatMap((g) => g.items);

export const BusinessProfileSettingsModal: React.FC<BusinessProfileSettingsViewProps> = ({
  initialTab,
  onClose,
}) => {
  const {
    currentBusiness,
    activeBusinessId,
    setActiveBusinessId,
    updateBusinessProfile,
    saveBusinessBrandingLogo,
    locations,
    currentLocation,
    setCurrentLocationId,
    addLocation,
    updateLocation,
    deleteLocation,
    systemUsers,
    createSystemUser,
    updateSystemUser,
    deleteSystemUser,
    currentUser,
    isSuperAdmin,
    setIsBusinessSettingsOpen,
    businessSettingsDefaultTab,
    updateActiveUserCredentials,
    showToast,
    isDarkMode,
    toggleDarkMode,
    retailTheme,
    setRetailTheme,
    autoPrintReceipt,
    toggleAutoPrintReceipt,
    receiptFormat,
    setReceiptFormat,
    printerType,
    setPrinterType,
    bluetoothPrinterId,
    bluetoothPrinterName,
    connectBluetoothPrinter,
    setBluetoothPrinter,
    transactions,
    storeSalesBackups,
    downloadSalesBackup,
    canResetStore,
    openPricingPage,
    soundFx,
    entitlements,
    requireCapability,
    openUpgradePrompt,
  } = usePos();

  const [activeTab, setActiveTab] = useState<BusinessSettingsTabId>(
    initialTab || businessSettingsDefaultTab || 'profile'
  );

  const [isResetStoreModalOpen, setIsResetStoreModalOpen] = useState(false);

  React.useEffect(() => {
    if (initialTab === 'pricing') {
      onClose?.();
      openPricingPage();
      return;
    }
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (businessSettingsDefaultTab) {
      if (businessSettingsDefaultTab === 'pricing') {
        onClose?.();
        openPricingPage();
        return;
      }
      setActiveTab(businessSettingsDefaultTab);
    }
  }, [initialTab, businessSettingsDefaultTab, onClose, openPricingPage]);

  // Profile Form State
  const [profileName, setProfileName] = useState(currentBusiness?.name || '');
  const [profileCode, setProfileCode] = useState(currentBusiness?.code || '');
  const [profileTaxNumber, setProfileTaxNumber] = useState(currentBusiness?.taxNumber || '');
  const [profileCurrency, setProfileCurrency] = useState(currentBusiness?.currency || 'KES');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Store Branding Logo Upload State
  const brandLogoInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingBrandLogo, setIsUploadingBrandLogo] = useState(false);
  const [brandLogoError, setBrandLogoError] = useState<string | null>(null);

  // Branch Management State
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchCity, setBranchCity] = useState('Nairobi');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchTerminal, setBranchTerminal] = useState('');
  const [branchSearch, setBranchSearch] = useState('');

  // Account Management State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<Cashier['role']>('cashier');
  const [userUsername, setUserUsername] = useState('');
  const [userPin, setUserPin] = useState('');
  const [userAssignedLocId, setUserAssignedLocId] = useState<string>('');
  const [showRoleMatrix, setShowRoleMatrix] = useState(false);

  // Credential Settings State
  const [newTerminalPin, setNewTerminalPin] = useState('');
  const [confirmTerminalPin, setConfirmTerminalPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);

  // 2-Step Verification & Authenticator App (TOTP) State
  const securitySettings = currentBusiness?.securitySettings;
  const is2FaEnabled = securitySettings?.twoFactorEnabled ?? true;
  const current2FaMethod = securitySettings?.twoFactorMethod || 'email_otp';
  const isTotpPaired = Boolean(securitySettings?.totpEnabled && securitySettings?.totpSecret);

  const [isSettingUpTotp, setIsSettingUpTotp] = useState(false);
  const [totpSetupSecret, setTotpSetupSecret] = useState('');
  const [totpSetupQrUrl, setTotpSetupQrUrl] = useState('');
  const [totpVerifyCode, setTotpVerifyCode] = useState('');
  const [totpVerifyError, setTotpVerifyError] = useState<string | null>(null);
  const [isConfirmingTotp, setIsConfirmingTotp] = useState(false);
  const [hasCopiedSecret, setHasCopiedSecret] = useState(false);

  // Receipt Customization State
  const [receiptHeaderNote, setReceiptHeaderNote] = useState('');
  const [receiptFooterNote, setReceiptFooterNote] = useState('');
  const [receiptTaxPin, setReceiptTaxPin] = useState('');
  const [enhancedReceiptPreview, setEnhancedReceiptPreview] = useState(false);

  // Sync profile form when currentBusiness changes
  React.useEffect(() => {
    if (currentBusiness) {
      setProfileName(currentBusiness.name);
      setProfileCode(currentBusiness.code);
      setProfileTaxNumber(currentBusiness.taxNumber || '');
      setProfileCurrency(currentBusiness.currency || 'KES');
      setReceiptHeaderNote(currentBusiness.hardwareSettings?.printerHeaderNote || '');
      setReceiptFooterNote(currentBusiness.hardwareSettings?.printerFooterNote || '');
      setReceiptTaxPin(currentBusiness.taxNumber || '');
    }
  }, [currentBusiness]);

  const handleSaveReceiptBranding = () => {
    updateBusinessProfile({
      taxNumber: receiptTaxPin.trim(),
      hardwareSettings: {
        ...(currentBusiness?.hardwareSettings || {}),
        printerHeaderNote: receiptHeaderNote.trim(),
        printerFooterNote: receiptFooterNote.trim(),
      },
    });
    showToast('Receipt branding and tax settings saved successfully!', 'success');
  };

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast('Business name cannot be empty', 'error');
      return;
    }
    setIsSavingProfile(true);
    try {
      updateBusinessProfile({
        name: profileName.trim(),
        code: profileCode.trim().toUpperCase(),
        taxNumber: profileTaxNumber.trim(),
        currency: profileCurrency,
      });
      showToast('Business profile updated successfully', 'success');
    } catch {
      showToast('Failed to update business profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Pick image from device, resize to standardized 4:1 aspect ratio via canvas, and store base64 in Firestore business settings
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBrandLogoError(null);
    setIsUploadingBrandLogo(true);
    try {
      const resized = await resizeImageToStandardAspectRatio(file, {
        targetWidth: 400,
        targetHeight: 100,
        mode: 'contain',
        outputMimeType: 'image/png',
        quality: 0.92,
      });

      await saveBusinessBrandingLogo({
        logoBase64: resized.base64DataUrl,
        logoFileName: file.name,
        aspectRatio: resized.aspectRatioLabel,
        width: resized.width,
        height: resized.height,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.email || currentBusiness?.ownerEmail,
      });

      showToast(
        `Store logo standardized to ${resized.width}×${resized.height} (${resized.aspectRatioLabel}) and saved`,
        'success'
      );
    } catch (err: any) {
      const msg = err?.message || 'Failed to process and save the selected logo image.';
      setBrandLogoError(msg);
      showToast(msg, 'error');
    } finally {
      setIsUploadingBrandLogo(false);
    }
  };

  const handleRemoveBrandLogo = async () => {
    setBrandLogoError(null);
    setIsUploadingBrandLogo(true);
    try {
      await saveBusinessBrandingLogo(null);
      showToast('Business branding logo removed', 'info');
    } catch (err: any) {
      const msg = err?.message || 'Failed to remove business branding logo.';
      setBrandLogoError(msg);
      showToast(msg, 'error');
    } finally {
      setIsUploadingBrandLogo(false);
    }
  };

  // Handle Branch Create / Update
  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !branchCode.trim()) {
      showToast('Branch name and code are required', 'error');
      return;
    }

    if (editingBranchId) {
      updateLocation(editingBranchId, {
        name: branchName.trim(),
        code: branchCode.trim().toUpperCase(),
        city: branchCity.trim(),
        address: branchAddress.trim(),
        phone: branchPhone.trim(),
        terminalName: branchTerminal.trim() || `Terminal (${branchCode.trim().toUpperCase()})`,
        currency: profileCurrency,
      });
      setEditingBranchId(null);
    } else {
      addLocation({
        name: branchName.trim(),
        code: branchCode.trim().toUpperCase(),
        city: branchCity.trim(),
        address: branchAddress.trim(),
        phone: branchPhone.trim(),
        taxId: profileTaxNumber.trim() || currentBusiness.taxNumber,
        currency: profileCurrency,
        terminalName: branchTerminal.trim() || `Terminal (${branchCode.trim().toUpperCase()})`,
      });
      setIsAddingBranch(false);
    }

    setBranchName('');
    setBranchCode('');
    setBranchCity('Nairobi');
    setBranchAddress('');
    setBranchPhone('');
    setBranchTerminal('');
  };

  const startEditBranch = (loc: Location) => {
    setEditingBranchId(loc.id);
    setBranchName(loc.name);
    setBranchCode(loc.code);
    setBranchCity(loc.city);
    setBranchAddress(loc.address);
    setBranchPhone(loc.phone);
    setBranchTerminal(loc.terminalName || '');
    setIsAddingBranch(true);
  };

  const cancelBranchForm = () => {
    setIsAddingBranch(false);
    setEditingBranchId(null);
    setBranchName('');
    setBranchCode('');
    setBranchCity('Nairobi');
    setBranchAddress('');
    setBranchPhone('');
    setBranchTerminal('');
  };

  // Handle User Create / Update
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      showToast('Account name is required', 'error');
      return;
    }

    if (editingUserId) {
      const initials = userName
        .trim()
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      const updates: Partial<Cashier> = {
        name: userName.trim(),
        initials,
        role: userRole,
        username: userUsername.trim() || userName.trim().toLowerCase().replace(/\s+/g, '.'),
        assignedLocationId: userAssignedLocId || undefined,
      };
      if (userPin.trim()) {
        updates.pin = userPin.trim();
      }
      const ok = await updateSystemUser(editingUserId, updates);
      if (ok) {
        cancelUserForm();
      }
      return;
    } else {
      if (!userPin.trim() || userPin.trim().length < 4) {
        showToast('PIN must be at least 4 digits', 'error');
        return;
      }
      const initials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();

      const created = await createSystemUser({
        name: userName.trim(),
        initials,
        code: `#${Math.floor(1000 + Math.random() * 9000)}`,
        username: userUsername.trim() || userName.trim().toLowerCase().replace(/\s+/g, ''),
        pin: userPin.trim(),
        role: userRole,
        avatarColor: 'bg-indigo-600',
        shiftStartedAt: new Date().toISOString(),
        assignedLocationId: userAssignedLocId || undefined,
      });

      if (!created) {
        return;
      }
      setIsAddingUser(false);
    }

    setUserName('');
    setUserRole('cashier');
    setUserUsername('');
    setUserPin('');
    setUserAssignedLocId('');
  };

  const startEditUser = (u: Cashier) => {
    setEditingUserId(u.id);
    setUserName(u.name);
    setUserRole(u.role);
    setUserUsername(u.username);
    setUserPin('');
    setUserAssignedLocId(u.assignedLocationId || '');
    setIsAddingUser(true);
  };

  const cancelUserForm = () => {
    setIsAddingUser(false);
    setEditingUserId(null);
    setUserName('');
    setUserRole('cashier');
    setUserUsername('');
    setUserPin('');
    setUserAssignedLocId('');
  };

  // Handle Personal Credentials Update
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerminalPin.trim() || newTerminalPin.trim().length < 4) {
      showToast('New PIN must be at least 4 digits', 'error');
      return;
    }
    if (newTerminalPin !== confirmTerminalPin) {
      showToast('PIN confirmation does not match', 'error');
      return;
    }

    setIsUpdatingCredentials(true);
    try {
      const success = await updateActiveUserCredentials(newTerminalPin.trim());
      if (success) {
        setNewTerminalPin('');
        setConfirmTerminalPin('');
      }
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  // 2-Step Verification & Authenticator App (TOTP) Handlers
  const handleStartTotpEnrollment = async () => {
    soundFx.playBeep(520, 0.05);
    const newSecret = generateTotpSecret(20);
    const otpAuthUri = generateOtpAuthUrl(
      newSecret,
      currentBusiness?.ownerEmail || SUPER_ADMIN_EMAIL,
      currentBusiness?.name || 'SokoPoS'
    );
    try {
      const qrDataUrl = await generateQrCodeDataUrl(otpAuthUri);
      setTotpSetupSecret(newSecret);
      setTotpSetupQrUrl(qrDataUrl);
      setTotpVerifyCode('');
      setTotpVerifyError(null);
      setIsSettingUpTotp(true);
    } catch (err: any) {
      showToast('Failed to generate pairing QR code: ' + (err?.message || 'unknown error'), 'error');
    }
  };

  const handleConfirmTotpCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = totpVerifyCode.trim().replace(/\s+/g, '');
    if (clean.length !== 6) {
      setTotpVerifyError('Please enter the full 6-digit code from your Authenticator app.');
      soundFx.playError();
      return;
    }
    setIsConfirmingTotp(true);
    setTotpVerifyError(null);
    try {
      const isValid = await verifyTotpOnServer(clean, totpSetupSecret);
      if (isValid) {
        soundFx.playSuccess();
        const nextSecurity: BusinessSecuritySettings = {
          ...securitySettings,
          twoFactorEnabled: true,
          twoFactorMethod: 'totp',
          totpSecret: totpSetupSecret,
          totpEnabled: true,
          totpEnrolledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updateBusinessProfile({ securitySettings: nextSecurity });
        setIsSettingUpTotp(false);
        setTotpVerifyCode('');
        showToast('Authenticator App successfully paired & 2FA activated!', 'success');
      } else {
        soundFx.playError();
        setTotpVerifyError('Invalid 6-digit code. Please verify the code shown on your phone.');
      }
    } catch (err: any) {
      soundFx.playError();
      setTotpVerifyError(err?.message || 'Verification failed. Try again.');
    } finally {
      setIsConfirmingTotp(false);
    }
  };

  const handleRemoveTotp = () => {
    const nextSecurity: BusinessSecuritySettings = {
      ...securitySettings,
      totpEnabled: false,
      totpSecret: undefined,
      totpEnrolledAt: undefined,
      twoFactorMethod: 'email_otp',
      updatedAt: new Date().toISOString(),
    };
    updateBusinessProfile({ securitySettings: nextSecurity });
    setIsSettingUpTotp(false);
    showToast('Authenticator App removed. Defaulting to Email OTP.', 'info');
  };

  const handleToggle2Fa = (enabled: boolean) => {
    const nextSecurity: BusinessSecuritySettings = {
      ...securitySettings,
      twoFactorEnabled: enabled,
      twoFactorMethod: securitySettings?.twoFactorMethod || (isTotpPaired ? 'totp' : 'email_otp'),
      updatedAt: new Date().toISOString(),
    };
    updateBusinessProfile({ securitySettings: nextSecurity });
    showToast(enabled ? '2-Step Verification enabled on login.' : '2-Step Verification disabled.', 'info');
  };

  const handleUpdate2FaMethod = (method: 'email_otp' | 'totp' | 'both') => {
    if (method === 'totp' && !isTotpPaired) {
      handleStartTotpEnrollment();
      return;
    }
    const nextSecurity: BusinessSecuritySettings = {
      ...securitySettings,
      twoFactorEnabled: true,
      twoFactorMethod: method,
      updatedAt: new Date().toISOString(),
    };
    updateBusinessProfile({ securitySettings: nextSecurity });
    showToast(
      `2-Step Verification method set to ${
        method === 'both' ? 'Email OTP or Authenticator' : method === 'totp' ? 'Authenticator App (TOTP)' : 'Email Security OTP'
      }.`,
      'success'
    );
  };

  const handleToggleStaffEnforce = (enforce: boolean) => {
    const nextSecurity: BusinessSecuritySettings = {
      ...securitySettings,
      enforceForStaff: enforce,
      updatedAt: new Date().toISOString(),
    };
    updateBusinessProfile({ securitySettings: nextSecurity });
    showToast(
      enforce
        ? '2-Step Verification will now be enforced for staff logins.'
        : 'Staff logins return to standard PIN verification.',
      'info'
    );
  };

  const handleCopySecret = () => {
    if (navigator.clipboard && totpSetupSecret) {
      navigator.clipboard.writeText(totpSetupSecret);
      setHasCopiedSecret(true);
      setTimeout(() => setHasCopiedSecret(false), 2000);
      showToast('Secret key copied to clipboard', 'info');
    }
  };

  const handleSelectNavItem = (item: NavItemConfig) => {
    if (item.id === 'pricing') {
      onClose?.();
      openPricingPage();
      return;
    }
    setActiveTab(item.id);
  };

  const filteredBranches = (locations || []).filter(
    (l) =>
      l.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(branchSearch.toLowerCase()) ||
      l.city.toLowerCase().includes(branchSearch.toLowerCase())
  );

  const isSuperAdminInspectingMerchant = Boolean(
    isSuperAdmin &&
      currentBusiness &&
      currentBusiness.ownerEmail &&
      currentBusiness.ownerEmail.toLowerCase().trim() !== (currentUser?.email || SUPER_ADMIN_EMAIL).toLowerCase().trim()
  );

  const activeNavMeta = ALL_NAV_ITEMS.find((item) => item.id === activeTab) || ALL_NAV_ITEMS[0];
  const isPaystackVerified = Boolean(
    currentBusiness?.paystackSubaccountCode?.startsWith('ACCT_') &&
      currentBusiness?.paystackSubaccountStatus === 'verified'
  );
  const activeTaxRuleCount = currentBusiness?.taxSettings?.rules?.filter((r) => r.isActive).length ?? 3;
  const loyaltyPointsPerUnit = currentBusiness?.loyaltySettings?.pointsPerCurrencyUnit || 10;

  const getSidebarTrailingMeta = (itemId: BusinessSettingsTabId): React.ReactNode => {
    switch (itemId) {
      case 'branches':
        return <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">{locations.length}</span>;
      case 'billing':
        return (
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate max-w-[80px]">
            {formatTierDisplayName(normalizePlanTier(currentBusiness?.plan, currentBusiness?.subscription?.planId))}
          </span>
        );
      case 'settlement':
        return (
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isPaystackVerified ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
            title={isPaystackVerified ? 'Paystack verified' : 'Not linked'}
          />
        );
      case 'tax':
        return <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">{activeTaxRuleCount}</span>;
      case 'loyalty':
        return <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">{loyaltyPointsPerUnit} pts</span>;
      case 'accounts':
        return <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">{systemUsers.length}</span>;
      case 'hardware':
        return (
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {autoPrintReceipt ? 'Auto' : 'Manual'}
          </span>
        );
      case 'pricing':
        return <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div
      id="business-profile-settings-view"
      className="flex-1 h-full w-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-w-0 font-sans"
    >
      {/* Unified Top Workspace Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Settings</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span>{activeNavMeta.group}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{activeNavMeta.label}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-0.5">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                {currentBusiness?.name || 'Store Settings'}
              </h2>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
              <button
                type="button"
                id="modal-header-plan-pricing-link"
                onClick={() => {
                  onClose?.();
                  openPricingPage();
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline transition cursor-pointer"
                title="View POS Packages & Plans on our Pricing Page"
              >
                <span>
                  {formatTierDisplayName(
                    normalizePlanTier(currentBusiness?.plan, currentBusiness?.subscription?.planId)
                  )}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              {isSuperAdmin && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Super-Admin</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onClose && (
              <button
                id="close-business-settings-btn"
                type="button"
                onClick={() => {
                  onClose();
                  setIsBusinessSettingsOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer text-xs font-medium"
                title="Return to Register"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Register</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Super Admin Tenant Inspection Alert Bar */}
      {isSuperAdminInspectingMerchant && (
        <div
          id="superadmin-merchant-inspection-bar"
          className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-amber-900 dark:text-amber-200 shrink-0"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold">Tenant Inspection Mode:</span> Viewing merchant store{' '}
              <span className="font-semibold underline">{currentBusiness?.name}</span> (Owned by{' '}
              {currentBusiness?.ownerName || 'Merchant'} &lt;{currentBusiness?.ownerEmail}&gt;) as Super Admin{' '}
              <span className="font-medium">&lt;{currentUser?.email || SUPER_ADMIN_EMAIL}&gt;</span>.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveBusinessId('biz-upfront');
              showToast('Switched active business to Upfront Retail Solutions', 'info');
            }}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Switch back to Upfront Retail Solutions"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Switch to Upfront Retail Solutions</span>
          </button>
        </div>
      )}

      {/* Split Workspace: Grouped Left Rail + Scrollable Content Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Desktop Grouped Left Sidebar */}
        <aside
          aria-label="Store settings sections"
          className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto modal-scrollbar p-4 space-y-5"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.label}
              </div>
              <nav className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={item.domId}
                      type="button"
                      onClick={() => handleSelectNavItem(item)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition cursor-pointer ${
                        isActive
                          ? item.isDanger
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-semibold border border-rose-200/80 dark:border-rose-800/60'
                            : 'bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold border border-blue-200/80 dark:border-blue-800/60'
                          : item.isDanger
                          ? 'text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 border border-transparent font-medium'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive
                              ? item.isDanger
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-blue-600 dark:text-blue-400'
                              : item.isDanger
                              ? 'text-rose-500/80 dark:text-rose-400/80'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="shrink-0">{getSidebarTrailingMeta(item.id)}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </aside>

        {/* Mobile / Tablet Compact Switcher */}
        <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 shrink-0 space-y-2">
          <div className="flex items-center gap-2">
            <label htmlFor="mobile-settings-section-select" className="sr-only">
              Select settings section
            </label>
            <select
              id="mobile-settings-section-select"
              value={activeTab}
              onChange={(e) => {
                const chosen = ALL_NAV_ITEMS.find((i) => i.id === e.target.value);
                if (chosen) handleSelectNavItem(chosen);
              }}
              className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {NAV_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto modal-scrollbar pb-0.5">
            {ALL_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`${item.domId}-mobile`}
                  type="button"
                  onClick={() => handleSelectNavItem(item)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition cursor-pointer shrink-0 ${
                    isActive
                      ? item.isDanger
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-800'
                        : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent font-medium'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 modal-scrollbar overscroll-contain">
          {/* ========================================================= */}
          {/* TAB 1: BUSINESS PROFILE */}
          {/* ========================================================= */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <SettingsSectionHeader
                  title="Legal Entity & Store Information"
                  description="Configure your official business name, fiscal tax identifier, and reporting currency."
                  meta={
                    <span>
                      Tenant ID: <span className="font-mono text-slate-700 dark:text-slate-300">{currentBusiness?.id}</span>
                    </span>
                  }
                />

                <form onSubmit={handleSaveProfile} className="space-y-5 mt-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Business Legal / Trading Name
                      </label>
                      <input
                        id="input-business-name"
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Upfront Retail Solutions Ltd"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Business Short Code
                      </label>
                      <input
                        id="input-business-code"
                        type="text"
                        value={profileCode}
                        onChange={(e) => setProfileCode(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        placeholder="e.g., UPFR"
                        maxLength={6}
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                          Tax / KRA PIN / VAT Number
                        </label>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Digitax eTIMS
                        </span>
                      </div>
                      <input
                        id="input-business-tax"
                        type="text"
                        value={profileTaxNumber}
                        onChange={(e) => setProfileTaxNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        placeholder="e.g., P051234567Z"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Primary Store Currency
                      </label>
                      <select
                        id="select-business-currency"
                        value={profileCurrency}
                        onChange={(e) => {
                          const nextCur = e.target.value;
                          if (nextCur !== 'KES' && nextCur !== currentBusiness?.currency && !requireCapability('multiCurrency')) {
                            return;
                          }
                          setProfileCurrency(nextCur);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="KES">KES - Kenyan Shilling (KSh)</option>
                        <option value="USD">USD - United States Dollar ($)</option>
                        <option value="EUR">EUR - Euro (€)</option>
                        <option value="GBP">GBP - British Pound (£)</option>
                        <option value="TZS">TZS - Tanzanian Shilling</option>
                        <option value="UGX">UGX - Ugandan Shilling</option>
                      </select>
                    </div>
                  </div>

                  {/* Owner & Account Details */}
                  <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {isSuperAdminInspectingMerchant ? 'Merchant Store Owner Account' : 'Registered Owner Account'}
                      </h4>
                      {isSuperAdminInspectingMerchant && (
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                          Tenant Owner (External Merchant)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-semibold flex items-center justify-center text-xs shrink-0">
                          {currentBusiness?.ownerName ? currentBusiness.ownerName.substring(0, 2).toUpperCase() : 'BO'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {currentBusiness?.ownerName || 'Business Administrator'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {currentBusiness?.ownerEmail || 'upfrontretaile@gmail.com'}
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Google OAuth Verified
                      </span>
                    </div>

                    {isSuperAdminInspectingMerchant && (
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-amber-900 dark:text-amber-200 font-medium">
                          Active Super-Admin Session: <strong>{currentUser?.email || SUPER_ADMIN_EMAIL}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBusinessId('biz-upfront');
                            showToast('Switched back to Upfront Retail Solutions', 'info');
                          }}
                          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Return to Upfront Retail Solutions</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      id="save-business-profile-btn"
                      type="submit"
                      disabled={isSavingProfile}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Store Branding Logo Card (Standardized 4:1 Canvas Upload -> Firestore) */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <SettingsSectionHeader
                  title="Store Branding Logo"
                  description="Upload a logo from your device. Images are automatically standardized to a 4:1 aspect ratio (400 × 100 px) via canvas and synced to your business record in Firestore."
                  meta={
                    <span className="font-mono tabular-nums text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/70 text-blue-700 dark:text-blue-300">
                      400 × 100 px · 4:1
                    </span>
                  }
                />

                <input
                  id="business-brand-logo-input"
                  ref={brandLogoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {brandLogoError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-3 flex items-start gap-2 text-xs text-rose-800 dark:text-rose-200"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <span className="flex-1 font-medium">{brandLogoError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Upload business logo from device (standardized to 400 by 100 px, 4:1)"
                    onClick={() => !isUploadingBrandLogo && brandLogoInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !isUploadingBrandLogo) {
                        e.preventDefault();
                        brandLogoInputRef.current?.click();
                      }
                    }}
                    className="md:col-span-7 group relative aspect-[4/1] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-3 overflow-hidden cursor-pointer transition focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    {isUploadingBrandLogo ? (
                      <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Resizing to 4:1 &amp; saving...</span>
                      </div>
                    ) : currentBusiness?.brandingSettings?.logoBase64 ? (
                      <>
                        <img
                          src={currentBusiness.brandingSettings.logoBase64}
                          alt={`${currentBusiness.name} Logo`}
                          className="max-h-full max-w-full object-contain"
                        />
                        <div className="absolute inset-0 bg-slate-950/55 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-medium">
                          <UploadCloud className="w-4 h-4" />
                          <span>Click to replace logo</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 text-center">
                        <ImageIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Click to pick an image from your device
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          PNG, JPG, WebP, SVG · Auto-fitted to 4:1
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-5 flex flex-col justify-between gap-3">
                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {currentBusiness?.brandingSettings?.logoBase64
                          ? currentBusiness.brandingSettings.logoFileName || 'Custom Business Logo'
                          : 'No custom logo uploaded'}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {currentBusiness?.brandingSettings?.logoBase64
                          ? `${currentBusiness.brandingSettings.width || 400} × ${
                              currentBusiness.brandingSettings.height || 100
                            } px · ${currentBusiness.brandingSettings.aspectRatio || '4:1'} · ${estimateAssetSizeKb(
                              currentBusiness.brandingSettings.logoBase64
                            )} KB`
                          : 'Displayed on printed customer receipts'}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        id="btn-upload-business-logo"
                        type="button"
                        disabled={isUploadingBrandLogo}
                        onClick={() => brandLogoInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>
                          {currentBusiness?.brandingSettings?.logoBase64 ? 'Replace Logo' : 'Upload Logo'}
                        </span>
                      </button>

                      {currentBusiness?.brandingSettings?.logoBase64 && (
                        <button
                          id="btn-remove-business-logo"
                          type="button"
                          disabled={isUploadingBrandLogo}
                          onClick={handleRemoveBrandLogo}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 transition cursor-pointer whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tenant Architecture Summary Strip */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Multi-Store Architecture
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Row-level tenant isolation active across all registered POS terminals.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active Tenant
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
                  <div className="px-6 py-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Store Branches</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                      {locations.length}
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Staff Accounts</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                      {systemUsers.length}
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Credential Hashing</div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5 font-mono">
                      Bcrypt 10x
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: STORE BRANCHES */}
          {/* ========================================================= */}
          {activeTab === 'branches' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                <SettingsSectionHeader
                  title="Branch & Store Locations"
                  description="Register physical stores, retail kiosks, and define terminal identifiers."
                  meta={<span>{locations.length} active locations</span>}
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search branches..."
                        value={branchSearch}
                        onChange={(e) => setBranchSearch(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40 sm:w-48"
                      />
                      {!isAddingBranch && (
                        <button
                          id="btn-register-new-branch"
                          type="button"
                          onClick={() => {
                            const maxBranches = isSuperAdmin ? -1 : entitlements.limits.maxBranches;
                            if (isQuotaAtOrAboveLimit(locations.length, maxBranches)) {
                              openUpgradePrompt({
                                title: 'Branch Limit Reached',
                                description: `Your ${entitlements.tierName} plan supports up to ${maxBranches} store ${
                                  maxBranches === 1 ? 'branch' : 'branches'
                                }. Existing branches remain active, and upgrading unlocks additional locations.`,
                                requiredTier: getRequiredTierForBranchCount(locations.length + 1),
                                featureLabel: 'Multi-Branch Store Locations',
                                quotaMetric: {
                                  label: 'Store Branches',
                                  used: locations.length,
                                  limit: maxBranches,
                                },
                              });
                              return;
                            }
                            cancelBranchForm();
                            setIsAddingBranch(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                        >
                          {!isSuperAdmin && isQuotaAtOrAboveLimit(locations.length, entitlements.limits.maxBranches) ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          <span>Register Branch</span>
                        </button>
                      )}
                    </div>
                  }
                />

                {/* Branch Add / Edit Form */}
                {isAddingBranch && (
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-blue-500/40 p-5">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {editingBranchId ? 'Edit Store Branch' : 'Register New Store Branch'}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={cancelBranchForm}
                        className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <form onSubmit={handleSaveBranch} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Branch Name *
                          </label>
                          <input
                            id="branch-input-name"
                            type="text"
                            value={branchName}
                            onChange={(e) => setBranchName(e.target.value)}
                            placeholder="e.g., Westlands Mall Branch"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Branch Code *
                          </label>
                          <input
                            id="branch-input-code"
                            type="text"
                            value={branchCode}
                            onChange={(e) => setBranchCode(e.target.value)}
                            placeholder="e.g., WST-02"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono uppercase text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            City / Region *
                          </label>
                          <input
                            id="branch-input-city"
                            type="text"
                            value={branchCity}
                            onChange={(e) => setBranchCity(e.target.value)}
                            placeholder="e.g., Nairobi"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Physical Address / Street
                          </label>
                          <input
                            id="branch-input-address"
                            type="text"
                            value={branchAddress}
                            onChange={(e) => setBranchAddress(e.target.value)}
                            placeholder="e.g., Ground Floor, Unit 14"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Branch Contact Phone
                          </label>
                          <input
                            id="branch-input-phone"
                            type="tel"
                            value={branchPhone}
                            onChange={(e) => setBranchPhone(e.target.value)}
                            placeholder="e.g., +254 712 345 678"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Terminal Station Name
                          </label>
                          <input
                            id="branch-input-terminal"
                            type="text"
                            value={branchTerminal}
                            onChange={(e) => setBranchTerminal(e.target.value)}
                            placeholder="e.g., Terminal 02 - POS Register"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={cancelBranchForm}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          id="btn-submit-save-branch"
                          type="submit"
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                        >
                          {editingBranchId ? 'Update Branch' : 'Create Store Branch'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Branches Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBranches.map((loc) => {
                    const isCurrentActive = currentLocation?.id === loc.id;
                    const isOnlyBranch = locations.length <= 1;

                    return (
                      <div
                        key={loc.id}
                        id={`branch-card-${loc.id}`}
                        className={`rounded-xl border p-4 transition flex flex-col justify-between ${
                          isCurrentActive
                            ? 'border-blue-600 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
                                  {loc.code}
                                </span>
                                <span className="text-slate-300 dark:text-slate-700">·</span>
                                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                                  {loc.name}
                                </h4>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">
                                  {loc.city}
                                  {loc.address ? ` · ${loc.address}` : ''}
                                </span>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Online
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs py-2.5 border-y border-slate-100 dark:border-slate-800 my-2">
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 block text-[11px]">
                                Terminal Station
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {loc.terminalName || 'Main POS Terminal'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 block text-[11px]">
                                Contact Phone
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                                {loc.phone || 'Not recorded'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div>
                            {!isCurrentActive ? (
                              <button
                                id={`switch-register-btn-${loc.id}`}
                                type="button"
                                onClick={() => setCurrentLocationId(loc.id)}
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                Set as Active Terminal
                              </button>
                            ) : (
                              <span className="text-xs text-blue-700 dark:text-blue-400 font-semibold inline-flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Active Register
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              id={`edit-branch-btn-${loc.id}`}
                              type="button"
                              onClick={() => startEditBranch(loc)}
                              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="Edit branch details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              id={`delete-branch-btn-${loc.id}`}
                              type="button"
                              onClick={() => deleteLocation(loc.id)}
                              disabled={isOnlyBranch}
                              className={`p-1.5 rounded-lg transition ${
                                isOnlyBranch
                                  ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                  : 'text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer'
                              }`}
                              title={
                                isOnlyBranch
                                  ? 'Cannot delete: A business profile must have at least one active branch'
                                  : 'Delete / Remove branch'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: BILLING HISTORY & SUBSCRIPTION RECEIPTS */}
          {/* ========================================================= */}
          {activeTab === 'billing' && (
            <div className="max-w-4xl mx-auto">
              <BillingHistoryPanel />
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: PAYSTACK SETTLEMENT SUBACCOUNT */}
          {/* ========================================================= */}
          {activeTab === 'settlement' && currentBusiness && (
            <div className="max-w-4xl mx-auto">
              <PaystackSubaccountPanel targetBusiness={currentBusiness} />
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: TAXES & VAT/GST DYNAMIC ENGINE */}
          {/* ========================================================= */}
          {activeTab === 'tax' && (
            <div className="max-w-4xl mx-auto">
              <TaxManagementPanel />
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: LOYALTY POINTS & REWARDS */}
          {/* ========================================================= */}
          {activeTab === 'loyalty' && (
            <div className="max-w-4xl mx-auto">
              <LoyaltySettingsPanel />
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: POS PACKAGES & PRICING ARCHITECTURE */}
          {/* ========================================================= */}
          {activeTab === 'pricing' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center max-w-lg mx-auto my-6 space-y-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700">
                <Tag className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  POS Packages & Pricing Plans
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  All POS package tiers, M-Pesa billing options, branch sliders, and feature comparisons are centralized on our dedicated Pricing Page.
                </p>
              </div>
              <button
                type="button"
                id="settings-open-pricing-page-cta"
                onClick={() => {
                  onClose?.();
                  openPricingPage();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer"
              >
                <span>Open Pricing & Packages Page</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: ACCOUNTS & ROLE-BASED ACCESS CONTROL (RBAC) */}
          {/* ========================================================= */}
          {activeTab === 'accounts' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* RBAC Overview & Permission Matrix */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                <SettingsSectionHeader
                  title="Role-Based Access Control (RBAC)"
                  description="Enforce principle-of-least-privilege across store terminals, supervisors, and inventory clerks."
                  actions={
                    <button
                      type="button"
                      onClick={() => setShowRoleMatrix(!showRoleMatrix)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                    >
                      <span>{showRoleMatrix ? 'Hide Permission Matrix' : 'View Permission Matrix'}</span>
                      {showRoleMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  }
                />

                {/* Clean 5-Column Role Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 border border-slate-200 dark:border-slate-800 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 text-xs overflow-hidden">
                  <div className="p-3">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">Owner</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Full Tenant Control</span>
                  </div>
                  <div className="p-3">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">Manager</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Inventory & Staff</span>
                  </div>
                  <div className="p-3">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">Supervisor</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Voids & Shift Drops</span>
                  </div>
                  <div className="p-3">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">Cashier</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Sales & Receipts</span>
                  </div>
                  <div className="p-3 col-span-2 sm:col-span-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">Inv. Clerk</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Stock & Transfers</span>
                  </div>
                </div>

                {/* Expanded Permission Matrix */}
                {showRoleMatrix && (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                          <th className="p-2.5">Capability / Operation</th>
                          <th className="p-2.5 text-center">Owner</th>
                          <th className="p-2.5 text-center">Manager</th>
                          <th className="p-2.5 text-center">Supervisor</th>
                          <th className="p-2.5 text-center">Cashier</th>
                          <th className="p-2.5 text-center">Inv. Clerk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        <tr>
                          <td className="p-2.5 font-medium">POS Register Sales & Payments</td>
                          <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                          <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                          <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                          <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                          <td className="p-2.5 text-center text-slate-300 dark:text-slate-700">-</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-medium">Inventory Adjustment & Stock Counting</td>
                          <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                          <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                          <td className="p-2.5 text-center text-slate-300 dark:text-slate-700">-</td>
                          <td className="p-2.5 text-center text-slate-300 dark:text-slate-700">-</td>
                          <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-medium">Branch Creation & Removal / Deletion</td>
                          <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                          <td className="p-2.5 text-center text-slate-300 dark:text-slate-700">-</td>
                          <td className="p-2.5 text-center text-slate-300 dark:text-slate-700">-</td>
                          <td className="p-2.5 text-center text-slate-300 dark:text-slate-700">-</td>
                          <td className="p-2.5 text-center text-slate-300 dark:text-slate-700">-</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-medium">Staff Account & PIN Provisioning</td>
                          <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                          <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                          <td className="p-2.5 text-center text-slate-300 dark:text-slate-700">-</td>
                          <td className="p-2.5 text-center text-slate-300 dark:text-slate-700">-</td>
                          <td className="p-2.5 text-center text-slate-300 dark:text-slate-700">-</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-medium">Price Overrides & Transaction Voids</td>
                          <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                          <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                          <td className="p-2.5 text-center text-emerald-600 dark:text-emerald-400 font-bold">✓</td>
                          <td className="p-2.5 text-center text-slate-300 dark:text-slate-700">-</td>
                          <td className="p-2.5 text-center text-slate-300 dark:text-slate-700">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* User Accounts Roster */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                <SettingsSectionHeader
                  title="User Accounts Roster"
                  description={`Accounts authorized to sign into terminals and registers for ${currentBusiness?.name || 'this store'}.`}
                  meta={<span>{systemUsers.length} accounts</span>}
                  actions={
                    !isAddingUser ? (
                      <button
                        id="btn-provision-account"
                        type="button"
                        onClick={() => {
                          const maxStaff = isSuperAdmin ? -1 : entitlements.limits.maxStaffUsers;
                          if (isQuotaAtOrAboveLimit(systemUsers.length, maxStaff)) {
                            openUpgradePrompt({
                              title: 'Staff Account Limit Reached',
                              description: `Your ${entitlements.tierName} plan supports up to ${maxStaff} staff ${
                                maxStaff === 1 ? 'account' : 'accounts'
                              }. Existing staff remain active, and upgrading adds more team seats.`,
                              requiredTier: getRequiredTierForStaffCount(systemUsers.length + 1),
                              featureLabel: 'Additional Staff Seats',
                              quotaMetric: {
                                label: 'Staff Accounts',
                                used: systemUsers.length,
                                limit: maxStaff,
                              },
                            });
                            return;
                          }
                          cancelUserForm();
                          setIsAddingUser(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                      >
                        {!isSuperAdmin && isQuotaAtOrAboveLimit(systemUsers.length, entitlements.limits.maxStaffUsers) ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Provision Account</span>
                      </button>
                    ) : undefined
                  }
                />

                {/* Account Add / Edit Form */}
                {isAddingUser && (
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-blue-500/40 p-5">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {editingUserId ? 'Edit Account Permissions' : 'Provision New System User'}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={cancelUserForm}
                        className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <form onSubmit={handleSaveUser} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Full Name *
                          </label>
                          <input
                            id="user-input-name"
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="e.g., Jane Wanjiku"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Role *
                          </label>
                          <select
                            id="user-select-role"
                            value={userRole}
                            onChange={(e) => setUserRole(e.target.value as Cashier['role'])}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="cashier">Cashier</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="manager">Store Manager</option>
                            <option value="inventory_clerk">Inventory Clerk</option>
                            {isSuperAdmin && <option value="business_owner">Business Owner</option>}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Login Username / ID
                          </label>
                          <input
                            id="user-input-username"
                            type="text"
                            value={userUsername}
                            onChange={(e) => setUserUsername(e.target.value)}
                            placeholder="e.g., jwanjiku"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 lowercase"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {editingUserId ? 'New PIN (Leave blank to keep)' : 'Terminal PIN (4+ digits) *'}
                          </label>
                          <input
                            id="user-input-pin"
                            type="password"
                            maxLength={6}
                            value={userPin}
                            onChange={(e) => setUserPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-center tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required={!editingUserId}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Branch Assignment
                          </label>
                          <select
                            id="user-select-branch"
                            value={userAssignedLocId}
                            onChange={(e) => setUserAssignedLocId(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">All Branches (Roaming Access)</option>
                            {locations.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name} ({loc.city})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={cancelUserForm}
                          className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          id="btn-submit-save-user"
                          type="submit"
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                        >
                          {editingUserId ? 'Update Account' : 'Provision User'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Accounts Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">User</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Username</th>
                        <th className="p-3">Assigned Branch</th>
                        <th className="p-3">PIN Security</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {systemUsers.map((u) => {
                        const assignedLoc = locations.find((l) => l.id === u.assignedLocationId);
                        const isSelf = currentUser?.id === u.id || currentUser?.username === u.username;

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-8 h-8 rounded-lg text-white font-semibold flex items-center justify-center text-xs shrink-0 ${
                                    u.avatarColor || 'bg-slate-700'
                                  }`}
                                >
                                  {u.initials || u.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                    <span>{u.name}</span>
                                    {isSelf && (
                                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                        · You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                                    {u.code}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span
                                className={`text-xs font-medium capitalize ${
                                  u.role === 'business_owner'
                                    ? 'text-purple-700 dark:text-purple-400'
                                    : u.role === 'manager'
                                    ? 'text-blue-700 dark:text-blue-400'
                                    : u.role === 'supervisor'
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-emerald-700 dark:text-emerald-400'
                                }`}
                              >
                                {u.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{u.username}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {assignedLoc ? (
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {assignedLoc.name}
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">All Branches</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                <Lock className="w-3 h-3" />
                                Bcrypt Hashed
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEditUser(u)}
                                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="Edit user"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteSystemUser(u.id)}
                                  disabled={isSelf}
                                  className={`p-1.5 rounded-lg transition ${
                                    isSelf
                                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                      : 'text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer'
                                  }`}
                                  title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: CREDENTIAL & SECURITY SETTINGS */}
          {/* ========================================================= */}
          {activeTab === 'credentials' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Personal Active User PIN Update */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                <SettingsSectionHeader
                  title="Your Terminal Access Credentials"
                  description="Update the numeric PIN used to unlock register terminals and authorize supervisor actions."
                  meta={
                    <span className="capitalize">
                      {currentUser?.name} · {currentUser?.role?.replace('_', ' ')}
                    </span>
                  }
                />

                <div className="py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 mr-1.5">Signed in as:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{currentUser?.name}</span>{' '}
                    <span className="font-mono">({currentUser?.email || currentUser?.username})</span>
                  </div>
                  <span className="font-mono text-[11px] uppercase font-semibold text-slate-700 dark:text-slate-300">
                    {currentUser?.role}
                  </span>
                </div>

                <form onSubmit={handleUpdateCredentials} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        New 4-Digit PIN
                      </label>
                      <div className="relative">
                        <input
                          id="input-new-terminal-pin"
                          type={showPin ? 'text' : 'password'}
                          maxLength={6}
                          value={newTerminalPin}
                          onChange={(e) => setNewTerminalPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••"
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-center tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                          aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Confirm New PIN
                      </label>
                      <input
                        id="input-confirm-terminal-pin"
                        type={showPin ? 'text' : 'password'}
                        maxLength={6}
                        value={confirmTerminalPin}
                        onChange={(e) => setConfirmTerminalPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-center tracking-widest text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      id="save-new-pin-btn"
                      type="submit"
                      disabled={isUpdatingCredentials}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{isUpdatingCredentials ? 'Hashing with Bcrypt...' : 'Update Terminal PIN'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Two-Step Verification (2FA) & Authenticator App (TOTP) */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                <SettingsSectionHeader
                  title="Two-Step Verification (2FA)"
                  description="Protect store sign-ins with Email OTP or a time-based Authenticator App."
                  meta={
                    <span
                      className={
                        is2FaEnabled
                          ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                          : 'text-slate-500 dark:text-slate-400'
                      }
                    >
                      {is2FaEnabled ? 'Protected' : 'Off'}
                    </span>
                  }
                  actions={
                    <button
                      type="button"
                      onClick={() => handleToggle2Fa(!is2FaEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        is2FaEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={is2FaEnabled}
                      aria-label="Toggle Two-Step Verification"
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          is2FaEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  }
                />

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Primary Verification Method
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => handleUpdate2FaMethod('email_otp')}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          current2FaMethod === 'email_otp'
                            ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Email OTP</span>
                          </div>
                          {current2FaMethod === 'email_otp' && (
                            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          4-digit code sent to registered Gmail.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdate2FaMethod('totp')}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          current2FaMethod === 'totp'
                            ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              Authenticator App
                            </span>
                          </div>
                          {current2FaMethod === 'totp' && (
                            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          6-digit code from Google/Microsoft Authenticator.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdate2FaMethod('both')}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          current2FaMethod === 'both'
                            ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              Both / Either
                            </span>
                          </div>
                          {current2FaMethod === 'both' && (
                            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          Prompt with choice to use Email or App.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Authenticator App Pairing Sub-panel */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          Authenticator App (TOTP) Status
                        </span>
                      </div>
                      {isTotpPaired ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Paired &amp; Active
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Not Paired</span>
                      )}
                    </div>

                    {isTotpPaired && !isSettingUpTotp ? (
                      <div className="space-y-3 pt-1">
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          Your store owner account is paired with an Authenticator app (enrolled{' '}
                          {securitySettings?.totpEnrolledAt
                            ? new Date(securitySettings.totpEnrolledAt).toLocaleDateString()
                            : 'Active'}
                          ).
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleStartTotpEnrollment}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200 text-xs transition cursor-pointer"
                          >
                            Re-pair / Scan New Code
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveTotp}
                            className="px-3 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 font-medium text-xs transition cursor-pointer"
                          >
                            Remove Authenticator
                          </button>
                        </div>
                      </div>
                    ) : isSettingUpTotp ? (
                      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                            <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span>Pair with Authenticator App</span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => setIsSettingUpTotp(false)}
                            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          {totpSetupQrUrl && (
                            <div className="bg-white p-2 rounded-xl border border-slate-200 shrink-0 text-center">
                              <img
                                src={totpSetupQrUrl}
                                alt="Authenticator App QR Code"
                                className="w-36 h-36 mx-auto rounded-lg"
                              />
                              <span className="text-[10px] text-slate-500 font-medium block mt-1">
                                Scan with phone camera
                              </span>
                            </div>
                          )}

                          <div className="space-y-2.5 flex-1 text-xs">
                            <div className="space-y-1">
                              <strong className="text-slate-900 dark:text-slate-100 block font-semibold">
                                1. Scan QR Code
                              </strong>
                              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                                Open Google Authenticator, Microsoft Authenticator, or Authy and tap{' '}
                                <strong>+ Add Account</strong> &gt; <strong>Scan QR Code</strong>.
                              </p>
                            </div>

                            <div className="space-y-1">
                              <strong className="text-slate-900 dark:text-slate-100 block font-semibold">
                                Or enter key manually:
                              </strong>
                              <div className="flex flex-wrap items-center gap-2">
                                <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 tracking-wider select-all">
                                  {totpSetupSecret}
                                </code>
                                <button
                                  type="button"
                                  onClick={handleCopySecret}
                                  className="px-2 py-1 text-[11px] font-medium rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>{hasCopiedSecret ? 'Copied' : 'Copy'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <form
                          onSubmit={handleConfirmTotpCode}
                          className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-3"
                        >
                          <label className="block text-xs font-medium text-slate-800 dark:text-slate-200">
                            2. Enter the 6-digit code shown in your Authenticator app to confirm:
                          </label>

                          <div className="flex items-center gap-2 max-w-xs">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={6}
                              value={totpVerifyCode}
                              onChange={(e) => {
                                setTotpVerifyCode(e.target.value.replace(/\D/g, ''));
                                setTotpVerifyError(null);
                              }}
                              placeholder="000000"
                              className="w-36 px-3 py-2 text-center text-base font-bold tracking-widest font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              required
                            />
                            <button
                              type="submit"
                              disabled={isConfirmingTotp || totpVerifyCode.length !== 6}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
                            >
                              {isConfirmingTotp ? 'Verifying...' : 'Confirm & Activate'}
                            </button>
                          </div>

                          {totpVerifyError && (
                            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>{totpVerifyError}</span>
                            </p>
                          )}
                        </form>
                      </div>
                    ) : (
                      <div className="space-y-2.5 pt-1">
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          Pair Google Authenticator, Microsoft Authenticator, or Authy to generate offline time-based 6-digit codes.
                        </p>
                        <button
                          type="button"
                          onClick={handleStartTotpEnrollment}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>Pair Authenticator App Now</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Staff Logins Enforce Checkbox */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                    <input
                      id="checkbox-enforce-staff-2fa"
                      type="checkbox"
                      checked={Boolean(securitySettings?.enforceForStaff)}
                      onChange={(e) => handleToggleStaffEnforce(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="checkbox-enforce-staff-2fa" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <strong className="block text-slate-900 dark:text-slate-100 font-semibold">
                        Enforce 2-Step Verification for POS Terminal Staff
                      </strong>
                      <span className="text-slate-500 dark:text-slate-400">
                        When enabled, cashiers logging into shifts require an authorization code dispatched to the store owner Gmail or manager Authenticator app.
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Security Diagnostics & Policies */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Cryptographic & Multi-Tenant Diagnostics
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Cryptographic Salt Algorithm</span>
                    </div>
                    <span className="font-mono text-slate-600 dark:text-slate-400">Bcrypt (10 Rounds)</span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                      <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Database Tenant Isolation</span>
                    </div>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Enforced by Firestore RLS
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                      <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Super-Admin Audit Trail</span>
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      Logged on every branch &amp; user mutation
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: APPEARANCE & RETAIL ACCENT PALETTES */}
          {/* ========================================================= */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                <SettingsSectionHeader
                  title="Display Theme & Retail Lighting"
                  description="Optimize POS terminal contrast for bright daytime counters or low-glare evening shifts."
                  meta={<span>{isDarkMode ? 'Low-Glare Dark Theme' : 'High-Visibility Light Theme'}</span>}
                />

                {/* Light / Dark Mode Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    id="settings-theme-light-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (isDarkMode) toggleDarkMode();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (isDarkMode) toggleDarkMode();
                      }
                    }}
                    className={`p-5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between select-none ${
                      !isDarkMode
                        ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                            <Sun className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Light Theme</h4>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              High ambient visibility
                            </span>
                          </div>
                        </div>
                        {!isDarkMode ? (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Select</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                        Crisp light surfaces with high contrast for standard storefronts and daytime shifts.
                      </p>
                      <div className="mt-3.5 p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] space-y-1">
                        <div className="flex justify-between font-semibold text-slate-700">
                          <span>Register Total</span>
                          <span className="text-blue-600 font-bold tabular-nums">KES 1,250.00</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Sunlit storefronts · Day shifts</div>
                      </div>
                    </div>
                  </div>

                  <div
                    id="settings-theme-dark-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!isDarkMode) toggleDarkMode();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!isDarkMode) toggleDarkMode();
                      }
                    }}
                    className={`p-5 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between select-none ${
                      isDarkMode
                        ? 'border-blue-500 bg-slate-900 text-white'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-900 hover:border-slate-400 text-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-800 text-blue-400 border border-slate-700">
                            <Moon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-white">Dim Retail Dark</h4>
                            <span className="text-[11px] text-slate-400">Night counter &amp; low glare</span>
                          </div>
                        </div>
                        {isDarkMode ? (
                          <span className="text-xs text-blue-400 font-semibold inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Select</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                        Midnight slate palette engineered for dim retail counters, bars, and evening shifts.
                      </p>
                      <div className="mt-3.5 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                        <div className="flex justify-between font-semibold text-slate-200">
                          <span>Night Total</span>
                          <span className="text-blue-400 font-bold tabular-nums">KES 1,250.00</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Anti-reflection · Barcode friendly</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operational Benefits Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 border border-slate-200 dark:border-slate-800 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 text-xs">
                  <div className="p-3.5">
                    <strong className="text-slate-900 dark:text-slate-100 block mb-0.5 font-semibold">
                      Glare Reduction
                    </strong>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Prevents bright counter glass reflections and helps barcode scanners lock faster.
                    </span>
                  </div>
                  <div className="p-3.5">
                    <strong className="text-slate-900 dark:text-slate-100 block mb-0.5 font-semibold">
                      Cashier Eye Comfort
                    </strong>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Reduces ocular strain during 8+ hour evening shifts and low-light stockrooms.
                    </span>
                  </div>
                  <div className="p-3.5">
                    <strong className="text-slate-900 dark:text-slate-100 block mb-0.5 font-semibold">
                      Local Persistence
                    </strong>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Instantly applied terminal-wide and persisted in register local storage.
                    </span>
                  </div>
                </div>

                {/* Retail Domain Accent Palettes */}
                <div id="retail-domain-palettes-section" className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-5">
                  <SettingsSectionHeader
                    title="Retail Domain Accent Palettes"
                    description="Tailor terminal accent colors to match your trade environment."
                    meta={
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{
                            backgroundColor:
                              RETAIL_THEMES.find((t) => t.id === retailTheme)?.primaryColor || '#2563eb',
                          }}
                        />
                        <span>
                          Active: {RETAIL_THEMES.find((t) => t.id === retailTheme)?.name.split(' (')[0] || 'Classic'}
                        </span>
                      </span>
                    }
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {RETAIL_THEMES.map((theme) => {
                      const isSelected = retailTheme === theme.id;
                      return (
                        <div
                          key={theme.id}
                          id={`retail-palette-card-${theme.id}`}
                          onClick={() => {
                            if (theme.id !== 'classic' && !requireCapability('customReceiptBranding')) {
                              return;
                            }
                            setRetailTheme(theme.id);
                          }}
                          className={`group p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-blue-600 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                                  style={{ background: theme.swatchGradient }}
                                >
                                  {theme.id === 'emerald' && <Leaf className="w-3.5 h-3.5" />}
                                  {theme.id === 'amber' && <Coffee className="w-3.5 h-3.5" />}
                                  {theme.id === 'burgundy' && <Sparkles className="w-3.5 h-3.5" />}
                                  {theme.id === 'industrial' && <Wrench className="w-3.5 h-3.5" />}
                                  {theme.id === 'classic' && <Building2 className="w-3.5 h-3.5" />}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">
                                    {theme.name}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {theme.subtitle}
                                  </p>
                                </div>
                              </div>

                              {isSelected && (
                                <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                              )}
                            </div>

                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                              {theme.description}
                            </p>

                            <div className="flex items-center gap-2 py-2 border-y border-slate-100 dark:border-slate-800 mb-3">
                              <div
                                className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                                style={{ backgroundColor: theme.primaryColor }}
                                title={`Primary: ${theme.primaryColor}`}
                              />
                              <div
                                className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                                style={{ backgroundColor: theme.accentColor }}
                                title={`Accent: ${theme.accentColor}`}
                              />
                              <div
                                className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                                style={{ backgroundColor: theme.highlightColor }}
                                title={`Highlight: ${theme.highlightColor}`}
                              />
                              <span className="ml-auto font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                {theme.primaryColor}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRetailTheme(theme.id);
                            }}
                            className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 dark:bg-slate-800 text-white'
                                : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Active Palette</span>
                              </>
                            ) : (
                              <span>Apply {theme.name.split(' ')[0]}</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Live POS Terminal Component Preview Strip */}
                  <div className="p-4 rounded-xl bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-blue-400" />
                        <h4 className="text-xs font-semibold text-white">Active Terminal Accent Preview</h4>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Live preview of cashier buttons, category tabs, and scan focus rings
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-950 dark:bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400 mb-1.5">Primary Register Action</div>
                        <button
                          type="button"
                          className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-blue-600 text-white flex items-center justify-center gap-1.5 tabular-nums"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Charge KES 1,840.00</span>
                        </button>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-950 dark:bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400 mb-1.5">Active Category Tab</div>
                        <div className="flex gap-1.5">
                          <span className="flex-1 text-center py-1.5 px-2 rounded-md text-xs font-semibold bg-blue-600 text-white">
                            Selected
                          </span>
                          <span className="flex-1 text-center py-1.5 px-2 rounded-md text-xs font-medium bg-slate-800 text-slate-400">
                            Inactive
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-950 dark:bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400 mb-1.5">Counter Price Label</div>
                        <div className="flex items-center justify-between p-1.5 rounded-md bg-slate-900 dark:bg-slate-950 border border-slate-800">
                          <span className="text-xs text-slate-300">Fresh Produce</span>
                          <span className="text-xs font-semibold text-blue-400 tabular-nums">KES 420.00</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-950 dark:bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400 mb-1.5">Barcode Scan Field</div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 dark:bg-slate-950 border border-blue-500 ring-2 ring-blue-500/30 text-xs text-white">
                          <span className="font-mono text-[11px] text-slate-200 tabular-nums">600123456789</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>
                        Synced with Cloud Firestore for {currentBusiness?.name || 'Current Business'}
                      </span>
                    </span>
                    <span className="font-mono text-[11px]">tenantKey: {activeBusinessId}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: HARDWARE & RECEIPT PRINTING PREFERENCES */}
          {/* ========================================================= */}
          {activeTab === 'hardware' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                <SettingsSectionHeader
                  title="Printing & Hardware Preferences"
                  description="Configure automatic thermal receipt printing, Bluetooth pairing, and paper dimensions."
                  meta={
                    <>
                      <span>Tenant: {currentBusiness?.name || 'Current Shop'}</span>
                      <span>·</span>
                      <span
                        className={
                          autoPrintReceipt
                            ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                            : 'text-slate-500 dark:text-slate-400'
                        }
                      >
                        {autoPrintReceipt ? 'Auto-Print Active' : 'Manual Print Mode'}
                      </span>
                    </>
                  }
                />

                {/* Auto-Print on Checkout */}
                <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Auto-Print on Checkout
                        </h4>
                        <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                        Automatically invokes receipt printing immediately once a transaction is authorized, skipping manual print prompts.
                      </p>
                    </div>

                    <button
                      id="settings-auto-print-switch"
                      type="button"
                      role="switch"
                      aria-checked={autoPrintReceipt}
                      onClick={toggleAutoPrintReceipt}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        autoPrintReceipt ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      title={autoPrintReceipt ? 'Disable Auto-Print' : 'Enable Auto-Print'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          autoPrintReceipt ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Dispatch Flow:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">1. Confirm Tender</span>
                    <span>→</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">2. Authorize Sale</span>
                    <span>→</span>
                    <span
                      className={`font-mono font-medium ${
                        autoPrintReceipt
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      3. {autoPrintReceipt ? 'Print Dialog Opens Automatically' : 'Receipt Modal (Manual Print)'}
                    </span>
                  </div>
                </div>

                {/* Printer Connection Architecture */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Printer Connection Architecture
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Choose how SokoPoS communicates with your receipt printer hardware.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setPrinterType('system')}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        printerType === 'system'
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            System Print Dialog
                          </span>
                          {printerType === 'system' && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Standard browser flow. Works with all OS-configured printers (AirPrint, Mopria, USB, PDF).
                        </p>
                      </div>
                      <span className="mt-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                        Universal Compatibility
                      </span>
                    </div>

                    <div
                      onClick={() => setPrinterType('bluetooth')}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        printerType === 'bluetooth'
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Direct Bluetooth (ESC/POS)
                          </span>
                          {printerType === 'bluetooth' && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Direct communication with mini thermal printers without intermediate driver apps.
                        </p>
                      </div>
                      <span className="mt-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                        Recommended for Mobile POS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conditional Direct Bluetooth Pairing */}
                {printerType === 'bluetooth' && (
                  <div className="p-4 sm:p-5 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Bluetooth className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Bluetooth Printer Pairing
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Connect your handheld 58mm or 80mm Bluetooth thermal printer.
                        </p>
                      </div>

                      <button
                        type="button"
                        id="pair-bluetooth-printer-btn"
                        onClick={() => connectBluetoothPrinter()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{bluetoothPrinterId ? 'Change Printer' : 'Pair New Printer'}</span>
                      </button>
                    </div>

                    {bluetoothPrinterName && (
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-200/70 dark:border-slate-700">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Printer className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {bluetoothPrinterName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              Active Pairing · {receiptFormat === '58mm' ? '32 Columns' : '48 Columns'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBluetoothPrinter(null, null)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                          title="Unpair Printer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Receipt Paper Format & Thermal Width */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Receipt Paper Format & Thermal Width
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select the paper roll specification matching your countertop receipt printer hardware.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div
                      onClick={() => setReceiptFormat('80mm')}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        receiptFormat === '80mm'
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            80mm Thermal (3&quot;)
                          </span>
                          {receiptFormat === '80mm' && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Standard commercial POS format (Epson TM-T88, Star Micronics, Rongta, Xprinter).
                        </p>
                      </div>
                      <span className="mt-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 block tabular-nums">
                        Full Width · 48 Columns
                      </span>
                    </div>

                    <div
                      onClick={() => setReceiptFormat('58mm')}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        receiptFormat === '58mm'
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            58mm Mini (2&quot;)
                          </span>
                          {receiptFormat === '58mm' && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Compact handheld mobile Bluetooth and portable thermal belt clip printers.
                        </p>
                      </div>
                      <span className="mt-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 block tabular-nums">
                        Narrow Slip · 32 Columns
                      </span>
                    </div>

                    <div
                      onClick={() => setReceiptFormat('standard')}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        receiptFormat === 'standard'
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Standard A4 / Letter
                          </span>
                          {receiptFormat === 'standard' && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Standard laser or inkjet full-page document invoices for B2B or trade counters.
                        </p>
                      </div>
                      <span className="mt-3 text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                        Page Invoice · PDF Export
                      </span>
                    </div>
                  </div>
                </div>

                {/* Receipt Customization & Live Interactive Thermal Preview */}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      <span>Receipt Branding, Header/Footer & Live Preview</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Customize store header notes, tax PIN, and return policies with real-time thermal receipt preview.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Inputs Form */}
                    <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          KRA eTIMS Tax PIN
                        </label>
                        <input
                          type="text"
                          value={receiptTaxPin}
                          onChange={(e) => setReceiptTaxPin(e.target.value)}
                          placeholder="e.g. P051234567X"
                          className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Custom Header Note / Greeting
                        </label>
                        <input
                          type="text"
                          value={receiptHeaderNote}
                          onChange={(e) => setReceiptHeaderNote(e.target.value)}
                          placeholder="e.g. Karibu Tena! Fresh Quality Guaranteed"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Custom Footer Note / Return Policy
                        </label>
                        <textarea
                          rows={2}
                          value={receiptFooterNote}
                          onChange={(e) => setReceiptFooterNote(e.target.value)}
                          placeholder="e.g. Goods once sold cannot be returned after 7 days. Asante!"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveReceiptBranding}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Receipt Branding & Tax PIN</span>
                      </button>
                    </div>

                    {/* Live Thermal Receipt Preview */}
                    <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center">
                      <div className="flex items-center justify-between w-full max-w-[280px] mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Live Thermal Preview ({receiptFormat || '80mm'})
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 select-none bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition">
                          <input
                            type="checkbox"
                            checked={enhancedReceiptPreview}
                            onChange={(e) => setEnhancedReceiptPreview(e.target.checked)}
                            className="w-3 h-3 text-emerald-600 rounded focus:ring-emerald-500"
                          />
                          <span>Enhanced Grid</span>
                        </label>
                      </div>

                      <div className="relative bg-white text-slate-800 w-full max-w-[280px] rounded-lg shadow-lg border border-slate-300 p-4 font-mono text-[11px] space-y-2 select-none overflow-hidden">
                        {/* Translucent Grid Overlay for Logo & Text Alignment */}
                        {enhancedReceiptPreview && (
                          <div className="absolute inset-0 pointer-events-none z-25 flex flex-col justify-between p-1 bg-emerald-500/5 backdrop-blur-[0.2px]">
                            {/* Vertical column alignment grid lines (32 cols for 58mm / 48 cols for 80mm representation) */}
                            <div className="absolute inset-0 grid grid-cols-6 divide-x divide-emerald-500/30 border border-emerald-500/40">
                              <div className="h-full"></div>
                              <div className="h-full"></div>
                              <div className="h-full"></div>
                              <div className="h-full"></div>
                              <div className="h-full"></div>
                              <div className="h-full"></div>
                            </div>
                            {/* Center alignment crosshair axis */}
                            <div className="absolute inset-y-0 left-1/2 w-px bg-rose-500/70 border-r border-dashed border-rose-500/70"></div>
                            {/* Horizontal guide lines */}
                            <div className="absolute inset-x-0 top-14 border-b border-dashed border-emerald-500/40"></div>
                            <div className="absolute inset-x-0 top-36 border-b border-dashed border-emerald-500/40"></div>
                            <div className="absolute inset-x-0 bottom-16 border-b border-dashed border-emerald-500/40"></div>
                            
                            {/* Grid Header Info Banner */}
                            <div className="absolute top-1 inset-x-2 bg-emerald-900/90 text-emerald-100 text-[9px] font-bold px-2 py-0.5 rounded text-center shadow-xs flex items-center justify-between">
                              <span>{receiptFormat === '58mm' ? '32-Col Grid (58mm)' : '48-Col Grid (80mm)'}</span>
                              <span className="text-emerald-300">Center Axis</span>
                            </div>
                          </div>
                        )}

                        <div className="text-center space-y-1 pb-2 border-b border-dashed border-slate-300">
                          {currentBusiness?.brandingSettings?.logoBase64 && (
                            <div className="flex justify-center pb-1">
                              <img
                                src={currentBusiness.brandingSettings.logoBase64}
                                alt="Logo"
                                className="h-7 max-w-[120px] object-contain"
                              />
                            </div>
                          )}
                          <div className="text-xs font-black uppercase text-slate-900">
                            {currentBusiness?.name || 'SokoPoS Retail'}
                          </div>
                          <div className="text-[9px] text-slate-500">
                            {currentLocation.name} · {currentLocation.phone || '+254 700 000000'}
                          </div>
                          <div className="text-[9px] text-slate-500">
                            KRA PIN: {receiptTaxPin.trim() || 'P051234567X'}
                          </div>
                          {receiptHeaderNote.trim() && (
                            <div className="text-[10px] font-bold text-slate-700 pt-1">
                              {receiptHeaderNote.trim()}
                            </div>
                          )}
                        </div>

                        <div className="text-[10px] space-y-0.5 py-1.5 border-b border-dashed border-slate-300">
                          <div className="flex justify-between text-slate-500">
                            <span>Receipt No:</span>
                            <span className="font-bold text-slate-900">SOKO-2026-9941</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Date:</span>
                            <span>{new Date().toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="py-1 space-y-1 text-[10px] border-b border-dashed border-slate-300">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>1x Premium Maize Flour 2kg</span>
                            <span>KES 220</span>
                          </div>
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>2x Fresh Brookside Milk 500ml</span>
                            <span>KES 140</span>
                          </div>
                        </div>

                        <div className="space-y-0.5 pt-1 text-[10px]">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span>TOTAL:</span>
                            <span>KES 360</span>
                          </div>
                          <div className="flex justify-between text-slate-500 text-[9px]">
                            <span>M-Pesa (QG789XYZ):</span>
                            <span>KES 360</span>
                          </div>
                        </div>

                        <div className="text-center pt-3 border-t border-dashed border-slate-300 space-y-1 text-[9px] text-slate-600">
                          {receiptFooterNote.trim() ? (
                            <p className="font-bold text-slate-800">{receiptFooterNote.trim()}</p>
                          ) : (
                            <p>Goods once sold cannot be returned after 7 days.</p>
                          )}
                          <p className="text-slate-400">Powered by SokoPoS & Digitax eTIMS</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test Print & Kiosk Note */}
                <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                      Hardware Connection Test
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block">
                      Verify browser printer communication and test receipt margins.
                    </span>
                  </div>

                  <button
                    id="test-hardware-printer-btn"
                    type="button"
                    onClick={() => {
                      showToast('Invoking browser printer dialog for test slip...', 'info');
                      window.print();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg font-medium text-xs transition cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Test Browser Print Dialog</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-xs">
                  <div className="font-semibold text-amber-900 dark:text-amber-300 mb-1">
                    Silent Background Printing (Kiosk Flag)
                  </div>
                  <p className="text-amber-800 dark:text-amber-200/80 leading-relaxed">
                    Launch Chrome or Edge with{' '}
                    <code className="px-1.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-amber-300 dark:border-amber-800 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                      --kiosk-printing
                    </code>{' '}
                    combined with Auto-Print on Checkout to send thermal receipts straight to your default ESC/POS printer without confirmation popups.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: RESET STORE TO CLEAN ZERO */}
          {/* ========================================================= */}
          {activeTab === 'reset' &&
            (() => {
              const authStatus = canResetStore(currentBusiness?.id || '');
              const tenantTxs = (transactions || []).filter((tx) => tx.businessId === currentBusiness?.id);
              const totalGross = tenantTxs.reduce((sum, tx) => sum + (tx.total || 0), 0);
              const totalRefunded = tenantTxs.reduce((sum, tx) => sum + (tx.totalRefunded || 0), 0);
              const totalNet = totalGross - totalRefunded;
              const tenantBackups = (storeSalesBackups || []).filter((b) => b.businessId === currentBusiness?.id);

              return (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {!authStatus.allowed ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/60 p-8 text-center space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/60">
                        <ShieldAlert className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          Restricted Access: Store Owner or Super-Admin Only
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                          {authStatus.reason ||
                            'Resetting store sales to clean zero is restricted to the verified Business Owner or a Platform Super-Admin.'}
                        </p>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {currentUser?.name} ({currentUser?.email}) · Role: {currentUser?.role}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Store Go-Live Metrics */}
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                        <SettingsSectionHeader
                          title="Store Go-Live & Test Sales Reset"
                          description={`Prepare ${currentBusiness?.name || 'this store'} for official trading by clearing test transactions.`}
                          meta={
                            <span
                              className={
                                tenantTxs.length === 0
                                  ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                  : 'text-amber-700 dark:text-amber-400 font-medium'
                              }
                            >
                              {tenantTxs.length === 0 ? 'Clean Zero' : `${tenantTxs.length} Test Sales`}
                            </span>
                          }
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-3 border border-slate-200 dark:border-slate-800 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
                          <div className="p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Test Transactions</div>
                            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                              {tenantTxs.length}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">Recorded orders</div>
                          </div>

                          <div className="p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Gross Sales Volume</div>
                            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate tabular-nums">
                              {currentBusiness?.currency || 'KES'} {totalGross.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">Total transaction value</div>
                          </div>

                          <div className="p-4">
                            <div className="text-xs text-slate-500 dark:text-slate-400">Net Sales Impact</div>
                            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate tabular-nums">
                              {currentBusiness?.currency || 'KES'} {totalNet.toLocaleString()}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">Revenue to zero</div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
                          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Preserved Data: Only sales records are cleared</span>
                          </div>
                          <p className="text-xs text-emerald-800 dark:text-emerald-200/80 leading-relaxed">
                            Your product catalog, branch inventory stock counts, barcode registers, staff logins, and tax rules remain completely intact.
                          </p>
                        </div>
                      </div>

                      {/* Destructive Action Trigger Card */}
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-300 dark:border-rose-900/70 p-6 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Reset Store to Clean Zero (Clear Test Sales)
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              Clears all {tenantTxs.length} transaction records for{' '}
                              <strong className="text-slate-900 dark:text-slate-100">{currentBusiness?.name}</strong> after creating an automatic JSON archive. Requires type-to-confirm verification.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>Secured by type-to-confirm, automatic backup &amp; audit log</span>
                          </div>
                          <button
                            id="open-reset-store-modal-btn"
                            type="button"
                            onClick={() => setIsResetStoreModalOpen(true)}
                            disabled={tenantTxs.length === 0}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition ${
                              tenantTxs.length > 0
                                ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{tenantTxs.length === 0 ? 'Store Already at Clean Zero' : 'Reset Store to Clean Zero'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Pre-Purge Backup Archive History */}
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                        <SettingsSectionHeader
                          title="Pre-Purge Backup Archive History"
                          meta={<span>{tenantBackups.length} archived snapshots</span>}
                        />

                        {tenantBackups.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                            <History className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                            <div>No previous sales reset backups on record for this store.</div>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {tenantBackups.map((b) => (
                              <div
                                key={b.id}
                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex flex-wrap items-center gap-2">
                                    <span className="tabular-nums">
                                      {new Date(b.createdAt).toLocaleDateString()} at{' '}
                                      {new Date(b.createdAt).toLocaleTimeString()}
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                                      {b.id}
                                    </span>
                                  </div>
                                  <div className="text-slate-500 dark:text-slate-400 tabular-nums">
                                    {b.transactionCount} transactions · {b.currency} {b.grossSales.toLocaleString()} gross · Purged by{' '}
                                    {b.purgedByName} ({b.purgedByRole})
                                  </div>
                                </div>
                                <button
                                  id={`download-backup-${b.id}`}
                                  type="button"
                                  onClick={() => downloadSalesBackup(b.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs border border-slate-200 dark:border-slate-700 transition cursor-pointer self-start sm:self-auto"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download JSON</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
        </div>
      </div>

      {/* Reset Store Modal Dialog */}
      <ResetStoreModal
        isOpen={isResetStoreModalOpen}
        onClose={() => setIsResetStoreModalOpen(false)}
        businessId={currentBusiness?.id}
      />
    </div>
  );
};

export { BusinessProfileSettingsModal as BusinessProfileSettingsView };
