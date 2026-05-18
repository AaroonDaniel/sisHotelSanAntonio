<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * SiatOfflineException
 *
 * Se lanza ÚNICAMENTE cuando el SIAT es genuinamente inalcanzable:
 * un fallo de red o un SoapFault de conexión comprobado.
 *
 * Es la única excepción que autoriza al InvoiceController a marcar
 * una factura como 'offline'. Cualquier otra excepción (errores del
 * propio código, datos faltantes, fallos del SiatXmlBuilder) NO debe
 * envolverse en esta clase: debe abortar y registrarse como error.
 */
class SiatOfflineException extends RuntimeException
{
}