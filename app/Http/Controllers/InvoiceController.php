<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Checkin;
use Illuminate\Http\Request;
use Inertia\Inertia;
class InvoiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // 1. Obtenemos las facturas con sus relaciones
        $invoices = Invoice::with([
            'checkin.guest', 
            'checkin.room',  
            'user'           
        ])
        // FILTRO: Solo traemos facturas de estadías que YA finalizaron (no activos)
        ->whereHas('checkin', function ($query) {
            $query->where('status', '!=', 'activo'); 
        })
        ->orderBy('issue_date', 'desc')
        ->orderBy('issue_time', 'desc')
        ->get()
        ->map(function ($invoice) {
            return [
                'id' => $invoice->id,
                'checkin_id' => $invoice->checkin_id, // <-- IMPORTANTE: Lo necesitamos para el PDF
                'invoice_number' => $invoice->invoice_number ?? 'S/N',
                'issue_date' => $invoice->issue_date ? $invoice->issue_date->format('d/m/Y') : '-',
                'issue_time' => $invoice->issue_time ? $invoice->issue_time->format('H:i') : '-',
                'control_code' => $invoice->control_code ?? '-',
                'payment_method' => $invoice->payment_method ?? 'No especificado',
                'status' => $invoice->status ?? 'Emitida',
                'guest_name' => $invoice->checkin->guest->full_name ?? ($invoice->checkin->guest->name ?? 'Sin Huésped'),
                'room_number' => $invoice->checkin->room->number ?? '-',
                'user_name' => $invoice->user->name ?? 'Desconocido',
            ];
        });

        return Inertia::render('invoices/index', [
            'Invoices' => $invoices
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Invoice $invoice)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Invoice $invoice)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Invoice $invoice)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Invoice $invoice)
    {
        //
    }
    // En InvoiceController.php

// Muestra los totales antes de confirmar el pago
public function preview(Checkin $checkin)
{
    // 1. Calcular Noches (Alojamiento Actual)
    $fechaEntrada = \Carbon\Carbon::parse($checkin->check_in_date);
    $fechaSalida = now();
    $dias = $fechaEntrada->diffInDays($fechaSalida);
    if ($dias < 1) $dias = 1; // Mínimo 1 día si ya ocupó
    
    $precioHab = $checkin->room->price->amount ?? 0;
    $totalAlojamiento = $dias * $precioHab;

    // 2. Calcular Servicios Actuales
    $totalServicios = 0;
    foreach ($checkin->services as $service) {
        $totalServicios += ($service->pivot->quantity * $service->pivot->selling_price);
    }

    // 3. Saldo Arrastrado (Deuda de habitaciones anteriores)
    $saldoAnterior = $checkin->carried_balance; 

    // 4. Adelantos (Pagos ya hechos en ESTA habitación)
    $totalPagado = $checkin->payments()->sum('amount');

    // 5. Gran Total
    $subtotal = $totalAlojamiento + $totalServicios + $saldoAnterior;
    $montoPagar = $subtotal - $totalPagado;

    return response()->json([
        'alojamiento' => $totalAlojamiento,
        'dias' => $dias,
        'servicios' => $totalServicios,
        'saldo_anterior' => $saldoAnterior, // <--- IMPORTANTE
        'pagado_anticipado' => $totalPagado,
        'total_a_pagar' => $montoPagar
    ]);
}
}
