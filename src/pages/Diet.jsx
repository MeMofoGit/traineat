import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePlan } from '../hooks/usePlan';
import { useMacros } from '../hooks/useMacros';
import { useEntitlements } from '../hooks/useEntitlements';
import {
    ChefHat,
    Flame,
    Edit2,
    Plus,
    Trash2,
    Check,
    X,
    Search,
    PieChart,
    Copy,
    Sparkles,
    Lock,
    Refrigerator,
    Info,
    Wand2,
    ArrowRightLeft,
    Clock,
    CheckCircle2,
    Undo2,
    UtensilsCrossed,
    AlertTriangle,
    Share2,
} from 'lucide-react';
import { FOOD_DATABASE, FOOD_CATEGORIES } from '../data/food_database';
import CustomFoodModal from '../components/CustomFoodModal';
import { suggestSubstitutions } from '../utils/dietSuggester';
import { balanceMeal, balanceWeek } from '../utils/mealBalancer';
import { assignMealRoles, TIMING_ROLES, distributeMacros } from '../utils/nutrientTiming';
import { useToast } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import { createShareToken, listShareTokens } from '../services/shareTokens';
import { db } from '../firebase';
import { doc as fDoc, getDoc as fGetDoc } from 'firebase/firestore';

function StructuredMealEditor({
    initialItems,
    onSave,
    onCancel,
    startAdding = false,
    mealTarget,
    hideSuggestions = false,
}) {
    const { customFoods } = usePlan();
    const { calculateItemMacros } = useMacros();
    const entitlements = useEntitlements();
    const canCreateCustom = entitlements.customFoods;
    const editorRef = React.useRef(null);

    // If no structured items, try to parse or start empty
    const [items, setItems] = useState(initialItems || []);
    const [isAdding, setIsAdding] = useState(startAdding);

    // New Item State
    const [selectedCat, setSelectedCat] = useState('protein');
    const [selectedFoodId, setSelectedFoodId] = useState('');
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState('g');

    // CustomFood modal
    const [fridgeModalOpen, setFridgeModalOpen] = useState(false);

    // Sugerencias (Fase 5a)
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionMode, setSuggestionMode] = useState(null); // 'substitute' | 'optimize'
    const [suggestions, setSuggestions] = useState(null);

    // Disponibles = predefinidos + custom foods del usuario, filtrados por categoría.
    // Custom foods van marcados con `source === 'custom'` para diferenciarlos en el select.
    const availableFoods = useMemo(() => {
        const predef = FOOD_DATABASE.filter((f) => f.category === selectedCat);
        const custom = (customFoods || []).filter((f) => f.category === selectedCat);
        return [...custom, ...predef]; // custom arriba para visibilidad
    }, [selectedCat, customFoods]);

    const handleAddItem = () => {
        if (!selectedFoodId || !qty) return;
        const food =
            availableFoods.find((f) => f.id === selectedFoodId) || FOOD_DATABASE.find((f) => f.id === selectedFoodId);

        setItems([
            ...items,
            {
                foodId: selectedFoodId,
                name: food ? food.name : 'Desconocido',
                category: selectedCat,
                quantity: qty,
                unit: unit,
            },
        ]);

        // Reset fields but keep category for speed
        setSelectedFoodId('');
        setQty('');
        // setUnit('g'); // Keep unit for speed
        setIsAdding(false);
    };

    // Cuando el usuario crea un producto desde el modal: pre-seleccionarlo
    // y rellenar unidad por defecto del producto.
    const handleCustomFoodCreated = (food) => {
        if (!food) return;
        setSelectedCat(food.category);
        setSelectedFoodId(food.id);
        setUnit(food.defaultUnit || 'g');
        // Pre-rellenar qty con servingSize si está vacío, para acelerar
        if (!qty) setQty(String(food.servingSize ?? (food.defaultUnit === 'g' || food.defaultUnit === 'ml' ? 100 : 1)));
    };

    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const toast = useToast();
    const { t } = useTranslation();

    const handleSuggestSubstitutions = () => {
        if (mealTarget) {
            // Nuevo: LP balancer con targets de macros
            const result = balanceMeal(items, customFoods || [], mealTarget);
            if (result.substitutions.length === 0 && result.status === 'optimal') {
                toast.info('Tu comida ya está equilibrada. No se necesitan cambios.');
                return;
            }
            if (result.substitutions.length === 0) {
                // Fallback al algoritmo simple
                const subs = suggestSubstitutions(items, customFoods || []);
                if (subs.length === 0) {
                    toast.info('No hay sustituciones disponibles. Añade más productos a Mi Nevera.');
                    return;
                }
                setSuggestions({ type: 'substitutions', data: subs });
                setSuggestionMode('substitute');
                setShowSuggestions(true);
                return;
            }
            // Aplicar directamente el resultado del LP y mostrar resumen
            setItems(result.items);
            const names = result.substitutions.map((s) => `${s.originalName} → ${s.newName}`).join(', ');
            toast.success(`Balanceado: ${names}`);
            return;
        }
        // Sin target: fallback al algoritmo simple
        const subs = suggestSubstitutions(items, customFoods || []);
        if (subs.length === 0) {
            toast.info('No hay sustituciones disponibles. Añade más productos a Mi Nevera.');
            return;
        }
        setSuggestions({ type: 'substitutions', data: subs });
        setSuggestionMode('substitute');
        setShowSuggestions(true);
    };

    const commitSave = () => {
        onSave(items);
    };

    return (
        <div className="space-y-4" ref={editorRef}>
            <div className="space-y-2">
                {items.map((item, i) => {
                    const catInfo =
                        Object.values(FOOD_CATEGORIES).find((c) => c.id === item.category) || FOOD_CATEGORIES.OTHER;
                    const itemMacros = calculateItemMacros(item);
                    return (
                        <FoodItemRow
                            key={i}
                            item={item}
                            catInfo={catInfo}
                            macros={itemMacros}
                            onRemove={() => handleRemoveItem(i)}
                        />
                    );
                })}
            </div>

            {isAdding ? (
                <div className="bg-slate-900 border border-blue-500/30 p-3 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    {/* Category Selector */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {Object.values(FOOD_CATEGORIES).map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    setSelectedCat(cat.id);
                                    setSelectedFoodId('');
                                }}
                                className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${
                                    selectedCat === cat.id
                                        ? `${cat.bg} ${cat.color} ${cat.border}`
                                        : 'bg-slate-800 border-slate-700 text-slate-500'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Food Selector + botón crear desde Mi Nevera */}
                    <div className="flex gap-2">
                        <select
                            className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                            value={selectedFoodId}
                            onChange={(e) => {
                                setSelectedFoodId(e.target.value);
                                const f = availableFoods.find((x) => x.id === e.target.value);
                                if (f) setUnit(f.defaultUnit);
                            }}
                        >
                            <option value="">-- Selecciona Alimento --</option>
                            {availableFoods.some((f) => f.source === 'custom') && (
                                <optgroup label="🧊 Mi Nevera">
                                    {availableFoods
                                        .filter((f) => f.source === 'custom')
                                        .map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.name}
                                            </option>
                                        ))}
                                </optgroup>
                            )}
                            <optgroup label="Base de datos">
                                {availableFoods
                                    .filter((f) => f.source !== 'custom')
                                    .map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.name}
                                        </option>
                                    ))}
                            </optgroup>
                        </select>
                        {canCreateCustom ? (
                            <button
                                type="button"
                                onClick={() => setFridgeModalOpen(true)}
                                className="shrink-0 px-3 bg-cyan-900/30 border border-cyan-800 text-cyan-400 hover:bg-cyan-900/50 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                title="Crear nuevo producto en Mi Nevera"
                            >
                                <Sparkles size={12} />
                                Nuevo
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled
                                className="shrink-0 px-3 bg-slate-800 border border-slate-700 text-slate-500 rounded-lg text-xs font-bold flex items-center gap-1 cursor-not-allowed"
                                title="Función Premium"
                            >
                                <Lock size={12} />
                                Premium
                            </button>
                        )}
                    </div>

                    {/* Qty & Unit */}
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Cant."
                            inputMode="decimal"
                            className={`flex-1 bg-slate-800 border rounded-lg p-2 text-sm text-white outline-none transition-colors ${
                                !qty && selectedFoodId
                                    ? 'border-rose-500/60 focus:border-rose-500'
                                    : 'border-slate-700 focus:border-blue-500'
                            }`}
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                        />
                        <select
                            className="w-20 bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                        >
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="pz">pz</option>
                            <option value="taza">taza</option>
                            <option value="cda">cda</option>
                        </select>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="flex-1 py-2 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAddItem}
                            disabled={!selectedFoodId || !qty}
                            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Añadir
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <button
                        onClick={() => setIsAdding(true)}
                        className="w-full py-2 border border-dashed border-slate-700 text-slate-500 hover:border-blue-500 hover:text-blue-500 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={14} /> Añadir Alimento
                    </button>

                    {/* Botón "Rellenar con Mi Nevera" (Fase 5a) — solo si hay items y no estamos en modo diary */}
                    {!hideSuggestions &&
                        items.length > 0 &&
                        entitlements.smartSuggest &&
                        (customFoods || []).length > 0 && (
                            <button
                                onClick={handleSuggestSubstitutions}
                                className="w-full py-2 bg-cyan-900/20 border border-cyan-800/50 text-cyan-300 hover:bg-cyan-900/40 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
                            >
                                <Refrigerator size={13} /> {t('diet.fillFridge')}
                            </button>
                        )}
                </div>
            )}

            {/* Panel de sugerencias */}
            {showSuggestions && suggestions && (
                <SuggestionPanel
                    mode={suggestionMode}
                    suggestions={suggestions}
                    items={items}
                    onApply={(newItems) => {
                        setItems(newItems);
                        setShowSuggestions(false);
                        setSuggestions(null);
                    }}
                    onClose={() => {
                        setShowSuggestions(false);
                        setSuggestions(null);
                    }}
                />
            )}

            <div className="flex gap-2 pt-4 border-t border-slate-700/50">
                <button
                    onClick={onCancel}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-colors"
                >
                    Cancelar
                </button>
                <button
                    onClick={commitSave}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 transition-colors"
                >
                    {t('common.save')}
                </button>
            </div>

            {/* Modal Mi Nevera (crear producto desde el editor) */}
            <CustomFoodModal
                isOpen={fridgeModalOpen}
                onClose={() => {
                    setFridgeModalOpen(false);
                    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                }}
                mode="create"
                onSaved={(food) => {
                    handleCustomFoodCreated(food);
                    setIsAdding(true);
                }}
            />
        </div>
    );
}

function MealCard({
    slot,
    meal,
    trainingDay,
    timingRole,
    mealTarget,
    onUpdateSlot,
    onRemoveSlot,
    mealLabels,
    nutritionistNote,
}) {
    const { t } = useTranslation();
    const {
        updateMealOption,
        addMealOption,
        deleteMealOption,
        setSelectedOption,
        confirmMeal,
        logActualMeal,
        clearMealLog,
        getMealLog,
    } = usePlan();
    const [isEditing, setIsEditing] = useState(false);
    const [editingActual, setEditingActual] = useState(false);
    const { sumMacros } = useMacros();

    // Food diary: estado de esta comida hoy
    const mealLog = getMealLog(slot.id);
    const isConfirmed = mealLog?.status === 'confirmed';
    const isModified = mealLog?.status === 'modified';

    // Get Active Option
    const activeIndex = meal.selectedOptionIndex || 0;
    const activeOption = meal.options ? meal.options[activeIndex] : { items: [], id: 1, name: 'Opción 1' };

    const [editingSlot, setEditingSlot] = useState(false);
    const [quickAdd, setQuickAdd] = useState(false);

    // Safety check if migration hasn't run yet/render cycle quirk
    if (!activeOption) return null;

    const handleSave = (items) => {
        updateMealOption(slot.id, activeIndex, { items });
        setQuickAdd(false);
        setIsEditing(false);
    };

    const handleNameChange = (newName) => {
        updateMealOption(slot.id, activeIndex, { name: newName });
    };

    // Calculate macros for this meal if structured
    // Si hay log modificado, mostrar macros reales; si no, las del plan
    const effectiveItems = isModified && mealLog?.items ? mealLog.items : activeOption.items;
    const macros = effectiveItems && effectiveItems.length > 0 ? sumMacros(effectiveItems) : null;

    // Warning si excede el target de la comida
    const exceeds =
        macros &&
        mealTarget &&
        (macros.calories > mealTarget.calories * 1.15 ||
            macros.protein > mealTarget.protein * 1.2 ||
            macros.carbs > mealTarget.carbs * 1.2 ||
            macros.fat > mealTarget.fat * 1.3);

    return (
        <article className="bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-blue-500/30 transition-all group">
            {/* Header: Time & Title */}
            <div className="bg-slate-900/50 p-4 flex justify-between items-center border-b border-slate-700/50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                        className={`p-2 rounded-lg shrink-0 ${isConfirmed ? 'bg-emerald-900/30 text-emerald-400' : isModified ? 'bg-amber-900/30 text-amber-400' : 'bg-blue-900/30 text-blue-400'}`}
                    >
                        {isConfirmed ? (
                            <CheckCircle2 size={18} />
                        ) : isModified ? (
                            <UtensilsCrossed size={18} />
                        ) : (
                            <ChefHat size={18} />
                        )}
                    </div>
                    {editingSlot ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <select
                                value={slot.label}
                                onChange={(e) => onUpdateSlot(slot.id, { label: e.target.value })}
                                className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white outline-none"
                            >
                                {mealLabels.map((l) => (
                                    <option key={l} value={l}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="time"
                                value={slot.time}
                                onChange={(e) => onUpdateSlot(slot.id, { time: e.target.value })}
                                className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white outline-none w-24 [color-scheme:dark]"
                            />
                            <button
                                onClick={() => setEditingSlot(false)}
                                className="p-1 text-emerald-400 hover:text-emerald-300"
                            >
                                <Check size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-bold text-slate-200 truncate">{slot.label}</h3>
                            {exceeds && <AlertTriangle size={14} className="text-amber-400 shrink-0" />}
                            <span className="text-xs font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                                {slot.time}
                            </span>
                            {timingRole && timingRole !== 'normal' && TIMING_ROLES[timingRole] && (
                                <span
                                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                                        timingRole === 'pre'
                                            ? 'bg-amber-900/40 text-amber-400 border border-amber-700/40'
                                            : 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                                    }`}
                                >
                                    {TIMING_ROLES[timingRole].short}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                {!editingSlot && (
                    <div className="flex items-center gap-0.5 shrink-0">
                        <button
                            onClick={() => setEditingSlot(true)}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                            title="Editar hora/nombre"
                        >
                            <Clock size={14} />
                        </button>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                                title="Editar alimentos"
                            >
                                <Edit2 size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (confirm(`¿Eliminar "${slot.label}"?`)) onRemoveSlot(slot.id);
                            }}
                            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                            title="Eliminar comida"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Option Tabs */}
            {meal.options && meal.options.length > 0 && (
                <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto no-scrollbar">
                    {meal.options.map((opt, idx) => (
                        <button
                            key={opt.id}
                            onClick={() => setSelectedOption(slot.id, idx)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
                                idx === activeIndex
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            {opt.name}
                        </button>
                    ))}

                    {/* Add Option Button — max 7 (Lun-Dom) */}
                    {meal.options.length < 7 && (
                        <>
                            <div className="h-4 w-[1px] bg-slate-700 mx-1" />
                            <button
                                onClick={() => addMealOption(slot.id, activeIndex)}
                                title="Duplicar al siguiente día"
                                className="p-1.5 rounded-full text-slate-500 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                            >
                                <Copy size={12} />
                            </button>
                            <button
                                onClick={() => addMealOption(slot.id)}
                                title="Nuevo día vacío"
                                className="p-1.5 rounded-full text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                            >
                                <Plus size={14} />
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Content Area */}
            <div className="p-4">
                {isEditing || quickAdd ? (
                    <div className="space-y-4">
                        {/* Rename day — solo en edición completa, no en quickAdd */}
                        {isEditing && (
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-slate-500 uppercase font-bold">Día:</span>
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={activeOption.name}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        className="bg-transparent border-b border-slate-600 text-sm text-white focus:border-blue-500 outline-none w-full pb-1"
                                    />
                                    <div className="absolute right-0 top-0">
                                        {meal.options.length > 1 && (
                                            <button
                                                onClick={() => deleteMealOption(slot.id, activeIndex)}
                                                className="text-rose-400 hover:bg-rose-900/30 p-1 rounded transition-colors"
                                                title="Eliminar este día"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <StructuredMealEditor
                            initialItems={activeOption.items || []}
                            onSave={handleSave}
                            mealTarget={mealTarget}
                            onCancel={() => {
                                setIsEditing(false);
                                setQuickAdd(false);
                            }}
                            startAdding={quickAdd}
                        />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Ingredients List */}
                        {activeOption.items && activeOption.items.length > 0 ? (
                            <div className="space-y-2">
                                {activeOption.items.map((item, i) => (
                                    <ViewFoodItem key={i} item={item} />
                                ))}
                            </div>
                        ) : (
                            <button
                                onClick={() => setQuickAdd(true)}
                                className="w-full text-center py-5 text-slate-500 hover:text-blue-400 text-sm border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-xl transition-colors flex flex-col items-center gap-2"
                            >
                                <Plus size={20} />
                                {t('diet.addFood')}
                            </button>
                        )}

                        {/* Macros / Goals */}
                        <div className="mt-4 pt-3 border-t border-slate-700/50 space-y-2">
                            {macros && (
                                <div className="bg-slate-900/50 p-2.5 rounded-lg space-y-2">
                                    <div className="flex justify-between items-center text-xs font-mono">
                                        <span className="text-slate-400 flex items-center gap-1">
                                            <Flame size={12} className="text-orange-500" /> {macros.calories}{' '}
                                            {mealTarget ? (
                                                <span className="text-slate-600">/ {mealTarget.calories}</span>
                                            ) : null}{' '}
                                            kcal
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <MealMacroBar
                                            label="P"
                                            current={macros.protein}
                                            target={mealTarget?.protein}
                                            color="rose"
                                        />
                                        <MealMacroBar
                                            label="C"
                                            current={macros.carbs}
                                            target={mealTarget?.carbs}
                                            color="amber"
                                        />
                                        <MealMacroBar
                                            label="G"
                                            current={macros.fat}
                                            target={mealTarget?.fat}
                                            color="yellow"
                                        />
                                    </div>
                                </div>
                            )}
                            {!trainingDay && meal.note && (
                                <span className="text-xs bg-rose-900/20 text-rose-300 px-2 py-1 rounded border border-rose-800 w-full text-center block">
                                    {meal.note}
                                </span>
                            )}
                            {macros && macros.protein > 50 && (
                                <p className="text-[9px] text-slate-500 mt-1">
                                    Nota: la síntesis muscular es óptima con 30-40g de proteína por toma. Más se absorbe
                                    pero con rendimiento decreciente.
                                </p>
                            )}
                        </div>

                        {/* Nota del nutricionista */}
                        {nutritionistNote && (
                            <div className="mt-2 p-2.5 bg-emerald-950/20 border border-emerald-800/30 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <span className="text-emerald-400 shrink-0 mt-0.5">💬</span>
                                    <div>
                                        <div className="text-[10px] text-emerald-400 font-bold mb-0.5">
                                            {t('nav.home') === 'Home' ? 'Nutritionist note' : 'Nota del nutricionista'}
                                        </div>
                                        <p className="text-xs text-slate-300">{nutritionistNote}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Food Diary — confirmar / editar lo que comí */}
                        {activeOption.items?.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-700/30">
                                {isModified && mealLog.items ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-amber-400">
                                            <UtensilsCrossed size={12} />
                                            <span className="font-bold">Comida registrada (diferente al plan)</span>
                                            <button
                                                onClick={() => clearMealLog(slot.id)}
                                                className="ml-auto text-slate-500 hover:text-slate-300"
                                            >
                                                <Undo2 size={12} />
                                            </button>
                                        </div>
                                        <div className="bg-amber-950/20 rounded-lg p-2 text-[10px] text-slate-400">
                                            {mealLog.items.map((it, j) => (
                                                <span key={j}>
                                                    {it.name} {it.quantity}
                                                    {it.unit}
                                                    {j < mealLog.items.length - 1 ? ' · ' : ''}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : isConfirmed ? (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs text-emerald-400">
                                            <CheckCircle2 size={14} />
                                            <span className="font-bold">Comido</span>
                                        </div>
                                        <button
                                            onClick={() => clearMealLog(slot.id)}
                                            className="text-[10px] text-slate-500 hover:text-slate-300"
                                        >
                                            Deshacer
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => confirmMeal(slot.id)}
                                            className="flex-1 py-1.5 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-800/30 text-emerald-400 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <CheckCircle2 size={12} /> {t('diet.ateThis')}
                                        </button>
                                        <button
                                            onClick={() => setEditingActual(true)}
                                            className="flex-1 py-1.5 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-800/30 text-amber-400 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <UtensilsCrossed size={12} /> {t('diet.ateSomethingElse')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Editor de comida real (food diary) */}
                        {editingActual && (
                            <div className="mt-3 pt-3 border-t border-amber-700/30">
                                <div className="text-xs text-amber-400 font-bold mb-2 flex items-center gap-1.5">
                                    <UtensilsCrossed size={12} /> {t('diet.logWhatYouAte')}
                                </div>
                                <StructuredMealEditor
                                    initialItems={activeOption.items || []}
                                    onSave={(items) => {
                                        logActualMeal(slot.id, items);
                                        setEditingActual(false);
                                    }}
                                    onCancel={() => setEditingActual(false)}
                                    startAdding
                                    hideSuggestions
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}

/**
 * Banner de rebalanceo: muestra si hay déficit/superávit de macros
 * acumulado de las comidas anteriores y sugiere ajustes.
 */
function RebalanceBanner({ deficit }) {
    const { t } = useTranslation();
    if (!deficit) return null;
    const { protein, carbs, fat, calories } = deficit;
    const significant = Math.abs(protein) > 10 || Math.abs(carbs) > 15 || Math.abs(fat) > 8 || Math.abs(calories) > 50;
    if (!significant) return null;

    // Construir lista de ajustes necesarios en lenguaje claro
    // deficit negativo = te falta → necesitas añadir
    // deficit positivo = te sobra → necesitas reducir
    const adjustments = [];
    if (Math.abs(protein) > 5) {
        adjustments.push({
            label: 'proteína',
            value: Math.abs(Math.round(protein)),
            unit: 'g',
            action: protein < 0 ? 'add' : 'reduce',
            color: 'text-rose-400',
        });
    }
    if (Math.abs(carbs) > 5) {
        adjustments.push({
            label: 'carbos',
            value: Math.abs(Math.round(carbs)),
            unit: 'g',
            action: carbs < 0 ? 'add' : 'reduce',
            color: 'text-amber-400',
        });
    }
    if (Math.abs(fat) > 5) {
        adjustments.push({
            label: 'grasa',
            value: Math.abs(Math.round(fat)),
            unit: 'g',
            action: fat < 0 ? 'add' : 'reduce',
            color: 'text-yellow-400',
        });
    }

    const needMore = adjustments.filter((a) => a.action === 'add');
    const needLess = adjustments.filter((a) => a.action === 'reduce');

    return (
        <div className="rounded-xl p-3 text-xs border bg-blue-950/30 border-blue-800/30">
            <div className="font-bold mb-1.5 flex items-center gap-1.5 text-blue-400">
                <Wand2 size={12} /> {t('rebalance.title')}
            </div>
            <div className="space-y-1 text-[10px]">
                {needMore.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-emerald-400 font-bold">{t('rebalance.add')}</span>
                        {needMore.map((a, i) => (
                            <span key={i} className={a.color}>
                                {a.value}
                                {a.unit} {a.label}
                                {i < needMore.length - 1 ? ',' : ''}
                            </span>
                        ))}
                    </div>
                )}
                {needLess.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-amber-400 font-bold">{t('rebalance.reduce')}</span>
                        {needLess.map((a, i) => (
                            <span key={i} className={a.color}>
                                {a.value}
                                {a.unit} {a.label}
                                {i < needLess.length - 1 ? ',' : ''}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
                Diferencia: {Math.round(Math.abs(calories))} kcal {calories < 0 ? 'por debajo' : 'por encima'} del
                objetivo
            </p>
        </div>
    );
}

/**
 * Alimento en vista lectura con imagen del producto, info desplegable
 * con macros y badges Nutriscore/NOVA.
 */
function ViewFoodItem({ item }) {
    const [showInfo, setShowInfo] = useState(false);
    const { customFoods } = usePlan();
    const { calculateItemMacros } = useMacros();

    // Buscar definición: primero en FOOD_DATABASE, luego en customFoods
    const foodDef = FOOD_DATABASE.find((f) => f.id === item.foodId);
    const customFood = !foodDef ? (customFoods || []).find((f) => f.id === item.foodId) : null;
    const food = foodDef || customFood;
    const catDef = food ? Object.values(FOOD_CATEGORIES).find((c) => c.id === (food.category || item.category)) : null;

    const macros = calculateItemMacros(item);
    const hasImage = customFood?.imageUrl;
    const nutriscore = customFood?.nutriscoreGrade;
    const nova = customFood?.novaGroup;

    const isFromFridge = !!customFood;

    return (
        <div
            className={`rounded-xl overflow-hidden border ${isFromFridge ? 'bg-cyan-950/10 border-cyan-800/20' : 'bg-slate-900/30 border-slate-700/30'}`}
        >
            <div className="flex items-center justify-between p-2.5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => setShowInfo((s) => !s)} className="shrink-0">
                        {hasImage ? (
                            <img src={hasImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${catDef ? catDef.bg + ' ' + catDef.color : 'bg-slate-700 text-slate-400'}`}
                            >
                                {catDef?.icon || '🍽️'}
                            </div>
                        )}
                    </button>
                    <div className="min-w-0">
                        <div className="font-medium text-slate-200 text-sm truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-500">
                            {item.quantity}
                            {item.unit}
                            {macros ? ` · ${macros.calories} kcal` : ''}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowInfo((s) => !s)}
                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${showInfo ? 'text-blue-400 bg-blue-900/20' : 'text-slate-600 hover:text-blue-400'}`}
                >
                    <Info size={14} />
                </button>
            </div>

            {showInfo && macros && (
                <div className="px-3 pb-2.5">
                    <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/50">
                        {hasImage && (
                            <div className="mb-2 flex justify-center">
                                <img src={hasImage} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
                            </div>
                        )}
                        <div className="flex justify-between items-baseline mb-1.5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                Por {item.quantity} {item.unit}
                            </span>
                            <span className="text-xs font-mono font-bold text-white">{macros.calories} kcal</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <div className="text-xs font-bold text-rose-400">{macros.protein}g</div>
                                <div className="text-[9px] text-slate-500">Proteína</div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-amber-400">{macros.carbs}g</div>
                                <div className="text-[9px] text-slate-500">Carbos</div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-yellow-500">{macros.fat}g</div>
                                <div className="text-[9px] text-slate-500">Grasas</div>
                            </div>
                        </div>
                        {(nutriscore || nova) && (
                            <div className="flex gap-2 mt-2 pt-2 border-t border-slate-800/50">
                                {nutriscore && <NutriscoreBadge grade={nutriscore} />}
                                {nova && <NovaBadge group={nova} />}
                            </div>
                        )}
                        {macros.orphan && (
                            <div className="text-[10px] text-amber-400 mt-1.5 text-center">
                                Producto no encontrado — macros aproximados
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const NUTRISCORE_COLORS = {
    a: 'bg-emerald-600 text-white',
    b: 'bg-lime-600 text-white',
    c: 'bg-yellow-500 text-slate-900',
    d: 'bg-orange-500 text-white',
    e: 'bg-red-600 text-white',
};
function NutriscoreBadge({ grade }) {
    const g = String(grade).toLowerCase();
    return (
        <span
            className={`text-[9px] font-black px-1.5 py-0.5 rounded ${NUTRISCORE_COLORS[g] || 'bg-slate-700 text-slate-300'}`}
        >
            NS {g.toUpperCase()}
        </span>
    );
}
const NOVA_COLORS = {
    1: 'bg-emerald-700 text-white',
    2: 'bg-yellow-600 text-white',
    3: 'bg-orange-600 text-white',
    4: 'bg-red-700 text-white',
};
function NovaBadge({ group }) {
    return (
        <span
            className={`text-[9px] font-black px-1.5 py-0.5 rounded ${NOVA_COLORS[group] || 'bg-slate-700 text-slate-300'}`}
        >
            NOVA {group}
        </span>
    );
}

function MacroSummary({ isTrainingDay }) {
    const { t } = useTranslation();
    const { dailyConsumed, targets } = useMacros(isTrainingDay);

    const getPercent = (current, target) => Math.min(100, Math.round((current / target) * 100));

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
            <h3 className="text-slate-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                <PieChart size={14} /> {t('diet.dailySummary')}
            </h3>

            <div className="flex justify-between items-end mb-4">
                <div className="text-2xl font-bold text-white">
                    {dailyConsumed.calories}{' '}
                    <span className="text-sm text-slate-500 font-normal">/ {targets.calories} kcal</span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {/* Protein */}
                <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>PROT</span>
                        <span>
                            {dailyConsumed.protein} / {targets.protein}g
                        </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-rose-500"
                            style={{ width: `${getPercent(dailyConsumed.protein, targets.protein)}%` }}
                        ></div>
                    </div>
                </div>
                {/* Carbs */}
                <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>CARB</span>
                        <span>
                            {dailyConsumed.carbs} / {targets.carbs}g
                        </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-500"
                            style={{ width: `${getPercent(dailyConsumed.carbs, targets.carbs)}%` }}
                        ></div>
                    </div>
                </div>
                {/* Fats */}
                <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>GRASA</span>
                        <span>
                            {dailyConsumed.fat} / {targets.fat}g
                        </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-yellow-500"
                            style={{ width: `${getPercent(dailyConsumed.fat, targets.fat)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SharePopup({ onClose, toast, t }) {
    const { authUser } = usePlan();
    const [creating, setCreating] = useState(false);
    const isEn = t('nav.home') === 'Home';

    async function handleGenerate() {
        if (!authUser?.uid) return;
        setCreating(true);
        try {
            const { tokenId } = await createShareToken(authUser.uid, 'readwrite');
            const url = `${window.location.origin}/shared/${tokenId}`;
            // Clipboard con fallback
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url).catch(() => {
                    const ta = document.createElement('textarea');
                    ta.value = url;
                    ta.style.cssText = 'position:fixed;opacity:0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                });
            } else {
                const ta = document.createElement('textarea');
                ta.value = url;
                ta.style.cssText = 'position:fixed;opacity:0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            toast.success(isEn ? 'Link copied to clipboard!' : '¡Enlace copiado al portapapeles!');
            onClose();
        } catch (err) {
            toast.error(err.message || 'Error');
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="fixed inset-x-4 top-16 z-50 max-w-sm mx-auto bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Share2 size={13} /> {isEn ? 'Share with nutritionist' : 'Compartir con nutricionista'}
                </span>
                <button onClick={onClose} className="text-slate-500 hover:text-white">
                    <X size={14} />
                </button>
            </div>
            <p className="text-[10px] text-slate-400">
                {isEn
                    ? 'Generate a temporary link (7 days). Your nutritionist can view your diet and leave notes.'
                    : 'Genera un enlace temporal (7 días). Tu nutricionista podrá ver tu dieta y dejar notas.'}
            </p>
            <button
                onClick={handleGenerate}
                disabled={creating}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
                {creating ? '...' : isEn ? 'Generate & copy link' : 'Generar y copiar enlace'}
            </button>
        </div>
    );
}

const JS_DAY_TO_NAME = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function Diet() {
    const {
        plan,
        updateMeal,
        updateMealOption,
        updateTrainingTime,
        setSelectedOption,
        addMealSlot,
        removeMealSlot,
        updateMealSlot,
        mealLabels,
        customFoods,
    } = usePlan();
    const [trainingDay, setTrainingDay] = useState(true);
    const [showSharePopup, setShowSharePopup] = useState(false);
    const { t } = useTranslation();
    const { targets, sumMacros } = useMacros(trainingDay);
    const toast = useToast();
    const todayAutoSelected = React.useRef(false);

    // Notas del nutricionista — leídas de tokens activos del usuario
    const [nutritionistNotes, setNutritionistNotes] = React.useState({});
    const { authUser } = usePlan();
    React.useEffect(() => {
        if (!authUser?.uid) return;
        let cancelled = false;
        (async () => {
            try {
                const tokens = await listShareTokens(authUser.uid);
                const merged = {};
                for (const tk of tokens) {
                    const snap = await fGetDoc(fDoc(db, '_shareTokens', tk.tokenId, 'data', 'notes'));
                    if (snap.exists()) Object.assign(merged, snap.data()?.meals || {});
                }
                if (!cancelled && Object.keys(merged).length > 0) setNutritionistNotes(merged);
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [authUser?.uid]);

    // Auto-seleccionar la opción del día actual al montar
    React.useEffect(() => {
        if (todayAutoSelected.current) return;
        todayAutoSelected.current = true;
        const todayName = JS_DAY_TO_NAME[new Date().getDay()];
        const mealSlots = plan.schedule?.default?.filter((s) => s.type === 'meal') || [];
        for (const slot of mealSlots) {
            const meal = plan.meals?.[slot.id];
            if (!meal?.options) continue;
            const idx = meal.options.findIndex((o) => o.name === todayName);
            if (idx >= 0 && idx !== (meal.selectedOptionIndex || 0)) {
                setSelectedOption(slot.id, idx);
            }
        }
    }, [plan.schedule, plan.meals, setSelectedOption]);

    // Nutrient timing: roles de cada comida según hora de entreno
    const mealRoles = useMemo(
        () => (trainingDay ? assignMealRoles(plan.schedule?.default, plan.trainingTime) : {}),
        [plan.schedule, plan.trainingTime, trainingDay]
    );

    // Targets de macros por comida según timing + goalType
    const mealTargets = useMemo(
        () => (trainingDay ? distributeMacros(targets, mealRoles, plan.user?.goalType || 'recomp') : {}),
        [trainingDay, targets, mealRoles, plan.user?.goalType]
    );

    // Helper to get meal data securely
    const getMeal = (id) => plan.meals[id] || {};

    // Precalcular déficit acumulado para banner de rebalanceo
    const mealSlotsWithBanner = useMemo(() => {
        const slots = plan.schedule?.default?.filter((s) => s.type === 'meal') || [];
        const todayKey = new Date().toISOString().split('T')[0];
        const todayLog = plan.dailyLog?.[todayKey] || {};

        // Fase 1: acumular macros de comidas registradas
        const acc = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        const accT = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        let bannerSlotId = null;

        for (const slot of slots) {
            const log = todayLog[slot.id];
            const isLogged = log?.status === 'confirmed' || log?.status === 'modified';
            const mt = mealTargets[slot.id];

            if (isLogged && mt) {
                accT.calories += mt.calories;
                accT.protein += mt.protein;
                accT.carbs += mt.carbs;
                accT.fat += mt.fat;
                const meal = plan.meals[slot.id];
                const items =
                    log.status === 'modified' && log.items
                        ? log.items
                        : meal?.options?.[meal?.selectedOptionIndex || 0]?.items;
                if (items) {
                    const m = sumMacros(items);
                    acc.calories += m.calories;
                    acc.protein += m.protein;
                    acc.carbs += m.carbs;
                    acc.fat += m.fat;
                }
            } else if (!bannerSlotId && accT.calories > 0) {
                bannerSlotId = slot.id;
            }
        }

        // Fase 2: mapear con déficit solo en el slot del banner
        const deficit = bannerSlotId
            ? {
                  calories: acc.calories - accT.calories,
                  protein: acc.protein - accT.protein,
                  carbs: acc.carbs - accT.carbs,
                  fat: acc.fat - accT.fat,
              }
            : null;

        return slots.map((slot) => ({
            slot,
            deficit: slot.id === bannerSlotId ? deficit : null,
        }));
    }, [plan.schedule, plan.dailyLog, plan.meals, mealTargets, sumMacros]);

    return (
        <div className="p-6 space-y-6 pb-24">
            <header className="space-y-3">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-white">{t('diet.title')}</h1>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setShowSharePopup((s) => !s)}
                                className={`p-2 rounded-lg transition-colors ${showSharePopup ? 'text-emerald-400 bg-emerald-900/20' : 'text-slate-500 hover:text-emerald-400'}`}
                            >
                                <Share2 size={18} />
                            </button>
                            {showSharePopup && (
                                <SharePopup
                                    uid={plan.user?.name ? undefined : undefined}
                                    onClose={() => setShowSharePopup(false)}
                                    toast={toast}
                                    t={t}
                                />
                            )}
                        </div>
                        <button
                            onClick={() => setTrainingDay(!trainingDay)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${trainingDay ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                        >
                            {trainingDay ? t('diet.modeTraining') : t('diet.modeRest')}
                        </button>
                    </div>
                </div>

                {/* Selector de hora de entreno (solo visible en modo entreno) */}
                {trainingDay && (
                    <label className="flex items-center justify-between bg-emerald-950/40 border border-emerald-800/40 hover:border-emerald-600/50 rounded-xl px-3 py-2 cursor-pointer transition-colors">
                        <div className="flex items-center gap-2">
                            <Clock size={14} className="text-emerald-400 shrink-0" />
                            <span className="text-xs text-emerald-300/80">{t('diet.trainingAt')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <input
                                type="time"
                                value={plan.trainingTime || '13:00'}
                                onChange={(e) => updateTrainingTime(e.target.value)}
                                className="bg-transparent text-emerald-300 font-bold text-sm border-none outline-none w-20 text-right [color-scheme:dark] cursor-pointer"
                            />
                            <Edit2 size={12} className="text-emerald-500/60 shrink-0" />
                        </div>
                    </label>
                )}
                <Link
                    to="/fridge"
                    className="flex items-center justify-between gap-3 bg-cyan-900/20 hover:bg-cyan-900/30 border border-cyan-800/50 hover:border-cyan-700 rounded-xl p-3 transition-colors group"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-cyan-900/40 p-2 rounded-lg text-cyan-400 shrink-0">
                            <Refrigerator size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-bold text-cyan-200">Mi Nevera</div>
                            <div className="text-[10px] text-cyan-200/60">Gestiona tus productos personalizados</div>
                        </div>
                    </div>
                    <span className="text-cyan-400 text-xs font-bold opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                        Abrir →
                    </span>
                </Link>
            </header>

            <MacroSummary isTrainingDay={trainingDay} />

            <div className="space-y-4">
                {!trainingDay && (
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center text-xs text-slate-400">
                        Mostrando ajustes para días de descanso.
                    </div>
                )}

                {mealSlotsWithBanner.map(({ slot, deficit }) => {
                    const meal = getMeal(slot.id);
                    return (
                        <React.Fragment key={slot.id}>
                            {deficit && <RebalanceBanner deficit={deficit} />}
                            <MealCard
                                slot={slot}
                                meal={meal}
                                trainingDay={trainingDay}
                                timingRole={mealRoles[slot.id]}
                                mealTarget={mealTargets[slot.id]}
                                onUpdate={(newData) => updateMeal(slot.id, newData)}
                                onUpdateSlot={updateMealSlot}
                                onRemoveSlot={removeMealSlot}
                                mealLabels={mealLabels}
                                nutritionistNote={nutritionistNotes[slot.id]}
                            />
                        </React.Fragment>
                    );
                })}

                {/* Añadir comida */}
                <button
                    onClick={() => addMealSlot('Comida', '12:00')}
                    className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-2xl text-slate-500 hover:text-blue-400 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus size={16} /> {t('diet.addMeal')}
                </button>

                {/* Balancear semana con LP */}
                {trainingDay && (customFoods || []).length > 0 && (
                    <button
                        onClick={() => {
                            const mealSlots = plan.schedule?.default?.filter((s) => s.type === 'meal') || [];
                            const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

                            // Construir estructura para balanceWeek: por cada día, sus comidas con items y target
                            const days = dayNames
                                .map((dayName) => {
                                    const dayMeals = mealSlots
                                        .map((slot) => {
                                            const meal = plan.meals?.[slot.id];
                                            if (!meal?.options) return null;
                                            const option = meal.options.find((o) => o.name === dayName);
                                            if (!option?.items?.length) return null;
                                            return {
                                                slotId: slot.id,
                                                items: option.items,
                                                target: mealTargets[slot.id],
                                            };
                                        })
                                        .filter(Boolean);
                                    return { dayName, meals: dayMeals };
                                })
                                .filter((d) => d.meals.length > 0);

                            if (days.length === 0) {
                                toast.info(
                                    t('nav.home') === 'Home' ? 'No meals to balance' : 'No hay comidas para balancear'
                                );
                                return;
                            }

                            const results = balanceWeek(days, customFoods || [], targets);

                            // Aplicar resultados al plan
                            let changesCount = 0;
                            for (const day of results) {
                                for (const meal of day.meals) {
                                    if (meal.substitutions?.length > 0) {
                                        const planMeal = plan.meals?.[meal.slotId];
                                        if (!planMeal?.options) continue;
                                        const optIdx = planMeal.options.findIndex((o) => o.name === day.dayName);
                                        if (optIdx >= 0) {
                                            updateMealOption(meal.slotId, optIdx, { items: meal.items });
                                            changesCount += meal.substitutions.length;
                                        }
                                    }
                                }
                            }

                            if (changesCount > 0) {
                                toast.success(
                                    t('nav.home') === 'Home'
                                        ? `Week balanced: ${changesCount} changes`
                                        : `Semana balanceada: ${changesCount} cambios`
                                );
                            } else {
                                toast.info(
                                    t('nav.home') === 'Home'
                                        ? 'Week is already balanced'
                                        : 'La semana ya está equilibrada'
                                );
                            }
                        }}
                        className="w-full py-3 bg-cyan-900/20 border border-cyan-800/40 hover:bg-cyan-900/40 rounded-2xl text-cyan-300 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        <Wand2 size={16} />{' '}
                        {t('nav.home') === 'Home' ? 'Balance week with My Fridge' : 'Balancear semana con Mi Nevera'}
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Panel de sugerencias de sustitución (Fase 5a).
 * Muestra una lista de sustituciones propuestas: alimento genérico → producto
 * de Mi Nevera, con % de similaridad. El usuario puede aceptar/rechazar cada una.
 */
function SuggestionPanel({ suggestions, items, onApply, onClose }) {
    const [selected, setSelected] = useState(() => new Set(suggestions?.data?.map((s) => s.itemIndex) || []));

    if (!suggestions?.data?.length) return null;

    const subs = suggestions.data;

    const toggleItem = (idx) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const handleApply = () => {
        const newItems = [...items];
        for (const sub of subs) {
            if (!selected.has(sub.itemIndex)) continue;
            const food = sub.suggestedFood;
            newItems[sub.itemIndex] = {
                ...newItems[sub.itemIndex],
                foodId: food.id,
                name: food.name,
                category: food.category,
                unit: food.defaultUnit || newItems[sub.itemIndex].unit,
                quantity: sub.adjustedQty || newItems[sub.itemIndex].quantity,
            };
        }
        onApply(newItems);
    };

    return (
        <div className="bg-cyan-950/30 border border-cyan-800/50 rounded-xl p-3 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-300">
                    <ArrowRightLeft size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider">Sustituciones de Mi Nevera</span>
                </div>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
                    <X size={14} />
                </button>
            </div>

            <div className="space-y-2">
                {subs.map((sub) => {
                    const isSelected = selected.has(sub.itemIndex);
                    const orig = sub.originalMacros;
                    const sugg = sub.suggestedMacros;
                    const simColor =
                        sub.similarity >= 90
                            ? 'text-emerald-400'
                            : sub.similarity >= 80
                              ? 'text-cyan-400'
                              : 'text-amber-400';
                    return (
                        <button
                            key={sub.itemIndex}
                            onClick={() => toggleItem(sub.itemIndex)}
                            className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                                isSelected
                                    ? 'bg-cyan-900/30 border-cyan-600'
                                    : 'bg-slate-900/50 border-slate-800 opacity-60'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <div
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
                                        isSelected ? 'bg-cyan-600 border-cyan-500 text-white' : 'border-slate-600'
                                    }`}
                                >
                                    {isSelected && <Check size={12} />}
                                </div>
                                <span className={`text-[10px] font-mono font-bold ${simColor}`}>{sub.similarity}%</span>
                            </div>
                            {/* Nombres: original → sugerido */}
                            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs mb-2">
                                <div className="text-slate-400 truncate">{sub.currentName}</div>
                                <ArrowRightLeft size={10} className="text-slate-600 shrink-0" />
                                <div className="text-cyan-200 font-bold truncate">{sub.suggestedFood.name}</div>
                            </div>
                            {sub.suggestedFood.brand && (
                                <div className="text-[9px] text-slate-500 mb-2 pl-7">{sub.suggestedFood.brand}</div>
                            )}
                            {/* Comparativa de macros lado a lado */}
                            {orig && sugg && (
                                <div className="bg-slate-950/60 rounded-md p-2 grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-0.5 text-[10px]">
                                    <div className="text-right text-slate-500">
                                        {items[sub.itemIndex]?.quantity}
                                        {items[sub.itemIndex]?.unit}
                                    </div>
                                    <div className="text-slate-600 text-center">qty</div>
                                    <div className="text-cyan-300 font-bold">
                                        {sub.adjustedQty}
                                        {sub.suggestedFood.defaultUnit || items[sub.itemIndex]?.unit}
                                    </div>

                                    <div className="text-right text-slate-400">{orig.calories}</div>
                                    <div className="text-slate-600 text-center">kcal</div>
                                    <MacroDiff value={sugg.calories} original={orig.calories} />

                                    <div className="text-right text-slate-400">{orig.protein}g</div>
                                    <div className="text-rose-400/60 text-center">P</div>
                                    <MacroDiff value={sugg.protein} original={orig.protein} suffix="g" />

                                    <div className="text-right text-slate-400">{orig.carbs}g</div>
                                    <div className="text-amber-400/60 text-center">C</div>
                                    <MacroDiff value={sugg.carbs} original={orig.carbs} suffix="g" />

                                    <div className="text-right text-slate-400">{orig.fat}g</div>
                                    <div className="text-yellow-500/60 text-center">G</div>
                                    <MacroDiff value={sugg.fat} original={orig.fat} suffix="g" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="flex gap-2 pt-1">
                <button
                    onClick={onClose}
                    className="flex-1 py-2 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleApply}
                    disabled={selected.size === 0}
                    className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                    <Check size={12} />
                    Aplicar {selected.size > 0 ? `(${selected.size})` : ''}
                </button>
            </div>
        </div>
    );
}

/**
 * BUG-5: item de comida con botón de info nutricional expandible.
 * Mini barra de progreso de un macro para una comida, con target opcional.
 */
function MealMacroBar({ label, current, target, color }) {
    const rawPct = target > 0 ? Math.round((current / target) * 100) : 0;
    const pct = Math.min(100, rawPct);
    const isOver = rawPct > 115;
    const colorMap = { rose: 'bg-rose-500', amber: 'bg-amber-500', yellow: 'bg-yellow-500' };
    const textMap = { rose: 'text-rose-300', amber: 'text-amber-300', yellow: 'text-yellow-300' };

    return (
        <div>
            <div className="flex justify-between text-[10px] mb-0.5">
                <span className={isOver ? 'text-red-400' : textMap[color]}>
                    {label}
                    {isOver ? ' !' : ''}
                </span>
                <span className={`font-mono ${isOver ? 'text-red-400' : 'text-slate-400'}`}>
                    {current}g{target ? <span className="text-slate-600"> / {target}g</span> : null}
                </span>
            </div>
            {target > 0 && (
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all ${isOver ? 'bg-red-500' : colorMap[color]}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            )}
        </div>
    );
}

/**
 * Muestra un valor de macro con color según la diferencia con el original.
 */
function MacroDiff({ value, original, suffix = '' }) {
    const diff = original > 0 ? ((value - original) / original) * 100 : 0;
    const absDiff = Math.abs(diff);
    const color =
        absDiff <= 5
            ? 'text-emerald-400'
            : absDiff <= 15
              ? 'text-cyan-300'
              : absDiff <= 30
                ? 'text-amber-400'
                : 'text-rose-400';
    return (
        <div className={`${color} font-bold`}>
            {value}
            {suffix}
        </div>
    );
}

/**
 * Al tocar "info" se despliega una mini-etiqueta con P/C/G/kcal
 * para la cantidad específica del item.
 */
function FoodItemRow({ item, catInfo, macros, onRemove }) {
    const [showInfo, setShowInfo] = useState(false);

    return (
        <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${catInfo.bg} ${catInfo.color} border ${catInfo.border}`}
                    >
                        {catInfo.icon}
                    </div>
                    <div className="text-sm min-w-0">
                        <div className="text-slate-200 font-bold truncate">{item.name}</div>
                        <div className="text-xs text-slate-500">
                            {item.quantity} {item.unit}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => setShowInfo((s) => !s)}
                        className={`p-2 transition-colors ${showInfo ? 'text-blue-400' : 'text-slate-600 hover:text-blue-400'}`}
                        title="Ver info nutricional"
                    >
                        <Info size={14} />
                    </button>
                    <button onClick={onRemove} className="p-2 text-slate-500 hover:text-red-400">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {showInfo && macros && (
                <div className="px-3 pb-2 pt-0">
                    <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-800">
                        <div className="flex justify-between items-baseline mb-1.5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                Por {item.quantity} {item.unit}
                            </span>
                            <span className="text-xs font-mono font-bold text-white">{macros.calories} kcal</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <div className="text-xs font-bold text-rose-400">{macros.protein}g</div>
                                <div className="text-[9px] text-slate-500">Proteína</div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-amber-400">{macros.carbs}g</div>
                                <div className="text-[9px] text-slate-500">Carbos</div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-yellow-500">{macros.fat}g</div>
                                <div className="text-[9px] text-slate-500">Grasas</div>
                            </div>
                        </div>
                        {macros.orphan && (
                            <div className="text-[10px] text-amber-400 mt-1.5 text-center">
                                Producto no encontrado — macros aproximados
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
