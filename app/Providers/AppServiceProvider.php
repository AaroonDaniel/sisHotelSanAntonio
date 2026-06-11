<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Auth;
use Spatie\Activitylog\Models\Activity;
use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 🕵️ AUDITORÍA: cada registro de actividad guarda también la IP
        // desde donde se hizo el cambio y el ROL del usuario responsable.
        Activity::saving(function (Activity $activity) {
            $props = collect($activity->properties ?? []);

            // IP de origen
            $ip = request()?->ip();

            // Rol del usuario que hizo el cambio
            $rol = null;
            $user = Auth::user();
            if ($user && method_exists($user, 'getRoleNames')) {
                $rol = $user->getRoleNames()->first();
            }

            $activity->properties = $props->merge([
                'ip'   => $ip,
                'role' => $rol,
            ]);
        });
        \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
            return $user->hasRole('administrador') ? true : null;
        });

    }
}
