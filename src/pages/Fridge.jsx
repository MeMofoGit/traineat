import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Refrigerator, Plus, Search, Edit2, Trash2, AlertTriangle, ArrowLeft, Lock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';
import { usePlan } from '../hooks/usePlan';
import { FOOD_CATEGORIES } from '../data/food_database';
import { useEntitlements } from '../hooks/useEntitlements';
import CustomFoodModal from '../components/CustomFoodModal';

/**
 * Página "Mi Nevera" — listado de productos personalizados del usuario.
 * Accesible desde un botón en la cabecera de Diet (`/diet`).
 *
 * Funcionalidades:
 * - Búsqueda por nombre.
 * - Filtro por categoría (chips).
 * - Sort: alfabético | recientes.
 * - CRUD vía CustomFoodModal.
 * - Confirmación inline antes de borrar.
 * - Empty state con CTA.
 *
 * Mover Mi Nevera de Profile → página propia (2026-04-10):
 * - Razón: encaja mejor en el contexto de Diet (gestión de productos
 *   que se usan en comidas) que en Profile (datos personales).
 * - La tabla con buscador/filtros respira mejor a página completa.
 * - Profile vuelve a centrarse exclusivamente en perfil de usuario.
 */
export default function Fridge() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { customFoods, removeCustomFood } = usePlan();
    const entitlements = useEntitlements();
    const canCreate = entitlements.customFoods;

    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState(null);
    const [sortMode, setSortMode] = useState('name');

    const [modalOpen, setModalOpen] = useState(false);
    const [editingFood, setEditingFood] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [viewFood, setViewFood] = useState(null);
    const toast = useToast();

    const filtered = useMemo(() => {
        let list = customFoods || [];
        if (categoryFilter) {
            list = list.filter((f) => f.category === categoryFilter);
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((f) => (f.name || '').toLowerCase().includes(q));
        }
        if (sortMode === 'recent') {
            list = [...list].sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
        } else {
            list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        return list;
    }, [customFoods, search, categoryFilter, sortMode]);

    const total = customFoods?.length || 0;

    function openCreate() {
        setEditingFood(null);
        setModalOpen(true);
    }

    function openEdit(food) {
        setEditingFood(food);
        setModalOpen(true);
    }

    async function handleDelete(foodId) {
        try {
            await removeCustomFood(foodId);
            setConfirmDeleteId(null);
            toast.success('Producto eliminado');
        } catch (e) {
            toast.error(e?.message || 'Error al borrar');
        }
    }

    return (
        <div className="p-6 space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <header className="flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    aria-label="Volver"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="bg-cyan-900/30 p-3 rounded-2xl text-cyan-400">
                    <Refrigerator size={24} />
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-white">{t('fridge.title')}</h1>
                    <p className="text-xs text-slate-400">
                        {total === 0
                            ? 'Tus productos personalizados'
                            : `${total} producto${total === 1 ? '' : 's'} guardado${total === 1 ? '' : 's'}`}
                    </p>
                </div>
                {total > 0 &&
                    (canCreate ? (
                        <button
                            onClick={openCreate}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                        >
                            <Plus size={14} />
                            {t('fridge.add')}
                        </button>
                    ) : (
                        <button
                            disabled
                            className="bg-slate-800 text-slate-500 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-not-allowed shrink-0"
                            title="Función Premium"
                        >
                            <Lock size={12} />
                            Premium
                        </button>
                    ))}
            </header>

            {/* Empty state ocupa toda la página */}
            {total === 0 ? (
                <EmptyState onCreate={openCreate} canCreate={canCreate} />
            ) : (
                <>
                    {/* Search + filtros */}
                    <div className="space-y-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('fridge.search')}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3 py-3 text-sm text-white outline-none focus:border-cyan-500"
                            />
                        </div>

                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
                            <CategoryChip
                                active={categoryFilter === null}
                                onClick={() => setCategoryFilter(null)}
                                label="Todas"
                            />
                            {Object.values(FOOD_CATEGORIES).map((cat) => (
                                <CategoryChip
                                    key={cat.id}
                                    active={categoryFilter === cat.id}
                                    onClick={() => setCategoryFilter((prev) => (prev === cat.id ? null : cat.id))}
                                    label={`${cat.icon} ${cat.label}`}
                                />
                            ))}
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
                            <span>
                                {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
                            </span>
                            <select
                                value={sortMode}
                                onChange={(e) => setSortMode(e.target.value)}
                                className="bg-transparent text-slate-400 outline-none cursor-pointer"
                            >
                                <option value="name">Alfabético</option>
                                <option value="recent">{t('fridge.sortRecent')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Lista */}
                    {filtered.length === 0 ? (
                        <div className="text-center text-sm text-slate-500 py-10">Sin resultados con esos filtros</div>
                    ) : (
                        <ul className="space-y-2">
                            {filtered.map((food) => (
                                <FoodCard
                                    key={food.id}
                                    food={food}
                                    onView={() => setViewFood(food)}
                                    onEdit={() => openEdit(food)}
                                    onDelete={() => setConfirmDeleteId(food.id)}
                                    confirmDelete={confirmDeleteId === food.id}
                                    onConfirmDelete={() => handleDelete(food.id)}
                                    onCancelDelete={() => setConfirmDeleteId(null)}
                                />
                            ))}
                        </ul>
                    )}
                </>
            )}

            {/* Modal */}
            <CustomFoodModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                mode={editingFood ? 'edit' : 'create'}
                initialFood={editingFood}
                onSaved={(food) => {
                    toast.success(
                        editingFood ? t('fridge.updated') : t('fridge.added', { name: food?.name || 'Producto' })
                    );
                }}
            />

            {/* Atribución ODbL — requerido por la licencia de OpenFoodFacts.
                Los productos importados (mirror nocturno + cache) provienen de
                ahí y debemos dar atribución visible. */}
            <footer className="pt-4 text-center text-[10px] text-slate-600 leading-relaxed">
                Información de productos por{' '}
                <a
                    href="https://es.openfoodfacts.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-slate-400"
                >
                    Open Food Facts
                </a>{' '}
                contributors, disponible bajo{' '}
                <a
                    href="https://opendatacommons.org/licenses/odbl/1-0/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-slate-400"
                >
                    Open Database License (ODbL)
                </a>
                .
            </footer>

            {viewFood && <FoodDetailModal food={viewFood} onClose={() => setViewFood(null)} />}
        </div>
    );
}

// ----------------------------------------------------------------------------
// Subcomponentes
// ----------------------------------------------------------------------------

function EmptyState({ onCreate, canCreate }) {
    const { t } = useTranslation();
    return (
        <div className="text-center py-16 px-6 border border-dashed border-slate-700 rounded-2xl">
            <div className="inline-block bg-cyan-900/20 p-5 rounded-full mb-4">
                <Refrigerator size={40} className="text-cyan-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">{t('fridge.empty')}</h2>
            <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">{t('fridge.emptyDesc')}</p>
            {canCreate ? (
                <button
                    onClick={onCreate}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-3 rounded-xl text-sm font-bold inline-flex items-center gap-2"
                >
                    <Plus size={16} />
                    {t('fridge.createFirst')}
                </button>
            ) : (
                <button
                    disabled
                    className="bg-slate-800 text-slate-500 px-5 py-3 rounded-xl text-sm font-bold inline-flex items-center gap-2 cursor-not-allowed"
                >
                    <Lock size={16} />
                    Función Premium
                </button>
            )}
        </div>
    );
}

function CategoryChip({ active, onClick, label }) {
    return (
        <button
            onClick={onClick}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
                active ? 'bg-cyan-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
        >
            {label}
        </button>
    );
}

function FoodCard({ food, onView, onEdit, onDelete, confirmDelete, onConfirmDelete, onCancelDelete }) {
    const { t } = useTranslation();
    const cat = Object.values(FOOD_CATEGORIES).find((c) => c.id === food.category) || FOOD_CATEGORIES.OTHER;
    const m = food.macros || {};
    const serving = food.servingSize || (food.defaultUnit === 'g' || food.defaultUnit === 'ml' ? 100 : 1);

    if (confirmDelete) {
        return (
            <li className="bg-rose-950/30 border border-rose-900 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2 text-sm text-rose-200">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>{t('fridge.confirmDeleteMsg', { name: food.name })}</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onCancelDelete}
                        className="flex-1 py-2 rounded-lg text-xs font-bold border border-slate-700 text-slate-400 hover:text-white"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={onConfirmDelete}
                        className="flex-1 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
                    >
                        {t('fridge.deleteBtn')}
                    </button>
                </div>
            </li>
        );
    }

    return (
        <li
            className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-slate-600 transition-colors"
            onClick={onView}
        >
            {food.imageUrl ? (
                <img src={food.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
            ) : (
                <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${cat.bg} border ${cat.border}`}
                >
                    {cat.icon}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{food.name}</h4>
                    <span className="text-xs font-mono text-slate-300 shrink-0">
                        {Math.round(m.calories || 0)} <span className="text-slate-500">kcal</span>
                    </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-900/20 px-1.5 py-0.5 rounded">
                        {Math.round(m.protein || 0)}g P
                    </span>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-900/20 px-1.5 py-0.5 rounded">
                        {Math.round(m.carbs || 0)}g C
                    </span>
                    <span className="text-[10px] font-bold text-yellow-400 bg-yellow-900/20 px-1.5 py-0.5 rounded">
                        {Math.round(m.fat || 0)}g G
                    </span>
                    <span className="text-[9px] text-slate-600">
                        / {serving}
                        {food.defaultUnit}
                    </span>
                </div>
                {(food.nutriscoreGrade || food.novaGroup) && (
                    <div className="flex gap-1.5 mt-1.5">
                        {food.nutriscoreGrade && <NutriscoreBadge grade={food.nutriscoreGrade} />}
                        {food.novaGroup && <NovaBadge group={food.novaGroup} />}
                    </div>
                )}
            </div>
            <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onEdit}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    aria-label="Editar"
                >
                    <Edit2 size={14} />
                </button>
                <button
                    onClick={onDelete}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded transition-colors"
                    aria-label="Borrar"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </li>
    );
}

const NUTRISCORE_COLORS = {
    a: 'bg-green-600 text-white',
    b: 'bg-lime-500 text-white',
    c: 'bg-yellow-400 text-black',
    d: 'bg-orange-500 text-white',
    e: 'bg-red-600 text-white',
};

function NutriscoreBadge({ grade }) {
    const g = (grade || '').toLowerCase();
    return (
        <span
            className={`text-[9px] font-black px-1.5 py-0.5 rounded ${NUTRISCORE_COLORS[g] || 'bg-slate-700 text-slate-300'}`}
        >
            Nutri {g.toUpperCase()}
        </span>
    );
}

const NOVA_COLORS = {
    1: 'bg-green-700 text-white',
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

function FoodDetailModal({ food, onClose }) {
    const { t } = useTranslation();
    const m = food.macros || {};
    const cat = Object.values(FOOD_CATEGORIES).find((c) => c.id === food.category) || {
        icon: '🍽️',
        label: 'Otro',
        color: 'text-slate-400',
    };
    const serving = food.servingSize ?? 100;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] bg-slate-950/90 flex items-start justify-center pt-16 px-4 pb-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {food.imageUrl ? (
                    <div className="relative">
                        <img src={food.imageUrl} alt={food.name} className="w-full h-48 object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 p-2 bg-slate-900/60 rounded-full text-white hover:bg-slate-900"
                        >
                            <X size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-4 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{cat.icon}</span>
                            <span className="text-xs text-slate-500 uppercase font-bold">{cat.label}</span>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>
                )}

                <div className="p-5 space-y-4">
                    <div>
                        <h2 className="text-lg font-bold text-white">{food.name}</h2>
                        {food.brand && <p className="text-sm text-slate-400">{food.brand}</p>}
                        {food.barcode && (
                            <p className="text-[10px] text-slate-600 font-mono mt-0.5">EAN {food.barcode}</p>
                        )}
                    </div>

                    {(food.nutriscoreGrade || food.novaGroup) && (
                        <div className="flex gap-2">
                            {food.nutriscoreGrade && <NutriscoreBadge grade={food.nutriscoreGrade} />}
                            {food.novaGroup && <NovaBadge group={food.novaGroup} />}
                        </div>
                    )}

                    <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
                        <div className="flex justify-between items-baseline mb-3">
                            <span className="text-xs text-slate-400 uppercase font-bold">
                                {t('fridge.nutritionInfo')}
                            </span>
                            <span className="text-[10px] text-slate-500">
                                por {serving}
                                {food.defaultUnit}
                            </span>
                        </div>
                        <div className="text-xl font-bold text-white mb-3">{Math.round(m.calories || 0)} kcal</div>
                        <div className="space-y-2">
                            <NutrientRow label={t('fridge.protein')} value={m.protein} color="rose" />
                            <NutrientRow label={t('fridge.carbs')} value={m.carbs} color="amber" />
                            {m.sugars != null && (
                                <NutrientRow label={t('fridge.sugars')} value={m.sugars} color="amber" sub />
                            )}
                            <NutrientRow label={t('fridge.fats')} value={m.fat} color="yellow" />
                            {m.saturated != null && (
                                <NutrientRow label={t('fridge.saturated')} value={m.saturated} color="yellow" sub />
                            )}
                            {m.fiber != null && (
                                <NutrientRow label={t('fridge.fiber')} value={m.fiber} color="emerald" />
                            )}
                            {m.salt != null && <NutrientRow label={t('fridge.salt')} value={m.salt} color="slate" />}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

function NutrientRow({ label, value, color, sub }) {
    if (value == null) return null;
    const v = Math.round(value * 10) / 10;
    const colors = {
        rose: 'text-rose-400',
        amber: 'text-amber-400',
        yellow: 'text-yellow-400',
        emerald: 'text-emerald-400',
        slate: 'text-slate-400',
    };
    return (
        <div className={`flex justify-between items-center ${sub ? 'pl-3' : ''} ${sub ? 'text-[11px]' : 'text-xs'}`}>
            <span className={sub ? 'text-slate-500' : 'text-slate-300'}>{label}</span>
            <span className={`font-mono font-bold ${colors[color] || 'text-white'}`}>{v}g</span>
        </div>
    );
}
