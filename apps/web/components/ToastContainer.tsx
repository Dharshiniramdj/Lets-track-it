import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<Props> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;
        let borderColor = 'border-blue-500/30';
        let bgGlow = 'bg-[#18181b]/95';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          borderColor = 'border-emerald-500/40';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
          borderColor = 'border-amber-500/40';
        } else if (toast.type === 'danger') {
          icon = <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
          borderColor = 'border-rose-500/40';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border ${borderColor} ${bgGlow} backdrop-blur-md shadow-2xl flex items-start gap-3 transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-5`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1">
              <h4 className="text-xs font-black text-white">{toast.title}</h4>
              <p className="text-xs text-[#a1a1aa] mt-0.5 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-[#71717a] hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
