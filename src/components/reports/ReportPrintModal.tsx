import React, { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  X,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Business, Location } from '../../types';
import { DateRange, ReportMeta } from '../../types/reporting';
import { formatRangeDisplay } from '../../utils/dateRangeUtils';
import { exportToCsv } from '../../utils/reportCalculations';
import { printReportDocument, downloadReportPdf } from '../../utils/reportPrinter';
import { usePos } from '../../context/PosContext';
import { soundFx as directSoundFx } from '../../utils/audio';

export interface ReportPrintData {
  meta: ReportMeta;
  dateRange: DateRange;
  business: Business;
  location: Location;
  generatedBy: string;
  summaryCards: Array<{ label: string; value: string | number; sub?: string }>;
  tableHeaders: string[];
  tableRows: (string | number | boolean)[][];
  footerNotes?: string[];
  csvHeaders?: string[];
  csvRows?: (string | number | boolean)[][];
}

interface ReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReportPrintData | null;
}

export const ReportPrintModal: React.FC<ReportPrintModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const { soundFx, showToast } = usePos();
  const audio = soundFx || directSoundFx;
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    setIsPrinting(true);
    audio?.playSuccess?.();
    showToast(`Sending ${data.meta.title} to printer...`, 'info');

    try {
      printReportDocument(data);
    } catch (err) {
      console.warn('printReportDocument fallback to window.print():', err);
      window.print();
    } finally {
      setTimeout(() => setIsPrinting(false), 1200);
    }
  };

  const handleDownloadPdf = () => {
    setIsDownloadingPdf(true);
    audio?.playSuccess?.();
    showToast(`Generating official PDF for ${data.meta.title}...`, 'info');

    try {
      downloadReportPdf(data);
      showToast(`PDF downloaded successfully!`, 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('Could not generate PDF. Please use Print / Save as PDF.', 'error');
    } finally {
      setTimeout(() => setIsDownloadingPdf(false), 1000);
    }
  };

  const handleExportCsv = () => {
    audio?.playSuccess?.();
    const safeName = (data.business?.name || 'sokopos').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeName}_${data.meta.id}_${Date.now()}`;
    const headers = data.csvHeaders || data.tableHeaders;
    const rows = data.csvRows || data.tableRows;
    exportToCsv(filename, headers, rows);
    showToast(`Exported ${data.meta.title} CSV`, 'success');
  };

  const currentDate = new Date().toLocaleString();
  const businessName = data.business?.name || 'SokoPoS Retail';
  const branchName = data.location?.name || 'Main Location';
  const branchCity = data.location?.city || 'Nairobi';
  const taxId = data.business?.taxNumber || data.location?.taxId || '';
  const currency = data.business?.currency || 'KES';

  return (
    <div
      id="report-print-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-transparent print:static select-text"
    >
      {/* Modal Container */}
      <div
        id="report-print-modal-container"
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none"
      >
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="px-5 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white tracking-tight">{data.meta.title} — Official A4 Print & Export</h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                  {data.meta.phaseLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-page A4 layout • Strict table pagination • Audit compliance seal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              id="report-print-modal-csv-btn"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition cursor-pointer"
              title="Download RFC 4180 CSV spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              id="report-print-modal-download-pdf-btn"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              title="Download official vector PDF document"
            >
              <Download className="w-4 h-4 text-rose-400" />
              <span>{isDownloadingPdf ? 'Generating...' : 'PDF'}</span>
            </button>

            <button
              type="button"
              id="report-print-modal-print-btn"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
              title="Print document or Save as PDF with zero blank pages"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>{isPrinting ? 'Printing...' : 'Print / Save PDF (A4)'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable A4 Document Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-100/70 print:bg-white print:p-0">
          <div
            id="report-printable-document"
            className="bg-white max-w-4xl mx-auto p-8 sm:p-12 rounded-xl border border-slate-200 shadow-md print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none keep-white text-slate-900"
          >
            {/* A4 Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                    {businessName}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Branch: <strong>{branchName}</strong></span>
                    <span>City: <strong>{branchCity}</strong></span>
                    {taxId && (
                      <span>Tax / PIN ID: <strong>{taxId}</strong></span>
                    )}
                  </div>
                </div>

                <div className="sm:text-right border-l-2 sm:border-l-0 pl-3 sm:pl-0 border-blue-600">
                  <div className="text-lg font-black text-blue-800 uppercase tracking-wide">
                    {data.meta.title}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Ref: RPT-{data.meta.id.toUpperCase()}-{Date.now().toString().slice(-6)}
                  </div>
                </div>
              </div>

              {/* Report Metadata Ribbon */}
              <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                <div>
                  <span className="text-slate-400 block uppercase text-[9px] font-bold">Time Range</span>
                  <span className="font-bold text-slate-800">{formatRangeDisplay(data.dateRange)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-[9px] font-bold">Generated At</span>
                  <span className="font-mono font-medium">{currentDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-[9px] font-bold">Auditor / User</span>
                  <span className="font-medium">{data.generatedBy || 'Authorized Auditor'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-[9px] font-bold">Currency</span>
                  <span className="font-black font-mono text-blue-700">{currency}</span>
                </div>
              </div>
            </div>

            {/* Summary KPI Cards Grid */}
            {data.summaryCards && data.summaryCards.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {data.summaryCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {card.label}
                    </div>
                    <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
                      {card.value}
                    </div>
                    {card.sub && (
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {card.sub}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Itemized Report Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-y-2 border-slate-800 bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider">
                    {data.tableHeaders.map((header, idx) => (
                      <th
                        key={idx}
                        className={`py-2.5 px-3 ${
                          idx === 0 ? 'text-left' : idx >= data.tableHeaders.length - 2 ? 'text-right' : 'text-left'
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-normal text-slate-700">
                  {data.tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={data.tableHeaders.length} className="py-8 text-center text-slate-400">
                        No transactional data records found for this period.
                      </td>
                    </tr>
                  ) : (
                    data.tableRows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={rIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`py-2.5 px-3 text-[11px] ${
                              cIdx === 0
                                ? 'font-bold text-slate-900'
                                : cIdx >= data.tableHeaders.length - 2
                                ? 'text-right font-mono font-medium'
                                : 'text-slate-600'
                            }`}
                          >
                            {typeof cell === 'boolean' ? (cell ? 'YES' : 'NO') : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Sign-off & Audit Notes */}
            <div className="border-t-2 border-slate-300 pt-6 mt-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div>
                  <div className="font-bold text-slate-800 uppercase tracking-wide text-[10px] mb-1">
                    System Audit & Compliance Note
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    This official report was compiled directly from the authenticated SokoPoS Cloud
                    Ledger. All figures reflect verified point-of-sale transactions and inventory
                    movements recorded under tenant credentials.
                  </p>
                </div>

                <div className="flex flex-col justify-end sm:items-end">
                  <div className="w-48 border-b border-slate-400 pb-1 mb-1 text-center text-[10px] text-slate-400 uppercase">
                    Authorized Signature / Stamp
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Official POS Z-Report Timestamp: {currentDate}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

