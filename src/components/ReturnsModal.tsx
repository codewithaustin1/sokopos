import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Building2,
  Receipt,
  Scan,
  User,
  Phone,
  HelpCircle,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Transaction } from '../types';

const RETURN_REASONS = [
  'Customer Changed Mind',
  'Defective / Damaged Item',
  'Wrong Item / Variant Purchased',
  'Expired Product',
  'Pricing Discrepancy / Overcharge',
  'Customer Unsatisfied with Quality',
  'Store Discretionary Goodwill',
  'Other / Custom Reason',
];

export const ReturnsModal: React.FC = () => {
  const {
    isReturnsModalOpen,
    closeReturnsModal,
    selectedReturnTx,
    transactions,
    currentLocation,
    currentCashier,
    processRefund,
  } = usePos();

  // Navigation within modal
  const [activeTx, setActiveTx] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'eligible' | 'partially_refunded' | 'refunded'>('all');

  // Refund Form State
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [restockSettings, setRestockSettings] = useState<Record<string, boolean>>({});
  const [itemReasons, setItemReasons] = useState<Record<string, string>>({});
  const [refundMethod, setRefundMethod] = useState<'original' | 'cash' | 'mpesa' | 'card' | 'store_credit'>('original');
  const [generalReason, setGeneralReason] = useState<string>(RETURN_REASONS[0]);
  const [customNote, setCustomNote] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync activeTx with selectedReturnTx prop if provided
  useEffect(() => {
    if (selectedReturnTx) {
      setActiveTx(selectedReturnTx);
      initializeReturnState(selectedReturnTx);
    } else {
      setActiveTx(null);
    }
  }, [selectedReturnTx, isReturnsModalOpen]);

  // Reset form when active transaction changes
  const initializeReturnState = (tx: Transaction) => {
    const initialQty: Record<string, number> = {};
    const initialRestock: Record<string, boolean> = {};
    const initialReasons: Record<string, string> = {};

    // Calculate previously refunded quantities for each line item
    const previouslyRefundedMap: Record<string, number> = {};
    (tx.refunds || []).forEach((ref) => {
      ref.items.forEach((it) => {
        previouslyRefundedMap[it.productId] = (previouslyRefundedMap[it.productId] || 0) + it.quantity;
      });
    });

    tx.items.forEach((it) => {
      const alreadyRefunded = previouslyRefundedMap[it.productId] || 0;
      const eligible = it.quantity - alreadyRefunded;
      initialQty[it.productId] = 0; // Default to 0 selected
      initialRestock[it.productId] = true; // Default to restock
      initialReasons[it.productId] = generalReason;
    });

    setSelectedQuantities(initialQty);
    setRestockSettings(initialRestock);
    setItemReasons(initialReasons);
    setRefundMethod('original');
    setCustomNote('');
    setCustomerName(tx.paymentDetails.mpesaPhone ? `M-Pesa Customer` : '');
    setCustomerPhone(tx.paymentDetails.mpesaPhone || '');
    setErrorMessage(null);
  };

  // Filter transactions for lookup
  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter((tx) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        tx.receiptNumber.toLowerCase().includes(q) ||
        tx.cashierName.toLowerCase().includes(q) ||
        tx.paymentMethod.toLowerCase().includes(q) ||
        tx.paymentDetails.mpesaCode?.toLowerCase().includes(q) ||
        tx.paymentDetails.mpesaPhone?.includes(q) ||
        tx.items.some((it) => it.productName.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === 'eligible') {
        return tx.status !== 'refunded';
      }
      if (statusFilter === 'partially_refunded') {
        return tx.status === 'partially_refunded';
      }
      if (statusFilter === 'refunded') {
        return tx.status === 'refunded';
      }
      return true;
    });
  }, [transactions, searchQuery, statusFilter]);

  if (!isReturnsModalOpen) return null;

  // Selected Transaction Analytics & Limits
  const previouslyRefundedMap: Record<string, number> = {};
  if (activeTx) {
    (activeTx.refunds || []).forEach((ref) => {
      ref.items.forEach((it) => {
        previouslyRefundedMap[it.productId] = (previouslyRefundedMap[it.productId] || 0) + it.quantity;
      });
    });
  }

  // Calculate live refund totals based on selected quantities
  let totalItemsToReturn = 0;
  let calculatedSubtotalRefund = 0;
  let calculatedTaxRefund = 0;
  let calculatedTotalRefund = 0;
  let totalRestockUnits = 0;

  if (activeTx) {
    activeTx.items.forEach((it) => {
      const returnQty = selectedQuantities[it.productId] || 0;
      if (returnQty > 0) {
        totalItemsToReturn += returnQty;
        if (restockSettings[it.productId]) {
          totalRestockUnits += returnQty;
        }

        const discountedUnitPrice = it.unitPrice * (1 - it.discountPercent / 100);
        const netUnitPrice = discountedUnitPrice / (1 + it.taxRate);
        const lineTotal = discountedUnitPrice * returnQty;
        const lineSubtotal = netUnitPrice * returnQty;
        const lineTax = lineTotal - lineSubtotal;

        calculatedSubtotalRefund += lineSubtotal;
        calculatedTaxRefund += lineTax;
        calculatedTotalRefund += lineTotal;
      }
    });
  }

  const handleSelectTransaction = (tx: Transaction) => {
    setActiveTx(tx);
    initializeReturnState(tx);
  };

  const handleQuantityChange = (productId: string, newQty: number, maxQty: number) => {
    const clamped = Math.max(0, Math.min(newQty, maxQty));
    setSelectedQuantities((prev) => ({
      ...prev,
      [productId]: clamped,
    }));
  };

  const handleToggleRestock = (productId: string) => {
    setRestockSettings((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const handleSelectAllReturn = () => {
    if (!activeTx) return;
    const allQty: Record<string, number> = {};
    activeTx.items.forEach((it) => {
      const alreadyRefunded = previouslyRefundedMap[it.productId] || 0;
      const eligible = Math.max(0, it.quantity - alreadyRefunded);
      allQty[it.productId] = eligible;
    });
    setSelectedQuantities(allQty);
  };

  const handleClearAllReturn = () => {
    if (!activeTx) return;
    const allQty: Record<string, number> = {};
    activeTx.items.forEach((it) => {
      allQty[it.productId] = 0;
    });
    setSelectedQuantities(allQty);
  };

  const handleSubmitRefund = async () => {
    if (!activeTx) return;
    if (totalItemsToReturn === 0) {
      setErrorMessage('Please select at least 1 item quantity to return.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const refundItems = activeTx.items
        .filter((it) => (selectedQuantities[it.productId] || 0) > 0)
        .map((it) => ({
          productId: it.productId,
          quantity: selectedQuantities[it.productId],
          restockToInventory: restockSettings[it.productId] ?? true,
          reason: itemReasons[it.productId] || generalReason,
        }));

      const resolvedRefundMethod =
        refundMethod === 'original'
          ? (activeTx.paymentMethod as 'cash' | 'mpesa' | 'card')
          : refundMethod;

      const result = await processRefund({
        transactionId: activeTx.id,
        refundMethod: resolvedRefundMethod,
        refundReason: generalReason,
        refundNote: customNote,
        customerName,
        customerPhone,
        items: refundItems,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Refund operation could not be completed.');
      } else {
        // Modal cleanly closes and activeRefundReceipt takes over
        closeReturnsModal();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown refund failure';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="returns-and-refunds-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col w-full max-w-4xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight">Returns & Refunds Desk</h2>
              <p className="text-[11px] text-slate-400">
                Process customer item returns, restock inventory, and issue official credit notes
              </p>
            </div>
          </div>
          <button
            onClick={closeReturnsModal}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          {errorMessage && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!activeTx ? (
            /* ================= STAGE 1: LOOKUP TRANSACTIONS ================= */
            <div className="space-y-4">
              {/* Search Bar & Quick Filters */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search receipt # (e.g. RCP-2026-9918), customer phone, cashier, or product name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-4 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Filter:</span>
                  {[
                    { id: 'all', label: 'All Sales' },
                    { id: 'eligible', label: 'Eligible for Return' },
                    { id: 'partially_refunded', label: 'Partially Refunded' },
                    { id: 'refunded', label: 'Fully Refunded' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setStatusFilter(filter.id as any)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition cursor-pointer ${
                        statusFilter === filter.id
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                  <span>Found {filteredTransactions.length} transaction records</span>
                  <span>Select any sale to begin return</span>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="text-xs font-bold text-slate-600">No matching transactions found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Check your receipt number or try adjusting the search query
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredTransactions.map((tx) => {
                      const isFullyRefunded = tx.status === 'refunded';
                      const isPartiallyRefunded = tx.status === 'partially_refunded';
                      const refundCount = tx.refunds?.length || 0;

                      return (
                        <div
                          key={tx.id}
                          onClick={() => handleSelectTransaction(tx)}
                          className={`bg-white p-4 rounded-xl border transition cursor-pointer hover:shadow-md flex flex-col justify-between ${
                            isFullyRefunded
                              ? 'border-slate-200 opacity-75 bg-slate-50/60'
                              : isPartiallyRefunded
                              ? 'border-amber-300 hover:border-amber-400'
                              : 'border-slate-200 hover:border-blue-500'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-black text-xs text-slate-900">
                                    #{tx.receiptNumber}
                                  </span>
                                  {isFullyRefunded ? (
                                    <span className="bg-red-100 text-red-700 text-[10px] font-black px-1.5 py-0.5 rounded">
                                      FULLY REFUNDED
                                    </span>
                                  ) : isPartiallyRefunded ? (
                                    <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded">
                                      PARTIAL REFUND ({tx.locationName})
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded">
                                      COMPLETED
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {new Date(tx.timestamp).toLocaleString()} • {tx.locationName}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-sm font-black text-slate-900">
                                  {currentLocation.currency} {tx.total.toFixed(2)}
                                </div>
                                <div className="text-[10px] uppercase font-bold text-slate-400">
                                  {tx.paymentMethod}
                                </div>
                              </div>
                            </div>

                            {/* Line items preview */}
                            <div className="text-[11px] text-slate-600 line-clamp-1 border-t border-slate-100 pt-2 mb-2">
                              {tx.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 pt-2 border-t border-slate-50">
                            <span>Cashier: {tx.cashierName}</span>
                            {refundCount > 0 ? (
                              <span className="text-amber-700 font-bold">
                                {refundCount} past refund record{refundCount > 1 ? 's' : ''} (Total: {currentLocation.currency} {(tx.totalRefunded || 0).toFixed(2)})
                              </span>
                            ) : (
                              <span className="text-blue-600 font-bold">Click to process return →</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ================= STAGE 2: PROCESS RETURN ON SELECTED TRANSACTION ================= */
            <div className="space-y-5">
              {/* Back navigation */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTx(null)}
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Choose Different Sale</span>
                </button>

                <span className="text-xs text-slate-500 font-mono font-bold">
                  Receipt: #{activeTx.receiptNumber}
                </span>
              </div>

              {/* Selected Transaction Summary Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] font-bold block uppercase">Original Sale</span>
                    <span className="font-mono font-black text-slate-800 text-sm">
                      {currentLocation.currency} {activeTx.total.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {new Date(activeTx.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] font-bold block uppercase">Payment Method</span>
                    <span className="font-bold text-slate-800 uppercase">
                      {activeTx.paymentMethod}
                    </span>
                    {activeTx.paymentDetails.mpesaCode && (
                      <span className="text-[10px] text-emerald-600 font-mono block">
                        Code: {activeTx.paymentDetails.mpesaCode}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] font-bold block uppercase">Store Branch</span>
                    <span className="font-bold text-slate-800">{activeTx.locationName}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Cashier: {activeTx.cashierName}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] font-bold block uppercase">Return Status</span>
                    {activeTx.status === 'refunded' ? (
                      <span className="inline-block bg-red-100 text-red-800 font-black text-[10px] px-2 py-0.5 rounded">
                        100% REFUNDED
                      </span>
                    ) : activeTx.status === 'partially_refunded' ? (
                      <span className="inline-block bg-amber-100 text-amber-800 font-black text-[10px] px-2 py-0.5 rounded">
                        PARTIAL ({currentLocation.currency} {(activeTx.totalRefunded || 0).toFixed(2)} refunded)
                      </span>
                    ) : (
                      <span className="inline-block bg-emerald-100 text-emerald-800 font-black text-[10px] px-2 py-0.5 rounded">
                        FULLY ELIGIBLE
                      </span>
                    )}
                  </div>
                </div>

                {/* Previous Refunds Details (if any) */}
                {activeTx.refunds && activeTx.refunds.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                    <span className="font-bold text-slate-700 text-[11px] block">Past Refund Audit Trail:</span>
                    {activeTx.refunds.map((ref, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded">
                        <span>
                          <strong className="text-slate-700">{ref.refundNumber}</strong> • {new Date(ref.timestamp).toLocaleDateString()} ({ref.refundReason})
                        </span>
                        <span className="font-mono font-bold text-amber-700">
                          -{currentLocation.currency} {ref.totalRefund.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activeTx.status === 'refunded' ? (
                <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded-xl text-center">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <h3 className="font-bold text-sm">All Items in this receipt have already been refunded</h3>
                  <p className="text-xs text-red-600 mt-1 max-w-md mx-auto">
                    This transaction has been reconciled and settled. No further items are available for return.
                  </p>
                </div>
              ) : (
                /* Item Selection & Return Details Form */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Left 2 Cols: Line Item Selection */}
                  <div className="lg:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        Select Items to Return
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAllReturn}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition cursor-pointer"
                        >
                          Return All
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAllReturn}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {activeTx.items.map((it) => {
                        const alreadyRefunded = previouslyRefundedMap[it.productId] || 0;
                        const maxReturnable = Math.max(0, it.quantity - alreadyRefunded);
                        const currentReturnQty = selectedQuantities[it.productId] || 0;
                        const isRestocked = restockSettings[it.productId] ?? true;
                        const discountedUnitPrice = it.unitPrice * (1 - it.discountPercent / 100);
                        const lineReturnAmount = discountedUnitPrice * currentReturnQty;

                        if (maxReturnable === 0) {
                          return (
                            <div
                              key={it.productId}
                              className="bg-white/60 p-3 rounded-xl border border-slate-200 opacity-60 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-700">{it.productName}</span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {it.quantity} purchased • All {alreadyRefunded} previously refunded
                                </span>
                              </div>
                              <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                Fully Returned
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={it.productId}
                            className={`p-3.5 rounded-xl border transition ${
                              currentReturnQty > 0
                                ? 'bg-white border-blue-500 shadow-xs'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-xs text-slate-900 truncate">
                                    {it.productName}
                                  </h4>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    SKU: {it.sku}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Paid {currentLocation.currency} {discountedUnitPrice.toFixed(2)} ea •{' '}
                                  <span className="font-semibold text-slate-700">
                                    {maxReturnable} of {it.quantity} eligible
                                  </span>
                                  {alreadyRefunded > 0 && ` (${alreadyRefunded} returned prior)`}
                                </div>
                              </div>

                              {/* Quantity Stepper */}
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuantityChange(it.productId, currentReturnQty - 1, maxReturnable)
                                    }
                                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold transition cursor-pointer"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-8 text-center text-xs font-black text-slate-800">
                                    {currentReturnQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleQuantityChange(it.productId, currentReturnQty + 1, maxReturnable)
                                    }
                                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold transition cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="min-w-[70px] text-right">
                                  <span className="text-xs font-black text-slate-900">
                                    {currentLocation.currency} {lineReturnAmount.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Additional line-item controls when selected */}
                            {currentReturnQty > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={isRestocked}
                                    onChange={() => handleToggleRestock(it.productId)}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <span>Restock {currentReturnQty} unit(s) to store inventory</span>
                                </label>

                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isRestocked ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {isRestocked ? '+ Stock Reversal' : 'Damaged / Disposed'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Col: Refund Method, Reason & Confirmation Card */}
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        Refund Options
                      </h3>

                      {/* Refund Payment Channel */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Refund Disbursement Method
                        </label>
                        <select
                          value={refundMethod}
                          onChange={(e) => setRefundMethod(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                        >
                          <option value="original">
                            Original Payment Method ({activeTx.paymentMethod.toUpperCase()})
                          </option>
                          <option value="cash">Cash Tender</option>
                          <option value="mpesa">M-Pesa Refund</option>
                          <option value="card">Card Reversal</option>
                          <option value="store_credit">Store Credit Voucher</option>
                        </select>
                      </div>

                      {/* Return Reason */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Reason for Return
                        </label>
                        <select
                          value={generalReason}
                          onChange={(e) => setGeneralReason(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                        >
                          {RETURN_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Optional Note */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Auditor / Cashier Note (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Broken seal, receipt presented..."
                          value={customNote}
                          onChange={(e) => setCustomNote(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                      </div>

                      {/* Customer Contact for Refund Voucher */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                            Customer Name
                          </label>
                          <input
                            type="text"
                            placeholder="Optional"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                            Customer Phone
                          </label>
                          <input
                            type="text"
                            placeholder="2547..."
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Calculations Summary Box */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Items to return:</span>
                          <span className="font-bold text-slate-800">{totalItemsToReturn} units</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Subtotal refund:</span>
                          <span>{currentLocation.currency} {calculatedSubtotalRefund.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>VAT (16%) refund:</span>
                          <span>{currentLocation.currency} {calculatedTaxRefund.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-black text-amber-700 pt-1.5 border-t border-slate-200">
                          <span>Total Refund Due:</span>
                          <span>{currentLocation.currency} {calculatedTotalRefund.toFixed(2)}</span>
                        </div>

                        {totalRestockUnits > 0 && (
                          <div className="text-[10px] text-emerald-700 font-semibold pt-1 border-t border-slate-200 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>{totalRestockUnits} units will be restocked to {currentLocation.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Process Refund Action Button */}
                      <button
                        type="button"
                        disabled={totalItemsToReturn === 0 || isSubmitting}
                        onClick={handleSubmitRefund}
                        className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <span>Processing Cloud Reconcile...</span>
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4" />
                            <span>
                              Issue Refund ({currentLocation.currency} {calculatedTotalRefund.toFixed(2)})
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="bg-slate-100 border-t border-slate-200 px-5 py-2.5 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
          <span>
            Operating Terminal: <strong className="text-slate-700">{currentLocation.name}</strong> • Cashier: <strong className="text-slate-700">{currentCashier.name}</strong>
          </span>
          <span className="text-[10px] text-slate-400">
            Returns comply with KRA Electronic Tax Register standards
          </span>
        </div>
      </div>
    </div>
  );
};
