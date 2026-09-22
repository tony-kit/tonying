import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<Props> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-container"
      className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border transition-all duration-300 transform translate-y-0 ${
              isSuccess
                ? 'bg-emerald-900/95 text-emerald-50 border-emerald-700/80 shadow-emerald-950/20'
                : isError
                ? 'bg-red-900/95 text-red-50 border-red-700/80 shadow-red-950/20'
                : 'bg-stone-900/95 text-stone-50 border-stone-700/80 shadow-stone-950/20'
            }`}
            role="alert"
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-300" />}
              {isError && <AlertCircle className="w-5 h-5 text-red-300" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-orange-300" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && (
                <p className="font-semibold text-sm leading-snug">{toast.title}</p>
              )}
              <p className="text-xs sm:text-sm text-stone-200 leading-relaxed break-words">
                {toast.message}
              </p>
            </div>
            <button
              id={`dismiss-toast-${toast.id}`}
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-1 text-stone-400 hover:text-white rounded-lg transition-colors"
              aria-label="ปิดการแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
