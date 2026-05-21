<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Illuminate\Support\Facades\Cache; // <-- 1. IMPORTANTE: Importamos la clase Cache

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(\Illuminate\Foundation\Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user() ? array_merge($request->user()->toArray(), [
                    'roles' => $request->user()->getRoleNames(),
                    'permissions' => $request->user()->getAllPermissions()->pluck('name'),
                ]) : null,

                // 2. OPTIMIZACIÓN: Guardamos el estado de la caja en caché por 5 minutos (300 segundos).
                // La clave de caché es única por usuario (ej. active_register_user_5)
                'active_register' => $request->user()
                    ? Cache::remember('active_register_user_' . $request->user()->id, 300, function () use ($request) {
                        // Agregamos query() aquí para quitar el error del editor 👇
                        return \App\Models\CashRegister::query()
                            ->where('user_id', $request->user()->id)
                            ->where('status', 'ABIERTA')
                            ->first();
                    })
                    : null,
            ],

            'flash' => [
                'success' => fn() => $request->session()->get('success'),
                'error' => fn() => $request->session()->get('error'),
                'auto_open_checkins' => fn() => $request->session()->get('auto_open_checkins'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
