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
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Cashier } from '../types';

export const StaffManagementView: React.FC = () => {
  const {
    currentUser,
    currentBusiness,
    systemUsers,
    createSystemUser,
    updateSystemUser,
    deleteSystemUser,
    locations,
    isSuperAdmin,
    openBusinessSettings,
  } = usePos();

  const isOwnerOrAdmin = currentUser.role === 'business_owner' || isSuperAdmin;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Cashier | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState<'cashier' | 'manager' | 'supervisor' | 'inventory_clerk'>('cashier');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [code, setCode] = useState('');
  const [assignedLocationId, setAssignedLocationId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAddModal = () => {
    setName('');
    setRole('cashier');
    setUsername('');
    setPin('');
    setCode(`#${Math.floor(1000 + Math.random() * 9000)}`);
    setAssignedLocationId(locations[0]?.id || '');
    setEditingUser(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (user: Cashier) => {
    setEditingUser(user);
    setName(user.name);
    setRole(user.role);
    setUsername(user.username || '');
    setPin(user.pin.startsWith('$2') ? '' : user.pin);
    setCode(user.code);
    setAssignedLocationId(user.assignedLocationId || locations[0]?.id || '');
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!editingUser && !pin.trim()) return;

    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const updates: Partial<Cashier> = {
          name: name.trim(),
          initials,
          role,
          username: username.trim().toLowerCase(),
          code: code.trim(),
          assignedLocationId,
        };
        if (pin.trim()) {
          updates.pin = pin.trim();
        }
        await updateSystemUser(editingUser.id, updates);
      } else {
        await createSystemUser({
          name: name.trim(),
          initials,
          code: code.trim() || `#${Math.floor(1000 + Math.random() * 9000)}`,
          username: (username.trim() || name.toLowerCase().replace(/\s+/g, '.')).toLowerCase(),
          pin: pin.trim(),
          role,
          avatarColor: 'bg-blue-600',
          shiftStartedAt: new Date().toISOString(),
          assignedLocationId,
        });
      }
      setIsAddModalOpen(false);
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
            <h2 className="text-lg font-black text-slate-800">System Users & Staff Accounts</h2>
            <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {currentBusiness.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Assign credentials and branch permissions. System users are strictly scoped to this business tenant.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Info Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-start gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block">
              Multi-Tenancy & Data Isolation Enforced at Data-Access Layer
            </span>
            <p>
              Users created here can only log in and view data belonging to{' '}
              <strong className="text-slate-800">{currentBusiness.name}</strong>. They are strictly prohibited from querying or accessing inventory, sales, or reports from other business accounts.
            </p>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">
              Active System Users ({systemUsers.length})
            </h3>
            <span className="text-xs text-slate-400">
              Business Owner: <span className="font-bold text-slate-700">{currentBusiness.ownerEmail}</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Login Username</th>
                  <th className="py-3 px-4">Terminal PIN</th>
                  <th className="py-3 px-4">Assigned Branch</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {systemUsers.map((user) => {
                  const branch = locations.find((l) => l.id === user.assignedLocationId);
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
                        <div className="flex items-center gap-1.5">
                          <span className="tracking-widest font-bold">••••</span>
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                            <Shield className="w-3 h-3 text-emerald-600" />
                            Bcrypt
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-medium">
                        {branch?.name || 'All Store Branches'}
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
