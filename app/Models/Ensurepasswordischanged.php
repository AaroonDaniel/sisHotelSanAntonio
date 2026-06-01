<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordIsChanged
{
    /**
     * Si el usuario autenticado tiene la bandera must_change_password activa,
     * lo obliga a ir a la pantalla de cambio de contraseña antes de poder
     * usar cualquier otra parte del sistema.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && $user->must_change_password) {
            // Rutas permitidas mientras el cambio sigue pendiente:
            // la propia pantalla de cambio de contraseña, el logout y el
            // flujo de doble factor (Fortify).
            $rutasPermitidas = [
                'user-password.edit',
                'user-password.update',
                'logout',
            ];

            $esRutaPermitida = $request->routeIs($rutasPermitidas)
                || $request->is('settings/password')
                || $request->is('logout')
                || $request->is('two-factor*');

            if (! $esRutaPermitida) {
                // Para peticiones Inertia/normales redirigimos a la pantalla
                // de cambio de contraseña con un mensaje claro.
                return redirect()
                    ->route('user-password.edit')
                    ->with('warning', 'Por seguridad, debe cambiar su contraseña antes de continuar.');
            }
        }

        return $next($request);
    }
}