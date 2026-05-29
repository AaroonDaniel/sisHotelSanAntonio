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
                    // Cacheamos roles 5 min por usuario
                    'roles' => Cache::remember(
                        "user_roles_{$user->id}",
                        300,
                        fn () => $user->getRoleNames()->toArray()
                    ),
                    // Cacheamos permisos 5 min por usuario
                    'permissions' => Cache::remember(
                        "user_permissions_{$user->id}",
                        300,
                        fn () => $user->getAllPermissions()->pluck('name')->toArray()
                    ),
                ]) : null,

                // Estado de caja (ya lo tenías cacheado, sin cambios)
                'active_register' => $user
                    ? Cache::remember('active_register_user_' . $user->id, 300, function () use ($user) {
                        return \App\Models\CashRegister::query()
                            ->where('user_id', $user->id)
                            ->where('status', 'ABIERTA')
                            ->first();
                    })
                    : null,
            ],

            'flash' => [
                'success'            => fn () => $request->session()->get('success'),
                'error'              => fn () => $request->session()->get('error'),
                'auto_open_checkins' => fn () => $request->session()->get('auto_open_checkins'),
            ],

            'sidebarOpen' => ! $request->hasCookie('sidebar_state')
                || $request->cookie('sidebar_state') === 'true',
        ];
    }
}