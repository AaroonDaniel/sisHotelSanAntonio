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
                return redirect()
                    ->route('user-password.edit')
                    ->with('warning', 'Por seguridad, debe cambiar su contraseña antes de continuar.');
            }
        }

        return $next($request);
    }
}