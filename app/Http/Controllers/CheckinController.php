<?php

namespace App\Http\Controllers;

// Si usas FPDF globalmente, esta línea a veces sobra, 
// pero la dejo porque en tu código anterior estaba.
use Fpdf; 

use App\Models\Checkin;
use App\Models\Guest;
use App\Models\Room;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB; // Importante para guardar Huésped y Checkin juntos

class CheckinController extends Controller
{
    public function index()
    {
        $checkins = Checkin::with(['guest', 'room.roomType'])
            ->orderBy('created_at', 'desc')
            ->get();

        $guests = Guest::orderBy('last_name')->get();
        $rooms = Room::with(['roomType', 'price'])->get(); 

        return Inertia::render('checkins/index', [
            'Checkins' => $checkins,
            'Guests' => $guests,
            'Rooms' => $rooms,
        ]);
    }

    // --- AQUÍ ESTÁ LA CORRECCIÓN PARA QUE GUARDE EL NUEVO HUÉSPED Y ACEPTE 0 DÍAS ---
    public function store(Request $request)
    {
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            
            // 1. Aceptamos 0 días (min:0)
            'duration_days' => 'required|integer|min:0', 
            
            'advance_payment' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            
            // 2. guest_id es opcional (nullable) para permitir nuevos
            'guest_id' => 'nullable|exists:guests,id',

            // 3. Validamos datos del huésped SOLO si es nuevo
            'first_name' => 'required_without:guest_id|nullable|string|max:255',
            'last_name' => 'required_without:guest_id|nullable|string|max:255',
            'identification_number' => 'required_without:guest_id|nullable|string|max:20',
            'nationality' => 'nullable|string',
            'civil_status' => 'nullable|string',
            'age' => 'nullable|integer',
            'profession' => 'nullable|string',
            'origin' => 'nullable|string',
            'issued_in' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $guestId = $request->guest_id;

            // Si no hay ID, creamos el Huésped primero
            if (empty($guestId)) {
                // Evitamos duplicados por CI
                $existingGuest = Guest::where('identification_number', $request->identification_number)->first();
                
                if ($existingGuest) {
                    $guestId = $existingGuest->id;
                } else {
                    $newGuest = Guest::create([
                        'first_name' => $request->first_name,
                        'last_name' => $request->last_name,
                        'identification_number' => $request->identification_number,
                        'nationality' => $request->nationality,
                        'civil_status' => $request->civil_status,
                        'age' => $request->age,
                        'profession' => $request->profession,
                        'origin' => $request->origin,
                        'issued_in' => $request->issued_in,
                    ]);
                    $guestId = $newGuest->id;
                }
            }

            // Calculamos fecha salida (null si son 0 días)
            $checkInDate = \Carbon\Carbon::parse($validated['check_in_date']);
            $checkOutDate = $validated['duration_days'] > 0 
                ? $checkInDate->copy()->addDays($validated['duration_days']) 
                : null; 

            // Creamos el Checkin
            Checkin::create([
                'room_id' => $validated['room_id'],
                'guest_id' => $guestId,
                'user_id' => Auth::id(),
                'check_in_date' => $validated['check_in_date'],
                'duration_days' => $validated['duration_days'],
                'check_out_date' => $checkOutDate,
                'advance_payment' => $validated['advance_payment'],
                'notes' => $validated['notes'],
            ]);

            // Ocupamos la habitación
            $room = Room::find($validated['room_id']);
            if ($room) {
                $room->update(['status' => 'OCCUPIED']); // O 'occupied' según tu BD
            }

            return redirect()->back()->with('success', 'Check-in registrado correctamente.');
        });
    }

    public function update(Request $request, Checkin $checkin)
    {
        $validated = $request->validate([
            'guest_id' => 'required|exists:guests,id',
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'duration_days' => 'required|integer|min:0',
            'advance_payment' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $checkInDate = \Carbon\Carbon::parse($validated['check_in_date']);
        $validated['check_out_date'] = $validated['duration_days'] > 0
            ? $checkInDate->copy()->addDays($validated['duration_days'])
            : null;

        if ($checkin->room_id != $validated['room_id']) {
            Room::where('id', $checkin->room_id)->update(['status' => 'AVAILABLE']);
            Room::where('id', $validated['room_id'])->update(['status' => 'OCCUPIED']);
        }

        $checkin->update($validated);

        return redirect()->back()->with('success', 'Hospedaje actualizado.');
    }

    public function destroy(Checkin $checkin)
    {
        $room = Room::find($checkin->room_id);
        if ($room) {
            $room->update(['status' => 'AVAILABLE']);
        }

        $checkin->delete();
        return redirect()->back()->with('success', 'Registro eliminado.');
    }

    public function checkout(Checkin $checkin)
    {
        $room = Room::find($checkin->room_id);
        if ($room) {
            $room->update(['status' => 'CLEANING']);
        }
        $checkin->update(['check_out_date' => now()]);

        return redirect()->back()->with('success', 'Checkout realizado.');
    }

    // --- TU CÓDIGO DE PDF RESTAURADO ---
    public function generateReceipt(Checkin $checkin)
    {
        $checkin->load(['guest', 'room']);

        // Usamos la barra invertida \FPDF para acceder a la clase global
        $pdf = new \FPDF('P', 'mm', array(80, 150)); 
        
        $pdf->SetMargins(4, 4, 4);
        $pdf->SetAutoPageBreak(true, 2);
        $pdf->AddPage();
        
        // --- CABECERA ---
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(0, 5, 'HOTEL SAN ANTONIO', 0, 1, 'C');
        
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, 'Calle Principal #123 - Potosi', 0, 1, 'C');
        $pdf->Cell(0, 4, 'Telf: 2-6224455', 0, 1, 'C');
        $pdf->Ln(2);
        
        // Línea separadora
        $pdf->Cell(0, 0, '---------------------------------------------------', 0, 1, 'C');
        $pdf->Ln(2);

        // --- DETALLES DEL RECIBO ---
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(0, 5, 'RECIBO DE CAJA #' . str_pad($checkin->id, 6, '0', STR_PAD_LEFT), 0, 1, 'C');
        $pdf->Ln(2);

        // Datos en formato compacto (Etiqueta: Valor)
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(20, 4, 'Fecha:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, $checkin->created_at->format('d/m/Y H:i'), 0, 1);

        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(20, 4, 'Huesped:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        // MultiCell ayuda si el nombre es muy largo para que baje de línea
        $nombre = utf8_decode($checkin->guest->first_name . ' ' . $checkin->guest->last_name);
        $pdf->MultiCell(0, 4, $nombre, 0, 'L');

        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(20, 4, 'CI/Doc:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, $checkin->guest->identification_number, 0, 1);

        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(20, 4, 'Habitacion:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, 'Nro ' . $checkin->room->number, 0, 1);

        $pdf->Ln(2);
        $pdf->Cell(0, 0, '---------------------------------------------------', 0, 1, 'C');
        $pdf->Ln(2);

        // --- DETALLE DE PAGO ---
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(45, 5, 'CONCEPTO', 0, 0);
        $pdf->Cell(0, 5, 'TOTAL', 0, 1, 'R');

        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(45, 4, 'Adelanto Hospedaje', 0, 0);
        $pdf->Cell(0, 4, number_format($checkin->advance_payment, 2), 0, 1, 'R');
        
        $diasTexto = ($checkin->duration_days > 0) ? $checkin->duration_days : 'Por Confirmar';
        $pdf->Cell(45, 4, 'Dias (' . $diasTexto . ')', 0, 0);
        $pdf->Cell(0, 4, '', 0, 1, 'R');

        $pdf->Ln(2);
        $pdf->Cell(0, 0, '---------------------------------------------------', 0, 1, 'C');
        $pdf->Ln(2);

        // --- TOTALES ---
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(35, 6, 'TOTAL PAGADO:', 0, 0);
        $pdf->Cell(0, 6, 'Bs. ' . number_format($checkin->advance_payment, 2), 0, 1, 'R');

        $pdf->Ln(5);

        // --- PIE DE PÁGINA ---
        $pdf->SetFont('Arial', 'I', 6);
        $pdf->MultiCell(0, 3, utf8_decode("Gracias por su preferencia.\nConserve este comprobante."), 0, 'C');
        $pdf->Ln(2);
        
        // Verificación segura del usuario
        $userName = Auth::user() ? Auth::user()->name : 'Admin';
        $pdf->Cell(0, 3, 'Usuario: ' . utf8_decode($userName), 0, 1, 'C');

        // 4. Salida
        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="ticket-'.$checkin->id.'.pdf"');
    }
}