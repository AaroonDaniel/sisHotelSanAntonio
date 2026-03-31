<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\CashRegister;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia; // <-- Importante para enviar a React

class ExpenseController extends Controller
{
    // ==========================================
    // VISTA: GASTOS DEL TURNO ACTUAL (CAJERO)
    // ==========================================
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

        // Enviamos los datos a la vista
        return Inertia::render('expenses/expense', [
            'activeRegister' => $activeRegister,
            'gastos' => $gastos,
        ]);
    }

    // ==========================================
    // VISTA: HISTORIAL GLOBAL DE GASTOS (ADMIN)
    // ==========================================
    public function history()
    {
        // Traemos todos los gastos, ordenados por los más recientes, y cargamos la relación 'user'
        $gastos = Expense::with('user')->orderBy('created_at', 'desc')->get();

        // IMPORTANTE: Asegúrate de que el nombre del archivo React coincida.
        // Si tu archivo se llama index.tsx dentro de la carpeta expenses, pon 'expenses/index'
        return Inertia::render('expenses/index', [
            'gastos' => $gastos,
        ]);
    }

    // ==========================================
    // ACCIÓN: GUARDAR NUEVO GASTO
    // ==========================================
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

    // ==========================================
    // ACCIÓN: ACTUALIZAR/EDITAR UN GASTO
    // ==========================================
    public function update(Request $request, Expense $expense)
    {
        $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.1',
        ]);

        // Actualizamos los datos del gasto
        $expense->update([
            'description' => $request->description,
            'amount' => $request->amount,
        ]);

        return back()->with('success', 'Gasto actualizado correctamente.');
    }

    // ==========================================
    // ACCIÓN: ELIMINAR UN GASTO
    // ==========================================
    public function destroy(Expense $expense)
    {
        // Eliminamos el gasto de la base de datos
        $expense->delete();

        return back()->with('success', 'Gasto eliminado correctamente.');
    }
}