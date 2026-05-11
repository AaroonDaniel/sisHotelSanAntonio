<?php

namespace App\Services;

class SiatUtils
{
    /**
     * Algoritmo Módulo 11 para obtener el dígito verificador (según norma SIAT).
     */
    public static function modulo11(string $str, int $numDig, int $limMult, bool $x10): string
    {
        $mult = 2;
        $sum = 0;
        for ($i = strlen($str) - 1; $i >= 0; $i--) {
            $sum += ($mult * (int)$str[$i]);
            if (++$mult > $limMult) $mult = 2;
        }

        if ($x10) {
            $dig = (($sum * 10) % 11) % 10;
        } else {
            $dig = $sum % 11;
        }

        if ($dig == 10) return '1'; // Según SIAT, si es 10 se retorna 1 o según lógica específica
        if ($dig == 11) return '0';
        
        return (string)$dig;
    }

    /**
     * Convierte una cadena numérica a Base 16 (Hexadecimal en Mayúsculas).
     */
    public static function toBase16(string $numberStr): string
    {
        return strtoupper(bc_convert($numberStr, 10, 16));
    }
}

/**
 * Función auxiliar para conversión de bases de números muy largos (requiere BC Math).
 */
/**
 * Función auxiliar para conversión de bases de números muy largos (requiere BC Math).
 */
function bc_convert(string $number, int $frombase, int $tobase): string 
{
    $chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    $tostring = "";
    $length = strlen($number);
    $number10 = '0';
    
    for ($i = 0; $i < $length; $i++) {
        // Casteo a string porque bcadd exige parámetros string
        $pos = (string) strpos($chars, $number[$i]);
        $number10 = bcadd(bcmul($number10, (string) $frombase), $pos);
    }
    
    while (bccomp($number10, '0') > 0) {
        // Casteo a int porque la posición del array/string exige un entero
        $modIndex = (int) bcmod($number10, (string) $tobase);
        $tostring = $chars[$modIndex] . $tostring;
        $number10 = bcdiv($number10, (string) $tobase, 0);
    }
    
    return $tostring;
}