<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use App\Http\Middleware\EnsurePasswordIsChanged; // <- Importa el middleware que creamos

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // 1. Decirle a Laravel que confíe en las cookies de la IP pública para Sanctum
        $middleware->statefulApi(); 

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            EnsurePasswordIsChanged::class, // <- Agrega este middleware para forzar el cambio de contraseña
        ]);
        
        // 2. Configurar CORS manualmente aquí si no tienes el archivo config/cors.php
        // 2. Configurar CORS manualmente aquí si no tienes el archivo config/cors.php
        $middleware->validateCsrfTokens();

        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Errores SQL (integridad referencial, etc.) -> NO mostramos el SQL al
        // usuario. Registramos el detalle internamente y devolvemos un mensaje
        // amigable que el frontend mostrará como modal "Operación no permitida".
        $exceptions->render(function (\Illuminate\Database\QueryException $e, \Illuminate\Http\Request $request) {
            \Illuminate\Support\Facades\Log::error('Error SQL capturado: ' . $e->getMessage(), [
                'sql'  => $e->getSql(),
                'url'  => $request->fullUrl(),
                'user' => optional($request->user())->id,
            ]);

            // SQLSTATE 23000 = violación de integridad (p. ej. llave foránea).
            $esIntegridad = ($e->errorInfo[0] ?? null) === '23000';

            $mensaje = $esIntegridad
                ? 'No se permite esta operación: el registro está vinculado a otros datos del sistema, por lo que no puede eliminarse ni modificarse.'
                : 'No se pudo completar el proceso por un error en la base de datos. Intente nuevamente o contacte al administrador.';

            if ($request->header('X-Inertia')) {
                // 303 para que Inertia rehaga la visita con GET tras un DELETE/PUT.
                // El nonce único garantiza que el modal reaparezca CADA vez,
                // aunque el mensaje de error sea idéntico al anterior.
                return back()
                    ->with('db_error', $mensaje)
                    ->with('db_error_nonce', (string) \Illuminate\Support\Str::uuid())
                    ->setStatusCode(303);
            }

            return back()
                ->with('db_error', $mensaje)
                ->with('db_error_nonce', (string) \Illuminate\Support\Str::uuid());
        });

        // 403 (sin permisos) -> pantalla propia "Acceso denegado" en vez de la fea de Laravel.
        $exceptions->respond(function (\Symfony\Component\HttpFoundation\Response $response, \Throwable $e, \Illuminate\Http\Request $request) {
            if ($response->getStatusCode() === 403 && ! $request->expectsJson()) {
                return \Inertia\Inertia::render('errors/Forbidden')
                    ->toResponse($request)
                    ->setStatusCode(403);
            }
            return $response;
        });
    })->create();