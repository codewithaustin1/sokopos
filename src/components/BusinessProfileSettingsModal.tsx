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
  X,
  AlertTriangle,
  MapPin,
  Phone,
  Receipt,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  Globe,
  DollarSign,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  Palette,
  Monitor,
  Sparkles,
  RotateCcw,
  Archive,
  Download,
  ShieldAlert,
  History,
  Printer,
  Coffee,
  Leaf,
  Wrench,
  Star,
  Tag,
  CreditCard,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { UserRole, Location, Cashier, RetailTheme, PricingTier, BusinessPlanTier } from '../types';
import { RETAIL_THEMES, RetailThemeConfig } from '../data/retailThemes';
import { ResetStoreModal } from './ResetStoreModal';
import { TaxManagementPanel } from './TaxManagementPanel';
import { LoyaltySettingsPanel } from './LoyaltySettingsPanel';
import { PricingSlider } from './pricing/PricingSlider';
import { PackageTierId } from '../types/pricing';

export const BusinessProfileSettingsModal: React.FC = () => {
  const {
    currentBusiness,
    activeBusinessId,
    updateBusinessProfile,
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
    isBusinessSettingsOpen,
    setIsBusinessSettingsOpen,
    businessSettingsDefaultTab,
    updateActiveUserCredentials,
    showToast,
    isDarkMode,
    toggleDarkMode,
    setIsDarkMode,
    retailTheme,
    setRetailTheme,
    autoPrintReceipt,
    setAutoPrintReceipt,
    toggleAutoPrintReceipt,
    receiptFormat,
    setReceiptFormat,
    transactions,
    storeSalesBackups,
    downloadSalesBackup,
    canResetStore,
    pricingTiers,
    updateBusinessPlan,
    soundFx,
  } = usePos();

  const [activeTab, setActiveTab] = useState<'profile' | 'branches' | 'tax' | 'loyalty' | 'pricing' | 'accounts' | 'credentials' | 'appearance' | 'hardware' | 'reset'>(
    businessSettingsDefaultTab || 'profile'
  );

  const [isResetStoreModalOpen, setIsResetStoreModalOpen] = useState(false);

  // Pricing Tab State
  const [pricingBillingCycle, setPricingBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [sliderTierId, setSliderTierId] = useState<PackageTierId>('business');
  const [confirmingPricingTier, setConfirmingPricingTier] = useState<PricingTier | null>(null);
  const [isSwitchingPlan, setIsSwitchingPlan] = useState(false);

  React.useEffect(() => {
    if (businessSettingsDefaultTab) {
      setActiveTab(businessSettingsDefaultTab);
    }
  }, [businessSettingsDefaultTab]);

  // Profile Form State
  const [profileName, setProfileName] = useState(currentBusiness?.name || '');
  const [profileCode, setProfileCode] = useState(currentBusiness?.code || '');
  const [profileTaxNumber, setProfileTaxNumber] = useState(currentBusiness?.taxNumber || '');
  const [profileCurrency, setProfileCurrency] = useState(currentBusiness?.currency || 'KES');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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
  const [userRole, setUserRole] = useState<UserRole>('cashier');
  const [userUsername, setUserUsername] = useState('');
  const [userPin, setUserPin] = useState('');
  const [userAssignedLocId, setUserAssignedLocId] = useState<string>('');
  const [showRoleMatrix, setShowRoleMatrix] = useState(false);

  // Credential Settings State
  const [newTerminalPin, setNewTerminalPin] = useState('');
  const [confirmTerminalPin, setConfirmTerminalPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (businessSettingsDefaultTab) {
      setActiveTab(businessSettingsDefaultTab);
    }
  }, [businessSettingsDefaultTab]);

  // Sync profile form when currentBusiness changes
  React.useEffect(() => {
    if (currentBusiness) {
      setProfileName(currentBusiness.name);
      setProfileCode(currentBusiness.code);
      setProfileTaxNumber(currentBusiness.taxNumber || '');
      setProfileCurrency(currentBusiness.currency || 'KES');
    }
  }, [currentBusiness]);

  if (!isBusinessSettingsOpen) return null;

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

    // Reset branch form
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
        username: (userUsername.trim() || userName.trim().toLowerCase().replace(/\s+/g, '.')),
        assignedLocationId: userAssignedLocId || undefined,
      };
      if (userPin.trim()) {
        updates.pin = userPin.trim();
      }
      await updateSystemUser(editingUserId, updates);
      cancelUserForm();
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
        username: (userUsername.trim() || userName.trim().toLowerCase().replace(/\s+/g, '')),
        pin: userPin.trim(),
        role: userRole,
        avatarColor: 'bg-indigo-600',
        assignedLocationId: userAssignedLocId || undefined,
      });

      if (created) {
        setIsAddingUser(false);
      }
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
    setUserPin(''); // Do not display raw bcrypt hash
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

  const filteredBranches = (locations || []).filter(
    (l) =>
      l.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(branchSearch.toLowerCase()) ||
      l.city.toLowerCase().includes(branchSearch.toLowerCase())
  );

  return (
    <div
      id="business-profile-settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsBusinessSettingsOpen(false);
      }}
    >
      <div
        id="business-profile-settings-container"
        className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] my-auto"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  {currentBusiness?.name || 'Business Settings'}
                </h2>
                <span className="px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold bg-blue-500/20 text-blue-300 rounded border border-blue-400/30 uppercase tracking-wider">
                  {currentBusiness?.plan || 'Starter'} Plan
                </span>
                {isSuperAdmin && (
                  <span className="px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-400/30">
                    Super-Admin
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
                Tenant Architecture: Accounts, Roles, Credentials & Multi-Branch Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Quick Dark Mode Toggle in Header */}
            <button
              id="settings-modal-header-theme-toggle"
              type="button"
              onClick={toggleDarkMode}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                isDarkMode
                  ? 'bg-blue-950/70 border-blue-500/40 text-blue-300 hover:bg-blue-900/80'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dim Retail Dark Mode'}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden xs:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden xs:inline">Dark Mode</span>
                </>
              )}
            </button>

            <button
              id="close-business-settings-btn"
              onClick={() => setIsBusinessSettingsOpen(false)}
              className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close Settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-6 gap-1 sm:gap-2 overflow-x-auto">
          <button
            id="tab-profile-btn"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Profile</span>
          </button>

          <button
            id="tab-branches-btn"
            onClick={() => setActiveTab('branches')}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'branches'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Branches</span>
            <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
              {locations.length}
            </span>
          </button>

          <button
            id="tab-tax-btn"
            onClick={() => setActiveTab('tax')}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'tax'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Taxes & VAT/GST</span>
            <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              {currentBusiness?.taxSettings?.rules?.filter((r) => r.isActive).length ?? 3} Rates
            </span>
          </button>

          <button
            id="tab-loyalty-btn"
            onClick={() => setActiveTab('loyalty')}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'loyalty'
                ? 'border-amber-500 text-amber-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Loyalty Points</span>
            <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
              {currentBusiness?.loyaltySettings?.pointsPerCurrencyUnit || 10} pts = 1/-
            </span>
          </button>

          <button
            id="tab-pricing-btn"
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'pricing'
                ? 'border-purple-600 text-purple-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Tag className="w-4 h-4 text-purple-600" />
            <span>POS Packages & Pricing</span>
            <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 font-extrabold border border-purple-200 uppercase">
              {currentBusiness?.plan === 'professional' ? 'BUSINESS' : (currentBusiness?.plan?.toUpperCase() || 'BUSINESS')}
            </span>
          </button>

          <button
            id="tab-accounts-btn"
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'accounts'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff</span>
            <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
              {systemUsers.length}
            </span>
          </button>

          <button
            id="tab-credentials-btn"
            onClick={() => setActiveTab('credentials')}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'credentials'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Security</span>
          </button>

          <button
            id="tab-appearance-btn"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'appearance'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Appearance</span>
            <span
              className={`ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                retailTheme !== 'classic'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : isDarkMode
                  ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {RETAIL_THEMES.find((t) => t.id === retailTheme)?.name.split(' ')[0] || 'Theme'}
            </span>
          </button>

          <button
            id="tab-hardware-btn"
            onClick={() => setActiveTab('hardware')}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'hardware'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Printing & Hardware</span>
            <span
              className={`ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                autoPrintReceipt
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {autoPrintReceipt ? 'Auto ON' : 'Manual'}
            </span>
          </button>

          <button
            id="tab-reset-store-btn"
            onClick={() => setActiveTab('reset')}
            className={`flex items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-xs sm:text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'reset'
                ? 'border-rose-600 text-rose-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <RotateCcw className="w-4 h-4 text-rose-500" />
            <span>Store Reset</span>
            <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 font-extrabold border border-rose-200">
              Clean Zero
            </span>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-slate-50/50">
          {/* ========================================================= */}
          {/* TAB 1: BUSINESS PROFILE */}
          {/* ========================================================= */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Legal Entity & Store Information</h3>
                    <p className="text-xs text-slate-500">
                      Configure your official business name, fiscal tax identifier, and reporting currency.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-400">Business Tenant ID</span>
                    <div className="font-mono text-xs text-slate-700 font-semibold">{currentBusiness?.id}</div>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Business Legal / Trading Name
                      </label>
                      <input
                        id="input-business-name"
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Upfront Retail Solutions Ltd"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Business Short Code
                      </label>
                      <input
                        id="input-business-code"
                        type="text"
                        value={profileCode}
                        onChange={(e) => setProfileCode(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        placeholder="e.g., UPFR"
                        maxLength={6}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tax / KRA PIN / VAT Number
                      </label>
                      <input
                        id="input-business-tax"
                        type="text"
                        value={profileTaxNumber}
                        onChange={(e) => setProfileTaxNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        placeholder="e.g., P051234567Z"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Primary Store Currency
                      </label>
                      <select
                        id="select-business-currency"
                        value={profileCurrency}
                        onChange={(e) => setProfileCurrency(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                      Registered Owner Account
                    </h4>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                          {currentBusiness?.ownerName ? currentBusiness.ownerName.substring(0, 2).toUpperCase() : 'BO'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {currentBusiness?.ownerName || 'Business Administrator'}
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {currentBusiness?.ownerEmail || 'upfrontretaile@gmail.com'}
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Google OAuth Verified
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      id="save-business-profile-btn"
                      type="submit"
                      disabled={isSavingProfile}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Subscription & Multi-Branch Architecture Overview */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Enterprise Multi-Store Architecture</h4>
                      <p className="text-xs text-slate-400">
                        Row-Level Security (RLS) partition active across all POS registers
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-400/30">
                    Active Tenant
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-700/60 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-800/80">
                    <div className="text-lg font-bold text-white">{locations.length}</div>
                    <div className="text-[11px] text-slate-400">Store Branches</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/80">
                    <div className="text-lg font-bold text-white">{systemUsers.length}</div>
                    <div className="text-[11px] text-slate-400">Staff Accounts</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/80">
                    <div className="text-lg font-bold text-white">Bcrypt 10x</div>
                    <div className="text-[11px] text-slate-400">Credential Crypto</div>
                  </div>
                </div>

                {/* Display & Lighting Mode Quick Section in Profile */}
                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-left">
                    <Palette className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">Dim Retail Lighting Mode</div>
                      <div className="text-[10px] text-slate-400">
                        {isDarkMode ? 'Low-glare dark theme active' : 'Standard light theme active'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isDarkMode
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-blue-400" />}
                    <span>{isDarkMode ? 'Switch to Light' : 'Switch to Dark'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: STORE BRANCHES (CREATION & DELETION) */}
          {/* ========================================================= */}
          {activeTab === 'branches' && (
            <div className="space-y-6">
              {/* Branch Header Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Branch & Store Locations</h3>
                  <p className="text-xs text-slate-500">
                    Register physical stores, retail kiosks, and define terminal identifiers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search branches..."
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-40 sm:w-48"
                  />
                  {!isAddingBranch && (
                    <button
                      id="btn-register-new-branch"
                      onClick={() => {
                        cancelBranchForm();
                        setIsAddingBranch(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Register Branch</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Branch Add / Edit Form */}
              {isAddingBranch && (
                <div className="bg-white rounded-xl border-2 border-blue-500/30 p-5 shadow-md animate-fade-in">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Store className="w-5 h-5 text-blue-600" />
                      <h4 className="font-bold text-sm text-slate-900">
                        {editingBranchId ? 'Edit Store Branch' : 'Register New Store Branch'}
                      </h4>
                    </div>
                    <button
                      onClick={cancelBranchForm}
                      className="text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <form onSubmit={handleSaveBranch} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Branch Name *
                        </label>
                        <input
                          id="branch-input-name"
                          type="text"
                          value={branchName}
                          onChange={(e) => setBranchName(e.target.value)}
                          placeholder="e.g., Westlands Mall Branch"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Branch Code *
                        </label>
                        <input
                          id="branch-input-code"
                          type="text"
                          value={branchCode}
                          onChange={(e) => setBranchCode(e.target.value)}
                          placeholder="e.g., WST-02"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          City / Region *
                        </label>
                        <input
                          id="branch-input-city"
                          type="text"
                          value={branchCity}
                          onChange={(e) => setBranchCity(e.target.value)}
                          placeholder="e.g., Nairobi"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Physical Address / Street
                        </label>
                        <input
                          id="branch-input-address"
                          type="text"
                          value={branchAddress}
                          onChange={(e) => setBranchAddress(e.target.value)}
                          placeholder="e.g., Ground Floor, Unit 14"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Branch Contact Phone
                        </label>
                        <input
                          id="branch-input-phone"
                          type="tel"
                          value={branchPhone}
                          onChange={(e) => setBranchPhone(e.target.value)}
                          placeholder="e.g., +254 712 345 678"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Terminal Station Name
                        </label>
                        <input
                          id="branch-input-terminal"
                          type="text"
                          value={branchTerminal}
                          onChange={(e) => setBranchTerminal(e.target.value)}
                          placeholder="e.g., Terminal 02 - POS Register"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={cancelBranchForm}
                        className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        id="btn-submit-save-branch"
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
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
                      className={`relative bg-white rounded-xl border p-5 transition flex flex-col justify-between ${
                        isCurrentActive
                          ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20'
                          : 'border-slate-200 shadow-sm hover:border-slate-300'
                      }`}
                    >
                      <div>
                        {/* Top bar of card */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                                {loc.code}
                              </span>
                              <h4 className="font-bold text-slate-900 text-sm">{loc.name}</h4>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {loc.city} {loc.address ? `• ${loc.address}` : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isCurrentActive && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                                Active Register
                              </span>
                            )}
                            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Online
                            </span>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs py-2 my-2 bg-slate-50 rounded-lg px-3 border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Terminal Station:</span>
                            <span className="font-semibold text-slate-700">
                              {loc.terminalName || 'Main POS Terminal'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Contact Phone:</span>
                            <span className="font-semibold text-slate-700">
                              {loc.phone || 'No phone recorded'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions Footer */}
                      <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">
                        <div>
                          {!isCurrentActive ? (
                            <button
                              id={`switch-register-btn-${loc.id}`}
                              onClick={() => setCurrentLocationId(loc.id)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              Set as Active POS Terminal
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Current Register
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            id={`edit-branch-btn-${loc.id}`}
                            onClick={() => startEditBranch(loc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                            title="Edit branch details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`delete-branch-btn-${loc.id}`}
                            onClick={() => deleteLocation(loc.id)}
                            disabled={isOnlyBranch}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              isOnlyBranch
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
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
          )}

          {/* ========================================================= */}
          {/* TAB: TAXES & VAT/GST DYNAMIC ENGINE */}
          {/* ========================================================= */}
          {activeTab === 'tax' && <TaxManagementPanel />}

          {/* ========================================================= */}
          {/* TAB: LOYALTY POINTS & REWARDS VALUATION RULES */}
          {/* ========================================================= */}
          {activeTab === 'loyalty' && <LoyaltySettingsPanel />}

          {/* ========================================================= */}
          {/* TAB: POS PACKAGES & PRICING ARCHITECTURE (STARTER / BUSINESS / PREMIUM) */}
          {/* ========================================================= */}
          {activeTab === 'pricing' && (() => {
            const currentPlanNormalized = (() => {
              const p = (currentBusiness?.plan || 'business').toLowerCase();
              if (p === 'starter') return 'starter';
              if (p === 'business' || p === 'professional') return 'business';
              if (p === 'premium' || p === 'enterprise') return 'premium';
              return 'business';
            })();

            const currentTier = pricingTiers.find((t) => t.id === currentPlanNormalized) || pricingTiers[1] || pricingTiers[0];

            return (
              <div className="space-y-6">
                {/* Active Plan Hero Overview Banner */}
                <div className="bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-indigo-900/40 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Active Store Subscription
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                          Tenant: {currentBusiness?.name} ({currentBusiness?.code})
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <span>Current Plan: {currentTier.name} POS Package</span>
                        <span className="text-xs font-bold text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded-md border border-indigo-700/50">
                          {currentTier.alias} Tier
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        {currentTier.tagline}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center sm:text-right">
                        <div className="text-[11px] text-slate-300 font-medium">Standard Billing Rate</div>
                        <div className="text-lg font-black text-white">
                          {currentTier.currency} {currentTier.monthlyPrice.toLocaleString()}{' '}
                          <span className="text-xs font-normal text-slate-400">/ month</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resource Usage Meters */}
                  <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400 font-medium">Store Branches:</span>
                        <span className="font-extrabold text-white">
                          {locations.length} / {currentTier.maxBranches === -1 ? 'Unlimited' : currentTier.maxBranches}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-400 h-1.5 rounded-full transition-all"
                          style={{
                            width:
                              currentTier.maxBranches === -1
                                ? '25%'
                                : `${Math.min(100, (locations.length / currentTier.maxBranches) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400 font-medium">Staff Accounts:</span>
                        <span className="font-extrabold text-white">
                          {systemUsers.length} / {currentTier.maxStaffUsers === -1 ? 'Unlimited' : currentTier.maxStaffUsers}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-purple-400 h-1.5 rounded-full transition-all"
                          style={{
                            width:
                              currentTier.maxStaffUsers === -1
                                ? '25%'
                                : `${Math.min(100, (systemUsers.length / currentTier.maxStaffUsers) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-400">Support Level</div>
                        <div className="text-xs font-bold text-white truncate">{currentTier.supportLevel}</div>
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* Billing Cycle Selector Toggle */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Choose Your Subscription Billing Cycle</h4>
                    <p className="text-xs text-slate-500">
                      Flexible monthly retail plans or save up to 17% with annual prepayment.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPricingBillingCycle('monthly')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        pricingBillingCycle === 'monthly'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Monthly Billing
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingBillingCycle('annual')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        pricingBillingCycle === 'annual'
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Annual Billing</span>
                      <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full uppercase">
                        Save ~17%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Interactive POS Package & Store Capacity Slider */}
                <PricingSlider
                  tiers={pricingTiers}
                  selectedTierId={sliderTierId}
                  onSelectTier={(tId) => setSliderTierId(tId)}
                  billingCycle={pricingBillingCycle}
                  onBillingCycleChange={setPricingBillingCycle}
                  onUpgradeClick={(tier) => setConfirmingPricingTier(tier)}
                  currentPlanTierId={currentPlanNormalized}
                  isSuperAdminView={false}
                />

                {/* 3 Package Architecture Cards Side-by-Side */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {pricingTiers.map((tier) => {
                    const isCurrentPlan = currentPlanNormalized === tier.id;
                    const isSelectedInSlider = sliderTierId === tier.id;
                    const price = pricingBillingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
                    const billingPeriodLabel = pricingBillingCycle === 'annual' ? '/ year' : '/ month';
                    const monthlyEquivalent = pricingBillingCycle === 'annual' ? Math.round(tier.annualPrice / 12) : tier.monthlyPrice;

                    return (
                      <div
                        key={tier.id}
                        onClick={() => setSliderTierId(tier.id as PackageTierId)}
                        className={`rounded-2xl border transition-all flex flex-col justify-between relative bg-white cursor-pointer ${
                          isSelectedInSlider
                            ? 'border-purple-500 shadow-xl ring-2 ring-purple-500/40 transform scale-[1.01]'
                            : tier.isPopular
                            ? 'border-purple-300 shadow-md ring-1 ring-purple-400/20'
                            : isCurrentPlan
                            ? 'border-indigo-400 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        {/* Top Badge Banner */}
                        {tier.badge && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs ${
                                isSelectedInSlider
                                  ? 'bg-purple-600 text-white font-black ring-2 ring-purple-300'
                                  : tier.isPopular
                                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black ring-2 ring-amber-300'
                                  : 'bg-slate-900 text-white'
                              }`}
                            >
                              ⭐ {tier.badge}
                            </span>
                          </div>
                        )}

                        <div className="p-6">
                          {/* Header info */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-base font-black text-slate-900">{tier.name}</h4>
                              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {tier.alias}
                              </span>
                            </div>
                            {isCurrentPlan && (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Current Plan
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 min-h-[32px] mt-1">{tier.tagline}</p>

                          {/* Price Tag */}
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-black text-slate-900">
                                {tier.currency} {price.toLocaleString()}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">{billingPeriodLabel}</span>
                            </div>
                            {pricingBillingCycle === 'annual' && (
                              <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
                                Equivalent to {tier.currency} {monthlyEquivalent.toLocaleString()} / mo (2 months free!)
                              </div>
                            )}
                          </div>

                          {/* Resource Limits Pills */}
                          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                              🏬 {tier.maxBranches === -1 ? 'Unlimited Branches' : `${tier.maxBranches} Branch Location${tier.maxBranches > 1 ? 's' : ''}`}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                              👥 {tier.maxStaffUsers === -1 ? 'Unlimited Staff' : `Up to ${tier.maxStaffUsers} Staff Logins`}
                            </span>
                          </div>

                          {/* Feature Entitlements Bullet Points */}
                          <div className="mt-5 space-y-2.5 pt-4 border-t border-slate-100">
                            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                              Included Capabilities:
                            </div>
                            {tier.features.map((feature, fIdx) => (
                              <div key={fIdx} className="flex items-start gap-2 text-xs">
                                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                                <span className="text-slate-700 leading-snug">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Plan Action CTA Button */}
                        <div className="p-6 pt-0">
                          {isCurrentPlan ? (
                            <button
                              type="button"
                              disabled
                              className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 cursor-not-allowed flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Active Current Plan</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmingPricingTier(tier)}
                              className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                                tier.isPopular
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                  : 'bg-slate-900 hover:bg-slate-800 text-white'
                              }`}
                            >
                              <span>{tier.name === 'PREMIUM' ? 'Upgrade to Premium' : `Switch to ${tier.name}`}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Kenyan M-Pesa & Payment Settlement Instructions */}
                <div className="bg-emerald-50/80 rounded-2xl p-5 border border-emerald-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                        KES
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-emerald-950">
                          Lipa na M-Pesa Subscription Payment Guide
                        </h4>
                        <p className="text-xs text-emerald-800">
                          Automatic store reconciliation: Enter your unique Store Code as Account Number.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-900 bg-white px-3 py-1 rounded-lg border border-emerald-300">
                        Instant Automated Activation
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">
                        Option 1: Paybill
                      </span>
                      <div className="mt-1 font-mono font-bold text-slate-800 text-sm">Business No: 522522</div>
                      <div className="text-slate-600 text-[11px] mt-0.5">
                        Account No:{' '}
                        <strong className="text-slate-900 font-mono">{currentBusiness?.code || 'STORE'}</strong>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">
                        Option 2: Buy Goods Till
                      </span>
                      <div className="mt-1 font-mono font-bold text-slate-800 text-sm">Till No: 987654</div>
                      <div className="text-slate-600 text-[11px] mt-0.5">Recipient: Upfront Retail Solutions</div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-emerald-200 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">
                          Subscription Hotline
                        </span>
                        <div className="mt-1 font-bold text-slate-800 text-xs">+254 700 000 000</div>
                      </div>
                      <div className="text-[10px] text-slate-500">24/7 WhatsApp & Billing Support</div>
                    </div>
                  </div>
                </div>

                {/* Plan Upgrade Confirmation Modal Dialog */}
                {confirmingPricingTier && (
                  <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                          <Tag className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-slate-900">
                            Switch to {confirmingPricingTier.name} ({confirmingPricingTier.alias}) Package?
                          </h4>
                          <p className="text-xs text-slate-500">
                            Confirm plan change for store <strong>{currentBusiness?.name}</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Selected Package:</span>
                          <span className="font-bold text-slate-800">
                            {confirmingPricingTier.name} ({confirmingPricingTier.alias})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Subscription Fee:</span>
                          <span className="font-bold text-slate-900">
                            {confirmingPricingTier.currency}{' '}
                            {(pricingBillingCycle === 'annual'
                              ? confirmingPricingTier.annualPrice
                              : confirmingPricingTier.monthlyPrice
                            ).toLocaleString()}{' '}
                            {pricingBillingCycle === 'annual' ? '/ year' : '/ month'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Max Locations:</span>
                          <span className="font-bold text-slate-800">
                            {confirmingPricingTier.maxBranches === -1
                              ? 'Unlimited Branches'
                              : `${confirmingPricingTier.maxBranches} Store Branches`}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Max Staff Accounts:</span>
                          <span className="font-bold text-slate-800">
                            {confirmingPricingTier.maxStaffUsers === -1
                              ? 'Unlimited Staff'
                              : `${confirmingPricingTier.maxStaffUsers} Staff Logins`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          disabled={isSwitchingPlan}
                          onClick={() => setConfirmingPricingTier(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSwitchingPlan}
                          onClick={async () => {
                            if (!currentBusiness) return;
                            setIsSwitchingPlan(true);
                            try {
                              await updateBusinessPlan(currentBusiness.id, confirmingPricingTier.id as any);
                              setConfirmingPricingTier(null);
                            } catch (err) {
                              showToast('Failed to switch plan', 'error');
                            } finally {
                              setIsSwitchingPlan(false);
                            }
                          }}
                          className="px-5 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white transition cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {isSwitchingPlan ? 'Updating Store Plan...' : `Confirm & Activate ${confirmingPricingTier.name}`}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detailed Feature Comparison Matrix Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                    <h4 className="text-sm font-black text-slate-900">
                      POS Packages Detailed Feature Comparison Matrix
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Side-by-side feature capability breakdown across Starter, Business, and Premium tiers.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100/70 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3">Feature Capability</th>
                          <th className="px-5 py-3 text-center">
                            STARTER (KES 399)
                            <div className="text-[9px] text-slate-400 font-semibold normal-case">Basic</div>
                          </th>
                          <th className="px-5 py-3 text-center bg-purple-50/60 text-purple-900">
                            BUSINESS (KES 899)
                            <div className="text-[9px] text-purple-600 font-bold normal-case">Best Value</div>
                          </th>
                          <th className="px-5 py-3 text-center">
                            PREMIUM (KES 1,499)
                            <div className="text-[9px] text-slate-400 font-semibold normal-case">Enterprise</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-900">Store Branch Locations</td>
                          <td className="px-5 py-3 text-center">1 Store Location</td>
                          <td className="px-5 py-3 text-center bg-purple-50/30 font-bold text-purple-900">
                            Up to 3 Branches
                          </td>
                          <td className="px-5 py-3 text-center font-bold text-emerald-700">Unlimited Branches</td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-900">Staff / Cashier Accounts</td>
                          <td className="px-5 py-3 text-center">2 Cashier Logins</td>
                          <td className="px-5 py-3 text-center bg-purple-50/30 font-bold text-purple-900">
                            Up to 10 Logins
                          </td>
                          <td className="px-5 py-3 text-center font-bold text-emerald-700">Unlimited Accounts</td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-900">Barcode Scanning & Fast Checkout</td>
                          <td className="px-5 py-3 text-center text-emerald-600">✓ Included</td>
                          <td className="px-5 py-3 text-center bg-purple-50/30 text-emerald-600 font-bold">✓ Included</td>
                          <td className="px-5 py-3 text-center text-emerald-600 font-bold">✓ Included</td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-900">Thermal Receipt Printing (58/80mm)</td>
                          <td className="px-5 py-3 text-center text-emerald-600">✓ Included</td>
                          <td className="px-5 py-3 text-center bg-purple-50/30 text-emerald-600 font-bold">✓ Included</td>
                          <td className="px-5 py-3 text-center text-emerald-600 font-bold">✓ Included</td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-900">Offline Register Resiliency</td>
                          <td className="px-5 py-3 text-center text-emerald-600">✓ Auto-sync</td>
                          <td className="px-5 py-3 text-center bg-purple-50/30 text-emerald-600 font-bold">✓ Auto-sync</td>
                          <td className="px-5 py-3 text-center text-emerald-600 font-bold">✓ Auto-sync</td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-900">Multi-Branch Stock Transfers</td>
                          <td className="px-5 py-3 text-center text-slate-400">—</td>
                          <td className="px-5 py-3 text-center bg-purple-50/30 text-emerald-600 font-bold">✓ Included</td>
                          <td className="px-5 py-3 text-center text-emerald-600 font-bold">✓ Included</td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-900">Customer Loyalty & Credit Tabs</td>
                          <td className="px-5 py-3 text-center text-slate-400">—</td>
                          <td className="px-5 py-3 text-center bg-purple-50/30 text-emerald-600 font-bold">✓ Included</td>
                          <td className="px-5 py-3 text-center text-emerald-600 font-bold">✓ Included</td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-900">15+ Advanced Financial Reports</td>
                          <td className="px-5 py-3 text-center text-slate-400">Shift Till Only</td>
                          <td className="px-5 py-3 text-center bg-purple-50/30 text-emerald-600 font-bold">✓ Full Suite + CSV</td>
                          <td className="px-5 py-3 text-center text-emerald-600 font-bold">✓ Full Suite + CSV</td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-900">Automated Tax / VAT KRA Rules</td>
                          <td className="px-5 py-3 text-center text-slate-400">—</td>
                          <td className="px-5 py-3 text-center bg-purple-50/30 text-emerald-600 font-bold">✓ Included</td>
                          <td className="px-5 py-3 text-center text-emerald-600 font-bold">✓ Included</td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-900">Custom Role-Based Access (RBAC)</td>
                          <td className="px-5 py-3 text-center text-slate-400">—</td>
                          <td className="px-5 py-3 text-center bg-purple-50/30 text-slate-600">Standard Roles</td>
                          <td className="px-5 py-3 text-center text-emerald-600 font-bold">✓ Granular RBAC</td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-900">Multi-Warehouse Batch & Expiry</td>
                          <td className="px-5 py-3 text-center text-slate-400">—</td>
                          <td className="px-5 py-3 text-center bg-purple-50/30 text-slate-400">—</td>
                          <td className="px-5 py-3 text-center text-emerald-600 font-bold">✓ Included</td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-900">White-label Branding & Logo Upload</td>
                          <td className="px-5 py-3 text-center text-slate-400">—</td>
                          <td className="px-5 py-3 text-center bg-purple-50/30 text-slate-400">—</td>
                          <td className="px-5 py-3 text-center text-emerald-600 font-bold">✓ Included</td>
                        </tr>
                        <tr>
                          <td className="px-5 py-3 font-bold text-slate-900">Customer Support Tier</td>
                          <td className="px-5 py-3 text-center text-slate-600">Email & Community</td>
                          <td className="px-5 py-3 text-center bg-purple-50/30 font-bold text-purple-900">
                            Priority WhatsApp & Phone
                          </td>
                          <td className="px-5 py-3 text-center font-bold text-purple-900">
                            Dedicated 24/7 Account Mgr
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ========================================================= */}
          {/* TAB 3: ACCOUNTS & ROLE-BASED DASHBOARD (RBAC) */}
          {/* ========================================================= */}
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              {/* RBAC Visual Role Matrix Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Role-Based Access Control (RBAC) Dashboard
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">
                      Enforce strict principle-of-least-privilege across store terminals and managers.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowRoleMatrix(!showRoleMatrix)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition cursor-pointer"
                  >
                    <span>{showRoleMatrix ? 'Hide Permission Matrix' : 'View Permission Matrix'}</span>
                    {showRoleMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Role Badges Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                    <span className="font-bold text-purple-900 block">Owner</span>
                    <span className="text-[11px] text-purple-700">Full Business & Tenant Control</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                    <span className="font-bold text-blue-900 block">Manager</span>
                    <span className="text-[11px] text-blue-700">Inventory & Staff Management</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="font-bold text-amber-900 block">Supervisor</span>
                    <span className="text-[11px] text-amber-700">Voids, Overrides & Shift Drops</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="font-bold text-emerald-900 block">Cashier</span>
                    <span className="text-[11px] text-emerald-700">Register Sales & Receipts</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-cyan-50 border border-cyan-200">
                    <span className="font-bold text-cyan-900 block">Inv. Clerk</span>
                    <span className="text-[11px] text-cyan-700">Stock Receiving & Transfers</span>
                  </div>
                </div>

                {/* Expanded Permission Matrix */}
                {showRoleMatrix && (
                  <div className="mt-4 pt-3 border-t border-slate-100 overflow-x-auto animate-fade-in">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-semibold">
                          <th className="p-2">Capability / Operation</th>
                          <th className="p-2 text-center">Owner</th>
                          <th className="p-2 text-center">Manager</th>
                          <th className="p-2 text-center">Supervisor</th>
                          <th className="p-2 text-center">Cashier</th>
                          <th className="p-2 text-center">Inv. Clerk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        <tr>
                          <td className="p-2 font-medium">POS Register Sales & Payments</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">✓</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">✓</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">✓</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">✓</td>
                          <td className="p-2 text-center text-slate-300">-</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Inventory Adjustment & Stock Counting</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">✓</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">✓</td>
                          <td className="p-2 text-center text-slate-300">-</td>
                          <td className="p-2 text-center text-slate-300">-</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">✓</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Branch Creation & Removal / Deletion</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">✓</td>
                          <td className="p-2 text-center text-slate-300">-</td>
                          <td className="p-2 text-center text-slate-300">-</td>
                          <td className="p-2 text-center text-slate-300">-</td>
                          <td className="p-2 text-center text-slate-300">-</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Staff Account & PIN Provisioning</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">✓</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">✓</td>
                          <td className="p-2 text-center text-slate-300">-</td>
                          <td className="p-2 text-center text-slate-300">-</td>
                          <td className="p-2 text-center text-slate-300">-</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Price Overrides & Transaction Voids</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">✓</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">✓</td>
                          <td className="p-2 text-center text-emerald-600 font-bold">✓</td>
                          <td className="p-2 text-center text-slate-300">-</td>
                          <td className="p-2 text-center text-slate-300">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Accounts Header Controls */}
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">User Accounts Roster</h3>
                  <p className="text-xs text-slate-500">
                    Accounts authorized to sign into terminals and registers for {currentBusiness?.name}.
                  </p>
                </div>
                {!isAddingUser && (
                  <button
                    id="btn-provision-account"
                    onClick={() => {
                      cancelUserForm();
                      setIsAddingUser(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Provision Account</span>
                  </button>
                )}
              </div>

              {/* Account Add / Edit Form */}
              {isAddingUser && (
                <div className="bg-white rounded-xl border-2 border-indigo-500/30 p-5 shadow-md animate-fade-in">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-bold text-sm text-slate-900">
                        {editingUserId ? 'Edit Account Permissions' : 'Provision New System User'}
                      </h4>
                    </div>
                    <button
                      onClick={cancelUserForm}
                      className="text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <form onSubmit={handleSaveUser} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Full Name *
                        </label>
                        <input
                          id="user-input-name"
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          placeholder="e.g., Jane Wanjiku"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Role *
                        </label>
                        <select
                          id="user-select-role"
                          value={userRole}
                          onChange={(e) => setUserRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="cashier">Cashier</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="manager">Store Manager</option>
                          <option value="inventory_clerk">Inventory Clerk</option>
                          {isSuperAdmin && <option value="business_owner">Business Owner</option>}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Login Username / ID
                        </label>
                        <input
                          id="user-input-username"
                          type="text"
                          value={userUsername}
                          onChange={(e) => setUserUsername(e.target.value)}
                          placeholder="e.g., jwanjiku"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 lowercase"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {editingUserId ? 'New PIN (Leave blank to keep)' : 'Terminal PIN (4+ digits) *'}
                        </label>
                        <input
                          id="user-input-pin"
                          type="password"
                          maxLength={6}
                          value={userPin}
                          onChange={(e) => setUserPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="••••"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required={!editingUserId}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Branch Assignment
                        </label>
                        <select
                          id="user-select-branch"
                          value={userAssignedLocId}
                          onChange={(e) => setUserAssignedLocId(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={cancelUserForm}
                        className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        id="btn-submit-save-user"
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                      >
                        {editingUserId ? 'Update Account' : 'Provision User'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Accounts Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Username</th>
                      <th className="p-3">Assigned Branch</th>
                      <th className="p-3">PIN Security</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {systemUsers.map((u) => {
                      const assignedLoc = locations.find((l) => l.id === u.assignedLocationId);
                      const isSelf = currentUser?.id === u.id || currentUser?.username === u.username;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-full text-white font-bold flex items-center justify-center text-xs ${
                                  u.avatarColor || 'bg-slate-700'
                                }`}
                              >
                                {u.initials || u.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {isSelf && (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">{u.code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                u.role === 'business_owner'
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : u.role === 'manager'
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                  : u.role === 'supervisor'
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {u.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-700 font-medium">{u.username}</td>
                          <td className="p-3 text-slate-600">
                            {assignedLoc ? (
                              <span className="font-medium text-slate-800">{assignedLoc.name}</span>
                            ) : (
                              <span className="text-slate-400 italic">All Branches</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                              <Lock className="w-3 h-3 text-emerald-600" />
                              Bcrypt Hashed
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => startEditUser(u)}
                                className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                title="Edit user"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteSystemUser(u.id)}
                                disabled={isSelf}
                                className={`p-1.5 rounded transition cursor-pointer ${
                                  isSelf
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
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
          )}

          {/* ========================================================= */}
          {/* TAB 4: CREDENTIAL & SECURITY SETTINGS */}
          {/* ========================================================= */}
          {activeTab === 'credentials' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Personal Active User PIN Update */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Your Terminal Access Credentials</h3>
                    <p className="text-xs text-slate-500">
                      Update the numeric PIN used to unlock register terminals and authorize supervisor actions.
                    </p>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Logged in as:</span>
                    <span className="font-bold text-slate-900">{currentUser?.name}</span> ({currentUser?.email || currentUser?.username})
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-200 text-slate-700 uppercase font-semibold">
                    {currentUser?.role}
                  </span>
                </div>

                <form onSubmit={handleUpdateCredentials} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Confirm New PIN
                      </label>
                      <input
                        id="input-confirm-terminal-pin"
                        type={showPin ? 'text' : 'password'}
                        maxLength={6}
                        value={confirmTerminalPin}
                        onChange={(e) => setConfirmTerminalPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      id="save-new-pin-btn"
                      type="submit"
                      disabled={isUpdatingCredentials}
                      className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{isUpdatingCredentials ? 'Hashing with Bcrypt...' : 'Update Terminal PIN'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Security Diagnostics & Policies */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Cryptographic & Multi-Tenant Diagnostics
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-slate-700">Cryptographic Salt Algorithm</span>
                    </div>
                    <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Bcrypt (10 Rounds)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-slate-700">Database Tenant Isolation</span>
                    </div>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Enforced by Firestore RLS
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-slate-700">Super-Admin Audit Trail</span>
                    </div>
                    <span className="text-slate-600 font-medium">Logged on every branch/user mutation</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: APPEARANCE & DIM RETAIL LIGHTING MODE */}
          {/* ========================================================= */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Display Theme & Retail Lighting Environment
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Optimize POS terminal visibility for low-glare night registers, bars, evening shifts, and dim store counters.
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border shrink-0 ${
                      isDarkMode
                        ? 'bg-blue-900/40 text-blue-300 border-blue-600/40'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {isDarkMode ? 'Low-Glare Dark Theme' : 'High-Visibility Light Theme'}
                  </span>
                </div>

                {/* Primary Persistent Toggle Switch */}
                <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isDarkMode ? 'bg-slate-800 text-blue-400' : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Terminal Dark Mode</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          Persistent
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isDarkMode
                          ? 'Deep slate palette enabled. Eye fatigue & counter screen reflections are actively minimized.'
                          : 'Standard high-contrast light theme active for sunlit day shifts.'}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Control */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-slate-500">
                      {isDarkMode ? 'Dark Mode On' : 'Dark Mode Off'}
                    </span>
                    <button
                      type="button"
                      id="settings-theme-main-toggle"
                      role="switch"
                      aria-checked={isDarkMode}
                      onClick={toggleDarkMode}
                      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                        isDarkMode ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                      title={isDarkMode ? 'Disable Dark Mode' : 'Enable Dark Mode'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                          isDarkMode ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      >
                        {isDarkMode ? (
                          <Moon className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Theme Choice Cards */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Light Theme Card */}
                  <div
                    onClick={() => {
                      if (isDarkMode) toggleDarkMode();
                    }}
                    className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      !isDarkMode
                        ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4 text-amber-500" />
                          <h4 className="text-sm font-bold text-slate-900">Light Palette</h4>
                        </div>
                        {!isDarkMode && (
                          <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        High ambient readability with crisp slate backgrounds and sharp typographic contrast.
                      </p>
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] space-y-1">
                        <div className="flex justify-between font-bold text-slate-700">
                          <span>Store Register</span>
                          <span className="text-blue-600 font-black">KES 1,250.00</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Sunlit storefronts • Day shifts</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`mt-4 w-full py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                        !isDarkMode
                          ? 'bg-blue-600 text-white cursor-default'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {!isDarkMode ? 'Current Active Mode' : 'Switch to Light Mode'}
                    </button>
                  </div>

                  {/* Dark Theme Card (Dim Retail) */}
                  <div
                    onClick={() => {
                      if (!isDarkMode) toggleDarkMode();
                    }}
                    className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      isDarkMode
                        ? 'border-blue-500 bg-slate-900 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-slate-900 hover:border-blue-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4 text-blue-400" />
                          <h4 className="text-sm font-bold text-white">Dim Retail Dark Palette</h4>
                        </div>
                        {isDarkMode && (
                          <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Deep midnight slate (#090d16) engineered for dim retail environments, evening bars, and late shifts.
                      </p>
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                        <div className="flex justify-between font-bold text-slate-200">
                          <span>Night Register</span>
                          <span className="text-blue-400 font-black">KES 1,250.00</span>
                        </div>
                        <div className="text-[10px] text-slate-500">Low-glare • Barcode friendly</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`mt-4 w-full py-1.5 px-3 rounded-lg text-xs font-bold transition ${
                        isDarkMode
                          ? 'bg-blue-600 text-white cursor-default'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {isDarkMode ? 'Current Active Mode' : 'Switch to Dark Mode'}
                    </button>
                  </div>
                </div>

                {/* Dim Retail Environment Operational Benefits */}
                <div className="mt-5 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Retail Advantages in Dim Environments</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-600">
                    <div className="p-2.5 bg-white rounded-lg border border-blue-100/80">
                      <strong className="text-slate-800 block mb-0.5">Glare Reduction</strong>
                      Prevents high-intensity display reflection on counter glass and laser scanner lenses.
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-blue-100/80">
                      <strong className="text-slate-800 block mb-0.5">Cashier Eye Comfort</strong>
                      Drastically decreases ocular strain and pupil dilation fatigue during 8+ hour evening shifts.
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-blue-100/80">
                      <strong className="text-slate-800 block mb-0.5">Barcode Scan Speed</strong>
                      Dark UI reduces ambient scatter, helping camera & laser barcode scanners lock on faster.
                    </div>
                  </div>
                </div>

                {/* Storage & Persistence Details */}
                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 px-1 gap-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Theme choice automatically persisted in register local memory (key: sokopos_dark_mode_v2)
                  </span>
                  <span className="font-semibold text-slate-500">Instant application-wide switch</span>
                </div>

                {/* ========================================================= */}
                {/* RETAIL DOMAIN ACCENT PALETTES SELECTOR */}
                {/* ========================================================= */}
                <div id="retail-domain-palettes-section" className="mt-8 pt-6 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <Palette className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <span>Retail Domain Accent Palettes</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold uppercase tracking-wider">
                              Trade Styling
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Tailor your terminal's accent colors to your specific trade environment — from fresh organic greens to warm bakery ambers and high-visibility industrial graphite.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                      <span className="text-[11px] text-slate-500">Active Trade Palette:</span>
                      <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-slate-900 text-white flex items-center gap-1.5 shadow-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{
                            backgroundColor:
                              RETAIL_THEMES.find((t) => t.id === retailTheme)?.primaryColor || '#2563eb',
                          }}
                        />
                        <span>{RETAIL_THEMES.find((t) => t.id === retailTheme)?.name.split(' (')[0] || 'Enterprise Classic'}</span>
                      </span>
                    </div>
                  </div>

                  {/* 5 Retail Theme Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {RETAIL_THEMES.map((theme) => {
                      const isSelected = retailTheme === theme.id;
                      return (
                        <div
                          key={theme.id}
                          id={`retail-palette-card-${theme.id}`}
                          onClick={() => setRetailTheme(theme.id)}
                          className={`group relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between hover:shadow-md ${
                            isSelected
                              ? 'border-blue-600 bg-white ring-2 ring-blue-500/20 shadow-sm'
                              : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div>
                            {/* Card Top: Header & Active Indicator */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0"
                                  style={{ background: theme.swatchGradient }}
                                >
                                  {theme.id === 'emerald' && <Leaf className="w-3.5 h-3.5" />}
                                  {theme.id === 'amber' && <Coffee className="w-3.5 h-3.5" />}
                                  {theme.id === 'burgundy' && <Sparkles className="w-3.5 h-3.5" />}
                                  {theme.id === 'industrial' && <Wrench className="w-3.5 h-3.5" />}
                                  {theme.id === 'classic' && <Building2 className="w-3.5 h-3.5" />}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                    {theme.name}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-medium">
                                    {theme.subtitle}
                                  </p>
                                </div>
                              </div>

                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full shrink-0 shadow-xs">
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  Active
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-600 transition shrink-0">
                                  Select
                                </span>
                              )}
                            </div>

                            {/* Trade & Domain Description */}
                            <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                              {theme.description}
                            </p>

                            {/* Trade Target Chips */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {theme.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-600 border border-slate-200/70"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {/* Color Swatch Demonstration */}
                            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 mb-3 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span className="font-semibold">Palette Swatches:</span>
                                <span className="font-mono text-[9px]">{theme.primaryColor}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-5 h-5 rounded-full border border-black/10 shadow-xs shrink-0"
                                  style={{ backgroundColor: theme.primaryColor }}
                                  title={`Primary: ${theme.primaryColor}`}
                                />
                                <div
                                  className="w-5 h-5 rounded-full border border-black/10 shadow-xs shrink-0"
                                  style={{ backgroundColor: theme.accentColor }}
                                  title={`Accent: ${theme.accentColor}`}
                                />
                                <div
                                  className="w-5 h-5 rounded-full border border-black/10 shadow-xs shrink-0"
                                  style={{ backgroundColor: theme.highlightColor }}
                                  title={`Highlight: ${theme.highlightColor}`}
                                />
                                <div
                                  className="flex-1 h-5 rounded-md border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700"
                                  style={{ backgroundColor: theme.lightBg }}
                                >
                                  Surface Tint
                                </div>
                              </div>
                            </div>

                            {/* Live Interactive UI Element Sample */}
                            <div className="p-2 rounded-lg bg-slate-100/80 border border-slate-200 text-[10px] flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                <span>Cart Item</span>
                                <span
                                  className="px-1.5 py-0.2 rounded font-black text-[9px]"
                                  style={{
                                    backgroundColor: theme.lightBg,
                                    color: theme.primaryColor,
                                    border: `1px solid ${theme.lightBorder}`,
                                  }}
                                >
                                  KES 750
                                </span>
                              </div>
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
                                style={{ backgroundColor: theme.primaryColor }}
                              >
                                Charge
                              </span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRetailTheme(theme.id);
                            }}
                            className={`mt-3 w-full py-1.5 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                              isSelected
                                ? 'bg-slate-900 text-white cursor-default'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Currently Active Palette</span>
                              </>
                            ) : (
                              <span>Apply {theme.name.split(' ')[0]} Palette</span>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Live POS Terminal Component Preview Strip */}
                  <div className="mt-5 p-4 rounded-xl bg-slate-900 text-white border border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-blue-400" />
                        <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                          Active Terminal Accent Preview
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Live visual preview of cashier buttons, badges, and focus rings
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Register Checkout Action Button */}
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400 mb-1.5">Primary Register Action</div>
                        <button
                          type="button"
                          className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Charge KES 1,840.00</span>
                        </button>
                      </div>

                      {/* Active Filter / Category Tab */}
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400 mb-1.5">Active Category Tab</div>
                        <div className="flex gap-1.5">
                          <span className="flex-1 text-center py-1.5 px-2 rounded-md text-xs font-bold bg-blue-600 text-white">
                            Selected Tab
                          </span>
                          <span className="flex-1 text-center py-1.5 px-2 rounded-md text-xs font-medium bg-slate-800 text-slate-400">
                            Inactive
                          </span>
                        </div>
                      </div>

                      {/* Product Price Tag Badge */}
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400 mb-1.5">Counter Price Badge</div>
                        <div className="flex items-center justify-between p-1.5 rounded-md bg-slate-900 border border-slate-800">
                          <span className="text-xs font-medium text-slate-300">Fresh Produce</span>
                          <span className="text-xs font-black text-blue-400">KES 420.00</span>
                        </div>
                      </div>

                      {/* Focus Ring & Input Highlight */}
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400 mb-1.5">Barcode Scan Field</div>
                        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 border border-blue-500 ring-2 ring-blue-500/40 text-xs text-white">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                          <span className="font-mono text-[11px] text-slate-200">600123456789</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Persistence & Cloud Sync Footer Note */}
                  <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-500 px-1 gap-1">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Saved to business profile ({currentBusiness?.name || 'Current Business'}) and synced with Cloud Firestore</span>
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      tenantKey: {activeBusinessId}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: HARDWARE & RECEIPT PRINTING PREFERENCES */}
          {/* ========================================================= */}
          {activeTab === 'hardware' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Header Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Printing & Hardware Preferences
                      </h3>
                      <p className="text-xs text-slate-500">
                        Configure automatic thermal receipt printing, paper sizing, and checkout dispatch.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Tenant: {currentBusiness?.name || 'Current Shop'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        autoPrintReceipt
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          autoPrintReceipt ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      {autoPrintReceipt ? 'Auto-Print Active' : 'Manual Print Mode'}
                    </span>
                  </div>
                </div>

                {/* Primary Feature Setting: Auto-Print on Checkout */}
                <div className="mt-5 p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          Auto-Print on Checkout
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold bg-blue-100 text-blue-800">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 max-w-lg">
                        Automatically invokes the browser's native print dialog for the receipt immediately once a transaction is successfully authorized, eliminating the need to click &quot;Print&quot; manually.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        id="settings-auto-print-switch"
                        type="button"
                        role="switch"
                        aria-checked={autoPrintReceipt}
                        onClick={toggleAutoPrintReceipt}
                        className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          autoPrintReceipt ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                        title={autoPrintReceipt ? 'Disable Auto-Print' : 'Enable Auto-Print'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            autoPrintReceipt ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Flow Diagram */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Checkout Dispatch Sequence:</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-slate-700">
                      1. Confirm Tender
                    </span>
                    <span>→</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-slate-700">
                      2. Authorize Sale
                    </span>
                    <span>→</span>
                    <span className={`px-2 py-0.5 rounded border font-mono font-bold ${
                      autoPrintReceipt
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>
                      3. {autoPrintReceipt ? 'Browser Print Dialog Opens Automatically' : 'Receipt Modal Displays (Manual Print)'}
                    </span>
                  </div>
                </div>

                {/* Thermal Receipt Paper Sizing Preference */}
                <div className="mt-6 space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Receipt Paper Format & Thermal Width
                    </h4>
                    <p className="text-xs text-slate-500">
                      Select the paper roll specification matching your countertop receipt printer hardware.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 80mm Standard POS Thermal */}
                    <div
                      onClick={() => setReceiptFormat('80mm')}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        receiptFormat === '80mm'
                          ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-slate-900">
                            80mm Thermal (3&quot;)
                          </span>
                          {receiptFormat === '80mm' && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Standard commercial POS format (Epson TM-T88, Star Micronics, Rongta, Xprinter).
                        </p>
                      </div>
                      <span className="mt-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Full Width • 48 Columns
                      </span>
                    </div>

                    {/* 58mm Compact Mobile Thermal */}
                    <div
                      onClick={() => setReceiptFormat('58mm')}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        receiptFormat === '58mm'
                          ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-slate-900">
                            58mm Mini (2&quot;)
                          </span>
                          {receiptFormat === '58mm' && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Compact handheld mobile Bluetooth and portable thermal belt clip printers.
                        </p>
                      </div>
                      <span className="mt-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Narrow Slip • 32 Columns
                      </span>
                    </div>

                    {/* Standard A4 / Document */}
                    <div
                      onClick={() => setReceiptFormat('standard')}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        receiptFormat === 'standard'
                          ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-slate-900">
                            Standard A4 / Letter
                          </span>
                          {receiptFormat === 'standard' && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Standard laser or inkjet full-page document invoices for B2B or trade counters.
                        </p>
                      </div>
                      <span className="mt-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Page Invoice • PDF Export
                      </span>
                    </div>
                  </div>
                </div>

                {/* Printer Diagnostics & Test Print */}
                <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 block">
                      Hardware Connection Test
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Verify that your browser can communicate with your printer and test page margins.
                    </span>
                  </div>

                  <button
                    id="test-hardware-printer-btn"
                    type="button"
                    onClick={() => {
                      showToast('Invoking browser printer dialog for test slip...', 'info');
                      window.print();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition cursor-pointer border border-slate-300"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Test Browser Print Dialog</span>
                  </button>
                </div>

                {/* Commercial Silent Kiosk Printing Pro-Tip */}
                <div className="mt-5 p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
                  <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Commercial Pro-Tip: 100% Silent Background Printing</span>
                  </h5>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    In enterprise POS registers, launch Google Chrome or Edge with the flag{' '}
                    <code className="px-1.5 py-0.5 bg-white/90 rounded border border-amber-300 font-mono text-[10px] text-slate-800">
                      --kiosk-printing
                    </code>
                    . When combined with <strong>Auto-Print on Checkout</strong>, the thermal receipt prints instantly directly to your default ESC/POS printer with zero confirmation dialog popups required.
                  </p>
                </div>

                {/* Persistence Notice */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 px-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Isolated per tenant: Applied strictly to <strong>{currentBusiness?.name}</strong> (ID: {currentBusiness?.id})
                  </span>
                  <span className="font-semibold text-slate-600">
                    Tenant-Isolated & Cloud-Synced
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: RESET STORE TO CLEAN ZERO (CLEAR TEST SALES) */}
          {/* ========================================================= */}
          {activeTab === 'reset' && (() => {
            const authStatus = canResetStore(currentBusiness?.id || '');
            const tenantTxs = (transactions || []).filter((tx) => tx.businessId === currentBusiness?.id);
            const totalGross = tenantTxs.reduce((sum, tx) => sum + (tx.total || 0), 0);
            const totalRefunded = tenantTxs.reduce((sum, tx) => sum + (tx.totalRefunded || 0), 0);
            const totalNet = totalGross - totalRefunded;
            const tenantBackups = (storeSalesBackups || []).filter((b) => b.businessId === currentBusiness?.id);

            return (
              <div className="space-y-6 max-w-3xl mx-auto">
                {/* Authorization Barrier */}
                {!authStatus.allowed ? (
                  <div className="bg-white rounded-xl border border-rose-200 p-8 shadow-sm text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-900">
                        Restricted Access: Store Owner or Super-Admin Only
                      </h3>
                      <p className="text-sm text-slate-600 max-w-md mx-auto">
                        {authStatus.reason ||
                          'Resetting store sales to clean zero is restricted to the verified Business Owner or a Platform Super-Admin.'}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-600 font-mono">
                      <span>Logged in as: {currentUser?.name} ({currentUser?.email})</span>
                      <span>•</span>
                      <span>Role: {currentUser?.role}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header Card */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                            <RotateCcw className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-slate-900">
                              Store Go-Live & Test Sales Reset
                            </h3>
                            <p className="text-xs text-slate-500">
                              Prepare {currentBusiness?.name} for official retail trading by permanently clearing test sales.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            tenantTxs.length === 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              tenantTxs.length === 0 ? 'bg-emerald-600' : 'bg-amber-600'
                            }`} />
                            {tenantTxs.length === 0 ? 'Store Clean Zero' : `${tenantTxs.length} Test Sales`}
                          </span>
                        </div>
                      </div>

                      {/* Store Sales Status Metrics */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-5">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Test Transactions
                          </div>
                          <div className="text-2xl font-black text-slate-800 mt-1">
                            {tenantTxs.length}
                          </div>
                          <div className="text-[10px] text-slate-400">Recorded orders</div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Gross Sales Volume
                          </div>
                          <div className="text-xl font-black text-slate-800 mt-1 truncate">
                            {currentBusiness?.currency || 'KES'} {totalGross.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400">Total transaction amount</div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Net Sales Impact
                          </div>
                          <div className="text-xl font-black text-slate-800 mt-1 truncate">
                            {currentBusiness?.currency || 'KES'} {totalNet.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-400">Revenue to zero</div>
                        </div>
                      </div>

                      {/* What is Safe & Preserved */}
                      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-black text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Guaranteed Safe: Only sales records are wiped</span>
                        </div>
                        <p className="text-xs text-emerald-800 leading-relaxed">
                          Your SKU product catalog, inventory stock counts across all branches, barcode registers,
                          cashier logins, and business tax configurations are completely preserved and untouched.
                        </p>
                      </div>
                    </div>

                    {/* Destructive Action Trigger Card */}
                    <div className="bg-white rounded-xl border-2 border-rose-200 p-6 shadow-sm space-y-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                          <Trash2 className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-rose-950">
                            Reset Store to Clean Zero (Clear Test Sales)
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            This action clears all {tenantTxs.length} transaction records for <strong>{currentBusiness?.name}</strong>.
                            Before wiping, the system automatically creates a timestamped JSON backup archive.
                            Requires type-to-confirm verification.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          <span>Secured by type-to-confirm, soft-delete archive & audit log</span>
                        </div>
                        <button
                          id="open-reset-store-modal-btn"
                          onClick={() => setIsResetStoreModalOpen(true)}
                          disabled={tenantTxs.length === 0}
                          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-sm transition cursor-pointer ${
                            tenantTxs.length > 0
                              ? 'bg-rose-600 hover:bg-rose-700 active:scale-[0.98]'
                              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>{tenantTxs.length === 0 ? 'Store Already at Clean Zero' : 'Reset Store to Clean Zero'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Previous Pre-Purge Backups Archive */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Archive className="w-4 h-4 text-blue-600" />
                          <h4 className="text-sm font-bold text-slate-900">
                            Pre-Purge Backup Archive History
                          </h4>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          {tenantBackups.length} archived snapshots
                        </span>
                      </div>

                      {tenantBackups.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-500">
                          <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          No previous sales reset backups on record for this store.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {tenantBackups.map((b) => (
                            <div
                              key={b.id}
                              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                  <span>{new Date(b.createdAt).toLocaleDateString()} at {new Date(b.createdAt).toLocaleTimeString()}</span>
                                  <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {b.id}
                                  </span>
                                </div>
                                <div className="text-slate-500">
                                  {b.transactionCount} transactions • {b.currency} {b.grossSales.toLocaleString()} gross • Purged by {b.purgedByName} ({b.purgedByRole})
                                </div>
                              </div>
                              <button
                                id={`download-backup-${b.id}`}
                                onClick={() => downloadSalesBackup(b.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200 transition cursor-pointer self-start sm:self-auto"
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

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Business Tenant: <strong>{currentBusiness?.name}</strong></span>
          </div>
          <button
            onClick={() => setIsBusinessSettingsOpen(false)}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition cursor-pointer"
          >
            Close Settings
          </button>
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
