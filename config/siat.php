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
];