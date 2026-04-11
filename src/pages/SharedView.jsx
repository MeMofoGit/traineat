import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { FOOD_DATABASE, FOOD_CATEGORIES } from '../data/food_database';
import { Loader2, Dumbbell, AlertTriangle, ChefHat, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sumMacrosPure, findFood } from '../hooks/useMacros';

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
            // Buscar el token en todas las colecciones de usuarios
            // Para MVP: el token contiene el uid en el documento
            // Primero necesitamos encontrar el token — buscamos por collectionGroup
            // Pero collectionGroup requiere un índice. Alternativa: el tokenId codifica el uid.
            // Enfoque simple: almacenamos uid en el token doc, y el shared link
            // incluye uid+tokenId: /shared/{uid}/{tokenId}
            // Pero eso expone el uid. Mejor: colección top-level _shareTokens/{tokenId}

            // Por ahora: intentamos leer de una colección top-level
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

            // Cargar plan del usuario
            const planDoc = await getDoc(doc(db, 'users', token.uid, 'data', 'plan'));
            if (!planDoc.exists()) {
                setError(isEn ? 'No plan data found' : 'No se encontraron datos del plan');
                return;
            }
            setPlan(planDoc.data());

            // Cargar custom foods
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

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="max-w-md mx-auto p-6 space-y-6 pb-12">
                {/* Header */}
                <header className="text-center space-y-2">
                    <Dumbbell size={32} className="text-blue-500 mx-auto" />
                    <h1 className="text-xl font-bold text-white">
                        {isEn
                            ? `${user.name || 'User'}'s Nutrition Plan`
                            : `Plan nutricional de ${user.name || 'Usuario'}`}
                    </h1>
                    <p className="text-xs text-slate-500">
                        TrainEat · {isEn ? 'Shared view' : 'Vista compartida'}
                        {tokenInfo?.permissions === 'read' && (isEn ? ' (read only)' : ' (solo lectura)')}
                    </p>
                </header>

                {/* User info */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-sm text-slate-300">
                    <div className="grid grid-cols-2 gap-2">
                        {user.height && (
                            <div>
                                {isEn ? 'Height' : 'Altura'}: {user.height}cm
                            </div>
                        )}
                        {user.activity && (
                            <div>
                                {isEn ? 'Activity' : 'Actividad'}: {user.activity}
                            </div>
                        )}
                        {user.goalType && (
                            <div>
                                {isEn ? 'Goal' : 'Objetivo'}: {user.goalType}
                            </div>
                        )}
                    </div>
                </div>

                {/* Meals */}
                {mealSlots.map((slot) => {
                    const meal = plan?.meals?.[slot.id];
                    if (!meal) return null;
                    const activeIdx = meal.selectedOptionIndex || 0;
                    const option = meal.options?.[activeIdx];
                    const items = option?.items || [];
                    const macros = items.length > 0 ? sumMacrosPure(items, customFoodsMap) : null;

                    return (
                        <div
                            key={slot.id}
                            className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden"
                        >
                            <div className="bg-slate-900/50 p-4 flex items-center gap-3 border-b border-slate-700/50">
                                <ChefHat size={18} className="text-blue-400" />
                                <div>
                                    <h3 className="font-bold text-slate-200">{slot.label}</h3>
                                    <span className="text-xs text-slate-500">{slot.time}</span>
                                </div>
                            </div>
                            <div className="p-4 space-y-2">
                                {items.length > 0 ? (
                                    items.map((item, i) => {
                                        const food = findFood(item.foodId, customFoodsMap);
                                        const cat = food
                                            ? Object.values(FOOD_CATEGORIES).find((c) => c.id === food?.category)
                                            : null;
                                        return (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between text-sm p-2 rounded-lg bg-slate-900/30"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{cat?.icon || '🍽️'}</span>
                                                    <span className="text-slate-200">{item.name}</span>
                                                </div>
                                                <span className="text-xs text-slate-400 font-mono">
                                                    {item.quantity}
                                                    {item.unit}
                                                </span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-slate-500 text-sm italic text-center py-3">
                                        {isEn ? 'No foods' : 'Sin alimentos'}
                                    </p>
                                )}
                                {macros && (
                                    <div className="flex gap-3 text-xs font-mono pt-2 border-t border-slate-700/30 justify-between">
                                        <span className="text-slate-400">
                                            <Flame size={12} className="inline text-orange-500" /> {macros.calories}{' '}
                                            kcal
                                        </span>
                                        <span className="text-rose-300">P:{macros.protein}g</span>
                                        <span className="text-amber-300">C:{macros.carbs}g</span>
                                        <span className="text-yellow-300">G:{macros.fat}g</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                <footer className="text-center text-[10px] text-slate-600 pt-4">TrainEat · traineat.app</footer>
            </div>
        </div>
    );
}
