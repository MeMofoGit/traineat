import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function HealthDisclaimer({ onAccept }) {
    const { t } = useTranslation();
    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-950/95 flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-3 text-amber-400">
                    <AlertTriangle size={28} />
                    <h2 className="text-lg font-bold">{t('disclaimer.title')}</h2>
                </div>

                <div className="text-sm text-slate-300 space-y-3 leading-relaxed">
                    <p>{t('disclaimer.body1')}</p>
                    <p>{t('disclaimer.body2')}</p>
                    <p>{t('disclaimer.body3')}</p>
                </div>

                <button
                    onClick={onAccept}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                    <Check size={18} /> {t('disclaimer.accept')}
                </button>

                <p className="text-[10px] text-slate-500 text-center">{t('disclaimer.footer')}</p>
            </div>
        </div>,
        document.body
    );
}
