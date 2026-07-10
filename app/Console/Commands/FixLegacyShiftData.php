<?php

namespace App\Console\Commands;

use App\Models\CashRegister;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Reparación de datos legacy antes de arrancar el sistema de Turnos de Caja.
 *
 * Bajo Terminal Compartida el dinero se atribuye a `operator_id` (no a
 * `user_id`, que en filas nuevas es siempre la cuenta genérica
 * 'recepcion'). En filas ANTERIORES a que `operator_id`/`cash_register_id`
 * existieran, `user_id` SÍ era la identidad real del recepcionista
 * (columna obligatoria desde el origen de checkins/payments/expenses), así
 * que ese es el dato correcto para heredar — no un valor inventado. Solo se
 * recurre al Administrador cuando ni siquiera `user_id` sirve (apunta a una
 * cuenta de sistema: 'recepcion' o 'sistema_web').
 *
 * Idempotente: cada paso solo toca filas con la columna NULA, así que
 * correrlo una segunda vez no encuentra nada que cambiar.
 */
class FixLegacyShiftData extends Command
{
    protected $signature = 'app:fix-legacy-shift-data {--dry-run : Solo mostrar el diagnóstico, sin escribir en la base de datos} {--force : No pedir confirmación interactiva}';

    protected $description = 'Repara checkins/payments/expenses legacy sin operador o sin turno (cash_register_id) asignado, antes de desplegar el sistema de Turnos de Caja';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $admin = User::role('administrador')->orderBy('id')->first();
        if (!$admin) {
            $this->error('No se encontró ningún usuario con rol "administrador". Abortando: se necesita como destino por defecto.');
            return self::FAILURE;
        }

        $systemUserIds = User::whereIn('nickname', ['recepcion', 'sistema_web'])->pluck('id')->all();

        // =========================================================
        // DIAGNÓSTICO (antes de tocar nada)
        // =========================================================
        $checkinsSinOperador = DB::table('checkins')->whereNull('checkin_operator_id')->count();
        $checkinsSinCheckout = DB::table('checkins')->whereNull('checkout_operator_id')->where('status', 'finalizado')->count();
        $paymentsSinOperador = DB::table('payments')->whereNull('operator_id')->count();
        $paymentsSinCaja = DB::table('payments')->whereNull('cash_register_id')->count();
        $expensesSinOperador = DB::table('expenses')->whereNull('operator_id')->count();

        $this->info('=== Diagnóstico de datos legacy ===');
        $this->line("Checkins sin checkin_operator_id: {$checkinsSinOperador}");
        $this->line("Checkins finalizados sin checkout_operator_id: {$checkinsSinCheckout}");
        $this->line("Payments sin operator_id: {$paymentsSinOperador}");
        $this->line("Payments sin cash_register_id: {$paymentsSinCaja}");
        $this->line("Expenses sin operator_id: {$expensesSinOperador}");
        $this->line("Usuario Administrador de respaldo: {$admin->full_name} (ID {$admin->id})");

        $totalAReparar = $checkinsSinOperador + $checkinsSinCheckout + $paymentsSinOperador + $paymentsSinCaja + $expensesSinOperador;

        if ($totalAReparar === 0) {
            $this->info('Nada que reparar. La base de datos ya está limpia.');
            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->warn('--dry-run: no se escribió nada. Corra sin esta opción para aplicar la reparación.');
            return self::SUCCESS;
        }

        if (!$this->option('force') && !$this->confirm("¿Aplicar la reparación de {$totalAReparar} fila(s) legacy ahora? Se recomienda respaldo previo de la base de datos.")) {
            $this->warn('Cancelado por el usuario.');
            return self::SUCCESS;
        }

        DB::transaction(function () use ($admin, $systemUserIds, $paymentsSinCaja) {
            // =========================================================
            // 1. CHECKINS — checkin_operator_id
            //    Prioridad: heredar el user_id original (identidad real
            //    pre-Terminal-Compartida). Solo cae al Admin si user_id
            //    también apunta a una cuenta de sistema.
            // =========================================================
            DB::table('checkins')
                ->whereNull('checkin_operator_id')
                ->whereNotIn('user_id', $systemUserIds)
                ->update(['checkin_operator_id' => DB::raw('user_id')]);

            DB::table('checkins')
                ->whereNull('checkin_operator_id')
                ->update(['checkin_operator_id' => $admin->id]);

            // =========================================================
            // 2. CHECKINS — checkout_operator_id
            //    No existe ninguna columna legacy que registre quién hizo
            //    el checkout antes de este campo, así que el único destino
            //    razonable es el Admin. Solo aplica a estadías ya
            //    finalizadas: las 'activo' deben seguir en NULL (todavía
            //    no se hizo checkout).
            // =========================================================
            DB::table('checkins')
                ->whereNull('checkout_operator_id')
                ->where('status', 'finalizado')
                ->update(['checkout_operator_id' => $admin->id]);

            // =========================================================
            // 3. PAYMENTS — operator_id (misma lógica que checkins)
            // =========================================================
            DB::table('payments')
                ->whereNull('operator_id')
                ->whereNotIn('user_id', $systemUserIds)
                ->update(['operator_id' => DB::raw('user_id')]);

            DB::table('payments')
                ->whereNull('operator_id')
                ->update(['operator_id' => $admin->id]);

            // =========================================================
            // 4. EXPENSES — operator_id (expenses.cash_register_id ya es
            //    NOT NULL desde su creación, así que no hay nada que
            //    reparar ahí).
            // =========================================================
            DB::table('expenses')
                ->whereNull('operator_id')
                ->whereNotIn('user_id', $systemUserIds)
                ->update(['operator_id' => DB::raw('user_id')]);

            DB::table('expenses')
                ->whereNull('operator_id')
                ->update(['operator_id' => $admin->id]);

            // =========================================================
            // 5. PAYMENTS — cash_register_id
            //    Se agrupan todos los pagos huérfanos en un único turno
            //    "HISTÓRICO" cerrado, cuya ventana [opened_at, closed_at]
            //    cubre exactamente el rango real de esos pagos (el PDF de
            //    un turno recalcula sus totales por fecha, así que la
            //    ventana debe contener sus created_at o aparecería vacío).
            // =========================================================
            if ($paymentsSinCaja > 0) {
                $rango = DB::table('payments')
                    ->whereNull('cash_register_id')
                    ->selectRaw('MIN(created_at) as min_fecha, MAX(created_at) as max_fecha')
                    ->first();

                $historico = CashRegister::create([
                    'user_id' => $admin->id,
                    'opening_amount' => 0,
                    'left_amount' => 0,
                    'status' => 'CERRADA',
                    'opened_at' => \Illuminate\Support\Carbon::parse($rango->min_fecha)->subDay(),
                    'closed_at' => \Illuminate\Support\Carbon::parse($rango->max_fecha)->addMinute(),
                    'snapshot_data' => [
                        'legacy_fixer' => true,
                        'label' => 'HISTÓRICO — datos previos al sistema de Turnos de Caja',
                    ],
                ]);

                DB::table('payments')
                    ->whereNull('cash_register_id')
                    ->update(['cash_register_id' => $historico->id]);

                $this->info("Turno HISTÓRICO creado (Cash Register #{$historico->id}) y asignado a los pagos huérfanos.");
            }
        });

        $this->info('Reparación completada.');
        return self::SUCCESS;
    }
}
