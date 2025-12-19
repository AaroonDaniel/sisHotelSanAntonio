<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::redirect('/', '/login');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('dashboard');
    })->name('Inicio');

    Route::get('/gestion-habitaciones', function () {
        // Cambia 'Rooms/Menu' por 'rooms/Menu' (o como esté tu carpeta)
        return Inertia::render('rooms/menu');
    })->name('rooms.menu');
});
require __DIR__ . '/settings.php';
