import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Componente escáner de códigos de barras.
 *
 * Usa `@zxing/browser` cargado de forma perezosa (import dinámico)
 * para que la librería (~150 KB) solo entre al bundle cuando el
 * usuario abre el escáner por primera vez.
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onDetected: (barcode: string) => void  — llamado con el código al escanear
 *
 * El componente se auto-cierra cuando detecta un código válido y llama
 * `onDetected`. El padre es responsable de llamar `onClose` para
 * ocultar el overlay (normalmente tras procesar el código).
 *
 * Permisos:
 * - Pide permiso de cámara al navegador la primera vez.
 * - Si el usuario deniega, muestra un mensaje de error con instrucciones.
 * - En iOS Safari, requiere HTTPS (o localhost) para acceder a la cámara.
 */
export default function BarcodeScanner({ isOpen, onClose, onDetected }) {
    const videoRef = useRef(null);
    const controlsRef = useRef(null);
    const detectedRef = useRef(false);
    const [status, setStatus] = useState('idle'); // idle | loading | scanning | error
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen) return undefined;

        let cancelled = false;
        detectedRef.current = false;
        setError(null);
        setStatus('loading');

        // Lazy-load: @zxing/browser NO entra al bundle hasta que el
        // usuario abre el escáner. Reduce el bundle inicial ~150 KB.
        import('@zxing/browser')
            .then(({ BrowserMultiFormatReader }) => {
                if (cancelled) return;

                const reader = new BrowserMultiFormatReader();

                reader
                    .decodeFromVideoDevice(
                        undefined, // undefined = cámara por defecto (trasera en móvil)
                        videoRef.current,
                        (result, _err, controls) => {
                            if (cancelled) return;

                            if (!controlsRef.current && controls) {
                                controlsRef.current = controls;
                                setStatus('scanning');
                            }

                            if (result && !detectedRef.current) {
                                detectedRef.current = true;
                                const code = result.getText();
                                try {
                                    controls?.stop();
                                } catch {
                                    /* ignore */
                                }
                                onDetected(code);
                            }
                            // Los errores NotFoundException son normales
                            // mientras el scanner busca — no los mostramos.
                        }
                    )
                    .catch((err) => {
                        if (cancelled) return;
                        setStatus('error');
                        if (err?.name === 'NotAllowedError') {
                            setError(
                                'Permiso de cámara denegado. Actívalo en los ajustes del navegador y vuelve a intentarlo.'
                            );
                        } else if (err?.name === 'NotFoundError') {
                            setError('No se encontró ninguna cámara en este dispositivo.');
                        } else if (err?.name === 'NotReadableError') {
                            setError('La cámara está siendo usada por otra aplicación.');
                        } else {
                            setError(err?.message || 'Error al acceder a la cámara');
                        }
                    });
            })
            .catch((err) => {
                if (cancelled) return;
                setStatus('error');
                setError('No se pudo cargar el escáner: ' + (err?.message || 'error desconocido'));
            });

        return () => {
            cancelled = true;
            try {
                controlsRef.current?.stop();
            } catch {
                /* ignore */
            }
            controlsRef.current = null;
        };
    }, [isOpen, onDetected]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-white">
                    <Camera size={18} className="text-cyan-400" />
                    <span className="text-sm font-bold">Escanear código de barras</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    aria-label="Cerrar escáner"
                >
                    <X size={20} />
                </button>
            </header>

            {/* Body */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black">
                {status === 'loading' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-10 pointer-events-none">
                        <Loader2 size={40} className="animate-spin mb-3 text-cyan-400" />
                        <span className="text-sm">Iniciando cámara…</span>
                    </div>
                )}

                {status === 'error' && error && (
                    <div className="max-w-sm mx-auto p-6 text-center">
                        <div className="inline-block bg-rose-900/30 p-4 rounded-full mb-4">
                            <AlertCircle size={32} className="text-rose-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">No se pudo escanear</h3>
                        <p className="text-sm text-slate-400 mb-5">{error}</p>
                        <button
                            onClick={onClose}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold"
                        >
                            Cerrar
                        </button>
                    </div>
                )}

                <video
                    ref={videoRef}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                        status === 'scanning' ? 'opacity-100' : 'opacity-0'
                    }`}
                    playsInline
                    muted
                    autoPlay
                />

                {/* Overlay de guía visual */}
                {status === 'scanning' && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="relative w-72 h-44 rounded-xl" style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)' }}>
                            <div className="absolute inset-0 border-2 border-cyan-400 rounded-xl"></div>
                            {/* Corner markers */}
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-cyan-300 rounded-tl-xl"></div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-cyan-300 rounded-tr-xl"></div>
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-cyan-300 rounded-bl-xl"></div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-cyan-300 rounded-br-xl"></div>
                            {/* Scan line animation */}
                            <div className="absolute inset-x-4 top-1/2 h-0.5 bg-cyan-400/80 animate-pulse"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer tip */}
            {status === 'scanning' && (
                <footer className="p-4 bg-slate-950/95 backdrop-blur-sm border-t border-slate-800 text-center">
                    <p className="text-xs text-slate-400">
                        Apunta al código de barras del producto. Se escaneará automáticamente.
                    </p>
                </footer>
            )}
        </div>
    );
}
