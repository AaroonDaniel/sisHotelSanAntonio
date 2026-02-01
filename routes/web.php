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
use Illuminate\Support\Facades\Route;

use Inertia\Inertia;

Route::redirect('/', '/login');

Route::middleware(['auth', 'verified'])->group(function () {

    // Vista previa de servicios adicionales huesped
    Route::get('/guests/view-detail', [CheckinController::class, 'generateViewDetail'])->name('guests.view_detail');


    Route::get('/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('Inicio');

    //Habitaciones
    Route::get('/gestion-habitaciones', function () {
        // Cambia 'Rooms/Menu' por 'rooms/Menu' (o como esté tu carpeta)
        return Inertia::render('rooms/menu');
    })->name('rooms.menu');

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
    // Nota: El parámetro en la URL es {checkin} para coincidir con el controlador
    Route::get('/checks', [CheckinController::class, 'index'])->name('checks.index');
    Route::get('/checks/crear', [CheckinController::class, 'create'])->name('checks.create');
    Route::post('/checks', [CheckinController::class, 'store'])->name('checks.store');
    Route::put('/checks/{checkin}', [CheckinController::class, 'update'])->name('checks.update');
    Route::delete('/checks/{checkin}', [CheckinController::class, 'destroy'])->name('checks.destroy');
    // 1. Ruta para finalizar la estadía (Checkout) - Usamos() PUT
    Route::put('/checks/{checkin}/checkout', [CheckinController::class, 'checkout']);
    // 2. Ruta para el PDF de salida (vista de recibo)
    Route::get('/checks/{checkin}/checkout-receipt', [CheckinController::class, 'generateCheckoutReceipt']);
    // 3. Rruta para el PDF de salida (vista de factura)
    Route::get('/checks/{checkin}/checkout-invoice', [CheckinController::class, 'generateCheckoutInvoice']);
    // 3. Ruta para el PDF de ingreso (Solo asignación)
    Route::get('/checks/{checkin}/receipt', [CheckinController::class, 'generateAssignmentReceipt']);
    // Ruta para cancelar asignación (Agregar debajo de checks.destroy)
    Route::delete('/checks/{checkin}/cancel-assignment', [CheckinController::class, 'cancelAssignment'])->name('checks.cancel_assignment');

    // Detalle de asignacionb
    Route::get('/checkindetails', [CheckinDetailController::class, 'index'])->name('checkindetails.index');
    Route::post('/checkin-details', [CheckinDetailController::class, 'store'])->name('checkindetails.store');
    Route::put('/checkin-details/{id}', [CheckinDetailController::class, 'update'])->name('checkindetails.update');
    Route::delete('/checkin-details/{id}', [CheckinDetailController::class, 'destroy'])->name('checkindetails.destroy');
    // Vista previa de servicios adicionales huesped
    Route::get('/guests/view-detail', [CheckinController::class, 'generateViewDetail'])->name('guests.view_detail');
    Route::get('/api/checkin-details/{checkin_id}', [CheckinDetailController::class, 'listByCheckin']);
    
    //Reportes 
    // Página principal de reportes
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    // Verificar estado para Libro Diario (AJAX)
    Route::get('/reports/check-daily-book', [ReportController::class, 'checkDailyBookStatus'])->name('reports.check_daily');
    // Generar PDF Libro Diario
    Route::get('/reports/daily-book-pdf', [ReportController::class, 'generateDailyBookPdf'])->name('reports.daily_pdf');
});

require __DIR__ . '/settings.php';
