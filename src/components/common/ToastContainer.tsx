import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  createdAt: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  topOffsetClass?: string;
}

const TOAST_STYLES: Record<
  ToastItem['type'],
  {
    container: string;
    icon: React.ReactNode;
    progress: string;
    label: string;
  }
> = {
  success: {
    container: 'bg-emerald-50/95 dark:bg-emerald-950/95 text-emerald-950 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    progress: 'bg-emerald-500',
    label: 'Success',
  },
  error: {
    container: 'bg-red-50/95 dark:bg-red-950/95 text-red-950 dark:text-red-100 border-red-200 dark:border-red-800',
    icon: <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />,
    progress: 'bg-red-500',
    label: 'Error',
  },
  warning: {
    container: 'bg-amber-50/95 dark:bg-amber-950/95 text-amber-950 dark:text-amber-100 border-amber-200 dark:border-amber-800',
    icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
    progress: 'bg-amber-500',
    label: 'Warning',
  },
  info: {
    container: 'bg-blue-50/95 dark:bg-blue-950/95 text-blue-950 dark:text-blue-100 border-blue-200 dark:border-blue-800',
    icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />,
    progress: 'bg-blue-500',
    label: 'Info',
  },
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  topOffsetClass = 'top-6',
}) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className={`fixed ${topOffsetClass} right-4 sm:right-6 z-[120] flex flex-col gap-2.5 w-[calc(100vw-2rem)] max-w-sm pointer-events-none`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type] || TOAST_STYLES.success;
          const durationSec = (toast.duration ?? 3600) / 1000;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 28, scale: 0.95 }}
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 30,
                mass: 0.8,
              }}
              role="status"
              className={`pointer-events-auto relative overflow-hidden rounded-xl border shadow-lg backdrop-blur-md px-3.5 py-3 flex items-start gap-2.5 text-xs font-semibold ${style.container}`}
            >
              <div className="mt-0.5">{style.icon}</div>
              <div className="flex-1 min-w-0 leading-relaxed break-words">
                {toast.text}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label={`Dismiss ${style.label} notification`}
                className="p-1 -mr-1 -mt-0.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Animated auto-dismiss progress bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: durationSec, ease: 'linear' }}
                style={{ transformOrigin: 'left' }}
                className={`absolute bottom-0 left-0 right-0 h-0.5 opacity-75 ${style.progress}`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
