<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    // 1. Obtenemos la fecha de ayer en Bolivia
    $yesterday = Carbon::now('America/La_Paz')->subDay()->format('Y-m-d');

    // 2. Buscamos y cancelamos las reservas estancadas
    $canceladas = Reservation::whereIn('status', ['pendiente', 'confirmada'])
        ->where('arrival_date', '<=', $yesterday)
        ->update(['status' => 'cancelada']);

    // 3. Guardamos un registro (log) si se canceló algo para tener un historial
    if ($canceladas > 0) {
        Log::info("Limpieza automática: Se cancelaron {$canceladas} reservas vencidas (No-show).");
    }
})->dailyAt('00:01');