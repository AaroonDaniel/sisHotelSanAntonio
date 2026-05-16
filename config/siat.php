<?php
// Archivo: config/siat.php

return [
    'environment' => env('SIAT_ENVIRONMENT', 2),
    'modality' => env('SIAT_MODALITY', 2),
    'token' => env('SIAT_API_TOKEN', ''),
    'system_code' => env('SIAT_SYSTEM_CODE', ''),
    'nit' => env('SIAT_NIT', ''),
    'branch_code' => env('SIAT_BRANCH_CODE', 0),
    'pos_code' => env('SIAT_POS_CODE', 0),

    'cuis' => env('SIAT_CUIS', ''),

    // --- NUEVOS DATOS DESCRIPTIVOS PARA EL XML ---
    'razon_social'         => env('SIAT_RAZON_SOCIAL', 'HOTEL SAN ANTONIO'),
    'municipio'            => env('SIAT_MUNICIPIO', 'Potosi'),
    'direccion'            => env('SIAT_DIRECCION', 'Direccion por defecto'),
    'telefono'             => env('SIAT_TELEFONO', '00000000'),
    'actividad_economica'  => env('SIAT_ACTIVIDAD', '620000'),
    'codigo_producto_sin'  => env('SIAT_PRODUCTO_SIN', '99100'),
    'unidad_medida'        => env('SIAT_UNIDAD_MEDIDA', '58'),
    'leyenda'              => env('SIAT_LEYENDA', 'Ley N° 453: El proveedor deberá entregar el producto en las modalidades y términos ofertados.'),
];