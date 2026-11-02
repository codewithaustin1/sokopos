import React, { useState, useMemo } from 'react';
import {
  Shield,
  Check,
  RotateCcw,
  Save,
  Search,
  ShoppingCart,
  Package,
  Clock,
  Users,
  BarChart3,
  Sliders,
  Copy,
  AlertTriangle,
  Lock,
  Sparkles,
  Info,
  CheckCircle2,
  Table as TableIcon,
  LayoutGrid,
  Filter,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import {
  PermissionKey,
  PermissionCategory,
  ConfigurableStaffRole,
  RolePermissionsMap,
  PERMISSION_CATEGORIES,
  PERMISSION_DEFINITIONS,
  ROLE_CONFIG_META,
  DEFAULT_ROLE_PERMISSIONS,
} from '../types/permissions';

interface RolePrivilegesPanelProps {
  className?: string;
}

export const RolePrivilegesPanel: React.FC<RolePrivilegesPanelProps> = ({ className = '' }) => {
  const {
    rolePermissions,
    updateRolePermissions,
    resetRolePermissionsToDefault,
    currentBusiness,
    currentUser,
    isSuperAdmin,
  } = usePos();

  // Local working copy of permissions for live editing before explicit Save
  const [localMap, setLocalMap] = useState<RolePermissionsMap>(() => JSON.parse(JSON.stringify(rolePermissions)));
  const [selectedRole, setSelectedRole] = useState<ConfigurableStaffRole>('cashier');
  const [selectedCategory, setSelectedCategory] = useState<PermissionCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'categories' | 'matrix'>('categories');
  const [isSaving, setIsSaving] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceRole, setCopySourceRole] = useState<ConfigurableStaffRole>('supervisor');

  // Sync local copy if external rolePermissions updates (e.g. from sync or reset)
  const isDirty = useMemo(() => {
    return JSON.stringify(localMap) !== JSON.stringify(rolePermissions);
  }, [localMap, rolePermissions]);

  const diffCount = useMemo(() => {
    let count = 0;
    const roles: ConfigurableStaffRole[] = ['manager', 'supervisor', 'cashier', 'inventory_clerk'];
    for (const r of roles) {
      for (const def of PERMISSION_DEFINITIONS) {
        if (localMap[r]?.[def.key] !== rolePermissions[r]?.[def.key]) {
          count++;
        }
      }
    }
    return count;
  }, [localMap, rolePermissions]);

  const togglePermission = (role: ConfigurableStaffRole, key: PermissionKey) => {
    setLocalMap((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: !prev[role]?.[key],
      },
    }));
  };

  const handleBulkToggleCategory = (role: ConfigurableStaffRole, category: PermissionCategory, enable: boolean) => {
    const keys = PERMISSION_DEFINITIONS.filter((d) => d.category === category).map((d) => d.key);
    setLocalMap((prev) => {
      const updatedRole = { ...prev[role] };
      keys.forEach((k) => {
        updatedRole[k] = enable;
      });
      return {
        ...prev,
        [role]: updatedRole,
      };
    });
  };

  const handleGrantAll = (role: ConfigurableStaffRole) => {
    setLocalMap((prev) => {
      const updatedRole = { ...prev[role] };
      PERMISSION_DEFINITIONS.forEach((d) => {
        updatedRole[d.key] = true;
      });
      return { ...prev, [role]: updatedRole };
    });
  };

  const handleRevokeAll = (role: ConfigurableStaffRole) => {
    setLocalMap((prev) => {
      const updatedRole = { ...prev[role] };
      PERMISSION_DEFINITIONS.forEach((d) => {
        // Leave bare minimum to sell if cashier
        updatedRole[d.key] = false;
      });
      return { ...prev, [role]: updatedRole };
    });
  };

  const handleCopyPermissions = () => {
    if (copySourceRole === selectedRole) return;
    setLocalMap((prev) => ({
      ...prev,
      [selectedRole]: { ...prev[copySourceRole] },
    }));
    setShowCopyModal(false);
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all roles to factory SokoPoS permission defaults?')) {
      setLocalMap(JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)));
    }
  };

  const handleDiscard = () => {
    setLocalMap(JSON.parse(JSON.stringify(rolePermissions)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateRolePermissions(localMap);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered definitions based on search query & category
  const filteredDefinitions = useMemo(() => {
    return PERMISSION_DEFINITIONS.filter((def) => {
      const matchesCategory = selectedCategory === 'all' || def.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        def.label.toLowerCase().includes(query) ||
        def.description.toLowerCase().includes(query) ||
        def.key.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const getCategoryIcon = (catId: PermissionCategory) => {
    switch (catId) {
      case 'pos':
        return ShoppingCart;
      case 'inventory':
        return Package;
      case 'shifts':
        return Clock;
      case 'customers':
        return Users;
      case 'reports':
        return BarChart3;
      case 'admin':
        return Shield;
      default:
        return Sliders;
    }
  };

  const rolesList: ConfigurableStaffRole[] = ['manager', 'supervisor', 'cashier', 'inventory_clerk'];

  const getRoleActiveCount = (role: ConfigurableStaffRole) => {
    return Object.values(localMap[role] || {}).filter(Boolean).length;
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Top Banner & Control Deck */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-800">
                    Live Role Privileges & Permissions Matrix
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Immediate Effect
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure real-time privileges for store operators. As soon as you click <strong className="text-slate-800">Save</strong>, changes take immediate effect across all registers without restarting the app.
                </p>
              </div>
            </div>
          </div>

          {/* View mode toggle & Reset Button */}
          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('categories')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'categories'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Category Cards View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Role Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Side-by-Side Comparison Matrix"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Comparison Matrix</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-slate-200 shadow-2xs"
              title="Reset all roles to factory SokoPoS defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Factory Defaults</span>
            </button>
          </div>
        </div>

        {/* Role Selector Tabs (Active in Category view) */}
        {viewMode === 'categories' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {rolesList.map((r) => {
              const meta = ROLE_CONFIG_META[r];
              const isSelected = selectedRole === r;
              const activeCount = getRoleActiveCount(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-1 relative overflow-hidden ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-xs text-slate-900 truncate">
                      {meta.label}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {activeCount}/{PERMISSION_DEFINITIONS.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate">{meta.alias}</span>
                </button>
              );
            })}

            {/* Business Owner (Master Immunity Card) */}
            <div className="p-3 rounded-2xl border-2 border-slate-200 bg-slate-50/70 text-left flex flex-col justify-between gap-1 opacity-80 cursor-not-allowed">
              <div className="flex items-center justify-between gap-1">
                <span className="font-black text-xs text-slate-800 flex items-center gap-1 truncate">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  Owner / Admin
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                  Full Access
                </span>
              </div>
              <span className="text-[10px] text-slate-500 truncate">Master tenant ownership</span>
            </div>
          </div>
        )}

        {/* Quick Tools & Role Header (in Category view) */}
        {viewMode === 'categories' && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${ROLE_CONFIG_META[selectedRole].badgeBg}`}>
                {ROLE_CONFIG_META[selectedRole].label}
              </span>
              <span className="text-slate-600 font-medium">
                {ROLE_CONFIG_META[selectedRole].description}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleGrantAll(selectedRole)}
                className="px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100/60 rounded-lg transition cursor-pointer"
              >
                Grant All
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => handleRevokeAll(selectedRole)}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
              >
                Revoke All
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setShowCopyModal(true)}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-200/60 rounded-lg flex items-center gap-1 transition cursor-pointer"
              >
                <Copy className="w-3 h-3 text-slate-500" />
                <span>Clone from role</span>
              </button>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({PERMISSION_DEFINITIONS.length})
            </button>
            {PERMISSION_CATEGORIES.map((cat) => {
              const count = PERMISSION_DEFINITIONS.filter((d) => d.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter privileges..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Main Body: Categories View */}
      {viewMode === 'categories' ? (
        <div className="space-y-4">
          {PERMISSION_CATEGORIES.map((cat) => {
            const defs = filteredDefinitions.filter((d) => d.category === cat.id);
            if (defs.length === 0) return null;

            const Icon = getCategoryIcon(cat.id);
            const allEnabledInCategory = defs.every((d) => localMap[selectedRole]?.[d.key]);
            const someEnabled = defs.some((d) => localMap[selectedRole]?.[d.key]);

            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                {/* Category Header */}
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">{cat.label}</h4>
                      <p className="text-[10px] text-slate-400">{cat.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleBulkToggleCategory(selectedRole, cat.id, true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      Enable All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => handleBulkToggleCategory(selectedRole, cat.id, false)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                {/* Permissions Grid */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {defs.map((def) => {
                    const isEnabled = Boolean(localMap[selectedRole]?.[def.key]);
                    return (
                      <div
                        key={def.key}
                        onClick={() => togglePermission(selectedRole, def.key)}
                        className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start justify-between gap-3 select-none ${
                          isEnabled
                            ? 'border-emerald-500 bg-emerald-50/30 shadow-2xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900">{def.label}</span>
                            {def.badge && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                {def.badge}
                              </span>
                            )}
                            {def.riskLevel === 'high' && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-red-100 text-red-800 border border-red-200">
                                Sensitive
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">{def.description}</p>
                        </div>

                        {/* Interactive iOS Toggle */}
                        <div
                          className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${
                            isEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Side-by-Side Comparison Matrix View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-5 min-w-[260px]">Privilege & Capability</th>
                  <th className="py-3.5 px-4 text-center">Category</th>
                  {rolesList.map((r) => (
                    <th key={r} className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-slate-800">{ROLE_CONFIG_META[r].label}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{ROLE_CONFIG_META[r].alias}</span>
                      </div>
                    </th>
                  ))}
                  <th className="py-3.5 px-4 text-center bg-slate-100/60">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        Owner
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold">Full Root</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDefinitions.map((def) => {
                  return (
                    <tr key={def.key} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-5">
                        <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                          <span>{def.label}</span>
                          {def.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              {def.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 leading-tight mt-0.5 line-clamp-1">
                          {def.description}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {def.categoryLabel}
                        </span>
                      </td>

                      {rolesList.map((r) => {
                        const isChecked = Boolean(localMap[r]?.[def.key]);
                        return (
                          <td key={r} className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => togglePermission(r, def.key)}
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center mx-auto transition cursor-pointer ${
                                isChecked
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                  : 'bg-white border-slate-300 text-transparent hover:border-slate-400'
                              }`}
                              title={`${isChecked ? 'Revoke' : 'Grant'} ${def.label} for ${ROLE_CONFIG_META[r].label}`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>
                          </td>
                        );
                      })}

                      {/* Owner locked full check */}
                      <td className="py-3 px-4 text-center bg-slate-50/60">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center mx-auto">
                          <Check className="w-4 h-4 stroke-[3]" />
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

      {/* Floating / Sticky Save Action Bar */}
      <div className="sticky bottom-4 z-30 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isDirty ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {isDirty ? `${diffCount} unsaved modification${diffCount === 1 ? '' : 's'}` : 'All Role Privileges Synced'}
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live Immediate Effect
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Changes take immediate effect across all cashier tills, tablets, and manager registers as soon as you save.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isDirty && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              Discard Changes
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Applying Live...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Role Privileges</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Clone / Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-black text-sm text-slate-800">
                Clone Permissions to {ROLE_CONFIG_META[selectedRole].label}
              </h4>
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Select which role’s privilege setup you would like to copy into <strong className="text-slate-800">{ROLE_CONFIG_META[selectedRole].label}</strong>:
            </p>

            <div className="space-y-2">
              {rolesList
                .filter((r) => r !== selectedRole)
                .map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCopySourceRole(r)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between ${
                      copySourceRole === r
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{ROLE_CONFIG_META[r].label}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {getRoleActiveCount(r)} permissions
                    </span>
                  </button>
                ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCopyPermissions}
                className="px-4 py-2 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
              >
                Copy Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
