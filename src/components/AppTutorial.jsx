import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STEPS = [
    { route: '/', titleKey: 'tutorial.home_title', descKey: 'tutorial.home_desc' },
    { route: '/diet', titleKey: 'tutorial.diet_title', descKey: 'tutorial.diet_desc' },
    { route: '/fridge', titleKey: 'tutorial.fridge_title', descKey: 'tutorial.fridge_desc' },
    { route: '/training', titleKey: 'tutorial.training_title', descKey: 'tutorial.training_desc' },
    { route: '/profile', titleKey: 'tutorial.profile_title', descKey: 'tutorial.profile_desc' },
];

export default function AppTutorial({ onFinish }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [step, setStep] = useState(0);

    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;

    // Navigate to the route for the current step
    useEffect(() => {
        if (current.route && location.pathname !== current.route) {
            navigate(current.route, { replace: true });
        }
    }, [step, current.route, navigate, location.pathname]);

    function handleNext() {
        if (isLast) {
            navigate('/', { replace: true });
            onFinish();
        } else {
            setStep((s) => s + 1);
        }
    }

    function handlePrev() {
        if (step > 0) setStep((s) => s - 1);
    }

    function handleSkip() {
        navigate('/', { replace: true });
        onFinish();
    }

    return createPortal(
        <div className="fixed inset-0 z-[90] pointer-events-none">
            {/* Semi-transparent overlay — lets real UI show through */}
            <div className="absolute inset-0 bg-slate-950/60 pointer-events-auto" onClick={handleNext} />

            {/* Bottom card */}
            <div
                className="absolute bottom-0 inset-x-0 pointer-events-auto"
                style={{ paddingBottom: 'calc(var(--nav-height, 72px) + 8px)' }}
            >
                <div className="mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 space-y-3 animate-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">
                            {t('tutorial.step', { current: step + 1, total: STEPS.length })}
                        </span>
                        <button
                            onClick={handleSkip}
                            className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                        >
                            <X size={12} /> {t('tutorial.skip')}
                        </button>
                    </div>

                    {/* Content */}
                    <div>
                        <h2 className="text-base font-bold text-white mb-1">{t(current.titleKey)}</h2>
                        <p className="text-xs text-slate-400 leading-relaxed">{t(current.descKey)}</p>
                    </div>

                    {/* Progress dots */}
                    <div className="flex justify-center gap-1.5 pt-1">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'bg-blue-500 w-5' : i < step ? 'bg-blue-800 w-1.5' : 'bg-slate-700 w-1.5'}`}
                            />
                        ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-2 pt-1">
                        {step > 0 && (
                            <button
                                onClick={handlePrev}
                                className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700"
                            >
                                <ArrowLeft size={16} />
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            {isLast ? t('tutorial.finish') : t('tutorial.next')} {!isLast && <ArrowRight size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
