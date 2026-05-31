<?php

namespace App\Services;

use App\Models\SiatCredential;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Exception;

class SiatUtils
{
    /**
     * Algoritmo Módulo 11 para obtener el dígito verificador del CUF (norma SIN).
     *
     * Para el CUF se invoca con: numDig=1, limMult=9, x10=false.
     *
     * ⚠️ IMPORTANTE — confirmado empíricamente contra el SIAT (mayo 2026):
     * el dígito verificador del CUF se calcula como `suma % 11` DIRECTAMENTE,
     * NO como `11 - (suma % 11)` que es la variante más común del módulo 11.
     *
     * Verificación: el SIAT rechazó tres facturas seguidas (40, 41, 42) y en
     * los tres casos se cumplió que:  verificador_que_calculábamos + verificador_esperado_SIAT = 11
     * lo cual demuestra que estábamos aplicando la resta y el SIAT no.
     *
     * @param string $str      Cadena numérica base.
     * @param int    $numDig   Cantidad de dígitos verificadores a calcular (1 para CUF).
     * @param int    $limMult  Multiplicador máximo antes de reiniciar a 2.
     * @param bool   $x10      Variante "por 10" del algoritmo.
     */
    public static function modulo11(string $str, int $numDig, int $limMult, bool $x10): string
    {
        $mult = 2;
        $sum  = 0;

        for ($i = strlen($str) - 1; $i >= 0; $i--) {
            $sum += ((int) $str[$i]) * $mult;
            $mult++;
            if ($mult > $limMult) {
                $mult = 2;
            }
        }

        if ($x10) {
            // Variante "por 10": usada en otros documentos del SIN.
            $dig = (($sum * 10) % 11) % 10;
            return (string) $dig;
        }

        // Variante CUF del SIAT (Bolivia, RND-102100000011):
        //
        //   verificador = suma % 11
        //
        // Casos especiales (descubiertos empíricamente contra el SIAT):
        //   - resto = 10 → "1"  (no "0" como dicen algunas referencias)
        //   - resto en 0..9 → ese mismo dígito
        //
        // El caso resto=10 ocurre en ~9% de las facturas y antes lo manejábamos
        // mal: devolvíamos "0" y el SIAT rechazaba con CUF inválido cuyo último
        // hex difería en una unidad.
        $resto = $sum % 11;

        if ($resto === 10) {
            return '1';
        }

        return (string) $resto;
    }

    /**
     * Convierte una cadena numérica (base 10) a Base 16 en mayúsculas.
     */
    public static function toBase16(string $numberStr): string
    {
        return strtoupper(self::convertBase($numberStr, 10, 16));
    }

    // =========================================================
    // CUF — Código Único de Factura
    // =========================================================

    /**
     * Construye el CUF consumiendo el CUFD vigente desde `siat_credentials`.
     *
     * Esta es la única vía oficial: el `control_code` y la `fecha_vigencia`
     * provienen del registro SiatCredential de tipo CUFD que el flujo de
     * facturación obtiene mediante SiatService::getActiveCufd().
     *
     * Estructura de la cadena base (53 dígitos):
     *  NIT emisor (13) + Fecha/hora emisión (17) + Sucursal (4) +
     *  Modalidad (1) + Tipo emisión (1) + Tipo factura (1) +
     *  Tipo doc. sector (2) + Nº factura (10) + Punto de venta (4)
     *
     * Sobre esos 53 dígitos se calcula el verificador Módulo 11, se concatena,
     * se convierte a Base 16 y finalmente se anexa el `control_code` del CUFD.
     *
     * La `fecha_vigencia` del CUFD NO forma parte de la cadena base: se usa
     * exclusivamente para validar que el CUFD no esté vencido antes de emitir.
     *
     * @param SiatCredential        $cufd      Credencial CUFD vigente.
     * @param CarbonInterface       $issuedAt  Fecha/hora real de emisión de la factura.
     * @param array<string,mixed>   $invoice   Datos de la factura (nit, branch, modality,
     *                                         emissionType, invoiceType, sectorDoc, number, pos).
     */
    public static function buildCuf(SiatCredential $cufd, CarbonInterface $issuedAt, array $invoice): string
    {
        self::assertCufdIsValid($cufd, $issuedAt);

        $controlCode = trim((string) $cufd->control_code);
        if ($controlCode === '') {
            throw new Exception('El CUFD activo no tiene control_code; no se puede generar el CUF.');
        }

        $nit          = str_pad((string) $invoice['nit'], 13, '0', STR_PAD_LEFT);
        $date         = $issuedAt->format('YmdHisv'); // 17 dígitos (con milisegundos)
        $branch       = str_pad((string) $invoice['branch'], 4, '0', STR_PAD_LEFT);
        $modality     = (string) ($invoice['modality'] ?? 2);
        $emissionType = (string) ($invoice['emissionType'] ?? 1);
        $invoiceType  = (string) ($invoice['invoiceType'] ?? 1);
        $sectorDoc    = str_pad((string) ($invoice['sectorDoc'] ?? 1), 2, '0', STR_PAD_LEFT);
        $number       = str_pad((string) $invoice['number'], 10, '0', STR_PAD_LEFT);
        $pos          = str_pad((string) ($invoice['pos'] ?? 0), 4, '0', STR_PAD_LEFT);

        $base = $nit . $date . $branch . $modality . $emissionType
            . $invoiceType . $sectorDoc . $number . $pos;

        if (strlen($base) !== 53) {
            throw new Exception(
                'Cadena base del CUF inválida: se esperaban 53 dígitos, se obtuvieron '
                    . strlen($base) . " ({$base})"
            );
        }

        if (!ctype_digit($base)) {
            throw new Exception('La cadena base del CUF contiene caracteres no numéricos.');
        }

        $verifier = self::modulo11($base, 1, 9, false);
        $cufHex   = self::toBase16($base . $verifier);

        return $cufHex . $controlCode;
    }

    /**
     * Verifica que el CUFD esté vigente respecto a la fecha de emisión.
     * El SIN rechaza cualquier factura emitida con un CUFD vencido.
     */
    public static function assertCufdIsValid(SiatCredential $cufd, ?CarbonInterface $issuedAt = null): void
    {
        $issuedAt = $issuedAt ?? Carbon::now();

        if (empty($cufd->expires_at)) {
            throw new Exception('El CUFD activo no registra expires_at; no se puede validar su vigencia.');
        }

        $vigencia = $cufd->expires_at instanceof CarbonInterface
            ? $cufd->expires_at
            : Carbon::parse($cufd->expires_at);

        if ($issuedAt->greaterThan($vigencia)) {
            throw new Exception(
                'El CUFD venció el ' . $vigencia->toDateTimeString()
                    . '. Debe renovarse antes de emitir la factura.'
            );
        }
    }

    // =========================================================
    // Conversión de bases (números arbitrariamente largos, BC Math)
    // =========================================================

    /**
     * Convierte un número entre bases usando BC Math (soporta enteros muy grandes).
     */
    public static function convertBase(string $number, int $fromBase, int $toBase): string
    {
        $chars  = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $base10 = '0';

        $length = strlen($number);
        for ($i = 0; $i < $length; $i++) {
            $pos = strpos($chars, $number[$i]);
            if ($pos === false) {
                throw new Exception("Carácter inválido '{$number[$i]}' para base {$fromBase}.");
            }
            $base10 = bcadd(bcmul($base10, (string) $fromBase), (string) $pos);
        }

        if (bccomp($base10, '0') === 0) {
            return '0';
        }

        $result = '';
        while (bccomp($base10, '0') > 0) {
            $modIndex = (int) bcmod($base10, (string) $toBase);
            $result   = $chars[$modIndex] . $result;
            $base10   = bcdiv($base10, (string) $toBase, 0);
        }

        return $result;
    }
}