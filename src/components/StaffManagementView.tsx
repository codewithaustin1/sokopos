import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Building2,
  Trash2,
  Edit2,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Star,
  Sparkles,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Cashier } from '../types';
import { RolePrivilegesPanel } from './RolePrivilegesPanel';

export const StaffManagementView: React.FC = () => {
  const {
    currentUser,
    currentBusiness,
    systemUsers,
    allSystemUsers,
    createSystemUser,
    updateSystemUser,
    deleteSystemUser,
    locations,
    isSuperAdmin,
    openBusinessSettings,
    appointedDemoCashierId,
    appointDemoCashier,
  } = usePos();

  const isOwnerOrAdmin = currentUser.role === 'business_owner' || isSuperAdmin;

  const [activeStaffSubTab, setActiveStaffSubTab] = useState<'users' | 'privileges'>('users');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Cashier | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState<Cashier['role']>('cashier');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [code, setCode] = useState('');
  const [assignedLocationId, setAssignedLocationId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    setName('');
    setRole('cashier');
    setUsername('');
    setPin('');
    setCode(`#${Math.floor(1000 + Math.random() * 9000)}`);
    setAssignedLocationId(locations[0]?.id || '');
    setEditingUser(null);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: Cashier) => {
    setEditingUser(user);
    setName(user.name);
    setRole(user.role);
    setUsername(user.username || '');
    setPin(user.pin.startsWith('$2') || user.pin.includes('•') || user.pin.startsWith('[') ? '' : user.pin);
    setCode(user.code);
    setAssignedLocationId(user.assignedLocationId || locations[0]?.id || '');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) return;
    if (!editingUser && !pin.trim()) return;

    // Edge Case 3: Shared logins are prohibited, as they render attribution meaningless
    const cleanUsername = (username.trim() || name.toLowerCase().replace(/\s+/g, '.')).toLowerCase();
    const GENERIC_PROHIBITED = ['cashier', 'shared', 'pos', 'terminal', 'till', 'store', 'user', 'staff', 'counter', 'operator', 'guest', 'general'];
    if (GENERIC_PROHIBITED.includes(cleanUsername) || GENERIC_PROHIBITED.includes(name.trim().toLowerCase())) {
      setFormError(
        `Shared logins are prohibited: Generic identity "${cleanUsername}" is forbidden. Attribution requires real operator names and individual accounts.`
      );
      return;
    }

    const existingUserWithSameUsername = allSystemUsers.find(
      (u) => (!editingUser || u.id !== editingUser.id) && u.username?.trim().toLowerCase() === cleanUsername
    );
    if (existingUserWithSameUsername) {
      setFormError(
        `Username "${cleanUsername}" is already assigned to ${existingUserWithSameUsername.name}. No two staff members in SokoPoS can share a username.`
      );
      return;
    }

    const cleanCodeInput = code.trim().toLowerCase().replace(/^#/, '');
    if (cleanCodeInput) {
      const existingUserWithSameCode = allSystemUsers.find(
        (u) => (!editingUser || u.id !== editingUser.id) && u.code?.trim().toLowerCase().replace(/^#/, '') === cleanCodeInput
      );
      if (existingUserWithSameCode) {
        setFormError(
          `Staff ID "${code.trim()}" is already assigned to ${existingUserWithSameCode.name}. No two staff members in SokoPoS can share a Staff ID.`
        );
        return;
      }
    }

    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    setIsSubmitting(true);
    try {
      let ok = false;
      if (editingUser) {
        const updates: Partial<Cashier> = {
          name: name.trim(),
          initials,
          role,
          username: cleanUsername,
          code: code.trim(),
          assignedLocationId,
        };
        if (pin.trim()) {
          updates.pin = pin.trim();
        }
        ok = await updateSystemUser(editingUser.id, updates);
      } else {
        ok = await createSystemUser({
          name: name.trim(),
          initials,
          code: code.trim() || `#${Math.floor(1000 + Math.random() * 9000)}`,
          username: cleanUsername,
          pin: pin.trim(),
          role,
          avatarColor: 'bg-blue-600',
          shiftStartedAt: new Date().toISOString(),
          assignedLocationId,
        });
      }
      if (ok) {
        setIsAddModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOwnerOrAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-100 p-6">
        <div className="bg-white max-w-md w-full p-8 rounded-2xl border border-slate-200 shadow-xl text-center space-y-3">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-800">Owner Access Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Only authenticated business owners or platform administrators can manage system users. You are currently authenticated as{' '}
            <span className="font-bold text-slate-700">{currentUser.name} ({currentUser.role})</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-800">
              {activeStaffSubTab === 'users' ? 'System Users & Staff Accounts' : 'Role Privileges & Access Control'}
            </h2>
            <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {currentBusiness.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeStaffSubTab === 'users'
              ? 'Assign credentials and branch permissions. System users are strictly scoped to this business tenant.'
              : 'Configure granular live permissions for each staff role. Changes take immediate effect as soon as you click Save.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeStaffSubTab === 'users' ? (
            <>
              <button
                onClick={() => setActiveStaffSubTab('privileges')}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-200 shadow-2xs"
                title="Manage Live Role Privileges"
              >
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Manage Role Privileges</span>
              </button>
              <button
                onClick={() => openBusinessSettings('profile')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300 shadow-2xs"
              >
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Business Profile & Branches</span>
              </button>
              <button
                onClick={openAddModal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Provision System User</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveStaffSubTab('users')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300 shadow-2xs"
              >
                <Users className="w-4 h-4 text-blue-600" />
                <span>Active Users ({systemUsers.length})</span>
              </button>
              <button
                onClick={openAddModal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Provision System User</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-Navigation Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveStaffSubTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStaffSubTab === 'users'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Active System Users</span>
            <span
              className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                activeStaffSubTab === 'users' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {systemUsers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveStaffSubTab('privileges')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeStaffSubTab === 'privileges'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Shield className={`w-3.5 h-3.5 ${activeStaffSubTab === 'privileges' ? 'text-amber-300' : 'text-indigo-600'}`} />
            <span>Role Privileges & Access Control</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Takes immediate effect on Save</span>
        </div>
      </div>

      {/* Main Content Area */}
      {activeStaffSubTab === 'users' ? (
        <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 pb-20 md:pb-8">
          {/* Appointed Public Demo Notice & Control Banner */}
          <div className="bg-gradient-to-r from-amber-50 via-amber-50/60 to-orange-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Star className="w-5 h-5 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                    Public Demo Appointed Profile
                  </h4>
                  <span className="bg-amber-200/80 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Super Admin Managed
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  When visitors launch "Try Live Demo", the staff login interface automatically prefills the cashier profile designated below. The demo session runs on an isolated sandbox dataset so real inventory and production accounts remain pristine.
                </p>
              </div>
            </div>
            {(() => {
              const appointed = systemUsers.find((u) => u.id === appointedDemoCashierId);
              return (
                <div className="shrink-0 bg-white border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <div className="text-left">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Current Appointed Profile</div>
                    <div className="text-xs font-black text-slate-800">
                      {appointed ? `${appointed.name} (${appointed.code || appointed.username})` : 'Default Cashier (#7000)'}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Users Container */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h3 className="font-bold text-sm text-slate-800">
              Active System Users ({systemUsers.length})
            </h3>
            <span className="text-xs text-slate-400">
              Owner: <span className="font-bold text-slate-700">{currentBusiness.ownerEmail}</span>
            </span>
          </div>

          {/* Mobile User Cards (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {systemUsers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">No users created yet.</div>
            ) : (
              systemUsers.map((user) => {
                const branch = locations.find((l) => l.id === user.assignedLocationId);
                const isAppointed = user.id === appointedDemoCashierId;
                return (
                  <div key={user.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-full ${user.avatarColor} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                        >
                          {user.initials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{user.name}</div>
                          <div className="text-[11px] text-slate-400">
                            Username: <span className="font-mono font-bold text-slate-700">{user.username || user.code}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`font-bold text-[10px] uppercase px-2 py-0.5 rounded-full shrink-0 ${
                            user.role === 'manager'
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'supervisor'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {user.role}
                        </span>
                        {isAppointed && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Demo Appointed
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg text-slate-600">
                      <div>
                        Branch: <strong className="text-slate-800">{branch?.name || 'All Branches'}</strong>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                        <Shield className="w-3 h-3" /> PIN Protected
                      </div>
                    </div>

                    {/* Appointed demo profile toggle in mobile */}
                    {isAppointed ? (
                      <div className="flex items-center justify-between text-xs bg-amber-50/80 border border-amber-200 p-2 rounded-lg text-amber-900">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>Appointed Demo Profile</span>
                        </div>
                        <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                          Active Prefill
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => appointDemoCashier(user.id)}
                        className="w-full py-1.5 px-2 bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200 hover:border-amber-300 font-bold text-[11px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 text-slate-400" />
                        <span>Appoint for Public Demo Prefill</span>
                      </button>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 text-xs">
                      <button
                        onClick={() => openEditModal(user)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => deleteSystemUser(user.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table (md and up) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Login Username</th>
                  <th className="py-3 px-4">Terminal PIN</th>
                  <th className="py-3 px-4">Assigned Branch</th>
                  <th className="py-3 px-4 text-center">Demo Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {systemUsers.map((user) => {
                  const branch = locations.find((l) => l.id === user.assignedLocationId);
                  const isAppointed = user.id === appointedDemoCashierId;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full ${user.avatarColor} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                          >
                            {user.initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{user.name}</div>
                            <div className="text-[11px] text-slate-400">Code: {user.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`font-bold text-[10px] uppercase px-2 py-0.5 rounded-full ${
                            user.role === 'manager'
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'supervisor'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-slate-700">
                        {user.username || user.code}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-500 text-xs">
                        <span className="tracking-widest font-bold">••••</span>
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-medium">
                        {branch?.name || 'All Store Branches'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {isAppointed ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                            title="This cashier profile is prefilled on the Try Live Demo login interface"
                          >
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            Appointed Demo Profile
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => appointDemoCashier(user.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition cursor-pointer"
                            title="Appoint this cashier profile to be prefilled for public live demo visitors"
                          >
                            <Star className="w-3 h-3 text-slate-400" />
                            Appoint for Demo
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSystemUser(user.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                          title="Delete User (Safeguard Protected)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ) : (
      <div className="p-3.5 sm:p-6 pb-20 md:pb-8">
        <RolePrivilegesPanel />
      </div>
    )}

      {/* Add / Edit System User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <h3 className="font-black text-sm">
                  {editingUser ? 'Edit System User' : 'Create New System User'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mary Aoko"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-bold bg-white"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Store Manager</option>
                    <option value="inventory_clerk">Inventory Clerk</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employee Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="#8845"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Login Username *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="mary.aoko"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editingUser ? 'New 4-Digit PIN (optional)' : '4-Digit PIN *'}
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required={!editingUser}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder={editingUser ? 'Leave blank to keep current' : '1234'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-mono tracking-widest"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Store Branch</label>
                <select
                  value={assignedLocationId}
                  onChange={(e) => setAssignedLocationId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium bg-white"
                >
                  <option value="">All Branches</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {isSubmitting
                      ? 'Hashing & Saving...'
                      : editingUser
                      ? 'Save Changes'
                      : 'Create User'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
