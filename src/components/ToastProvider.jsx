import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import './ToastProvider.css';

const ToastContext = createContext(null);

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const addToast = useCallback(({ message, type = 'success', duration = 4500 }) => {
    const id = generateId();
    setToasts((current) => [...current, { id, message, type }]);
    timers.current[id] = window.setTimeout(() => {
      removeToast(id);
    }, duration);
    return id;
  }, [removeToast]);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, []);

  const api = useMemo(() => ({ addToast, removeToast }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-portal" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item toast-${toast.type}`}>
            <div className="toast-icon">
              <CheckCircle size={20} />
            </div>
            <div className="toast-body">
              <span className="toast-message">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
