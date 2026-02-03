<?php

namespace App\Http\Controllers;

use App\Models\Schedule;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ScheduleController extends Controller
{
    /**
     * Muestra la lista de horarios en el Dashboard.
     */
    public function index()
    {
        // Obtenemos todos los horarios ordenados por creación
        $schedules = Schedule::orderBy('created_at', 'desc')->get();

        return Inertia::render('schedules/index', [
            'Schedules' => $schedules
        ]);
    }

    /**
     * Guarda un nuevo horario en la base de datos.
     */
    public function store(Request $request)
    {
        // 1. Validación estricta
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:schedules,name',
            'check_in_time' => 'required', // Formato HH:MM
            'check_out_time' => 'required',
            'entry_tolerance_minutes' => 'required|integer|min:0',
            'exit_tolerance_minutes' => 'required|integer|min:0',
        ]);

        // 2. Creación del registro
        Schedule::create([
            'name' => strtoupper($validated['name']), // Guardamos en mayúsculas
            'check_in_time' => $validated['check_in_time'],
            'check_out_time' => $validated['check_out_time'],
            'entry_tolerance_minutes' => $validated['entry_tolerance_minutes'],
            'exit_tolerance_minutes' => $validated['exit_tolerance_minutes'],
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', 'Horario creado correctamente.');
    }

    /**
     * Actualiza un horario existente.
     */
    public function update(Request $request, Schedule $schedule)
    {
        $validated = $request->validate([
            // Ignoramos el ID actual para la validación de nombre único
            'name' => 'required|string|max:100|unique:schedules,name,' . $schedule->id,
            'check_in_time' => 'required',
            'check_out_time' => 'required',
            'entry_tolerance_minutes' => 'required|integer|min:0',
            'exit_tolerance_minutes' => 'required|integer|min:0',
            'is_active' => 'boolean'
        ]);

        $schedule->update([
            'name' => strtoupper($validated['name']),
            'check_in_time' => $validated['check_in_time'],
            'check_out_time' => $validated['check_out_time'],
            'entry_tolerance_minutes' => $validated['entry_tolerance_minutes'],
            'exit_tolerance_minutes' => $validated['exit_tolerance_minutes'],
            'is_active' => $validated['is_active'] ?? $schedule->is_active,
        ]);

        return redirect()->back()->with('success', 'Horario actualizado correctamente.');
    }

    /**
     * Elimina un horario permanentemente.
     */
    public function destroy(Schedule $schedule)
    {
        // Opcional: Podrías verificar si hay checkins usando este horario antes de borrar
        // if ($schedule->checkins()->exists()) {
        //     return redirect()->back()->with('error', 'No se puede eliminar este horario porque está en uso.');
        // }

        $schedule->delete();
        return redirect()->back()->with('success', 'Horario eliminado.');
    }

    /**
     * Alterna el estado Activo/Inactivo rápidamente.
     */
    public function toggleStatus(Schedule $schedule)
    {
        $schedule->update(['is_active' => !$schedule->is_active]);
        
        $estado = $schedule->is_active ? 'activado' : 'desactivado';
        return redirect()->back()->with('success', "Horario {$estado} correctamente.");
    }
}