import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, AlertTriangle, Shield, FileText, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function About() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div className="p-6 space-y-6 pb-24">
            <header className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-xl font-bold text-white">{t('about.title')}</h1>
            </header>

            {/* App info */}
            <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 text-center space-y-2">
                <div className="text-3xl font-black bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                    TrainEat
                </div>
                <p className="text-sm text-slate-400">{t('about.subtitle')}</p>
                <p className="text-xs text-slate-500 font-mono">v1.0.0</p>
            </section>

            {/* Health Disclaimer */}
            <section className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle size={18} />
                    <h2 className="text-sm font-bold">{t('about.health')}</h2>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{t('about.healthText')}</p>
            </section>

            {/* Legal links */}
            <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 space-y-3">
                <div className="flex items-center gap-2 text-slate-300">
                    <Shield size={18} />
                    <h2 className="text-sm font-bold">{t('about.legal')}</h2>
                </div>
                <div className="space-y-2">
                    <LegalLink icon={<FileText size={14} />} label={t('about.privacy')} note={t('about.comingSoon')} />
                    <LegalLink icon={<FileText size={14} />} label={t('about.terms')} note={t('about.comingSoon')} />
                </div>
            </section>

            {/* Credits */}
            <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 space-y-3">
                <div className="flex items-center gap-2 text-slate-300">
                    <Heart size={18} />
                    <h2 className="text-sm font-bold">{t('about.credits')}</h2>
                </div>
                <div className="text-xs text-slate-400 space-y-2">
                    <p>
                        Información de productos por{' '}
                        <a
                            href="https://openfoodfacts.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                            Open Food Facts <ExternalLink size={10} />
                        </a>
                        , disponible bajo{' '}
                        <a
                            href="https://opendatacommons.org/licenses/odbl/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                            Open Database License (ODbL) <ExternalLink size={10} />
                        </a>
                        .
                    </p>
                    <p>
                        Iconos por{' '}
                        <a
                            href="https://lucide.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                            Lucide <ExternalLink size={10} />
                        </a>
                        .
                    </p>
                </div>
            </section>
        </div>
    );
}

function LegalLink({ icon, label, href, note }) {
    if (href) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
            >
                <div className="flex items-center gap-2 text-sm text-slate-300">
                    {icon} {label}
                </div>
                <ExternalLink size={12} className="text-slate-500" />
            </a>
        );
    }
    return (
        <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl opacity-50">
            <div className="flex items-center gap-2 text-sm text-slate-400">
                {icon} {label}
            </div>
            <span className="text-[10px] text-slate-500">{note}</span>
        </div>
    );
}
