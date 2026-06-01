<?php

/**
 * Catálogos controlados del sistema (listas cerradas).
 * Evitan el texto libre en nacionalidad, lugar de expedición y profesión.
 */

return [

    // Nacionalidad / país. Lista cerrada (no se puede escribir "OR" ni inventar países).
    'nacionalidades' => [
        'BOLIVIA',
        'ARGENTINA',
        'BRASIL',
        'CHILE',
        'PARAGUAY',
        'PERU',
        'URUGUAY',
        'COLOMBIA',
        'ECUADOR',
        'VENEZUELA',
        'MEXICO',
        'ESTADOS UNIDOS',
        'CANADA',
        'ESPAÑA',
        'FRANCIA',
        'ALEMANIA',
        'ITALIA',
        'PAISES BAJOS',
        'REINO UNIDO',
        'CHINA',
        'JAPON',
        'OTRO',
    ],

    // Departamentos de Bolivia. Solo válidos como "Expedido en" de un huésped boliviano (CI).
    'departamentos_bolivia' => [
        'LA PAZ',
        'COCHABAMBA',
        'SANTA CRUZ',
        'ORURO',
        'POTOSI',
        'TARIJA',
        'CHUQUISACA',
        'BENI',
        'PANDO',
    ],

    // Profesiones / ocupaciones controladas.
    'profesiones' => [
        'NINGUNA',
        'ESTUDIANTE',
        'COMERCIANTE',
        'EMPLEADO',
        'PROFESIONAL',
        'INGENIERO',
        'ABOGADO',
        'MEDICO',
        'DOCENTE',
        'CHOFER',
        'AGRICULTOR',
        'AMA DE CASA',
        'JUBILADO',
        'MILITAR',
        'POLICIA',
        'INDEPENDIENTE',
        'OTRO',
    ],

    // Reglas de coherencia edad ↔ profesión.
    'edad_minima_estudiante' => 4,   // antes de los 4 años no puede ser ESTUDIANTE (un bebé no estudia)
    'edad_minima_laboral' => 14,     // antes de los 14 años no puede tener profesión laboral
];