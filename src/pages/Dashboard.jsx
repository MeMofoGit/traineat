import React, { useState, useMemo } from 'react';
import {
    Clock,
    Battery,
    Calendar,
    ArrowRight,
    Dumbbell,
    Edit2,
    Check,
    X,
    Target,
    TrendingUp,
    TrendingDown,
    Minus,
    Scale,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSchedule } from '../hooks/useSchedule';
import { usePlan } from '../hooks/usePlan';
import { assignMealRoles, TIMING_ROLES } from '../utils/nutrientTiming';

export default function Dashboard() {
    const { now, currentPhase, nextEvent, activeTraining } = useSchedule();
    const { plan, setActivePhaseId } = usePlan();
    const mealRoles = useMemo(
        () => assignMealRoles(plan.schedule?.default, plan.trainingTime),
        [plan.schedule, plan.trainingTime]
    );
    const nextEventRole = nextEvent ? mealRoles[nextEvent.id] : null;
    const navigate = useNavigate();

    return (
        <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
            {/* Header */}
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                        Hola, {plan.user?.name || 'Atleta'}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {currentPhase.name}
                        {currentPhase.dates?.end &&
                            (() => {
                                const daysLeft = Math.ceil((new Date(currentPhase.dates.end) - now) / 86400000);
                                if (daysLeft > 0 && daysLeft <= 90)
                                    return <span className="text-slate-500"> · {daysLeft}d restantes</span>;
                                return null;
                            })()}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-mono font-semibold text-slate-200">
                        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">
                        {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                </div>
            </header>

            {/* Weight badge */}
            <WeightBadge plan={plan} />

            {/* Phase Selector */}
            <PhaseSelector phases={plan.phases || []} activeId={plan.activePhaseId} onChange={setActivePhaseId} />

            {/* Smart Analysis Card (Next Meal) */}
            <section className="bg-slate-800/50 rounded-3xl p-6 border border-slate-700/50 shadow-lg backdrop-blur-sm relative overflow-hidden group hover:border-blue-500/30 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                {nextEvent ? (
                    <>
                        <div className="flex items-center gap-3 mb-4 text-blue-400">
                            <Clock size={20} />
                            <h2 className="font-semibold uppercase tracking-wide text-sm">
                                Próxima Comida: <span className="text-white">{nextEvent.time}</span>
                            </h2>
                        </div>

                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2">
                                <h3 className="text-2xl font-bold text-white">{nextEvent.label}</h3>
                                {nextEventRole && nextEventRole !== 'normal' && TIMING_ROLES[nextEventRole] && (
                                    <span
                                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                            nextEventRole === 'pre'
                                                ? 'bg-amber-900/40 text-amber-400 border border-amber-700/40'
                                                : 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                                        }`}
                                    >
                                        {TIMING_ROLES[nextEventRole].label}
                                    </span>
                                )}
                            </div>

                            <div className="text-slate-400 leading-relaxed text-sm">
                                <p className="mb-2 italic opacity-80">{nextEvent.details.goal}</p>
                                {(() => {
                                    const activeOption =
                                        nextEvent.details.options?.[nextEvent.details.selectedOptionIndex || 0];
                                    const items = activeOption?.items || [];
                                    if (items.length === 0) return null;
                                    return (
                                        <ul>
                                            {items.slice(0, 2).map((item, i) => (
                                                <li key={i}>
                                                    • {item.name}{' '}
                                                    <span className="text-slate-500">
                                                        ({item.quantity}
                                                        {item.unit})
                                                    </span>
                                                </li>
                                            ))}
                                            {items.length > 2 && <li>... y más</li>}
                                        </ul>
                                    );
                                })()}
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/diet')}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                        >
                            Ver Dieta <ArrowRight size={18} />
                        </button>
                    </>
                ) : (
                    <div className="text-center py-8">
                        <h3 className="text-xl text-slate-300">Día Completado</h3>
                    </div>
                )}
            </section>

            {/* Training Widget */}
            <section className="bg-slate-800/50 rounded-3xl p-6 border border-slate-700/50 shadow-lg backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                <div className="flex items-center gap-3 mb-4 text-emerald-400">
                    <Dumbbell size={20} />
                    <h2 className="font-semibold uppercase tracking-wide text-sm">Entrenamiento de Hoy</h2>
                </div>

                {activeTraining.routine ? (
                    <>
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-white mb-1">
                                {activeTraining.routine.label || 'Rutina sin nombre'}
                            </h3>
                            <p className="text-slate-400 text-sm">
                                {activeTraining.routine.focus || 'Sin enfoque definido'}
                            </p>
                            <div className="mt-4 flex gap-2">
                                <span className="text-xs bg-slate-900 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                                    {activeTraining.routine.exercises?.length || 0} Ejercicios
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/training')}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white font-semibold rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                        >
                            Ir a Entrenar <ArrowRight size={18} />
                        </button>
                    </>
                ) : (
                    <div className="text-center py-6">
                        <h3 className="text-xl font-bold text-slate-300 mb-2">Día de Descanso</h3>
                        <p className="text-slate-500 text-sm">Recupérate para mañana.</p>
                    </div>
                )}
            </section>

            {/* Weekly Progress */}
            <WeeklyProgress plan={plan} />

            {/* Weight Tracker */}
            <div className="bg-slate-800/30 p-5 rounded-3xl border border-slate-800">
                <WeightTracker />
            </div>
        </div>
    );
}

function PhaseSelector({ phases, activeId, onChange }) {
    const active = phases.find((p) => p.id === activeId) || phases[0];
    if (!active) return null;

    return (
        <section className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-amber-400">
                    <Target size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Fase Activa</span>
                </div>
                <select
                    value={active.id}
                    onChange={(e) => onChange(parseInt(e.target.value, 10))}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg px-2 py-1 outline-none focus:border-amber-500 cursor-pointer"
                >
                    {phases.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                    <span>Periodo</span>
                    <span className="font-mono text-slate-300">{active.monthLabel || '—'}</span>
                </div>
                {(active.dates?.start || active.dates?.end) && (
                    <div className="flex justify-between text-slate-400">
                        <span>Fechas</span>
                        <span className="font-mono text-slate-300">
                            {active.dates?.start || '?'} → {active.dates?.end || '?'}
                        </span>
                    </div>
                )}
                {active.focus && (
                    <div className="flex justify-between text-slate-400">
                        <span>Foco</span>
                        <span className="text-slate-300 text-right max-w-[60%] truncate">{active.focus}</span>
                    </div>
                )}
                {active.target_weight && (
                    <div className="flex justify-between text-slate-400">
                        <span>Peso objetivo</span>
                        <span className="font-mono text-slate-300">{active.target_weight}</span>
                    </div>
                )}
            </div>
        </section>
    );
}

function WeightTracker() {
    const { plan, logWeight, updateUser } = usePlan();
    const [islogging, setIsLogging] = useState(false);
    const [isEditingHeight, setIsEditingHeight] = useState(false);

    // Inputs
    const [weightInput, setWeightInput] = useState('');
    const [heightInput, setHeightInput] = useState(plan.user.height || '');

    const weights = plan.weightLog || [];
    const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : plan.user.start_weight;
    const previousWeight = weights.length > 1 ? weights[weights.length - 2].weight : latestWeight;
    const diff = latestWeight - previousWeight;

    // Chart Logic
    const points = weights.slice(-7); // Last 7 entries
    // Pad with placeholders if less than 2 points to show a line
    // actually polyline needs at least 2 points to look good, or just dots.

    const minW = Math.min(...points.map((p) => p.weight)) - 1;
    const maxW = Math.max(...points.map((p) => p.weight)) + 1;
    const height = 80; // Increased height for labels
    const width = 100;

    const normalize = (w) => {
        if (maxW === minW) return height / 2;
        // Leave 20px bottom for labels
        const chartH = height - 20;
        return chartH - ((w - minW) / (maxW - minW)) * chartH;
    };

    const polylineMap = points
        .map((p, i) => {
            const x = (i / Math.max(points.length - 1, 1)) * width;
            const y = normalize(p.weight);
            return `${x},${y}`;
        })
        .join(' ');

    const handleLog = () => {
        if (weightInput) logWeight(weightInput);
        setIsLogging(false);
        setWeightInput('');
    };

    const handleSaveHeight = () => {
        if (heightInput && heightInput !== plan.user.height) {
            updateUser({ height: parseFloat(heightInput) });
        }
        setIsEditingHeight(false);
    };

    return (
        <div>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 text-purple-400 mb-1">
                        <Battery size={18} />
                        <span className="text-xs font-bold uppercase">Progreso Actual</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">{latestWeight}</span>
                        <span className="text-sm font-bold text-slate-500">kg</span>
                        {diff !== 0 && (
                            <span className={`text-xs font-bold ${diff < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {diff > 0 ? '+' : ''}
                                {diff.toFixed(1)}
                            </span>
                        )}
                    </div>

                    {/* Height Edit Section */}
                    <div className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-2">
                        {isEditingHeight ? (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                <span>Altura:</span>
                                <input
                                    type="number"
                                    className="bg-slate-800 border border-slate-600 text-white w-12 p-0.5 rounded text-center text-xs outline-none focus:border-purple-500"
                                    value={heightInput}
                                    onChange={(e) => setHeightInput(e.target.value)}
                                    autoFocus
                                />
                                <span className="text-slate-600">cm</span>
                                <button
                                    onClick={handleSaveHeight}
                                    className="text-emerald-400 bg-emerald-900/30 p-1 rounded hover:bg-emerald-900/50"
                                >
                                    <Check size={12} />
                                </button>
                                <button
                                    onClick={() => setIsEditingHeight(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 group">
                                <span>Altura: {plan.user.height}cm</span>
                                <button
                                    onClick={() => setIsEditingHeight(true)}
                                    className="opacity-50 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-purple-400"
                                >
                                    <Edit2 size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {islogging ? (
                    <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl absolute right-6 z-10 shadow-xl w-40 animate-in fade-in zoom-in-95">
                        <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase text-center">Peso de Hoy</h4>

                        <div className="flex items-center justify-between mb-3">
                            <input
                                type="number"
                                className="bg-slate-800 border border-slate-600 text-white w-full p-2 rounded text-center font-bold text-lg outline-none focus:border-purple-500"
                                placeholder={latestWeight}
                                value={weightInput}
                                onChange={(e) => setWeightInput(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsLogging(false)}
                                className="flex-1 bg-slate-800 text-slate-400 text-xs py-1.5 rounded font-bold"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleLog}
                                className="flex-1 bg-purple-600 text-white text-xs py-1.5 rounded font-bold"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsLogging(true)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-purple-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                    >
                        Registrar
                    </button>
                )}
            </div>

            {/* Mini Chart */}
            <div className="h-24 w-full relative">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="gradientLine" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#c084fc" stopOpacity="1" />
                            <stop offset="100%" stopColor="#a855f7" stopOpacity="1" />
                        </linearGradient>
                    </defs>

                    {/* Line */}
                    {points.length > 1 && (
                        <polyline
                            fill="none"
                            stroke="url(#gradientLine)"
                            strokeWidth="2"
                            points={polylineMap}
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Points & Labels */}
                    {points.map((p, i) => {
                        const x = (i / Math.max(points.length - 1, 1)) * width;
                        const y = normalize(p.weight);

                        // Parse date nicely (e.g. "18/02")
                        const dateObj = new Date(p.date);
                        const dateLabel = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;

                        return (
                            <g key={i}>
                                <circle cx={x} cy={y} r="2" className="fill-slate-900 stroke-purple-400 stroke-2" />
                                {/* Date Label */}
                                <text
                                    x={x}
                                    y={height}
                                    fontSize="6"
                                    textAnchor="middle"
                                    fill="#64748b" // slate-500
                                    className="font-mono"
                                >
                                    {dateLabel}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}

const DAY_SHORTS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_IDS = [1, 2, 3, 4, 5, 6, 0]; // Lun-Dom

function WeeklyProgress({ plan }) {
    const activePhaseId = plan.activePhaseId || plan.phases?.[0]?.id || 1;

    const { days, completed, total } = useMemo(() => {
        const routines = plan.routines?.[activePhaseId] || {};
        const history = plan.history || [];
        const now = new Date();
        const todayDayId = now.getDay();

        // Semana ISO: lunes a domingo
        const weekStart = new Date(now);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(weekStart.getDate() + diff);
        weekStart.setHours(0, 0, 0, 0);

        const weekSessions = history.filter((h) => {
            if (!h.date) return false;
            return new Date(h.date) >= weekStart && h.phaseId === activePhaseId;
        });
        const completedDayIds = new Set(weekSessions.map((h) => h.dayId));

        let totalWorkouts = 0;
        let completedWorkouts = 0;

        const dayStates = DAY_IDS.map((dayId, i) => {
            const routine = routines[dayId];
            const hasExercises = routine?.exercises?.length > 0;
            const isCompleted = completedDayIds.has(dayId);
            const isToday = dayId === todayDayId;
            const isPast = DAY_IDS.indexOf(dayId) < DAY_IDS.indexOf(todayDayId);

            if (hasExercises) totalWorkouts++;
            if (hasExercises && isCompleted) completedWorkouts++;

            return {
                label: DAY_SHORTS[i],
                dayId,
                hasExercises,
                isCompleted,
                isToday,
                isPast,
                isSkipped: !isCompleted && isPast && hasExercises,
            };
        });

        return { days: dayStates, completed: completedWorkouts, total: totalWorkouts };
    }, [plan.history, plan.routines, activePhaseId]);

    const navigate = useNavigate();

    if (total === 0) return null;

    const pct = Math.round((completed / total) * 100);

    return (
        <section
            className="bg-slate-800/30 rounded-3xl p-5 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors"
            onClick={() => navigate('/training')}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-300">
                    <TrendingUp size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Esta semana</span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                    {completed}/{total} entrenos
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-800 rounded-full mb-4 overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Day dots — click en cada día navega a Training con ese día */}
            <div className="flex justify-between">
                {days.map((d) => (
                    <div
                        key={d.dayId}
                        className="flex flex-col items-center gap-1.5 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate('/training', { state: { dayId: d.dayId } });
                        }}
                    >
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all hover:scale-110 ${
                                d.isCompleted
                                    ? 'bg-emerald-600 text-white'
                                    : d.isToday
                                      ? 'bg-blue-600 text-white ring-2 ring-blue-400/50'
                                      : d.isSkipped
                                        ? 'bg-amber-900/30 text-amber-400 border border-amber-700/50'
                                        : d.hasExercises
                                          ? 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-500'
                                          : 'bg-slate-900 text-slate-600'
                            }`}
                        >
                            {d.isCompleted ? <Check size={14} /> : d.label}
                        </div>
                        <span className={`text-[9px] ${d.isToday ? 'text-blue-400 font-bold' : 'text-slate-600'}`}>
                            {d.hasExercises
                                ? plan.routines?.[activePhaseId]?.[d.dayId]?.label?.slice(0, 5) || '•'
                                : 'Rest'}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function WeightBadge({ plan }) {
    const { logWeight } = usePlan();
    const [showInput, setShowInput] = useState(false);
    const [weightInput, setWeightInput] = useState('');

    const weights = plan.weightLog || [];
    const latest = weights.length > 0 ? weights[weights.length - 1] : null;
    const previous = weights.length > 1 ? weights[weights.length - 2] : null;
    const diff = latest && previous ? (latest.weight - previous.weight).toFixed(1) : null;
    const diffNum = diff ? parseFloat(diff) : 0;

    const handleLog = () => {
        const val = parseFloat(weightInput);
        if (!val || val < 30 || val > 300) return;
        logWeight(val);
        setWeightInput('');
        setShowInput(false);
    };

    if (!latest && !showInput) {
        return (
            <button
                onClick={() => setShowInput(true)}
                className="w-full flex items-center justify-center gap-2 bg-slate-800/50 rounded-xl px-4 py-3 border border-dashed border-slate-700 text-slate-400 text-xs font-bold hover:border-blue-500 hover:text-blue-400 transition-colors"
            >
                <Scale size={14} /> Registrar primer peso
            </button>
        );
    }

    if (showInput) {
        return (
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-3 py-2 border border-blue-500/50">
                <Scale size={16} className="text-blue-400 shrink-0" />
                <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="74.5"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLog()}
                    autoFocus
                    className="flex-1 bg-transparent text-white text-sm font-bold outline-none w-20"
                />
                <span className="text-xs text-slate-500">kg</span>
                <button onClick={handleLog} className="p-1.5 bg-blue-600 rounded-lg text-white">
                    <Check size={14} />
                </button>
                <button onClick={() => setShowInput(false)} className="p-1.5 text-slate-400">
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => {
                setWeightInput(String(latest.weight));
                setShowInput(true);
            }}
            className="w-full flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/50 hover:border-slate-600 transition-colors"
        >
            <div className="flex items-center gap-2.5">
                <Scale size={16} className="text-blue-400" />
                <span className="text-sm font-bold text-white">{latest.weight} kg</span>
                {diff && diffNum !== 0 && (
                    <span
                        className={`text-xs font-mono flex items-center gap-0.5 ${diffNum < 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                        {diffNum < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                        {diffNum > 0 ? '+' : ''}
                        {diff}
                    </span>
                )}
            </div>
            <span className="text-[10px] text-slate-500">
                {new Date(latest.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
        </button>
    );
}
