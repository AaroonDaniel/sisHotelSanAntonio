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
}