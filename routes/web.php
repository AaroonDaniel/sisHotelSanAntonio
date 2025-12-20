<?php

use App\Http\Controllers\BlockController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::redirect('/', '/login');

Route::middleware(['auth', 'verified'])->group(function () {
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

});
require __DIR__ . '/settings.php';
