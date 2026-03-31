<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\CashRegister;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia; // <-- Importante para enviar a React

class ExpenseController extends Controller
{
    // 👇 1. NUEVA FUNCIÓN: Mostrar la página de Gastos
    public function index()
    {
        // Buscamos la caja abierta del usuario
        $activeRegister = CashRegister::where('user_id', Auth::id())
                                      ->where('status', 'ABIERTA')
                                      ->first();

        // Si tiene caja abierta, traemos sus gastos. Si no, un arreglo vacío.
        $gastos = [];
        if ($activeRegister) {
            $gastos = Expense::where('cash_register_id', $activeRegister->id)
                             ->orderBy('created_at', 'desc') // Los más nuevos primero
                             ->get();
        }

        // Enviamos los datos a la vista en la carpeta reports
        return Inertia::render('expenses/expense', [
            'activeRegister' => $activeRegister,
            'gastos' => $gastos,
        ]);
    }

    // 👇 2. LA FUNCIÓN DE GUARDAR (La que ya teníamos)
    public function store(Request $request)
    {
        $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.1',
        ]);

        $activeRegister = CashRegister::where('user_id', Auth::id())
                                      ->where('status', 'ABIERTA')
                                      ->first();

        if (!$activeRegister) {
            return back()->withErrors([
                'error' => 'No puedes registrar un gasto. Debes tener una Caja Registradora abierta.'
            ]);
        }

        Expense::create([
            'cash_register_id' => $activeRegister->id,
            'user_id' => Auth::id(),
            'description' => $request->description,
            'amount' => $request->amount,
        ]);

        return back()->with('success', 'Gasto registrado correctamente.');
    }
}