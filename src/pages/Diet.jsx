import React, { useState, useMemo } from 'react';
import { usePlan } from '../hooks/usePlan';
import { useMacros } from '../hooks/useMacros';
import { ChefHat, Flame, Edit2, Plus, Trash2, Check, X, Search, PieChart, Copy } from 'lucide-react';
import { FOOD_DATABASE, FOOD_CATEGORIES } from '../data/food_database';

function StructuredMealEditor({ initialItems, onSave, onCancel }) {
    // If no structured items, try to parse or start empty
    const [items, setItems] = useState(initialItems || []);
    const [isAdding, setIsAdding] = useState(false);

    // New Item State
    const [selectedCat, setSelectedCat] = useState('protein');
    const [selectedFoodId, setSelectedFoodId] = useState('');
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState('g');

    const availableFoods = useMemo(() =>
        FOOD_DATABASE.filter(f => f.category === selectedCat)
        , [selectedCat]);

    const handleAddItem = () => {
        if (!selectedFoodId || !qty) return;
        const food = FOOD_DATABASE.find(f => f.id === selectedFoodId);

        setItems([...items, {
            foodId: selectedFoodId,
            name: food ? food.name : 'Desconocido',
            category: selectedCat,
            quantity: qty,
            unit: unit
        }]);

        // Reset fields but keep category for speed
        setSelectedFoodId('');
        setQty('');
        // setUnit('g'); // Keep unit for speed
        setIsAdding(false);
    };

    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const commitSave = () => {
        onSave(items);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {items.map((item, i) => {
                    const catInfo = Object.values(FOOD_CATEGORIES).find(c => c.id === item.category) || FOOD_CATEGORIES.OTHER;
                    return (
                        <div key={i} className="flex items-center justify-between bg-slate-900 border border-slate-700/50 p-2 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${catInfo.bg} ${catInfo.color} border ${catInfo.border}`}>
                                    {catInfo.icon}
                                </div>
                                <div className="text-sm">
                                    <div className="text-slate-200 font-bold">{item.name}</div>
                                    <div className="text-xs text-slate-500">{item.quantity} {item.unit}</div>
                                </div>
                            </div>
                            <button onClick={() => handleRemoveItem(i)} className="p-2 text-slate-500 hover:text-red-400">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {isAdding ? (
                <div className="bg-slate-900 border border-blue-500/30 p-3 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    {/* Category Selector */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {Object.values(FOOD_CATEGORIES).map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => { setSelectedCat(cat.id); setSelectedFoodId(''); }}
                                className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${selectedCat === cat.id
                                    ? `${cat.bg} ${cat.color} ${cat.border}`
                                    : 'bg-slate-800 border-slate-700 text-slate-500'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Food Selector */}
                    <select
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                        value={selectedFoodId}
                        onChange={e => {
                            setSelectedFoodId(e.target.value);
                            const f = FOOD_DATABASE.find(x => x.id === e.target.value);
                            if (f) setUnit(f.defaultUnit);
                        }}
                    >
                        <option value="">-- Selecciona Alimento --</option>
                        {availableFoods.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>

                    {/* Qty & Unit */}
                    <div className="flex gap-2">
                        <input
                            type="number"
                            placeholder="Cant."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                            value={qty}
                            onChange={e => setQty(e.target.value)}
                        />
                        <select
                            className="w-20 bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white outline-none focus:border-blue-500"
                            value={unit}
                            onChange={e => setUnit(e.target.value)}
                        >
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="pz">pz</option>
                            <option value="taza">taza</option>
                            <option value="cda">cda</option>
                        </select>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button onClick={() => setIsAdding(false)} className="flex-1 py-2 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold">Cancelar</button>
                        <button onClick={handleAddItem} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Añadir</button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full py-2 border border-dashed border-slate-700 text-slate-500 hover:border-blue-500 hover:text-blue-500 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                    <Plus size={14} /> Añadir Alimento
                </button>
            )}

            <div className="flex gap-2 pt-4 border-t border-slate-700/50">
                <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-sm transition-colors">
                    Cancelar
                </button>
                <button onClick={commitSave} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 transition-colors">
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
}

function MealCard({ slot, meal, trainingDay }) {
    const { updateMealOption, addMealOption, deleteMealOption, setSelectedOption } = usePlan();
    const [isEditing, setIsEditing] = useState(false);
    const { sumMacros } = useMacros();

    // Get Active Option
    const activeIndex = meal.selectedOptionIndex || 0;
    const activeOption = meal.options ? meal.options[activeIndex] : { items: [], id: 1, name: 'Opción 1' };

    // Safety check if migration hasn't run yet/render cycle quirk
    if (!activeOption) return null;

    const handleSave = (items) => {
        updateMealOption(slot.id, activeIndex, { items });
        setIsEditing(false);
    };

    const handleNameChange = (newName) => {
        updateMealOption(slot.id, activeIndex, { name: newName });
    };

    // Calculate macros for this meal if structured
    const macros = activeOption.items && activeOption.items.length > 0 ? sumMacros(activeOption.items) : null;

    return (
        <article className="bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-blue-500/30 transition-all group">
            {/* Header: Time & Title */}
            <div className="bg-slate-900/50 p-4 flex justify-between items-center border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-900/30 p-2 rounded-lg text-blue-400">
                        <ChefHat size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-200">{slot.label}</h3>
                            <span className="text-xs font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{slot.time}</span>
                        </div>
                        {slot.notes && <p className="text-xs text-slate-400 mt-0.5">{slot.notes}</p>}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                        >
                            <Edit2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Option Tabs */}
            {meal.options && meal.options.length > 0 && (
                <div className="flex items-center gap-1 px-4 pt-3 overflow-x-auto no-scrollbar">
                    {meal.options.map((opt, idx) => (
                        <button
                            key={opt.id}
                            onClick={() => setSelectedOption(slot.id, idx)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${idx === activeIndex
                                ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                }`}
                        >
                            {opt.name}
                        </button>
                    ))}

                    {/* Add Option Button */}
                    <div className="h-4 w-[1px] bg-slate-700 mx-1" />

                    <button
                        onClick={() => addMealOption(slot.id, activeIndex)}
                        title="Duplicar actual"
                        className="p-1.5 rounded-full text-slate-500 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                    >
                        <Copy size={12} />
                    </button>
                    <button
                        onClick={() => addMealOption(slot.id)}
                        title="Nueva vacía"
                        className="p-1.5 rounded-full text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                    >
                        <Plus size={14} />
                    </button>
                </div>
            )}

            {/* Content Area */}
            <div className="p-4">
                {isEditing ? (
                    <div className="space-y-4">
                        {/* Rename Option */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-slate-500 uppercase font-bold">Variante:</span>
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
                                            title="Eliminar esta opción"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <StructuredMealEditor
                            initialItems={activeOption.items || []}
                            onSave={handleSave}
                            onCancel={() => setIsEditing(false)}
                        />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Ingredients List */}
                        {activeOption.items && activeOption.items.length > 0 ? (
                            <div className="space-y-2">
                                {activeOption.items.map((item, i) => {
                                    const foodDef = FOOD_DATABASE.find(f => f.id === item.foodId);
                                    const catDef = foodDef ? Object.values(FOOD_CATEGORIES).find(c => c.id === foodDef.category) : null;

                                    return (
                                        <div key={i} className="flex items-center justify-between group/item p-2 hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${catDef ? catDef.bg + ' ' + catDef.color : 'bg-slate-700 text-slate-400'}`}>
                                                    {item.category === 'custom' ? '✨' : (catDef?.icon || '🍽️')}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-200 text-sm">
                                                        {item.name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-mono">
                                                        {catDef?.label || 'Custom'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="font-mono font-bold text-blue-300 text-sm bg-blue-900/20 px-2 py-1 rounded">
                                                {item.quantity}{item.unit}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-slate-500 text-sm italic border-2 border-dashed border-slate-700 rounded-xl">
                                Sin alimentos registrados
                            </div>
                        )}

                        {/* Macros / Goals */}
                        <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-wrap gap-2">
                            {macros && (
                                <div className="flex gap-3 text-xs font-mono w-full justify-between items-center bg-slate-900/50 p-2 rounded-lg">
                                    <span className="text-slate-400 flex items-center gap-1"><Flame size={12} className="text-orange-500" /> {macros.calories} kcal</span>
                                    <div className="flex gap-2">
                                        <span className="text-rose-300">P:{macros.protein}g</span>
                                        <span className="text-amber-300">C:{macros.carbs}g</span>
                                        <span className="text-yellow-300">G:{macros.fat}g</span>
                                    </div>
                                </div>
                            )}
                            {!trainingDay && meal.note && (
                                <span className="text-xs bg-rose-900/20 text-rose-300 px-2 py-1 rounded border border-rose-800 w-full text-center">
                                    ⚠️ {meal.note}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}


function MacroSummary({ isTrainingDay }) {
    const { dailyConsumed, targets } = useMacros(isTrainingDay);

    const getPercent = (current, target) => Math.min(100, Math.round((current / target) * 100));

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6">
            <h3 className="text-slate-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                <PieChart size={14} /> Resumen Diario (Estimado)
            </h3>

            <div className="flex justify-between items-end mb-4">
                <div className="text-2xl font-bold text-white">{dailyConsumed.calories} <span className="text-sm text-slate-500 font-normal">/ {targets.calories} kcal</span></div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {/* Protein */}
                <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>PROT</span>
                        <span>{dailyConsumed.protein} / {targets.protein}g</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500" style={{ width: `${getPercent(dailyConsumed.protein, targets.protein)}%` }}></div>
                    </div>
                </div>
                {/* Carbs */}
                <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>CARB</span>
                        <span>{dailyConsumed.carbs} / {targets.carbs}g</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${getPercent(dailyConsumed.carbs, targets.carbs)}%` }}></div>
                    </div>
                </div>
                {/* Fats */}
                <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>GRASA</span>
                        <span>{dailyConsumed.fat} / {targets.fat}g</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500" style={{ width: `${getPercent(dailyConsumed.fat, targets.fat)}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function Diet() {
    const { plan, updateMeal } = usePlan();
    const [trainingDay, setTrainingDay] = useState(true);

    // Helper to get meal data securely
    const getMeal = (id) => plan.meals[id] || {};

    return (
        <div className="p-6 space-y-6 pb-24">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Tu Nutrición</h1>
                <button
                    onClick={() => setTrainingDay(!trainingDay)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${trainingDay ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                >
                    {trainingDay ? 'Modo: Entreno' : 'Modo: Descanso'}
                </button>
            </header>

            <MacroSummary isTrainingDay={trainingDay} />

            <div className="space-y-4">
                {!trainingDay && (
                    <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center text-xs text-slate-400">
                        Mostrando ajustes para días de descanso.
                    </div>
                )}

                {plan.schedule.default
                    .filter(item => item.type === 'meal')
                    .map((slot, index) => {
                        const meal = getMeal(slot.id);
                        return (
                            <MealCard
                                key={index}
                                slot={slot}
                                meal={meal}
                                trainingDay={trainingDay}
                                onUpdate={(newData) => updateMeal(slot.id, newData)}
                            />
                        )
                    })}
            </div>
        </div>
    );
}
