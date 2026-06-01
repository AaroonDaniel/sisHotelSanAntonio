<?php

namespace App\Support;

use Carbon\Carbon;

/**
 * Validaciones lógicas (coherencia) de los datos de un huésped.
 * Devuelve un arreglo campo => mensaje. Vacío = todo correcto.
 */
class GuestValidation
{
    public static function coherenceErrors(array $data): array
    {
        $errores = [];

        $nacionalidad = strtoupper(trim((string) ($data['nationality'] ?? '')));
        $expedidoEn   = strtoupper(trim((string) ($data['issued_in'] ?? '')));
        $profesion    = strtoupper(trim((string) ($data['profession'] ?? '')));
        $fechaNac     = $data['birth_date'] ?? null;

        $departamentos = config('catalogos.departamentos_bolivia', []);

        // ¿Boliviano? (acepta país "BOLIVIA" y gentilicio "BOLIVIANA").
        $esBoliviano = str_starts_with($nacionalidad, 'BOLIV');

        // 1) DOCUMENTO según nacionalidad:
        //    Boliviano  -> CI: "Expedido en" debe ser un departamento de Bolivia.
        //    Extranjero -> Pasaporte: "Expedido en" NO puede ser una ciudad boliviana
        //                   (debe ser su país).
        if ($esBoliviano) {
            if ($expedidoEn !== '' && ! in_array($expedidoEn, $departamentos, true)) {
                $errores['issued_in'] = 'Para un huésped boliviano, "Expedido en" debe ser un departamento de Bolivia.';
            }
        } elseif ($nacionalidad !== '' && $nacionalidad !== 'OTRO') {
            if (in_array($expedidoEn, $departamentos, true)) {
                $errores['issued_in'] = 'Un huésped extranjero usa pasaporte: "Expedido en" no puede ser una ciudad de Bolivia.';
            }
        }

        // 2) COHERENCIA EDAD ↔ PROFESIÓN (evita "bebé estudiante").
        if (! empty($fechaNac)) {
            try {
                $edad = Carbon::parse($fechaNac)->age;
                $minEstudiante = (int) config('catalogos.edad_minima_estudiante', 4);
                $minLaboral    = (int) config('catalogos.edad_minima_laboral', 14);
                $noLaborales = ['NINGUNA', 'ESTUDIANTE'];

                if ($edad < $minEstudiante && $profesion !== '' && $profesion !== 'NINGUNA') {
                    $errores['profession'] = "Un huésped de {$edad} año(s) no puede tener la profesión '{$profesion}'. Use 'NINGUNA'.";
                } elseif ($edad < $minLaboral && $profesion !== '' && ! in_array($profesion, $noLaborales, true)) {
                    $errores['profession'] = "Un menor de {$minLaboral} años no puede tener una profesión laboral. Use 'ESTUDIANTE' o 'NINGUNA'.";
                }
            } catch (\Throwable $e) {
                // Si la fecha no es válida, otra regla la reporta.
            }
        }

        return $errores;
    }
}