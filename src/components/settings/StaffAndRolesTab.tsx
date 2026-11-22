import React, { useState, useMemo, useCallback, useDeferredValue, useRef } from 'react';
import { Users, Shield, Plus, Lock, Search, X } from 'lucide-react';
import { usePos } from '../../context/PosContext';
import { Cashier } from '../../types';
import { SettingsSectionHeader } from '../common/SettingsSectionHeader';
import { RolePrivilegesPanel } from '../RolePrivilegesPanel';
import { StaffAccountModal } from './StaffAccountModal';
import { DeleteStaffConfirmModal } from './DeleteStaffConfirmModal';
import { StaffRosterRow, StaffMobileCard } from './StaffRosterItems';
import {
  getRequiredTierForStaffCount,
  isQuotaAtOrAboveLimit,
} from '../../utils/subscriptionEntitlements';

type StaffSubTabId = 'roster' | 'permissions';

export const StaffAndRolesTab: React.FC = React.memo(() => {
  const {
    currentBusiness,
    locations,
    systemUsers,
    allSystemUsers,
    currentUser,
    isSuperAdmin,
    createSystemUser,
    updateSystemUser,
    deleteSystemUser,
    entitlements,
    openUpgradePrompt,
  } = usePos();

  const [subTab, setSubTab] = useState<StaffSubTabId>('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [roleFilter, setRoleFilter] = useState<Cashier['role'] | 'all'>('all');

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Cashier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cashier | null>(null);

  const rosterTabRef = useRef<HTMLButtonElement>(null);
  const permissionsTabRef = useRef<HTMLButtonElement>(null);

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    locations.forEach((loc) => {
      map.set(loc.id, loc.name);
    });
    return map;
  }, [locations]);

  const filteredUsers = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return systemUsers.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }
      if (!q) return true;
      const branchName = user.assignedLocationId
        ? branchNameById.get(user.assignedLocationId)?.toLowerCase() || ''
        : 'all branches';
      return (
        user.name.toLowerCase().includes(q) ||
        user.username.toLowerCase().includes(q) ||
        (user.code || '').toLowerCase().includes(q) ||
        user.role.replace('_', ' ').toLowerCase().includes(q) ||
        branchName.includes(q)
      );
    });
  }, [systemUsers, roleFilter, deferredSearch, branchNameById]);

  const hasActiveFilters = searchQuery.trim().length > 0 || roleFilter !== 'all';
  const isStaffQuotaReached =
    !isSuperAdmin && isQuotaAtOrAboveLimit(systemUsers.length, entitlements.limits.maxStaffUsers);

  const handleOpenCreateModal = useCallback(() => {
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
    setEditingUser(null);
    setIsAccountModalOpen(true);
  }, [isSuperAdmin, entitlements, systemUsers.length, openUpgradePrompt]);

  const handleEditUser = useCallback((user: Cashier) => {
    setEditingUser(user);
    setIsAccountModalOpen(true);
  }, []);

  const handleCloseAccountModal = useCallback(() => {
    setIsAccountModalOpen(false);
    setEditingUser(null);
  }, []);

  const handleRequestDelete = useCallback((user: Cashier) => {
    setDeleteTarget(user);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const handleConfirmDelete = useCallback(
    (user: Cashier) => {
      deleteSystemUser(user.id);
      setDeleteTarget(null);
    },
    [deleteSystemUser]
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setRoleFilter('all');
  }, []);

  const handleSubTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next: StaffSubTabId = subTab === 'roster' ? 'permissions' : 'roster';
        setSubTab(next);
        if (next === 'roster') {
          rosterTabRef.current?.focus();
        } else {
          permissionsTabRef.current?.focus();
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        setSubTab('roster');
        rosterTabRef.current?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        setSubTab('permissions');
        permissionsTabRef.current?.focus();
      }
    },
    [subTab]
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Sub-navigation between Team Roster and Role Permissions (WAI-ARIA Tablist) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Staff &amp; Role Access
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage operator accounts, terminal PINs, and live role permissions for {currentBusiness?.name || 'your store'}.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Staff and role configuration sections"
          onKeyDown={handleSubTabKeyDown}
          className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 self-start sm:self-auto"
        >
          <button
            ref={rosterTabRef}
            id="staff-tab-roster"
            type="button"
            role="tab"
            aria-selected={subTab === 'roster'}
            aria-controls="staff-panel-roster"
            tabIndex={subTab === 'roster' ? 0 : -1}
            onClick={() => setSubTab('roster')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
              subTab === 'roster'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Team Roster</span>
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              ({systemUsers.length})
            </span>
          </button>

          <button
            ref={permissionsTabRef}
            id="staff-tab-permissions"
            type="button"
            role="tab"
            aria-selected={subTab === 'permissions'}
            aria-controls="staff-panel-permissions"
            tabIndex={subTab === 'permissions' ? 0 : -1}
            onClick={() => setSubTab('permissions')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
              subTab === 'permissions'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Shield className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Role Permissions</span>
          </button>
        </div>
      </div>

      {/* PANEL 1: TEAM ROSTER */}
      <section
        id="staff-panel-roster"
        role="tabpanel"
        aria-labelledby="staff-tab-roster"
        tabIndex={0}
        hidden={subTab !== 'roster'}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-5 focus:outline-none"
      >
        <SettingsSectionHeader
          title="User Accounts Roster"
          description={`Accounts authorized to sign into terminals and registers for ${currentBusiness?.name || 'this store'}.`}
          meta={
            <span aria-live="polite">
              {hasActiveFilters
                ? `Showing ${filteredUsers.length} of ${systemUsers.length} accounts`
                : `${systemUsers.length} ${systemUsers.length === 1 ? 'account' : 'accounts'}`}
            </span>
          }
          actions={
            <button
              id="btn-provision-account"
              type="button"
              onClick={handleOpenCreateModal}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
            >
              {isStaffQuotaReached ? (
                <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>Provision Account</span>
            </button>
          }
        />

        {/* Responsive Search + Role Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <label htmlFor="staff-search-input" className="sr-only">
              Search staff by name, username, code, or branch
            </label>
            <Search
              className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="staff-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, @username, code, or branch..."
              className="w-full min-h-[40px] pl-9 pr-9 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear staff search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="sm:w-52">
            <label htmlFor="staff-role-filter" className="sr-only">
              Filter staff by role
            </label>
            <select
              id="staff-role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Cashier['role'] | 'all')}
              className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles ({systemUsers.length})</option>
              <option value="business_owner">Business Owner</option>
              <option value="manager">Store Manager</option>
              <option value="supervisor">Supervisor</option>
              <option value="cashier">Cashier</option>
              <option value="inventory_clerk">Inventory Clerk</option>
            </select>
          </div>
        </div>

        {/* Empty / No-Match State */}
        {filteredUsers.length === 0 ? (
          <div className="min-h-[220px] border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6 space-y-2.5">
            <Users className="w-7 h-7 text-slate-300 dark:text-slate-600" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {hasActiveFilters ? 'No matching staff accounts' : 'No staff accounts yet'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                {hasActiveFilters
                  ? 'Try clearing your search term or selecting a different role filter.'
                  : 'Provision your first cashier, supervisor, or store manager account.'}
              </p>
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-lg transition cursor-pointer"
              >
                Reset Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer"
              >
                Provision First Account
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (md+) */}
            <div className="hidden md:block border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">User</th>
                    <th scope="col" className="py-2.5 px-3">Role</th>
                    <th scope="col" className="py-2.5 px-3">Username</th>
                    <th scope="col" className="py-2.5 px-3">Assigned Branch</th>
                    <th scope="col" className="py-2.5 px-3">PIN Security</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((user) => {
                    const branchName = user.assignedLocationId
                      ? branchNameById.get(user.assignedLocationId) || null
                      : null;
                    const isSelf =
                      currentUser?.id === user.id || currentUser?.username === user.username;
                    return (
                      <StaffRosterRow
                        key={user.id}
                        user={user}
                        branchName={branchName}
                        isSelf={isSelf}
                        onEdit={handleEditUser}
                        onRequestDelete={handleRequestDelete}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< md) */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              {filteredUsers.map((user) => {
                const branchName = user.assignedLocationId
                  ? branchNameById.get(user.assignedLocationId) || null
                  : null;
                const isSelf =
                  currentUser?.id === user.id || currentUser?.username === user.username;
                return (
                  <StaffMobileCard
                    key={user.id}
                    user={user}
                    branchName={branchName}
                    isSelf={isSelf}
                    onEdit={handleEditUser}
                    onRequestDelete={handleRequestDelete}
                  />
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* PANEL 2: INTERACTIVE ROLE PERMISSIONS */}
      <section
        id="staff-panel-permissions"
        role="tabpanel"
        aria-labelledby="staff-tab-permissions"
        tabIndex={0}
        hidden={subTab !== 'permissions'}
        className="space-y-4 focus:outline-none"
      >
        {/* Role Hierarchy Summary Strip */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Role Access Overview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure granular terminal capabilities below. Updates sync automatically with Staff Management across all registers.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 border border-slate-200 dark:border-slate-800 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 text-xs overflow-hidden">
            <div className="p-3">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">Owner</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Full Tenant Control</span>
            </div>
            <div className="p-3">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">Manager</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Inventory &amp; Staff</span>
            </div>
            <div className="p-3">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">Supervisor</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Voids &amp; Shift Drops</span>
            </div>
            <div className="p-3">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">Cashier</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Sales &amp; Receipts</span>
            </div>
            <div className="p-3 col-span-2 sm:col-span-1">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block">Inv. Clerk</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Stock &amp; Transfers</span>
            </div>
          </div>
        </div>

        <RolePrivilegesPanel />
      </section>

      {/* Modals for Provisioning, Editing & Removal */}
      <StaffAccountModal
        isOpen={isAccountModalOpen}
        editingUser={editingUser}
        locations={locations}
        allSystemUsers={allSystemUsers}
        isSuperAdmin={isSuperAdmin}
        onClose={handleCloseAccountModal}
        onCreateUser={createSystemUser}
        onUpdateUser={updateSystemUser}
      />

      <DeleteStaffConfirmModal
        targetUser={deleteTarget}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
});

StaffAndRolesTab.displayName = 'StaffAndRolesTab';
