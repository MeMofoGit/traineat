import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, AlertCircle, Info, X } from 'lucide-react';

/**
 * Sistema global de toasts.
 *
 * Uso:
 *   const toast = useToast();
 *   toast.success('Producto añadido');
 *   toast.error('Error al guardar');
 *   toast.info('Escaneando...');
 *
 * Montar <ToastProvider> en App.jsx envolviendo toda la app.
 * Los toasts se renderizan via portal (siempre encima de todo).
 * Auto-dismiss configurable (default 3s). Máximo 3 visibles.
 */

const ToastContext = createContext(null);

const ICONS = {
    success: <Check size={16} />,
    error: <AlertCircle size={16} />,
    info: <Info size={16} />,
};

const STYLES = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-blue-600 text-white',
};

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 3000;

let _id = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((type, message, duration = DEFAULT_DURATION) => {
        const id = ++_id;
        setToasts(prev => {
            const next = [...prev, { id, type, message, duration }];
            return next.slice(-MAX_TOASTS);
        });

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const api = {
        success: (msg, duration) => addToast('success', msg, duration),
        error: (msg, duration) => addToast('error', msg, duration ?? 5000),
        info: (msg, duration) => addToast('info', msg, duration),
        dismiss: removeToast,
    };

    return (
        <ToastContext.Provider value={api}>
            {children}
            {createPortal(
                <div className="fixed bottom-24 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
                    {toasts.map(t => (
                        <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

function ToastItem({ toast, onDismiss }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
    }, []);

    return (
        <div
            className={`pointer-events-auto ${STYLES[toast.type]} px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm font-bold max-w-sm w-full transition-all duration-300 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
        >
            <span className="shrink-0">{ICONS[toast.type]}</span>
            <span className="flex-1 min-w-0">{toast.message}</span>
            <button
                onClick={onDismiss}
                className="shrink-0 p-1 opacity-70 hover:opacity-100 transition-opacity"
            >
                <X size={14} />
            </button>
        </div>
    );
}
