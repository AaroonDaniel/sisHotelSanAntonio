<?php

namespace App\Traits;

use App\Models\Checkin;
use App\Models\Schedule;
use Carbon\Carbon;

/**
 * Único punto de verdad del "día operativo" del hotel: cualquier momento
 * ANTES de la hora de check-in del horario pertenece al día operativo
 * ANTERIOR (una entrada de madrugada, ej. 02:00, es la noche de ayer — de
 * lo contrario se regalan casi 24h de habitación). Usado por
 * calculateBillableDays()/calculateLateCheckoutFee() en CheckinController
 * y por el libro mayor de cargos diarios de Cuentas Grupales
 * (ChargeGroupAccountsDailyCommand) — extraído a trait para que ambos
 * cuenten los días exactamente igual y nunca se desincronicen.
 */
trait ResolvesBusinessDate
{
    protected function resolveBusinessDate(Carbon $momento, ?Schedule $schedule = null): Carbon
    {
        $horaCorte = $schedule?->check_in_time
            ?? Schedule::where('is_active', true)->value('check_in_time')
            ?? '06:00:00';

        $corte = $momento->copy()->setTimeFromTimeString($horaCorte);

        return $momento->lt($corte)
            ? $momento->copy()->subDay()->startOfDay()
            : $momento->copy()->startOfDay();
    }

    /**
     * 🚀 EXTRAÍDO de CheckinController (era privado ahí) para que
     * RoomHistoryController pueda calcular exactamente las mismas noches
     * que ya cobra el checkout real, sin reimplementar la lógica aparte y
     * arriesgar que se desincronicen con el tiempo. Comportamiento
     * idéntico al original, sin cambios.
     */
    protected function calculateBillableDays(Checkin $checkin, Carbon $fechaSalidaReal, $waivePenalty = false)
    {
        // 1. Si ya está finalizado en BD, respetamos lo histórico
        if ($checkin->status === 'finalizado') {
            return max(1, intval($checkin->duration_days));
        }

        // 🚀 ANCLA DE PRECIO: si esta estadía tuvo una transferencia o
        // fusión a mitad de camino, 'price_effective_since' marca el
        // momento exacto desde el cual rige el precio ACTUAL. Las noches
        // anteriores a ese momento ya quedaron cobradas como una deuda fija
        // en 'carried_balance' (ver transfer()/merge()), así que aquí NO
        // deben volver a contarse al precio nuevo.
        $usingTransferAnchor = !is_null($checkin->price_effective_since);
        $ingreso = Carbon::parse($checkin->price_effective_since ?? $checkin->check_in_date);

        // AJUSTE DE ENTRADA (Mantenemos tolerancia automática al entrar)
        // Solo aplica al ingreso ORIGINAL del huésped al hotel: el ancla de
        // una transferencia/fusión ya es una hora exacta y no debe
        // beneficiarse de la tolerancia de horario oficial.
        if (!$usingTransferAnchor && $checkin->schedule) {
            $horaOficialEntrada = Carbon::parse($ingreso->format('Y-m-d') . ' ' . $checkin->schedule->check_in_time);
            $inicioTolerancia = $horaOficialEntrada->copy()->subMinutes($checkin->schedule->entry_tolerance_minutes);

            if ($ingreso->between($inicioTolerancia, $horaOficialEntrada)) {
                $ingreso = $horaOficialEntrada;
            }
        }

        // 🛡️ BLINDAJE: la salida nunca puede ser anterior al ingreso (p. ej.
        // fechas mal cargadas en pruebas). Evita noches/montos negativos: mínimo 1.
        if ($this->resolveBusinessDate($fechaSalidaReal, $checkin->schedule)->lt($this->resolveBusinessDate($ingreso, $checkin->schedule))) {
            return 1;
        }

        // =========================================================
        // 🚀 CASO A: SI SE PRESIONÓ EL BOTÓN DE TOLERANCIA
        // =========================================================
        if ($waivePenalty) {
            $diasCalendario = $this->resolveBusinessDate($ingreso, $checkin->schedule)->diffInDays($this->resolveBusinessDate($fechaSalidaReal, $checkin->schedule));
            // Retorna los días limpios, perdonando la noche extra
            return $diasCalendario == 0 ? 1 : $diasCalendario;
        }

        // --- LÓGICA DE DÍA OPERATIVO (Business Date, NO calendario ciego) ---
        // Una entrada de madrugada (ej. 02:00, antes de la hora de corte
        // del horario propio de este checkin) pertenece a la noche del
        // día anterior — de lo contrario se regalan casi 24h de
        // habitación (ver resolveBusinessDate()).
        $diasBase = $this->resolveBusinessDate($ingreso, $checkin->schedule)->diffInDays($this->resolveBusinessDate($fechaSalidaReal, $checkin->schedule));

        if ($diasBase == 0) {
            return 1;
        }

        if (!$checkin->schedule) {
            return max(intval($checkin->duration_days), ceil($ingreso->floatDiffInDays($fechaSalidaReal)));
        }

        // =========================================================
        // 🛑 CASO B: LÓGICA ESTRICTA (DÍAS POSTERIORES)
        // =========================================================
        $horario = $checkin->schedule;

        // HORA OFICIAL EXACTA (Ya NO le sumamos la tolerancia aquí)
        $limiteSalidaHoy = Carbon::parse($fechaSalidaReal->format('Y-m-d') . ' ' . $horario->check_out_time);

        // ¿Pasó del minuto exacto de salida oficial?
        if ($fechaSalidaReal->greaterThan($limiteSalidaHoy)) {
            // SE PASÓ: Cobra el día extra de forma automática y estricta
            return $diasBase + 1;
        } else {
            // SALIÓ A TIEMPO
            return $diasBase;
        }
    }
}
