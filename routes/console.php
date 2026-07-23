<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

// =============================================================================
// 🚀 CÓMO SE DISPARA ESTE SCHEDULER (nada de lo de abajo corre solo)
// =============================================================================
// Los Schedule:: definidos en este archivo NO se ejecutan por sí mismos —
// necesitan que algo externo llame al scheduler de Laravel repetidamente.
// Confirmado en esta sesión: durante mucho tiempo NO hubo nada haciendo esa
// llamada en este servidor, así que la limpieza de reservas No-show de más
// abajo (dailyAt('00:01')) nunca corrió.
//
// DESARROLLO/STAGING (este servidor, ahora mismo):
//   php artisan schedule:work
//   Se deja corriendo en su propia consola (misma idea que ya usamos para
//   `php artisan queue:work`) — revisa el scheduler cada minuto por dentro,
//   sin depender de cron/Task Scheduler del SO. ⚠️ Si esa ventana/consola se
//   cierra, el scheduler entero deja de correr silenciosamente — no hay
//   ningún aviso, simplemente todos los Schedule:: (incluido el de
//   reservas y, a futuro, el cobro diario de Cuentas Grupales) dejan de
//   dispararse hasta que se vuelva a levantar el comando.
//
// PRODUCCIÓN (definitivo — no depende de una consola abierta):
//   Windows Task Scheduler apuntando a un .bat con:
//     cd /d C:\xampp\htdocs\sisHotelSanAntonio && C:\xampp\php\php.exe artisan schedule:run
//   Registrado para correr cada 1 minuto. A diferencia de schedule:work,
//   esto sobrevive a reinicios del servidor y no depende de que nadie deje
//   una ventana abierta.
// =============================================================================

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

// Libro mayor diario de Cuentas Grupales (Fase 1): descuenta el consumo
// de cada día operativo transcurrido contra el saldo prepagado. Corre
// después de la limpieza de reservas de arriba para no competir por lock
// de BD en el mismo minuto exacto.
Schedule::command('groupaccounts:daily-charge')->dailyAt('00:05');