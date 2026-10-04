import React, { useState, useRef } from 'react';
import { Minus, Plus, Trash2, Tag } from 'lucide-react';
import { CartItem } from '../types';
import { Haptics } from '../utils/haptics';
import { getItemLineTotal, formatDiscountBadge } from '../utils/discountUtils';

interface CartLineItemProps {
  item: CartItem;
  currency: string;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onOpenDiscountModal: (item: CartItem) => void;
  onOpenLineItemVoid: (item: CartItem) => void;
}

export const CartLineItem: React.FC<CartLineItemProps> = ({
  item,
  currency,
  onUpdateQuantity,
  onOpenDiscountModal,
  onOpenLineItemVoid,
}) => {
  const lineTotal = getItemLineTotal(item);
  const discountBadge = formatDiscountBadge(item, currency);

  // Native swipe-to-delete state
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Detect gesture orientation once threshold is broken
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isHorizontalSwipe.current) {
      // Swiping left to reveal or activate void action
      if (diffX < 0) {
        // Clamp swipe offset between -150px and 0
        const clamped = Math.max(-150, diffX);
        setSwipeOffset(clamped);
      } else if (swipeOffset < 0) {
        // Swiping right to reset
        const resetOffset = Math.min(0, swipeOffset + diffX);
        setSwipeOffset(resetOffset);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    // Over-drag threshold: Full swipe-to-delete
    if (swipeOffset < -120) {
      Haptics.warning();
      setSwipeOffset(0);
      onOpenLineItemVoid(item);
      return;
    }

    // Partial swipe: Snap to reveal delete action button (-80px)
    if (swipeOffset < -45) {
      Haptics.light();
      setSwipeOffset(-80);
    } else {
      // Snap back closed
      setSwipeOffset(0);
    }
  };

  const handleResetSwipe = () => {
    if (swipeOffset !== 0) {
      setSwipeOffset(0);
    }
  };

  const handleMinusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.light();
    onUpdateQuantity(item.productId, item.quantity - 1);
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.light();
    onUpdateQuantity(item.productId, item.quantity + 1);
  };

  const handleVoidClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.warning();
    setSwipeOffset(0);
    onOpenLineItemVoid(item);
  };

  return (
    <div className="relative overflow-hidden group select-none border-b border-slate-100 last:border-b-0">
      {/* Background Revealed Action Layer (Swipe Left Action) */}
      <div
        className="absolute inset-y-0 right-0 w-24 bg-red-600 flex items-center justify-center text-white cursor-pointer z-0 transition-opacity"
        onClick={handleVoidClick}
      >
        <button
          type="button"
          className="flex flex-col items-center justify-center gap-1 w-full h-full text-white font-black text-[11px] active:bg-red-700"
          title="Remove line item"
        >
          <Trash2 className="w-5 h-5 animate-pulse" />
          <span>Remove</span>
        </button>
      </div>

      {/* Foreground Interactive Line Item Container */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleResetSwipe}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
        className="relative z-10 bg-white py-3 sm:py-3.5 px-1 sm:px-1.5 flex items-center justify-between gap-2.5 transition-colors group-hover:bg-slate-50/50"
      >
        {/* Left: Product Name, Price, and Discounts */}
        <div
          onClick={() => onOpenDiscountModal(item)}
          className="flex-1 min-w-0 pr-1 cursor-pointer group/item select-none"
          title="Tap to apply item discount"
        >
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover/item:text-blue-600 transition-colors">
            {item.productName}
          </h4>
          <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
            <span className="text-[11px] text-slate-400 font-mono">
              {currency} {item.unitPrice.toFixed(2)}
            </span>
            {discountBadge ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDiscountModal(item);
                }}
                className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black px-1.5 py-0.5 rounded shadow-2xs transition cursor-pointer"
                title="Click to edit or remove discount"
              >
                <Tag className="w-2.5 h-2.5" />
                <span>{discountBadge}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDiscountModal(item);
                }}
                className="opacity-70 group-hover/item:opacity-100 text-[10px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-bold px-1.5 py-0.5 rounded transition flex items-center gap-0.5 cursor-pointer"
                title="Quick tap to apply discount"
              >
                <Tag className="w-2.5 h-2.5" />
                <span>+ Discount</span>
              </button>
            )}
            {item.discountReason && (
              <span className="text-[9px] text-slate-400 italic truncate max-w-[120px]">
                ({item.discountReason})
              </span>
            )}
          </div>
        </div>

        {/* Right: Generous 48×48px Touch Steppers + Total + Delete Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quantity Stepper with Generous Touch Target (min 48×48px on touch screens) */}
          <div className="flex items-center border border-slate-200 rounded-xl sm:rounded-lg bg-slate-50 overflow-hidden shadow-2xs">
            {/* Minus Button: 48×48px mobile touch zone */}
            <button
              type="button"
              onClick={handleMinusClick}
              className="w-12 h-12 sm:w-8 sm:h-8 flex items-center justify-center text-slate-700 hover:bg-slate-200 active:bg-blue-100 active:scale-95 font-black transition-all cursor-pointer touch-manipulation select-none"
              title="Decrease quantity"
              aria-label={`Decrease quantity of ${item.productName}`}
            >
              <Minus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>

            {/* Quantity Number */}
            <span className="min-w-[34px] sm:min-w-[28px] text-center text-sm sm:text-xs font-black text-slate-900 font-mono select-none px-1">
              {item.quantity}
            </span>

            {/* Plus Button: 48×48px mobile touch zone */}
            <button
              type="button"
              onClick={handlePlusClick}
              className="w-12 h-12 sm:w-8 sm:h-8 flex items-center justify-center text-slate-700 hover:bg-slate-200 active:bg-blue-100 active:scale-95 font-black transition-all cursor-pointer touch-manipulation select-none"
              title="Increase quantity"
              aria-label={`Increase quantity of ${item.productName}`}
            >
              <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>

          {/* Line Subtotal */}
          <div className="text-right min-w-[65px] sm:min-w-[75px]">
            <div className="text-xs sm:text-sm font-black text-slate-900 font-mono">
              {currency} {lineTotal.toFixed(2)}
            </div>
            {discountBadge && (
              <div className="text-[9px] text-emerald-600 font-bold line-through opacity-70 font-mono">
                {currency} {(item.unitPrice * item.quantity).toFixed(2)}
              </div>
            )}
          </div>

          {/* Desktop Trash Button (Mobile users can swipe or tap) */}
          <button
            type="button"
            onClick={handleVoidClick}
            className="text-slate-300 hover:text-red-600 transition p-2 sm:p-1.5 cursor-pointer touch-manipulation rounded-lg hover:bg-red-50"
            title="Void line item with supervisor audit"
          >
            <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
