import React, { useMemo, useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePos } from '../../context/PosContext';
import {
  analyzeImportedProductsCsv,
  downloadProductCsvTemplate,
  ParsedCsvProductRow,
} from '../../utils/inventoryCsv';

interface InventoryCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryCsvModal: React.FC<InventoryCsvModalProps> = ({ isOpen, onClose }) => {
  const {
    products,
    suppliers,
    locations,
    currentLocation,
    bulkAddProducts,
    bulkUpdateProducts,
    showToast,
  } = usePos();

  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState('');
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip' | 'update'>('skip');

  const parsed = useMemo(() => {
    if (!csvText.trim()) return { headers: [], rows: [] as ParsedCsvProductRow[] };
    return analyzeImportedProductsCsv(csvText, products, suppliers, locations, currentLocation.id);
  }, [csvText, products, suppliers, locations, currentLocation.id]);

  const counts = useMemo(() => {
    let validNew = 0;
    let duplicates = 0;
    let errors = 0;
    parsed.rows.forEach((r) => {
      if (r.status === 'new') validNew += 1;
      else if (r.status === 'duplicate') duplicates += 1;
      else errors += 1;
    });
    return { validNew, duplicates, errors };
  }, [parsed.rows]);

  if (!isOpen) return null;

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ''));
    };
    reader.readAsText(file);
  };

  const handleImportCommit = () => {
    const newDrafts = parsed.rows.filter((r) => r.status === 'new').map((r) => r.draft);
    const dupUpdates =
      duplicatePolicy === 'update'
        ? parsed.rows
            .filter((r) => r.status === 'duplicate' && r.matchedProductId)
            .map((r) => ({
              id: r.matchedProductId!,
              updates: {
                name: r.draft.name,
                category: r.draft.category,
                supplierId: r.draft.supplierId,
                supplierName: r.draft.supplierName,
                buyingPrice: r.draft.buyingPrice,
                sellingPrice: r.draft.sellingPrice,
                unit: r.draft.unit,
                reorderPoint: r.draft.reorderPoint,
                description: r.draft.description,
              },
            }))
        : [];

    if (newDrafts.length === 0 && dupUpdates.length === 0) {
      showToast('No valid rows ready to import.', 'warning');
      return;
    }

    if (newDrafts.length > 0) {
      bulkAddProducts(newDrafts);
    }
    if (dupUpdates.length > 0) {
      bulkUpdateProducts(
        dupUpdates,
        `Updated ${dupUpdates.length} existing products from CSV`
      );
    }

    setCsvText('');
    setFileName(null);
    onClose();
  };

  const actionCount =
    counts.validNew + (duplicatePolicy === 'update' ? counts.duplicates : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Import Catalog from CSV</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            aria-label="Close CSV import modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
            <div className="text-xs text-slate-600">
              Upload a CSV file with columns like <span className="font-mono">Name</span>,{' '}
              <span className="font-mono">SKU</span>, <span className="font-mono">Barcode</span>,{' '}
              <span className="font-mono">Buying Price</span>, <span className="font-mono">Selling Price</span>.
            </div>
            <button
              type="button"
              onClick={() => downloadProductCsvTemplate(locations)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download Template</span>
            </button>
          </div>

          <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 bg-white cursor-pointer transition">
            <Upload className="w-5 h-5 text-slate-400 mb-2" />
            <span className="text-xs font-semibold text-slate-800">
              {fileName ? `Loaded: ${fileName}` : 'Choose a CSV file from your computer'}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              Supports standard UTF-8 CSV exports from Excel or Google Sheets
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
              className="hidden"
            />
          </label>

          {parsed.rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-emerald-700 tabular-nums">
                    {counts.validNew} new
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-semibold text-amber-700 tabular-nums">
                    {counts.duplicates} matching SKU/barcode
                  </span>
                  {counts.errors > 0 && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="font-semibold text-rose-600 tabular-nums">
                        {counts.errors} invalid
                      </span>
                    </>
                  )}
                </div>

                {counts.duplicates > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Existing SKUs:</span>
                    <select
                      value={duplicatePolicy}
                      onChange={(e) => setDuplicatePolicy(e.target.value as 'skip' | 'update')}
                      className="px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-700 bg-white"
                    >
                      <option value="skip">Skip duplicates</option>
                      <option value="update">Update existing prices &amp; details</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3">SKU</th>
                      <th className="py-2 px-3 text-right">Selling</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsed.rows.slice(0, 50).map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-500">
                          {row.rowNumber}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {row.draft.name}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">{row.draft.sku}</td>
                        <td className="py-2 px-3 font-mono tabular-nums text-right text-slate-800">
                          {currentLocation.currency} {row.draft.sellingPrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-3">
                          {row.status === 'error' ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                              <AlertCircle className="w-3 h-3" />
                              <span>{row.error}</span>
                            </span>
                          ) : row.status === 'duplicate' ? (
                            <span className="text-amber-700 font-medium">
                              {duplicatePolicy === 'update' ? 'Will update' : 'Skipped (exists)'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Ready</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImportCommit}
            disabled={actionCount === 0}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            Import {actionCount > 0 ? `${actionCount} Products` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
