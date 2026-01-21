<?php

namespace App\Http\Controllers;

// Si usas FPDF globalmente, esta línea a veces sobra, 
// pero la dejo porque en tu código anterior estaba.
use Fpdf;
use Carbon\Carbon;
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
            // AGREGADO: phone
            $request->validate([
                'full_name' => 'required|string|max:150',
                'identification_number' => 'nullable|string|max:50',
                'phone' => 'nullable|string|max:20', // <--- Validación Teléfono
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
                'phone' => $request->phone, // <--- GUARDAR TELÉFONO
                'profile_status' => $isComplete ? 'COMPLETE' : 'INCOMPLETE',
            ]);

            $guestId = $guest->id;
        } else {
            // --- HUÉSPED EXISTENTE ---
            $guestId = $request->guest_id;

            // Opcional: Si envían teléfono al seleccionar uno existente, actualizarlo si no tiene
            if ($request->filled('phone')) {
                $existingGuest = \App\Models\Guest::find($guestId);
                if ($existingGuest) {
                    $existingGuest->update(['phone' => $request->phone]);
                }
            }
        }

        // 2. Crear Checkin (Igual que antes)
        $validatedCheckin = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'duration_days' => 'required|integer|min:0',
            'advance_payment' => 'nullable|numeric',
            'notes' => 'nullable|string',
        ]);

        // --- SOLUCIÓN DE ERRORES ID ---
        // Usamos la fachada Auth::id() para calmar al editor (Intelephense)
        $userId = \Illuminate\Support\Facades\Auth::id();

        // Si es null (porque expiró la sesión o es prueba), usamos el primer usuario de la BD
        if (!$userId) {
            $fallbackUser = \App\Models\User::first();
            $userId = $fallbackUser ? $fallbackUser->id : 1;
        }
        // -----------------------------

        $checkin = \App\Models\Checkin::create([
            'guest_id' => $guestId,
            'room_id' => $validatedCheckin['room_id'],
            'user_id' => $userId,
            'check_in_date' => now()->timezone('America/La_Paz'),
            'duration_days' => $validatedCheckin['duration_days'],
            'advance_payment' => $validatedCheckin['advance_payment'] ?? 0,
            'notes' => $validatedCheckin['notes'],
            'status' => 'activo',
        ]);

        if ($request->has('selected_services')) {
            $checkin->services()->sync($request->selected_services);
        }

        \App\Models\Room::where('id', $request->room_id)->update(['status' => 'OCUPADO']);

        return redirect()->back()->with('success', 'Asignación registrada correctamente.');
    }
     
    public function update(Request $request, Checkin $checkin)
    {
        // 1. Validaciones (Todos son nullable para permitir borrarlos temporalmente)
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'duration_days' => 'required|integer|min:0',
            'advance_payment' => 'required|numeric|min:0',
            'notes' => 'nullable|string',

            // Datos del Huésped
            'full_name' => 'required|string|max:150',
            'identification_number' => 'nullable|string|max:50',
            'nationality' => 'nullable|string',
            'origin' => 'nullable|string',
            'profession' => 'nullable|string',
            'civil_status' => 'nullable|string',
            'birth_date' => 'nullable|date',
            'issued_in' => 'nullable|string',
            'phone' => 'nullable|string|max:20', // <--- Validación Teléfono

            // Validación de Acompañantes
            'companions' => 'nullable|array',
            'companions.*.full_name' => 'required|string|max:150',
            'companions.*.identification_number' => 'nullable|string|max:50',
            'companions.*.relationship' => 'nullable|string|max:50',
            'companions.*.nationality' => 'nullable|string|max:50',
        ]);

        return DB::transaction(function () use ($validated, $request, $checkin) {

            $guest = $checkin->guest;
            $wasIncomplete = $guest->profile_status === 'INCOMPLETE';

            // 2. LÓGICA DE COMPLETITUD (NUEVO)
            // Definimos qué campos son OBLIGATORIOS para que el estado sea 'COMPLETE'
            $requiredFields = [
                'identification_number',
                'nationality',
                'origin',
                'profession',
                'civil_status',
                'birth_date',
                'issued_in'
            ];

            $isProfileComplete = true;
            $missingField = null;

            // Verificamos uno por uno. Si falta alguno, el perfil está incompleto.
            foreach ($requiredFields as $field) {
                // Usamos 'filled' para verificar que no sea null ni string vacío ("")
                if (!$request->filled($field)) {
                    $isProfileComplete = false;
                    $missingField = $field;
                    break;
                }
            }

            // 3. ACTUALIZAR HUÉSPED
            $guest->update([
                'full_name' => strtoupper($validated['full_name']),
                'identification_number' => $request->filled('identification_number') ? strtoupper($validated['identification_number']) : null,
                'nationality' => $request->filled('nationality') ? strtoupper($validated['nationality']) : null,
                'origin' => $request->filled('origin') ? strtoupper($validated['origin']) : null,
                'profession' => $request->filled('profession') ? strtoupper($validated['profession']) : null,
                'civil_status' => $validated['civil_status'], // Puede ser null
                'birth_date' => $validated['birth_date'],     // Puede ser null
                'issued_in' => $request->filled('issued_in') ? strtoupper($validated['issued_in']) : null,
                'phone' => $request->phone, // <--- ACTUALIZAR TELÉFONO

                // ESTADO CALCULADO:
                'profile_status' => $isProfileComplete ? 'COMPLETE' : 'INCOMPLETE'
            ]);

            // 3.5 Actualizar Acompañantes 
            if ($request->has('companions')) {
                $idsParaSincronizar = [];

                foreach ($request->companions as $compData) {
                    // 1. Buscamos si la persona ya existe por su carnet (si tiene)
                    $companion = null;
                    if (!empty($compData['identification_number'])) {
                        $companion = \App\Models\Guest::where('identification_number', $compData['identification_number'])->first();
                    }

                    // 2. Si no existe, lo creamos
                    if (!$companion) {
                        $companion = \App\Models\Guest::create([
                            'full_name' => strtoupper($compData['full_name']),
                            'identification_number' => !empty($compData['identification_number']) ? strtoupper($compData['identification_number']) : null,
                            'nationality' => !empty($compData['nationality']) ? strtoupper($compData['nationality']) : 'BOLIVIANA',
                            'profile_status' => 'INCOMPLETE' // Acompañantes suelen ser incompletos
                        ]);
                    } else {
                        // Opcional: Actualizar nombre si cambió
                        $companion->update(['full_name' => strtoupper($compData['full_name'])]);
                    }

                    // 3. Preparamos para sincronizar (ID + Parentesco)
                    // Evitamos agregarnos a nosotros mismos (el titular) como acompañante por error
                    if ($companion->id !== $guest->id) {
                        $idsParaSincronizar[$companion->id] = [
                            'relationship' => !empty($compData['relationship']) ? strtoupper($compData['relationship']) : 'ACOMPAÑANTE'
                        ];
                    }
                }

                // 4. SYNC: Borra los que quitaste de la lista y agrega los nuevos
                $checkin->companions()->sync($idsParaSincronizar);
            }

            // 4. LÓGICA DE FECHAS INTELIGENTE
            $newCheckInDate = $validated['check_in_date'];

            // Si antes faltaban datos y AHORA está todo completo, actualizamos la fecha a "AHORA"
            if ($wasIncomplete && $isProfileComplete) {
                $newCheckInDate = now();
            }

            // Recalcular salida
            $checkInCarbon = \Carbon\Carbon::parse($newCheckInDate);
            $checkOutDate = $validated['duration_days'] > 0
                ? $checkInCarbon->copy()->addDays($validated['duration_days'])
                : null;

            // 5. Gestionar cambio de habitación si aplica
            if ($checkin->room_id != $validated['room_id']) {
                \App\Models\Room::where('id', $checkin->room_id)->update(['status' => 'LIBRE']);
                \App\Models\Room::where('id', $validated['room_id'])->update(['status' => 'OCUPADO']);
            }

            // 6. Actualizar Checkin
            $checkin->update([
                'room_id' => $validated['room_id'],
                'check_in_date' => $newCheckInDate,
                'duration_days' => $validated['duration_days'],
                'check_out_date' => $checkOutDate,
                'advance_payment' => $validated['advance_payment'],
                'notes' => strtoupper($validated['notes'] ?? ''),
            ]);

            // 7. Servicios
            if ($request->has('selected_services')) {
                $services = \App\Models\Service::whereIn('id', $request->selected_services)->get();
                $syncData = [];
                foreach ($services as $service) {
                    $syncData[$service->id] = ['quantity' => 1, 'selling_price' => $service->price];
                }
                $checkin->services()->sync($syncData);
            }

            // --- LÓGICA DE RESPUESTA CONDICIONAL ---
            if (!$isProfileComplete) {
                // Traducción simple del campo faltante
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

                return redirect()->back()->with('error', 'Falta completar: ' . $campoFaltante . '. La habitación sigue PENDIENTE.');
            }

            return redirect()->back()->with('success', 'Datos actualizados. Estado del huésped recalculado.');
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
            $room->update(['status' => 'LIMPIEZA']);
        }

        $checkin->update([
            'check_out_date' => now(),
            'status' => 'finalizado'
        ]);

        return response()->json(['success' => true, 'message' => 'Estadía finalizada']);
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

    public function generateCheckoutReceipt(Checkin $checkin)
    {
        // 1. CARGAR RELACIONES CORRECTAS
        // Usamos 'checkinDetails.service' para acceder a los consumos y sus nombres
        $checkin->load(['guest', 'room.price', 'checkinDetails.service']);

        // --- LÓGICA DE DÍAS (Igual que tenías) ---
        $diasPactados = intval($checkin->duration_days);
        if ($diasPactados < 1) $diasPactados = 1;

        $ingreso = \Carbon\Carbon::parse($checkin->check_in_date);
        $salida = $checkin->check_out_date ? \Carbon\Carbon::parse($checkin->check_out_date) : now();

        $diasRealesTranscurridos = $ingreso->diffInDays($salida);
        $diasACobrar = max($diasPactados, $diasRealesTranscurridos);

        $diasExcedidos = 0;
        if ($diasRealesTranscurridos > $diasPactados) {
            $diasExcedidos = $diasRealesTranscurridos - $diasPactados;
        }

        // --- CÁLCULOS ECONÓMICOS ---
        $precioUnitario = $checkin->room->price->amount ?? 0;
        $totalHospedaje = $precioUnitario * $diasACobrar;

        // Calcular Servicios usando CheckinDetails
        $totalServicios = 0;
        foreach ($checkin->checkinDetails as $detalle) {
            // Prioridad: Precio Histórico (selling_price) -> Precio Actual (service->price)
            $precioReal = $detalle->selling_price ?? $detalle->service->price;
            $totalServicios += ($detalle->quantity * $precioReal);
        }

        $granTotal = $totalHospedaje + $totalServicios;
        $adelanto = $checkin->advance_payment ?? 0;
        $saldoPagar = $granTotal - $adelanto;

        // --- GENERACIÓN PDF ---
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
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(15, 4, 'Ingreso:', 0, 0);
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(22, 4, $ingreso->format('d/m/y H:i'), 0, 0);

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

        // 1. Hospedaje
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(32, 4, utf8_decode("Hospedaje ($diasACobrar dias)"), 0, 0, 'L');
        $pdf->Cell(10, 4, '1', 0, 0, 'C'); // Opcional: mostrar dias aqui
        $pdf->Cell(15, 4, number_format($totalHospedaje, 2), 0, 0, 'R'); // Precio total por dias
        $pdf->Cell(15, 4, number_format($totalHospedaje, 2), 0, 1, 'R');

        if ($diasExcedidos > 0) {
            $pdf->SetFont('Arial', 'I', 6);
            $pdf->Cell(0, 3, utf8_decode("(Inc. $diasExcedidos dias extra)"), 0, 1, 'L');
        }

        // 2. Servicios Adicionales
        $pdf->SetFont('Arial', '', 7);
        foreach ($checkin->checkinDetails as $detalle) {
            // Precio Histórico o Actual
            $precio = $detalle->selling_price ?? $detalle->service->price;
            $subtotal = $precio * $detalle->quantity;

            // Cortar nombre si es muy largo
            $nombreSrv = substr($detalle->service->name, 0, 20);

            $pdf->Cell(32, 4, utf8_decode($nombreSrv), 0, 0, 'L');
            $pdf->Cell(10, 4, $detalle->quantity, 0, 0, 'C');
            $pdf->Cell(15, 4, number_format($precio, 2), 0, 0, 'R');
            $pdf->Cell(15, 4, number_format($subtotal, 2), 0, 1, 'R');
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
}
