import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Tag,
  Package,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Category } from '../types';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#6366f1', // indigo
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ef4444', // red
  '#64748b', // slate
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    categoryList,
    products,
    addCategory,
    updateCategory,
    deleteCategory,
    currentBusiness,
  } = usePos();

  // Create form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setIsAddingNew(true);
    setNewName('');
    setNewDescription('');
    setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setAddError(null);
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewName('');
    setNewDescription('');
    setAddError(null);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const trimmed = newName.trim();
    if (!trimmed) {
      setAddError('Category name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addCategory({
        name: trimmed,
        description: newDescription.trim() || undefined,
        color: newColor,
      });
      setIsAddingNew(false);
      setNewName('');
      setNewDescription('');
    } catch (err: any) {
      setAddError(err?.message || 'Failed to add category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditDescription(cat.description || '');
    setEditColor(cat.color || PRESET_COLORS[0]);
    setEditError(null);
    setConfirmDeleteId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditError(null);
  };

  const handleSaveEdit = async (id: string) => {
    setEditError(null);
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Category name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCategory(id, {
        name: trimmed,
        description: editDescription.trim() || undefined,
        color: editColor,
      });
      setEditingId(null);
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    setIsSubmitting(true);
    try {
      await deleteCategory(cat.id);
      setConfirmDeleteId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Category Manager
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                  {currentBusiness?.name || 'Shop'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Categories are unique to this shop and assigned during product creation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Active Shop Categories ({categoryList.length})
            </span>
            {!isAddingNew && (
              <button
                type="button"
                onClick={handleStartAdd}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Category
              </button>
            )}
          </div>

          {/* Add New Category Form */}
          {isAddingNew && (
            <form
              onSubmit={handleSaveNew}
              className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  New Shop Category
                </span>
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>

              {addError && (
                <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 p-2 rounded-lg border border-red-200 dark:border-red-900/40 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {addError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Organic Produce, Cold Drinks..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description for cashiers"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tag Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        newColor === color
                          ? 'border-slate-900 dark:border-white scale-110 shadow-xs'
                          : 'border-transparent hover:scale-105 opacity-80'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition"
                >
                  {isSubmitting ? 'Saving...' : 'Create Category'}
                </button>
              </div>
            </form>
          )}

          {/* List of Categories */}
          <div className="space-y-2">
            {categoryList.map((cat) => {
              const isDefaultAll = cat.name.toLowerCase() === 'all';
              const isEditing = editingId === cat.id;
              const isConfirmingDelete = confirmDeleteId === cat.id;

              // Count items with this category in this shop
              const productCount = products.filter((p) => {
                const prodCat = (!p.category || !p.category.trim()) ? 'All' : p.category.trim();
                return prodCat.toLowerCase() === cat.name.toLowerCase();
              }).length;

              if (isEditing) {
                return (
                  <div
                    key={cat.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-blue-400 dark:border-blue-600 rounded-xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Edit Category
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>

                    {editError && (
                      <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 p-1.5 rounded">
                        {editError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Category Name"
                        disabled={isDefaultAll}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-medium"
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-5 h-5 rounded-full border ${
                              editColor === c
                                ? 'border-slate-900 dark:border-white scale-110'
                                : 'border-transparent'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id)}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold"
                        >
                          <Check className="w-3 h-3" />
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: cat.color || '#3b82f6' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {cat.name}
                        </span>
                        {isDefaultAll && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Default / Catch-all
                          </span>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      <Package className="w-3 h-3 text-slate-400" />
                      {productCount} {productCount === 1 ? 'item' : 'items'}
                    </span>

                    <button
                      type="button"
                      title="Edit Category"
                      onClick={() => handleStartEdit(cat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {!isDefaultAll && (
                      <>
                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/50 p-1 rounded-lg border border-red-200 dark:border-red-900/50">
                            <span className="text-[10px] font-bold text-red-700 dark:text-red-300 pl-1">
                              Reassign to "All"?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(cat)}
                              disabled={isSubmitting}
                              className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-[10px]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            title="Delete Category"
                            onClick={() => setConfirmDeleteId(cat.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500">
          <span>
            Deleting a category automatically reassigns its products to <strong>"All"</strong>.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
