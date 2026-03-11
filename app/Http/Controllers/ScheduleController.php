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
            'name' => 'required|string|max:100|unique:schedules,name,' . $schedule->id,
            'check_in_time' => 'required',
            'check_out_time' => 'required',
            'entry_tolerance_minutes' => 'required|integer|min:0',
            'exit_tolerance_minutes' => 'required|integer|min:0',
            'is_active' => 'boolean'
        ]);

        // VERIFICAMOS SI ESTÁ EN USO POR HUÉSPEDES ACTIVOS
        $enUsoActivo = \App\Models\Checkin::where('schedule_id', $schedule->id)
            ->where('status', 'activo')
            ->exists();

        // Si está en uso, PERMITIMOS editar tolerancias y desactivar, 
        // pero BLOQUEAMOS la edición de las horas fijas de entrada/salida.
        if ($enUsoActivo) {
            if (
                $validated['check_in_time'] != $schedule->check_in_time ||
                $validated['check_out_time'] != $schedule->check_out_time
            ) {
                return redirect()->back()->with('error', 'No puedes modificar las horas fijas (Entrada/Salida) porque hay huéspedes usándolo actualmente. Solo puedes editar los minutos de tolerancia o desactivarlo.');
            }
        }

        $schedule->update([
            'name' => strtoupper($validated['name']),
            'check_in_time' => $validated['check_in_time'],
            'check_out_time' => $validated['check_out_time'],
            'entry_tolerance_minutes' => $validated['entry_tolerance_minutes'],
            'exit_tolerance_minutes' => $validated['exit_tolerance_minutes'],
            'is_active' => $request->has('is_active') ? $validated['is_active'] : $schedule->is_active,
        ]);

        return redirect()->back()->with('success', 'Horario actualizado correctamente.');
    }

    /**
     * Alterna el estado Activo/Inactivo rápidamente.
     */
    public function toggleStatus(Schedule $schedule)
    {
        // Ya NO bloqueamos esto. Si lo desactivan, simplemente deja de salir en el Formulario de Check-in.
        $schedule->update(['is_active' => !$schedule->is_active]);
        
        $estado = $schedule->is_active ? 'activado' : 'desactivado (oculto para nuevos registros)';
        return redirect()->back()->with('success', "Horario {$estado} correctamente.");
    }

    /**
     * Elimina un horario permanentemente.
     */
    public function destroy(Schedule $schedule)
    {
        // ESTO SÍ SE MANTIENE BLOQUEADO SIEMPRE.
        // Nunca borrar de la base de datos si alguien (activo o antiguo) lo usó.
        if ($schedule->checkins()->exists()) {
            return redirect()->back()->with('error', 'Imposible eliminar permanentemente. Este horario tiene un historial de huéspedes asignados. Para que no se use más, usa el botón de Desactivar.');
        }

        $schedule->delete();
        return redirect()->back()->with('success', 'Horario eliminado.');
    }
}