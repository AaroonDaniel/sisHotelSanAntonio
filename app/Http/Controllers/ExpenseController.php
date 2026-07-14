<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\CashRegister;
use App\Models\User;
use App\Traits\RequiresOpenShift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia; // <-- Importante para enviar a React

class ExpenseController extends Controller
{
    use RequiresOpenShift;

    // ==========================================
    // VISTA: GASTOS DEL TURNO (POR OPERADOR)
    // ==========================================
    // Terminal Compartida: ya no hay "mi caja" ligada a Auth::id() (siempre
    // la cuenta genérica 'recepcion'). El recepcionista elige su avatar en
    // el OperatorSelector; recién ahí se busca SU caja abierta y sus gastos.
    public function index(Request $request)
    {
        $operatorId = $request->query('operator_id');

        $activeRegister = null;
        $gastos = [];

        if ($operatorId) {
            $activeRegister = CashRegister::where('user_id', $operatorId)
                ->where('status', 'ABIERTA')
                ->first();

            if ($activeRegister) {
                $gastos = Expense::where('cash_register_id', $activeRegister->id)
                    ->orderBy('created_at', 'desc')
                    ->get();
            }
        }

        return Inertia::render('expenses/expense', [
            'activeRegister' => $activeRegister,
            'gastos' => $gastos,
            'operators' => User::operadores()->get(['id', 'full_name', 'nickname']),
            'selectedOperatorId' => $operatorId ? (int) $operatorId : null,
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
            'operator_id' => 'required|exists:users,id',
        ], [
            'operator_id.required' => 'Debe seleccionar un operador para continuar.',
            'operator_id.exists' => 'Debe seleccionar un operador para continuar.',
        ]);

        // Apertura silenciosa: si el operador no tiene turno abierto, se le
        // crea uno automáticamente aquí mismo, sin interrumpir el registro
        // del gasto.
        $activeRegister = $this->findOpenShift((int) $request->operator_id);

        Expense::create([
            'cash_register_id' => $activeRegister->id,
            'user_id' => Auth::id(),
            'operator_id' => $request->operator_id,
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
