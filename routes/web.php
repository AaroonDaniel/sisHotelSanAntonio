<?php

use App\Http\Controllers\CheckinController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\BlockController;
use App\Http\Controllers\FloorController;
use App\Http\Controllers\RoomTypeController;
use App\Http\Controllers\PriceController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\GuestController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\CheckinDetailController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\UserProfileController;
use App\Http\Controllers\CashRegisterController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\OnlineBookingController;
use App\Http\Controllers\AdminBookingController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\SignificantEventController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\PaymentHistoryController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/login');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('/dashboard', [App\Http\Controllers\DashboardController::class, 'index'])->name('Inicio')->middleware('permission:dashboard.ver');

    //Usuarios
    Route::get('usuarios', [UserController::class, 'index'])->name('usuarios.index')->middleware('permission:usuarios.ver');
    Route::post('usuarios', [UserController::class, 'store'])->name('usuarios.store')->middleware('permission:usuarios.gestionar');
    Route::put('usuarios/{usuario}', [UserController::class, 'update'])->name('usuarios.update')->middleware('permission:usuarios.gestionar');
    Route::delete('usuarios/{usuario}', [UserController::class, 'destroy'])->name('usuarios.destroy')->middleware('permission:usuarios.gestionar');

    //Perfil de Usuario (propio: cualquier usuario autenticado puede editar SU perfil)
    Route::get('/user/profile', [UserProfileController::class, 'edit'])->name('user.profile.edit');
    Route::patch('/user/profile', [UserProfileController::class, 'update'])->name('user.profile.update');
    Route::patch('/user/password', [UserProfileController::class, 'updatePassword'])->name('user.profile.password');

    // Cambio de contraseña obligatorio (propio: no requiere permiso, lo gestiona EnsurePasswordIsChanged)
    Route::get('/cambiar-clave-obligatorio', [\App\Http\Controllers\Auth\ForcePasswordChangeController::class, 'show'])->name('password.force');
    Route::put('/cambiar-clave-obligatorio', [\App\Http\Controllers\Auth\ForcePasswordChangeController::class, 'update'])->name('password.force.update');

    // Bloques
    Route::get('/bloques', [BlockController::class, 'index'])->name('blocks.index')->middleware('permission:config.gestionar');
    Route::get('/bloques/crear', [BlockController::class, 'create'])->name('blocks.create')->middleware('permission:config.gestionar');
    Route::post('/bloques', [BlockController::class, 'store'])->name('blocks.store')->middleware('permission:config.gestionar');
    Route::put('/bloques/{block}', [BlockController::class, 'update'])->name('blocks.update')->middleware('permission:config.gestionar');
    Route::delete('/bloques/{block}', [BlockController::class, 'destroy'])->name('blocks.destroy')->middleware('permission:config.gestionar');
    Route::patch('/bloques/{block}/toggle', [BlockController::class, 'toggleStatus'])->name('blocks.toggle')->middleware('permission:config.gestionar');

    //Pisos
    Route::get('/pisos', [FloorController::class, 'index'])->name('floors.index')->middleware('permission:config.gestionar');
    Route::post('/pisos', [FloorController::class, 'store'])->name('floors.store')->middleware('permission:config.gestionar');
    Route::put('/pisos/{floor}', [FloorController::class, 'update'])->name('floors.update')->middleware('permission:config.gestionar');
    Route::delete('/pisos/{floor}', [FloorController::class, 'destroy'])->name('floors.destroy')->middleware('permission:config.gestionar');
    Route::patch('/pisos/{floor}/toggle', [FloorController::class, 'toggleStatus'])->name('floors.toggle')->middleware('permission:config.gestionar');

    //Tipos de Habitaciones
    Route::get('/tipohabitacion', [RoomTypeController::class, 'index'])->name('room_types.index')->middleware('permission:config.gestionar');
    Route::get('/tipohabitacion/crear', [RoomTypeController::class, 'create'])->name('room_types.create')->middleware('permission:config.gestionar');
    Route::post('/tipohabitacion', [RoomTypeController::class, 'store'])->name('room_types.store')->middleware('permission:config.gestionar');
    Route::put('/tipohabitacion/{roomType}', [RoomTypeController::class, 'update'])->name('room_types.update')->middleware('permission:config.gestionar');
    Route::delete('/tipohabitacion/{roomType}', [RoomTypeController::class, 'destroy'])->name('room_types.destroy')->middleware('permission:config.gestionar');
    Route::patch('/tipohabitacion/{roomType}/toggle', [RoomTypeController::class, 'toggleStatus'])->name('room_types.toggle')->middleware('permission:config.gestionar');
    Route::get('/status', [RoomController::class, 'status'])->name('rooms.status')->middleware('permission:habitaciones.estado_actual');

    //Tipos de precios habitaciones
    Route::get('/precios', [PriceController::class, 'index'])->name('prices.index')->middleware('permission:config.gestionar');
    Route::get('/precios/crear', [PriceController::class, 'create'])->name('prices.create')->middleware('permission:config.gestionar');
    Route::post('/precios', [PriceController::class, 'store'])->name('prices.store')->middleware('permission:config.gestionar');
    Route::put('/precios/{price}', [PriceController::class, 'update'])->name('prices.update')->middleware('permission:config.gestionar');
    Route::delete('/precios/{price}', [PriceController::class, 'destroy'])->name('prices.destroy')->middleware('permission:config.gestionar');
    Route::patch('/precios/{price}/toggle', [PriceController::class, 'toggleStatus'])->name('prices.toggle')->middleware('permission:config.gestionar');

    //Habitaciones
    Route::get('/habitaciones', [RoomController::class, 'index'])->name('rooms.index')->middleware('permission:config.gestionar');
    Route::get('/habitaciones/crear', [RoomController::class, 'create'])->name('rooms.create')->middleware('permission:config.gestionar');
    Route::post('/habitaciones', [RoomController::class, 'store'])->name('rooms.store')->middleware('permission:config.gestionar');
    Route::put('/habitaciones/{room}', [RoomController::class, 'update'])->name('rooms.update')->middleware('permission:config.gestionar');
    Route::delete('/habitaciones/{room}', [RoomController::class, 'destroy'])->name('rooms.destroy')->middleware('permission:config.gestionar');
    Route::patch('/habitaciones/{room}/toggle', [RoomController::class, 'toggleStatus'])->name('rooms.toggle')->middleware('permission:config.gestionar');
    Route::post('/rooms/{room}/maintenance', [RoomController::class, 'markAsMaintenance'])->name('rooms.maintenance')->middleware('permission:habitaciones.cambiar_estado');
    Route::put('/rooms/{room}/finish-maintenance', [RoomController::class, 'finishMaintenance'])->name('rooms.finish_maintenance')->middleware('permission:habitaciones.cambiar_estado');
    Route::put('/rooms/{room}/clean', [RoomController::class, 'markAsClean'])->name('rooms.markAsClean')->middleware('permission:habitaciones.cambiar_estado');

    //Invitados (huéspedes)
    Route::get('/invitados', [GuestController::class, 'index'])->name('guests.index')->middleware('permission:huespedes.ver');
    Route::get('/invitados/crear', [GuestController::class, 'create'])->name('guests.create')->middleware('permission:huespedes.crear');
    Route::post('/invitados', [GuestController::class, 'store'])->name('guests.store')->middleware('permission:huespedes.crear');
    Route::put('/invitados/{guest}', [GuestController::class, 'update'])->name('guests.update')->middleware('permission:huespedes.crear');
    Route::delete('/invitados/{guest}', [GuestController::class, 'destroy'])->name('guests.destroy')->middleware('permission:huespedes.crear');
    Route::patch('/invitados/{guest}/toggle', [GuestController::class, 'toggleStatus'])->name('guests.toggle')->middleware('permission:huespedes.crear');

    //Servicios
    Route::get('/servicios', [ServiceController::class, 'index'])->name('services.index')->middleware('permission:config.gestionar');
    Route::get('/servicios/crear', [ServiceController::class, 'create'])->name('services.create')->middleware('permission:config.gestionar');
    Route::post('/servicios', [ServiceController::class, 'store'])->name('services.store')->middleware('permission:config.gestionar');
    Route::put('/servicios/{service}', [ServiceController::class, 'update'])->name('services.update')->middleware('permission:config.gestionar');
    Route::delete('/servicios/{service}', [ServiceController::class, 'destroy'])->name('services.destroy')->middleware('permission:config.gestionar');
    Route::patch('/servicios/{service}/toggle', [ServiceController::class, 'toggleStatus'])->name('services.toggle')->middleware('permission:config.gestionar');

    // --- RECEPCIÓN (CHECKS) ---
    Route::get('/checks', [CheckinController::class, 'index'])->name('checks.index')->middleware('permission:checkins.ver_todos');
    Route::get('/checks/crear', [CheckinController::class, 'create'])->name('checks.create')->middleware('permission:checkin.realizar');
    Route::post('/checks', [CheckinController::class, 'store'])->name('checks.store')->middleware('permission:checkin.realizar');
    Route::put('/checks/{checkin}', [CheckinController::class, 'update'])->name('checks.update')->middleware('permission:checkin.realizar');
    Route::delete('/checks/{checkin}', [CheckinController::class, 'destroy'])->name('checks.destroy')->middleware('permission:checkin.realizar');

    // Rutas adicionales de checks
    Route::put('/checks/{checkin}/checkout', [CheckinController::class, 'checkout'])->middleware('permission:checkout.realizar');
    Route::get('/checks/{checkin}/checkout-receipt', [CheckinController::class, 'generateCheckoutReceipt'])->middleware('permission:recibos.imprimir');
    Route::get('/checks/{checkin}/checkout-invoice', [CheckinController::class, 'generateCheckoutInvoice'])->middleware('permission:recibos.imprimir');
    Route::get('/checks/{checkin}/receipt', [CheckinController::class, 'generateAssignmentReceipt'])->middleware('permission:recibos.imprimir');
    Route::delete('/checks/{checkin}/cancel-assignment', [CheckinController::class, 'cancelAssignment'])->name('checks.cancel_assignment')->middleware('permission:checkin.realizar');
    Route::get('/checks/{checkin}/checkout-details', [CheckinController::class, 'getCheckoutDetails'])->middleware('permission:checkins.ver_todos');
    Route::post('/checkins/{checkin}/payments', [CheckinController::class, 'storePayment'])->name('checkins.payments.store')->middleware('permission:caja.registrar_pago');
    Route::get('/search/origins', [GuestController::class, 'searchOrigins'])->name('search.origins')->middleware('permission:huespedes.buscar');
    Route::get('/search/professions', [GuestController::class, 'searchProfessions'])->name('search.professions')->middleware('permission:huespedes.buscar');
    Route::get('/search/issued-in', [GuestController::class, 'searchIssuedIn'])->name('search.issued-in')->middleware('permission:huespedes.buscar');
    Route::post('/checkins/multi-checkout', [CheckinController::class, 'multiCheckout'])->name('checkins.multiCheckout')->middleware('permission:checkout.realizar');
    Route::post('/checkins/{checkin}/cancel-agreement', [CheckinController::class, 'cancelAgreement'])
        ->name('checkins.cancelAgreement')->middleware('permission:checkin.realizar');
    Route::get('/checkins/preview-price', [CheckinController::class, 'previewPrice'])
        ->name('checkins.previewPrice')->middleware('permission:checkin.realizar');

    // Ruta Original (POST)
    Route::post('/checkins/{checkin}/transfer', [CheckinController::class, 'transfer'])->name('checkins.transfer')->middleware('permission:checkin.realizar');

    // Ruta de Tolerancia (PUT)
    Route::put('/checkins/{checkin}/transfer', [CheckinController::class, 'transfer'])->name('checkins.update_transfer')->middleware('permission:checkin.realizar');

    Route::post('/checkins/{checkin}/add-payment', [CheckinController::class, 'addPayment'])->name('checkins.addPayment')->middleware('permission:caja.registrar_pago');
    Route::post('/checkins/from-reservation', [CheckinController::class, 'storeFromReservation'])->name('checkins.fromReservation')->middleware('permission:checkin.realizar');
    Route::post('/checkins/{checkin}/refund', [CheckinController::class, 'refund'])->name('checkins.refund')->middleware('permission:caja.registrar_pago');

    // Ruta de Merge
    Route::post('/checkins/{checkin}/merge', [CheckinController::class, 'merge'])->name('checkins.merge')->middleware('permission:checkin.realizar');

    // Detalle de asignacion (consumos durante la estancia)
    Route::get('/checkindetails', [CheckinDetailController::class, 'index'])->name('checkindetails.index')->middleware('permission:checkins.ver_todos');
    Route::post('/checkin-details', [CheckinDetailController::class, 'store'])->name('checkindetails.store')->middleware('permission:checkin.realizar');
    Route::put('/checkin-details/{id}', [CheckinDetailController::class, 'update'])->name('checkindetails.update')->middleware('permission:checkin.realizar');
    Route::delete('/checkin-details/{id}', [CheckinDetailController::class, 'destroy'])->name('checkindetails.destroy')->middleware('permission:checkin.realizar');

    // Vista previa de servicios adicionales huésped
    Route::get('/guests/view-detail', [CheckinController::class, 'generateViewDetail'])->name('guests.view_detail')->middleware('permission:checkins.ver_todos');
    Route::get('/api/checkin-details/{checkin_id}', [CheckinDetailController::class, 'listByCheckin'])->middleware('permission:checkins.ver_todos');

    // Horarios
    Route::get('/horarios', [ScheduleController::class, 'index'])->name('schedules.index')->middleware('permission:config.gestionar');
    Route::post('/horarios', [ScheduleController::class, 'store'])->name('schedules.store')->middleware('permission:config.gestionar');
    Route::put('/horarios/{schedule}', [ScheduleController::class, 'update'])->name('schedules.update')->middleware('permission:config.gestionar');
    Route::delete('/horarios/{schedule}', [ScheduleController::class, 'destroy'])->name('schedules.destroy')->middleware('permission:config.gestionar');
    Route::patch('/horarios/{schedule}/toggle', [ScheduleController::class, 'toggleStatus'])->name('schedules.toggle')->middleware('permission:config.gestionar');

    //Reserva
    Route::get('/reservas', [ReservationController::class, 'reception'])->name('reservations.index')->middleware('permission:reservas.ver_todos');
    Route::get('/admin/reservas', [ReservationController::class, 'index'])->name('reservations.admin')->middleware('permission:reservas.ver_todos');
    Route::post('/reservas', [ReservationController::class, 'store'])->name('reservations.store')->middleware('permission:reservas.crear');
    Route::put('/reservas/{reservation}', [ReservationController::class, 'update'])->name('reservations.update')->middleware('permission:reservas.editar');
    Route::delete('/reservas/{reservation}', [ReservationController::class, 'destroy'])->name('reservations.destroy')->middleware('permission:reservas.cancelar');
    Route::get('/api/reservations/availability', [ReservationController::class, 'checkAvailability'])->name('reservations.availability')->middleware('permission:reservas.ver_todos');
    Route::post('/reservas/{id}/assign-rooms', [ReservationController::class, 'assignRooms'])->name('reservations.assign')->middleware('permission:reservas.editar');

    //Reportes
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index')->middleware('permission:reportes.parte_diario');
    Route::get('/reports/generate-pdf', [ReportController::class, 'generateGuestsReportPdf'])->name('reports.pdf')->middleware('permission:reportes.parte_diario');
    Route::get('/reports/check-daily-book', [ReportController::class, 'checkDailyBookStatus'])->name('reports.check_daily')->middleware('permission:reportes.parte_diario');
    Route::get('/reports/history', [ReportController::class, 'history'])->name('reports.history')->middleware('permission:reportes.parte_diario');
    Route::get('/reports/financial', [ReportController::class, 'financialIndex'])->name('reports.financial')->middleware('permission:reportes.cierre_caja');
    Route::get('/reports/financial/pdf', [ReportController::class, 'generateFinancialReportPdf'])->name('reports.financialPdf')->middleware('permission:reportes.cierre_caja');
    Route::get('/reports/financial/csv', [ReportController::class, 'generateFinancialReportCsv'])->name('reports.financialCsv')->middleware('permission:reportes.cierre_caja');
    Route::get('/reports/financialMovement', [ReportController::class, 'financialMovement'])->name('reports.financialMovement')->middleware('permission:reportes.financiero');

    //Cuadre de caja
    Route::post('/cash-registers/open', [CashRegisterController::class, 'open'])->name('cash-registers.open')->middleware('permission:caja.abrir');
    Route::post('/cash-registers/close', [CashRegisterController::class, 'close'])->name('cash-registers.close')->middleware('permission:caja.cerrar');
    Route::get('/cash-registers/{cashRegister}', [CashRegisterController::class, 'show'])->name('cash-registers.show')->middleware('permission:caja.ver_todo');



    //Gastos
    Route::get('/gastos', [ExpenseController::class, 'index'])->name('gastos.index')->middleware('permission:gastos.ver');
    Route::post('/gastos', [ExpenseController::class, 'store'])->name('gastos.store')->middleware('permission:gastos.registrar');
    Route::get('/historial-gastos', [ExpenseController::class, 'history'])->name('gastos.history')->middleware('permission:gastos.ver');
    Route::put('/gastos/{expense}', [ExpenseController::class, 'update'])->name('gastos.update')->middleware('permission:gastos.registrar');
    Route::delete('/gastos/{expense}', [ExpenseController::class, 'destroy'])->name('gastos.destroy')->middleware('permission:gastos.aprobar');

    //Registro de pagos y devoluciones
    Route::get('/historial-pagos', [PaymentHistoryController::class, 'index'])->name('payments.history')->middleware('permission:caja.ver_todo');

    // Mantenimiento
    Route::get('/mantenimientos', [App\Http\Controllers\MaintenanceController::class, 'index'])->name('maintenances.index')->middleware('permission:habitaciones.estado_actual');
    Route::post('/mantenimientos', [App\Http\Controllers\MaintenanceController::class, 'store'])->name('maintenances.store')->middleware('permission:mantenimiento.notificar_averia');
    Route::put('/mantenimientos/{maintenance}/resolve', [App\Http\Controllers\MaintenanceController::class, 'resolve'])->name('maintenances.resolve')->middleware('permission:habitaciones.cambiar_estado');
    Route::delete('/mantenimientos/{maintenance}', [App\Http\Controllers\MaintenanceController::class, 'destroy'])->name('maintenances.destroy')->middleware('permission:habitaciones.cambiar_estado');

    //Roles
    Route::get('/roles', [RoleController::class, 'index'])->name('roles.index')->middleware('permission:roles.gestionar');
    Route::post('/roles', [RoleController::class, 'store'])->name('roles.store')->middleware('permission:roles.gestionar');
    Route::put('/roles/{role}', [RoleController::class, 'update'])->name('roles.update')->middleware('permission:roles.gestionar');
    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy')->middleware('permission:roles.gestionar');

    //Permisos
    Route::get('/permisos', [PermissionController::class, 'index'])->name('permissions.index')->middleware('permission:permisos.gestionar');
    Route::post('/permisos', [PermissionController::class, 'store'])->name('permissions.store')->middleware('permission:permisos.gestionar');
    Route::put('/permisos/{permission}', [PermissionController::class, 'update'])->name('permissions.update')->middleware('permission:permisos.gestionar');
    Route::delete('/permisos/{permission}', [PermissionController::class, 'destroy'])->name('permissions.destroy')->middleware('permission:permisos.gestionar');

    //Verificación de Reserva online (aprobación interna de pagos)
    Route::post('/admin/reservas/{id}/aprobar-pago', [AdminBookingController::class, 'approvePayment'])->name('admin.bookings.approve-payment')->middleware('permission:reservas.editar');
    Route::post('/admin/reservas/{id}/rechazar-pago', [AdminBookingController::class, 'rejectPayment'])->name('admin.bookings.reject-payment')->middleware('permission:reservas.editar');
    Route::get('/reservar/recibo/{id}', [OnlineBookingController::class, 'showReceipt'])->name('booking.receipt')->middleware('permission:reservas.ver_todos');
    // NOTA: la siguiente ruta interna duplica el endpoint público '/reservar' (POST) declarado más abajo.
    // Se conserva por compatibilidad, pero protegida; el flujo público real usa la de la sección pública.
    Route::post('/reservar/interno', [OnlineBookingController::class, 'store'])->name('booking.store.internal')->middleware('permission:reservas.crear');

    // ==========================================
    // MÓDULO DE FACTURACIÓN Y GESTIÓN DE DOCUMENTOS
    // ==========================================

    // 1. Mostrar la tabla de gestión (React lee el JSON)
    Route::get('/facturacion', [InvoiceController::class, 'index'])
        ->name('invoices.index')->middleware('permission:facturas.ver_todas');

    // 2. Ruta GET para el iframe/descarga del PDF
    //    (evita el error de "JSON Unexpected token 'H'")
    Route::get('/facturacion/{invoice}/download', [InvoiceController::class, 'downloadTicket'])
        ->name('invoices.download')->middleware('permission:recibos.imprimir');

    // 3. Procesar Anulación de una factura (POST) — solo Gerente
    Route::post('/facturacion/{invoice}/anular', [InvoiceController::class, 'void'])
        ->name('invoices.void')->middleware('permission:anulaciones.autorizar');

    // 4. Re-enviar UNA factura Offline / Contingencia al SIAT (POST)
    Route::post('/facturacion/{invoice}/resend-offline', [InvoiceController::class, 'resendOffline'])
        ->name('invoices.resend-offline')->middleware('permission:facturar.emitir');

    // Revalidar factura RECHAZADA u OFFLINE (mismo invoice_number, nuevo CUF).
    Route::post('/facturacion/{invoice}/revalidar', [InvoiceController::class, 'revalidate'])
        ->name('invoices.revalidate')->middleware('permission:facturar.emitir');

    // Corregir y emitir NUEVA factura cuando la original fue ANULADA.
    Route::post('/facturacion/{invoice}/corregir-reemitir', [InvoiceController::class, 'correctAndReissue'])
        ->name('invoices.correct-reissue')->middleware('permission:facturar.emitir');

    // 5. Vista básica de la factura (ticket)
    Route::get('/facturacion/{invoice}', [InvoiceController::class, 'show'])
        ->name('invoices.show')->middleware('permission:facturas.ver_todas');

    // ==========================================
    // MÓDULO DE CONTINGENCIA SIAT (EVENTOS SIGNIFICATIVOS)
    // ==========================================

    // ============== CONTINGENCIA SIAT (EVENTOS SIGNIFICATIVOS) ==============
    //
    // ⚠️ IMPORTANTE: ORDEN DE LAS RUTAS.
    // Laravel matchea las rutas en el ORDEN en que están declaradas. Las rutas
    // estáticas (segmentos literales como "disponibles-para-acople" o
    // "estado/actual") SIEMPRE deben declararse ANTES que las rutas con
    // parámetros tipo {event}. De lo contrario, Laravel tratará la palabra
    // como un ID y disparará un error de tipo bigint en PostgreSQL.
    //
    // Ejemplo del bug que esto previene:
    //   GET /contingencias/disponibles-para-acople
    //   -> si "{event}" estuviera primero, Laravel intentaría:
    //      SELECT * FROM significant_events WHERE id = 'disponibles-para-acople'
    //      -> 22P02 Invalid text representation for type bigint

    // --- RUTAS ESTÁTICAS (van PRIMERO) -----------------------------------
    Route::get('/contingencias', [SignificantEventController::class, 'index'])
        ->middleware('permission:anulaciones.autorizar')
        ->name('significant-events.index');

    // Estado actual: ¿hay un evento activo ahora mismo?
    Route::get('/contingencias/estado/actual', [SignificantEventController::class, 'currentStatus'])
        ->name('significant-events.current')->middleware('permission:facturar.emitir');

    // Abrir un evento significativo (entra en modo contingencia / offline)
    Route::post('/contingencias/iniciar', [SignificantEventController::class, 'start'])
        ->name('significant-events.start')->middleware('permission:anulaciones.autorizar');

    // Rescate masivo de huérfanas (crea evento + vincula todas)
    Route::post('/contingencias/rescate-huerfanas', [SignificantEventController::class, 'rescueOrphans'])
        ->name('significant-events.rescue-orphans')->middleware('permission:anulaciones.autorizar');

    // JSON: eventos disponibles para acoplar (consumido por el modal)
    Route::get('/contingencias/disponibles-para-acople', [SignificantEventController::class, 'attachable'])
        ->name('significant-events.attachable')->middleware('permission:facturar.emitir');

    // --- RUTAS CON {event} (van DESPUÉS) ---------------------------------
    Route::get('/contingencias/{event}', [SignificantEventController::class, 'show'])
        ->name('significant-events.show')->middleware('permission:anulaciones.autorizar');

    Route::post('/contingencias/{event}/finalizar', [SignificantEventController::class, 'end'])
        ->name('significant-events.end')->middleware('permission:anulaciones.autorizar');

    Route::post('/contingencias/{event}/reenviar', [SignificantEventController::class, 'resendOfflineInvoices'])
        ->name('significant-events.resend')->middleware('permission:facturar.emitir');

    Route::post(
        '/contingencias/{event}/reintentar-registro',
        [SignificantEventController::class, 'retryRegister']
    )->name('significant-events.retry-register')->middleware('permission:anulaciones.autorizar');

    Route::post('/contingencias/{event}/acoplar-factura', [SignificantEventController::class, 'attachInvoice'])
        ->name('significant-events.attach-invoice')->middleware('permission:facturar.emitir');

    // --- OTROS endpoints relacionados ------------------------------------
    Route::post('/facturacion/rescatar-huerfanas', [InvoiceController::class, 'rescueOrphanedOffline'])
        ->name('invoices.rescue-orphaned')->middleware('permission:facturar.emitir');

    // Auditoría de actividades
    Route::get('/auditoria', [ActivityLogController::class, 'index'])->name('activity-logs.index')->middleware('permission:auditoria.ver');
}); // <-- Cierre del grupo autenticado

// ==========================================
// RESERVAS ONLINE (Rutas públicas)
// ==========================================
Route::get('/reservar', [OnlineBookingController::class, 'index'])->name('booking.index');
Route::post('/reservar/confirmar', [OnlineBookingController::class, 'store'])->name('booking.confirm');
Route::post('/reservar', [OnlineBookingController::class, 'store'])->name('booking.store');

// Mostrar el PDF del recibo final de reserva online
Route::get('/reservar/recibo-publico/{id}', [OnlineBookingController::class, 'showReceipt'])->name('booking.receipt_public');

Route::get('/storage/{path}', function (string $path) {
    abort_unless(Storage::disk('public')->exists($path), 404);
    return Storage::disk('public')->response($path);
})->where('path', '.*')->name('storage.public');


require __DIR__ . '/settings.php';