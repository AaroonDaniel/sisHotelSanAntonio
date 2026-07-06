<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureGodModeAccess
{
    /**
     * Nickname exacto del único usuario autorizado a entrar al "God Mode".
     * Chequeo estricto por nickname (NO por roles/permisos de Spatie):
     * este módulo edita datos crudos sin las validaciones de negocio
     * normales, por lo que debe quedar fuera del sistema de permisos.
     */
    private const AUTHORIZED_NICKNAME = 'aaron';

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->nickname !== self::AUTHORIZED_NICKNAME) {
            abort(403, 'Acceso restringido: este módulo es exclusivo del administrador principal.');
        }

        return $next($request);
    }
}
