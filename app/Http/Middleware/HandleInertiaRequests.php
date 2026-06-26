<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Illuminate\Support\Facades\Cache;

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
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();

        return [
            ...parent::share($request),
            'name'  => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],

            'auth' => [
                'user' => $user ? array_merge($user->toArray(), [
                    'roles' => Cache::remember(
                        "user_roles_{$user->id}",
                        300,
                        fn() => $user->getRoleNames()->toArray()
                    ),
                    'permissions' => Cache::remember(
                        "user_permissions_{$user->id}",
                        300,
                        fn() => $user->getAllPermissions()->pluck('name')->toArray()
                    ),
                ]) : null,

                // SOLUCIÓN: Consulta en tiempo real, sin caché
                'active_register' => $user
                    ? \App\Models\CashRegister::query()
                    ->where('user_id', $user->id)
                    ->where('status', 'ABIERTA')
                    ->first()
                    : null,
            ],
            'flash' => [
                'success'            => fn() => $request->session()->get('success'),
                'error'              => fn() => $request->session()->get('error'),
                'warning'            => fn() => $request->session()->get('warning'),
                'info'               => fn() => $request->session()->get('info'),
                'db_error'           => fn() => $request->session()->get('db_error'),
                'db_error_nonce'     => fn() => $request->session()->get('db_error_nonce'),
            ],

            'sidebarOpen' => ! $request->hasCookie('sidebar_state')
                || $request->cookie('sidebar_state') === 'true',
            'turnsSiteKey' => config('services.turnstile.site_key'),
        ];
    }
}
