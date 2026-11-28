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
    <div className="relative overflow-hidden group select-none border-b border-slate-200 last:border-b-0">
      {/* Background Revealed Action Layer (Swipe Left Action) */}
      <div
        className="absolute inset-y-0 right-0 w-24 bg-[#b91c1c] flex items-center justify-center text-white cursor-pointer z-0 transition-opacity"
        onClick={handleVoidClick}
      >
        <button
          type="button"
          className="flex flex-col items-center justify-center gap-1 w-full h-full text-white font-bold text-[11px] active:bg-red-800"
          title="Remove line item"
        >
          <Trash2 className="w-5 h-5" />
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
        className="relative z-10 bg-white py-3 px-1.5 flex items-center justify-between gap-2 transition-colors group-hover:bg-slate-50"
      >
        {/* Left: Product Name, Price, and Active Discount */}
        <div
          onClick={() => onOpenDiscountModal(item)}
          className="flex-1 min-w-0 pr-1 cursor-pointer group/item select-none"
          title="Tap to add or edit discount"
        >
          <h4 className="text-xs sm:text-[13px] font-bold text-slate-950 truncate group-hover/item:text-[#1d4ed8] transition-colors">
            {item.productName}
          </h4>
          <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
            <span className="text-[11px] text-slate-600 font-mono tabular-nums">
              {currency} {item.unitPrice.toFixed(2)}
            </span>
            {discountBadge ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDiscountModal(item);
                }}
                className="inline-flex items-center gap-1 text-[11px] text-[#047857] hover:text-emerald-900 font-bold transition-colors cursor-pointer whitespace-nowrap"
                title="Click to edit or remove discount"
              >
                <span aria-hidden="true">·</span>
                <Tag className="w-3 h-3 shrink-0" />
                <span>{discountBadge}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 group-hover/item:text-[#1d4ed8] transition-colors duration-150">
                <span aria-hidden="true">·</span>
                <Tag className="w-3 h-3 shrink-0" />
                <span className="sm:hidden">Discount</span>
                <span className="hidden sm:inline opacity-0 group-hover/item:opacity-100 transition-opacity duration-150">
                  Tap to discount
                </span>
              </span>
            )}
            {item.discountReason && (
              <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                · {item.discountReason}
              </span>
            )}
          </div>
        </div>

        {/* Right: >=44x44px Touch Steppers + Tabular Line Total + Void Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center border border-slate-300 rounded-lg bg-[#f8fafc] overflow-hidden">
            <button
              type="button"
              onClick={handleMinusClick}
              className="w-11 h-11 flex items-center justify-center text-slate-900 hover:bg-slate-200 active:bg-blue-100 active:scale-95 font-bold transition-all duration-150 cursor-pointer touch-manipulation select-none"
              title="Decrease quantity"
              aria-label={`Decrease quantity of ${item.productName}`}
            >
              <Minus className="w-4 h-4" />
            </button>

            <span className="min-w-[30px] text-center text-xs sm:text-sm font-bold text-slate-950 font-mono tabular-nums select-none px-1">
              {item.quantity}
            </span>

            <button
              type="button"
              onClick={handlePlusClick}
              className="w-11 h-11 flex items-center justify-center text-slate-900 hover:bg-slate-200 active:bg-blue-100 active:scale-95 font-bold transition-all duration-150 cursor-pointer touch-manipulation select-none"
              title="Increase quantity"
              aria-label={`Increase quantity of ${item.productName}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="text-right min-w-[66px] sm:min-w-[74px]">
            <div className="text-xs sm:text-sm font-bold text-slate-950 font-mono tabular-nums">
              {currency} {lineTotal.toFixed(2)}
            </div>
            {discountBadge && (
              <div className="text-[10px] text-slate-500 line-through font-mono tabular-nums">
                {currency} {(item.unitPrice * item.quantity).toFixed(2)}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleVoidClick}
            className="text-slate-500 hover:text-[#b91c1c] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer touch-manipulation rounded-lg hover:bg-red-50"
            title="Void line item with supervisor audit"
            aria-label={`Remove ${item.productName} from cart`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
