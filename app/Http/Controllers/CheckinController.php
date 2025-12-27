<?php

namespace App\Http\Controllers;

use Fpdf; // <--- ESTO ESTÁ MAL para la librería estándar
use App\Models\Checkin;
use App\Models\Guest;
use App\Models\Room;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class CheckinController extends Controller
{
    public function index()
    {
        $checkins = Checkin::with(['guest', 'room.roomType'])
            ->orderBy('created_at', 'desc')
            ->get();

        // --- CORRECCIÓN AQUÍ ---
        // ANTES: $guests = Guest::where('is_active', true)->orderBy('last_name')->get();
        // AHORA (Quitamos el where):
        $guests = Guest::orderBy('last_name')->get();

        $rooms = Room::with(['roomType', 'price'])->get(); 

        return Inertia::render('checkins/index', [
            'Checkins' => $checkins,
            'Guests' => $guests, // Ahora enviamos todos los huéspedes sin filtrar por activo
            'Rooms' => $rooms,
        ]);
    }

    public function store(Request $request)
    {
        // 1. Validación
        $validated = $request->validate([
            'guest_id' => 'required|exists:guests,id',
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'duration_days' => 'required|integer|min:1',
            'advance_payment' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        // 2. Datos adicionales automáticos
        $validated['user_id'] = Auth::id(); // Registramos qué recepcionista hizo el checkin
        
        // Calculamos fecha de salida estimada
        $checkInDate = \Carbon\Carbon::parse($validated['check_in_date']);
        $validated['check_out_date'] = $checkInDate->copy()->addDays($validated['duration_days']);

        // 3. Crear el Checkin
        $checkin = Checkin::create($validated);

        // 4. ACTUALIZAR ESTADO DE LA HABITACIÓN
        // Al hacer checkin, la habitación pasa a estar 'occupied'
        $room = Room::find($validated['room_id']);
        if ($room) {
            $room->update(['status' => 'occupied']);
        }

        return redirect()->back()->with('success', 'Check-in registrado correctamente.');
    }

    public function update(Request $request, Checkin $checkin)
    {
        $validated = $request->validate([
            'guest_id' => 'required|exists:guests,id',
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'duration_days' => 'required|integer|min:1',
            'advance_payment' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        // Recalcular fecha de salida si cambiaron la fecha de entrada o duración
        $checkInDate = \Carbon\Carbon::parse($validated['check_in_date']);
        $validated['check_out_date'] = $checkInDate->copy()->addDays($validated['duration_days']);

        // Si cambiaron de habitación, liberar la anterior y ocupar la nueva
        if ($checkin->room_id != $validated['room_id']) {
            // Liberar anterior
            Room::where('id', $checkin->room_id)->update(['status' => 'available']); // O 'cleaning'
            // Ocupar nueva
            Room::where('id', $validated['room_id'])->update(['status' => 'occupied']);
        }

        $checkin->update($validated);

        return redirect()->back()->with('success', 'Hospedaje actualizado.');
    }

    public function destroy(Checkin $checkin)
    {
        // Al eliminar un checkin (cancelar), liberamos la habitación
        $room = Room::find($checkin->room_id);
        if ($room) {
            $room->update(['status' => 'available']);
        }

        $checkin->delete();
        return redirect()->back()->with('success', 'Registro eliminado y habitación liberada.');
    }

    // Método extra para "Finalizar Estadía" (Checkout)
    public function checkout(Checkin $checkin)
    {
        // 1. Marcar checkin como finalizado (si tuvieras un campo status en checkins, ej: 'completed')
        // Si no tienes campo status en checkin, asumimos que checkout libera la habitación.

        // 2. Cambiar estado de habitación a 'cleaning' (Limpieza) o 'available'
        $room = Room::find($checkin->room_id);
        if ($room) {
            $room->update(['status' => 'cleaning']); 
        }

        // Opcional: Registrar fecha real de salida si difiere de la estimada
        $checkin->update(['check_out_date' => now()]);

        return redirect()->back()->with('success', 'Checkout realizado. Habitación en limpieza.');
    }
    

    public function generateReceipt(Checkin $checkin)
    {
        // 1. Cargar relaciones
        $checkin->load(['guest', 'room']);

        // 2. Configuración de Tamaño TICKET (80mm ancho x 150mm alto aprox)
        // Puedes ajustar el 150 según el largo que necesites
        $pdf = new \FPDF('P', 'mm', array(80, 150)); 
        
        // Márgenes pequeños (4mm) para aprovechar el papel
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
        
        $pdf->Cell(45, 4, 'Dias (' . $checkin->duration_days . ')', 0, 0);
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
        $pdf->Cell(0, 3, 'Usuario: ' . utf8_decode(Auth::user()->name ?? 'Admin'), 0, 1, 'C');

        // 4. Salida
        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="ticket-'.$checkin->id.'.pdf"');
    }
}