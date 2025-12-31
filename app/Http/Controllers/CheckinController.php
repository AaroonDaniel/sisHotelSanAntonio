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

        $guests = Guest::orderBy('full_name')->get();
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
        // 1. Validaciones
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'duration_days' => 'required|integer|min:1',
            'advance_payment' => 'nullable|numeric|min:0',
            
            // Datos del huésped
            //'full_name' => 'required|string',
            'full_name' => 'required|string',
            'identification_number' => 'required|string',
            'nationality' => 'required|string',
            'origin' => 'nullable|string', //
            'birth_date' => 'nullable|date',
            'civil_status' => 'nullable|string',
            'profession' => 'nullable|string',
            'issued_in' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            
            // 2. BUSCAR O CREAR HUÉSPED
            // Si viene un guest_id, lo buscamos para actualizarlo. Si no, creamos o buscamos por CI.
            $guest = null;

            if ($request->filled('guest_id')) {
                $guest = Guest::find($request->guest_id);
            }

            if (!$guest) {
                // Intento buscar por carnet si no vino ID, para evitar duplicados
                $guest = Guest::where('identification_number', $validated['identification_number'])->first();
            }

            //
            // Aquí es donde forzamos que se guarde la PROCEDENCIA (origin) aunque el huésped sea antiguo
            $guestData = [
                //'full_name' => $validated['full_name'],
                'full_name' => $validated['full_name'],
                'identification_number' => $validated['identification_number'],
                'nationality' => $validated['nationality'],
                'origin' => $validated['origin'], // <--- AQUÍ SE GUARDA EL DATO NUEVO
                'birth_date' => $request->birth_date,
                'civil_status' => $request->civil_status,
                'profession' => $request->profession,
                'issued_in' => $request->issued_in,
            ];

            if ($guest) {
                $guest->update($guestData); // Actualiza si existe
            } else {
                $guest = Guest::create($guestData); // Crea si no existe
            }

            // 3. Crear el Check-in
            $checkin = Checkin::create([
                'guest_id' => $guest->id,
                'room_id' => $validated['room_id'],
                'user_id' => auth()->id(),
                'check_in_date' => $validated['check_in_date'],
                'duration_days' => $validated['duration_days'],
                'advance_payment' => $validated['advance_payment'] ?? 0,
                'notes' => $request->notes,
                'status' => 'ACTIVE'
            ]);

            // 4. Cambiar estado de la habitación
            $room = Room::find($validated['room_id']);
            $room->update(['status' => 'OCCUPIED']);

            // 5. Guardar servicios adicionales si los hay
            if ($request->has('selected_services') && count($request->selected_services) > 0) {
                // Buscamos los servicios seleccionados para obtener su precio actual
                $services = \App\Models\Service::whereIn('id', $request->selected_services)->get();
                
                $syncData = [];
                foreach ($services as $service) {
                    $syncData[$service->id] = [
                        'quantity' => 1, // Por defecto 1, o puedes ajustar si tu frontend manda cantidades
                        'selling_price' => $service->price //
                    ];
                }

                // Usamos sync con los datos extra (precio)
                $checkin->services()->sync($syncData);
            }

            return redirect()->back()->with('success', 'Ingreso registrado y datos actualizados correctamente.');
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
        $nombre = utf8_decode($checkin->guest->full_name);
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