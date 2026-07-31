<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Auth;
use Spatie\Activitylog\Models\Activity;
use Illuminate\Support\Facades\Gate;
use Illuminate\Database\Eloquent\Model;
use App\Models\Checkin;
use App\Models\CheckinGuest;
use App\Observers\CheckinObserver;
use App\Observers\CheckinGuestObserver;

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
        // 🚀 PERFORMANCE: fuera de producción, cualquier acceso a una
        // relación NO precargada (N+1 real) lanza LazyLoadingViolationException
        // en vez de disparar una query silenciosa. Es una alarma de
        // desarrollo, no una optimización en sí — su valor es forzar a
        // corregir el with() que falta apenas se detecta, antes de llegar
        // a producción. Puede hacer estallar rutas que hoy dependen de
        // lazy loading sin auditar; conviene navegar el sistema completo
        // después de este cambio para encontrarlas todas.
        Model::preventLazyLoading(!app()->isProduction());

        // 🕵️ AUDITORÍA: cada registro de actividad guarda también la IP
        // desde donde se hizo el cambio y el ROL del usuario responsable.
        //
        // 🚀 TERMINAL COMPARTIDA: bajo el terminal genérico ('recepcion'),
        // varios modelos (Checkin, Payment, Expense, CashRegister, ahora
        // también Invoice y Reservation) reasignan el causer real al
        // operador elegido en OperatorSelector vía tapActivity() -- eso
        // corre ANTES de este listener (dentro de ActivityLogger, antes
        // de ->save()), así que $activity->causer ya refleja al operador
        // correcto cuando existe. Leer el rol de ahí (no de Auth::user())
        // evita que la columna "Rol" siga mostrando 'recepcionista' del
        // terminal aunque la columna "Usuario" ya muestre al operador real.
        Activity::saving(function (Activity $activity) {
            $props = collect($activity->properties ?? []);

            // IP de origen
            $ip = request()?->ip();

            // Rol del responsable real de la acción (causer ya resuelto,
            // con fallback a Auth::user() si ningún tapActivity() lo tocó).
            $causer = $activity->causer ?? Auth::user();
            $rol = null;
            if ($causer && method_exists($causer, 'getRoleNames')) {
                $rol = $causer->getRoleNames()->first();
            }

            $activity->properties = $props->merge([
                'ip'   => $ip,
                'role' => $rol,
            ]);
        });
        \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
            return $user->hasRole('administrador') ? true : null;
        });

        // 🚀 PRECIO POR HUÉSPED (Fase 0, sin conectar a ningún flujo de
        // edición real todavía): mantiene checkins.agreed_price
        // sincronizado como titular_price + Σ checkin_guests.price.
        Checkin::observe(CheckinObserver::class);
        CheckinGuest::observe(CheckinGuestObserver::class);
    }
}
