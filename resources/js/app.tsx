import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import axios from 'axios';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SessionExpiredModal from './components/SessionExpiredModal';
import { initializeTheme } from './hooks/use-appearance';

const notifySessionExpired = () => {
    window.dispatchEvent(new CustomEvent('session-expired'));
};

// Sesión expirada por inactividad, caso 1: navegación/formularios de
// Inertia (Link, useForm, router.visit/reload). Cuando el middleware
// 'auth' rechaza la petición, Inertia normalmente muestra su propio modal
// crudo con la respuesta del servidor. Lo interceptamos y mostramos el
// nuestro, bloqueando cualquier acción hasta volver a iniciar sesión.
router.on('invalid', (event) => {
    const status = (event.detail.response as any)?.status;
    if (status === 401 || status === 419) {
        event.preventDefault();
        notifySessionExpired();
    }
});

// Sesión expirada por inactividad, caso 2: varias pantallas (checkout,
// checkins, reportes, etc.) llaman a axios directamente en vez de pasar
// por el router de Inertia. Esas peticiones sí satisfacen expectsJson()
// en Laravel, así que ante una sesión vencida reciben el 401 crudo
// {"message":"Unauthenticated."} y cada componente lo mostraba tal cual
// con alert(). Este interceptor global lo captura antes de que llegue al
// catch() de cada pantalla.
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 419) {
            notifySessionExpired();
            // Promesa que nunca resuelve: evita que el catch() local de
            // cada pantalla llegue a disparar su propio alert/mensaje.
            return new Promise(() => {});
        }
        return Promise.reject(error);
    },
);

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
                <SessionExpiredModal />
            </StrictMode>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
