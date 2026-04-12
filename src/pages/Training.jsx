import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePlan } from '../hooks/usePlan';
import { usePendingWorkouts } from '../hooks/usePendingWorkouts';
import { EXERCISE_TEMPLATES } from '../data/templates';
import {
    Dumbbell,
    Repeat,
    Timer,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Edit2,
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    ArrowRightCircle,
    X,
    Search,
    Check,
    Play,
    Pause,
    AlertCircle,
    Save,
    Info,
    Zap,
    SkipForward,
    CheckCircle2,
} from 'lucide-react';
import ExerciseModal from '../components/ExerciseModal';
import { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';

const PHASE_DATE_FMT = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });
function formatPhaseDateRange(dates) {
    if (!dates) return '';
    const fmt = (iso) => {
        if (!iso) return '?';
        const d = new Date(iso);
        if (isNaN(d)) return '?';
        return PHASE_DATE_FMT.format(d);
    };
    if (!dates.start && !dates.end) return '';
    return `${fmt(dates.start)} – ${fmt(dates.end)}`;
}

export default function Training() {
    const { t } = useTranslation();
    const {
        plan,
        updateExercise,
        updatePhase,
        addExercise,
        deleteExercise,
        updateDayRoutine,
        reorderExercises,
        moveExerciseToDay,
        startSession,
        finishSession,
        toggleSessionPause,
        toggleSetCompletion,
        setActivePhaseId,
    } = usePlan();

    const { firstPending, hasPending, markSkipped, markDoneElsewhere, markTrainedToday } = usePendingWorkouts();
    const location = useLocation();
    const toast = useToast();

    const activePhaseId = plan.activePhaseId || plan.phases[0]?.id || 1;
    // Si se navega desde Dashboard con un día específico, usarlo como inicial
    const [activeDay, setActiveDay] = useState(() => {
        const navDayId = location.state?.dayId;
        return typeof navDayId === 'number' ? navDayId : new Date().getDay();
    });
    const [editingHeader, setEditingHeader] = useState(false);
    const [editingDayInfo, setEditingDayInfo] = useState(false);
    const [showStats, setShowStats] = useState(false); // Stats Modal State

    // Template State
    const [showTemplates, setShowTemplates] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    const [movingExIndex, setMovingExIndex] = useState(null); // Index of exercise being moved
    const [viewingExercise, setViewingExercise] = useState(null); // Exercise being viewed in modal

    // REST TIMER STATE
    const [showRestTimer, setShowRestTimer] = useState(false);
    const [restDuration, setRestDuration] = useState(0); // seconds
    const [restStartTime, setRestStartTime] = useState(0);
    const [restPhase, setRestPhase] = useState('ok');

    // Sync activePhaseId: si la fase guardada ya no existe, saltamos a la primera disponible
    useEffect(() => {
        if (plan.phases.length > 0 && !plan.phases.find((p) => p.id === activePhaseId)) {
            setActivePhaseId(plan.phases[0].id);
        }
    }, [plan.phases, activePhaseId, setActivePhaseId]);

    const getRoutine = (phase, day) => {
        const p = plan.routines[phase];
        if (!p) return { label: 'Día Nuevo', focus: 'Sin objetivo', exercises: [] };
        return p[day] || { label: 'Descanso', exercises: [] };
    };

    const routine = getRoutine(activePhaseId, activeDay);

    // Watch for last set completion to trigger rest timer.
    // setState en effect es intencional: es una reacción a un cambio externo
    // (lastSetContext actualizado por toggleSetCompletion).
    // lastProcessedTimestamp evita re-disparar toast/timer en reload o StrictMode.
    const lastProcessedTs = React.useRef(0);
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (plan.activeSession?.lastSetContext) {
            const { exerciseIndex, timestamp } = plan.activeSession.lastSetContext;
            if (timestamp <= lastProcessedTs.current) return;
            lastProcessedTs.current = timestamp;

            const ex = routine?.exercises?.[exerciseIndex];
            if (ex) {
                // Parsear rest: soporta "90s", "2m", "0", 0, "", null
                const rawRest = ex.rest;
                const r = String(rawRest ?? '')
                    .toLowerCase()
                    .trim();
                const isZeroRest = r === '0' || r === '' || r === '0s';

                let seconds = 0;
                if (isZeroRest) {
                    seconds = 0;
                    // Superserie: toast indicando el siguiente ejercicio
                    const nextEx = routine?.exercises?.[exerciseIndex + 1];
                    if (nextEx) {
                        toast.info(`→ ${nextEx.name}`, 2000);
                    }
                } else if (r.includes('m')) {
                    seconds = parseInt(r) * 60;
                } else if (r.includes('s')) {
                    seconds = parseInt(r);
                } else if (!isNaN(parseInt(r))) {
                    seconds = parseInt(r);
                } else {
                    seconds = 60; // fallback
                }

                if (seconds > 0) {
                    setRestDuration(seconds);
                    setRestStartTime(timestamp);
                    setShowRestTimer(true);
                }
            }
        }
    }, [plan.activeSession?.lastSetContext, routine?.exercises, toast]);
    /* eslint-enable react-hooks/set-state-in-effect */
    const activePhase = plan.phases.find((p) => p.id === activePhaseId) || {};

    // Helper: Is this the active session day?
    const isSessionActiveHere =
        plan.activeSession && plan.activeSession.phaseId === activePhaseId && plan.activeSession.dayId === activeDay;
    const isSessionActiveElsewhere = plan.activeSession && !isSessionActiveHere;

    // Helper: Completed session today?
    const completedSession = plan.history?.find(
        (h) =>
            h.phaseId === activePhaseId &&
            h.dayId === activeDay &&
            new Date(h.date).toDateString() === new Date().toDateString()
    );

    const handleAddExercise = (template = null) => {
        addExercise(activePhaseId, activeDay, template);
        setShowTemplates(false);
        setSearchTerm(''); // Reset search
    };

    const categories = ['Todos', ...new Set(EXERCISE_TEMPLATES.map((t) => t.category))];

    // Filter Logic
    const filteredTemplates = EXERCISE_TEMPLATES.filter((t) => {
        const matchesCategory = selectedCategory === 'Todos' || t.category === selectedCategory;
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const days = [
        { id: 1, label: 'Lunes', short: 'L' },
        { id: 2, label: 'Martes', short: 'M' },
        { id: 3, label: 'Miércoles', short: 'X' },
        { id: 4, label: 'Jueves', short: 'J' },
        { id: 5, label: 'Viernes', short: 'V' },
        { id: 6, label: 'Sábado', short: 'S' },
        { id: 0, label: 'Domingo', short: 'D' },
    ];

    return (
        <div className="p-6 space-y-6 pb-24 relative">
            {/* Templates Modal */}
            {showTemplates && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Plus size={18} className="text-blue-400" />
                                Añadir Ejercicio
                            </h3>
                            <button
                                onClick={() => setShowTemplates(false)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Search & Filter */}
                        <div className="p-4 space-y-3 bg-slate-900 sticky top-0 z-10">
                            {/* Search Input */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input
                                    autoFocus
                                    className="w-full bg-slate-800 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl focus:border-blue-500 outline-none transition-colors"
                                    placeholder="Buscar ejercicio (ej: Press...)"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Category Chips */}
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                                            selectedCategory === cat
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:border-slate-600'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 overflow-y-auto space-y-2 flex-1 no-scrollbar">
                            <button
                                onClick={() => handleAddExercise()}
                                className="w-full text-left p-4 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-600/30 hover:bg-blue-600/20 font-bold mb-4 flex items-center justify-between group transition-all"
                            >
                                <span>+ Crear ejercicio personalizado</span>
                                <Plus size={16} className="group-hover:scale-110 transition-transform" />
                            </button>

                            {filteredTemplates.map((t, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleAddExercise(t)}
                                    className="w-full text-left p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 flex justify-between items-center transition-all group"
                                >
                                    <div>
                                        <div className="text-slate-200 font-bold text-sm group-hover:text-blue-300 transition-colors">
                                            {t.name}
                                        </div>
                                        <div className="text-xs text-slate-500 flex gap-2 mt-1">
                                            <span>
                                                {t.sets} x {t.reps}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-700 px-2 py-1 rounded uppercase tracking-wider font-bold">
                                        {t.category}
                                    </span>
                                </button>
                            ))}

                            {filteredTemplates.length === 0 && (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    <p className="mb-2">No se encontraron ejercicios "Core".</p>
                                    <button
                                        onClick={() => setSelectedCategory('Todos')}
                                        className="text-blue-400 underline"
                                    >
                                        Ver todos
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Move to Day Modal */}
            {movingExIndex !== null && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-4 shadow-2xl">
                        <h3 className="font-bold text-white mb-4">Mover a otro día...</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {days.map((d) => (
                                <button
                                    key={d.id}
                                    onClick={() => {
                                        moveExerciseToDay(activePhaseId, activeDay, movingExIndex, d.id);
                                        setMovingExIndex(null);
                                    }}
                                    className={`p-3 rounded-lg border text-sm font-bold transition-all ${d.id === activeDay ? 'border-blue-500 bg-blue-900/20 text-blue-400' : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setMovingExIndex(null)}
                            className="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 font-bold transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Rest Timer Overlay — pegado al nav inferior */}
            {showRestTimer && (
                <div className="fixed inset-x-0 z-50 px-0" style={{ bottom: 'var(--nav-height, 72px)' }}>
                    <div
                        className={`shadow-2xl p-4 flex items-center justify-between border-t border-x transition-colors duration-500 rounded-t-2xl ${
                            restPhase === 'overtime'
                                ? 'bg-rose-950 border-rose-700 animate-timer-blink'
                                : restPhase === 'critical'
                                  ? 'bg-rose-950 border-rose-800 animate-timer-blink'
                                  : restPhase === 'warn'
                                    ? 'bg-orange-950 border-orange-800'
                                    : restPhase === 'caution'
                                      ? 'bg-yellow-950 border-yellow-700'
                                      : 'bg-emerald-950 border-emerald-800'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className={`p-3 rounded-full transition-colors duration-500 ${
                                    restPhase === 'overtime' || restPhase === 'critical'
                                        ? 'bg-rose-900'
                                        : restPhase === 'warn'
                                          ? 'bg-orange-900'
                                          : restPhase === 'caution'
                                            ? 'bg-yellow-900'
                                            : 'bg-emerald-900'
                                }`}
                            >
                                <Timer
                                    size={24}
                                    className={`transition-colors duration-500 ${
                                        restPhase === 'overtime' || restPhase === 'critical'
                                            ? 'text-rose-400'
                                            : restPhase === 'warn'
                                              ? 'text-orange-400'
                                              : restPhase === 'caution'
                                                ? 'text-yellow-400'
                                                : 'text-emerald-400'
                                    }`}
                                />
                            </div>
                            <div>
                                <div className="text-slate-300 text-xs font-bold uppercase">
                                    {restPhase === 'overtime' ? t('training.overtime') : t('training.restTimer')}
                                </div>
                                <RestCountdown
                                    startTime={restStartTime}
                                    duration={restDuration}
                                    onPhaseChange={setRestPhase}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setRestDuration((prev) => prev + 30)}
                                className="p-2 text-slate-300 hover:text-white bg-slate-800 rounded-lg text-xs font-bold"
                            >
                                +30s
                            </button>
                            <button
                                onClick={() => {
                                    setShowRestTimer(false);
                                    setRestPhase('ok');
                                }}
                                className="p-2 text-slate-300 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Banner de entreno pendiente (Fase 5b) */}
            {hasPending && firstPending && !plan.activeSession && (
                <div className="bg-amber-950/30 border border-amber-700/50 rounded-2xl p-4 mb-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="bg-amber-900/40 p-2 rounded-lg text-amber-400 shrink-0">
                            <Zap size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-amber-200">{firstPending.routineLabel}</div>
                            <div className="text-xs text-amber-200/60">
                                {t('training.pendingFrom', { day: firstPending.label })}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                markTrainedToday(firstPending.dayId);
                                setActiveDay(firstPending.dayId);
                            }}
                            className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                            <Play size={12} fill="currentColor" /> {t('training.trainToday')}
                        </button>
                        <button
                            onClick={() => markSkipped(firstPending.dayId)}
                            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5"
                        >
                            <SkipForward size={12} /> {t('training.skip')}
                        </button>
                        <button
                            onClick={() => markDoneElsewhere(firstPending.dayId)}
                            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5"
                        >
                            <CheckCircle2 size={12} /> {t('training.alreadyDone')}
                        </button>
                    </div>
                </div>
            )}

            {/* Header Phase Navigation */}
            <header>
                <div className="flex justify-between items-center mb-4 bg-slate-800 p-2 rounded-xl border border-slate-700/50">
                    <button
                        onClick={() => setActivePhaseId(Math.max(1, activePhaseId - 1))}
                        className="p-2 hover:bg-slate-700 rounded-full text-blue-400 transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className="flex-1 text-center">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1">
                            Fase {activePhaseId}
                        </span>
                        {editingHeader ? (
                            <div className="flex flex-col gap-2 items-center">
                                <input
                                    className="bg-slate-900 border border-slate-700 text-center text-sm font-bold text-blue-400 p-1 rounded w-40"
                                    value={activePhase.monthLabel || ''}
                                    onChange={(e) => updatePhase(activePhaseId, { monthLabel: e.target.value })}
                                    placeholder="Etiqueta (ej: Ene - Mar)"
                                    autoFocus
                                />
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                    <input
                                        type="date"
                                        className="bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded"
                                        value={activePhase.dates?.start || ''}
                                        onChange={(e) =>
                                            updatePhase(activePhaseId, {
                                                dates: { ...(activePhase.dates || {}), start: e.target.value },
                                            })
                                        }
                                    />
                                    <span className="text-slate-500">→</span>
                                    <input
                                        type="date"
                                        className="bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded"
                                        value={activePhase.dates?.end || ''}
                                        onChange={(e) =>
                                            updatePhase(activePhaseId, {
                                                dates: { ...(activePhase.dates || {}), end: e.target.value },
                                            })
                                        }
                                    />
                                </div>
                                <button
                                    onClick={() => setEditingHeader(false)}
                                    className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider"
                                >
                                    Hecho
                                </button>
                            </div>
                        ) : (
                            <div onClick={() => setEditingHeader(true)} className="cursor-pointer group">
                                <div className="text-blue-400 font-bold text-lg group-hover:text-blue-300 transition-colors flex justify-center items-center gap-2">
                                    {activePhase.monthLabel || 'Periodo'}
                                    <Edit2 size={12} className="opacity-50" />
                                </div>
                                {(activePhase.dates?.start || activePhase.dates?.end) && (
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        {formatPhaseDateRange(activePhase.dates)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setActivePhaseId(Math.min(3, activePhaseId + 1))}
                        className="p-2 hover:bg-slate-700 rounded-full text-blue-400 transition-colors"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Day Selector */}
                <div className="flex justify-between bg-slate-800/50 p-2 rounded-xl overflow-x-auto gap-2 no-scrollbar">
                    {days.map((d) => (
                        <button
                            key={d.id}
                            onClick={() => setActiveDay(d.id)}
                            className={`flex-1 min-w-[40px] py-2 rounded-lg text-xs font-bold transition-all ${activeDay === d.id ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
                        >
                            <span className="block">{d.short}</span>
                        </button>
                    ))}
                </div>
            </header>

            {/* Active Session Warning (if elsewhere) */}
            {isSessionActiveElsewhere && (
                <div className="bg-amber-900/20 border border-amber-500/50 p-4 rounded-2xl mb-4 flex items-center justify-between animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="text-amber-500" />
                        <div>
                            <div className="text-amber-500 font-bold text-sm">Entreno en curso</div>
                            <div className="text-slate-400 text-xs">Tienes una sesión activa en otro día.</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Session Timer / Start Button / Completed Summary */}
            {plan.activeSession ? (
                // ACTIVE SESSION
                isSessionActiveHere ? (
                    <div className="sticky top-4 z-40 mb-6 animate-in slide-in-from-top-4">
                        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl shadow-2xl">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={toggleSessionPause}
                                        className={`p-3 rounded-full transition-all ${
                                            plan.activeSession.pauses?.length > 0 &&
                                            !plan.activeSession.pauses[plan.activeSession.pauses.length - 1].end
                                                ? 'bg-amber-500/20 text-amber-500 animate-pulse'
                                                : 'bg-emerald-500/20 text-emerald-400'
                                        }`}
                                    >
                                        {plan.activeSession.pauses?.length > 0 &&
                                        !plan.activeSession.pauses[plan.activeSession.pauses.length - 1].end ? (
                                            <Play size={20} fill="currentColor" />
                                        ) : (
                                            <Pause size={20} fill="currentColor" />
                                        )}
                                    </button>
                                    <div>
                                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                                            Tiempo Activo
                                        </div>
                                        <SessionTimer
                                            startTime={plan.activeSession.startTime}
                                            pauses={plan.activeSession.pauses}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={finishSession}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-blue-500 transition-colors flex items-center gap-2"
                                >
                                    <Save size={14} />
                                    {t('training.finishSession')}
                                </button>
                            </div>
                            {/* Progress bar de series completadas */}
                            {(() => {
                                const exercises = routine?.exercises || [];
                                const totalSets = exercises.reduce((acc, ex) => acc + (parseInt(ex.sets) || 0), 0);
                                const completedCount = Object.keys(plan.activeSession.completedSets || {}).length;
                                const pct =
                                    totalSets > 0 ? Math.min(100, Math.round((completedCount / totalSets) * 100)) : 0;
                                return totalSets > 0 ? (
                                    <div className="mt-3 flex items-center gap-3">
                                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                            {completedCount}/{totalSets} {t('training.sets')}
                                        </span>
                                    </div>
                                ) : null;
                            })()}
                        </div>
                    </div>
                ) : null
            ) : completedSession ? (
                // COMPLETED SUMMARY
                <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 p-5 rounded-2xl mb-6 flex justify-between items-center animate-in slide-in-from-top-2">
                    <div>
                        <div className="text-emerald-400 font-bold text-lg flex items-center gap-2">
                            <Check size={20} className="bg-emerald-500 text-black rounded-full p-0.5" />
                            Entreno Completado
                        </div>
                        <div className="text-slate-400 text-xs mt-1 flex gap-3">
                            <span>⏱️ {Math.floor(completedSession.durationSeconds / 60)} min</span>
                            <span>✅ {Object.keys(completedSession.completedSets || {}).length} Series</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowStats(true)}
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 underline"
                        >
                            Ver Estadísticas
                        </button>
                        <button
                            onClick={() => startSession(activePhaseId, activeDay)}
                            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline"
                        >
                            Repetir
                        </button>
                    </div>
                </div>
            ) : (
                // START BUTTON
                <button
                    onClick={() => startSession(activePhaseId, activeDay)}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-3 active:scale-95 transition-all mb-4"
                >
                    <div className="bg-white/20 p-2 rounded-full">
                        <Timer size={24} className="text-white" />
                    </div>
                    <div className="text-left">
                        <div className="text-white font-bold text-lg leading-none">Empezar Entreno</div>
                        <div className="text-blue-100 text-xs text-opacity-80">{t('training.logSets')}</div>
                    </div>
                </button>
            )}

            {/* Stats Modal */}
            {showStats && <WorkoutStatsModal session={completedSession} onClose={() => setShowStats(false)} />}

            {/* Exercise Info Modal */}
            {viewingExercise && <ExerciseModal exercise={viewingExercise} onClose={() => setViewingExercise(null)} />}

            <div className="space-y-4">
                {/* Day Label Edit ... (Keep existing Day Label Edit block) */}
                <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                        <Calendar size={64} />
                    </div>
                    {editingDayInfo ? (
                        <div className="flex flex-col gap-2 relative z-10">
                            <input
                                className="bg-slate-900 text-blue-400 font-bold uppercase text-sm p-2 rounded border border-blue-500/50 outline-none"
                                value={routine.label || ''}
                                onChange={(e) => updateDayRoutine(activePhaseId, activeDay, { label: e.target.value })}
                                placeholder="TÍTULO (ej: Torso)"
                            />
                            <textarea
                                className="bg-slate-900 text-slate-300 text-sm p-2 rounded resize-none border border-slate-700 outline-none focus:border-blue-500/50"
                                rows={2}
                                value={routine.focus || ''}
                                onChange={(e) => updateDayRoutine(activePhaseId, activeDay, { focus: e.target.value })}
                                placeholder="Objetivo principal..."
                            />
                            <button
                                onClick={() => setEditingDayInfo(false)}
                                className="bg-blue-600 text-white px-3 py-1 text-xs rounded-lg font-bold self-end shadow-lg"
                            >
                                Guardar
                            </button>
                        </div>
                    ) : (
                        <div onClick={() => setEditingDayInfo(true)} className="cursor-pointer relative z-10 group">
                            <h3 className="text-blue-400 text-sm font-bold uppercase mb-1 flex items-center gap-2">
                                {routine.label || 'Día Sin Asignar'}
                                <Edit2
                                    size={12}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500"
                                />
                            </h3>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                {routine.focus || 'Toca para añadir descripción/objetivos.'}
                            </p>
                        </div>
                    )}
                </div>

                {routine?.exercises?.map((ex, i) => {
                    // Superserie detection: si rest="0", el siguiente ejercicio es su pareja
                    // Superserie: rest es "0", 0, "0s", "" o null/undefined
                    const restVal = String(ex.rest ?? '').trim();
                    const isSuperset = restVal === '0' || restVal === '' || restVal === '0s';
                    const prevRestVal = i > 0 ? String(routine.exercises[i - 1]?.rest ?? '').trim() : '';
                    const prevIsSuperset = i > 0 && (prevRestVal === '0' || prevRestVal === '' || prevRestVal === '0s');
                    const supersetGroup = ex.name?.match(/^([A-Z])\d\./)?.[1];

                    // Progress Logic
                    const totalSets = parseInt(ex.sets) || 3;

                    // Helper to check set status
                    const isSetDone = (setIdx) => {
                        const key = `${i}-${setIdx}`;
                        return plan.activeSession?.completedSets?.[key] || completedSession?.completedSets?.[key];
                    };

                    // Count done
                    let setsDoneCount = 0;
                    for (let s = 0; s < totalSets; s++) {
                        if (isSetDone(s)) setsDoneCount++;
                    }
                    const isComplete = setsDoneCount >= totalSets && totalSets > 0;
                    const isActive = plan.activeSession && !isComplete && setsDoneCount > 0;

                    return (
                        <React.Fragment key={i}>
                            {/* Superserie connector: une A1 con A2 visualmente */}
                            {prevIsSuperset && (
                                <div className="flex items-center justify-center -my-2 relative z-10">
                                    <div className="bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full border border-amber-500/30">
                                        + {t('training.noRest').toLowerCase()}
                                    </div>
                                </div>
                            )}
                            <div
                                className={`rounded-2xl p-5 border shadow-sm relative group transition-all duration-500 ${
                                    isComplete
                                        ? 'bg-emerald-900/10 border-emerald-500/30'
                                        : isActive
                                          ? 'bg-blue-900/10 border-blue-500/30'
                                          : isSuperset || prevIsSuperset
                                            ? 'bg-slate-800 border-amber-700/30 hover:border-amber-600/50'
                                            : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                }`}
                            >
                                {/* Superserie badge */}
                                {isSuperset && supersetGroup && (
                                    <div className="absolute -top-2 right-4 bg-amber-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full">
                                        {t('training.superset')} {supersetGroup}
                                    </div>
                                )}

                                {/* Completion glow */}
                                {isComplete && (
                                    <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl pointer-events-none" />
                                )}

                                <div className="flex justify-between items-start mb-3 gap-3 relative z-10">
                                    <input
                                        className={`font-bold text-lg bg-transparent outline-none w-full border-b border-transparent focus:border-blue-500/50 transition-all placeholder-slate-600 ${isComplete ? 'text-emerald-400 line-through decoration-emerald-500/50' : 'text-slate-100'}`}
                                        value={ex.name}
                                        onChange={(e) =>
                                            updateExercise(activePhaseId, activeDay, i, { name: e.target.value })
                                        }
                                        placeholder="Nombre Ejercicio"
                                    />
                                    <button
                                        onClick={() => setViewingExercise(ex)}
                                        className="p-2 text-slate-500 hover:text-blue-400 transition-colors"
                                    >
                                        <Info size={18} />
                                    </button>
                                    <div className="flex gap-1 shrink-0">
                                        {/* Reorder Buttons */}
                                        <button
                                            onClick={() =>
                                                i > 0 && reorderExercises(activePhaseId, activeDay, i, i - 1)
                                            }
                                            className="p-1.5 rounded-lg bg-slate-900 text-slate-500 hover:text-blue-400 hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                            disabled={i === 0}
                                        >
                                            <ArrowUp size={14} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                i < routine.exercises.length - 1 &&
                                                reorderExercises(activePhaseId, activeDay, i, i + 1)
                                            }
                                            className="p-1.5 rounded-lg bg-slate-900 text-slate-500 hover:text-blue-400 hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                            disabled={i === routine.exercises.length - 1}
                                        >
                                            <ArrowDown size={14} />
                                        </button>

                                        {/* Move to... */}
                                        <button
                                            onClick={() => setMovingExIndex(i)}
                                            className="p-1.5 rounded-lg bg-slate-900 text-slate-500 hover:text-green-400 hover:bg-slate-800 transition-all ml-1"
                                        >
                                            <ArrowRightCircle size={14} />
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={() => deleteExercise(activePhaseId, activeDay, i)}
                                            className="p-1.5 rounded-lg bg-slate-900 text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-all ml-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Interactive Sets */}
                                <div className="mb-4">
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from({ length: totalSets }).map((_, setIdx) => {
                                            const done = isSetDone(setIdx);
                                            return (
                                                <button
                                                    key={setIdx}
                                                    onClick={() => toggleSetCompletion(i, setIdx)}
                                                    disabled={!plan.activeSession}
                                                    className={`h-8 w-12 rounded-lg flex items-center justify-center font-mono font-bold text-sm transition-all ${
                                                        done
                                                            ? 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/20 scale-105'
                                                            : plan.activeSession
                                                              ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {done ? <Check size={16} strokeWidth={4} /> : setIdx + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {!plan.activeSession && !completedSession && (
                                        <p className="text-[10px] text-slate-500 mt-2 italic">
                                            {t('training.startToMark')}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {/* Stats Editable - Reps & Rest (Sets is implied by bubbles now, but kept for editing config) */}
                                    <div className="flex items-center gap-2 text-slate-400 bg-slate-900/50 p-2 rounded-lg">
                                        <Repeat size={14} />
                                        <input
                                            className="bg-transparent outline-none w-full text-slate-200 font-bold"
                                            value={ex.reps}
                                            onChange={(e) =>
                                                updateExercise(activePhaseId, activeDay, i, { reps: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 bg-slate-900/50 p-2 rounded-lg">
                                        <Timer size={14} />
                                        <input
                                            className="bg-transparent outline-none w-full text-slate-200 font-bold"
                                            value={ex.rest}
                                            onChange={(e) =>
                                                updateExercise(activePhaseId, activeDay, i, { rest: e.target.value })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}

                <button
                    onClick={() => setShowTemplates(true)}
                    className="w-full py-4 border-2 border-dashed border-slate-700 text-slate-500 rounded-2xl hover:border-blue-500 hover:text-blue-500 hover:bg-slate-800/50 transition-all flex items-center justify-center gap-2 group"
                >
                    <Plus size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="font-bold">Añadir Ejercicio</span>
                </button>
            </div>
        </div>
    );
}

function StatEditable({ label, value, onSave }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value);

    // FIX: Sync state when props change (like when reordering or deleting items)
    useEffect(() => {
        setVal(value);
    }, [value]);

    // Icon mapping simple
    const icon =
        label === 'Series' ? <Dumbbell size={14} /> : label === 'Reps' ? <Repeat size={14} /> : <Timer size={14} />;

    if (editing)
        return (
            <input
                autoFocus
                className="bg-slate-900 border border-blue-500 text-white text-center rounded w-full p-2"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onBlur={() => {
                    onSave(val);
                    setEditing(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            />
        );

    return (
        <div
            onClick={() => setEditing(true)}
            className="flex flex-col items-center bg-slate-900/50 p-2 rounded-lg cursor-pointer hover:bg-slate-900"
        >
            <div className="text-slate-400 mb-1">{icon}</div>
            <div className="font-bold text-slate-200">{value}</div>
            <div className="text-[10px] text-slate-500 uppercase">{label}</div>
        </div>
    );
}

function SessionTimer({ startTime, pauses = [] }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            // Calculate total paused time
            const totalPaused = pauses.reduce((acc, p) => acc + ((p.end || now) - p.start), 0);
            const currentElapsed = Math.floor((now - startTime - totalPaused) / 1000);
            setElapsed(Math.max(0, currentElapsed));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime, pauses]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return <div className="font-mono text-2xl font-bold text-white tracking-widest">{formatTime(elapsed)}</div>;
}

function RestCountdown({ startTime, duration, onPhaseChange }) {
    const [left, setLeft] = useState(duration);

    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const remaining = Math.ceil(duration - elapsed);
            setLeft(remaining);
        }, 100);
        return () => clearInterval(interval);
    }, [startTime, duration]);

    // Fase: últimos 10s = critical (blink), overtime cuando pasa de 0
    const pct = duration > 0 ? left / duration : 0;
    const phase =
        left <= 0 ? 'overtime' : left <= 10 ? 'critical' : pct <= 0.25 ? 'warn' : pct <= 0.5 ? 'caution' : 'ok';

    useEffect(() => {
        if (onPhaseChange) onPhaseChange(phase);
    }, [phase, onPhaseChange]);

    const colorClass = {
        ok: 'text-emerald-400',
        caution: 'text-yellow-400',
        warn: 'text-orange-400',
        critical: 'text-rose-400 animate-pulse',
        overtime: 'text-rose-400 animate-pulse',
    }[phase];

    const display = left <= 0 ? `${left}s` : `${left}s`;

    return <div className={`text-2xl font-bold font-mono ${colorClass}`}>{display}</div>;
}

function WorkoutStatsModal({ session, onClose }) {
    if (!session) return null;

    // Metrics Calculation
    const totalDuration = session.durationSeconds || 0;
    const startTime = session.startTime || 0;
    const endTime = session.endTime || 0;
    const realDuration = (endTime - startTime) / 1000; // seconds

    // Pauses
    const pauses = session.pauses || [];
    const totalPaused = pauses.reduce((acc, p) => acc + ((p.end || p.start) - p.start), 0) / 1000;
    const workTime = Math.max(0, realDuration - totalPaused);

    // Percentages for Pie Chart
    const workPct = Math.round((workTime / realDuration) * 100) || 0;

    // Set Analysis (if available)
    const setLogs = session.setLogs || [];
    const totalSets = setLogs.length || Object.keys(session.completedSets || {}).length;

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 sticky top-0 z-10">
                    <div>
                        <h3 className="font-bold text-white text-lg">Resumen de Sesión</h3>
                        <p className="text-xs text-slate-400">
                            {new Date(session.date).toLocaleDateString()} •{' '}
                            {new Date(session.date).toLocaleTimeString()}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Ring Chart: Work vs Rest */}
                    <div className="flex flex-col items-center">
                        <div
                            className="relative size-48 rounded-full flex items-center justify-center mb-4"
                            style={{
                                background: `conic-gradient(#10b981 ${workPct}%, #3b82f6 ${workPct}% 100%)`,
                            }}
                        >
                            <div className="absolute inset-2 bg-slate-900 rounded-full flex flex-col items-center justify-center z-10">
                                <span className="text-3xl font-bold text-white">{Math.floor(totalDuration / 60)}'</span>
                                <span className="text-xs text-slate-400 uppercase tracking-widest">Total</span>
                            </div>
                        </div>
                        <div className="flex gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="size-3 bg-emerald-500 rounded-full"></div>
                                <span className="text-slate-300">Activo ({Math.floor(workTime / 60)}m)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="size-3 bg-blue-500 rounded-full"></div>
                                <span className="text-slate-300">Pausa ({Math.floor(totalPaused / 60)}m)</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <div className="text-slate-400 text-xs uppercase font-bold mb-1">Volumen</div>
                            <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                                {totalSets} <span className="text-xs text-slate-500">Series</span>
                            </div>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <div className="text-slate-400 text-xs uppercase font-bold mb-1">Ritmo</div>
                            <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                                {totalDuration > 0 ? (totalSets / (totalDuration / 3600)).toFixed(1) : 0}{' '}
                                <span className="text-xs text-slate-500">Series/h</span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline (Basic Visualization of Sets) */}
                    {setLogs.length > 0 && (
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                            <h4 className="text-slate-300 font-bold mb-4 text-sm flex items-center gap-2">
                                <Calendar size={14} /> Timeline de Series
                            </h4>
                            <div className="h-12 flex items-end gap-1 relative">
                                {setLogs.map((log, i) => {
                                    // Calculate relative position based on time
                                    const sessionStart = setLogs[0].timestamp;
                                    const sessionEnd = setLogs[setLogs.length - 1].timestamp;
                                    const range = sessionEnd - sessionStart || 1;
                                    const pos = ((log.timestamp - sessionStart) / range) * 100;

                                    return (
                                        <div
                                            key={i}
                                            className="w-1 bg-emerald-500 rounded-t-sm hover:bg-emerald-400 transition-colors cursor-help group absolute bottom-0"
                                            style={{ height: '60%', left: `${pos}%` }}
                                        >
                                            {/* Tooltip */}
                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-[10px] whitespace-nowrap hidden group-hover:block z-20 border border-slate-700">
                                                Serie {log.setIndex + 1} (
                                                {new Date(log.timestamp).toLocaleTimeString([], {
                                                    minute: '2-digit',
                                                    second: '2-digit',
                                                })}
                                                )
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Baseline */}
                                <div className="absolute bottom-0 w-full h-px bg-slate-700"></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900/50 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
