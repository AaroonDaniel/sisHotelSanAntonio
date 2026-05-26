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

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/login');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::get('/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('Inicio');

    //Usuarios
    Route::resource('usuarios', UserController::class)->only(['index', 'store', 'update', 'destroy']);

    //Perfil de Usuario
    Route::get('/user/profile', [UserProfileController::class, 'edit'])->name('user.profile.edit');
    Route::patch('/user/profile', [UserProfileController::class, 'update'])->name('user.profile.update');
    Route::patch('/user/password', [UserProfileController::class, 'updatePassword'])->name('user.profile.password');

    // Bloques
    Route::get('/bloques', [BlockController::class, 'index'])->name('blocks.index');
    Route::get('/bloques/crear', [BlockController::class, 'create'])->name('blocks.create');
    Route::post('/bloques', [BlockController::class, 'store'])->name('blocks.store');
    Route::put('/bloques/{block}', [BlockController::class, 'update'])->name('blocks.update');
    Route::delete('/bloques/{block}', [BlockController::class, 'destroy'])->name('blocks.destroy');
    Route::patch('/bloques/{block}/toggle', [BlockController::class, 'toggleStatus'])->name('blocks.toggle');

    //Pisos
    Route::get('/pisos', [FloorController::class, 'index'])->name('floors.index');
    Route::post('/pisos', [FloorController::class, 'store'])->name('floors.store');
    Route::put('/pisos/{floor}', [FloorController::class, 'update'])->name('floors.update');
    Route::delete('/pisos/{floor}', [FloorController::class, 'destroy'])->name('floors.destroy');
    Route::patch('/pisos/{floor}/toggle', [FloorController::class, 'toggleStatus'])->name('floors.toggle');

    //Tipos de Habitaciones
    Route::get('/tipohabitacion', [RoomTypeController::class, 'index'])->name('room_types.index');
    Route::get('/tipohabitacion/crear', [RoomTypeController::class, 'create'])->name('room_types.create');
    Route::post('/tipohabitacion', [RoomTypeController::class, 'store'])->name('room_types.store');
    Route::put('/tipohabitacion/{roomType}', [RoomTypeController::class, 'update'])->name('room_types.update');
    Route::delete('/tipohabitacion/{roomType}', [RoomTypeController::class, 'destroy'])->name('room_types.destroy');
    Route::patch('/tipohabitacion/{roomType}/toggle', [RoomTypeController::class, 'toggleStatus'])->name('room_types.toggle');
    Route::get('/status', [RoomController::class, 'status'])->name('rooms.status');

    //Tipos de precios habitaciones
    Route::get('/precios', [PriceController::class, 'index'])->name('prices.index');
    Route::get('/precios/crear', [PriceController::class, 'create'])->name('prices.create');
    Route::post('/precios', [PriceController::class, 'store'])->name('prices.store');
    Route::put('/precios/{price}', [PriceController::class, 'update'])->name('prices.update');
    Route::delete('/precios/{price}', [PriceController::class, 'destroy'])->name('prices.destroy');
    Route::patch('/precios/{price}/toggle', [PriceController::class, 'toggleStatus'])->name('prices.toggle');

    //Habitaciones
    Route::get('/habitaciones', [RoomController::class, 'index'])->name('rooms.index');
    Route::get('/habitaciones/crear', [RoomController::class, 'create'])->name('rooms.create');
    Route::post('/habitaciones', [RoomController::class, 'store'])->name('rooms.store');
    Route::put('/habitaciones/{room}', [RoomController::class, 'update'])->name('rooms.update');
    Route::delete('/habitaciones/{room}', [RoomController::class, 'destroy'])->name('rooms.destroy');
    Route::patch('/habitaciones/{room}/toggle', [RoomController::class, 'toggleStatus'])->name('rooms.toggle');
    Route::post('/rooms/{room}/maintenance', [RoomController::class, 'markAsMaintenance'])->name('rooms.maintenance');
    Route::put('/rooms/{room}/finish-maintenance', [RoomController::class, 'finishMaintenance'])->name('rooms.finish_maintenance');
    Route::put('/rooms/{room}/clean', [RoomController::class, 'markAsClean'])->name('rooms.markAsClean');

    //Invitados
    Route::get('/invitados', [GuestController::class, 'index'])->name('guests.index');
    Route::get('/invitados/crear', [GuestController::class, 'create'])->name('guests.create');
    Route::post('/invitados', [GuestController::class, 'store'])->name('guests.store');
    Route::put('/invitados/{guest}', [GuestController::class, 'update'])->name('guests.update');
    Route::delete('/invitados/{guest}', [GuestController::class, 'destroy'])->name('guests.destroy');
    Route::patch('/invitados/{guest}/toggle', [GuestController::class, 'toggleStatus'])->name('guests.toggle');

    //Servicios
    Route::get('/servicios', [ServiceController::class, 'index'])->name('services.index');
    Route::get('/servicios/crear', [ServiceController::class, 'create'])->name('services.create');
    Route::post('/servicios', [ServiceController::class, 'store'])->name('services.store');
    Route::put('/servicios/{service}', [ServiceController::class, 'update'])->name('services.update');
    Route::delete('/servicios/{service}', [ServiceController::class, 'destroy'])->name('services.destroy');
    Route::patch('/servicios/{service}/toggle', [ServiceController::class, 'toggleStatus'])->name('services.toggle');

    // --- RECEPCIÓN (CHECKS) ---
    Route::get('/checks', [CheckinController::class, 'index'])->name('checks.index');
    Route::get('/checks/crear', [CheckinController::class, 'create'])->name('checks.create');
    Route::post('/checks', [CheckinController::class, 'store'])->name('checks.store');
    Route::put('/checks/{checkin}', [CheckinController::class, 'update'])->name('checks.update');
    Route::delete('/checks/{checkin}', [CheckinController::class, 'destroy'])->name('checks.destroy');

    // Rutas adicionales de checks
    Route::put('/checks/{checkin}/checkout', [CheckinController::class, 'checkout']);
    Route::get('/checks/{checkin}/checkout-receipt', [CheckinController::class, 'generateCheckoutReceipt']);
    Route::get('/checks/{checkin}/checkout-invoice', [CheckinController::class, 'generateCheckoutInvoice']);
    Route::get('/checks/{checkin}/receipt', [CheckinController::class, 'generateAssignmentReceipt']);
    Route::delete('/checks/{checkin}/cancel-assignment', [CheckinController::class, 'cancelAssignment'])->name('checks.cancel_assignment');
    Route::get('/checks/{checkin}/checkout-details', [CheckinController::class, 'getCheckoutDetails']);
    Route::post('/checkins/{checkin}/payments', [CheckinController::class, 'storePayment'])->name('checkins.payments.store');
    Route::get('/search/origins', [GuestController::class, 'searchOrigins'])->name('search.origins');
    Route::get('/search/professions', [GuestController::class, 'searchProfessions'])->name('search.professions');
    Route::get('/search/issued-in', [GuestController::class, 'searchIssuedIn'])->name('search.issued-in');
    Route::post('/checkins/multi-checkout', [CheckinController::class, 'multiCheckout'])->name('checkins.multiCheckout');
    Route::post('/checkins/{checkin}/cancel-agreement', [CheckinController::class, 'cancelAgreement'])
        ->name('checkins.cancelAgreement');
    Route::get('/checkins/preview-price', [CheckinController::class, 'previewPrice'])
        ->name('checkins.previewPrice');

    // Ruta Original (POST)
    Route::post('/checkins/{checkin}/transfer', [CheckinController::class, 'transfer'])->name('checkins.transfer');

    // Ruta de Tolerancia (PUT)
    Route::put('/checkins/{checkin}/transfer', [CheckinController::class, 'transfer'])->name('checkins.update_transfer');

    Route::post('/checkins/{checkin}/add-payment', [CheckinController::class, 'addPayment'])->name('checkins.addPayment');
    Route::post('/checkins/from-reservation', [CheckinController::class, 'storeFromReservation'])->name('checkins.fromReservation');
    Route::post('/checkins/{checkin}/refund', [CheckinController::class, 'refund'])->name('checkins.refund');

    // Ruta de Merge
    Route::post('/checkins/{checkin}/merge', [CheckinController::class, 'merge'])->name('checkins.merge');

    // Detalle de asignacion
    Route::get('/checkindetails', [CheckinDetailController::class, 'index'])->name('checkindetails.index');
    Route::post('/checkin-details', [CheckinDetailController::class, 'store'])->name('checkindetails.store');
    Route::put('/checkin-details/{id}', [CheckinDetailController::class, 'update'])->name('checkindetails.update');
    Route::delete('/checkin-details/{id}', [CheckinDetailController::class, 'destroy'])->name('checkindetails.destroy');

    // Vista previa de servicios adicionales huésped
    Route::get('/guests/view-detail', [CheckinController::class, 'generateViewDetail'])->name('guests.view_detail');
    Route::get('/api/checkin-details/{checkin_id}', [CheckinDetailController::class, 'listByCheckin']);

    // Horarios
    Route::get('/horarios', [ScheduleController::class, 'index'])->name('schedules.index');
    Route::post('/horarios', [ScheduleController::class, 'store'])->name('schedules.store');
    Route::put('/horarios/{schedule}', [ScheduleController::class, 'update'])->name('schedules.update');
    Route::delete('/horarios/{schedule}', [ScheduleController::class, 'destroy'])->name('schedules.destroy');
    Route::patch('/horarios/{schedule}/toggle', [ScheduleController::class, 'toggleStatus'])->name('schedules.toggle');

    //Reserva
    Route::get('/reservas', [ReservationController::class, 'reception'])->name('reservations.index');
    Route::get('/admin/reservas', [ReservationController::class, 'index'])->name('reservations.admin');
    Route::post('/reservas', [ReservationController::class, 'store'])->name('reservations.store');
    Route::put('/reservas/{reservation}', [ReservationController::class, 'update'])->name('reservations.update');
    Route::delete('/reservas/{reservation}', [ReservationController::class, 'destroy'])->name('reservations.destroy');
    Route::get('/api/reservations/availability', [ReservationController::class, 'checkAvailability'])->name('reservations.availability');
    Route::post('/reservas/{id}/assign-rooms', [ReservationController::class, 'assignRooms'])->name('reservations.assign');

    //Reportes
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/reports/generate-pdf', [ReportController::class, 'generateGuestsReportPdf'])->name('reports.pdf');
    Route::get('/reports/financialMovement', [ReportController::class, 'financialMovement'])->name('reports.financialMovement');
    //Cierre de caja
    Route::get('/reports/financial', [ReportController::class, 'financialIndex'])->name('reports.financial');
    Route::get('/reports/financial/pdf', [ReportController::class, 'generateFinancialReportPdf'])->name('reports.financialPdf');
    Route::get('/reports/financial/excel', [ReportController::class, 'generateFinancialReportExcel'])->name('reports.financialExcel');
    Route::get('/reports/check-daily-book', [ReportController::class, 'checkDailyBookStatus'])->name('reports.check_daily');
    Route::post('/cash-registers/open', [CashRegisterController::class, 'open'])->name('cash-registers.open');
    Route::post('/cash-registers/close', [CashRegisterController::class, 'close'])->name('cash-registers.close');
    Route::get('/cash-registers/{cashRegister}', [CashRegisterController::class, 'show'])->name('cash-registers.show');


    //Gastos
    Route::get('/gastos', [ExpenseController::class, 'index'])->name('gastos.index');
    Route::post('/gastos', [ExpenseController::class, 'store'])->name('gastos.store');
    Route::get('/historial-gastos', [ExpenseController::class, 'history'])->name('gastos.history');
    Route::put('/gastos/{expense}', [ExpenseController::class, 'update'])->name('gastos.update');
    Route::delete('/gastos/{expense}', [ExpenseController::class, 'destroy'])->name('gastos.destroy');

    // Mantenimiento
    Route::get('/mantenimientos', [App\Http\Controllers\MaintenanceController::class, 'index'])->name('maintenances.index');
    Route::post('/mantenimientos', [App\Http\Controllers\MaintenanceController::class, 'store'])->name('maintenances.store');
    Route::put('/mantenimientos/{maintenance}/resolve', [App\Http\Controllers\MaintenanceController::class, 'resolve'])->name('maintenances.resolve');
    Route::delete('/mantenimientos/{maintenance}', [App\Http\Controllers\MaintenanceController::class, 'destroy'])->name('maintenances.destroy');

    //Roles
    Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
    Route::post('/roles', [RoleController::class, 'store'])->name('roles.store');
    Route::put('/roles/{role}', [RoleController::class, 'update'])->name('roles.update');
    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');

    //Permisos
    Route::get('/permisos', [PermissionController::class, 'index'])->name('permissions.index');
    Route::post('/permisos', [PermissionController::class, 'store'])->name('permissions.store');
    Route::put('/permisos/{permission}', [PermissionController::class, 'update'])->name('permissions.update');
    Route::delete('/permisos/{permission}', [PermissionController::class, 'destroy'])->name('permissions.destroy');

    //Verificación de Reserva online
    Route::post('/admin/reservas/{id}/aprobar-pago', [AdminBookingController::class, 'approvePayment'])->name('admin.bookings.approve-payment');
    Route::post('/admin/reservas/{id}/rechazar-pago', [AdminBookingController::class, 'rejectPayment'])->name('admin.bookings.reject-payment');
    Route::get('/reservar/recibo/{id}', [OnlineBookingController::class, 'showReceipt'])->name('booking.receipt');
    Route::post('/reservar', [OnlineBookingController::class, 'store'])->name('booking.store');

    // ==========================================
    // MÓDULO DE FACTURACIÓN Y GESTIÓN DE DOCUMENTOS
    // ==========================================

    // 1. Mostrar la tabla de gestión (React lee el JSON)
    Route::get('/facturacion', [InvoiceController::class, 'index'])
        ->name('invoices.index');

    // 2. Ruta GET para el iframe/descarga del PDF
    //    (evita el error de "JSON Unexpected token 'H'")
    Route::get('/facturacion/{invoice}/download', [InvoiceController::class, 'downloadTicket'])
        ->name('invoices.download');

    // 3. Procesar Anulación de una factura (POST) — solo Gerente
    Route::post('/facturacion/{invoice}/anular', [InvoiceController::class, 'void'])
        ->name('invoices.void');

    // 4. Re-enviar UNA factura Offline / Contingencia al SIAT (POST)
    Route::post('/facturacion/{invoice}/resend-offline', [InvoiceController::class, 'resendOffline'])
        ->name('invoices.resend-offline');

    // 5. Vista básica de la factura (ticket)
    Route::get('/facturacion/{invoice}', [InvoiceController::class, 'show'])
        ->name('invoices.show');

    // ==========================================
    // MÓDULO DE CONTINGENCIA SIAT (EVENTOS SIGNIFICATIVOS)
    // ==========================================

    // Listado de eventos de contingencia
    Route::get('/contingencias', [SignificantEventController::class, 'index'])
        ->name('significant-events.index');

    // Estado actual: ¿hay un evento activo ahora mismo?
    // (lo consulta la UI para mostrar el banner "MODO OFFLINE ACTIVO")
    Route::get('/contingencias/estado/actual', [SignificantEventController::class, 'currentStatus'])
        ->name('significant-events.current');

    // Abrir un evento significativo (entra en modo contingencia / offline)
    Route::post('/contingencias/iniciar', [SignificantEventController::class, 'start'])
        ->name('significant-events.start');

    // Detalle de un evento de contingencia
    Route::get('/contingencias/{event}', [SignificantEventController::class, 'show'])
        ->name('significant-events.show');

    // Cerrar un evento significativo (vuelve a modo online)
    Route::post('/contingencias/{event}/finalizar', [SignificantEventController::class, 'end'])
        ->name('significant-events.end');

    // Re-enviar al SIAT TODAS las facturas offline de un evento (envío masivo)
    Route::post('/contingencias/{event}/reenviar', [SignificantEventController::class, 'resendOfflineInvoices'])
        ->name('significant-events.resend');


    
    Route::post('significant-events/start', [SignificantEventController::class, 'start'])->name('significant-events.start');
    Route::post('significant-events/{event}/end', [SignificantEventController::class, 'end'])->name('significant-events.end');
    Route::get('significant-events/{event}', [SignificantEventController::class, 'show'])->name('significant-events.show');
    Route::post('significant-events/{event}/resend', [SignificantEventController::class, 'resendOfflineInvoices'])->name('significant-events.resend');



    // Auditoría de actividades
    Route::get('/auditoria', [ActivityLogController::class, 'index'])->name('activity-logs.index');

}); // <-- Cierre del grupo autenticado

// ==========================================
// RESERVAS ONLINE (Rutas públicas)
// ==========================================
Route::get('/reservar', [OnlineBookingController::class, 'index'])->name('booking.index');
Route::post('/reservar/confirmar', [OnlineBookingController::class, 'store'])->name('booking.confirm');

Route::get('/reservar/recibo/{id}', [OnlineBookingController::class, 'showReceipt'])->name('booking.receipt');
Route::post('/reservar', [OnlineBookingController::class, 'store'])->name('booking.store');


// Mostrar el PDF del recibo final de reserva online
Route::get('/reservar/recibo-publico/{id}', [OnlineBookingController::class, 'showReceipt'])->name('booking.receipt_public');

require __DIR__ . '/settings.php';
