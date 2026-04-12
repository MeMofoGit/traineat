import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { PLAN_DATA, GIF_MAP } from '../data/plan';
import { db, auth } from '../firebase';
import {
    doc,
    onSnapshot,
    setDoc,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDoc,
    writeBatch,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import {
    subscribeCustomFoods,
    createCustomFood as svcCreateCustomFood,
    updateCustomFood as svcUpdateCustomFood,
    deleteCustomFood as svcDeleteCustomFood,
} from '../services/foods';

const PlanContext = createContext();

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** Devuelve el siguiente día de la semana que no esté usado en las opciones existentes. */
function getNextDayName(existingOptions) {
    const usedNames = new Set((existingOptions || []).map((o) => o.name));
    for (const day of DAY_NAMES) {
        if (!usedNames.has(day)) return day;
    }
    return `Variante ${(existingOptions?.length || 0) + 1}`;
}

export function PlanProvider({ children }) {
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false); // true once onAuthStateChanged fires
    const [historyList, setHistoryList] = useState([]); // FROM SUBCOLLECTION
    const [customFoods, setCustomFoods] = useState([]); // FROM SUBCOLLECTION users/{uid}/customFoods

    // PLAN STATE (Active Routine, Diet, Settings - NO HISTORY)
    const [planData, setPlanData] = useState(() => {
        const saved = localStorage.getItem('fitness_plan_data');
        let parsed = saved ? JSON.parse(saved) : PLAN_DATA;

        // Ensure structure (Safe Defaults)
        if (!parsed.phases) parsed.phases = [];
        if (!parsed.routines) parsed.routines = {};
        if (!parsed.history) parsed.history = [];
        if (!parsed.weightLog) {
            const today = new Date().toISOString().split('T')[0];
            parsed.weightLog = [{ date: today, weight: PLAN_DATA.user.start_weight }];
        }

        // Migration: activePhaseId (global)
        if (parsed.activePhaseId == null) {
            parsed.activePhaseId = parsed.phases[0]?.id || PLAN_DATA.activePhaseId || 1;
        }

        // Migration: trainingTime — hora del entreno (leída del schedule si existe)
        if (!parsed.trainingTime) {
            const trainingSlot = parsed.schedule?.default?.find((s) => s.type === 'training');
            parsed.trainingTime = trainingSlot?.time || '13:00';
        }

        // Migration: dailyLog (food diary)
        if (!parsed.dailyLog) parsed.dailyLog = {};

        // Migration: User profile fields used by useMacros / AI context
        parsed.user = {
            ...PLAN_DATA.user,
            ...(parsed.user || {}),
        };

        // Migration: Ensure monthLabels
        if (parsed.phases && PLAN_DATA.phases) {
            parsed.phases = parsed.phases.map((p, i) => ({
                ...p,
                monthLabel: p.monthLabel || PLAN_DATA.phases[i]?.monthLabel || 'Periodo Personalizado',
            }));
        }

        // Migration: Force Update GIF URLs from GIF_MAP
        // This ensures that even if local storage has old data, we point to the new local assets
        if (parsed.routines) {
            Object.keys(parsed.routines).forEach((phaseId) => {
                const phase = parsed.routines[phaseId];
                if (!phase) return;
                Object.keys(phase).forEach((dayId) => {
                    const day = phase[dayId];
                    if (day && day.exercises) {
                        day.exercises = day.exercises.map((ex) => {
                            // Check exact name match in our new GIF Map
                            if (GIF_MAP[ex.name]) {
                                // console.log(`Migrating GIF for ${ex.name}: ${GIF_MAP[ex.name]}`);
                                return { ...ex, gifUrl: GIF_MAP[ex.name] };
                            }
                            return ex;
                        });
                    }
                });
            });
        }

        // Migration: Meal Options (drop legacy `ingredients` text format)
        if (parsed.meals) {
            Object.keys(parsed.meals).forEach((mealId) => {
                const meal = parsed.meals[mealId];
                if (!meal.options) {
                    meal.options = [
                        {
                            id: 1,
                            name: 'Opción 1',
                            items: meal.items || [],
                            note: meal.note || '',
                        },
                    ];
                    meal.selectedOptionIndex = 0;
                }
                // Strip legacy fields from options if present
                meal.options = meal.options.map((opt) => {
                    const { ingredients: _unused, ...rest } = opt;
                    return { ...rest, items: rest.items || [] };
                });

                // Migration: rename "Opción N" / "Opción N (Copia)" to day names
                const hasLegacyNames = meal.options.some((o) => /^Opción \d/.test(o.name));
                if (hasLegacyNames) {
                    meal.options = meal.options.map((opt, idx) => {
                        if (/^Opción \d/.test(opt.name)) {
                            return { ...opt, name: DAY_NAMES[idx] || opt.name };
                        }
                        return opt;
                    });
                }
            });
        }
        return parsed;
    });

    // 1. AUTH & SYNC SETUP
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
            setAuthReady(true);
            if (!currentUser) {
                setUser(null);
                setHistoryList([]);
                setCustomFoods([]);
                return;
            }
            if (currentUser) {
                setUser(currentUser);
                const uid = currentUser.uid;
                console.log('🔑 Current User UID:', uid);

                // A. PLAN LISTENER (users/{uid}/data/plan)
                const planRef = doc(db, 'users', uid, 'data', 'plan');
                const planUnsub = onSnapshot(planRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        // Si hay cambios locales pendientes (dirty flag), subir local a Firestore
                        // en vez de sobreescribir con datos viejos del servidor.
                        const isDirty = localStorage.getItem('fitness_plan_dirty');
                        if (isDirty) {
                            localStorage.removeItem('fitness_plan_dirty');
                            const localData = JSON.parse(localStorage.getItem('fitness_plan_data') || 'null');
                            if (localData) {
                                console.log('🔄 Local dirty — pushing local to Firestore');
                                setDoc(planRef, localData).catch(console.error);
                                return; // no sobreescribir local — el setDoc disparará otro onSnapshot
                            }
                        }
                        console.log('📥 Loaded PLAN from Firestore');
                        setPlanData(docSnap.data());
                    } else {
                        // MIGRATION / INITIAL UPLOAD logic
                        console.log('🚧 No Plan found in new path. Checking legacy/local...');

                        // Check Legacy Path (users/{uid})
                        const legacyRef = doc(db, 'users', uid);
                        const legacySnap = await getDoc(legacyRef);

                        let dataToMigrate = planData; // Default to local
                        let historyToMigrate = [];

                        if (legacySnap.exists()) {
                            console.log('♻️ Found Legacy Data. Migrating...');
                            const legacyData = legacySnap.data();
                            historyToMigrate = legacyData.history || [];
                            delete legacyData.history;
                            dataToMigrate = legacyData;
                        } else {
                            // First time ever? Upload local storage
                            console.log('📤 Uploading Local Data...');
                            historyToMigrate =
                                JSON.parse(localStorage.getItem('fitness_plan_data') || '{}').history || [];
                        }

                        // 1. Save Plan to new location
                        await setDoc(planRef, dataToMigrate);

                        // 2. Migrate History to Subcollection (Batch)
                        if (historyToMigrate.length > 0) {
                            console.log(`📚 Migrating ${historyToMigrate.length} history items...`);
                            const batch = writeBatch(db);
                            const historyCollection = collection(db, 'users', uid, 'history');

                            historyToMigrate.forEach((session) => {
                                // Create a new doc reference for each session
                                const newHistRef = doc(historyCollection, session.id.toString());
                                batch.set(newHistRef, session);
                            });
                            await batch.commit();
                            console.log('✅ Migration Complete');
                        }
                    }
                });

                // B. HISTORY LISTENER (users/{uid}/history)
                const historyQuery = query(collection(db, 'users', uid, 'history'), orderBy('date', 'desc'), limit(50));

                const historyUnsub = onSnapshot(historyQuery, (snapshot) => {
                    const loadedHistory = snapshot.docs.map((doc) => doc.data());
                    setHistoryList(loadedHistory);
                    console.log(`📜 Loaded ${loadedHistory.length} history items`);
                });

                // C. CUSTOM FOODS LISTENER (users/{uid}/customFoods)
                const customFoodsUnsub = subscribeCustomFoods(
                    uid,
                    (foods) => {
                        setCustomFoods(foods);
                        console.log(`🥫 Loaded ${foods.length} custom foods`);
                    },
                    (err) => console.error('customFoods subscription error', err)
                );

                return () => {
                    planUnsub();
                    historyUnsub();
                    customFoodsUnsub();
                };
            }
        });

        return () => unsubAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount — planData is read for migration, not reactive

    // 2. PERSISTENCE (Local + Cloud)
    // Debounce cloud saves to avoid hitting write limits or spamming
    const timeoutRef = useRef(null);
    const pendingSaveRef = useRef(null); // datos pendientes de flush a Firestore

    useEffect(() => {
        // Always save local (immediate backup)
        localStorage.setItem('fitness_plan_data', JSON.stringify(planData));

        // Save to Cloud (debounced 2s)
        if (user) {
            pendingSaveRef.current = { uid: user.uid, data: planData };
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                console.log('☁️ Syncing PLAN to Firestore...');
                setDoc(doc(db, 'users', user.uid, 'data', 'plan'), planData).catch(console.error);
                pendingSaveRef.current = null;
            }, 800);
        }
    }, [planData, user]);

    // Flush pendiente al cerrar/recargar para no perder cambios
    useEffect(() => {
        const flush = () => {
            if (pendingSaveRef.current) {
                const { uid: u, data } = pendingSaveRef.current;
                // sendBeacon no soporta Firestore, usamos fetch síncrono no es posible.
                // Mejor: guardar flag en localStorage para que al volver detecte divergencia.
                localStorage.setItem('fitness_plan_dirty', 'true');
                // Intento best-effort con el timeout que quede
                setDoc(doc(db, 'users', u, 'data', 'plan'), data).catch(() => {});
            }
        };
        window.addEventListener('beforeunload', flush);
        return () => window.removeEventListener('beforeunload', flush);
    }, []);

    // MEAL ACTIONS
    const updateMealOption = (mealId, optionIndex, newContent) => {
        setPlanData((prev) => {
            const meal = prev.meals[mealId];
            if (!meal) return prev;

            const newOptions = [...meal.options];
            newOptions[optionIndex] = { ...newOptions[optionIndex], ...newContent };

            return {
                ...prev,
                meals: { ...prev.meals, [mealId]: { ...meal, options: newOptions } },
            };
        });
    };

    const addMealOption = (mealId, baseOptionIndex = null) => {
        setPlanData((prev) => {
            const meal = prev.meals[mealId];
            if (meal.options.length >= 7) return prev; // Máx 7 días
            const newId = Math.max(...meal.options.map((o) => o.id), 0) + 1;
            const nextDay = getNextDayName(meal.options);

            let newOption;
            if (baseOptionIndex !== null && meal.options[baseOptionIndex]) {
                // Clone — deep copy items para no compartir referencia
                const base = meal.options[baseOptionIndex];
                newOption = {
                    ...base,
                    id: newId,
                    name: nextDay,
                    items: base.items ? base.items.map((item) => ({ ...item })) : [],
                };
            } else {
                // Empty
                newOption = {
                    id: newId,
                    name: nextDay,
                    items: [],
                    note: '',
                };
            }

            // Ordenar por día de la semana
            const allOptions = [...meal.options, newOption];
            allOptions.sort((a, b) => {
                const ia = DAY_NAMES.indexOf(a.name);
                const ib = DAY_NAMES.indexOf(b.name);
                return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
            });
            const newIndex = allOptions.findIndex((o) => o.id === newId);

            return {
                ...prev,
                meals: {
                    ...prev.meals,
                    [mealId]: {
                        ...meal,
                        options: allOptions,
                        selectedOptionIndex: newIndex >= 0 ? newIndex : allOptions.length - 1, // Auto-select new
                    },
                },
            };
        });
    };

    const deleteMealOption = (mealId, index) => {
        setPlanData((prev) => {
            const meal = prev.meals[mealId];
            if (meal.options.length <= 1) return prev; // Don't delete last one

            const newOptions = meal.options.filter((_, i) => i !== index);
            const newIndex =
                index === meal.selectedOptionIndex
                    ? 0
                    : index < meal.selectedOptionIndex
                      ? meal.selectedOptionIndex - 1
                      : meal.selectedOptionIndex;

            return {
                ...prev,
                meals: {
                    ...prev.meals,
                    [mealId]: { ...meal, options: newOptions, selectedOptionIndex: newIndex },
                },
            };
        });
    };

    const setSelectedOption = (mealId, index) => {
        setPlanData((prev) => ({
            ...prev,
            meals: {
                ...prev.meals,
                [mealId]: { ...prev.meals[mealId], selectedOptionIndex: index },
            },
        }));
    };

    // === SCHEDULE MANAGEMENT ===

    const MEAL_LABELS = ['Desayuno', 'Snack Mañana', 'Comida', 'Merienda', 'Cena', 'Snack Noche'];

    const addMealSlot = (label, time) => {
        setPlanData((prev) => {
            const id = 'meal_' + Date.now();
            const newSlot = { time: time || '12:00', type: 'meal', id, label: label || 'Comida' };
            const newSchedule = [...(prev.schedule?.default || []), newSlot].sort((a, b) =>
                a.time.localeCompare(b.time)
            );
            const newMeals = {
                ...prev.meals,
                [id]: {
                    goal: '',
                    macros: '',
                    selectedOptionIndex: 0,
                    options: [{ id: 1, name: DAY_NAMES[0], items: [], note: '' }],
                },
            };
            return { ...prev, schedule: { ...prev.schedule, default: newSchedule }, meals: newMeals };
        });
    };

    const removeMealSlot = (slotId) => {
        setPlanData((prev) => {
            const newSchedule = (prev.schedule?.default || []).filter((s) => s.id !== slotId);
            const { [slotId]: _removed, ...newMeals } = prev.meals;
            return { ...prev, schedule: { ...prev.schedule, default: newSchedule }, meals: newMeals };
        });
    };

    const updateMealSlot = (slotId, updates) => {
        setPlanData((prev) => {
            let newSchedule = (prev.schedule?.default || []).map((s) => (s.id === slotId ? { ...s, ...updates } : s));
            if (updates.time) {
                newSchedule = newSchedule.sort((a, b) => a.time.localeCompare(b.time));
            }
            return { ...prev, schedule: { ...prev.schedule, default: newSchedule } };
        });
    };

    // === FOOD DIARY ===

    const getTodayKey = () => new Date().toISOString().split('T')[0];

    const confirmMeal = (mealId) => {
        const today = getTodayKey();
        setPlanData((prev) => ({
            ...prev,
            dailyLog: {
                ...prev.dailyLog,
                [today]: {
                    ...(prev.dailyLog?.[today] || {}),
                    [mealId]: { status: 'confirmed', timestamp: Date.now() },
                },
            },
        }));
    };

    const logActualMeal = (mealId, items) => {
        const today = getTodayKey();
        setPlanData((prev) => ({
            ...prev,
            dailyLog: {
                ...prev.dailyLog,
                [today]: {
                    ...(prev.dailyLog?.[today] || {}),
                    [mealId]: { status: 'modified', items, timestamp: Date.now() },
                },
            },
        }));
    };

    const clearMealLog = (mealId) => {
        const today = getTodayKey();
        setPlanData((prev) => {
            const dayLog = { ...(prev.dailyLog?.[today] || {}) };
            delete dayLog[mealId];
            return {
                ...prev,
                dailyLog: { ...prev.dailyLog, [today]: dayLog },
            };
        });
    };

    const getMealLog = (mealId, date) => {
        const key = date || getTodayKey();
        return planData.dailyLog?.[key]?.[mealId] || null;
    };

    const updateUser = (newFields) => {
        setPlanData((prev) => ({
            ...prev,
            user: { ...prev.user, ...newFields },
        }));
    };

    const updateTrainingTime = (time) => {
        setPlanData((prev) => ({ ...prev, trainingTime: time }));
    };

    const setActivePhaseId = (phaseId) => {
        setPlanData((prev) => ({ ...prev, activePhaseId: phaseId }));
    };

    const logWeight = (weight) => {
        const today = new Date().toISOString().split('T')[0];
        const numWeight = parseFloat(weight);
        if (isNaN(numWeight)) return;

        setPlanData((prev) => {
            const newLog = [...prev.weightLog];
            const existingIndex = newLog.findIndex((entry) => entry.date === today);

            if (existingIndex >= 0) {
                newLog[existingIndex].weight = numWeight;
            } else {
                newLog.push({ date: today, weight: numWeight });
            }

            // Sort by date
            newLog.sort((a, b) => new Date(a.date) - new Date(b.date));

            return { ...prev, weightLog: newLog };
        });
    };

    const updateExercise = (phaseId, dayId, exerciseIndex, newFields) => {
        setPlanData((prev) => {
            const newRoutines = { ...prev.routines };
            if (!newRoutines[phaseId]) newRoutines[phaseId] = {};
            if (!newRoutines[phaseId][dayId]) newRoutines[phaseId][dayId] = { exercises: [] };

            // DEEP COPY PHASE
            newRoutines[phaseId] = { ...newRoutines[phaseId] };

            const currentDay = newRoutines[phaseId][dayId];
            const newExercises = [...(currentDay.exercises || [])];

            if (newExercises[exerciseIndex]) {
                newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], ...newFields };
            }

            newRoutines[phaseId][dayId] = { ...currentDay, exercises: newExercises };
            return { ...prev, routines: newRoutines };
        });
    };

    // --- PHASE MANAGEMENT ---
    const updatePhase = (phaseId, newFields) => {
        setPlanData((prev) => ({
            ...prev,
            phases: prev.phases.map((p) => (p.id === phaseId ? { ...p, ...newFields } : p)),
        }));
    };

    const addPhase = () => {
        setPlanData((prev) => {
            const newId = (Math.max(...prev.phases.map((p) => p.id), 0) || 0) + 1;
            const newPhase = {
                id: newId,
                name: 'Nueva Fase',
                monthLabel: 'Nuevo Periodo',
                dates: { start: '', end: '' },
            };
            const newRoutines = { ...prev.routines, [newId]: {} };
            return {
                ...prev,
                phases: [...prev.phases, newPhase],
                routines: newRoutines,
            };
        });
    };

    const deletePhase = (id) => {
        setPlanData((prev) => {
            const newPhases = prev.phases.filter((p) => p.id !== id);
            const newRoutines = { ...prev.routines };
            delete newRoutines[id];
            return { ...prev, phases: newPhases, routines: newRoutines };
        });
    };

    // --- DAY & EXERCISE MANAGEMENT ---
    const updateDayRoutine = (phaseId, dayId, newFields) => {
        setPlanData((prev) => {
            const newRoutines = { ...prev.routines };
            if (!newRoutines[phaseId]) newRoutines[phaseId] = {};

            // DEEP COPY PHASE
            newRoutines[phaseId] = { ...newRoutines[phaseId] };

            newRoutines[phaseId][dayId] = {
                ...(newRoutines[phaseId][dayId] || { exercises: [] }),
                ...newFields,
            };
            return { ...prev, routines: newRoutines };
        });
    };

    const addExercise = (phaseId, dayId, exerciseData = null) => {
        const newEx = exerciseData || { name: 'Nuevo Ejercicio', sets: 3, reps: '10', rest: '60s' };
        setPlanData((prev) => {
            const newRoutines = { ...prev.routines };
            if (!newRoutines[phaseId]) newRoutines[phaseId] = {};

            // DEEP COPY PHASE to prevent mutation of shared reference
            newRoutines[phaseId] = { ...newRoutines[phaseId] };

            const currentDay = newRoutines[phaseId][dayId] || { exercises: [] };
            newRoutines[phaseId][dayId] = {
                ...currentDay,
                exercises: [...(currentDay.exercises || []), newEx],
            };
            return { ...prev, routines: newRoutines };
        });
    };

    const deleteExercise = (phaseId, dayId, index) => {
        setPlanData((prev) => {
            const newRoutines = { ...prev.routines };
            if (!newRoutines[phaseId]?.[dayId]) return prev;

            // DEEP COPY PHASE
            newRoutines[phaseId] = { ...newRoutines[phaseId] };

            const currentDay = newRoutines[phaseId][dayId];
            newRoutines[phaseId][dayId] = {
                ...currentDay,
                exercises: currentDay.exercises.filter((_, i) => i !== index),
            };
            return { ...prev, routines: newRoutines };
        });
    };

    const reorderExercises = (phaseId, dayId, fromIndex, toIndex) => {
        if (fromIndex === toIndex) return;

        setPlanData((prev) => {
            // Deep copy structure up to the exercises array
            const newRoutines = { ...prev.routines };
            if (!newRoutines[phaseId]) return prev;
            if (!newRoutines[phaseId][dayId]) return prev;

            const currentDay = { ...newRoutines[phaseId][dayId] };
            if (!currentDay.exercises) return prev;

            const exercises = [...currentDay.exercises];

            // Validate indices
            if (fromIndex < 0 || fromIndex >= exercises.length || toIndex < 0 || toIndex >= exercises.length) {
                return prev;
            }

            // Move
            const [movedItem] = exercises.splice(fromIndex, 1);
            exercises.splice(toIndex, 0, movedItem);

            // Update deeply
            newRoutines[phaseId] = { ...newRoutines[phaseId] }; // Copy phase
            newRoutines[phaseId][dayId] = { ...currentDay, exercises };

            // BUG-1 FIX: si hay sesión activa en este día/fase, remapear
            // completedSets para que las marcas sigan al ejercicio que se movió.
            // Las claves son "exerciseIndex-setIndex" — al reordenar, los
            // indices cambian y las marcas deben reflejar los nuevos.
            let newSession = prev.activeSession;
            if (newSession && newSession.phaseId === phaseId && newSession.dayId === dayId) {
                const oldCompleted = newSession.completedSets || {};
                const remapped = {};

                // Construir mapa de "old index → new index"
                // Después del splice: el ejercicio que estaba en fromIndex
                // ahora está en toIndex. Los demás se desplazan.
                const indexMap = {};
                const len = exercises.length;
                for (let i = 0; i < len; i++) {
                    // ¿Qué índice tenía este ejercicio ANTES del move?
                    let oldIdx;
                    if (i === toIndex) {
                        oldIdx = fromIndex;
                    } else if (fromIndex < toIndex) {
                        // Movido hacia abajo: los de [from+1..to] bajan 1
                        oldIdx = i > fromIndex && i <= toIndex ? i : i === toIndex ? fromIndex : i;
                        // Simplificación: recalcular
                        if (i >= fromIndex && i < toIndex) oldIdx = i + 1;
                        else if (i === toIndex) oldIdx = fromIndex;
                        else oldIdx = i;
                    } else {
                        // Movido hacia arriba: los de [to..from-1] suben 1
                        if (i > toIndex && i <= fromIndex) oldIdx = i - 1;
                        else if (i === toIndex) oldIdx = fromIndex;
                        else oldIdx = i;
                    }
                    indexMap[oldIdx] = i;
                }

                for (const [key, value] of Object.entries(oldCompleted)) {
                    const parts = key.split('-');
                    const exIdx = parseInt(parts[0], 10);
                    const setIdx = parts[1];
                    const newExIdx = indexMap[exIdx] ?? exIdx;
                    remapped[`${newExIdx}-${setIdx}`] = value;
                }

                // También remapear lastSetContext.exerciseIndex si aplica
                let newLastSetContext = newSession.lastSetContext;
                if (newLastSetContext && typeof newLastSetContext.exerciseIndex === 'number') {
                    const mappedIdx = indexMap[newLastSetContext.exerciseIndex];
                    if (mappedIdx !== undefined && mappedIdx !== newLastSetContext.exerciseIndex) {
                        newLastSetContext = { ...newLastSetContext, exerciseIndex: mappedIdx };
                    }
                }

                newSession = {
                    ...newSession,
                    completedSets: remapped,
                    lastSetContext: newLastSetContext,
                };
            }

            return { ...prev, routines: newRoutines, activeSession: newSession };
        });
    };

    const moveExerciseToDay = (phaseId, fromDayId, exerciseIndex, toDayId) => {
        setPlanData((prev) => {
            const newRoutines = { ...prev.routines };
            if (!newRoutines[phaseId]?.[fromDayId]) return prev;

            // 1. Remove from Source
            const sourceDay = newRoutines[phaseId][fromDayId];
            const exerciseToMove = sourceDay.exercises[exerciseIndex];
            const newSourceExercises = sourceDay.exercises.filter((_, i) => i !== exerciseIndex);

            newRoutines[phaseId][fromDayId] = { ...sourceDay, exercises: newSourceExercises };

            // 2. Add to Target
            if (!newRoutines[phaseId][toDayId]) newRoutines[phaseId][toDayId] = { exercises: [] };
            const targetDay = newRoutines[phaseId][toDayId];
            const newTargetExercises = [...(targetDay.exercises || []), exerciseToMove];

            newRoutines[phaseId][toDayId] = { ...targetDay, exercises: newTargetExercises };

            return { ...prev, routines: newRoutines };
        });
    };

    // --- WORKOUT SESSION MANAGEMENT ---
    const startSession = (phaseId, dayId) => {
        setPlanData((prev) => ({
            ...prev,
            activeSession: {
                phaseId,
                dayId,
                startTime: Date.now(),
                pauses: [], // Array of { start, end }
                completedSets: {}, // Key: "exIndex-setIndex" -> true
                lastSetContext: null, // { exIndex, setIndex, timestamp } for Rest Timer
            },
        }));
    };

    const toggleSessionPause = () => {
        setPlanData((prev) => {
            if (!prev.activeSession) return prev;

            const session = { ...prev.activeSession };

            // Ensure pauses array exists (migration for active sessions)
            if (!session.pauses) session.pauses = [];

            const now = Date.now();

            // If currently paused (last pause has no end), resume it
            const lastPause = session.pauses[session.pauses.length - 1];
            const isPaused = lastPause && !lastPause.end;

            if (isPaused) {
                // Resume: Close the pause gap
                const newPauses = [...session.pauses];
                newPauses[newPauses.length - 1] = { ...lastPause, end: now };
                return { ...prev, activeSession: { ...session, pauses: newPauses } };
            } else {
                // Pause: Start new pause gap
                return {
                    ...prev,
                    activeSession: { ...session, pauses: [...session.pauses, { start: now, end: null }] },
                };
            }
        });
    };

    const finishSession = () => {
        if (!planData.activeSession) return;

        const session = planData.activeSession;
        const now = Date.now();

        // Close any open pause
        let pauses = session.pauses || [];
        const lastPause = pauses[pauses.length - 1];
        if (lastPause && !lastPause.end) {
            pauses = [...pauses];
            pauses[pauses.length - 1] = { ...lastPause, end: now };
        }

        // Calculate total paused time
        const totalPaused = pauses.reduce((acc, p) => acc + ((p.end || now) - p.start), 0);
        const durationSeconds = Math.round((now - session.startTime - totalPaused) / 1000);

        const log = {
            id: Date.now(),
            date: new Date().toISOString(),
            phaseId: session.phaseId,
            dayId: session.dayId,
            durationSeconds,
            startTime: session.startTime,
            endTime: now,
            pauses: session.pauses || [],
            completedSets: session.completedSets, // Kept for UI Compatibility
            // Convert map to array of logs
            setLogs: Object.entries(session.completedSets).map(([key, value]) => {
                const [exIdx, setIdx] = key.split('-');
                return {
                    exerciseIndex: parseInt(exIdx),
                    setIndex: parseInt(setIdx),
                    timestamp: value.timestamp, // The new timestamp
                };
            }),
        };

        // 1. OPTIMISTIC UI UPDATE: Clear session immediately
        setPlanData((prev) => ({
            ...prev,
            activeSession: null,
        }));

        // 2. BACKGROUND SYNC
        if (user) {
            console.log('📤 Background Uploading Session...', log);
            // Fire and forget (Firestore handles offline queue)
            addDoc(collection(db, 'users', user.uid, 'history'), log)
                .then(() => console.log('✅ Session Synced to Cloud'))
                .catch((err) => console.error('⚠️ Sync Warning (Offline?):', err));
        } else {
            // If strictly local (no user), we might want to push to a local history array if we were supporting that.
            // But current architecture relies on historyList from Firestore listener.
            // Ideally, we'd update historyList locally too for true offline feel if auth is missing,
            // but given the requirement is about "not hanging", the optimistic clear above solves it.
            console.warn('❌ No User for Cloud History');
        }
    };

    // Cancel without saving
    const cancelSession = () => {
        setPlanData((prev) => ({ ...prev, activeSession: null }));
    };

    const toggleSetCompletion = (exerciseIndex, setIndex) => {
        setPlanData((prev) => {
            if (!prev.activeSession) return prev;

            const key = `${exerciseIndex}-${setIndex}`;
            const newCompleted = { ...prev.activeSession.completedSets };
            let lastSetContext = prev.activeSession.lastSetContext;

            if (newCompleted[key]) {
                delete newCompleted[key];
                // If we uncheck, we might want to clear the timer context if it was this one?
                // For now leaving as is to avoid complex undo logic.
            } else {
                // Store Timestamp!
                newCompleted[key] = { timestamp: Date.now() };

                // Trigger Rest Timer
                lastSetContext = {
                    exerciseIndex,
                    setIndex,
                    timestamp: Date.now(),
                };
            }

            return {
                ...prev,
                activeSession: {
                    ...prev.activeSession,
                    completedSets: newCompleted,
                    lastSetContext,
                },
            };
        });
    };

    // --- CUSTOM FOODS ACTIONS ---
    // Wrappers finos sobre src/services/foods.js. La suscripción onSnapshot
    // mantiene `customFoods` sincronizado solo, no necesitamos updates locales.
    const addCustomFood = async (food) => {
        if (!user) throw new Error('No hay usuario autenticado');
        return svcCreateCustomFood(user.uid, food);
    };

    const editCustomFood = async (foodId, patch) => {
        if (!user) throw new Error('No hay usuario autenticado');
        return svcUpdateCustomFood(user.uid, foodId, patch);
    };

    const removeCustomFood = async (foodId) => {
        if (!user) throw new Error('No hay usuario autenticado');
        return svcDeleteCustomFood(user.uid, foodId);
    };

    // Registrar sesión saltada/hecha fuera — crea entrada en historial con métricas vacías
    // para que el día aparezca como "hecho" visualmente sin contaminar estadísticas.
    const logSkippedSession = (phaseId, dayId, reason) => {
        const log = {
            id: Date.now(),
            date: new Date().toISOString(),
            phaseId,
            dayId,
            durationSeconds: 0,
            startTime: Date.now(),
            endTime: Date.now(),
            pauses: [],
            completedSets: {},
            setLogs: [],
            [reason]: true, // 'skipped' o 'doneElsewhere'
        };

        if (user) {
            addDoc(collection(db, 'users', user.uid, 'history'), log)
                .then(() => console.log(`✅ Session marked as ${reason}`))
                .catch(console.error);
        }
    };

    return (
        <PlanContext.Provider
            value={{
                plan: { ...planData, history: historyList }, // MERGE history back in for consumers
                authUser: user,
                authReady,
                signOut: () => firebaseSignOut(auth),
                customFoods,
                addCustomFood,
                editCustomFood,
                removeCustomFood,
                logSkippedSession,
                updateMealOption,
                addMealOption,
                deleteMealOption,
                setSelectedOption,
                addMealSlot,
                removeMealSlot,
                updateMealSlot,
                mealLabels: MEAL_LABELS,
                confirmMeal,
                logActualMeal,
                clearMealLog,
                getMealLog,
                updateUser,
                updateTrainingTime,
                setActivePhaseId,
                logWeight,
                updateExercise,
                updatePhase,
                addPhase,
                deletePhase,
                updateDayRoutine,
                addExercise,
                deleteExercise,
                reorderExercises,
                moveExerciseToDay,
                startSession,
                finishSession,
                cancelSession,
                toggleSessionPause,
                toggleSetCompletion,
            }}
        >
            {children}
        </PlanContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlan() {
    return useContext(PlanContext);
}
