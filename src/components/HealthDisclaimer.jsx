import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check } from 'lucide-react';

export default function HealthDisclaimer({ onAccept }) {
    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-950/95 flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 text-amber-400">
                    <AlertTriangle size={28} />
                    <h2 className="text-lg font-bold">Aviso de salud</h2>
                </div>

                <div className="text-sm text-slate-300 space-y-3 leading-relaxed">
                    <p>
                        Esta aplicación es una <strong>herramienta de seguimiento</strong> y no proporciona consejo
                        médico, diagnóstico ni tratamiento.
                    </p>
                    <p>
                        Los cálculos de calorías, macronutrientes y las sugerencias de entrenamiento son orientativos y
                        se basan en fórmulas generales que pueden no ser adecuadas para tu situación particular.
                    </p>
                    <p>
                        <strong>Consulta a un profesional sanitario</strong> antes de realizar cambios significativos en
                        tu dieta o programa de ejercicio, especialmente si tienes condiciones médicas preexistentes.
                    </p>
                </div>

                <button
                    onClick={onAccept}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                    <Check size={18} /> Entendido, continuar
                </button>

                <p className="text-[10px] text-slate-500 text-center">
                    Al continuar aceptas que has leído y comprendido este aviso.
                </p>
            </div>
        </div>,
        document.body
    );
}
