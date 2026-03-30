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
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Illuminate\Suport\Facades\DB;
use Inertia\Inertia;

Route::redirect('/', '/login');

Route::middleware(['auth', 'verified'])->group(function () {

    // --- CORRECCIÓN 1: Borrada la ruta duplicada de aquí arriba ---
    // (La dejé solo abajo para mantener el orden, o puedes descomentarla aquí y borrar la de abajo)

    Route::get('/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('Inicio');

    //Habitaciones
    Route::get('/gestion-habitaciones', function () {
        return Inertia::render('rooms/menu');
    })->name('rooms.menu');

    //Usuarios
    Route::resource('usuarios', UserController::class)->only(['index', 'store', 'update', 'destroy']);

    //Perfil de Usuario
    Route::get('/user/profile', [UserProfileController::class, 'edit'])->name('user.profile.edit'); // <-- Le agregamos 'user.' al inicio
    Route::patch('/user/profile', [UserProfileController::class, 'update'])->name('user.profile.update');
    Route::patch('/user/password', [UserProfileController::class, 'updatePassword'])->name('user.profile.password');
    
    //Bloques
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
    Route::put('/rooms/{room}/clean', [App\Http\Controllers\RoomController::class, 'markAsClean'])->name('rooms.markAsClean');

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
    Route::get('/search/issued-in', [\App\Http\Controllers\GuestController::class, 'searchIssuedIn'])->name('search.issued-in');

    Route::post('/checkins/multi-checkout', [CheckinController::class, 'multiCheckout'])->name('checkins.multiCheckout');

    // --- CORRECCIÓN 2: Diferenciación de nombres en Transferencia ---
    // Ruta Original (POST)
    Route::post('/checkins/{checkin}/transfer', [CheckinController::class, 'transfer'])->name('checkins.transfer');
    
    // Ruta de Tolerancia (PUT) - LE CAMBIÉ EL NOMBRE A .update_transfer
    Route::put('/checkins/{checkin}/transfer', [CheckinController::class, 'transfer'])->name('checkins.update_transfer'); 
    
    Route::post('/checkins/{checkin}/add-payment', [App\Http\Controllers\CheckinController::class, 'addPayment'])->name('checkins.addPayment');
    Route::post('/checkins/from-reservation', [App\Http\Controllers\CheckinController::class, 'storeFromReservation'])->name('checkins.fromReservation');

    // Ruta de Merge
    Route::post('/checkins/{checkin}/merge', [CheckinController::class, 'merge'])->name('checkins.merge');

    // Detalle de asignacion
    Route::get('/checkindetails', [CheckinDetailController::class, 'index'])->name('checkindetails.index');
    Route::post('/checkin-details', [CheckinDetailController::class, 'store'])->name('checkindetails.store');
    Route::put('/checkin-details/{id}', [CheckinDetailController::class, 'update'])->name('checkindetails.update');
    Route::delete('/checkin-details/{id}', [CheckinDetailController::class, 'destroy'])->name('checkindetails.destroy');
    
    // Vista previa de servicios adicionales huesped (Esta es la que vale, borré la de arriba)
    Route::get('/guests/view-detail', [CheckinController::class, 'generateViewDetail'])->name('guests.view_detail');
    Route::get('/api/checkin-details/{checkin_id}', [CheckinDetailController::class, 'listByCheckin']);

    // Horarios
    Route::get('/horarios', [ScheduleController::class, 'index'])->name('schedules.index');
    Route::post('/horarios', [ScheduleController::class, 'store'])->name('schedules.store');
    Route::put('/horarios/{schedule}', [ScheduleController::class, 'update'])->name('schedules.update');
    Route::delete('/horarios/{schedule}', [ScheduleController::class, 'destroy'])->name('schedules.destroy');
    Route::patch('/horarios/{schedule}/toggle', [ScheduleController::class, 'toggleStatus'])->name('schedules.toggle');

    //Reserva
    Route::get('/reservas', [ReservationController::class, 'index'])->name('reservations.index');
    Route::post('/reservas', [ReservationController::class, 'store'])->name('reservations.store');
    Route::put('/reservas/{reservation}', [ReservationController::class, 'update'])->name('reservations.update');
    Route::delete('/reservas/{reservation}', [ReservationController::class, 'destroy'])->name('reservations.destroy');
    Route::get('/api/reservations/availability', [ReservationController::class, 'checkAvailability'])->name('reservations.availability');
    Route::post('/reservas/{reservation}/assign-rooms', [ReservationController::class, 'assignRooms'])->name('reservations.assignRooms');
    //Facturacion
    Route::get('/facturacion', [\App\Http\Controllers\InvoiceController::class, 'index'])->name('invoices.index');

    //Reportes 
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/reports/generate-pdf', [ReportController::class, 'generateGuestsReportPdf'])->name('reports.pdf');
    //Cierre de caja
    Route::get('/reports/financial', [\App\Http\Controllers\ReportController::class, 'financialIndex'])->name('reports.financial');
    Route::get('/reports/financial/pdf', [\App\Http\Controllers\ReportController::class, 'generateFinancialReportPdf'])->name('reports.financialPdf');
    Route::get('/reports/financial/excel', [\App\Http\Controllers\ReportController::class, 'generateFinancialReportExcel'])->name('reports.financialExcel');
    Route::get('/reports/check-daily-book', [ReportController::class, 'checkDailyBookStatus'])->name('reports.check_daily');
    Route::post('/cash-registers/open', [CashRegisterController::class, 'open'])->name('cash-registers.open');
    Route::post('/cash-registers/close', [CashRegisterController::class, 'close'])->name('cash-registers.close');



});

require __DIR__ . '/settings.php';
