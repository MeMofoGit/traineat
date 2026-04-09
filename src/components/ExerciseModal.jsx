import React, { useState } from 'react';
import { X, ExternalLink, Image as ImageIcon } from 'lucide-react';

export default function ExerciseModal({ exercise, onClose }) {
    if (!exercise) return null;

    const [imgError, setImgError] = useState(false);

    return (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <h3 className="font-bold text-white text-lg pr-4">{exercise.name}</h3>
                    <button 
                        onClick={onClose} 
                        className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-0 bg-black flex justify-center items-center min-h-[300px] relative">
                    {exercise.gifUrl && !imgError ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img 
                                src={exercise.gifUrl} 
                                alt={exercise.name} 
                                className="w-full max-h-[50vh] object-contain"
                                onError={() => setImgError(true)}
                            />
                            {/* Overlay caption if needed */}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500 p-8 gap-4">
                            <ImageIcon size={48} className="opacity-20" />
                            <p className="text-sm text-center">No hay demostración disponible para este ejercicio.</p>
                            <button 
                                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(exercise.name + " ejercicio gif")}&tbm=isch`, '_blank')}
                                className="flex items-center gap-2 text-blue-400 text-sm hover:underline mt-2"
                            >
                                <ExternalLink size={14} />
                                Buscar en Google
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer / Instructions */}
                {(exercise.note || exercise.tips) && (
                    <div className="p-5 bg-slate-900 border-t border-slate-800">
                        <h4 className="text-slate-400 text-xs font-bold uppercase mb-2">Notas Técnicas</h4>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            {exercise.note || exercise.tips || "Mantén la técnica estricta y controla el movimiento."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
