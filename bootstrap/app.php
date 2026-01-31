<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

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
        ]);
        
        // 2. Configurar CORS manualmente aquí si no tienes el archivo config/cors.php
        $middleware->validateCsrfTokens(except: [
            // Solo si el error persiste, puedes añadir rutas aquí para probar,
            // pero con statefulApi() debería bastar.
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();