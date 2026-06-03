<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Request;

class TurnstileToken implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (empty($value)) {
            $fail('Por favor, confirma que no eres un robot.');
            return;
        }

        $response = Http::asForm()->post(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            [
                'secret'   => config('services.turnstile.secret_key'),
                'response' => $value,
                'remoteip' => Request::ip(),
            ]
        );

        if (! ($response->json('success') === true)) {
            $fail('La verificación de seguridad falló. Inténtalo de nuevo.');
        }
    }
}