<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCashAdjustmentRequest extends FormRequest
{
    /**
     * La ruta ya está protegida por el middleware role:administrador; aquí
     * solo se valida la forma y el contenido de los datos.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'in:expense,income'],
            'amount' => [
                'required',
                'numeric',
                'min:0.01',
                function (string $attribute, mixed $value, \Closure $fail) {
                    // 🔒 Candado de los 50 centavos: solo montos enteros o
                    // con .50 exacto (60, 4.50, 100.50...). Se compara en
                    // centavos (enteros) para evitar el clásico error de
                    // punto flotante de "4.50 % 0.5 !== 0" en PHP.
                    $cents = (int) round(((float) $value) * 100);
                    if ($cents % 50 !== 0) {
                        $fail('Solo se permiten montos enteros (ej. 60) o con 50 centavos (ej. 4.50). No se permiten otros decimales.');
                    }
                },
            ],
            'description' => ['nullable', 'string', 'max:255', 'required_if:type,expense'],
            'method' => ['nullable', 'string', 'in:EFECTIVO,QR,TARJETA,TRANSFERENCIA', 'required_if:type,income'],
        ];
    }

    public function messages(): array
    {
        return [
            'description.required_if' => 'La descripción del gasto es obligatoria.',
            'method.required_if' => 'El método de pago del ingreso es obligatorio.',
        ];
    }
}
