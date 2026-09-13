import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { usePos } from '../context/PosContext';

export const DestructiveConfirmModal: React.FC = () => {
  const { pendingDestructiveAction, confirmDestructiveAction, cancelDestructiveAction, isSuperAdmin } = usePos();
  const [confirmInput, setConfirmInput] = useState('');

  if (!pendingDestructiveAction) return null;

  const requiresTyping = isSuperAdmin;
  const isEnabled = !requiresTyping || confirmInput.trim().toUpperCase() === 'CONFIRM';

  const handleExecute = () => {
    if (!isEnabled) return;
    confirmDestructiveAction();
    setConfirmInput('');
  };

  const handleClose = () => {
    cancelDestructiveAction();
    setConfirmInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border-2 border-red-500">
        {/* Red Header Bar */}
        <div className="bg-red-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-red-700 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base leading-none">
                Destructive Action Confirmation
              </h3>
              <p className="text-[11px] text-red-100 mt-0.5">
                Super-Admin Safeguard Protocol
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-red-200 hover:text-white transition p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-slate-800">
          <div>
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider block mb-1">
              {pendingDestructiveAction.title}
            </span>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">
              {pendingDestructiveAction.description}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Permanent Impact: </span>
              <span>{pendingDestructiveAction.warningNote}</span>
            </div>
          </div>

          {/* Record Metadata Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span className="font-sans text-slate-500">Target Record Type:</span>
              <span className="font-bold text-slate-800">{pendingDestructiveAction.recordType}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-slate-500">Record ID:</span>
              <span className="text-slate-700">{pendingDestructiveAction.recordId}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-slate-500">Target Business Tenant:</span>
              <span className="text-blue-600 font-bold">{pendingDestructiveAction.businessId}</span>
            </div>
          </div>

          {/* Super-admin explicit typing requirement */}
          {requiresTyping && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Type <span className="text-red-600 font-black">CONFIRM</span> to authenticate this destructive deletion:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type CONFIRM"
                className="w-full px-3 py-2 text-sm border-2 border-slate-300 rounded-xl focus:border-red-500 focus:outline-none font-bold uppercase tracking-wider"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isEnabled}
            onClick={handleExecute}
            className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Confirm & Execute Deletion</span>
          </button>
        </div>
      </div>
    </div>
  );
};
