import React, { useMemo, useState, useEffect } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import {
  analyzeImportedSuppliersCsv,
  downloadSupplierCsvTemplate,
  downloadSupplierValidationReport,
} from '../utils/supplierCsv';

interface SupplierCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ValidationFilterTab = 'all' | 'new' | 'duplicate' | 'error';

export const SupplierCsvImportModal: React.FC<SupplierCsvImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { suppliers, bulkAddSuppliers, bulkUpdateSuppliers, showToast } = usePos();

  const [step, setStep] = useState<'upload' | 'validate'>('upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [pasteMode, setPasteMode] = useState<boolean>(false);
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip' | 'update'>('skip');
  const [filterTab, setFilterTab] = useState<ValidationFilterTab>('all');
  const [acknowledgeSkipErrors, setAcknowledgeSkipErrors] = useState<boolean>(true);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCommitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCommitting, onClose]);

  const analysis = useMemo(() => {
    if (!csvText.trim()) return null;
    return analyzeImportedSuppliersCsv(csvText, suppliers || []);
  }, [csvText, suppliers]);

  const filteredPreviewRows = useMemo(() => {
    if (!analysis) return [];
    if (filterTab === 'all') return analysis.rows;
    return analysis.rows.filter((r) => r.status === filterTab);
  }, [analysis, filterTab]);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setStep('upload');
    setFileName(null);
    setCsvText('');
    setPasteMode(false);
    setDuplicatePolicy('skip');
    setFilterTab('all');
    setAcknowledgeSkipErrors(true);
    setIsCommitting(false);
    onClose();
  };

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      setCsvText(content);
      setStep('validate');
      setFilterTab('all');
    };
    reader.readAsText(file);
  };

  const handleProceedToValidation = () => {
    if (!csvText.trim()) {
      showToast('Please upload a CSV file or paste CSV data first.', 'warning');
      return;
    }
    setStep('validate');
    setFilterTab('all');
  };

  const readyToCommitCount = analysis
    ? analysis.counts.validNew +
      (duplicatePolicy === 'update' ? analysis.counts.duplicates : 0)
    : 0;

  const hasUnresolvedSchemaError = Boolean(
    analysis && analysis.missingRequiredColumns.length > 0
  );

  const canCommit =
    Boolean(analysis) &&
    !hasUnresolvedSchemaError &&
    readyToCommitCount > 0 &&
    (analysis!.counts.errors === 0 || acknowledgeSkipErrors) &&
    !isCommitting;

  const handleCommitImport = async () => {
    if (!analysis || !canCommit) return;
    setIsCommitting(true);
    try {
      const newDrafts = analysis.rows
        .filter((r) => r.status === 'new')
        .map((r) => r.draft);

      const dupUpdates =
        duplicatePolicy === 'update'
          ? analysis.rows
              .filter((r) => r.status === 'duplicate' && r.matchedSupplierId)
              .map((r) => ({
                id: r.matchedSupplierId!,
                updates: {
                  name: r.draft.name,
                  contactPerson: r.draft.contactPerson,
                  phone: r.draft.phone,
                  email: r.draft.email,
                  category: r.draft.category,
                  address: r.draft.address,
                  city: r.draft.city,
                  kraPin: r.draft.kraPin,
                  paymentTerms: r.draft.paymentTerms,
                  bankName: r.draft.bankName,
                  bankAccount: r.draft.bankAccount,
                  mpesaPaybillOrTill: r.draft.mpesaPaybillOrTill,
                  leadTimeDays: r.draft.leadTimeDays,
                  status: r.draft.status,
                  notes: r.draft.notes,
                },
              }))
          : [];

      let addedCount = 0;
      let updatedCount = 0;

      if (newDrafts.length > 0) {
        addedCount = await bulkAddSuppliers(newDrafts);
      }
      if (dupUpdates.length > 0) {
        updatedCount = await bulkUpdateSuppliers(
          dupUpdates,
          `Updated ${dupUpdates.length} existing supplier${dupUpdates.length === 1 ? '' : 's'} via CSV`
        );
      }

      if (addedCount > 0 || updatedCount > 0) {
        resetAndClose();
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not import suppliers from CSV.', 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div
      id="supplier-csv-import-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="supplier-csv-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-[1px] p-3 sm:p-4"
    >
      <div className="bg-white w-full max-w-3xl rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shrink-0">
              <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3
                id="supplier-csv-modal-title"
                className="text-sm sm:text-base font-bold text-slate-900 truncate"
              >
                Bulk Import Suppliers via CSV
              </h3>
              <p className="text-xs text-slate-600 truncate">
                {step === 'upload'
                  ? 'Step 1 of 2 · Upload or paste vendor spreadsheet'
                  : `Step 2 of 2 · Data consistency check${fileName ? ` (${fileName})` : ''}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            disabled={isCommitting}
            className="min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label="Close supplier CSV import modal"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {step === 'upload' ? (
            <>
              {/* Template Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-xs text-slate-700 space-y-1">
                  <div className="font-semibold text-slate-900">
                    Required columns:{' '}
                    <span className="font-mono text-blue-700">Company Name</span>,{' '}
                    <span className="font-mono text-blue-700">Phone</span>
                  </div>
                  <p className="text-slate-600">
                    Optional: Contact Person, Email, Category, Address, City, KRA PIN, Payment Terms
                    (COD, Net 7, Net 14, Net 30, Consignment, Prepaid), Lead Time, M-Pesa, Bank, Status.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-download-supplier-csv-template"
                  onClick={downloadSupplierCsvTemplate}
                  className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Upload Zone vs Paste Switcher */}
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
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-600 rounded-xl p-8 bg-slate-50/40 hover:bg-blue-50/20 cursor-pointer transition text-center">
                  <Upload className="w-6 h-6 text-slate-500 mb-2" aria-hidden="true" />
                  <span className="text-xs sm:text-sm font-semibold text-slate-900">
                    {fileName ? `Selected: ${fileName}` : 'Choose a CSV file from your device'}
                  </span>
                  <span className="text-xs text-slate-600 mt-1">
                    UTF-8 CSV files exported from Excel, Google Sheets, or legacy accounting lists
                  </span>
                  <input
                    id="supplier-csv-file-input"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                    className="sr-only"
                  />
                </label>
              ) : (
                <div className="space-y-1.5">
                  <label
                    htmlFor="supplier-csv-paste-textarea"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Paste CSV content (including header row)
                  </label>
                  <textarea
                    id="supplier-csv-paste-textarea"
                    rows={7}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="Company Name,Phone,Email,Category,KRA PIN,Payment Terms&#10;Unga Mills Ltd,+254712345678,orders@unga.co.ke,Flour & Grains,P051234567X,net_14"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}
            </>
          ) : (
            /* Step 2: Validation & Data Consistency Review */
            <div className="space-y-4">
              {/* Schema / Missing Header Error */}
              {hasUnresolvedSchemaError && analysis && (
                <div
                  role="alert"
                  className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-900"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-bold">Required columns missing from CSV header</p>
                    <p className="mt-0.5 text-red-800">
                      Could not detect: {analysis.missingRequiredColumns.join(', ')}. Go back and
                      check your column headers or download our template.
                    </p>
                  </div>
                </div>
              )}

              {analysis && analysis.rows.length === 0 && !hasUnresolvedSchemaError && (
                <div
                  role="alert"
                  className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900"
                >
                  No supplier data rows were found below the header row. Upload a populated CSV file.
                </div>
              )}

              {analysis && analysis.rows.length > 0 && (
                <>
                  {/* Consistency Summary Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="text-[11px] font-semibold text-slate-600">Total Rows</div>
                      <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                        {analysis.counts.total}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70">
                      <div className="text-[11px] font-semibold text-emerald-800">Ready (New)</div>
                      <div className="text-lg font-bold font-mono tabular-nums text-emerald-900 mt-0.5">
                        {analysis.counts.validNew}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70">
                      <div className="text-[11px] font-semibold text-amber-800">
                        Existing Matches
                      </div>
                      <div className="text-lg font-bold font-mono tabular-nums text-amber-900 mt-0.5">
                        {analysis.counts.duplicates}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-red-200 bg-red-50/70">
                      <div className="text-[11px] font-semibold text-red-800">
                        Validation Errors
                      </div>
                      <div className="text-lg font-bold font-mono tabular-nums text-red-900 mt-0.5">
                        {analysis.counts.errors}
                      </div>
                    </div>
                  </div>

                  {/* Validation Controls: Filter Tabs, Duplicate Policy, Export Validation Report */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div
                      role="tablist"
                      aria-label="Filter validation rows"
                      className="inline-flex flex-wrap bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold gap-1"
                    >
                      {(
                        [
                          { id: 'all', label: `All (${analysis.counts.total})` },
                          { id: 'new', label: `Ready (${analysis.counts.validNew})` },
                          { id: 'duplicate', label: `Duplicates (${analysis.counts.duplicates})` },
                          { id: 'error', label: `Errors (${analysis.counts.errors})` },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={filterTab === tab.id}
                          onClick={() => setFilterTab(tab.id)}
                          className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                            filterTab === tab.id
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {analysis.counts.duplicates > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <label
                            htmlFor="supplier-duplicate-policy-select"
                            className="text-slate-600 font-medium"
                          >
                            Existing matches:
                          </label>
                          <select
                            id="supplier-duplicate-policy-select"
                            value={duplicatePolicy}
                            onChange={(e) =>
                              setDuplicatePolicy(e.target.value as 'skip' | 'update')
                            }
                            className="min-h-[36px] px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
                          >
                            <option value="skip">Skip existing</option>
                            <option value="update">Update existing</option>
                          </select>
                        </div>
                      )}

                      {analysis.counts.errors > 0 && (
                        <button
                          type="button"
                          onClick={() => downloadSupplierValidationReport(analysis.rows)}
                          className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                          <span>Export Issues CSV</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Validation Preview Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 sticky top-0 z-10">
                        <tr>
                          <th scope="col" className="py-2.5 px-3">Row</th>
                          <th scope="col" className="py-2.5 px-3">Company Name</th>
                          <th scope="col" className="py-2.5 px-3">Phone</th>
                          <th scope="col" className="py-2.5 px-3 hidden sm:table-cell">Terms / KRA</th>
                          <th scope="col" className="py-2.5 px-3">Consistency Check</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredPreviewRows.slice(0, 100).map((row) => (
                          <tr key={row.rowNumber} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                              {row.rowNumber}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              <div>{row.draft.name}</div>
                              {row.draft.category && (
                                <div className="text-[11px] font-normal text-slate-600">
                                  {row.draft.category}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums text-slate-800 whitespace-nowrap">
                              {row.draft.phone || '—'}
                            </td>
                            <td className="py-2.5 px-3 hidden sm:table-cell text-slate-700">
                              <span className="uppercase font-semibold">
                                {row.draft.paymentTerms.replace('_', ' ')}
                              </span>
                              {row.draft.kraPin && (
                                <span className="block font-mono text-[11px] text-slate-600">
                                  {row.draft.kraPin}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {row.status === 'error' ? (
                                <div className="inline-flex items-start gap-1.5 text-red-700 font-medium">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                                  <span>{row.issues.join(' · ')}</span>
                                </div>
                              ) : row.status === 'duplicate' ? (
                                <div className="inline-flex items-start gap-1.5 text-amber-800 font-medium">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                                  <span>
                                    {row.matchReason} (
                                    {duplicatePolicy === 'update' ? 'will update' : 'will skip'})
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                    <span>Ready</span>
                                  </span>
                                  {row.warnings.length > 0 && (
                                    <div className="text-[11px] text-amber-700">
                                      {row.warnings.join(' · ')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Error Acknowledgment Guard */}
                  {analysis.counts.errors > 0 && readyToCommitCount > 0 && (
                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acknowledgeSkipErrors}
                        onChange={(e) => setAcknowledgeSkipErrors(e.target.checked)}
                        className="mt-0.5 rounded border-amber-400 text-blue-600 focus:ring-blue-600"
                      />
                      <span>
                        Skip the <strong>{analysis.counts.errors}</strong> row
                        {analysis.counts.errors === 1 ? '' : 's'} with validation errors (including{' '}
                        {analysis.counts.inFileDuplicates} in-file duplicate
                        {analysis.counts.inFileDuplicates === 1 ? '' : 's'}) and import the{' '}
                        <strong>{readyToCommitCount}</strong> valid supplier
                        {readyToCommitCount === 1 ? '' : 's'}.
                      </span>
                    </label>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <div>
            {step === 'validate' && (
              <button
                type="button"
                disabled={isCommitting}
                onClick={() => setStep('upload')}
                className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Change File</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isCommitting}
              onClick={resetAndClose}
              className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            {step === 'upload' ? (
              <button
                type="button"
                onClick={handleProceedToValidation}
                disabled={!csvText.trim()}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                Validate CSV Data
              </button>
            ) : (
              <button
                type="button"
                id="btn-commit-supplier-csv-import"
                onClick={handleCommitImport}
                disabled={!canCommit}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isCommitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <span>
                    Import {readyToCommitCount > 0 ? `${readyToCommitCount} ` : ''}Supplier
                    {readyToCommitCount === 1 ? '' : 's'}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
