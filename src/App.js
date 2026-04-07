<!DOCTYPE html>

<html class="light" lang="es"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Vitality - Sugar Scanner</title>
<!-- Material Symbols -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<!-- Google Fonts: Manrope & Inter -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&amp;family=Manrope:wght@700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "surface-variant": "#dedce3",
                    "background": "#f8f5fb",
                    "primary-fixed-dim": "#90e28a",
                    "on-surface": "#2e2e32",
                    "surface-container-highest": "#dedce3",
                    "tertiary-fixed-dim": "#ecb200",
                    "error-dim": "#b92902",
                    "surface-bright": "#f8f5fb",
                    "outline-variant": "#aeacb1",
                    "on-primary-container": "#005c15",
                    "surface-container-low": "#f2eff6",
                    "error-container": "#f95630",
                    "primary-fixed": "#9df197",
                    "secondary": "#b5161e",
                    "tertiary": "#755700",
                    "on-surface-variant": "#5c5b60",
                    "secondary-fixed": "#ffc3bd",
                    "tertiary-dim": "#664b00",
                    "on-tertiary-container": "#553e00",
                    "secondary-container": "#ffc3bd",
                    "on-background": "#2e2e32",
                    "outline": "#77767b",
                    "primary": "#176a21",
                    "error": "#b02500",
                    "surface-tint": "#176a21",
                    "primary-container": "#9df197",
                    "on-secondary-fixed-variant": "#a50314",
                    "on-secondary-fixed": "#700009",
                    "on-primary-fixed-variant": "#12661e",
                    "surface": "#f8f5fb",
                    "surface-container-high": "#e4e1e8",
                    "on-error-container": "#520c00",
                    "on-primary-fixed": "#00460e",
                    "on-secondary": "#ffefed",
                    "on-tertiary": "#fff1db",
                    "on-tertiary-fixed-variant": "#604700",
                    "primary-dim": "#025d16",
                    "secondary-fixed-dim": "#ffafa8",
                    "surface-container": "#eae7ee",
                    "secondary-dim": "#a40113",
                    "tertiary-fixed": "#fdc003",
                    "inverse-primary": "#9df197",
                    "surface-dim": "#d5d3db",
                    "on-tertiary-fixed": "#3d2b00",
                    "on-primary": "#d1ffc8",
                    "surface-container-lowest": "#ffffff",
                    "inverse-surface": "#0e0e12",
                    "on-error": "#ffefec",
                    "tertiary-container": "#fdc003",
                    "on-secondary-container": "#940010",
                    "inverse-on-surface": "#9e9ca1"
            },
            "borderRadius": {
                    "DEFAULT": "1rem",
                    "lg": "2rem",
                    "xl": "3rem",
                    "full": "9999px"
            },
            "fontFamily": {
                    "headline": [ "Manrope" ],
                    "body": [ "Inter" ],
                    "label": [ "Inter" ]
            }
          },
        },
      }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        body { font-family: 'Inter', sans-serif; }
        h1, h2, h3 { font-family: 'Manrope', sans-serif; }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-background text-on-background min-h-screen pb-32">
<!-- TopAppBar -->
<header class="bg-white dark:bg-zinc-950 flex items-center justify-between px-6 py-4 w-full h-16 fixed top-0 z-50">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-green-800 dark:text-green-500" data-icon="nutrition">nutrition</span>
<span class="text-green-800 dark:text-green-500 font-manrope font-bold text-lg tracking-tight font-extrabold tracking-tighter">Vitality</span>
</div>
<div class="flex items-center gap-4">
<a class="text-on-surface-variant text-sm font-medium hover:text-primary transition-colors" href="#">@vivosinazucar</a>
<button class="active:scale-95 duration-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 p-2 rounded-full">
<span class="material-symbols-outlined text-zinc-400 dark:text-zinc-600" data-icon="share">share</span>
</button>
</div>
</header>
<main class="pt-20 px-6 max-w-2xl mx-auto space-y-8">
<!-- Trial Limit Alert Bar -->
<div class="bg-secondary-container text-on-secondary-container px-6 py-4 rounded-lg flex items-center gap-4 shadow-sm">
<span class="material-symbols-outlined text-secondary" data-icon="warning">warning</span>
<p class="text-sm font-semibold">Has alcanzado el límite de escaneos gratuitos hoy. <span class="underline">Pásate a Premium</span>.</p>
</div>
<!-- Scanner Hero Component -->
<section class="relative">
<div class="bg-surface-container-lowest rounded-xl p-8 shadow-[0_8px_24px_rgba(46,46,50,0.06)] overflow-hidden relative group">
<!-- Decorative Abstract Background -->
<div class="absolute top-0 right-0 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
<div class="relative z-10 flex flex-col items-center text-center space-y-6">
<div class="w-24 h-24 bg-primary-container rounded-full flex items-center justify-center mb-2">
<span class="material-symbols-outlined text-primary text-5xl" data-icon="barcode_scanner">barcode_scanner</span>
</div>
<div>
<h2 class="text-3xl font-extrabold tracking-tight text-on-surface leading-tight">Analiza tu compra en segundos</h2>
<p class="text-on-surface-variant mt-2 max-w-sm">Detecta azúcares ocultos y toma mejores decisiones para tu salud.</p>
</div>
<!-- Main Action Button -->
<button class="w-full bg-gradient-to-br from-primary to-primary-dim text-on-primary font-bold py-5 px-8 rounded-full shadow-lg active:scale-95 transition-transform duration-200 flex items-center justify-center gap-3">
<span class="material-symbols-outlined" data-icon="photo_camera">photo_camera</span>
                        ESCANEAR ETIQUETA
                    </button>
</div>
</div>
</section>
<!-- Results Verdict Card (Success State) -->
<section class="space-y-6">
<div class="bg-surface-container-low p-1 rounded-xl">
<div class="bg-surface-container-lowest rounded-xl p-6 flex items-start gap-6 relative overflow-hidden">
<!-- Status Indicator Vertical Line Replacement (Space-based) -->
<div class="flex-shrink-0 w-16 h-16 bg-primary-container rounded-lg flex items-center justify-center">
<span class="material-symbols-outlined text-on-primary-container text-4xl" data-icon="check_circle">check_circle</span>
</div>
<div class="space-y-1 flex-1">
<span class="text-primary font-bold text-sm tracking-widest uppercase">VEREDICTO VITALITY</span>
<h3 class="text-4xl font-extrabold text-primary leading-none">SÍ SE PUEDE</h3>
<p class="text-on-surface-variant pt-2 leading-relaxed">Este producto no contiene azúcares añadidos ni edulcorantes perjudiciales detectados.</p>
</div>
</div>
</div>
<!-- Product Detail Info -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
<div class="bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm flex flex-col">
<div class="h-48 w-full bg-zinc-100 relative">
<img alt="healthy yogurt product" class="w-full h-full object-cover" data-alt="Close up of a clean white yogurt container on a minimal background with fresh blueberries nearby" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCuP93prqt1T1xUdbSJlbk8p09tSXBvuKutWpKhSz8100m0gl2vwz0lWcj5Fq5aEGjWpGk5yx1EM5iB3jKXkpjoI7317H8vqWiDR4kvVSKyTtyWVGlLJCcOjTvsHZWCnAlCWu7mS1VaDTDsiuVFQRJSOkoT6UKOuHFYbRv9SRAOxfnqbAG1muuPs862KTiBK_uvknZIJW5xBJ6Tl_ZAOjWyZRrxbI_2XwCWfOiZjYayCExKdrbyoII2QGUvTdiyPdsy-F4_mMJDVco"/>
</div>
<div class="p-6 space-y-3">
<h4 class="text-xl font-bold">Yogur Griego Natural</h4>
<div class="flex gap-2">
<span class="bg-primary-container text-on-primary-container text-[11px] font-bold px-3 py-1 rounded-full uppercase">Saludable</span>
<span class="bg-surface-container-high text-on-surface-variant text-[11px] font-bold px-3 py-1 rounded-full uppercase">Sin Azúcar</span>
</div>
</div>
</div>
<!-- Explanation/Nutritional Insight -->
<div class="bg-surface-container-lowest rounded-lg p-6 flex flex-col justify-between border-l-4 border-primary shadow-sm">
<div class="space-y-4">
<h4 class="font-bold text-on-surface">Análisis de Ingredientes</h4>
<ul class="space-y-3">
<li class="flex items-center gap-3 text-sm">
<span class="material-symbols-outlined text-primary text-lg" data-icon="done">done</span>
<span>Leche entera pasteurizada</span>
</li>
<li class="flex items-center gap-3 text-sm">
<span class="material-symbols-outlined text-primary text-lg" data-icon="done">done</span>
<span>Fermentos lácticos vivos</span>
</li>
<li class="flex items-center gap-3 text-sm">
<span class="material-symbols-outlined text-primary text-lg" data-icon="done">done</span>
<span>0% Jarabe de Maíz</span>
</li>
</ul>
</div>
<div class="mt-6 pt-6 border-t border-surface-container-low">
<p class="text-xs text-on-surface-variant italic">Basado en la guía oficial de @vivosinazucar</p>
</div>
</div>
</div>
</section>
<!-- Amazon Promo Card -->
<section class="bg-tertiary-container/10 rounded-xl p-8 flex flex-col md:flex-row items-center gap-8 border border-tertiary/20">
<div class="w-32 h-44 bg-surface shadow-xl rounded flex-shrink-0 relative transform -rotate-3 overflow-hidden">
<img alt="recipe book cover" class="w-full h-full object-cover" data-alt="A premium cookbook cover with colorful healthy salad photography and elegant typography titled Recipes for Life" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-VHP9cg5EQIa22m1-q5sNKlG25MahfxxyZvK4q2DkImrjmGDyG7fsnXcXmnWSYPnJAEFNhxVklzBKLuOI6NjfUUKtRI6XMeNjafOmo3kxg4Z01qEa8ukCAK_RnsodZLcv_NYxoATYFozKgXhesnuxMiLbKGL-LbG_EoRijDH4eQZzGruvV9kQk_AIYDtGdBWwVMFXlHJ7quk2ILqFhk7ct2TK1-eyPP8DEfyikTWoq6m5-7ytPN7s7O3E9dMR8zoi9PKmJgPPUPA"/>
</div>
<div class="flex-1 text-center md:text-left space-y-4">
<h3 class="text-2xl font-extrabold text-on-tertiary-container">📙 Recetario de Luisa en Amazon</h3>
<p class="text-on-tertiary-container/80 text-sm leading-relaxed">Descubre más de 100 recetas sin azúcar que transformarán tu salud sin sacrificar el sabor.</p>
<button class="bg-tertiary text-on-tertiary font-bold py-3 px-6 rounded-full inline-flex items-center gap-2 hover:bg-tertiary-dim transition-colors">
                    Ver en Amazon
                    <span class="material-symbols-outlined text-sm" data-icon="open_in_new">open_in_new</span>
</button>
</div>
</section>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl shadow-[0_-8px_24px_rgba(46,46,50,0.06)] rounded-t-[3rem]">
<a class="flex flex-col items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full px-6 py-2 active:scale-90 transition-transform duration-300" href="#">
<span class="material-symbols-outlined" data-icon="barcode_scanner">barcode_scanner</span>
<span class="font-manrope font-semibold text-[11px]">Scanner</span>
</a>
<a class="flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 px-6 py-2 hover:text-green-700 dark:hover:text-green-300 active:scale-90 transition-transform duration-300" href="#">
<span class="material-symbols-outlined" data-icon="history">history</span>
<span class="font-manrope font-semibold text-[11px]">Historial</span>
</a>
<a class="flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 px-6 py-2 hover:text-green-700 dark:hover:text-green-300 active:scale-90 transition-transform duration-300" href="#">
<span class="material-symbols-outlined" data-icon="workspace_premium">workspace_premium</span>
<span class="font-manrope font-semibold text-[11px]">Premium</span>
</a>
</nav>
</body></html>
