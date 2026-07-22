<?php

namespace App\Console\Commands;

use App\Models\Checkin;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Migración de DATOS (no de schema) del proyecto "precio por huésped":
 * reparte el agreed_price actual de CADA checkin (activos e históricos —
 * decisión explícita: mezclar dos modelos de precio en la tabla
 * descuadraría la auditoría) entre titular_price + checkin_guests.price,
 * de forma que la suma dé EXACTAMENTE lo mismo que el agreed_price viejo.
 * agreed_price en sí NUNCA se toca acá — ya tiene el valor histórico
 * correcto, solo se rellenan las columnas nuevas de apoyo.
 *
 * Algoritmo (precisión de 1 decimal — "redondeo oficial" del negocio,
 * mismo criterio que Checkin::setAgreedPriceAttribute()/
 * calculateAgreedPrice()):
 *   ocupantes   = 1 (titular) + N acompañantes
 *   parte_base  = floor(agreed_price / ocupantes * 10) / 10
 *   residuo     = agreed_price - (parte_base * ocupantes)
 *   titular     = parte_base + residuo   (se lleva el residuo, es el
 *                 ancla más estable de la habitación)
 *   acompañante = parte_base (cada uno)
 *
 * DRY-RUN por defecto: sin --apply, NO escribe nada, solo calcula y
 * compara agreed_price viejo vs. suma propuesta para el 100% de los
 * checkins. Si aunque sea UNO no coincide exacto, --apply se niega a
 * escribir (aborta antes de tocar la base de datos).
 *
 * Los UPDATE van por query builder (no por $checkin->save()) a propósito:
 * un backfill masivo no necesita disparar CheckinGuestObserver/
 * CheckinObserver::recalculateAgreedPrice() en cada fila — ya sabemos
 * que la suma calza exacto (se valida antes de aplicar), así que no hace
 * falta recalcular nada, solo persistir los valores ya calculados.
 */
class BackfillGuestPricesCommand extends Command
{
    protected $signature = 'checkins:backfill-guest-prices {--apply : Escribe los cambios en firme. Sin esta opción, corre en modo dry-run (no escribe nada).}';

    protected $description = 'Reparte agreed_price entre titular_price y checkin_guests.price para todos los checkins (activos e históricos).';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');

        $checkins = Checkin::with('companions')->get();
        $total = $checkins->count();

        $coinciden = 0;
        $problemas = [];
        $propuestas = []; // checkin_id => ['titular' => x, 'companions' => [guest_id => price]]

        foreach ($checkins as $checkin) {
            $companions = $checkin->companions;
            $ocupantes = 1 + $companions->count();

            $agreedPrice = round((float) ($checkin->agreed_price ?? 0), 1);

            $parteBase = floor(($agreedPrice / $ocupantes) * 10) / 10;
            $sumaBase = round($parteBase * $ocupantes, 1);
            $residuo = round($agreedPrice - $sumaBase, 1);
            $titularPrice = round($parteBase + $residuo, 1);

            $companionPrices = [];
            foreach ($companions as $companion) {
                $companionPrices[$companion->id] = $parteBase;
            }

            $sumaPropuesta = round($titularPrice + array_sum($companionPrices), 1);
            $coincide = abs($sumaPropuesta - $agreedPrice) < 0.05;

            if ($coincide) {
                $coinciden++;
            } else {
                $problemas[] = [
                    'checkin_id' => $checkin->id,
                    'ocupantes' => $ocupantes,
                    'agreed_price' => $agreedPrice,
                    'suma_propuesta' => $sumaPropuesta,
                ];
            }

            $propuestas[$checkin->id] = [
                'titular' => $titularPrice,
                'companions' => $companionPrices,
            ];
        }

        $this->info("Total de checkins evaluados: {$total}");
        $this->info("Coinciden exacto (agreed_price viejo === suma propuesta): {$coinciden}");
        $this->info('No coinciden: ' . count($problemas));

        if (!empty($problemas)) {
            $this->error('⚠️  Filas con discrepancia (deben ser CERO antes de aplicar):');
            $this->table(
                ['checkin_id', 'ocupantes', 'agreed_price', 'suma_propuesta'],
                $problemas,
            );
        }

        if (!$apply) {
            $this->comment('DRY-RUN: no se escribió nada en la base de datos. Corré con --apply para aplicar en firme (solo si el conteo de arriba da 100% de coincidencia).');
            return self::SUCCESS;
        }

        if (count($problemas) > 0) {
            $this->error('ABORTADO: hay ' . count($problemas) . ' checkin(s) cuya suma propuesta no coincide con el agreed_price actual. No se escribió NADA.');
            return self::FAILURE;
        }

        DB::transaction(function () use ($propuestas) {
            foreach ($propuestas as $checkinId => $datos) {
                Checkin::where('id', $checkinId)->update(['titular_price' => $datos['titular']]);

                foreach ($datos['companions'] as $guestId => $price) {
                    DB::table('checkin_guests')
                        ->where('checkin_id', $checkinId)
                        ->where('guest_id', $guestId)
                        ->update(['price' => $price]);
                }
            }
        });

        $this->info('Listo. Se escribieron titular_price/checkin_guests.price para ' . count($propuestas) . ' checkin(s).');

        return self::SUCCESS;
    }
}
