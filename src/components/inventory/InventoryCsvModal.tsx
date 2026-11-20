import React, { useMemo, useState, useEffect, useId } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePos } from '../../context/PosContext';
import {
  analyzeImportedProductsCsv,
  downloadProductCsvTemplate,
  ParsedCsvProductRow,
} from '../../utils/inventoryCsv';
import { getRequiredTierForProductCount } from '../../utils/subscriptionEntitlements';

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
    entitlements,
    isSuperAdmin,
    openUpgradePrompt,
  } = usePos();

  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState('');
  const [pasteMode, setPasteMode] = useState(false);
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip' | 'update'>('skip');

  const titleId = useId();
  const pasteAreaId = useId();
  const duplicatePolicyId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const parsed = useMemo(() => {
    if (!csvText.trim()) {
      return {
        headers: [] as string[],
        missingRequiredColumns: [] as string[],
        rows: [] as ParsedCsvProductRow[],
      };
    }
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

  const branchStockColumnExample = useMemo(() => {
    if (locations.length === 0) return 'Stock';
    if (locations.length === 1) return `Stock (${locations[0].name})`;
    return locations.map((loc) => `Stock (${loc.name})`).join(', ');
  }, [locations]);

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

  const handleClose = () => {
    setCsvText('');
    setFileName(null);
    setPasteMode(false);
    onClose();
  };

  const handleImportCommit = () => {
    if (parsed.missingRequiredColumns.length > 0) {
      showToast(
        `Missing required CSV columns: ${parsed.missingRequiredColumns.join(', ')}`,
        'error'
      );
      return;
    }

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
      const maxProducts = isSuperAdmin ? -1 : entitlements.limits.maxProducts;
      if (maxProducts > 0 && products.length + newDrafts.length > maxProducts) {
        openUpgradePrompt({
          title: 'CSV Import Exceeds Product Limit',
          description: `Importing ${newDrafts.length} new SKUs would bring your catalog to ${
            products.length + newDrafts.length
          } products, exceeding the ${maxProducts}-SKU cap on ${entitlements.tierName}.`,
          requiredTier: getRequiredTierForProductCount(products.length + newDrafts.length),
          featureLabel: 'Unlimited Product Catalog',
          quotaMetric: {
            label: 'Inventory SKUs',
            used: products.length,
            limit: maxProducts,
          },
        });
        return;
      }
      bulkAddProducts(newDrafts);
    }
    if (dupUpdates.length > 0) {
      bulkUpdateProducts(
        dupUpdates,
        `Updated ${dupUpdates.length} existing products from CSV`
      );
    }

    handleClose();
  };

  const actionCount =
    parsed.missingRequiredColumns.length > 0
      ? 0
      : counts.validNew + (duplicatePolicy === 'update' ? counts.duplicates : 0);

  return (
    <div
      id="inventory-csv-import-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-[1px] p-3 sm:p-4"
    >
      <div className="bg-white w-full max-w-2xl rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shrink-0"
              aria-hidden="true"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 id={titleId} className="text-sm sm:text-base font-bold text-slate-900 truncate">
                Import Catalog from CSV
              </h3>
              <p className="text-xs text-slate-600 truncate">
                Download product template, map stock columns, and bulk-upload SKUs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 shrink-0"
            aria-label="Close product CSV import modal"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Product-Specific Template Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="text-xs text-slate-700 space-y-1">
              <div className="font-semibold text-slate-900">
                Required columns:{' '}
                <span className="font-mono text-blue-700">Name</span>,{' '}
                <span className="font-mono text-blue-700">Selling Price</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Optional: SKU, Barcode, Category, Supplier, Buying Price, Unit (piece, packet, kg,
                litre, carton, box), Reorder Point, Description, {branchStockColumnExample}.
              </p>
            </div>
            <button
              type="button"
              id="btn-download-product-csv-template"
              onClick={() => downloadProductCsvTemplate(locations)}
              className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Upload vs Paste Mode Switcher */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700">Input Method</span>
            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setPasteMode(false)}
                className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition ${
                  !pasteMode ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Upload CSV File
              </button>
              <button
                type="button"
                onClick={() => setPasteMode(true)}
                className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition ${
                  pasteMode ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Paste CSV Text
              </button>
            </div>
          </div>

          {!pasteMode ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-600 rounded-xl p-6 bg-slate-50/40 hover:bg-blue-50/20 cursor-pointer transition text-center">
              <Upload className="w-5 h-5 text-slate-500 mb-2" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                {fileName ? `Loaded: ${fileName}` : 'Choose a CSV file from your computer'}
              </span>
              <span className="text-xs text-slate-600 mt-0.5">
                Supports standard UTF-8 CSV exports from Excel or Google Sheets
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
                className="sr-only"
              />
            </label>
          ) : (
            <div className="space-y-1.5">
              <label htmlFor={pasteAreaId} className="block text-xs font-semibold text-slate-700">
                Paste product CSV content (including header row)
              </label>
              <textarea
                id={pasteAreaId}
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`Name,SKU,Barcode,Category,Buying Price,Selling Price,Unit,${branchStockColumnExample}\nJogoo Maize Meal 2kg,SKU-1042,6161100123456,Flour & Grains,145.00,180.00,packet,25`}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>
          )}

          {/* Missing Required Headers Warning */}
          {csvText.trim() && parsed.missingRequiredColumns.length > 0 && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-900"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-bold">Required product columns missing from header row</p>
                <p className="mt-0.5 text-red-800">
                  Could not detect: {parsed.missingRequiredColumns.join(', ')}. Download our product
                  CSV template above to ensure matching column names.
                </p>
              </div>
            </div>
          )}

          {parsed.rows.length > 0 && parsed.missingRequiredColumns.length === 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-emerald-700 tabular-nums">
                    {counts.validNew} new
                  </span>
                  <span className="text-slate-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-semibold text-amber-700 tabular-nums">
                    {counts.duplicates} matching SKU/barcode
                  </span>
                  {counts.errors > 0 && (
                    <>
                      <span className="text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-semibold text-rose-700 tabular-nums">
                        {counts.errors} invalid
                      </span>
                    </>
                  )}
                </div>

                {counts.duplicates > 0 && (
                  <div className="flex items-center gap-2">
                    <label htmlFor={duplicatePolicyId} className="text-xs text-slate-600">
                      Existing SKUs:
                    </label>
                    <select
                      id={duplicatePolicyId}
                      value={duplicatePolicy}
                      onChange={(e) => setDuplicatePolicy(e.target.value as 'skip' | 'update')}
                      className="min-h-[34px] px-2 py-1 border border-slate-300 rounded-md text-xs font-semibold text-slate-800 bg-white"
                    >
                      <option value="skip">Skip duplicates</option>
                      <option value="update">Update existing prices &amp; details</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 sticky top-0">
                    <tr>
                      <th scope="col" className="py-2 px-3">
                        Row
                      </th>
                      <th scope="col" className="py-2 px-3">
                        Product
                      </th>
                      <th scope="col" className="py-2 px-3">
                        SKU
                      </th>
                      <th scope="col" className="py-2 px-3 text-right">
                        Selling
                      </th>
                      <th scope="col" className="py-2 px-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsed.rows.slice(0, 50).map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono tabular-nums text-slate-600">
                          {row.rowNumber}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900">{row.draft.name}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{row.draft.sku}</td>
                        <td className="py-2 px-3 font-mono tabular-nums text-right text-slate-900">
                          {currentLocation.currency} {row.draft.sellingPrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-3">
                          {row.status === 'error' ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>{row.error}</span>
                            </span>
                          ) : row.status === 'duplicate' ? (
                            <span className="text-amber-800 font-medium">
                              {duplicatePolicy === 'update' ? 'Will update' : 'Skipped (exists)'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
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
            onClick={handleClose}
            className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImportCommit}
            disabled={actionCount === 0}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Import {actionCount > 0 ? `${actionCount} Products` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
