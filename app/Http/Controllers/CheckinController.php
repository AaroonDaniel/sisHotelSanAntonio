<?php

namespace App\Http\Controllers;

// Si usas FPDF globalmente, esta línea a veces sobra, 
// pero la dejo porque en tu código anterior estaba.
use Fpdf;
use Carbon\Carbon;
use App\Models\Checkin;
use App\Models\Guest;
use App\Models\Room;
use App\Models\Schedule;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB; // Importante para guardar Huésped y Checkin juntos


class CheckinController extends Controller
{
    public function index()
    {

        $checkins = Checkin::with(['guest', 'room.roomType', 'companions', 'schedule'])
            ->orderBy('created_at', 'desc')
            ->get();

        $guests = Guest::orderBy('full_name')->get();
        $rooms = Room::with(['roomType', 'price'])->get();
        $schedules = \App\Models\Schedule::where('is_active', true)->get();
        return Inertia::render('checkins/index', [
            'Checkins' => $checkins,
            'Guests' => $guests,
            'Rooms' => $rooms,
            'Schedules' => $schedules,
        ]);
    }
    // --- AQUÍ ESTÁ LA CORRECCIÓN PARA QUE GUARDE EL NUEVO HUÉSPED Y ACEPTE 0 DÍAS ---
    public function store(Request $request)
    {
        // 1. Validar y Crear/Actualizar al Huésped TITULAR
        if (!$request->filled('guest_id')) {
            // --- NUEVO TITULAR ---
            $isComplete = $request->filled('identification_number');

            $request->validate([
                'full_name' => 'required|string|max:150',
                'identification_number' => 'nullable|string|max:50',
                'phone' => 'nullable|string|max:20',
            ]);

            $guest = \App\Models\Guest::create([
                'full_name' => strtoupper($request->full_name),
                'identification_number' => $request->identification_number ? strtoupper($request->identification_number) : null,
                'nationality' => $request->nationality ?? 'BOLIVIANA',
                'civil_status' => $request->civil_status,
                'birth_date' => $request->birth_date,
                'profession' => $request->profession ? strtoupper($request->profession) : null,
                'origin' => $request->origin ? strtoupper($request->origin) : null,
                'issued_in' => $request->issued_in ? strtoupper($request->issued_in) : null,
                'phone' => $request->phone,
                'profile_status' => $isComplete ? 'COMPLETE' : 'INCOMPLETE',
            ]);
            $guestId = $guest->id;
        } else {
            // --- TITULAR EXISTENTE ---
            $guestId = $request->guest_id;
            // Actualizar teléfono si se envió uno nuevo
            if ($request->filled('phone')) {
                $existingGuest = \App\Models\Guest::find($guestId);
                if ($existingGuest) {
                    $existingGuest->update(['phone' => $request->phone]);
                }
            }
        }

        // 2. Validar datos del Checkin
        $validatedCheckin = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'actual_arrival_date' => 'nullable|date',
            'schedule_id' => 'nullable|exists:schedules,id',
            'duration_days' => 'nullable|integer|min:0',
            'advance_payment' => 'nullable|numeric',
            'notes' => 'nullable|string',
            // Validar array de acompañantes
            'companions' => 'nullable|array',
            'selected_services' => 'nullable|array',
        ]);

        // Usuario actual (fallback si no hay sesión)
        $userId = \Illuminate\Support\Facades\Auth::id() ?? 1;

        // 3. Crear el Checkin Principal
        $checkin = \App\Models\Checkin::create([
            'guest_id' => $guestId,
            'room_id' => $validatedCheckin['room_id'],
            'user_id' => $userId,
            
            'check_in_date' => $validatedCheckin['check_in_date'],
            'actual_arrival_date' => $validatedCheckin['actual_arrival_date'] ?? now(),
            'schedule_id' => $validatedCheckin['schedule_id'] ?? null,

            'duration_days' => $validatedCheckin['duration_days'] ?? 0,
            'advance_payment' => $validatedCheckin['advance_payment'] ?? 0,
            'notes' => isset($validatedCheckin['notes']) ? strtoupper($validatedCheckin['notes']) : null,
            'status' => 'activo',
        ]);

        // 4. --- LÓGICA DE ACOMPAÑANTES (NUEVO) ---
        if ($request->has('companions') && is_array($request->companions)) {
            $idsParaSincronizar = [];

            foreach ($request->companions as $compData) {
                // Si el nombre está vacío, saltar
                if (empty($compData['full_name'])) continue;

                // A. Buscar si ya existe por CI (si tiene CI)
                $companion = null;
                if (!empty($compData['identification_number'])) {
                    $companion = \App\Models\Guest::where('identification_number', $compData['identification_number'])->first();
                }

                // B. Crear o usar existente
                if (!$companion) {
                    $companion = \App\Models\Guest::create([
                        'full_name' => strtoupper($compData['full_name']),
                        'identification_number' => !empty($compData['identification_number']) ? strtoupper($compData['identification_number']) : null,
                        'nationality' => !empty($compData['nationality']) ? strtoupper($compData['nationality']) : 'BOLIVIANA',
                        // Otros campos opcionales
                        'civil_status' => $compData['civil_status'] ?? null,
                        'birth_date' => $compData['birth_date'] ?? null,
                        'profession' => !empty($compData['profession']) ? strtoupper($compData['profession']) : null,
                        'origin' => !empty($compData['origin']) ? strtoupper($compData['origin']) : null,
                        'phone' => $compData['phone'] ?? null,
                        'profile_status' => 'INCOMPLETE' // Acompañantes suelen ser incompletos al inicio
                    ]);
                }

                // C. Preparar relación (ID y Parentesco)
                // Evitamos que el titular se agregue a sí mismo como acompañante
                if ($companion->id !== $guestId) {
                    $idsParaSincronizar[$companion->id] = [];
                }
            }

            // D. Guardar en tabla intermedia
            if (!empty($idsParaSincronizar)) {
                $checkin->companions()->sync($idsParaSincronizar);
            }
        }
        // ------------------------------------------

        // 5. Guardar Servicios opcionales
        if ($request->has('selected_services')) {
            $checkin->services()->sync($request->selected_services);
        }

        // 6. Actualizar Estado Habitación
        \App\Models\Room::where('id', $request->room_id)->update(['status' => 'OCUPADO']);

        return redirect()->back()->with('success', 'Asignación registrada correctamente.');
    }

    public function update(Request $request, Checkin $checkin)
    {
        // 1. Validaciones (Mantenemos tu estructura exacta)
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'duration_days' => 'nullable|integer|min:0',
            'advance_payment' => 'required|numeric|min:0',
            'notes' => 'nullable|string',

            // Datos del Huésped Titular
            'full_name' => 'required|string|max:150',
            'identification_number' => 'nullable|string|max:50',
            'nationality' => 'nullable|string',
            'origin' => 'nullable|string',
            'profession' => 'nullable|string',
            'civil_status' => 'nullable|string',
            'birth_date' => 'nullable|date',
            'issued_in' => 'nullable|string',
            'phone' => 'nullable|string|max:20',

            // Validación de Acompañantes
            'companions' => 'nullable|array',
            'companions.*.full_name' => 'required|string|max:150',
            'companions.*.identification_number' => 'nullable|string|max:50',
            'companions.*.relationship' => 'nullable|string|max:50',
            'companions.*.nationality' => 'nullable|string|max:50',
            'companions.*.profession' => 'nullable|string|max:100',
            'companions.*.origin' => 'nullable|string|max:100',
            'companions.*.civil_status' => 'nullable|string',
            'companions.*.birth_date' => 'nullable|date',
            'companions.*.issued_in' => 'nullable|string',
            'companions.*.phone' => 'nullable|string|max:20',
        ]);

        return DB::transaction(function () use ($validated, $request, $checkin) {

            $guest = $checkin->guest;
            $wasIncomplete = $guest->profile_status === 'INCOMPLETE';

            // 2. LÓGICA DE COMPLETITUD (TITULAR)
            $requiredFields = ['identification_number', 'nationality', 'origin', 'profession', 'civil_status', 'birth_date', 'issued_in'];

            $isTitularComplete = true; // Renombrado para diferenciar
            $missingField = null;

            foreach ($requiredFields as $field) {
                if (!$request->filled($field)) {
                    $isTitularComplete = false;
                    $missingField = $field;
                    break;
                }
            }

            // 3. ACTUALIZAR HUÉSPED TITULAR
            $guest->update([
                'full_name' => strtoupper($validated['full_name']),
                'identification_number' => $request->filled('identification_number') ? strtoupper($validated['identification_number']) : null,
                'duration_days' => $validated['duration_days'] ?? 0,
                'nationality' => $request->filled('nationality') ? strtoupper($validated['nationality']) : null,
                'origin' => $request->filled('origin') ? strtoupper($validated['origin']) : null,
                'profession' => $request->filled('profession') ? strtoupper($validated['profession']) : null,
                'civil_status' => $validated['civil_status'],
                'birth_date' => $validated['birth_date'],
                'issued_in' => $request->filled('issued_in') ? strtoupper($validated['issued_in']) : null,
                'phone' => $request->phone,
                'profile_status' => $isTitularComplete ? 'COMPLETE' : 'INCOMPLETE'
            ]);

            // 3.5 ACTUALIZAR ACOMPAÑANTES
            $allCompanionsComplete = true; // Bandera global para acompañantes

            if ($request->has('companions')) {
                $idsParaSincronizar = [];

                foreach ($request->companions as $compData) {

                    // A. Verificar completitud de ESTE acompañante específico
                    $isThisCompanionComplete = true;
                    foreach ($requiredFields as $field) {
                        // Verificamos si el campo falta en el array del acompañante
                        if (empty($compData[$field])) {
                            $isThisCompanionComplete = false;
                            $allCompanionsComplete = false; // Marcamos bandera global como incompleta
                            break;
                        }
                    }

                    // Preparar datos
                    $datosCompanion = [
                        'full_name' => strtoupper($compData['full_name']),
                        'identification_number' => !empty($compData['identification_number']) ? strtoupper($compData['identification_number']) : null,
                        'nationality' => !empty($compData['nationality']) ? strtoupper($compData['nationality']) : 'BOLIVIANA',
                        'profession' => !empty($compData['profession']) ? strtoupper($compData['profession']) : null,
                        'origin' => !empty($compData['origin']) ? strtoupper($compData['origin']) : null,
                        'civil_status' => $compData['civil_status'] ?? null,
                        'birth_date' => $compData['birth_date'] ?? null,
                        'phone' => $compData['phone'] ?? null,
                        'issued_in' => !empty($compData['issued_in']) ? strtoupper($compData['issued_in']) : null,

                        // AQUÍ ESTÁ EL CAMBIO CLAVE: Guardamos el estado real calculado
                        'profile_status' => $isThisCompanionComplete ? 'COMPLETE' : 'INCOMPLETE'
                    ];

                    $companion = null;

                    if (!empty($datosCompanion['identification_number'])) {
                        $companion = \App\Models\Guest::where('identification_number', $datosCompanion['identification_number'])->first();
                    }

                    if (!$companion) {
                        $companion = \App\Models\Guest::create($datosCompanion);
                    } else {
                        $companion->update($datosCompanion);
                    }

                    if ($companion->id !== $guest->id) {
                        $idsParaSincronizar[$companion->id] = [];
                    }
                }

                $checkin->companions()->sync($idsParaSincronizar);
            } else {
                $checkin->companions()->detach();
            }

            // 4. LÓGICA DE FECHAS Y ESTADO
            // Para que se considere todo completo, deben estar OK el titular Y los acompañantes
            $isEverythingComplete = $isTitularComplete && $allCompanionsComplete;

            $newCheckInDate = $validated['check_in_date'];

            // Si antes faltaba algo y ahora TODO está completo, actualizamos fecha
            if ($wasIncomplete && $isEverythingComplete) {
                $newCheckInDate = now();
            }

            $checkInCarbon = \Carbon\Carbon::parse($newCheckInDate);
            $checkOutDate = $validated['duration_days'] > 0
                ? $checkInCarbon->copy()->addDays($validated['duration_days'])
                : null;

            // 5. CAMBIO DE HABITACIÓN
            if ($checkin->room_id != $validated['room_id']) {
                \App\Models\Room::where('id', $checkin->room_id)->update(['status' => 'LIBRE']);
                \App\Models\Room::where('id', $validated['room_id'])->update(['status' => 'OCUPADO']);
            }

            // 6. ACTUALIZAR CHECKIN
            $checkin->update([
                'room_id' => $validated['room_id'],
                'check_in_date' => $newCheckInDate,
                'duration_days' => $validated['duration_days'],
                'check_out_date' => $checkOutDate,
                'advance_payment' => $validated['advance_payment'],
                'notes' => strtoupper($validated['notes'] ?? ''),
            ]);

            // 7. SERVICIOS
            if ($request->has('selected_services')) {
                $services = \App\Models\Service::whereIn('id', $request->selected_services)->get();
                $syncData = [];
                foreach ($services as $service) {
                    $syncData[$service->id] = ['quantity' => 1, 'selling_price' => $service->price];
                }
                $checkin->services()->sync($syncData);
            }

            // 8. RESPUESTA (Validamos si falta ALGUIEN)
            if (!$isEverythingComplete) {
                $mensaje = 'Faltan datos.';

                if (!$isTitularComplete) {
                    // Traducción simple del campo faltante del titular
                    $campoFaltante = match ($missingField) {
                        'identification_number' => 'Carnet de Identidad',
                        'nationality' => 'Nacionalidad',
                        'origin' => 'Procedencia',
                        'profession' => 'Profesión',
                        'civil_status' => 'Estado Civil',
                        'birth_date' => 'Fecha de Nacimiento',
                        'issued_in' => 'Lugar de Expedición',
                        default => 'algún dato obligatorio'
                    };
                    $mensaje = 'Faltan datos del Titular: ' . $campoFaltante;
                } elseif (!$allCompanionsComplete) {
                    $mensaje = 'El titular está completo, pero faltan datos de uno o más Acompañantes.';
                }

                return redirect()->back()->with('error', $mensaje . '. La habitación sigue PENDIENTE.');
            }

            return redirect()->back()->with('success', 'Todos los datos (Titular y Acompañantes) actualizados correctamente.');
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

    // Obtener los detalles antes de finalizar
    // --- NUEVO: Obtener detalles antes de finalizar ---
    public function getCheckoutDetails(Request $request, Checkin $checkin)
    {
        // Cargamos relaciones necesarias
        $checkin->load(['guest', 'room.price', 'checkinDetails.service', 'schedule']);

        // Verificamos si el usuario pidió "perdonar" el retraso (S/T)
        $waivePenalty = $request->boolean('waive_penalty', false);
        $checkOutDate = now(); 

        // Calculamos días usando la lógica inteligente
        $days = $this->calculateBillableDays($checkin, $checkOutDate, $waivePenalty);
        
        // Calculamos Costos
        $price = $checkin->room->price->amount ?? 0;
        $accommodationTotal = $days * $price;

        $servicesTotal = 0;
        foreach ($checkin->checkinDetails as $detail) {
             $p = $detail->selling_price ?? $detail->service->price;
             $servicesTotal += $detail->quantity * $p;
        }

        $grandTotal = $accommodationTotal + $servicesTotal;
        $balance = $grandTotal - ($checkin->advance_payment ?? 0);

        return response()->json([
            'guest' => $checkin->guest,
            'room' => $checkin->room,
            'check_in_date' => $checkin->check_in_date->format('Y-m-d H:i:s'),
            'check_out_date' => $checkOutDate->format('Y-m-d H:i:s'),
            'duration_days' => $days,
            'price_per_night' => $price,
            'accommodation_total' => $accommodationTotal,
            'services_total' => $servicesTotal,
            'advance_payment' => $checkin->advance_payment,
            'grand_total' => $grandTotal,
            'balance' => $balance,
            'notes' => $checkin->notes
        ]);
    }

    public function checkout(Request $request, Checkin $checkin)
    {
        $room = Room::find($checkin->room_id);

        if ($room) {
            $room->update(['status' => 'LIMPIEZA']);
        }

        // Usamos la fecha enviada o la actual
        $checkOutDate = $request->input('check_out_date') 
            ? \Carbon\Carbon::parse($request->input('check_out_date')) 
            : now();
        
        // Recalculamos para asegurar integridad (especialmente si se usó tolerancia)
        $waivePenalty = $request->boolean('waive_penalty', false);
        $finalDays = $this->calculateBillableDays($checkin, $checkOutDate, $waivePenalty);

        $checkin->update([
            'check_out_date' => $checkOutDate,
            'duration_days' => $finalDays, // Guardamos los días reales calculados
            'status' => 'finalizado'
        ]);

        return response()->json(['success' => true, 'message' => 'Estadía finalizada']);
    }

    // --- FUNCIÓN DE CANCELACIÓN (Solo primeros 10 minutos) ---
    public function cancelAssignment(Checkin $checkin)
    {
        // 1. Validar tiempo (10 minutos de tolerancia)
        $diffMinutes = $checkin->created_at->diffInMinutes(now());

        if ($diffMinutes > 10) {
            return redirect()->back()->with('error', 'El tiempo de cancelación (10 min) ha expirado. Debes realizar un Checkout normal.');
        }

        DB::transaction(function () use ($checkin) {
            // 2. Liberar la habitación directamente a 'LIBRE' 
            $room = Room::find($checkin->room_id);
            if ($room) {
                $room->update(['status' => 'LIBRE']);
            }

            // 3. Eliminar relaciones (Limpieza de datos)
            $checkin->companions()->detach();
            $checkin->services()->detach();
            $checkin->checkinDetails()->delete();

            // 4. Eliminar el registro permanentemente
            $checkin->delete();
        });

        return redirect()->back()->with('success', 'Asignación cancelada. La habitación está LIBRE.');
    }

    // --- GENERACIÓN DE RECIBOS ---
    public function generateAssignmentReceipt(Checkin $checkin)
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

        // --- DETALLES DE HABITACIÓN ---
        $pdf->SetFont('Arial', 'B', 8);
        $text = 'Pza. Nº ' . str_pad($checkin->room->number, 2, '0', STR_PAD_LEFT);
        $pdf->Cell(0, 5, utf8_decode($text), 0, 1, 'R');
        $pdf->Ln(2);

        // --- DATOS DEL HUÉSPED ---

        // Nombre
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(12, 4, 'Nombre:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->MultiCell(0, 4, utf8_decode($checkin->guest->full_name), 0, 'L'); // MultiCell para nombres largos

        // Nacionalidad
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(18, 4, 'Nacionalidad:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, utf8_decode($checkin->guest->nationality), 0, 1);

        // Carnet y Otorgado (Misma línea para ahorrar espacio)
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(18, 4, 'CI/Pasaporte:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(20, 4, $checkin->guest->identification_number, 0, 0);

        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(15, 4, 'Otorgado:', 0, 0); // Etiqueta corta
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, utf8_decode($checkin->guest->issued_in), 0, 1);

        // Estado Civil y Edad (Misma línea)
        $estado = $checkin->guest->civil_status;
        $inicial = $estado ? strtoupper(substr($estado, 0, 1)) : '-';

        $edad = '-';
        if ($checkin->guest->birth_date) {
            $edad = \Carbon\Carbon::parse($checkin->guest->birth_date)->age;
        }

        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(18, 4, 'Estado civil:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(20, 4, $inicial, 0, 0);

        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(10, 4, 'Edad:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, $edad, 0, 1);

        // Profesión
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(18, 4, utf8_decode('Profesión:'), 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, utf8_decode($checkin->guest->profession), 0, 1);

        // Procedencia
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(18, 4, 'Procedencia:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, utf8_decode($checkin->guest->origin), 0, 1);

        // --- DATOS DE INGRESO ---
        $fechaIngreso = \Carbon\Carbon::parse($checkin->check_in_date)->format('d/m/Y');
        $horaIngreso  = \Carbon\Carbon::parse($checkin->check_in_date)->format('H:i');

        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(20, 4, 'Fecha ingreso:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(18, 4, $fechaIngreso, 0, 0);

        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(10, 4, 'Hora:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, $horaIngreso, 0, 1);

        // Permanencia
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(28, 4, utf8_decode('Permanencia (días):'), 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, $checkin->duration_days, 0, 1);

        // Total Cancelado (Adelanto)
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(28, 4, 'Total cancelado:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, number_format($checkin->advance_payment, 2) . ' Bs.', 0, 1);

        // Observaciones (Multilinea)
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(28, 4, 'Observaciones:', 0, 1); // Salto de línea para escribir abajo
        $pdf->SetFont('Arial', '', 7);
        if ($checkin->notes) {
            $pdf->MultiCell(0, 4, utf8_decode($checkin->notes), 0, 'L');
        } else {
            $pdf->Cell(0, 4, '-', 0, 1);
        }

        // Celular (Usando el dato guardado en guest)
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(15, 4, 'Celular:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        // CAMBIO: Se lee del modelo guest, no del checkin
        $telefono = $checkin->guest->phone ? $checkin->guest->phone : '___________________';
        $pdf->Cell(0, 4, utf8_decode($telefono), 0, 1);

        // --- FIRMA ---
        $pdf->Ln(10); // Espacio vertical generoso para la firma

        // Calculamos posición para centrar la línea
        $pageWidth = $pdf->GetPageWidth(); // 80mm
        $margins = 4;
        $printableWidth = $pageWidth - ($margins * 2); // 72mm
        $lineLength = 50; // Longitud de la línea de firma

        $x = ($pageWidth - $lineLength) / 2; // Centrado matemático
        $y = $pdf->GetY();

        $pdf->Line($x, $y, $x + $lineLength, $y); // Dibuja la línea

        $pdf->Ln(2); // Pequeño espacio entre línea y texto

        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, utf8_decode('Firma del Huésped'), 0, 1, 'C'); // Centrado

        // 4. Salida
        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="ticket-' . $checkin->id . '.pdf"');
    }


    // --GENERACION DE BOLETA --
    public function generateCheckoutReceipt(Checkin $checkin)
    {
        // 1. CARGAR RELACIONES CORRECTAS (Agregamos 'schedule' para la nueva lógica)
        $checkin->load(['guest', 'room.price', 'checkinDetails.service', 'schedule']);

        // --- LÓGICA DE DÍAS (NUEVA: Usando tolerancias) ---
        $salida = $checkin->check_out_date ? \Carbon\Carbon::parse($checkin->check_out_date) : now();

        // AQUÍ LLAMAMOS A TU NUEVA FUNCIÓN PRIVADA
        $diasACobrar = $this->calculateBillableDays($checkin, $salida);

        // Calcular días excedidos solo para mostrar en el PDF (Opcional)
        $diasExcedidos = $diasACobrar - max(1, intval($checkin->duration_days));
        if ($diasExcedidos < 0) $diasExcedidos = 0;

        // --- CÁLCULOS ECONÓMICOS ---
        $precioUnitario = $checkin->room->price->amount ?? 0;
        $totalHospedaje = $precioUnitario * $diasACobrar; // Usamos el cálculo inteligente

        // Calcular Servicios usando CheckinDetails (Lógica original intacta)
        $totalServicios = 0;
        foreach ($checkin->checkinDetails as $detalle) {
            // Prioridad: Precio Histórico (selling_price) -> Precio Actual (service->price)
            $precioReal = $detalle->selling_price ?? $detalle->service->price;
            $totalServicios += ($detalle->quantity * $precioReal);
        }

        $granTotal = $totalHospedaje + $totalServicios;
        $adelanto = $checkin->advance_payment ?? 0;
        $saldoPagar = $granTotal - $adelanto;

        // --- GENERACIÓN PDF (Tu código original) ---
        // Aumentamos un poco el largo por si hay muchos servicios (240mm)
        $pdf = new \FPDF('P', 'mm', array(80, 240));
        $pdf->SetMargins(4, 4, 4);
        $pdf->SetAutoPageBreak(true, 2);
        $pdf->AddPage();

        // CABECERA
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 5, 'HOTEL SAN ANTONIO', 0, 1, 'C');
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(0, 4, 'Calle Principal #123 - Potosi', 0, 1, 'C');
        $pdf->Ln(2);

        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(0, 6, 'NOTA DE SALIDA', 0, 1, 'C');
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(0, 4, 'Nro: ' . str_pad($checkin->id, 6, '0', STR_PAD_LEFT), 0, 1, 'C');
        $pdf->Ln(2);

        // DATOS HUESPED
        $pdf->Cell(0, 0, '-------------------------------------------------------------------------------------------------------------', 0, 1, 'C');
        $pdf->Ln(2);

        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(15, 4, 'Cliente:', 0, 0);
        $pdf->SetFont('Arial', '', 8);
        $pdf->MultiCell(0, 4, utf8_decode($checkin->guest->full_name), 0, 'L');

        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(15, 4, 'CI/Doc:', 0, 0);
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(25, 4, $checkin->guest->identification_number, 0, 0);

        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(10, 4, 'Hab:', 0, 0);
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(0, 4, $checkin->room->number, 0, 1);

        $pdf->Ln(1);
        $ingresoVisual = \Carbon\Carbon::parse($checkin->check_in_date); // Solo para mostrar
        
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(15, 4, 'Ingreso:', 0, 0);
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(22, 4, $ingresoVisual->format('d/m/y H:i'), 0, 0);

        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(12, 4, 'Salida:', 0, 0);
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(0, 4, $salida->format('d/m/y H:i'), 0, 1);

        // DETALLE ECONÓMICO
        $pdf->Ln(2);
        $pdf->Cell(0, 0, '-------------------------------------------------------------------------------------------------------------', 0, 1, 'C');
        $pdf->Ln(2);

        // Encabezados de Tabla
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(32, 4, 'DESCRIPCION', 0, 0, 'L');
        $pdf->Cell(10, 4, 'CANT', 0, 0, 'C');
        $pdf->Cell(15, 4, 'P.UNIT', 0, 0, 'R');
        $pdf->Cell(15, 4, 'SUBTOT', 0, 1, 'R');
        $pdf->Ln(1);

        // 1. Hospedaje (Aquí usamos $diasACobrar calculado inteligentemente)
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(32, 4, utf8_decode("Hospedaje ($diasACobrar dias)"), 0, 0, 'L');
        $pdf->Cell(10, 4, $diasACobrar, 0, 0, 'C'); // Mostramos días calculados
        $pdf->Cell(15, 4, number_format($precioUnitario, 2), 0, 0, 'R');
        $pdf->Cell(15, 4, number_format($totalHospedaje, 2), 0, 1, 'R');

        if ($diasExcedidos > 0) {
            $pdf->SetFont('Arial', 'I', 6);
            $pdf->Cell(0, 3, utf8_decode("(Inc. $diasExcedidos dias extra por horario)"), 0, 1, 'L');
        }

        // 2. Servicios Adicionales (Tu lógica intacta)
        $pdf->SetFont('Arial', '', 7);

        $serviciosAgrupados = [];

        foreach ($checkin->checkinDetails as $detalle) {
            $nombre = $detalle->service->name ?? 'Servicio Eliminado';
            $precio = $detalle->selling_price ?? $detalle->service->price ?? 0;

            if (!isset($serviciosAgrupados[$nombre])) {
                $serviciosAgrupados[$nombre] = [
                    'nombre'   => $nombre,
                    'cantidad' => 0,
                    'subtotal' => 0,
                ];
            }
            $serviciosAgrupados[$nombre]['cantidad'] += $detalle->quantity;
            $serviciosAgrupados[$nombre]['subtotal'] += ($detalle->quantity * $precio);
        }

        foreach ($serviciosAgrupados as $item) {
            $precioUnitarioSrv = $item['cantidad'] > 0
                ? $item['subtotal'] / $item['cantidad']
                : 0;

            $nombreSrv = substr($item['nombre'], 0, 20);

            $pdf->Cell(32, 4, utf8_decode($nombreSrv), 0, 0, 'L');
            $pdf->Cell(10, 4, $item['cantidad'], 0, 0, 'C');
            $pdf->Cell(15, 4, number_format($precioUnitarioSrv, 2), 0, 0, 'R');
            $pdf->Cell(15, 4, number_format($item['subtotal'], 2), 0, 1, 'R');
        }

        $pdf->Ln(2);
        $pdf->Cell(0, 0, '-------------------------------------------------------------------------------------------------------------', 0, 1, 'C');
        $pdf->Ln(2);

        // TOTALES FINALES
        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(50, 5, 'TOTAL GENERAL:', 0, 0, 'R');
        $pdf->Cell(22, 5, number_format($granTotal, 2), 0, 1, 'R');

        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(50, 4, 'A cuenta / Adelanto:', 0, 0, 'R');
        $pdf->Cell(22, 4, '-' . number_format($adelanto, 2), 0, 1, 'R');

        $pdf->Ln(2);
        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(50, 6, 'A PAGAR:', 0, 0, 'R');
        $pdf->Cell(22, 6, number_format($saldoPagar, 2) . ' Bs', 0, 1, 'R');

        // PIE
        $pdf->Ln(6);
        $pdf->SetFont('Arial', 'I', 7);
        $pdf->MultiCell(0, 3, utf8_decode("Gracias por su preferencia.\nRevise su cambio antes de retirarse."), 0, 'C');

        $pdf->Ln(3);
        $usuario = \Illuminate\Support\Facades\Auth::user() ? \Illuminate\Support\Facades\Auth::user()->name : 'Cajero';
        $pdf->Cell(0, 3, 'Atendido por: ' . utf8_decode($usuario), 0, 1, 'C');

        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="checkout-' . $checkin->id . '.pdf"');
    }

    // --GENERACION DE FACTURA --
    public function generateCheckoutInvoice(Checkin $checkin)
    {
        try {
            // 1. CARGAR RELACIONES (Agregamos 'schedule' para que funcione la tolerancia)
            $checkin->load(['guest', 'room.price', 'checkinDetails.service', 'schedule']);

            // --- CÁLCULOS CON TOLERANCIA ---
            $ingreso = \Carbon\Carbon::parse($checkin->check_in_date);
            $salida = $checkin->check_out_date ? \Carbon\Carbon::parse($checkin->check_out_date) : now();

            // AQUÍ LA MAGIA: Usamos la función inteligente en lugar del cálculo simple
            // Esto respetará si ajustaste la entrada con el botón o si salió dentro del margen
            $diasReales = $this->calculateBillableDays($checkin, $salida);

            $precioUnitario = $checkin->room->price->amount ?? 0;
            $totalHospedaje = $precioUnitario * $diasReales;

            $totalServicios = 0;
            foreach ($checkin->checkinDetails as $detalle) {
                // Validación segura de precio
                $precio = $detalle->selling_price ?? ($detalle->service->price ?? 0);
                $totalServicios += ($detalle->quantity * $precio);
            }
            $granTotal = $totalHospedaje + $totalServicios;

            // --- CONFIGURACIÓN PDF (80mm ancho) ---
            $pdf = new \FPDF('P', 'mm', array(80, 260));
            $pdf->SetMargins(4, 4, 4);
            $pdf->SetAutoPageBreak(true, 2);
            $pdf->AddPage();

            // 1. ENCABEZADO
            $pdf->SetFont('Arial', 'B', 10);
            $pdf->Cell(0, 4, 'HOTEL SAN ANTONIO', 0, 1, 'C');
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(0, 3, 'CASA MATRIZ', 0, 1, 'C');
            $pdf->SetFont('Arial', '', 6);
            $pdf->Cell(0, 3, 'No. Punto de Venta 0', 0, 1, 'C');
            $pdf->Cell(0, 3, 'Calle 9 - Potosi', 0, 1, 'C');
            $pdf->Cell(0, 3, utf8_decode('Teléfono: 70461010'), 0, 1, 'C');
            $pdf->Cell(0, 3, 'BOLIVIA', 0, 1, 'C');

            $pdf->Ln(2);
            $pdf->SetFont('Arial', 'B', 8);
            $pdf->Cell(0, 4, 'FACTURA', 0, 1, 'C');
            $pdf->SetFont('Arial', '', 6);
            $pdf->Cell(0, 3, '(Con Derecho a Credito Fiscal)', 0, 1, 'C');

            $pdf->Ln(2);
            // DATOS DE FACTURACIÓN
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(30, 3, 'NIT:', 0, 0, 'R');
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(35, 3, '3327479013', 0, 1, 'L');

            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(30, 3, utf8_decode('FACTURA N°:'), 0, 0, 'R');
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(35, 3, str_pad($checkin->id, 5, '0', STR_PAD_LEFT), 0, 1, 'L');

            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(30, 3, utf8_decode('CÓD. AUTORIZACIÓN:'), 0, 0, 'R');
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(35, 3, '456123ABC', 0, 1, 'L');
            $pdf->Ln(2);

            // 2. DATOS DEL CLIENTE
            $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
            $pdf->Ln(1);

            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(20, 4, 'Fecha:', 0, 0);
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(0, 4, now()->format('d/m/Y H:i:s'), 0, 1);

            // Etiqueta en NEGRILLA
            $pdf->SetFont('Arial', 'B', 7);
            $etiqueta = utf8_decode('Nombre/Razón Social: ');
            $anchoEtiqueta = $pdf->GetStringWidth($etiqueta) + 2;
            $pdf->Cell($anchoEtiqueta, 4, $etiqueta, 0, 0, 'L');

            // Valor en fuente normal
            $pdf->SetFont('Arial', '', 7);
            $pdf->MultiCell(0, 4, utf8_decode($checkin->guest->full_name), 0, 'L');

            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(20, 4, 'NIT/CI/CEX:', 0, 0);
            $pdf->SetFont('Arial', '', 7);
            $docId = $checkin->guest->identification_number ?? '0';
            $pdf->Cell(0, 4, $docId, 0, 1);

            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(20, 4, 'Cod. Cliente:', 0, 0);
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(0, 4, $checkin->guest->id, 0, 1);

            $pdf->Ln(1);
            $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
            $pdf->Ln(2);

            // 3. DETALLE
            $pdf->SetFont('Arial', 'B', 6);
            $pdf->Cell(8, 3, 'CNT', 0, 0, 'C');
            $pdf->Cell(34, 3, 'DETALLE', 0, 0, 'L');
            $pdf->Cell(12, 3, 'P.UNIT', 0, 0, 'R');
            $pdf->Cell(18, 3, 'SUBTOT', 0, 1, 'R');
            $pdf->Ln(3);

            $pdf->SetFont('Arial', '', 6);

            // A. Hospedaje
            $pdf->Cell(8, 3, '1', 0, 0, 'C');
            // Mostramos los días reales calculados por tu lógica inteligente
            $pdf->Cell(34, 3, utf8_decode("Hospedaje ($diasReales d)"), 0, 0, 'L');
            $pdf->Cell(12, 3, number_format($totalHospedaje, 2), 0, 0, 'R');
            $pdf->Cell(18, 3, number_format($totalHospedaje, 2), 0, 1, 'R');

            // B. Servicios
            $serviciosAgrupados = [];
            if ($checkin->checkinDetails) {
                foreach ($checkin->checkinDetails as $detalle) {
                    $nombre = $detalle->service->name ?? 'Servicio';
                    $precio = $detalle->selling_price ?? ($detalle->service->price ?? 0);

                    if (!isset($serviciosAgrupados[$nombre])) {
                        $serviciosAgrupados[$nombre] = ['qty' => 0, 'total' => 0];
                    }
                    $serviciosAgrupados[$nombre]['qty'] += $detalle->quantity;
                    $serviciosAgrupados[$nombre]['total'] += ($detalle->quantity * $precio);
                }
            }

            foreach ($serviciosAgrupados as $name => $data) {
                $pUnit = $data['qty'] > 0 ? $data['total'] / $data['qty'] : 0;
                $pdf->Cell(8, 3, $data['qty'], 0, 0, 'C');
                $pdf->Cell(34, 3, utf8_decode(substr($name, 0, 22)), 0, 0, 'L');
                $pdf->Cell(12, 3, number_format($pUnit, 2), 0, 0, 'R');
                $pdf->Cell(18, 3, number_format($data['total'], 2), 0, 1, 'R');
            }

            $pdf->Ln(2);
            $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
            $pdf->Ln(2);

            // 4. TOTALES
            $pdf->SetFont('Arial', 'B', 8);
            $pdf->Cell(50, 4, 'SUBTOTAL Bs', 0, 0, 'R');
            $pdf->Cell(22, 4, number_format($granTotal, 2), 0, 1, 'R');

            $pdf->Cell(50, 4, 'DESCUENTO Bs', 0, 0, 'R');
            $pdf->Cell(22, 4, '0.00', 0, 1, 'R');

            $pdf->SetFont('Arial', 'B', 9);
            $pdf->Cell(50, 5, 'TOTAL A PAGAR Bs', 0, 0, 'R');
            $pdf->Cell(22, 5, number_format($granTotal, 2), 0, 1, 'R');

            // 5. MONTO EN LETRAS
            $pdf->Ln(2);
            $pdf->SetFont('Arial', '', 7);
            $montoLetras = $this->convertirNumeroALetras($granTotal); // Asegúrate de tener esta función
            $pdf->MultiCell(0, 4, 'Son: ' . utf8_decode($montoLetras), 0, 'L');

            $pdf->Ln(2);
            $pdf->SetFont('Arial', 'B', 6);
            $pdf->Cell(35, 3, utf8_decode('IMPORTE BASE CRÉDITO FISCAL:'), 0, 0, 'L');
            $pdf->Cell(0, 3, number_format($granTotal, 2), 0, 1, 'R');

            // 6. CÓDIGO DE CONTROL Y QR
            $pdf->Ln(2);
            $pdf->Cell(0, 3, utf8_decode('CÓDIGO DE CONTROL: 8A-F1-2C-99'), 0, 1, 'C');
            $pdf->Ln(2);

            $logoPath = public_path('images/qrCop.png');
            $qrSize = 22;

            if (file_exists($logoPath)) {
                $x = (80 - $qrSize) / 2;
                $y = $pdf->GetY();
                $pdf->Image($logoPath, $x, $y, $qrSize, $qrSize);
                $pdf->SetY($y + $qrSize + 2);
            } else {
                $x = (80 - 22) / 2;
                $y = $pdf->GetY();
                $pdf->Rect($x, $y, 22, 22);
                $pdf->SetXY($x, $y + 8);
                $pdf->SetFont('Arial', 'B', 6);
                $pdf->Cell(22, 3, 'QR', 0, 0, 'C');
                $pdf->SetY($y + 24);
            }

            // 7. LEYENDAS
            $pdf->Ln(2);
            $pdf->SetFont('Arial', 'B', 5);
            $pdf->MultiCell(0, 2.5, utf8_decode('"ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY"'), 0, 'C');
            $pdf->Ln(1);
            $pdf->SetFont('Arial', '', 5);
            $pdf->MultiCell(0, 2.5, utf8_decode('Ley N° 453: Tienes derecho a recibir información correcta, veraz, oportuna y completa sobre las características y contenidos de los productos que compras.'), 0, 'C');

            return response($pdf->Output('S'), 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="factura-' . $checkin->id . '.pdf"');
                
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage(), 'line' => $e->getLine(), 'file' => $e->getFile()], 500);
        }
    }
    // --- FUNCIÓN MANUAL PARA NÚMERO A LETRAS (SIN DEPENDENCIAS) ---
    private function convertirNumeroALetras($monto)
    {
        $monto = floatval($monto);
        $entero = floor($monto);
        $centavos = round(($monto - $entero) * 100);

        $letras = $this->enteroALetras($entero);

        return ucfirst($letras) . ' ' . str_pad($centavos, 2, '0', STR_PAD_LEFT) . '/100 Bolivianos';
    }

    private function enteroALetras($num)
    {
        if ($num == 0) return 'cero';

        $unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
        $decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
        $diez_y = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve'];
        $veinti = ['veinte', 'veintiuno', 'veintidos', 'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete', 'veintiocho', 'veintinueve'];
        $centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

        if ($num < 10) return $unidades[$num];

        if ($num < 20) return $diez_y[$num - 10];

        if ($num < 30) return $veinti[$num - 20];

        if ($num < 100) {
            $d = floor($num / 10);
            $u = $num % 10;
            return $decenas[$d] . ($u > 0 ? ' y ' . $unidades[$u] : '');
        }

        if ($num == 100) return 'cien';

        if ($num < 1000) {
            $c = floor($num / 100);
            $resto = $num % 100;
            return $centenas[$c] . ($resto > 0 ? ' ' . $this->enteroALetras($resto) : '');
        }

        if ($num == 1000) return 'mil';

        if ($num < 2000) {
            return 'mil ' . $this->enteroALetras($num % 1000);
        }

        if ($num < 1000000) {
            $m = floor($num / 1000);
            $resto = $num % 1000;
            // Caso especial para "un mil" -> "mil"
            $miles = ($m == 1) ? 'mil' : $this->enteroALetras($m) . ' mil';
            return $miles . ($resto > 0 ? ' ' . $this->enteroALetras($resto) : '');
        }

        return 'numero grande'; // Simplificado para este caso
    }

    public function generateViewDetail(Request $request)
    {
        // Verificación del huesped
        if (!$request->filled('guest_id')) {
            return response()->json([
                'status' => 'error',
                'message' => 'El ID del huesped es obligatorio'
            ], 400);
        }

        $checkin = \App\Models\Checkin::with(['checkinDetails.service', 'room', 'guest'])
            ->where('guest_id', $request->guest_id)
            ->where('status', 'activo')
            ->first();

        if (!$checkin) {
            return response()->json([
                'status' => 'error',
                'message' => 'No se encontró una estadía activa para este huésped'
            ], 404);
        }

        // CORRECCIÓN: Usar la propiedad sin paréntesis ->checkinDetails
        $detailAdd = $checkin->checkinDetails->map(function ($detail) {
            return [
                'id' => $detail->id,
                'service' => $detail->service->name ?? 'Servicio Eliminado',
                'count' => $detail->quantity, // <--- Corregido 'quiantity' a 'quantity'
                'unit_price' => (float) $detail->selling_price,
                'subtotal' => (float) ($detail->quantity * $detail->selling_price),
            ];
        });

        // CORRECCIÓN: La clave debe coincidir exactamente con la del array ('subtotal')
        $total = $detailAdd->sum('subtotal');

        return response()->json([
            'status' => 'success',
            'data' => [
                'servicios' => $detailAdd,
                'total_adicional' => $total,
            ]
        ]);
    }

    // --- LÓGICA INTELIGENTE DE COBRO (CORREGIDA) ---
    // --- LÓGICA INTELIGENTE DE COBRO (CORREGIDA PARA TU CASO) ---
    // --- LÓGICA INTELIGENTE DE COBRO (CORREGIDA Y FINAL) ---
    private function calculateBillableDays(Checkin $checkin, Carbon $fechaSalidaReal, $waivePenalty = false)
    {
        // 1. Si ya está finalizado en BD, respetamos lo histórico
        if ($checkin->status === 'finalizado') {
            return max(1, intval($checkin->duration_days));
        }

        $ingreso = Carbon::parse($checkin->check_in_date);
        
        // AJUSTE DE ENTRADA (Aplica siempre si hay horario)
        // Si entró a las 05:12, para el sistema es como si hubiera entrado a las 06:00
        if ($checkin->schedule) {
            $horaOficialEntrada = Carbon::parse($ingreso->format('Y-m-d') . ' ' . $checkin->schedule->check_in_time);
            $inicioTolerancia = $horaOficialEntrada->copy()->subMinutes($checkin->schedule->entry_tolerance_minutes);

            if ($ingreso->between($inicioTolerancia, $horaOficialEntrada)) {
                $ingreso = $horaOficialEntrada;
            }
        }

        // --- CASO A: SI PRESIONAS EL BOTÓN DE TOLERANCIA ---
        // Ignoramos la hora de salida. Solo contamos días calendario.
        // Ej: Entró el 1, Salió el 4 a las 15:00. (4 - 1) = 3 Días.
        if ($waivePenalty) {
            $diasCalendario = $ingreso->copy()->startOfDay()->diffInDays($fechaSalidaReal->copy()->startOfDay());
            return $diasCalendario == 0 ? 1 : $diasCalendario;
        }

        // --- CASO B: LÓGICA ESTRICTA (POR DEFECTO) ---
        // Calculamos días calendario base
        $diasBase = $ingreso->copy()->startOfDay()->diffInDays($fechaSalidaReal->copy()->startOfDay());
        if ($diasBase == 0) $diasBase = 1;

        if (!$checkin->schedule) {
            // Sin horario: cálculo matemático simple de 24h
            return max(intval($checkin->duration_days), ceil($ingreso->floatDiffInDays($fechaSalidaReal)));
        }

        // Con horario: Verificamos la hora de salida
        $horario = $checkin->schedule;
        
        // Hora límite para HOY (día de salida)
        $limiteSalidaHoy = Carbon::parse($fechaSalidaReal->format('Y-m-d') . ' ' . $horario->check_out_time);
        $limiteConTolerancia = $limiteSalidaHoy->copy()->addMinutes($horario->exit_tolerance_minutes);

        // DECISIÓN:
        if ($fechaSalidaReal->greaterThan($limiteConTolerancia)) {
            // SE PASÓ DE LA HORA: Cobramos el día extra
            // Ej: Entró el 1, Salió el 4 a las 11:35 (límite 11:30).
            // Días base (3) + 1 = 4 Días.
            return $diasBase + 1;
        } else {
            // SALIÓ A TIEMPO (o dentro de tolerancia): Cobramos solo días base
            return $diasBase;
        }
    }
}
