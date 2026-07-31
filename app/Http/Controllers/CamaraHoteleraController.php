<?php

namespace App\Http\Controllers;

use App\Models\CamaraHoteleraReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Partes diarios presentados ante la Cámara Hotelera Departamental de
 * Potosí. Reusa el mismo generador de PDF que el "Parte Diario" crudo
 * (ver ReportController::generateGuestsReportPdf(), consumido con los
 * `guest_ids` congelados acá) pero, a diferencia de ese módulo, SÍ
 * persiste cada parte con su estado (pendiente/confirmado).
 */
class CamaraHoteleraController extends Controller
{
    public function index()
    {
        $reports = CamaraHoteleraReport::with(['creator', 'confirmer'])
            ->orderByDesc('report_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (CamaraHoteleraReport $r) => [
                'id' => $r->id,
                'numero_parte' => $r->numero_parte,
                'report_date' => $r->report_date->toDateString(),
                'status' => $r->status,
                'guest_ids' => $r->guest_ids ?? [],
                'guest_count' => count($r->guest_ids ?? []),
                'created_by' => $r->creator->full_name ?? null,
                'confirmed_by' => $r->confirmer->full_name ?? null,
                'created_at' => $r->created_at?->toIso8601String(),
            ]);

        return Inertia::render('camara-hotelera/index', [
            'Reports' => $reports,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'report_date' => ['required', 'date'],
            'guest_ids' => ['required', 'array', 'min:1'],
            'guest_ids.*' => ['integer'],
        ]);

        $report = CamaraHoteleraReport::create([
            'numero_parte' => ReportController::numeroSerieForDate($data['report_date']),
            'report_date' => $data['report_date'],
            'guest_ids' => $data['guest_ids'],
            'status' => 'pendiente',
            'created_by' => Auth::id(),
        ]);

        return redirect()->back()->with('success', 'Parte creado como PENDIENTE (Nº ' . $report->numero_parte . ').');
    }

    public function edit(CamaraHoteleraReport $camaraHotelera, Request $request)
    {
        // Un parte CONFIRMADO queda definitivo: solo se puede editar
        // mientras está PENDIENTE.
        abort_if($camaraHotelera->status !== 'pendiente', 403, 'Solo se puede editar un parte PENDIENTE.');

        $data = $request->validate([
            'report_date' => ['required', 'date'],
            'guest_ids' => ['required', 'array', 'min:1'],
            'guest_ids.*' => ['integer'],
        ]);

        $camaraHotelera->update([
            'numero_parte' => ReportController::numeroSerieForDate($data['report_date']),
            'report_date' => $data['report_date'],
            'guest_ids' => $data['guest_ids'],
        ]);

        return redirect()->back()->with('success', 'Parte actualizado.');
    }

    public function confirm(CamaraHoteleraReport $camaraHotelera)
    {
        abort_if($camaraHotelera->status !== 'pendiente', 403, 'Solo se puede confirmar un parte PENDIENTE.');

        $camaraHotelera->update([
            'status' => 'confirmado',
            'confirmed_by' => Auth::id(),
            'confirmed_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Parte confirmado para la Cámara Hotelera de Potosí.');
    }

    /**
     * "Anular" un parte PENDIENTE lo borra directamente: nunca se llegó a
     * presentar ante la Cámara, no queda nada que dejar como registro
     * histórico. Un parte CONFIRMADO es definitivo y no se puede tocar
     * -- ver nota de inmutabilidad en confirm()/edit().
     */
    public function destroy(CamaraHoteleraReport $camaraHotelera)
    {
        abort_if($camaraHotelera->status !== 'pendiente', 403, 'Solo se puede anular un parte PENDIENTE.');

        $camaraHotelera->delete();

        return redirect()->back()->with('success', 'Parte anulado.');
    }

    /**
     * Tabla de "Ver Reportes de Cámara Hotelera de Potosí" del dashboard
     * (antes apuntaba al Generador de Parte Diario crudo): SOLO los
     * partes ya confirmados -- los pendientes no son un trámite terminado
     * y no pertenecen acá.
     */
    public function confirmedIndex()
    {
        $reports = CamaraHoteleraReport::with('confirmer')
            ->where('status', 'confirmado')
            ->orderByDesc('report_date')
            ->get()
            ->map(fn (CamaraHoteleraReport $r) => [
                'id' => $r->id,
                'numero_parte' => $r->numero_parte,
                'report_date' => $r->report_date->toDateString(),
                'guest_ids' => $r->guest_ids ?? [],
                'confirmed_by' => $r->confirmer->full_name ?? null,
                'confirmed_at' => $r->confirmed_at?->toIso8601String(),
            ]);

        return Inertia::render('camara-hotelera/confirmed', [
            'Reports' => $reports,
        ]);
    }
}
