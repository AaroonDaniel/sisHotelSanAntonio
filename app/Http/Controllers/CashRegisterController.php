<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CashRegister;
use Illuminate\Support\Facades\Auth; // Agregamos esto para complacer a Intelephense

class CashRegisterController extends Controller
{
    // Función para abrir la caja al iniciar turno
    public function open(Request $request)
    {
        $request->validate([
            'opening_amount' => 'required|numeric|min:0',
        ]);

        // Usamos Auth::id() (método limpio que Intelephense reconoce al 100%)
        $hasOpenRegister = CashRegister::where('user_id', Auth::id())
                                       ->where('status', 'ABIERTA')
                                       ->exists();

        if ($hasOpenRegister) {
            return back()->with('error', 'Ya tienes un turno abierto.');
        }

        // Creamos la nueva caja
        CashRegister::create([
            'user_id' => Auth::id(),
            'opening_amount' => $request->opening_amount,
            'status' => 'ABIERTA',
        ]);

        return back()->with('success', 'Turno iniciado. ¡Que tengas un excelente día!');
    }
    // Función para cerrar la caja al finalizar turno
    public function close(Request $request)
    {
        // 1. Buscamos si el usuario tiene una caja abierta
        $activeRegister = CashRegister::where('user_id', Auth::id())
                                      ->where('status', 'ABIERTA')
                                      ->first();

        // 2. Si por alguna razón no tiene caja, lo devolvemos
        if (!$activeRegister) {
            return back()->with('error', 'No tienes ninguna caja abierta para cerrar.');
        }

        // 3. Cerramos la caja guardando la hora actual
        $activeRegister->update([
            'status' => 'CERRADA',
            'closed_at' => now(),
        ]);
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return back()->with('success', 'Turno cerrado correctamente. ¡Buen trabajo!');
    }
}