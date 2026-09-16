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
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { UserRole, Location, Cashier } from '../types';

export const BusinessProfileSettingsModal: React.FC = () => {
  const {
    currentBusiness,
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
  } = usePos();

  const [activeTab, setActiveTab] = useState<'profile' | 'branches' | 'accounts' | 'credentials'>(
    businessSettingsDefaultTab || 'profile'
  );

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

  const filteredBranches = locations.filter(
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
          <button
            id="close-business-settings-btn"
            onClick={() => setIsBusinessSettingsOpen(false)}
            className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
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
    </div>
  );
};
