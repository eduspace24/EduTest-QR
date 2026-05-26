import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface AlertOptions {
  title: string;
  message?: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showConfirmButton?: boolean;
  duration?: number; // for toast mode
}

interface ToastNotification {
  id: number;
  title: string;
  type: AlertType;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
  showToast: (title: string, type?: AlertType) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

let toastId = 0;

export function AlertProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showAlert = (newOptions: AlertOptions) => {
    // Auto-show toast for success/error without needing user interaction
    if ((newOptions.type === 'success' || newOptions.type === 'error') && !newOptions.showConfirmButton && !newOptions.onConfirm) {
      showToast(newOptions.title, newOptions.type);
      return;
    }
    
    setOptions({
      type: 'info',
      confirmText: 'OK',
      cancelText: 'Batal',
      showConfirmButton: true,
      ...newOptions
    });
    setIsOpen(true);
  };

  const showToast = (title: string, type: AlertType = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, title, type }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const hideAlert = () => {
    setIsOpen(false);
  };

  const handleConfirm = () => {
    if (options?.onConfirm) options.onConfirm();
    hideAlert();
  };

  const handleCancel = () => {
    if (options?.onCancel) options.onCancel();
    hideAlert();
  };

  const getIcon = () => {
    switch (options?.type) {
      case 'success': return <CheckCircle2 className="w-12 h-12 text-emerald-500" />;
      case 'error': return <XCircle className="w-12 h-12 text-rose-500" />;
      case 'warning': return <AlertTriangle className="w-12 h-12 text-amber-500" />;
      case 'confirm': return <AlertTriangle className="w-12 h-12 text-indigo-500" />;
      default: return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  const getColors = () => {
    switch (options?.type) {
      case 'success': return 'from-emerald-500 to-teal-600';
      case 'error': return 'from-rose-500 to-red-600';
      case 'warning': return 'from-amber-500 to-orange-600';
      case 'confirm': return 'from-indigo-600 to-blue-700';
      default: return 'from-blue-500 to-indigo-600';
    }
  };

  const getToastColors = (type: AlertType) => {
    switch (type) {
      case 'success': return 'bg-emerald-500';
      case 'error': return 'bg-rose-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-indigo-500';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, showToast }}>
      {children}
      
      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-white font-medium text-sm shadow-lg",
                getToastColors(toast.type)
              )}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <XCircle className="w-5 h-5" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {toast.type === 'info' && <Info className="w-5 h-5" />}
              {toast.title}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modal Alert */}
      <AnimatePresence>
        {isOpen && options && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={hideAlert}
              className="absolute inset-0 bg-indigo-950/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 p-8 flex flex-col items-center text-center"
            >
              <div className="mb-6 p-4 rounded-[2rem] bg-slate-50">
                {getIcon()}
              </div>

              <h3 className="text-2xl font-black text-indigo-950 mb-3 tracking-tighter leading-none">
                {options.title}
              </h3>
              
              {options.message && (
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
                  {options.message}
                </p>
              )}

              <div className="flex flex-col w-full gap-2">
                {options.showConfirmButton && (
                  <button
                    onClick={handleConfirm}
                    className={cn(
                      "w-full py-4 rounded-2xl font-black text-sm text-white shadow-lg transition-all active:scale-[0.98] bg-gradient-to-r",
                      getColors()
                    )}
                  >
                    {options.confirmText}
                  </button>
                )}
                
                {options.type === 'confirm' && (
                  <button
                    onClick={handleCancel}
                    className="w-full py-4 rounded-2xl font-black text-sm text-slate-400 hover:text-indigo-950 transition-all"
                  >
                    {options.cancelText}
                  </button>
                )}
                
                {options.type !== 'confirm' && !options.showConfirmButton && (
                   <button
                    onClick={hideAlert}
                    className="mt-2 text-slate-400 hover:text-indigo-950 p-2 transition-all rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  );
}

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};