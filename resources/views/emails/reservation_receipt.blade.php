<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recibo de Reserva</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family: Arial, Helvetica, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:24px 0;">
        <tr>
            <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <tr>
                        <td style="background-color:#1e3a5f; padding:24px 32px; text-align:center;">
                            <h1 style="color:#ffffff; margin:0; font-size:20px;">HOTEL SAN ANTONIO</h1>
                            <p style="color:#cbd5e1; margin:4px 0 0; font-size:12px;">Casa Matriz - Potosí, Bolivia</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <h2 style="color:#1e3a5f; margin:0 0 12px; font-size:18px;">¡Gracias por su reserva, {{ $guestName }}!</h2>
                            <p style="color:#374151; font-size:14px; line-height:1.6; margin:0 0 16px;">
                                Hemos recibido su solicitud de reserva <strong>#{{ $reservationId }}</strong> y el comprobante de su pago anticipado.
                                Adjuntamos el <strong>recibo en PDF</strong> con el detalle.
                            </p>
                            <p style="color:#374151; font-size:14px; line-height:1.6; margin:0 0 16px;">
                                Su reserva está en proceso de <strong>verificación</strong>. Una vez confirmado el pago por nuestro personal,
                                su reserva quedará formalizada.
                            </p>
                            <div style="background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px; margin:16px 0;">
                                <p style="color:#6b7280; font-size:13px; margin:0;">
                                    📎 Adjunto: <strong>recibo_reserva_{{ $reservationId }}.pdf</strong>
                                </p>
                            </div>
                            <p style="color:#9ca3af; font-size:12px; line-height:1.5; margin:16px 0 0;">
                                Si usted no realizó esta reserva, ignore este correo. Para consultas, comuníquese con el hotel.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f3f4f6; padding:16px 32px; text-align:center;">
                            <p style="color:#9ca3af; font-size:11px; margin:0;">Hotel San Antonio - Tel. 77700000 - Potosí, Bolivia</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>