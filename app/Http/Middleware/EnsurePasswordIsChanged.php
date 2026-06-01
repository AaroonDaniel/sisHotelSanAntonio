<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordIsChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if ($user && $user->must_change_password) {
            $emitida = $user->password_changed_at ?? $user->created_at;
            $fechaLimite = $emitida->copy()->addDays(2);

            // Pasaron 2 días sin cambiarla -> desactivar y cerrar sesión.
            if (now()->greaterThanOrEqualTo($fechaLimite)) {
                $user->update(['is_active' => false]);
                \Illuminate\Support\Facades\Cache::forget('active_users');
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('login')->with(
                    'status',
                    'Su cuenta fue desactivada por no cambiar la contraseña en 2 días. Contacte al administrador.'
                );
            }

            // Dentro del plazo: redirección OBLIGATORIA a la pantalla intermedia.
            $permitida = $request->routeIs('password.force', 'password.force.update', 'logout')
                || $request->is('logout');

            if (! $permitida) {
                return redirect()->route('password.force');
            }
        }

        return $next($request);
    }
}
