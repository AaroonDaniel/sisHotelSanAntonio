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
        // 1. Validar si es huésped nuevo o existente
        if (!$request->filled('guest_id')) {
            // --- NUEVO HUÉSPED ---
            
            // Si falta el CI, es registro rápido (INCOMPLETE)
            $isComplete = $request->filled('identification_number');
            
            // Validamos solo el nombre obligatorio, el resto nullable
            $request->validate([
                'full_name' => 'required|string|max:150',
                'identification_number' => 'nullable|string|max:50', 
            ]);

            // Crear huésped
            $guest = \App\Models\Guest::create([
                'full_name' => strtoupper($request->full_name),
                'identification_number' => $request->identification_number ? strtoupper($request->identification_number) : null,
                'nationality' => $request->nationality ?? 'BOLIVIANA',
                'civil_status' => $request->civil_status,
                'birth_date' => $request->birth_date,
                'profession' => $request->profession ? strtoupper($request->profession) : null,
                'origin' => $request->origin ? strtoupper($request->origin) : null,
                'issued_in' => $request->issued_in ? strtoupper($request->issued_in) : null,
                'profile_status' => $isComplete ? 'COMPLETE' : 'INCOMPLETE', // <--- AQUÍ SE GUARDA EL ESTADO
            ]);

            $guestId = $guest->id;
        } else {
            // --- HUÉSPED EXISTENTE ---
            $guestId = $request->guest_id;
        }

        // 2. Crear Checkin (Igual que antes)
        $validatedCheckin = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'duration_days' => 'required|integer|min:0',
            'advance_payment' => 'nullable|numeric',
            'notes' => 'nullable|string',
        ]);

        $checkin = \App\Models\Checkin::create([
            'guest_id' => $guestId,
            'room_id' => $validatedCheckin['room_id'],
            'user_id' => auth()->id(),
            'check_in_date' => $validatedCheckin['check_in_date'],
            'duration_days' => $validatedCheckin['duration_days'],
            'advance_payment' => $validatedCheckin['advance_payment'] ?? 0,
            'notes' => $validatedCheckin['notes'],
            'status' => 'activo', // <--- CORREGIDO (antes decía 'active')
        ]);

        if ($request->has('selected_services')) {
            $checkin->services()->sync($request->selected_services);
        }
        
        \App\Models\Room::where('id', $request->room_id)->update(['status' => 'OCUPADO']);

        return redirect()->back()->with('success', 'Asignación registrada correctamente.');
    }

    public function update(Request $request, Checkin $checkin)
    {
        // 1. Validaciones: Incluimos los datos del Huésped que faltaban
        $validated = $request->validate([
            // Datos del Checkin
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'duration_days' => 'required|integer|min:0',
            'advance_payment' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            
            // Datos del Huésped (NECESARIOS para completar el perfil)
            'full_name' => 'required|string|max:150',
            'identification_number' => 'nullable|string|max:50',
            'nationality' => 'nullable|string',
            'origin' => 'nullable|string',        // <--- AHORA SÍ SE GUARDA EL ORIGEN
            'profession' => 'nullable|string',
            'civil_status' => 'nullable|string',
            'birth_date' => 'nullable|date',
            'issued_in' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $request, $checkin) {
            
            // 2. ACTUALIZAR HUÉSPED (Aquí ocurre la magia del cambio de color)
            $guest = $checkin->guest;
            
            // Verificamos si se ha ingresado el Carnet (CI)
            $hasIdNumber = !empty($validated['identification_number']);
            
            $guest->update([
                'full_name' => strtoupper($validated['full_name']),
                'identification_number' => $hasIdNumber ? strtoupper($validated['identification_number']) : null,
                'nationality' => strtoupper($validated['nationality'] ?? 'BOLIVIA'),
                'origin' => strtoupper($validated['origin'] ?? ''), // <--- Guardamos Procedencia
                'profession' => strtoupper($validated['profession'] ?? ''),
                'civil_status' => $validated['civil_status'],
                'birth_date' => $validated['birth_date'],
                'issued_in' => strtoupper($validated['issued_in'] ?? ''),
                
                // CAMBIO DE ESTADO / COLOR:
                // Si tiene CI -> 'COMPLETE' (Se vuelve ROJO en tu vista)
                // Si no tiene CI -> 'INCOMPLETE' (Se queda ÁMBAR/PENDIENTE)
                'profile_status' => $hasIdNumber ? 'COMPLETE' : 'INCOMPLETE'
            ]);

            // 3. Actualizar fechas del Checkin
            $checkInDate = \Carbon\Carbon::parse($validated['check_in_date']);
            $checkOutDate = $validated['duration_days'] > 0
                ? $checkInDate->copy()->addDays($validated['duration_days'])
                : null;

            // 4. Gestionar cambio de habitación si es necesario
            if ($checkin->room_id != $validated['room_id']) {
                \App\Models\Room::where('id', $checkin->room_id)->update(['status' => 'LIBRE']);
                \App\Models\Room::where('id', $validated['room_id'])->update(['status' => 'OCUPADO']);
            }

            // 5. Actualizar el registro de Checkin
            $checkin->update([
                'room_id' => $validated['room_id'],
                'check_in_date' => $validated['check_in_date'],
                'duration_days' => $validated['duration_days'],
                'check_out_date' => $checkOutDate,
                'advance_payment' => $validated['advance_payment'],
                'notes' => strtoupper($validated['notes'] ?? ''),
            ]);

            // 6. Actualizar servicios adicionales
            if ($request->has('selected_services')) {
                $services = \App\Models\Service::whereIn('id', $request->selected_services)->get();
                $syncData = [];
                foreach ($services as $service) {
                    $syncData[$service->id] = ['quantity' => 1, 'selling_price' => $service->price];
                }
                $checkin->services()->sync($syncData);
            }

            return redirect()->back()->with('success', 'Datos completados y actualizados correctamente.');
        });
    }

    public function destroy(Checkin $checkin)
    {
        $room = Room::find($checkin->room_id);
        if ($room) {
            $room->update(['status' => 'LIBRE']);
        }

        $checkin->delete();
        return redirect()->back()->with('success', 'Registro eliminado.');
    }

    public function checkout(Checkin $checkin)
    {
        $room = Room::find($checkin->room_id);
        if ($room) {
            // ANTES: $room->update(['status' => 'CLEANING']);
            $room->update(['status' => 'LIMPIEZA']); // <--- CORREGIDO
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