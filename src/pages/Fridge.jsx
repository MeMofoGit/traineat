import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Refrigerator, Plus, Search, Edit2, Trash2, AlertTriangle, ArrowLeft, Lock } from 'lucide-react';
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
                    <h1 className="text-2xl font-bold text-white">Mi Nevera</h1>
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
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                        >
                            <Plus size={14} />
                            Nuevo
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
                                placeholder="Buscar producto…"
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
                                <option value="recent">Recientes</option>
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
                        editingFood ? 'Producto actualizado' : `${food?.name || 'Producto'} añadido a Mi Nevera`
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
        </div>
    );
}

// ----------------------------------------------------------------------------
// Subcomponentes
// ----------------------------------------------------------------------------

function EmptyState({ onCreate, canCreate }) {
    return (
        <div className="text-center py-16 px-6 border border-dashed border-slate-700 rounded-2xl">
            <div className="inline-block bg-cyan-900/20 p-5 rounded-full mb-4">
                <Refrigerator size={40} className="text-cyan-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Tu nevera está vacía</h2>
            <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
                Añade los productos que tienes en casa con sus valores nutricionales reales para que tu plan sea
                preciso. Más adelante podrás también escanearlos por código de barras o foto de la etiqueta.
            </p>
            {canCreate ? (
                <button
                    onClick={onCreate}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-3 rounded-xl text-sm font-bold inline-flex items-center gap-2"
                >
                    <Plus size={16} />
                    Crear mi primer producto
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

function FoodCard({ food, onEdit, onDelete, confirmDelete, onConfirmDelete, onCancelDelete }) {
    const cat = Object.values(FOOD_CATEGORIES).find((c) => c.id === food.category) || FOOD_CATEGORIES.OTHER;
    const m = food.macros || {};
    const serving = food.servingSize || (food.defaultUnit === 'g' || food.defaultUnit === 'ml' ? 100 : 1);

    if (confirmDelete) {
        return (
            <li className="bg-rose-950/30 border border-rose-900 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2 text-sm text-rose-200">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>
                        ¿Borrar <strong>{food.name}</strong>? Las comidas que lo usen mostrarán macros vacíos hasta que
                        lo edites.
                    </span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onCancelDelete}
                        className="flex-1 py-2 rounded-lg text-xs font-bold border border-slate-700 text-slate-400 hover:text-white"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirmDelete}
                        className="flex-1 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
                    >
                        Borrar
                    </button>
                </div>
            </li>
        );
    }

    return (
        <li className={`${cat.bg} border ${cat.border} rounded-xl p-4 flex items-center gap-3`}>
            <span className="text-2xl shrink-0">{cat.icon}</span>
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{food.name}</h4>
                    <span className={`text-xs font-mono ${cat.color} shrink-0`}>
                        {Math.round(m.calories || 0)} kcal
                    </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1">
                    P {Math.round(m.protein || 0)}g · C {Math.round(m.carbs || 0)}g · G {Math.round(m.fat || 0)}g
                    <span className="text-slate-600">
                        {' '}
                        · por {serving}
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
            <div className="flex flex-col gap-1 shrink-0">
                <button
                    onClick={onEdit}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    aria-label="Editar"
                >
                    <Edit2 size={14} />
                </button>
                <button
                    onClick={onDelete}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
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
