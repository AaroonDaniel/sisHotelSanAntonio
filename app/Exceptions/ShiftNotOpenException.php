<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Terminal Compartida (Kiosk Mode): se lanza cuando el operador elegido en
 * el OperatorSelector no tiene un turno (CashRegister) abierto para
 * registrar el movimiento de dinero que se está intentando hacer. Cada
 * controlador la atrapa y la traduce a una respuesta que el frontend
 * reconoce para disparar el modal de "Apertura de Caja Requerida".
 */
class ShiftNotOpenException extends RuntimeException
{
    public function __construct(
        public readonly int $operatorId,
        public readonly string $operatorName,
    ) {
        parent::__construct("{$operatorName} no tiene un turno abierto. Debe aperturar caja antes de continuar.");
    }
}
