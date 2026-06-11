<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache; // <-- 1. IMPORTANTE: Agregamos la clase Cache

class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();

        // Lógica de Autenticación
        Fortify::authenticateUsing(function (Request $request) {

            // 1. Buscamos el usuario (Fortify ya nos manda el nickname en minúsculas)
            $user = User::query()->where('nickname', $request->nickname)->first();
            // 2. Verificamos contraseña y estado activo
            if (
                $user &&
                Hash::check($request->password, $user->password) &&
                $user->is_active
            ) {
                return $user;
            }

            return null;
        });
    }

    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    private function configureViews(): void
    {
        // Convertimos la función flecha (fn) a una función normal para poder agregar lógica
        Fortify::loginView(function (Request $request) {

            // 1. EL TRUCO: Borramos la memoria de la "URL prevista" de Laravel
            $request->session()->forget('url.intended');

            // 2. Retornamos la vista de Inertia optimizada
            return Inertia::render('auth/login', [
                // OPTIMIZACIÓN: Guardamos los usuarios en caché por 1 hora (3600 seg) 
                // y traemos solo los campos estrictamente necesarios por seguridad
                'users' => Cache::remember('active_users', 3600, function () {
                    return \App\Models\User::select('id', 'nickname', 'full_name')
                        ->where('is_active', true)
                        ->get();
                }),
                'canResetPassword' => Features::enabled(Features::resetPasswords()),
                'status' => $request->session()->get('status'),
            ]);
        });

        // ... resto de tus vistas ...
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())) . '|' . $request->ip());
            return Limit::perMinute(100)->by($throttleKey);
        });

    }
}
