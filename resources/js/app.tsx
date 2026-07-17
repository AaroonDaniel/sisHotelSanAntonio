import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';

// 🚀 Blindaje global contra alteración accidental de campos numéricos: los
// navegadores incrementan/decrementan un <input type="number"> ENFOCADO al
// pasar la rueda del mouse sobre él, sin necesidad de hacer clic en las
// flechas. Esto pasa en Adelantos, Asignación, Devoluciones, Gastos,
// Apertura/Cierre de caja... en TODO el sistema, así que se soluciona una
// sola vez aquí en vez de tocar cada input individualmente. Debe ser
// { passive: false } porque llama a preventDefault().
document.addEventListener(
    'wheel',
    (e) => {
        const target = e.target;
        if (
            target instanceof HTMLInputElement &&
            target.type === 'number' &&
            document.activeElement === target
        ) {
            e.preventDefault();
        }
    },
    { passive: false },
);

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <StrictMode>
                <App {...props} />
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
