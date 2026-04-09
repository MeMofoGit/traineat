export const FOOD_CATEGORIES = {
    PROTEIN: { id: 'protein', label: 'Proteína', icon: '🥩', color: 'text-rose-400', bg: 'bg-rose-900/20', border: 'border-rose-800' },
    CARBS: { id: 'carbs', label: 'Carbohidratos', icon: '🍚', color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-800' },
    FATS: { id: 'fat', label: 'Grasas', icon: '🥑', color: 'text-yellow-500', bg: 'bg-yellow-900/20', border: 'border-yellow-800' },
    VEGGIES: { id: 'veggies', label: 'Verduras', icon: '🥦', color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-800' },
    FRUIT: { id: 'fruit', label: 'Fruta', icon: '🍎', color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-800' },
    LIQUID: { id: 'liquid', label: 'Líquido', icon: '💧', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-800' },
    OTHER: { id: 'other', label: 'Otro', icon: '📦', color: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-700' }
};

export const FOOD_DATABASE = [
    // PROTEIN
    { id: 'chicken_breast', name: 'Pechuga de Pollo', category: 'protein', defaultUnit: 'g', macros: { protein: 23, carbs: 0, fat: 1, calories: 106 } }, // per 100g
    { id: 'turkey_breast', name: 'Pechuga de Pavo', category: 'protein', defaultUnit: 'g', macros: { protein: 24, carbs: 0, fat: 1, calories: 110 } },
    { id: 'beef_lean', name: 'Ternera Magra', category: 'protein', defaultUnit: 'g', macros: { protein: 26, carbs: 0, fat: 5, calories: 150 } },
    { id: 'egg', name: 'Huevo Entero', category: 'protein', defaultUnit: 'pz', macros: { protein: 6, carbs: 0.5, fat: 5, calories: 70 } }, // per unit (approx 50g)
    { id: 'egg_whites', name: 'Claras de Huevo', category: 'protein', defaultUnit: 'ml', macros: { protein: 11, carbs: 0, fat: 0, calories: 52 } }, // per 100ml
    { id: 'white_fish', name: 'Pescado Blanco', category: 'protein', defaultUnit: 'g', macros: { protein: 18, carbs: 0, fat: 1, calories: 85 } },
    { id: 'salmon', name: 'Salmón', category: 'protein', defaultUnit: 'g', macros: { protein: 20, carbs: 0, fat: 13, calories: 208 } },
    { id: 'tuna_can', name: 'Atún en Lata', category: 'protein', defaultUnit: 'g', macros: { protein: 25, carbs: 0, fat: 1, calories: 110 } },
    { id: 'whey_protein', name: 'Whey Protein', category: 'protein', defaultUnit: 'g', macros: { protein: 80, carbs: 5, fat: 2, calories: 380 } }, // per 100g powder
    { id: 'tofu', name: 'Tofu', category: 'protein', defaultUnit: 'g', macros: { protein: 8, carbs: 2, fat: 5, calories: 76 } },
    { id: 'heura', name: 'Heura', category: 'protein', defaultUnit: 'g', macros: { protein: 19, carbs: 1, fat: 3, calories: 136 } },
    { id: 'seitan', name: 'Seitán', category: 'protein', defaultUnit: 'g', macros: { protein: 24, carbs: 6, fat: 2, calories: 140 } },
    { id: 'yogurt_greek', name: 'Yogur Griego', category: 'protein', defaultUnit: 'g', macros: { protein: 10, carbs: 3, fat: 0, calories: 59 } },
    { id: 'cottage_cheese', name: 'Queso Batido 0%', category: 'protein', defaultUnit: 'g', macros: { protein: 8, carbs: 3, fat: 0, calories: 46 } },

    // CARBS
    { id: 'rice_white', name: 'Arroz Blanco', category: 'carbs', defaultUnit: 'g', macros: { protein: 2, carbs: 28, fat: 0, calories: 130 } }, // Cooked? Usually raw in planning. Let's assume RAW for precision or specify. Standard in fitness is RAW weight.
    // Actually, "Arroz Blanco" usually implies RAW weight in diet plans unless specified "cocido".
    // 100g RAW rice: ~78g carbs, ~360 kcal.
    // 100g COOKED rice: ~28g carbs, ~130 kcal.
    // Let's assume RAW for grains as it's standard for calculating macros precisely.
    // BUT many apps use cooked for simplicity. 
    // Given the previous context "60g Avena (o 80g Pan)", likely raw/dry weights.
    { id: 'rice_white_raw', name: 'Arroz (Crudo)', category: 'carbs', defaultUnit: 'g', macros: { protein: 7, carbs: 78, fat: 1, calories: 360 } },
    { id: 'rice_basmati_raw', name: 'Arroz Basmati (Crudo)', category: 'carbs', defaultUnit: 'g', macros: { protein: 8, carbs: 77, fat: 1, calories: 350 } },
    { id: 'pasta_raw', name: 'Pasta (Crudo)', category: 'carbs', defaultUnit: 'g', macros: { protein: 12, carbs: 75, fat: 1.5, calories: 370 } },
    { id: 'potato', name: 'Patata', category: 'carbs', defaultUnit: 'g', macros: { protein: 2, carbs: 17, fat: 0, calories: 77 } }, // Raw potato
    { id: 'sweet_potato', name: 'Boniato', category: 'carbs', defaultUnit: 'g', macros: { protein: 1.6, carbs: 20, fat: 0, calories: 86 } },
    { id: 'oats', name: 'Avena', category: 'carbs', defaultUnit: 'g', macros: { protein: 13, carbs: 60, fat: 7, calories: 370 } },
    { id: 'bread_whole', name: 'Pan Integral', category: 'carbs', defaultUnit: 'g', macros: { protein: 9, carbs: 49, fat: 3, calories: 250 } },
    { id: 'quinoa_raw', name: 'Quinoa (Cruda)', category: 'carbs', defaultUnit: 'g', macros: { protein: 14, carbs: 64, fat: 6, calories: 368 } },
    { id: 'corn_flakes', name: 'Copos de Maíz', category: 'carbs', defaultUnit: 'g', macros: { protein: 7, carbs: 84, fat: 1, calories: 370 } },
    { id: 'rice_cakes', name: 'Tortitas Arroz', category: 'carbs', defaultUnit: 'pz', macros: { protein: 0.8, carbs: 6.5, fat: 0.2, calories: 30 } }, // per unit (~8g)

    // FATS
    { id: 'olive_oil', name: 'Aceite de Oliva (AOVE)', category: 'fat', defaultUnit: 'ml', macros: { protein: 0, carbs: 0, fat: 100, calories: 884 } }, // ml roughly g
    { id: 'avocado', name: 'Aguacate', category: 'fat', defaultUnit: 'g', macros: { protein: 2, carbs: 9, fat: 15, calories: 160 } },
    { id: 'walnuts', name: 'Nueces', category: 'fat', defaultUnit: 'g', macros: { protein: 15, carbs: 14, fat: 65, calories: 654 } },
    { id: 'almonds', name: 'Almendras', category: 'fat', defaultUnit: 'g', macros: { protein: 21, carbs: 22, fat: 50, calories: 579 } },
    { id: 'peanut_butter', name: 'Crema Cacahuete', category: 'fat', defaultUnit: 'g', macros: { protein: 25, carbs: 20, fat: 50, calories: 588 } },
    { id: 'dark_chocolate', name: 'Chocolate >85%', category: 'fat', defaultUnit: 'g', macros: { protein: 9, carbs: 20, fat: 50, calories: 580 } },
    { id: 'chia_seeds', name: 'Semillas Chía', category: 'fat', defaultUnit: 'g', macros: { protein: 17, carbs: 42, fat: 31, calories: 486 } },

    // VEGGIES (Assuming very low cal, mostly for tracking fiber/volume)
    { id: 'broccoli', name: 'Brócoli', category: 'veggies', defaultUnit: 'g', macros: { protein: 2.8, carbs: 7, fat: 0.4, calories: 34 } },
    { id: 'green_beans', name: 'Judías Verdes', category: 'veggies', defaultUnit: 'g', macros: { protein: 1.8, carbs: 7, fat: 0.1, calories: 31 } },
    { id: 'spinach', name: 'Espinacas', category: 'veggies', defaultUnit: 'g', macros: { protein: 2.9, carbs: 3.6, fat: 0.4, calories: 23 } },
    { id: 'zucchini', name: 'Calabacín', category: 'veggies', defaultUnit: 'g', macros: { protein: 1.2, carbs: 3, fat: 0.3, calories: 17 } },
    { id: 'salad_mix', name: 'Mezcla Ensalada', category: 'veggies', defaultUnit: 'g', macros: { protein: 1, carbs: 3, fat: 0, calories: 15 } },
    { id: 'peppers', name: 'Pimientos', category: 'veggies', defaultUnit: 'g', macros: { protein: 1, carbs: 6, fat: 0, calories: 26 } },
    { id: 'mushroom', name: 'Champiñones', category: 'veggies', defaultUnit: 'g', macros: { protein: 3, carbs: 3, fat: 0, calories: 22 } },
    { id: 'tomato', name: 'Tomate', category: 'veggies', defaultUnit: 'g', macros: { protein: 0.9, carbs: 3.9, fat: 0.2, calories: 18 } },
    { id: 'carrot', name: 'Zanahoria', category: 'veggies', defaultUnit: 'g', macros: { protein: 0.9, carbs: 10, fat: 0.2, calories: 41 } },

    // FRUIT
    { id: 'banana', name: 'Plátano', category: 'fruit', defaultUnit: 'pz', macros: { protein: 1.3, carbs: 27, fat: 0.4, calories: 105 } }, // medium (~118g)
    { id: 'apple', name: 'Manzana', category: 'fruit', defaultUnit: 'pz', macros: { protein: 0.5, carbs: 25, fat: 0.3, calories: 95 } }, // medium
    { id: 'pear', name: 'Pera', category: 'fruit', defaultUnit: 'pz', macros: { protein: 0.6, carbs: 27, fat: 0.2, calories: 100 } },
    { id: 'orange', name: 'Naranja', category: 'fruit', defaultUnit: 'pz', macros: { protein: 1.2, carbs: 15, fat: 0.2, calories: 62 } },
    { id: 'blueberries', name: 'Arándanos', category: 'fruit', defaultUnit: 'g', macros: { protein: 0.7, carbs: 14, fat: 0.3, calories: 57 } },
    { id: 'strawberries', name: 'Fresas', category: 'fruit', defaultUnit: 'g', macros: { protein: 0.7, carbs: 8, fat: 0.3, calories: 32 } },
    { id: 'kiwi', name: 'Kiwi', category: 'fruit', defaultUnit: 'pz', macros: { protein: 0.8, carbs: 10, fat: 0.4, calories: 42 } }, // ~70g
    { id: 'pineapple', name: 'Piña', category: 'fruit', defaultUnit: 'g', macros: { protein: 0.5, carbs: 13, fat: 0.1, calories: 50 } },
    { id: 'melon', name: 'Melón', category: 'fruit', defaultUnit: 'g', macros: { protein: 0.8, carbs: 8, fat: 0.2, calories: 34 } },

    // LIQUIDS / OTHER
    { id: 'water', name: 'Agua', category: 'liquid', defaultUnit: 'ml', macros: { protein: 0, carbs: 0, fat: 0, calories: 0 } },
    { id: 'coffee', name: 'Café', category: 'liquid', defaultUnit: 'ml', macros: { protein: 0.1, carbs: 0, fat: 0, calories: 2 } },
    { id: 'tea', name: 'Té', category: 'liquid', defaultUnit: 'ml', macros: { protein: 0, carbs: 0, fat: 0, calories: 1 } },
];
