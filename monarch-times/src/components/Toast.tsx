import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore, Toast as ToastType } from '../store/toastStore';

const toastStyles: Record<ToastType['type'], string> = {
  success: 'bg-[#00FF00] text-black border-black',
  error: 'bg-[#FF0000] text-white border-black',
  info: 'bg-[#0052FF] text-white border-black',
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`
              px-6 py-3 border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
              font-mono text-sm font-bold uppercase tracking-wide
              cursor-pointer max-w-sm
              ${toastStyles[toast.type]}
            `}
            onClick={() => removeToast(toast.id)}
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
