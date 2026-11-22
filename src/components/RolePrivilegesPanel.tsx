import React, { useState, useMemo, useEffect, useCallback, useDeferredValue } from 'react';
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
  Lock,
  Table as TableIcon,
  LayoutGrid,
  X,
  AlertTriangle,
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

const ROLES_LIST: ConfigurableStaffRole[] = ['manager', 'supervisor', 'cashier', 'inventory_clerk'];

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

export const RolePrivilegesPanel: React.FC<RolePrivilegesPanelProps> = React.memo(({ className = '' }) => {
  const {
    rolePermissions,
    updateRolePermissions,
    requireCapability,
  } = usePos();

  const [localMap, setLocalMap] = useState<RolePermissionsMap>(() =>
    JSON.parse(JSON.stringify(rolePermissions))
  );
  const [selectedRole, setSelectedRole] = useState<ConfigurableStaffRole>('cashier');
  const [selectedCategory, setSelectedCategory] = useState<PermissionCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [viewMode, setViewMode] = useState<'categories' | 'matrix'>('categories');
  const [isSaving, setIsSaving] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceRole, setCopySourceRole] = useState<ConfigurableStaffRole>('supervisor');
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const isDirty = useMemo(() => {
    return JSON.stringify(localMap) !== JSON.stringify(rolePermissions);
  }, [localMap, rolePermissions]);

  // Keep working copy synced with upstream changes when no local unsaved edits exist
  useEffect(() => {
    if (!isDirty) {
      setLocalMap(JSON.parse(JSON.stringify(rolePermissions)));
    }
  }, [rolePermissions, isDirty]);

  const diffCount = useMemo(() => {
    let count = 0;
    for (const r of ROLES_LIST) {
      for (const def of PERMISSION_DEFINITIONS) {
        if (localMap[r]?.[def.key] !== rolePermissions[r]?.[def.key]) {
          count++;
        }
      }
    }
    return count;
  }, [localMap, rolePermissions]);

  const togglePermission = useCallback((role: ConfigurableStaffRole, key: PermissionKey) => {
    setLocalMap((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [key]: !prev[role]?.[key],
      },
    }));
  }, []);

  const handleBulkToggleCategory = useCallback(
    (role: ConfigurableStaffRole, category: PermissionCategory, enable: boolean) => {
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
    },
    []
  );

  const handleGrantAll = useCallback((role: ConfigurableStaffRole) => {
    setLocalMap((prev) => {
      const updatedRole = { ...prev[role] };
      PERMISSION_DEFINITIONS.forEach((d) => {
        updatedRole[d.key] = true;
      });
      return { ...prev, [role]: updatedRole };
    });
  }, []);

  const handleRevokeAll = useCallback((role: ConfigurableStaffRole) => {
    setLocalMap((prev) => {
      const updatedRole = { ...prev[role] };
      PERMISSION_DEFINITIONS.forEach((d) => {
        updatedRole[d.key] = false;
      });
      return { ...prev, [role]: updatedRole };
    });
  }, []);

  const handleCopyPermissions = useCallback(() => {
    if (copySourceRole === selectedRole) return;
    setLocalMap((prev) => ({
      ...prev,
      [selectedRole]: { ...prev[copySourceRole] },
    }));
    setShowCopyModal(false);
  }, [copySourceRole, selectedRole]);

  const handleConfirmResetDefaults = useCallback(() => {
    setLocalMap(JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)));
    setShowResetConfirmModal(false);
  }, []);

  const handleDiscard = useCallback(() => {
    setLocalMap(JSON.parse(JSON.stringify(rolePermissions)));
  }, [rolePermissions]);

  const handleSave = async () => {
    if (!requireCapability('granularRbac')) return;
    setIsSaving(true);
    try {
      await updateRolePermissions(localMap);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!showCopyModal && !showResetConfirmModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCopyModal(false);
        setShowResetConfirmModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showCopyModal, showResetConfirmModal]);

  const filteredDefinitions = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    return PERMISSION_DEFINITIONS.filter((def) => {
      const matchesCategory = selectedCategory === 'all' || def.category === selectedCategory;
      const matchesSearch =
        !query ||
        def.label.toLowerCase().includes(query) ||
        def.description.toLowerCase().includes(query) ||
        def.key.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, deferredSearchQuery]);

  const getRoleActiveCount = useCallback(
    (role: ConfigurableStaffRole) => Object.values(localMap[role] || {}).filter(Boolean).length,
    [localMap]
  );

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Control Deck */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                Role Privileges &amp; Permissions Matrix
              </h3>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                · Live sync across terminals
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure real-time permissions for staff roles. Saved changes apply immediately to registers and staff views.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
            <div
              role="group"
              aria-label="Permissions layout mode"
              className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center gap-1 text-xs border border-slate-200/80 dark:border-slate-700"
            >
              <button
                type="button"
                aria-pressed={viewMode === 'categories'}
                onClick={() => setViewMode('categories')}
                className={`min-h-[36px] px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  viewMode === 'categories'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Role Cards</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'matrix'}
                onClick={() => setViewMode('matrix')}
                className={`min-h-[36px] px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  viewMode === 'matrix'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Comparison Matrix</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowResetConfirmModal(true)}
              className="min-h-[40px] px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap"
              title="Reset all roles to factory defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span>Factory Defaults</span>
            </button>
          </div>
        </div>

        {/* Role Selector (Category View) */}
        {viewMode === 'categories' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5" role="group" aria-label="Select role to configure">
            {ROLES_LIST.map((r) => {
              const meta = ROLE_CONFIG_META[r];
              const isSelected = selectedRole === r;
              const activeCount = getRoleActiveCount(r);
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedRole(r)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {meta.label}
                    </span>
                    <span
                      className={`text-[11px] font-mono tabular-nums font-semibold shrink-0 ${
                        isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {activeCount}/{PERMISSION_DEFINITIONS.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate w-full">
                    {meta.alias}
                  </span>
                </button>
              );
            })}

            <div
              aria-label="Owner / Admin role has full fixed access"
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 text-left flex flex-col justify-between gap-1"
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1 truncate">
                  <Lock className="w-3 h-3 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>Owner</span>
                </span>
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
                  Full
                </span>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate w-full">
                Master tenant access
              </span>
            </div>
          </div>
        )}

        {/* Quick Tools Bar (Category View) */}
        {viewMode === 'categories' && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {ROLE_CONFIG_META[selectedRole].label}
              </span>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-600 dark:text-slate-400">
                {ROLE_CONFIG_META[selectedRole].description}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleGrantAll(selectedRole)}
                className="min-h-[34px] px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition cursor-pointer"
              >
                Grant All
              </button>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => handleRevokeAll(selectedRole)}
                className="min-h-[34px] px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-md transition cursor-pointer"
              >
                Revoke All
              </button>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => {
                  const fallback = ROLES_LIST.find((r) => r !== selectedRole) || 'supervisor';
                  setCopySourceRole(fallback);
                  setShowCopyModal(true);
                }}
                className="min-h-[34px] px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-md inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Clone Role</span>
              </button>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div
            role="group"
            aria-label="Filter permissions by category"
            className="flex flex-wrap items-center gap-1.5 text-xs"
          >
            <button
              type="button"
              aria-pressed={selectedCategory === 'all'}
              onClick={() => setSelectedCategory('all')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg font-medium transition cursor-pointer tabular-nums ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 dark:bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({PERMISSION_DEFINITIONS.length})
            </button>
            {PERMISSION_CATEGORIES.map((cat) => {
              const count = PERMISSION_DEFINITIONS.filter((d) => d.category === cat.id).length;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-lg font-medium transition cursor-pointer tabular-nums whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[220px]">
            <label htmlFor="rbac-permission-search" className="sr-only">
              Filter permissions
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              id="rbac-permission-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter permissions..."
              className="w-full min-h-[38px] pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Main Body */}
      {filteredDefinitions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center min-h-[200px] flex flex-col items-center justify-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            No permissions match your filter
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Clear the search query or switch back to all categories.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="mt-3 min-h-[38px] px-3.5 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'categories' ? (
        <div className="space-y-4">
          {PERMISSION_CATEGORIES.map((cat) => {
            const defs = filteredDefinitions.filter((d) => d.category === cat.id);
            if (defs.length === 0) return null;

            const Icon = getCategoryIcon(cat.id);

            return (
              <section
                key={cat.id}
                aria-labelledby={`rbac-cat-${cat.id}`}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <div className="px-4 sm:px-5 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h4 id={`rbac-cat-${cat.id}`} className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {cat.label}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <button
                      type="button"
                      onClick={() => handleBulkToggleCategory(selectedRole, cat.id, true)}
                      className="min-h-[32px] px-2 font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Enable All
                    </button>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={() => handleBulkToggleCategory(selectedRole, cat.id, false)}
                      className="min-h-[32px] px-2 font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:underline cursor-pointer"
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {defs.map((def) => {
                    const isEnabled = Boolean(localMap[selectedRole]?.[def.key]);
                    return (
                      <button
                        key={def.key}
                        type="button"
                        role="switch"
                        aria-checked={isEnabled}
                        onClick={() => togglePermission(selectedRole, def.key)}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-start justify-between gap-3 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                          isEnabled
                            ? 'border-emerald-500/70 bg-emerald-50/40 dark:bg-emerald-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1 pr-2 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {def.label}
                            </span>
                            {def.badge && (
                              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                                · {def.badge}
                              </span>
                            )}
                            {def.riskLevel === 'high' && (
                              <span className="text-[11px] font-medium text-red-700 dark:text-red-400">
                                · Sensitive
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                            {def.description}
                          </p>
                        </div>

                        <span
                          aria-hidden="true"
                          className={`w-10 h-6 rounded-full transition-colors flex items-center p-0.5 shrink-0 mt-0.5 ${
                            isEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-white shadow-xs" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse" aria-label="Role permissions comparison matrix">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th scope="col" className="py-3 px-4 min-w-[240px]">Privilege &amp; Capability</th>
                  <th scope="col" className="py-3 px-3 text-center">Category</th>
                  {ROLES_LIST.map((r) => (
                    <th key={r} scope="col" className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {ROLE_CONFIG_META[r].label}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                          {ROLE_CONFIG_META[r].alias}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th scope="col" className="py-3 px-3 text-center bg-slate-100/70 dark:bg-slate-900">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                        <span>Owner</span>
                      </span>
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        Full Access
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDefinitions.map((def) => (
                  <tr key={def.key} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5 flex-wrap">
                        <span>{def.label}</span>
                        {def.badge && (
                          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            · {def.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 line-clamp-1">
                        {def.description}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {def.categoryLabel}
                    </td>

                    {ROLES_LIST.map((r) => {
                      const isChecked = Boolean(localMap[r]?.[def.key]);
                      return (
                        <td key={r} className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            aria-pressed={isChecked}
                            aria-label={`${isChecked ? 'Revoke' : 'Grant'} ${def.label} for ${ROLE_CONFIG_META[r].label}`}
                            onClick={() => togglePermission(r, def.key)}
                            className={`w-9 h-9 rounded-lg border inline-flex items-center justify-center transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
                              isChecked
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-transparent hover:border-slate-400'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[2.75]" aria-hidden="true" />
                          </button>
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-3 text-center bg-slate-50/60 dark:bg-slate-950/60">
                      <div
                        aria-label={`Owner always has ${def.label}`}
                        className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 inline-flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 stroke-[2.75]" aria-hidden="true" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clean Sticky Save Bar */}
      <div
        role="region"
        aria-label="Role permission changes status"
        className="sticky bottom-3 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-md p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div aria-live="polite" className="min-w-0">
          <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {isDirty
              ? `${diffCount} unsaved permission change${diffCount === 1 ? '' : 's'}`
              : 'All role permissions synced'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isDirty
              ? 'Save to apply updated access rules immediately across all store terminals.'
              : 'Changes apply across registers and staff tabs as soon as you save.'}
          </p>
        </div>

        <div className="flex items-center gap-2 justify-end shrink-0">
          {isDirty && (
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition cursor-pointer disabled:opacity-50"
            >
              Discard
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Save Role Privileges</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Clone Role Modal */}
      {showCopyModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clone-role-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4"
          onClick={() => setShowCopyModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 id="clone-role-title" className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Clone Permissions to {ROLE_CONFIG_META[selectedRole].label}
              </h4>
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                aria-label="Close clone dialog"
                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Select a role whose permissions will replace{' '}
              <strong className="text-slate-900 dark:text-slate-100">{ROLE_CONFIG_META[selectedRole].label}</strong>:
            </p>

            <div className="space-y-2">
              {ROLES_LIST
                .filter((r) => r !== selectedRole)
                .map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={copySourceRole === r}
                    onClick={() => setCopySourceRole(r)}
                    className={`w-full min-h-[42px] px-3 py-2 rounded-lg border text-left text-xs font-medium transition flex items-center justify-between cursor-pointer ${
                      copySourceRole === r
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{ROLE_CONFIG_META[r].label}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {getRoleActiveCount(r)} permissions
                    </span>
                  </button>
                ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="min-h-[38px] px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCopyPermissions}
                className="min-h-[38px] px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
              >
                Copy Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Factory Defaults Confirmation Modal */}
      {showResetConfirmModal && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="reset-defaults-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4"
          onClick={() => setShowResetConfirmModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h4 id="reset-defaults-title" className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Restore Factory Defaults?
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This stages default SokoPoS permissions for Manager, Supervisor, Cashier, and Inventory Clerk. Click Save Role Privileges afterward to apply live.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="min-h-[38px] px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetDefaults}
                className="min-h-[38px] px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
              >
                Stage Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

RolePrivilegesPanel.displayName = 'RolePrivilegesPanel';
