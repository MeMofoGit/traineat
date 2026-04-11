import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { FOOD_DATABASE, FOOD_CATEGORIES } from '../data/food_database';
import { Loader2, Dumbbell, AlertTriangle, ChefHat, Flame, User, Target, Activity, Ruler } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sumMacrosPure, findFood } from '../hooks/useMacros';

const GOAL_LABELS = {
    cut: { es: 'Definición', en: 'Cut' },
    bulk: { es: 'Volumen', en: 'Bulk' },
    recomp: { es: 'Recomposición', en: 'Recomp' },
    maintain: { es: 'Mantenimiento', en: 'Maintenance' },
};

const ACTIVITY_LABELS = {
    sedentary: { es: 'Sedentario', en: 'Sedentary' },
    light: { es: 'Ligero', en: 'Light' },
    moderate: { es: 'Moderado', en: 'Moderate' },
    active: { es: 'Activo', en: 'Active' },
    very_active: { es: 'Muy activo', en: 'Very active' },
};

export default function SharedView() {
    const { tokenId } = useParams();
    const { i18n } = useTranslation();
    const isEn = i18n.language === 'en';
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [plan, setPlan] = useState(null);
    const [customFoods, setCustomFoods] = useState([]);
    const [tokenInfo, setTokenInfo] = useState(null);

    useEffect(() => {
        loadSharedData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tokenId]);

    async function loadSharedData() {
        setLoading(true);
        setError(null);
        try {
            const tokenDoc = await getDoc(doc(db, '_shareTokens', tokenId));
            if (!tokenDoc.exists()) {
                setError(isEn ? 'Link not found or expired' : 'Enlace no encontrado o expirado');
                return;
            }
            const token = tokenDoc.data();
            if (new Date(token.expiresAt) < new Date()) {
                setError(isEn ? 'This link has expired' : 'Este enlace ha expirado');
                return;
            }
            setTokenInfo(token);

            const planDoc = await getDoc(doc(db, 'users', token.uid, 'data', 'plan'));
            if (!planDoc.exists()) {
                setError(isEn ? 'No plan data found' : 'No se encontraron datos del plan');
                return;
            }
            setPlan(planDoc.data());

            const foodsSnap = await getDocs(query(collection(db, 'users', token.uid, 'customFoods'), orderBy('name')));
            setCustomFoods(foodsSnap.docs.map((d) => d.data()));
        } catch (err) {
            console.error('SharedView error:', err);
            setError(isEn ? 'Error loading data' : 'Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 size={32} className="text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <AlertTriangle size={40} className="text-amber-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">{error}</h1>
                    <p className="text-sm text-slate-400">
                        {isEn ? 'Ask the user to generate a new link.' : 'Pide al usuario que genere un nuevo enlace.'}
                    </p>
                </div>
            </div>
        );
    }

    const customFoodsMap = {};
    customFoods.forEach((f) => {
        customFoodsMap[f.id] = f;
    });

    const mealSlots = plan?.schedule?.default?.filter((s) => s.type === 'meal') || [];
    const user = plan?.user || {};
    const goalLabel = GOAL_LABELS[user.goalType]?.[isEn ? 'en' : 'es'] || user.goalType;
    const activityLabel = ACTIVITY_LABELS[user.activity]?.[isEn ? 'en' : 'es'] || user.activity;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="max-w-lg mx-auto p-6 space-y-6 pb-12">
                {/* Header */}
                <header className="text-center space-y-3">
                    <Dumbbell size={36} className="text-blue-500 mx-auto" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {isEn ? `${user.name || 'User'}'s Plan` : `Plan de ${user.name || 'Usuario'}`}
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            TrainEat · {isEn ? 'Shared view' : 'Vista compartida'}
                            {tokenInfo?.permissions === 'read'
                                ? isEn
                                    ? ' · Read only'
                                    : ' · Solo lectura'
                                : isEn
                                  ? ' · Editable'
                                  : ' · Editable'}
                        </p>
                    </div>
                </header>

                {/* User profile card */}
                <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
                    <div className="flex items-center gap-3 mb-3">
                        <User size={16} className="text-blue-400" />
                        <span className="text-xs font-bold uppercase text-slate-400">
                            {isEn ? 'Profile' : 'Perfil'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {user.height && (
                            <div className="flex items-center gap-2 text-slate-300">
                                <Ruler size={13} className="text-slate-500" />
                                {user.height} cm
                            </div>
                        )}
                        {user.activity && (
                            <div className="flex items-center gap-2 text-slate-300">
                                <Activity size={13} className="text-slate-500" />
                                {activityLabel}
                            </div>
                        )}
                        {user.goalType && (
                            <div className="flex items-center gap-2 text-slate-300">
                                <Target size={13} className="text-slate-500" />
                                {goalLabel}
                            </div>
                        )}
                        {user.goal && <div className="col-span-2 text-xs text-slate-500 italic">{user.goal}</div>}
                    </div>
                </div>

                {/* Meals */}
                <div className="space-y-5">
                    {mealSlots.map((slot) => {
                        const meal = plan?.meals?.[slot.id];
                        if (!meal) return null;

                        return (
                            <SharedMealCard
                                key={slot.id}
                                slot={slot}
                                meal={meal}
                                customFoodsMap={customFoodsMap}
                                isEn={isEn}
                            />
                        );
                    })}
                </div>

                <footer className="text-center text-[10px] text-slate-600 pt-6 space-y-1">
                    <div>TrainEat — {isEn ? 'Nutrition & Training' : 'Nutrición y Entrenamiento'}</div>
                    <div>traineat.app</div>
                </footer>
            </div>
        </div>
    );
}

function SharedMealCard({ slot, meal, customFoodsMap, isEn }) {
    const [selectedDay, setSelectedDay] = useState(meal.selectedOptionIndex || 0);
    const options = meal.options || [];
    const activeOption = options[selectedDay] || options[0];
    const items = activeOption?.items || [];
    const macros = items.length > 0 ? sumMacrosPure(items, customFoodsMap) : null;

    return (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900/50 p-4 flex items-center justify-between border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                    <ChefHat size={18} className="text-blue-400" />
                    <div>
                        <h3 className="font-bold text-slate-200">{slot.label}</h3>
                        <span className="text-xs text-slate-500">{slot.time}</span>
                    </div>
                </div>
                {macros && <span className="text-xs font-mono text-slate-400">{macros.calories} kcal</span>}
            </div>

            {/* Day tabs — show all options */}
            {options.length > 1 && (
                <div className="flex gap-1 px-4 pt-3 overflow-x-auto no-scrollbar">
                    {options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedDay(idx)}
                            className={`text-[11px] px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
                                idx === selectedDay
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            {opt.name}
                        </button>
                    ))}
                </div>
            )}
            {options.length === 1 && (
                <div className="px-4 pt-2">
                    <span className="text-[10px] text-slate-500">{options[0].name}</span>
                </div>
            )}

            {/* Items */}
            <div className="p-4 space-y-2">
                {items.length > 0 ? (
                    items.map((item, i) => {
                        const food = findFood(item.foodId, customFoodsMap);
                        const cat = food ? Object.values(FOOD_CATEGORIES).find((c) => c.id === food?.category) : null;
                        const isCustom = !FOOD_DATABASE.find((f) => f.id === item.foodId);

                        return (
                            <div
                                key={i}
                                className={`flex items-center justify-between text-sm p-2.5 rounded-lg ${isCustom ? 'bg-cyan-950/20 border border-cyan-800/20' : 'bg-slate-900/30'}`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    {food?.imageUrl ? (
                                        <img
                                            src={food.imageUrl}
                                            alt=""
                                            className="w-7 h-7 rounded-full object-cover shrink-0"
                                        />
                                    ) : (
                                        <span className="text-sm shrink-0">{cat?.icon || '🍽️'}</span>
                                    )}
                                    <span className="text-slate-200 truncate">{item.name}</span>
                                </div>
                                <span className="text-xs text-slate-400 font-mono shrink-0 ml-2">
                                    {item.quantity}
                                    {item.unit}
                                </span>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-slate-500 text-sm italic text-center py-3">
                        {isEn ? 'No foods added' : 'Sin alimentos'}
                    </p>
                )}

                {/* Macros summary */}
                {macros && (
                    <div className="flex gap-3 text-[11px] font-mono pt-2 border-t border-slate-700/30 justify-between items-center">
                        <span className="text-slate-400 flex items-center gap-1">
                            <Flame size={11} className="text-orange-500" /> {macros.calories} kcal
                        </span>
                        <div className="flex gap-2">
                            <span className="text-rose-300">P:{macros.protein}g</span>
                            <span className="text-amber-300">C:{macros.carbs}g</span>
                            <span className="text-yellow-300">G:{macros.fat}g</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
