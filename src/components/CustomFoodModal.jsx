import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    X, Save, ChevronDown, ChevronUp, AlertCircle,
    Barcode, Camera, PenLine, Loader2, Info, Lock,
} from 'lucide-react';
import { FOOD_CATEGORIES } from '../data/food_database';
import { usePlan } from '../hooks/usePlan';
import { lookupBarcode, BarcodeErrors } from '../services/barcode';
import BarcodeScanner from './BarcodeScanner';
import { useEntitlements } from '../hooks/useEntitlements';

/**
 * Modal de creación / edición de un custom food (Mi Nevera).
 *
 * Props:
 * - isOpen: bool
 * - onClose: () => void
 * - mode: 'create' | 'edit'
 * - initialFood?: Food          (requerido en edit)
 * - onSaved?: (food) => void    (callback con el food persistido, opcional)
 *
 * Validación delegada a `src/services/foods.js#validateFood` vía las actions
 * `addCustomFood` / `editCustomFood` de usePlan, que lanzan Error con mensaje
 * en español. Capturamos y mostramos el error en el footer.
 */
export default function CustomFoodModal({ isOpen, onClose, mode = 'create', initialFood = null, onSaved }) {
    const { addCustomFood, editCustomFood } = usePlan();
    const entitlements = useEntitlements();

    const [form, setForm] = useState(() => buildEmptyForm());
    const [showOptional, setShowOptional] = useState(false);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    // Barcode / lookup state
    const [scannerOpen, setScannerOpen] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupNotice, setLookupNotice] = useState(null); // {kind: 'info'|'warn', text}

    const firstInputRef = useRef(null);

    // Sync form when modal opens or initialFood changes
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialFood) {
                setForm(foodToForm(initialFood));
                // Si trae macros opcionales, abrir esa sección automáticamente
                const m = initialFood.macros || {};
                if (m.sugars != null || m.fiber != null || m.saturated != null || m.salt != null) {
                    setShowOptional(true);
                }
            } else {
                setForm(buildEmptyForm());
                setShowOptional(false);
            }
            setError(null);
            setLookupNotice(null);
            setLookupLoading(false);
            // autofocus first field
            setTimeout(() => firstInputRef.current?.focus(), 50);
        }
    }, [isOpen, mode, initialFood]);

    // --- Barcode lookup flow ---
    const handleBarcodeDetected = useCallback(async (code) => {
        setScannerOpen(false);
        setLookupNotice(null);
        setError(null);
        setLookupLoading(true);
        try {
            const { food, source } = await lookupBarcode(code);
            // Rellenar form con el resultado. Abrimos opcionales si vienen.
            setForm(foodToForm(food));
            const m = food.macros || {};
            if (m.sugars != null || m.fiber != null || m.saturated != null || m.salt != null) {
                setShowOptional(true);
            }
            setLookupNotice({
                kind: 'info',
                text: source === 'session_cache'
                    ? 'Producto recuperado de caché local — revisa los datos y confirma.'
                    : source === 'cache'
                        ? 'Producto encontrado (ya consultado antes). Revisa los datos y confirma.'
                        : 'Producto encontrado en OpenFoodFacts. Revisa los datos y confirma.',
            });
        } catch (err) {
            // En todos los casos de error limpiamos el form para no dejar
            // datos residuales de escaneos anteriores. Solo en NOT_FOUND
            // preservamos el barcode detectado (lo que hizo el usuario aún
            // sirve: escaneó, el código quedó guardado).
            if (err?.code === BarcodeErrors.NOT_FOUND) {
                setForm({ ...buildEmptyForm(), barcode: code });
                setShowOptional(false);
                setLookupNotice({
                    kind: 'warn',
                    // TODO (Fase 3): cuando la opción "Foto" esté implementada,
                    // destacar el botón foto como acción siguiente natural,
                    // incluso auto-enfocándolo o animándolo para invitar al click.
                    text: 'No encontramos este producto en la base de datos. Muy pronto podrás hacer una foto a la etiqueta para leerla automáticamente. De momento, rellena los campos a mano.',
                });
            } else if (err?.code === BarcodeErrors.UNAVAILABLE) {
                setForm(buildEmptyForm());
                setShowOptional(false);
                setLookupNotice({
                    kind: 'warn',
                    text: err.message || 'Servicio no disponible. Prueba en unos minutos o añade el producto a mano.',
                });
            } else if (err?.code === BarcodeErrors.INVALID) {
                setForm(buildEmptyForm());
                setShowOptional(false);
                setLookupNotice({
                    kind: 'warn',
                    text: 'El código leído no tiene formato válido. Vuelve a intentarlo.',
                });
            } else {
                setForm(buildEmptyForm());
                setShowOptional(false);
                setError(err?.message || 'Error al consultar el código');
            }
        } finally {
            setLookupLoading(false);
        }
    }, []);

    // ESC para cerrar
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') handleCloseAttempt();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, form]);

    if (!isOpen) return null;

    const isDirty = mode === 'create'
        ? Object.values(form).some(v => v !== '' && v !== 'g' && v !== 'protein' && v !== '100')
        : JSON.stringify(form) !== JSON.stringify(foodToForm(initialFood || {}));

    function handleCloseAttempt() {
        if (isDirty && !confirm('¿Descartar los cambios?')) return;
        onClose();
    }

    function setField(key, value) {
        setForm(prev => ({ ...prev, [key]: value }));
    }

    function setMacro(key, value) {
        setForm(prev => ({ ...prev, macros: { ...prev.macros, [key]: value } }));
    }

    // Auto-ajustar servingSize cuando cambia la unidad
    function handleUnitChange(unit) {
        setForm(prev => ({
            ...prev,
            defaultUnit: unit,
            servingSize: (unit === 'g' || unit === 'ml') ? '100' : '1',
        }));
    }

    async function handleSave() {
        setError(null);
        setSaving(true);
        try {
            const payload = formToFood(form);
            let saved;
            if (mode === 'edit' && initialFood) {
                saved = await editCustomFood(initialFood.id, payload);
            } else {
                saved = await addCustomFood(payload);
            }
            if (onSaved) onSaved(saved);
            onClose();
        } catch (e) {
            setError(e?.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
        <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
            onClick={handleCloseAttempt}
        >
            <div
                className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[95vh] flex flex-col animate-in slide-in-from-bottom-8 duration-300"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="custom-food-modal-title"
            >
                {/* Header */}
                <header className="flex items-center justify-between p-5 border-b border-slate-800">
                    <div>
                        <h2 id="custom-food-modal-title" className="text-lg font-bold text-white">
                            {mode === 'edit' ? 'Editar producto' : 'Nuevo producto'}
                        </h2>
                        <p className="text-xs text-slate-500">Mi Nevera</p>
                    </div>
                    <button
                        onClick={handleCloseAttempt}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* Body scrollable */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Source picker: barcode / foto / manual (solo en modo create) */}
                    {mode === 'create' && (
                        <div className="grid grid-cols-3 gap-2">
                            <SourceButton
                                icon={<Barcode size={18} />}
                                label="Código"
                                sublabel="Escanear"
                                color="cyan"
                                disabled={lookupLoading || !entitlements.barcodeScan}
                                locked={!entitlements.barcodeScan}
                                onClick={() => setScannerOpen(true)}
                            />
                            <SourceButton
                                icon={<Camera size={18} />}
                                label="Foto"
                                sublabel="Próximamente"
                                color="amber"
                                disabled
                                comingSoon
                                onClick={() => { /* Fase 3 */ }}
                            />
                            <SourceButton
                                icon={<PenLine size={18} />}
                                label="Manual"
                                sublabel="Formulario"
                                color="blue"
                                active
                                onClick={() => setLookupNotice(null)}
                            />
                        </div>
                    )}

                    {/* Loading del lookup */}
                    {lookupLoading && (
                        <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-xs text-slate-300">
                            <Loader2 size={14} className="animate-spin text-cyan-400 shrink-0" />
                            <span>Buscando producto en OpenFoodFacts…</span>
                        </div>
                    )}

                    {/* Notice del lookup (éxito / not found / error) */}
                    {lookupNotice && (
                        <div
                            className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${
                                lookupNotice.kind === 'warn'
                                    ? 'bg-amber-950/30 border-amber-900/50 text-amber-200'
                                    : 'bg-cyan-950/30 border-cyan-900/50 text-cyan-200'
                            }`}
                        >
                            <Info size={14} className="shrink-0 mt-0.5" />
                            <span>{lookupNotice.text}</span>
                        </div>
                    )}

                    {/* Identidad */}
                    <Section title="Identidad">
                        <Field label="Nombre del producto *">
                            <input
                                ref={firstInputRef}
                                type="text"
                                value={form.name}
                                onChange={e => setField('name', e.target.value)}
                                placeholder="Ej. Pan Bimbo Integral"
                                maxLength={80}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                            />
                        </Field>

                        <Field label="Marca">
                            <input
                                type="text"
                                value={form.brand}
                                onChange={e => setField('brand', e.target.value)}
                                placeholder="Ej. Bimbo (opcional)"
                                maxLength={100}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                            />
                        </Field>

                        {form.barcode && (
                            <div className="flex items-center justify-between gap-2 p-2 bg-slate-950 border border-slate-800 rounded-lg">
                                <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
                                    <Barcode size={12} className="shrink-0 text-cyan-400" />
                                    <span className="font-mono truncate">{form.barcode}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setField('barcode', '')}
                                    className="shrink-0 text-[10px] text-slate-500 hover:text-rose-400 font-bold uppercase tracking-wider"
                                >
                                    Quitar
                                </button>
                            </div>
                        )}

                        <Field label="Categoría *">
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {Object.values(FOOD_CATEGORIES).map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setField('category', cat.id)}
                                        className={`p-2 rounded-lg text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                                            form.category === cat.id
                                                ? `${cat.bg} ${cat.border} ${cat.color}`
                                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                                        }`}
                                    >
                                        <span className="text-base leading-none">{cat.icon}</span>
                                        <span className="leading-none">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Unidad *">
                                <select
                                    value={form.defaultUnit}
                                    onChange={e => handleUnitChange(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                                >
                                    <option value="g">Gramos (g)</option>
                                    <option value="ml">Mililitros (ml)</option>
                                    <option value="pz">Pieza (pz)</option>
                                    <option value="taza">Taza</option>
                                    <option value="cda">Cucharada</option>
                                </select>
                            </Field>

                            <Field label="Por cada *" hint={getServingHint(form.defaultUnit)}>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    step="any"
                                    value={form.servingSize}
                                    onChange={e => setField('servingSize', e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                                />
                            </Field>
                        </div>
                    </Section>

                    {/* Macros principales */}
                    <Section title={`Macros por ${form.servingSize || '?'} ${form.defaultUnit}`}>
                        <div className="grid grid-cols-2 gap-3">
                            <MacroField label="Calorías" unit="kcal" value={form.macros.calories} onChange={v => setMacro('calories', v)} />
                            <MacroField label="Proteínas" unit="g" value={form.macros.protein} onChange={v => setMacro('protein', v)} />
                            <MacroField label="Carbohidratos" unit="g" value={form.macros.carbs} onChange={v => setMacro('carbs', v)} />
                            <MacroField label="Grasas" unit="g" value={form.macros.fat} onChange={v => setMacro('fat', v)} />
                        </div>
                    </Section>

                    {/* Macros opcionales (colapsable) */}
                    <button
                        type="button"
                        onClick={() => setShowOptional(s => !s)}
                        className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors p-2 -mx-2"
                    >
                        <span>Macros adicionales (opcional)</span>
                        {showOptional ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showOptional && (
                        <Section title="Detalle nutricional">
                            <div className="grid grid-cols-2 gap-3">
                                <MacroField label="Azúcares" unit="g" value={form.macros.sugars} onChange={v => setMacro('sugars', v)} />
                                <MacroField label="Fibra" unit="g" value={form.macros.fiber} onChange={v => setMacro('fiber', v)} />
                                <MacroField label="Saturadas" unit="g" value={form.macros.saturated} onChange={v => setMacro('saturated', v)} />
                                <MacroField label="Sal" unit="g" value={form.macros.salt} onChange={v => setMacro('salt', v)} />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">
                                Si la etiqueta indica sodio, multiplícalo por 2.5 para obtener sal.
                            </p>
                        </Section>
                    )}
                </div>

                {/* Footer fijo */}
                <footer className="p-5 border-t border-slate-800 bg-slate-900/95 space-y-3">
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-rose-950/40 border border-rose-900 rounded-lg text-xs text-rose-300">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleCloseAttempt}
                            disabled={saving}
                            className="flex-1 py-3 rounded-xl text-sm font-bold border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Save size={14} />
                            {saving ? 'Guardando…' : (mode === 'edit' ? 'Guardar cambios' : 'Crear producto')}
                        </button>
                    </div>
                </footer>
            </div>
        </div>

        {/* Scanner fuera del panel del modal porque va full-screen encima (z-60) */}
        <BarcodeScanner
            isOpen={scannerOpen}
            onClose={() => setScannerOpen(false)}
            onDetected={handleBarcodeDetected}
        />
        </>
    );
}

// ----------------------------------------------------------------------------
// Subcomponentes
// ----------------------------------------------------------------------------

function SourceButton({ icon, label, sublabel, color, active, disabled, locked, comingSoon, onClick }) {
    const colorClasses = {
        cyan: active
            ? 'bg-cyan-900/40 border-cyan-600 text-cyan-300'
            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-cyan-700 hover:text-cyan-300',
        amber: active
            ? 'bg-amber-900/40 border-amber-600 text-amber-300'
            : 'bg-slate-950 border-slate-800 text-slate-400',
        blue: active
            ? 'bg-blue-900/40 border-blue-600 text-blue-300'
            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-blue-700 hover:text-blue-300',
    };
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`p-3 rounded-xl border text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1 ${colorClasses[color] || colorClasses.blue}`}
        >
            <div className="flex items-center gap-1">
                {icon}
                {locked && <Lock size={10} />}
            </div>
            <div className="text-[11px] font-bold leading-none mt-1">{label}</div>
            <div className="text-[9px] leading-none opacity-70">
                {comingSoon ? 'Próximamente' : sublabel}
            </div>
        </button>
    );
}

function Section({ title, children }) {
    return (
        <section className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
            {children}
        </section>
    );
}

function Field({ label, hint, children }) {
    return (
        <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                {label}
            </label>
            {children}
            {hint && <p className="text-[10px] text-slate-500 mt-1">{hint}</p>}
        </div>
    );
}

function MacroField({ label, unit, value, onChange }) {
    return (
        <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                {label}
            </label>
            <div className="relative">
                <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 pr-10 text-sm text-white outline-none focus:border-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
                    {unit}
                </span>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------------
// Helpers form ↔ food
// ----------------------------------------------------------------------------

function buildEmptyForm() {
    return {
        name: '',
        category: 'protein',
        defaultUnit: 'g',
        servingSize: '100',
        barcode: '',
        brand: '',
        macros: {
            calories: '',
            protein: '',
            carbs: '',
            fat: '',
            sugars: '',
            fiber: '',
            saturated: '',
            salt: '',
        },
    };
}

function foodToForm(food) {
    const m = food.macros || {};
    return {
        name: food.name || '',
        category: food.category || 'protein',
        defaultUnit: food.defaultUnit || 'g',
        servingSize: food.servingSize != null ? String(food.servingSize) : '100',
        barcode: food.barcode || '',
        brand: food.brand || '',
        macros: {
            calories: m.calories != null ? String(m.calories) : '',
            protein: m.protein != null ? String(m.protein) : '',
            carbs: m.carbs != null ? String(m.carbs) : '',
            fat: m.fat != null ? String(m.fat) : '',
            sugars: m.sugars != null ? String(m.sugars) : '',
            fiber: m.fiber != null ? String(m.fiber) : '',
            saturated: m.saturated != null ? String(m.saturated) : '',
            salt: m.salt != null ? String(m.salt) : '',
        },
    };
}

function formToFood(form) {
    const m = form.macros;
    const macros = {
        calories: parseNum(m.calories),
        protein: parseNum(m.protein),
        carbs: parseNum(m.carbs),
        fat: parseNum(m.fat),
    };
    // Solo incluir opcionales si tienen valor real
    if (m.sugars !== '' && m.sugars != null) macros.sugars = parseNum(m.sugars);
    if (m.fiber !== '' && m.fiber != null) macros.fiber = parseNum(m.fiber);
    if (m.saturated !== '' && m.saturated != null) macros.saturated = parseNum(m.saturated);
    if (m.salt !== '' && m.salt != null) macros.salt = parseNum(m.salt);

    const out = {
        name: form.name,
        category: form.category,
        defaultUnit: form.defaultUnit,
        servingSize: parseNum(form.servingSize),
        macros,
    };
    // Preservar barcode y brand si se rellenaron (OFF o manual)
    if (form.barcode && String(form.barcode).trim()) {
        out.barcode = String(form.barcode).trim();
    }
    if (form.brand && String(form.brand).trim()) {
        out.brand = String(form.brand).trim();
    }
    return out;
}

function parseNum(v) {
    if (v === '' || v == null) return 0;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
}

function getServingHint(unit) {
    if (unit === 'g' || unit === 'ml') return 'Normalmente 100';
    if (unit === 'pz') return 'Normalmente 1';
    return '';
}
