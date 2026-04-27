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
use App\Models\Payment;
use App\Models\Invoice;
use App\Models\InvoiceDetail;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB; // Importante para guardar Huésped y Checkin juntos
use App\Models\SpecialAgreement;
use Illuminate\Support\Facades\Log;

class CheckinController extends Controller
{
    public function index()
    {

        $checkins = Checkin::with(['guest', 'room.roomType', 'companions', 'schedule', 'services'])
            ->orderBy('created_at', 'desc')
            ->get();

        $guests = Guest::orderBy('full_name')->get();
        $rooms = Room::with(['roomType', 'price'])->get();
        $schedules = \App\Models\Schedule::where('is_active', true)->get();
        $roomTypes = \App\Models\RoomType::where('is_active', true)->get();
        return Inertia::render('checkins/index', [
            'Checkins' => $checkins,
            'Guests' => $guests,
            'Rooms' => $rooms,
            'Schedules' => $schedules,
            'RoomTypes' => $roomTypes,
        ]);
    }

    // Funcion Calculo de precio acordado segun ocupacion y capacidad
    // Funcion Calculo de precio acordado segun ocupacion y capacidad
    public function calculateAgreedPrice($roomId, $totalGuests)
    {
        $room = \App\Models\Room::with(['price', 'roomType'])->findOrFail($roomId);

        // Datos por defecto de la habitación original
        $originalPrice = $room->price->amount ?? 0;
        $bathroomType = $room->price->bathroom_type ?? null;
        $roomCapacity = $room->roomType->capacity ?? 1;

        $agreedPrice = $originalPrice;

        // Si la cantidad de personas es menor a la capacidad máxima y hay un tipo de baño definido
        if ($totalGuests < $roomCapacity && $bathroomType) {
            // Buscamos un precio activo que coincida con el tipo de baño y la cantidad de huéspedes actual
            $adjustedPrice = \App\Models\Price::where('is_active', true)
                ->where('bathroom_type', $bathroomType)
                ->whereHas('roomType', function ($query) use ($totalGuests) {
                    $query->where('capacity', $totalGuests);
                })
                ->first();

            if ($adjustedPrice) {
                $agreedPrice = $adjustedPrice->amount;
            }
        }

        return $agreedPrice;
    }

    public function store(Request $request)
    {
        // =========================================================
        // 1. NORMALIZADORES (Fechas y Procedencia)
        // =========================================================
        if ($request->filled('birth_date')) {
            $fecha = trim($request->birth_date);
            if (preg_match('/^\d{4}$/', $fecha)) {
                $request->merge(['birth_date' => $fecha . '-01-01']);
            }
        }

        if ($request->has('companions') && is_array($request->companions)) {
            $companions = $request->companions;
            foreach ($companions as $key => $comp) {
                if (!empty($comp['birth_date'])) {
                    $cFecha = trim($comp['birth_date']);
                    if (preg_match('/^\d{4}$/', $cFecha)) {
                        $companions[$key]['birth_date'] = $cFecha . '-01-01';
                    }
                }
            }
            $request->merge(['companions' => $companions]);
        }

        $inputOrigin = $request->input('origin');
        $cleanOrigin = null;

        if (!empty($inputOrigin) && is_string($inputOrigin) && trim($inputOrigin) !== '' && !str_starts_with(trim($inputOrigin), 'http') && strtolower(trim($inputOrigin)) !== 'null') {
            $cleanOrigin = strtoupper(trim($inputOrigin));
            $request->merge(['origin' => $cleanOrigin]); // Lo guardamos en el request por si acaso
        }

        // =========================================================
        // 🚀 2. VALIDACIÓN TEMPRANA (El candado principal)
        // =========================================================
        $validatedCheckin = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'actual_arrival_date' => 'nullable|date',
            'schedule_id' => 'nullable|exists:schedules,id',
            'duration_days' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',

            // Validaciones estructurales del Titular
            'full_name' => 'required_without:guest_id|string|max:150',
            'identification_number' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:20',

            // Validaciones estructurales de los Acompañantes
            'companions' => 'nullable|array',
            'companions.*.full_name' => 'nullable|string|max:150',
            'companions.*.identification_number' => 'nullable|string|max:50',

            // Pagos y Convenios
            'selected_services' => 'nullable|array',
            'advance_payment' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|required_if:advance_payment,>,0|in:EFECTIVO,QR,TARJETA,TRANSFERENCIA',
            'qr_bank' => 'nullable|string',
            'is_temporary' => 'nullable|boolean',
            'discount' => 'nullable|numeric|min:0',
            'is_corporate' => 'nullable|boolean',
            'type' => 'nullable|string|in:estandar,corporativo,delegacion',
            'payment_frequency' => 'nullable|string|max:255',
            'corporate_days' => 'nullable|integer',
            'agreed_price' => 'nullable|numeric|min:0',
        ], [
            'payment_method.required_if' => 'Si registra un adelanto, debe elegir un método de pago.',
        ]);

        // =========================================================
        // 🛑 3. VERIFICACIÓN DE COMPLETITUD (TITULAR)
        // =========================================================
        $requiredFields = ['identification_number', 'nationality', 'profession', 'civil_status', 'birth_date', 'issued_in', 'phone'];
        $isTitularComplete = true;
        $missingField = null;

        if (!$request->filled('guest_id')) {
            foreach ($requiredFields as $field) {
                if (!$request->filled($field)) {
                    $isTitularComplete = false;
                    $missingField = $field;
                    break;
                }
            }
        } else {
            $existingGuestCheck = \App\Models\Guest::find($request->guest_id);
            if ($existingGuestCheck) {
                foreach ($requiredFields as $field) {
                    $hasData = $request->filled($field) || !empty($existingGuestCheck->$field);
                    if (!$hasData) {
                        $isTitularComplete = false;
                        $missingField = $field;
                        break;
                    }
                }
            }
        }

        if ($isTitularComplete && is_null($cleanOrigin)) {
            $isTitularComplete = false;
            $missingField = 'origin';
        }

        // =========================================================
        // 🚀 VERIFICAR SI ESTAMOS ASIGNANDO UN SALÓN
        // =========================================================
        $roomToAssign = \App\Models\Room::with('roomType')->find($validatedCheckin['room_id']);
        $isAssigningSalon = $roomToAssign && str_contains(strtoupper($roomToAssign->roomType->name ?? ''), 'SALON');

        // =========================================================
        // 4. PROCESO DE CREACIÓN / ACTUALIZACIÓN DEL TITULAR
        // =========================================================
        $fullName = strtoupper($request->full_name ?? '');
        $birthDate = $request->birth_date;
        $idNumber = $request->filled('identification_number') ? strtoupper($request->identification_number) : null;

        if (!$request->filled('guest_id')) {
            // MODO NUEVO HUÉSPED
            $existingGuest = null;

            if (!empty($idNumber)) {
                $existingGuest = \App\Models\Guest::where('identification_number', $idNumber)->first();
            }

            if (!$existingGuest && !empty($fullName)) {
                $existingGuest = \App\Models\Guest::where('full_name', $fullName)->first();
                if ($existingGuest && !empty($existingGuest->identification_number) && !empty($idNumber) && $existingGuest->identification_number !== $idNumber) {
                    $existingGuest = null;
                }
            }

            if ($existingGuest) {
                // BARRERA 1 INTELIGENTE
                $ocupacionesPrevias = \App\Models\Checkin::with('room.roomType')
                    ->where('guest_id', $existingGuest->id)
                    ->where('status', 'activo')
                    ->get();

                foreach ($ocupacionesPrevias as $ocupacion) {
                    $isPreviousSalon = str_contains(strtoupper($ocupacion->room->roomType->name ?? ''), 'SALON');
                    if ($isAssigningSalon === $isPreviousSalon) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'guest_id' => "ALERTA: Este huésped ya se encuentra registrado en el/la " . $ocupacion->room->number,
                        ]);
                    }
                }

                $existingGuest->update([
                    'identification_number' => $idNumber ?? $existingGuest->identification_number,
                    'nationality' => $request->nationality ?? $existingGuest->nationality,
                    'civil_status' => $request->civil_status ?? $existingGuest->civil_status,
                    'birth_date' => $birthDate ?? $existingGuest->birth_date,
                    'profession' => $request->filled('profession') ? strtoupper($request->profession) : $existingGuest->profession,
                    'issued_in' => $request->filled('issued_in') ? strtoupper($request->issued_in) : $existingGuest->issued_in,
                    'phone' => $request->phone ?? $existingGuest->phone,
                    'profile_status' => $isTitularComplete ? 'COMPLETE' : 'INCOMPLETE',
                ]);
                $guestId = $existingGuest->id;
            } else {
                $guest = \App\Models\Guest::create([
                    'full_name' => $fullName,
                    'identification_number' => $idNumber,
                    'nationality' => $request->nationality ?? 'BOLIVIANA',
                    'civil_status' => $request->civil_status,
                    'birth_date' => $birthDate,
                    'profession' => $request->profession ? strtoupper($request->profession) : null,
                    'issued_in' => $request->issued_in ? strtoupper($request->issued_in) : null,
                    'phone' => $request->phone,
                    'profile_status' => $isTitularComplete ? 'COMPLETE' : 'INCOMPLETE',
                ]);
                $guestId = $guest->id;
            }
        } else {
            // MODO EDICIÓN (Huésped existente)
            $guestId = $request->guest_id;
            $existingGuest = \App\Models\Guest::find($guestId);

            // =========================================================
            // 🛡️ GUARDIÁN DE IDENTIDAD TITULAR (Anti IDs Fantasmas)
            // =========================================================
            if ($existingGuest) {
                $nuevoNombre = strtoupper(trim($request->full_name ?? ''));
                $nuevoCarnet = $idNumber;

                $esNombreDiferente = !empty($nuevoNombre) && $nuevoNombre !== strtoupper($existingGuest->full_name);
                $esCarnetDiferente = !empty($nuevoCarnet) && !empty($existingGuest->identification_number) && $nuevoCarnet !== strtoupper($existingGuest->identification_number);

                if ($esNombreDiferente && $esCarnetDiferente) {
                    $existingGuest = null; // Rompemos el vínculo. Se creará uno nuevo abajo.
                }
            }

            if ($existingGuest) {
                // BARRERA 2 INTELIGENTE
                $ocupacionesPrevias = \App\Models\Checkin::with('room.roomType')
                    ->where('guest_id', $guestId)
                    ->where('status', 'activo')
                    ->get();

                foreach ($ocupacionesPrevias as $ocupacion) {
                    $isPreviousSalon = str_contains(strtoupper($ocupacion->room->roomType->name ?? ''), 'SALON');
                    if ($isAssigningSalon === $isPreviousSalon) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'guest_id' => "ALERTA: Este huésped ya se encuentra registrado en el/la " . $ocupacion->room->number,
                        ]);
                    }
                }

                $existingGuest->update([
                    'identification_number' => $request->filled('identification_number') ? strtoupper($request->identification_number) : $existingGuest->identification_number,
                    'nationality' => $request->filled('nationality') ? strtoupper($request->nationality) : $existingGuest->nationality,
                    'civil_status' => $request->filled('civil_status') ? strtoupper($request->civil_status) : $existingGuest->civil_status,
                    'birth_date' => $request->filled('birth_date') ? $request->birth_date : $existingGuest->birth_date,
                    'profession' => $request->filled('profession') ? strtoupper($request->profession) : $existingGuest->profession,
                    'issued_in' => $request->filled('issued_in') ? strtoupper($request->issued_in) : $existingGuest->issued_in,
                    'phone' => $request->phone ?? $existingGuest->phone,
                    'profile_status' => $isTitularComplete ? 'COMPLETE' : 'INCOMPLETE'
                ]);
            } else {
                // CREACIÓN FORZADA (El Guardián detectó un ID Fantasma)
                $guest = \App\Models\Guest::create([
                    'full_name' => strtoupper(trim($request->full_name ?? '')),
                    'identification_number' => $idNumber,
                    'nationality' => $request->nationality ?? 'BOLIVIANA',
                    'civil_status' => $request->civil_status,
                    'birth_date' => $request->birth_date,
                    'profession' => $request->profession ? strtoupper($request->profession) : null,
                    'issued_in' => $request->issued_in ? strtoupper($request->issued_in) : null,
                    'phone' => $request->phone,
                    'profile_status' => $isTitularComplete ? 'COMPLETE' : 'INCOMPLETE',
                ]);
                $guestId = $guest->id;
            }
        }

        // =========================================================
        // LÓGICA DE PRECIOS Y PLAN CORPORATIVO / DELEGACIÓN
        // =========================================================
        $totalGuest = 1;
        if ($request->has('companions') && is_array($request->companions)) {
            foreach ($request->companions as $compData) {
                if (!empty($compData['full_name'])) {
                    $totalGuest++;
                }
            }
        }

        $roomModelForPrice = \App\Models\Room::with('price')->findOrFail($validatedCheckin['room_id']);
        $basePrice = $roomModelForPrice->price->amount ?? 0;
        $agreedPrice = $basePrice;

        $isSpecialDeal = $request->boolean('is_corporate') || in_array($request->input('type'), ['corporativo', 'delegacion']);

        // CÓDIGO CORREGIDO
        if ($isSpecialDeal) {
            // Respeta el precio enviado por React, si no viene nada, usa la regla de los -20 Bs
            $agreedPrice = $request->filled('agreed_price')
                ? floatval($request->input('agreed_price'))
                : max(0, $basePrice - 20);
        } elseif ($request->boolean('auto_adjust_price')) {
            $agreedPrice = $this->calculateAgreedPrice($validatedCheckin['room_id'], $totalGuest);
        }

        if ($request->filled('discount') && is_numeric($request->discount) && $request->discount > 0) {
            $minAllowed = $agreedPrice * 0.5;
            $agreedPrice = max(floatval($request->discount), $isAssigningSalon ? 0 : $minAllowed);
        }

        $userId = \Illuminate\Support\Facades\Auth::id() ?? 1;

        // =========================================================
        // 5. INICIO DE TRANSACCIÓN EN BASE DE DATOS
        // =========================================================
        return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $guestId, $userId, $validatedCheckin, $cleanOrigin, $isTitularComplete, $missingField, $agreedPrice, $isSpecialDeal, $totalGuest, $isAssigningSalon) {

            $specialAgreementId = null;
            $isAutoAdjust = $request->boolean('auto_adjust_price');

            if ($isSpecialDeal || $isAutoAdjust) {
                $tipoTrato = $isAutoAdjust ? 'AJUSTE DE PRECIO' : ($request->input('type') ?? 'corporativo');
                $frecuenciaDias = $isAutoAdjust ? 0 : (int) $request->input('corporate_days', 0);

                $agreement = \App\Models\SpecialAgreement::create([
                    'type' => $tipoTrato,
                    'agreed_price' => $agreedPrice,
                    'payment_frequency_days' => $frecuenciaDias,
                ]);

                $specialAgreementId = $agreement->id;
            }

            // GUARDAR EL CHECKIN 
            $checkin = \App\Models\Checkin::create([
                'guest_id' => $guestId,
                'room_id' => $validatedCheckin['room_id'],
                'user_id' => $userId,
                'check_in_date' => $validatedCheckin['check_in_date'],
                'actual_arrival_date' => $validatedCheckin['actual_arrival_date'] ?? now(),
                'schedule_id' => $validatedCheckin['schedule_id'] ?? null,
                'origin' => $cleanOrigin,
                'duration_days' => $validatedCheckin['duration_days'] ?? 0,

                'agreed_price' => $agreedPrice,
                'special_agreement_id' => $specialAgreementId,
                'notes' => isset($validatedCheckin['notes']) ? strtoupper($validatedCheckin['notes']) : null,
                'status' => 'activo',
                'is_temporary' => $request->boolean('is_temporary'),
            ]);

            // =========================================================
            // --- PAGOS (MODIFICADO PARA MÓDULO 1) ---
            // =========================================================
            $montoInicial = $validatedCheckin['advance_payment'] ?? 0;
            if ($montoInicial > 0) {
                $banco = ($request->payment_method === 'EFECTIVO') ? null : $request->qr_bank;

                // 1. Buscar la caja abierta del usuario activo
                $cajaAbierta = \App\Models\CashRegister::where('user_id', $userId)
                    ->where('status', 'ABIERTA')
                    ->first();

                // 2. Guardar el pago relacionándolo con la caja y registrando la fecha
                \App\Models\Payment::create([
                    'checkin_id' => $checkin->id,
                    'user_id' => $userId,
                    'cash_register_id' => $cajaAbierta ? $cajaAbierta->id : null, // Conexión a caja
                    'amount' => $montoInicial,
                    'method' => $request->payment_method,
                    'bank_name' => $banco,
                    'type' => 'ADELANTO', // Cambiado de 'PAGO' a 'ADELANTO'
                    'payment_date' => now(), // Fecha exacta requerida en auditoría
                ]);
            }

            // --- ACOMPAÑANTES ---
            $allCompanionsComplete = true;
            if ($request->has('companions') && is_array($request->companions)) {
                $idsParaSincronizar = [];

                foreach ($request->companions as $compData) {
                    if (empty($compData['full_name'])) continue;

                    $compName = strtoupper(trim($compData['full_name']));
                    $compBirthDate = $compData['birth_date'] ?? null;
                    $compIdNumber = !empty($compData['identification_number']) ? strtoupper(trim($compData['identification_number'])) : null;

                    $nacionalidadEvaluada = !empty($compData['nationality']) ? strtoupper(trim($compData['nationality'])) : 'BOLIVIANA';
                    $compIsComplete = !empty($compIdNumber) && !empty($nacionalidadEvaluada);
                    if (!$compIsComplete) {
                        $allCompanionsComplete = false;
                    }

                    $companion = null;

                    // =========================================================
                    // 🛡️ GUARDIÁN DE IDENTIDAD ACOMPAÑANTE (Anti IDs Fantasmas)
                    // =========================================================
                    if (!empty($compData['id'])) {
                        $companion = \App\Models\Guest::find($compData['id']);
                        if ($companion) {
                            $esDiferente = ($compName !== strtoupper($companion->full_name)) &&
                                ($compIdNumber && !empty($companion->identification_number) && $compIdNumber !== strtoupper($companion->identification_number));

                            if ($esDiferente) {
                                $companion = null; // Rompemos vínculo para obligar a crearlo.
                            }
                        }
                    }

                    if (!$companion && !empty($compIdNumber)) {
                        $companion = \App\Models\Guest::where('identification_number', $compIdNumber)->first();
                    }

                    if (!$companion) {
                        $compQuery = \App\Models\Guest::where('full_name', $compName);
                        if (!empty($compBirthDate)) {
                            $compQuery->where('birth_date', $compBirthDate);
                        }
                        $companion = $compQuery->first();
                    }

                    if (!$companion) {
                        $companion = \App\Models\Guest::create([
                            'full_name' => $compName,
                            'identification_number' => $compIdNumber,
                            'nationality' => !empty($compData['nationality']) ? strtoupper($compData['nationality']) : 'BOLIVIANA',
                            'civil_status' => $compData['civil_status'] ?? null,
                            'birth_date' => $compBirthDate,
                            'profession' => !empty($compData['profession']) ? strtoupper($compData['profession']) : null,
                            'issued_in' => !empty($compData['issued_in']) ? strtoupper($compData['issued_in']) : null,
                            'phone' => $compData['phone'] ?? null,
                            'profile_status' => $compIsComplete ? 'COMPLETE' : 'INCOMPLETE'
                        ]);
                    } else {
                        $companion->update([
                            'identification_number' => $compIdNumber ?? $companion->identification_number,
                            'birth_date' => $compBirthDate ?? $companion->birth_date,
                            'issued_in' => !empty($compData['issued_in']) ? strtoupper($compData['issued_in']) : $companion->issued_in,
                            'phone' => $compData['phone'] ?? $companion->phone,
                        ]);
                    }

                    if ($companion->id !== $guestId) {
                        $idsParaSincronizar[$companion->id] = [
                            'origin' => !empty($compData['origin']) ? strtoupper(trim($compData['origin'])) : null
                        ];
                    }
                }

                if (!empty($idsParaSincronizar)) {
                    $checkin->companions()->sync($idsParaSincronizar);
                }
            }

            // --- SERVICIOS ---
            if ($request->has('selected_services')) {
                $checkin->services()->sync($request->selected_services);
            }

            // --- LÓGICA DE ESTADO ---
            $roomModel = \App\Models\Room::with('roomType')->find($validatedCheckin['room_id']);
            $maxCapacity = $roomModel->roomType->capacity ?? 1;

            $isCapacityFull = ($request->boolean('auto_adjust_price') || $isSpecialDeal || $isAssigningSalon) ? true : ($totalGuest >= $maxCapacity);
            $isEverythingComplete = $isTitularComplete && $allCompanionsComplete && $isCapacityFull;

            \Illuminate\Support\Facades\Log::info("🚀 [BACKEND - STORE] NUEVO CHECKIN - HABITACIÓN: " . $validatedCheckin['room_id']);
            \Illuminate\Support\Facades\Log::info("-> 👤 ¿Titular Completo?: " . ($isTitularComplete ? 'SÍ' : 'NO') . " (Falta: " . ($missingField ?? 'Nada') . ")");
            \Illuminate\Support\Facades\Log::info("-> 🧮 Capacidad Máx: " . $maxCapacity . " | Personas reales registradas: " . $totalGuest);
            \Illuminate\Support\Facades\Log::info("-> 💸 ¿Auto-Ajuste Activo?: " . ($request->boolean('auto_adjust_price') ? 'SÍ' : 'NO') . " | Precio Final a guardar: " . $agreedPrice . " Bs");
            \Illuminate\Support\Facades\Log::info("-> 🚦 ¿Capacidad se considera llena?: " . ($isCapacityFull ? 'SÍ' : 'NO'));
            \Illuminate\Support\Facades\Log::info("-> 🏁 ¿TODO COMPLETO?: " . ($isEverythingComplete ? 'SÍ (Pasará a Rojo)' : 'NO (Se quedará Naranja)'));
            \Illuminate\Support\Facades\Log::info("=================================================================");

            \App\Models\Room::where('id', $validatedCheckin['room_id'])->update(['status' => 'OCUPADO']);

            if ($isEverythingComplete) {
                $checkin->update(['is_temporary' => false]);
                return redirect()->back()->with('success', 'Asignación completada correctamente. La instalación está OCUPADA.');
            } else {
                $checkin->update(['is_temporary' => true]);

                $mensaje = 'Faltan datos.';
                if (!$isTitularComplete) {
                    $mensaje = 'Faltan datos obligatorios del Titular.';
                } elseif (!$allCompanionsComplete) {
                    $mensaje = 'El titular está completo, pero faltan datos de los Acompañantes.';
                } elseif (!$isCapacityFull) {
                    $faltantes = $maxCapacity - $totalGuest;
                    $mensaje = "Aún falta registrar a {$faltantes} persona(s).";
                }

                return redirect()->back()->with('success', 'Asignación registrada. ATENCIÓN: ' . $mensaje);
            }
        });
    }

    public function transfer(Request $request, Checkin $checkin)
    {
        // 🚀 MÓDULO 3: Agregamos 'reason' como campo obligatorio para la auditoría
        $request->validate([
            'new_room_id' => 'required|exists:rooms,id|different:room_id',
            'selected_guests' => 'required|array|min:1',
            'selected_guests.*' => 'integer',
            'auto_adjust_price' => 'nullable|boolean',
            'reason' => 'required|string|max:255', // El motivo exigido por recepción
        ]);

        return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $checkin) {
            $newRoomId = $request->new_room_id;
            $ahora = now();
            $oldRoomId = $checkin->room_id; // 🚀 Guardamos la habitación original antes de cambiarla

            $titularId = $checkin->guest_id;
            $companionIds = $checkin->companions->pluck('id')->toArray();
            $allGuestIds = array_merge([$titularId], $companionIds);

            $selectedGuests = $request->selected_guests;
            $isFullTransfer = count($selectedGuests) === count($allGuestIds);

            $newRoom = \App\Models\Room::find($newRoomId);
            $userId = \Illuminate\Support\Facades\Auth::id() ?? 1;

            $hasSpecialAgreement = !is_null($checkin->special_agreement_id);

            // =========================================================
            // CASE A: FULL TRANSFER (Everyone moves together)
            // =========================================================
            if ($isFullTransfer) {
                $totalGuests = count($allGuestIds);
                $nuevoAgreedPrice = $this->calculateAgreedPrice($newRoomId, $totalGuests);
                $diasPasados = $this->calculateBillableDays($checkin, $ahora, true);
                $deudaHastaAhora = $diasPasados * ($checkin->agreed_price ?? 0);

                // 🚀 MÓDULO 3: REGISTRO HISTÓRICO DE TRASLADO INBORRABLE
                \App\Models\RoomTransfer::create([
                    'checkin_id' => $checkin->id,
                    'from_room_id' => $oldRoomId,
                    'to_room_id' => $newRoomId,
                    'user_id' => $userId,
                    'transfer_date' => $ahora,
                    'reason' => strtoupper(trim($request->reason)),
                ]);

                \App\Models\Room::where('id', $oldRoomId)->update(['status' => 'LIMPIEZA']);
                $newRoom->update(['status' => 'OCUPADO']);

                $noteAddition = $deudaHastaAhora > 0
                    ? " | TRANSFER TO ROOM {$newRoom->number}. Previous balance owed: {$deudaHastaAhora} Bs"
                    : " | TRANSFER TO ROOM {$newRoom->number}";

                $checkin->update([
                    'room_id' => $newRoomId,
                    'agreed_price' => $hasSpecialAgreement ? $checkin->agreed_price : $nuevoAgreedPrice,
                    'special_agreement_id' => $checkin->special_agreement_id,
                    'notes' => $checkin->notes . $noteAddition
                ]);

                return redirect()->back()->with('success', 'Transferencia registrada y auditada correctamente.');
            }
            // =========================================================
            // CASE B: PARTIAL TRANSFER (Split into 2 rooms)
            // =========================================================
            else {
                $stayingIds = array_values(array_diff($allGuestIds, $selectedGuests));
                $leavingIds = array_values($selectedGuests);

                $newOldTitularId = $stayingIds[0];
                $newOldCompanions = array_slice($stayingIds, 1);

                $newNewTitularId = $leavingIds[0];
                $newNewCompanions = array_slice($leavingIds, 1);

                $precioViejaHabitacion = $this->calculateAgreedPrice($checkin->room_id, count($stayingIds));
                $precioNuevaHabitacion = $this->calculateAgreedPrice($newRoomId, count($leavingIds));

                $diasPasados = $this->calculateBillableDays($checkin, $ahora, true);
                $deudaHastaAhora = $diasPasados * ($checkin->agreed_price ?? 0);

                // 1. Actualizamos a los que se QUEDAN
                $noteAdditionStay = $deudaHastaAhora > 0
                    ? " | SPLIT: " . count($leavingIds) . " guest(s) moved to Room {$newRoom->number}. Balance before split: {$deudaHastaAhora} Bs"
                    : " | SPLIT: " . count($leavingIds) . " guest(s) moved to Room {$newRoom->number}";

                $checkin->update([
                    'guest_id' => $newOldTitularId,
                    'agreed_price' => $hasSpecialAgreement ? $checkin->agreed_price : $precioViejaHabitacion,
                    'special_agreement_id' => $checkin->special_agreement_id,
                    'notes' => $checkin->notes . $noteAdditionStay
                ]);
                $checkin->companions()->sync($newOldCompanions);
                \App\Models\Room::where('id', $oldRoomId)->update(['status' => 'OCUPADO']);

                // 2. Creamos la cuenta a los que se VAN
                $nuevoCheckin = \App\Models\Checkin::create([
                    'guest_id' => $newNewTitularId,
                    'user_id' => $userId,
                    'room_id' => $newRoomId,
                    'check_in_date' => $checkin->check_in_date,
                    'actual_arrival_date' => $checkin->actual_arrival_date ?? $checkin->check_in_date,
                    'schedule_id' => $checkin->schedule_id,
                    'origin' => $checkin->origin,
                    'duration_days' => 0,
                    'advance_payment' => 0,
                    'agreed_price' => $hasSpecialAgreement ? $checkin->agreed_price : $precioNuevaHabitacion,
                    'special_agreement_id' => null,
                    'parent_checkin_id' => null,
                    'carried_balance' => 0,
                    // 🚀 CORRECCIÓN CLAVE PARA REACT:
                    // Iniciamos como true por precaución, pero lo validaremos justo abajo
                    'is_temporary' => true,
                    'status' => 'activo',
                    'notes' => "SPLIT FROM ROOM " . $checkin->room->number,
                ]);

                if (!empty($newNewCompanions)) {
                    $nuevoCheckin->companions()->sync($newNewCompanions);
                }

                // 🚀 MÓDULO 3: REGISTRO HISTÓRICO PARA LOS QUE SE DIVIDIERON
                \App\Models\RoomTransfer::create([
                    'checkin_id' => $nuevoCheckin->id,
                    'from_room_id' => $oldRoomId,
                    'to_room_id' => $newRoomId,
                    'user_id' => $userId,
                    'transfer_date' => $ahora,
                    'reason' => 'DIVISIÓN DE GRUPO - ' . strtoupper(trim($request->reason)),
                ]);

                $newRoom->update(['status' => 'OCUPADO']);

                // =================================================================
                // 🚀 REPARACIÓN DEL "CRASH" (Recálculo de la bandera is_temporary)
                // =================================================================
                $targetRoomModel = \App\Models\Room::with('roomType')->find($newRoomId);
                $maxCapacity = $targetRoomModel->roomType->capacity ?? 1;
                $totalGuestsMoved = 1 + count($newNewCompanions); // Titular (1) + Acompañantes

                // 1. ¿Tienen sus datos completos? (Las barreras que usas en el store)
                // Para una fusión/división asumimos que si ya estaban hospedados, sus datos están completos.
                $isDataComplete = true; // Podrías iterar sobre los profiles si quisieras ser muy estricto

                // 2. ¿Llenaron la habitación?
                $isCapacityFull = $totalGuestsMoved >= $maxCapacity;

                // 3. ¿Tienen el origin lleno? (El causante de tus problemas)
                $hasOrigin = !empty($nuevoCheckin->origin);

                // Si cumplen, les apagamos la alarma roja para que se abra el OccupiedModal
                if ($isDataComplete && $isCapacityFull && $hasOrigin) {
                    $nuevoCheckin->update(['is_temporary' => false]);
                }

                return redirect()->back()->with('success', 'División completada y auditada correctamente.');
            }
        });
    }
    /**
     * Registra un pago adicional (amortización) a una estadía existente.
     */
    public function storePayment(Request $request, \App\Models\Checkin $checkin)
    {
        // 1. VALIDACIÓN
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.10',
            'payment_method' => 'required|in:EFECTIVO,QR,TARJETA,TRANSFERENCIA',
            // El banco es obligatorio SOLO si el método NO es efectivo
            'qr_bank' => 'nullable|required_if:payment_method,QR,TRANSFERENCIA|string',
            'description' => 'nullable|string|max:150',
        ]);

        // 2. PROCESAMIENTO
        \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $request, $checkin) {

            $userId = \Illuminate\Support\Facades\Auth::id() ?? 1;

            // Limpieza: Si es efectivo, el banco debe ser NULL aunque envíen texto basura
            $bankName = ($validated['payment_method'] === 'EFECTIVO') ? null : $validated['qr_bank'];

            // A. INSERTAR EN LA TABLA DE PAGOS (La Billetera)
            // Esto es lo que usará tu nuevo reporte de cierre de caja
            \App\Models\Payment::create([
                'checkin_id' => $checkin->id,
                'user_id'    => $userId, // Importante: Guarda QUIÉN está cobrando ahora
                'amount'     => $validated['amount'],
                'method'     => $validated['payment_method'],
                'bank_name'  => $bankName,
                'type'       => 'PAGO', // Según tu default en BD
                // Si no envían descripción, ponemos una por defecto
                'description' => $request->description ?? 'AMORTIZACIÓN / PAGO A CUENTA'
            ]);

            // B. ACTUALIZAR EL TOTAL EN LA ESTADÍA (Compatibilidad Legacy)
            // Sumamos este nuevo monto al campo 'advance_payment' de la tabla checkins
            // para que en la vista rápida de habitaciones se vea el saldo actualizado.
            $checkin->increment('advance_payment', $validated['amount']);
        });

        return redirect()->back()->with('success', 'Pago registrado exitosamente.');
    }

    public function update(Request $request, Checkin $checkin)
    {
        $validated = $request->validate([
            'room_id' => 'required|exists:rooms,id',
            'check_in_date' => 'required|date',
            'actual_arrival_date' => 'nullable|date',
            'duration_days' => 'required|integer|min:1',
            'notes' => 'nullable|string',
            'origin' => 'nullable|string',
            'is_temporary' => 'boolean',
            'auto_adjust_price' => 'boolean',

            // --- Campos viejos / Nuevos ---
            'is_corporate' => 'nullable|boolean',
            'is_delegation' => 'nullable|boolean',
            'type' => 'nullable|string|in:estandar,corporativo,delegacion',
            'payment_frequency' => 'nullable|string|max:255',
            'corporate_days' => 'nullable|integer', // Lo recibimos para guardarlo en la nueva tabla
            'agreed_price' => 'nullable|numeric|min:0',
        ]);

        $validated['room_id'] = $checkin->room_id;

        return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $checkin, $validated) {

            // =========================================================
            // 🔄 1. PROTECCIÓN Y SWAP DEL TITULAR 
            // =========================================================
            $currentGuest = \App\Models\Guest::find($checkin->guest_id);
            $guestIdToUse = $checkin->guest_id;

            if ($request->filled('identification_number') && $currentGuest && $currentGuest->identification_number !== $request->identification_number) {
                $existingOtherGuest = \App\Models\Guest::where('identification_number', $request->identification_number)->first();
                if ($existingOtherGuest) {
                    $guestIdToUse = $existingOtherGuest->id;
                    $currentGuest = $existingOtherGuest;
                } else {
                    $currentGuest = \App\Models\Guest::create([
                        'full_name' => $request->full_name ? strtoupper($request->full_name) : 'SIN NOMBRE',
                        'identification_number' => $request->identification_number,
                        'nationality' => $request->nationality ? strtoupper($request->nationality) : 'BOLIVIANA',
                    ]);
                    $guestIdToUse = $currentGuest->id;
                }
                $checkin->update(['guest_id' => $guestIdToUse]);
            }

            // =========================================================
            // 2. ACTUALIZAR LOS DATOS DEL TITULAR (CORREGIDO)
            // =========================================================
            $cleanOrigin = null;
            if (!empty($validated['origin'])) {
                $cleanOrigin = trim($validated['origin']);
                $cleanOrigin = trim(preg_replace('/[\s,]+/', ' ', $cleanOrigin));
                $cleanOrigin = strtoupper($cleanOrigin);
            }

            if ($currentGuest) {
                // Evaluamos si el titular tiene todos sus datos antes del update
                $isTitularComplete = !empty($request->identification_number ?? $currentGuest->identification_number) &&
                    !empty($request->nationality ?? $currentGuest->nationality) &&
                    !empty($cleanOrigin) &&
                    !empty($request->profession ?? $currentGuest->profession) &&
                    !empty($request->civil_status ?? $currentGuest->civil_status) &&
                    !empty($request->birth_date ?? $currentGuest->birth_date) &&
                    !empty($request->issued_in ?? $currentGuest->issued_in) &&
                    !empty($request->phone ?? $currentGuest->phone);

                $currentGuest->update([
                    'full_name' => $request->has('full_name') ? ($request->full_name ? strtoupper($request->full_name) : $currentGuest->full_name) : $currentGuest->full_name,
                    'identification_number' => $request->has('identification_number') ? ($request->identification_number ? strtoupper($request->identification_number) : null) : $currentGuest->identification_number,
                    'nationality' => $request->has('nationality') ? ($request->nationality ? strtoupper($request->nationality) : null) : $currentGuest->nationality,
                    'profession' => $request->has('profession') ? ($request->profession ? strtoupper($request->profession) : null) : $currentGuest->profession,
                    'civil_status' => $request->has('civil_status') ? ($request->civil_status ? strtoupper($request->civil_status) : null) : $currentGuest->civil_status,
                    'birth_date' => $request->has('birth_date') ? $request->birth_date : $currentGuest->birth_date,
                    'issued_in' => $request->has('issued_in') ? ($request->issued_in ? strtoupper($request->issued_in) : null) : $currentGuest->issued_in,
                    'phone' => $request->has('phone') ? $request->phone : $currentGuest->phone,
                    'profile_status' => $isTitularComplete ? 'COMPLETE' : 'INCOMPLETE'
                ]);
            } else {
                $isTitularComplete = false; // Por si acaso no hay guest
            }

            // =========================================================
            // 3. ACTUALIZAR ACOMPAÑANTES Y OBTENER SUS IDs (CORREGIDO)
            // =========================================================
            $allCompanionsComplete = true;
            $totalGuests = 1;
            $idsParaSincronizar = [];

            if ($request->has('companions') && is_array($request->companions)) {
                foreach ($request->companions as $compData) {
                    if (empty($compData['full_name'])) continue;
                    $totalGuests++;

                    $compName = strtoupper($compData['full_name']);
                    $compBirthDate = !empty($compData['birth_date']) ? $compData['birth_date'] : null;
                    $compIdNumber = !empty($compData['identification_number']) ? strtoupper($compData['identification_number']) : null;
                    $compNationality = !empty($compData['nationality']) ? strtoupper($compData['nationality']) : 'BOLIVIANA';
                    $compCivilStatus = !empty($compData['civil_status']) ? strtoupper($compData['civil_status']) : null;
                    $compProfession = !empty($compData['profession']) ? strtoupper($compData['profession']) : null;
                    $compPhone = !empty($compData['phone']) ? $compData['phone'] : null;

                    // Un acompañante está completo si tiene carnet y nacionalidad (según tu lógica original)
                    $compIsComplete = !empty($compIdNumber) && !empty($compNationality);
                    if (!$compIsComplete) {
                        $allCompanionsComplete = false;
                    }

                    $companion = null;
                    if (!empty($compIdNumber)) {
                        $companion = \App\Models\Guest::where('identification_number', $compIdNumber)->first();
                    }
                    if (!$companion) {
                        $companion = \App\Models\Guest::where('full_name', $compName)->first();
                    }

                    if (!$companion) {
                        // Si no existe, lo crea con todos los datos disponibles
                        $companion = \App\Models\Guest::create([
                            'full_name' => $compName,
                            'identification_number' => $compIdNumber,
                            'nationality' => $compNationality,
                            'civil_status' => $compCivilStatus,
                            'birth_date' => $compBirthDate,
                            'profession' => $compProfession,
                            'issued_in' => !empty($compData['issued_in']) ? strtoupper($compData['issued_in']) : null,
                            'phone' => $compPhone,
                            'profile_status' => $compIsComplete ? 'COMPLETE' : 'INCOMPLETE'
                        ]);
                    } else {
                        // Si ya existe, lo actualiza preservando datos viejos si vienen vacíos
                        $companion->update([
                            'identification_number' => array_key_exists('identification_number', $compData) ? ($compData['identification_number'] ? strtoupper($compData['identification_number']) : null) : $companion->identification_number,
                            'birth_date' => array_key_exists('birth_date', $compData) ? $compData['birth_date'] : $companion->birth_date,
                            'nationality' => $compNationality, // Siempre actualizamos a la que llegue
                            'civil_status' => array_key_exists('civil_status', $compData) ? ($compData['civil_status'] ? strtoupper($compData['civil_status']) : null) : $companion->civil_status,
                            'profession' => array_key_exists('profession', $compData) ? ($compData['profession'] ? strtoupper($compData['profession']) : null) : $companion->profession,

                            // 👈 LÍNEA AGREGADA PARA GUARDAR EXPEDIDO EN LA EDICIÓN
                            'issued_in' => array_key_exists('issued_in', $compData) ? ($compData['issued_in'] ? strtoupper($compData['issued_in']) : null) : $companion->issued_in,

                            'phone' => array_key_exists('phone', $compData) ? $compData['phone'] : $companion->phone,
                            'profile_status' => $compIsComplete ? 'COMPLETE' : 'INCOMPLETE'
                        ]);
                    }

                    // Sincronizamos con el origen específico de cada acompañante
                    if ($companion->id !== $guestIdToUse) {
                        $idsParaSincronizar[$companion->id] = [
                            'origin' => !empty($compData['origin']) ? strtoupper(trim($compData['origin'])) : null
                        ];
                    }
                }
            }
            // =========================================================
            // 🛑 4. BARRERA OMNISCIENTE (TITULAR Y ACOMPAÑANTES)
            // =========================================================
            $roomModelUpdate = \App\Models\Room::with(['price', 'roomType'])->findOrFail($validated['room_id']);
            $isAssigningSalon = str_contains(strtoupper($roomModelUpdate->roomType->name ?? ''), 'SALON');

            $allGuestIdsToCheck = array_merge([$guestIdToUse], array_keys($idsParaSincronizar));

            $ocupacionesPrevias = \App\Models\Checkin::with('room.roomType', 'guest', 'companions')
                ->where('status', 'activo')
                ->where('is_temporary', false)
                ->where('id', '!=', $checkin->id)
                ->where(function ($q) use ($allGuestIdsToCheck) {
                    $q->whereIn('guest_id', $allGuestIdsToCheck)
                        ->orWhereHas('companions', function ($q2) use ($allGuestIdsToCheck) {
                            $q2->whereIn('guests.id', $allGuestIdsToCheck);
                        });
                })
                ->get();

            foreach ($ocupacionesPrevias as $ocupacion) {
                $isPreviousSalon = str_contains(strtoupper($ocupacion->room->roomType->name ?? ''), 'SALON');

                if ($isAssigningSalon === $isPreviousSalon) {
                    $duplicateName = 'Un huésped';
                    if (in_array($ocupacion->guest_id, $allGuestIdsToCheck)) {
                        $duplicateName = $ocupacion->guest->full_name ?? 'El titular';
                    } else {
                        foreach ($ocupacion->companions as $comp) {
                            if (in_array($comp->id, $allGuestIdsToCheck)) {
                                $duplicateName = $comp->full_name;
                                break;
                            }
                        }
                    }

                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'guest_id' => "ALERTA: {$duplicateName} ya se encuentra registrado en el/la " . $ocupacion->room->number,
                    ]);
                }
            }

            if (!empty($idsParaSincronizar)) {
                $checkin->companions()->sync($idsParaSincronizar);
            } else {
                $checkin->companions()->detach();
            }

            // =========================================================
            // 🌟 5. LÓGICA DE GRUPOS ESPECIALES Y AJUSTE DE PRECIO
            // =========================================================
            $maxCapacity = $roomModelUpdate->roomType->capacity ?? 1;
            $basePrice = $roomModelUpdate->price->amount ?? 0;

            $isCorporateNow = $request->boolean('is_corporate');
            $isDelegationNow = $request->boolean('is_delegation');
            $isAutoAdjustNow = $request->boolean('auto_adjust_price');
            $typeRequest = $request->input('type');

            // 🌟 Consideramos el Auto Ajuste como un Grupo Especial
            $isSpecialGroupNow = $isCorporateNow || $isDelegationNow || $isAutoAdjustNow || in_array($typeRequest, ['corporativo', 'delegacion']);

            $hadSpecialAgreement = !is_null($checkin->special_agreement_id);
            $precioActualGuardado = $hadSpecialAgreement ? $checkin->specialAgreement->agreed_price : $basePrice;

            // 🌟 Recalculamos matemáticamente en caso de que agreguen/quiten personas al editar
            if ($isAutoAdjustNow) {
                $updatedAgreedPrice = $this->calculateAgreedPrice($validated['room_id'], $totalGuests);
            } else {
                $updatedAgreedPrice = $request->filled('agreed_price') ? $request->input('agreed_price') : $precioActualGuardado;
            }

            $extraNotes = "";

            if ($isSpecialGroupNow) {
                // 5.1 ES UN GRUPO ESPECIAL O AUTO-AJUSTE (Crear o Actualizar)
                $tipoTratoNuevo = $isAutoAdjustNow ? 'AJUSTE DE PRECIO' : ($typeRequest ?? 'corporativo');
                $frecuenciaDias = $isAutoAdjustNow ? 0 : (int) $request->input('corporate_days', 0);

                // Usamos updateOrCreate para que cree uno nuevo si no tenía, o actualice el que ya tiene
                $agreement = \App\Models\SpecialAgreement::updateOrCreate(
                    ['id' => $checkin->special_agreement_id], // Busca si ya existe
                    [
                        'type' => $tipoTratoNuevo,
                        'agreed_price' => $updatedAgreedPrice,
                        'payment_frequency_days' => $frecuenciaDias,
                    ]
                );

                // Aseguramos que el checkin tenga el ID correcto
                $checkin->special_agreement_id = $agreement->id;
            } elseif ($hadSpecialAgreement && !$isSpecialGroupNow) {
                // 5.2 DE ESPECIAL A NORMAL ("El Castigo")
                $checkInDate = \Carbon\Carbon::parse($checkin->check_in_date);
                $now = \Carbon\Carbon::now();
                $diasQueFueCorporativo = max(0, intval($checkInDate->diffInDays($now)));

                $updatedAgreedPrice = $basePrice;

                $oldAgreementId = $checkin->special_agreement_id;
                $checkin->special_agreement_id = null; // 🌟 Desconectamos el convenio
                \App\Models\SpecialAgreement::where('id', $oldAgreementId)->delete();

                $extraNotes = " [SISTEMA: Convenio revocado. Duró {$diasQueFueCorporativo} días.]";
            } else {
                // 5.3 SIGUE SIENDO NORMAL
                $updatedAgreedPrice = $basePrice;
            }

            // 🌟 Si es Auto Ajuste o Especial, consideramos la capacidad como llena
            $isCapacityFull = $isSpecialGroupNow ? true : ($totalGuests >= $maxCapacity);
            // =========================================================
            // 6. EVALUACIÓN FINAL Y GUARDADO
            // =========================================================
            $isEverythingComplete = $isTitularComplete && $allCompanionsComplete && $isCapacityFull;
            // =================================================================
            // 🛑 ESPÍAS DE CONSOLA PARA LARAVEL (MODO EDICIÓN)
            // =================================================================
            Log::info("🚀 [BACKEND - UPDATE] ACTUALIZANDO CHECKIN ID: " . $checkin->id);
            Log::info("-> 👤 ¿Titular Completo?: " . ($isTitularComplete ? 'SÍ' : 'NO'));
            Log::info("-> 👨‍👩‍👧‍👦 ¿Acompañantes Completos?: " . ($allCompanionsComplete ? 'SÍ' : 'NO'));
            Log::info("-> 🧮 Capacidad Máx: " . $maxCapacity . " | Personas reales registradas: " . $totalGuests);
            Log::info("-> 💸 ¿Auto-Ajuste Activo?: " . ($request->boolean('auto_adjust_price') ? 'SÍ' : 'NO') . " | Precio Final a guardar: " . $updatedAgreedPrice . " Bs");
            Log::info("-> 🚦 ¿Capacidad se considera llena?: " . ($isCapacityFull ? 'SÍ' : 'NO'));
            Log::info("-> 🏁 ¿TODO COMPLETO?: " . ($isEverythingComplete ? 'SÍ (Pasará a Rojo)' : 'NO (Se quedará Naranja)'));
            Log::info("=================================================================");
            \App\Models\Room::where('id', $validated['room_id'])->update(['status' => 'OCUPADO']);

            // Concatenamos las notas que vienen del request, o las antiguas, con las posibles notas extra de "El Castigo"
            $notasFinales = isset($validated['notes']) ? strtoupper($validated['notes']) : $checkin->notes;
            $notasFinales .= $extraNotes;

            $updateData = [
                'actual_arrival_date' => $validated['actual_arrival_date'] ?? $checkin->actual_arrival_date,
                'duration_days' => $validated['duration_days'],
                'notes' => $notasFinales,
                'origin' => $cleanOrigin,
                'agreed_price' => $updatedAgreedPrice,
                'special_agreement_id' => $checkin->special_agreement_id, // Conectamos con la llave de la nueva tabla
            ];

            // Ya no mandamos is_corporate, agreed_price, etc. en el updateData

            if ($isEverythingComplete) {
                $updateData['is_temporary'] = false;
               
                $checkin->update($updateData);
                return redirect()->back()->with('success', 'Check-in completado al 100%. Habitación ocupada definitivamente.');
            } else {
                $updateData['is_temporary'] = true;
                $checkin->update($updateData);

                $mensaje = 'Faltan datos.';
                if (!$isTitularComplete) {
                    $mensaje = 'Faltan datos obligatorios del Titular.';
                } elseif (!$allCompanionsComplete) {
                    $mensaje = 'Faltan datos de los Acompañantes.';
                } elseif (!$isCapacityFull) {
                    $faltantes = $maxCapacity - $totalGuests;
                    $mensaje = "Aún falta registrar a {$faltantes} persona(s).";
                }

                return redirect()->back()->with('success', 'Datos guardados, pero la asignación sigue INCOMPLETA. ' . $mensaje);
            }
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
    public function getCheckoutDetails(Request $request, Checkin $checkin)
    {
        $checkin->load(['guest', 'room.price', 'checkinDetails.service', 'schedule', 'companions', 'payments']);

        $waivePenalty = $request->boolean('waive_penalty', false);
        $checkOutDate = now();

        $isLate = false;
        if (!$waivePenalty && $checkin->schedule) {
            $horaOficial = now()->setTimeFromTimeString($checkin->schedule->check_out_time);
            if ($checkOutDate->greaterThan($horaOficial)) {
                $isLate = true;
            }
        }

        if ($waivePenalty && $checkin->schedule) {
            $horaOficial = now()->setTimeFromTimeString($checkin->schedule->check_out_time);
            $horaLimite = $horaOficial->copy()->addMinutes($checkin->schedule->exit_tolerance_minutes);
            if ($checkOutDate->greaterThan($horaLimite)) {
                $checkOutDate = $horaLimite;
            }
        }

        // =========================================================
        // 🚀 RASTREO DEL HISTORIAL (Para mantener fecha original y días)
        // =========================================================
        $originalCheckInDate = $checkin->check_in_date;
        $totalDiasHistorial = 0;

        $currentParentId = $checkin->parent_checkin_id;
        while ($currentParentId) {
            $parent = \App\Models\Checkin::find($currentParentId);
            if ($parent) {
                $originalCheckInDate = $parent->check_in_date;
                $totalDiasHistorial += max(1, intval($parent->duration_days));
                $currentParentId = $parent->parent_checkin_id;
            } else {
                break;
            }
        }

        $days = $this->calculateBillableDays($checkin, $checkOutDate, $waivePenalty);
        $price = $checkin->agreed_price ?? ($checkin->room->price->amount ?? 0);

        if (str_contains(strtoupper($checkin->notes ?? ''), 'CORPORATIVO')) {
            $bathroomType = strtolower($checkin->room->price->bathroom_type ?? '');
            $isPrivate = $bathroomType === 'private' || $bathroomType === 'privado';
            $ratePerPerson = $isPrivate ? 90 : 60;
            $paxCount = 1 + $checkin->companions->count();
            $price = $ratePerPerson * $paxCount;
        }

        // LÓGICA DE SALDOS (Actual + Historial arrastrado)
        $accommodationTotal = $days * $price;
        $carriedBalance = floatval($checkin->carried_balance ?? 0);

        $servicesTotal = 0;
        foreach ($checkin->checkinDetails as $detail) {
            $p = $detail->selling_price ?? $detail->service->price;
            $servicesTotal += $detail->quantity * $p;
        }

        // AÑADIMOS LA DEUDA ARRASTRADA AL TOTAL A PAGAR
        $grandTotal = $accommodationTotal + $servicesTotal + $carriedBalance;

        // PAGOS (Como los pagos se migraron físicamente en el transfer, aquí ya están todos)
        $totalPagadoReal = 0;
        if ($checkin->payments->count() > 0) {
            foreach ($checkin->payments as $pago) {
                $totalPagadoReal += ($pago->type === 'DEVOLUCION') ? -$pago->amount : $pago->amount;
            }
        } else {
            $totalPagadoReal = $checkin->advance_payment ?? 0;
        }

        $balance = $grandTotal - $totalPagadoReal;

        return response()->json([
            'guest' => $checkin->guest,
            'room' => $checkin->room,
            'check_in_date' => $originalCheckInDate->toIso8601String(), // <-- Fecha Original Real
            'check_out_date' => $checkOutDate->toIso8601String(),
            'duration_days' => $days + $totalDiasHistorial, // <-- Días combinados
            'price_per_night' => $price,
            'accommodation_total' => $accommodationTotal + $carriedBalance, // <-- Deuda combinada
            'services_total' => $servicesTotal,
            'advance_payment' => $totalPagadoReal,
            'grand_total' => $grandTotal,
            'balance' => $balance,
            'notes' => $checkin->notes,
            'is_late' => $isLate
        ]);
    }

    /**
     * Función Auxiliar para cálculo estricto de días
     */
    // adelanto 
    public function addPayment(Request $request, Checkin $checkin)
    {
        // 1. Validación
        $request->validate([
            'amount' => 'required|numeric|min:0.5', // Permitir centavos si es necesario
            'payment_method' => 'required|in:EFECTIVO,QR,TARJETA,TRANSFERENCIA',
            'qr_bank' => 'nullable|string',
        ]);

        // 2. Transacción
        DB::transaction(function () use ($request, $checkin) {

            $banco = ($request->payment_method === 'EFECTIVO') ? null : $request->qr_bank;

            // Creamos el registro en la tabla payments
            \App\Models\Payment::create([
                'checkin_id' => $checkin->id,
                'user_id' => Auth::id(),
                'amount' => $request->amount,
                'method' => $request->payment_method,
                'bank_name' => $banco,
                'description' => 'ADELANTO A CUENTA',
                'type' => 'PAGO'
            ]);
        });

        // 3. Respuesta para Inertia (Recarga automática)
        return redirect()->back()->with('success', 'Adelanto de ' . number_format($request->amount, 2) . ' Bs registrado correctamente.');
    }

    public function checkout(Request $request, Checkin $checkin)
    {
        // 1. Cargamos las relaciones necesarias para realizar los cálculos financieros
        $checkin->load(['room.price', 'checkinDetails.service', 'payments']);

        $room = Room::find($checkin->room_id);
        if ($room) {
            $room->update(['status' => 'LIMPIEZA']);
        }

        // 2. Establecemos las fechas y calculamos los días reales de estadía
        $checkOutDate = $request->input('check_out_date')
            ? \Carbon\Carbon::parse($request->input('check_out_date'))
            : now();
        $waivePenalty = $request->boolean('waive_penalty', false);

        $finalDays = $this->calculateBillableDays($checkin, $checkOutDate, $waivePenalty);

        // 3. Calculamos el precio acordado considerando si hay un descuento/rebaja en este momento
        $agreedPrice = $checkin->agreed_price;
        if ($request->filled('discount') && is_numeric($request->discount) && $request->discount > 0) {
            $totalConRebaja = floatval($request->discount);
            if ($finalDays > 0) {
                $agreedPrice = $totalConRebaja / $finalDays;
            }
            $totalHospedaje = $totalConRebaja;
        } else {
            $precioUnitario = $agreedPrice ?? ($checkin->room->price->amount ?? 0);
            $totalHospedaje = $finalDays * $precioUnitario;
        }

        // 4. Calculamos el total de servicios consumidos
        $servicesTotal = 0;
        foreach ($checkin->checkinDetails as $detail) {
            $precioServicio = $detail->selling_price ?? $detail->service->price;
            $servicesTotal += $detail->quantity * $precioServicio;
        }

        // 5. Calculamos el saldo pendiente real (Hospedaje + Servicios + Saldo Anterior - Pagos previos)
        $carriedBalance = floatval($checkin->carried_balance ?? 0);
        $grandTotal = $totalHospedaje + $servicesTotal + $carriedBalance;

        $totalPagadoPrevio = 0;
        foreach ($checkin->payments as $pago) {
            $totalPagadoPrevio += ($pago->type === 'DEVOLUCION') ? -$pago->amount : $pago->amount;
        }

        $saldoPendienteFinal = max(0, $grandTotal - $totalPagadoPrevio);

        // 6. Registro del pago en la base de datos
        $metodoRecibido = strtolower($request->input('payment_method', 'efectivo'));
        $bancoRecibido = strtoupper($request->input('qr_bank', ''));
        $userId = \Illuminate\Support\Facades\Auth::id() ?? 1;

        if ($metodoRecibido === 'ambos') {
            // Soporte para pago mixto (efectivo y QR)
            $montoEfectivo = floatval($request->input('monto_efectivo', 0));
            $montoQr = floatval($request->input('monto_qr', 0));

            if ($montoEfectivo > 0) {
                \App\Models\Payment::create([
                    'checkin_id' => $checkin->id,
                    'user_id'    => $userId,
                    'amount'     => $montoEfectivo,
                    'method'     => 'EFECTIVO',
                    'type'       => 'PAGO'
                ]);
            }
            if ($montoQr > 0) {
                \App\Models\Payment::create([
                    'checkin_id' => $checkin->id,
                    'user_id'    => $userId,
                    'amount'     => $montoQr,
                    'method'     => 'QR',
                    'bank_name'  => $bancoRecibido ?: 'OTROS',
                    'type'       => 'PAGO'
                ]);
            }
        } else {
            // Registro del pago único basado en el saldo calculado
            if ($saldoPendienteFinal > 0) {
                $metodoUpper = strtoupper($metodoRecibido);
                // Normalización de métodos de pago QR comunes
                if (in_array($metodoUpper, ['YAPE', 'BNB', 'FIE', 'ECO'])) {
                    $bancoRecibido = $metodoUpper;
                    $metodoUpper = 'QR';
                }

                \App\Models\Payment::create([
                    'checkin_id' => $checkin->id,
                    'user_id'    => $userId,
                    'amount'     => $saldoPendienteFinal,
                    'method'     => $metodoUpper,
                    'bank_name'  => ($metodoUpper === 'EFECTIVO') ? null : $bancoRecibido,
                    'type'       => 'PAGO'
                ]);
            }
        }

        // 7. Actualizamos el registro de check-in a estado finalizado
        $checkin->update([
            'check_out_date' => $checkOutDate,
            'duration_days'  => $finalDays,
            'agreed_price'   => $agreedPrice,
            'status'         => 'finalizado'
        ]);

        return response()->json(['success' => true, 'message' => 'Estadía finalizada']);
    }

    // --- FUNCIÓN DE CANCELACIÓN (Solo primeros 10 minutos) ---
    public function cancelAssignment(Checkin $checkin)
    {
        // 1. Validar tiempo (10 minutos de tolerancia)
        $diffMinutes = $checkin->created_at->diffInMinutes(now());

        if ($diffMinutes > 35) {
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

    // --- GENERACIÓN DE PERSONA QUE ESTA ---
    public function generateAssignmentReceipt(Checkin $checkin)
    {
        // [MODIFICADO] Añadimos 'room.price' por precaución para los fallbacks
        $checkin->load(['guest', 'room.price']);

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
        $pdf->MultiCell(0, 4, utf8_decode($checkin->guest->full_name), 0, 'L');

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
        $pdf->Cell(15, 4, 'Otorgado:', 0, 0);
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
        // [CORRECCIÓN] Descomentado y arreglado. 'origin' pertenece a 'checkin', no a 'guest'.
        $pdf->Cell(0, 4, utf8_decode($checkin->origin ?? '-'), 0, 1);

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

        // =========================================================
        // [NUEVO] TARIFA ACORDADA 
        // Mostrar la tarifa calculada para mayor transparencia
        // =========================================================
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(28, 4, 'Tarifa por noche:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $tarifa = $checkin->agreed_price ?? ($checkin->room->price->amount ?? 0);
        $pdf->Cell(0, 4, number_format($tarifa, 2) . ' Bs.', 0, 1);

        // Total Cancelado (Adelanto)
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(28, 4, 'Total cancelado:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, number_format($checkin->advance_payment, 2) . ' Bs.', 0, 1);

        // Observaciones (Multilinea)
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(28, 4, 'Observaciones:', 0, 1);
        $pdf->SetFont('Arial', '', 7);
        if ($checkin->notes) {
            $pdf->MultiCell(0, 4, utf8_decode($checkin->notes), 0, 'L');
        } else {
            $pdf->Cell(0, 4, '-', 0, 1);
        }

        // Celular
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(15, 4, 'Celular:', 0, 0);
        $pdf->SetFont('Arial', '', 7);
        $telefono = $checkin->guest->phone ? $checkin->guest->phone : '___________________';
        $pdf->Cell(0, 4, utf8_decode($telefono), 0, 1);

        // --- FIRMA ---
        $pdf->Ln(10);

        $pageWidth = $pdf->GetPageWidth();
        $margins = 4;
        $lineLength = 50;

        $x = ($pageWidth - $lineLength) / 2;
        $y = $pdf->GetY();

        $pdf->Line($x, $y, $x + $lineLength, $y);
        $pdf->Ln(2);

        $pdf->SetFont('Arial', '', 7);
        $pdf->Cell(0, 4, utf8_decode('Firma del Huésped'), 0, 1, 'C');

        // 4. Salida
        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'inline; filename="ticket-' . $checkin->id . '.pdf"');
    }


    // --GENERACION DE BOLETA --
    public function generateCheckoutReceipt(Checkin $checkin)
    {
        $checkin->load(['guest', 'room.price', 'checkinDetails.service', 'schedule', 'companions', 'payments']);

        // RASTREO HISTÓRICO
        $originalCheckInDate = $checkin->check_in_date;
        $totalDiasHistorial = 0;

        $currentParentId = $checkin->parent_checkin_id;
        while ($currentParentId) {
            $parent = \App\Models\Checkin::find($currentParentId);
            if ($parent) {
                $originalCheckInDate = $parent->check_in_date;
                $totalDiasHistorial += max(1, intval($parent->duration_days));
                $currentParentId = $parent->parent_checkin_id;
            } else {
                break;
            }
        }

        $salida = $checkin->check_out_date ? \Carbon\Carbon::parse($checkin->check_out_date) : now();
        $diasACobrar = $this->calculateBillableDays($checkin, $salida);
        $diasExcedidos = $diasACobrar - max(1, intval($checkin->duration_days));
        if ($diasExcedidos < 0) $diasExcedidos = 0;

        $precioUnitario = $checkin->agreed_price ?? ($checkin->room->price->amount ?? 0);

        if (str_contains(strtoupper($checkin->notes ?? ''), 'CORPORATIVO')) {
            $bathroomType = strtolower($checkin->room->price->bathroom_type ?? '');
            $isPrivate = $bathroomType === 'private' || $bathroomType === 'privado';
            $ratePerPerson = $isPrivate ? 90 : 60;
            $paxCount = 1 + $checkin->companions->count();
            $precioUnitario = $ratePerPerson * $paxCount;
        }

        $totalHospedaje = $precioUnitario * $diasACobrar;
        $carriedBalance = floatval($checkin->carried_balance ?? 0); // Deuda arrastrada

        $totalServicios = 0;
        foreach ($checkin->checkinDetails as $detalle) {
            $precioReal = $detalle->selling_price ?? $detalle->service->price;
            $totalServicios += ($detalle->quantity * $precioReal);
        }

        // GRAN TOTAL INCLUYE LA DEUDA ANTERIOR
        $granTotal = $totalHospedaje + $totalServicios + $carriedBalance;

        // =========================================================
        // 🚀 NUEVA LÓGICA DE PAGOS: SEPARAR ADELANTOS DEL PAGO ACTUAL
        // =========================================================
        $totalPagadoReal = 0;
        $pagoFinalCaja = 0;
        $adelantosPrevios = 0;

        if ($checkin->payments->count() > 0) {
            // El último pago registrado es el que acaba de hacer en el checkout
            $ultimoPagoId = $checkin->payments->last()->id;

            foreach ($checkin->payments as $pago) {
                $monto = ($pago->type === 'DEVOLUCION') ? -$pago->amount : $pago->amount;
                $totalPagadoReal += $monto;

                if ($pago->id === $ultimoPagoId) {
                    $pagoFinalCaja += $monto;
                } else {
                    $adelantosPrevios += $monto;
                }
            }
        } else {
            $adelantosPrevios = $checkin->advance_payment ?? 0;
            $totalPagadoReal = $adelantosPrevios;
        }

        $saldoFinal = max(0, $granTotal - $totalPagadoReal);
        // =========================================================

        // GUARDAR RECIBO (BOLETA) EN LA BASE DE DATOS
        $lastInvoice = \App\Models\Invoice::orderBy('invoice_number', 'desc')->first();
        $nextInvoiceNumber = $lastInvoice ? $lastInvoice->invoice_number + 1 : 1;

        $lastPayment = $checkin->payments->last();
        $metodoFinal = $lastPayment ? substr($lastPayment->method, 0, 2) : 'EF';

        $nuevoRecibo = \App\Models\Invoice::create([
            'invoice_number' => $nextInvoiceNumber,
            'checkin_id'     => $checkin->id,
            'issue_date'     => now()->toDateString(),
            'control_code'   => 'RECIBO-INTERNO',
            'payment_method' => $metodoFinal,
            'user_id'        => \Illuminate\Support\Facades\Auth::id() ?? 1,
            'issue_time'     => now(),
            'status'         => 'valid',
        ]);

        // Detalle: Hospedaje (Actual + Histórico)
        \App\Models\InvoiceDetail::create([
            'invoice_id' => $nuevoRecibo->id,
            'service_id' => null,
            'description' => "Hospedaje Hab {$checkin->room->number}",
            'quantity'   => $diasACobrar + $totalDiasHistorial,
            'unit_price' => $granTotal / max(1, ($diasACobrar + $totalDiasHistorial)),
            'cost'       => $totalHospedaje + $carriedBalance,
        ]);

        // Detalle: Servicios individuales
        foreach ($checkin->checkinDetails as $detalle) {
            $precioReal = $detalle->selling_price ?? ($detalle->service->price ?? 0);
            \App\Models\InvoiceDetail::create([
                'invoice_id' => $nuevoRecibo->id,
                'service_id' => $detalle->service_id,
                'quantity'   => $detalle->quantity,
                'unit_price' => $precioReal,
                'cost'       => ($detalle->quantity * $precioReal),
            ]);
        }

        // =========================================================
        // PDF GENERATION
        // =========================================================
        $pdf = new \FPDF('P', 'mm', array(80, 240));
        $pdf->SetMargins(4, 4, 4);
        $pdf->SetAutoPageBreak(true, 2);
        $pdf->AddPage();

        $pdf->SetFont('Arial', 'B', 12);
        $pdf->Cell(0, 5, 'HOTEL SAN ANTONIO', 0, 1, 'C');
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(0, 4, utf8_decode('Calle Principal #123 - Potosi'), 0, 1, 'C');
        $pdf->Ln(2);

        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(0, 6, 'NOTA DE SALIDA', 0, 1, 'C');
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(0, 4, 'Nro: ' . str_pad($nuevoRecibo->invoice_number, 6, '0', STR_PAD_LEFT), 0, 1, 'C');
        $pdf->Ln(2);

        $pdf->Cell(0, 0, '------------------------------------------------------------------', 0, 1, 'C');
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
        $ingresoVisual = \Carbon\Carbon::parse($originalCheckInDate);
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(15, 4, 'Ingreso:', 0, 0);
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(22, 4, $ingresoVisual->format('d/m/y H:i'), 0, 0);
        $pdf->SetFont('Arial', 'B', 8);
        $pdf->Cell(12, 4, 'Salida:', 0, 0);
        $pdf->SetFont('Arial', '', 8);
        $pdf->Cell(0, 4, $salida->format('d/m/y H:i'), 0, 1);

        $pdf->Ln(2);
        $pdf->Cell(0, 0, '------------------------------------------------------------------', 0, 1, 'C');
        $pdf->Ln(2);

        // DETALLE ITEMS REORDENADO
        $pdf->SetFont('Arial', 'B', 7);
        $pdf->Cell(35, 4, 'DETALLE', 0, 0, 'L');
        $pdf->Cell(8, 4, 'CNT', 0, 0, 'C');
        $pdf->Cell(12, 4, 'P.UNI', 0, 0, 'R');
        $pdf->Cell(17, 4, 'TOTAL', 0, 1, 'R');
        $pdf->Ln(1);

        $pdf->SetFont('Arial', '', 7);

        $pdf->Cell(35, 4, utf8_decode("Hospedaje ($diasACobrar dias)"), 0, 0, 'L');
        $pdf->Cell(8, 4, $diasACobrar, 0, 0, 'C');
        $pdf->Cell(12, 4, number_format($precioUnitario, 2), 0, 0, 'R');
        $pdf->Cell(17, 4, number_format($totalHospedaje, 2), 0, 1, 'R');

        if ($carriedBalance > 0) {
            $pdf->Cell(35, 4, utf8_decode("Hospedaje Previo ($totalDiasHistorial d)"), 0, 0, 'L');
            $pdf->Cell(8, 4, $totalDiasHistorial, 0, 0, 'C');
            $pdf->Cell(12, 4, '-', 0, 0, 'R');
            $pdf->Cell(17, 4, number_format($carriedBalance, 2), 0, 1, 'R');
        }

        if ($diasExcedidos > 0) {
            $pdf->SetFont('Arial', 'I', 6);
            $pdf->Cell(0, 3, utf8_decode("(Inc. $diasExcedidos dias extra por horario)"), 0, 1, 'L');
        }

        $serviciosAgrupados = [];
        foreach ($checkin->checkinDetails as $detalle) {
            $nombre = $detalle->service->name ?? 'Servicio';
            $precio = $detalle->selling_price ?? $detalle->service->price ?? 0;
            if (!isset($serviciosAgrupados[$nombre])) {
                $serviciosAgrupados[$nombre] = ['cantidad' => 0, 'subtotal' => 0];
            }
            $serviciosAgrupados[$nombre]['cantidad'] += $detalle->quantity;
            $serviciosAgrupados[$nombre]['subtotal'] += ($detalle->quantity * $precio);
        }

        foreach ($serviciosAgrupados as $nombre => $item) {
            $pUnit = $item['cantidad'] > 0 ? $item['subtotal'] / $item['cantidad'] : 0;
            $pdf->Cell(35, 4, utf8_decode(substr($nombre, 0, 22)), 0, 0, 'L');
            $pdf->Cell(8, 4, $item['cantidad'], 0, 0, 'C');
            $pdf->Cell(12, 4, number_format($pUnit, 2), 0, 0, 'R');
            $pdf->Cell(17, 4, number_format($item['subtotal'], 2), 0, 1, 'R');
        }

        $pdf->Ln(2);
        $pdf->Cell(0, 0, '------------------------------------------------------------------', 0, 1, 'C');
        $pdf->Ln(2);

        // =========================================================
        // 🚀 IMPRESIÓN DEL DESGLOSE CORRECTO EN EL RECIBO
        // =========================================================
        $saldoCobrar = $granTotal - $adelantosPrevios;

        $pdf->SetFont('Arial', 'B', 9);
        $pdf->Cell(50, 5, 'TOTAL GENERAL:', 0, 0, 'R');
        $pdf->Cell(22, 5, number_format($granTotal, 2), 0, 1, 'R');

        $pdf->SetFont('Arial', '', 8);
        if ($adelantosPrevios > 0) {
            $pdf->Cell(50, 4, '(-) Pagos Anticipados:', 0, 0, 'R');
            $pdf->Cell(22, 4, number_format($adelantosPrevios, 2), 0, 1, 'R');
        }

        $pdf->Ln(1);
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->Cell(50, 5, 'TOTAL A PAGAR:', 0, 0, 'R');
        $pdf->Cell(22, 5, number_format($saldoCobrar, 2) . ' Bs', 0, 1, 'R');

        // PIE
        $pdf->Ln(6);
        $pdf->SetFont('Arial', 'I', 7);
        $pdf->MultiCell(0, 3, utf8_decode("Gracias por su preferencia.\nRevise su cambio antes de retirarse."), 0, 'C');

        $pdf->Ln(3);
        $usuario = \Illuminate\Support\Facades\Auth::user() ? \Illuminate\Support\Facades\Auth::user()->name : 'Cajero';
        $pdf->Cell(0, 3, 'Atendido por: ' . utf8_decode($usuario), 0, 1, 'C');

        return response($pdf->Output('S'), 200)
            ->header('Content-Type', 'application/pdf');
    }


    // --GENERACION DE FACTURA --
    public function generateCheckoutInvoice(Checkin $checkin)
    {
        try {
            $checkin->load(['guest', 'room.price', 'checkinDetails.service', 'schedule', 'companions', 'payments']);

            // RASTREO DEL HISTORIAL
            $originalCheckInDate = $checkin->check_in_date;
            $totalDiasHistorial = 0;

            $currentParentId = $checkin->parent_checkin_id;
            while ($currentParentId) {
                $parent = \App\Models\Checkin::find($currentParentId);
                if ($parent) {
                    $originalCheckInDate = $parent->check_in_date;
                    $totalDiasHistorial += max(1, intval($parent->duration_days));
                    $currentParentId = $parent->parent_checkin_id;
                } else {
                    break;
                }
            }

            $salida = $checkin->check_out_date ? \Carbon\Carbon::parse($checkin->check_out_date) : now();
            $diasReales = $this->calculateBillableDays($checkin, $salida);

            $precioUnitario = $checkin->agreed_price ?? ($checkin->room->price->amount ?? 0);

            if (str_contains(strtoupper($checkin->notes ?? ''), 'CORPORATIVO')) {
                $bathroomType = strtolower($checkin->room->price->bathroom_type ?? '');
                $isPrivate = $bathroomType === 'private' || $bathroomType === 'privado';
                $ratePerPerson = $isPrivate ? 90 : 60;
                $paxCount = 1 + $checkin->companions->count();
                $precioUnitario = $ratePerPerson * $paxCount;
            }

            $totalHospedaje = $precioUnitario * $diasReales;
            $carriedBalance = floatval($checkin->carried_balance ?? 0);

            $totalServicios = 0;
            foreach ($checkin->checkinDetails as $detalle) {
                $precio = $detalle->selling_price ?? ($detalle->service->price ?? 0);
                $totalServicios += ($detalle->quantity * $precio);
            }

            $granTotal = $totalHospedaje + $totalServicios + $carriedBalance;

            // =========================================================
            // 🚀 NUEVA LÓGICA DE PAGOS: SEPARAR ADELANTOS DEL PAGO ACTUAL
            // =========================================================
            $totalPagadoReal = 0;
            $pagoFinalCaja = 0;
            $adelantosPrevios = 0;

            if ($checkin->payments->count() > 0) {
                $ultimoPagoId = $checkin->payments->last()->id;

                foreach ($checkin->payments as $pago) {
                    $monto = ($pago->type === 'DEVOLUCION') ? -$pago->amount : $pago->amount;
                    $totalPagadoReal += $monto;

                    if ($pago->id === $ultimoPagoId) {
                        $pagoFinalCaja += $monto;
                    } else {
                        $adelantosPrevios += $monto;
                    }
                }
            } else {
                $adelantosPrevios = $checkin->advance_payment ?? 0;
                $totalPagadoReal = $adelantosPrevios;
            }

            $saldoFinal = max(0, $granTotal - $totalPagadoReal);
            // =========================================================

            // GUARDAR FACTURA EN LA BASE DE DATOS
            $lastInvoice = \App\Models\Invoice::orderBy('invoice_number', 'desc')->first();
            $nextInvoiceNumber = $lastInvoice ? $lastInvoice->invoice_number + 1 : 1;

            $lastPayment = $checkin->payments->last();
            $metodoFinal = $lastPayment ? substr($lastPayment->method, 0, 2) : 'EF';

            $nuevaFactura = \App\Models\Invoice::create([
                'invoice_number' => $nextInvoiceNumber,
                'checkin_id'     => $checkin->id,
                'issue_date'     => now()->toDateString(),
                'control_code'   => '8A-F1-2C-99',
                'payment_method' => $metodoFinal,
                'user_id'        => \Illuminate\Support\Facades\Auth::id() ?? 1,
                'issue_time'     => now(),
                'status'         => 'valid',
            ]);

            // Detalle: Hospedaje
            \App\Models\InvoiceDetail::create([
                'invoice_id'  => $nuevaFactura->id,
                'service_id'  => null,
                'description' => "Hospedaje Hab {$checkin->room->number}",
                'quantity'    => $diasReales,
                'unit_price'  => $precioUnitario,
                'cost'        => $totalHospedaje,
            ]);

            if ($carriedBalance > 0) {
                \App\Models\InvoiceDetail::create([
                    'invoice_id'  => $nuevaFactura->id,
                    'service_id'  => null,
                    'description' => "Hospedaje Previo",
                    'quantity'    => $totalDiasHistorial,
                    'unit_price'  => $carriedBalance > 0 && $totalDiasHistorial > 0 ? $carriedBalance / $totalDiasHistorial : $carriedBalance,
                    'cost'        => $carriedBalance,
                ]);
            }

            // Detalle: Servicios
            foreach ($checkin->checkinDetails as $detalle) {
                $precioReal = $detalle->selling_price ?? ($detalle->service->price ?? 0);
                \App\Models\InvoiceDetail::create([
                    'invoice_id'  => $nuevaFactura->id,
                    'service_id'  => $detalle->service_id,
                    'description' => strtoupper($detalle->service->name ?? 'SERVICIO EXTRA'),
                    'quantity'    => $detalle->quantity,
                    'unit_price'  => $precioReal,
                    'cost'        => ($detalle->quantity * $precioReal),
                ]);
            }

            // --- PDF GENERATION ---
            $pdf = new \FPDF('P', 'mm', array(80, 260));
            $pdf->SetMargins(4, 4, 4);
            $pdf->SetAutoPageBreak(true, 2);
            $pdf->AddPage();

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

            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(30, 3, 'NIT:', 0, 0, 'R');
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(35, 3, '3327479013', 0, 1, 'L');
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(30, 3, utf8_decode('FACTURA N°:'), 0, 0, 'R');
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(35, 3, str_pad($nuevaFactura->invoice_number, 5, '0', STR_PAD_LEFT), 0, 1, 'L');
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(30, 3, utf8_decode('CÓD. AUTORIZACIÓN:'), 0, 0, 'R');
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(35, 3, '456123ABC', 0, 1, 'L');
            $pdf->Ln(2);
            $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
            $pdf->Ln(1);

            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(20, 4, 'Fecha Emision:', 0, 0);
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(0, 4, now()->format('d/m/Y H:i:s'), 0, 1);
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(25, 4, 'Nom/Razon:', 0, 0);
            $pdf->SetFont('Arial', '', 7);
            $pdf->MultiCell(0, 4, utf8_decode($checkin->guest->full_name), 0, 'L');
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(20, 4, 'NIT/CI:', 0, 0);
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(0, 4, $checkin->guest->identification_number ?? '0', 0, 1);

            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(20, 4, 'Ingreso:', 0, 0);
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(0, 4, \Carbon\Carbon::parse($originalCheckInDate)->format('d/m/Y H:i'), 0, 1);

            $pdf->Ln(1);
            $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
            $pdf->Ln(2);

            $pdf->SetFont('Arial', 'B', 6);
            $pdf->Cell(35, 3, 'DETALLE', 0, 0, 'L');
            $pdf->Cell(8, 3, 'CNT', 0, 0, 'C');
            $pdf->Cell(12, 3, 'P.UNIT', 0, 0, 'R');
            $pdf->Cell(17, 3, 'SUBTOT', 0, 1, 'R');
            $pdf->Ln(3);

            $pdf->SetFont('Arial', '', 6);

            $pdf->Cell(35, 3, utf8_decode("Hospedaje Hab {$checkin->room->number} ($diasReales d)"), 0, 0, 'L');
            $pdf->Cell(8, 3, $diasReales, 0, 0, 'C');
            $pdf->Cell(12, 3, number_format($precioUnitario, 2), 0, 0, 'R');
            $pdf->Cell(17, 3, number_format($totalHospedaje, 2), 0, 1, 'R');

            if ($carriedBalance > 0) {
                $pdf->Cell(35, 3, utf8_decode("Hospedaje Previo ($totalDiasHistorial d)"), 0, 0, 'L');
                $pdf->Cell(8, 3, $totalDiasHistorial, 0, 0, 'C');
                $pdf->Cell(12, 3, '-', 0, 0, 'R');
                $pdf->Cell(17, 3, number_format($carriedBalance, 2), 0, 1, 'R');
            }

            $serviciosAgrupados = [];
            if ($checkin->checkinDetails) {
                foreach ($checkin->checkinDetails as $detalle) {
                    $nombre = $detalle->service->name ?? 'Servicio';
                    $precio = $detalle->selling_price ?? ($detalle->service->price ?? 0);
                    if (!isset($serviciosAgrupados[$nombre])) $serviciosAgrupados[$nombre] = ['qty' => 0, 'total' => 0];
                    $serviciosAgrupados[$nombre]['qty'] += $detalle->quantity;
                    $serviciosAgrupados[$nombre]['total'] += ($detalle->quantity * $precio);
                }
            }
            foreach ($serviciosAgrupados as $name => $data) {
                $pUnit = $data['qty'] > 0 ? $data['total'] / $data['qty'] : 0;
                $pdf->Cell(35, 3, utf8_decode(substr($name, 0, 22)), 0, 0, 'L');
                $pdf->Cell(8, 3, $data['qty'], 0, 0, 'C');
                $pdf->Cell(12, 3, number_format($pUnit, 2), 0, 0, 'R');
                $pdf->Cell(17, 3, number_format($data['total'], 2), 0, 1, 'R');
            }

            $pdf->Ln(2);
            $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
            $pdf->Ln(2);

            // =========================================================
            // 🚀 IMPRESIÓN DEL DESGLOSE CORRECTO EN LA FACTURA
            // =========================================================
            $saldoCobrar = $granTotal - $adelantosPrevios;

            $pdf->SetFont('Arial', 'B', 8);
            $pdf->Cell(50, 4, 'TOTAL GENERAL Bs:', 0, 0, 'R');
            $pdf->Cell(22, 4, number_format($granTotal, 2), 0, 1, 'R');

            $pdf->SetFont('Arial', '', 7);
            if ($adelantosPrevios > 0) {
                $pdf->Cell(50, 4, '(-) Pagos Anticipados:', 0, 0, 'R');
                $pdf->Cell(22, 4, number_format($adelantosPrevios, 2), 0, 1, 'R');
            }

            $pdf->Ln(1);
            $pdf->SetFont('Arial', 'B', 9);
            $pdf->Cell(50, 5, 'TOTAL A PAGAR Bs:', 0, 0, 'R');
            $pdf->Cell(22, 5, number_format($saldoCobrar, 2), 0, 1, 'R');

            $pdf->Ln(2);
            $pdf->SetFont('Arial', '', 7);
            // IMPORTANTE: Se cambia a $saldoCobrar para que el literal coincida con lo que paga el cliente hoy, 
            // o a $granTotal si quieres que el literal sea por el valor total de la factura. 
            // Legalmente (en Bolivia) el texto literal suele ser sobre el TOTAL GENERAL de la factura.
            $montoLetras = $this->convertirNumeroALetras($granTotal);
            $pdf->MultiCell(0, 4, 'Son: ' . utf8_decode($montoLetras), 0, 'L');

            $pdf->Ln(2);
            $pdf->SetFont('Arial', 'B', 6);
            $pdf->Cell(35, 3, utf8_decode('IMPORTE BASE CRÉDITO FISCAL:'), 0, 0, 'L');
            $pdf->Cell(0, 3, number_format($granTotal, 2), 0, 1, 'R');

            $pdf->Ln(2);
            $pdf->Cell(0, 3, utf8_decode('CÓDIGO DE CONTROL: 8A-F1-2C-99'), 0, 1, 'C');
            $pdf->Ln(2);

            $logoPath = public_path('images/qrCop.png');
            if (file_exists($logoPath)) {
                $x = (80 - 22) / 2;
                $pdf->Image($logoPath, $x, $pdf->GetY(), 22, 22);
                $pdf->Ln(24);
            } else {
                $pdf->Ln(24);
            }

            $pdf->SetFont('Arial', 'B', 5);
            $pdf->MultiCell(0, 2.5, utf8_decode('"ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY"'), 0, 'C');
            $pdf->Ln(1);
            $pdf->SetFont('Arial', '', 5);
            $pdf->MultiCell(0, 2.5, utf8_decode('Ley N° 453: Tienes derecho a recibir información correcta, veraz, oportuna y completa sobre las características y contenidos de los productos que compras.'), 0, 'C');

            return response($pdf->Output('S'), 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="factura-' . $checkin->id . '.pdf"');
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
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
        // ... (validaciones iniciales) ...

        // 1. Cargamos la relación payments
        $checkin = \App\Models\Checkin::with(['checkinDetails.service', 'room', 'guest', 'payments'])
            ->where('guest_id', $request->guest_id)
            ->where('status', 'activo')
            ->first();

        if (!$checkin) {
            return response()->json(['status' => 'error', 'message' => 'No encontrado'], 404);
        }

        // Procesar Servicios
        $detailAdd = $checkin->checkinDetails->map(function ($detail) {
            return [
                'id' => $detail->id,
                'service' => $detail->service->name ?? 'Servicio Eliminado',
                'count' => (int) $detail->quantity,
                'unit_price' => (float) $detail->selling_price,
                'subtotal' => (float) ($detail->quantity * $detail->selling_price),
            ];
        });

        $totalServicios = $detailAdd->sum('subtotal');

        // 2. Calcular Pagos
        $totalPagado = $checkin->payments->reduce(function ($carry, $payment) {
            // Si es devolución resta, si es pago suma
            return $payment->type === 'DEVOLUCION' ? ($carry - $payment->amount) : ($carry + $payment->amount);
        }, 0);


        // =================================================================
        // 🛑 ZONA DE DEBUG (ESTO SALDRÁ EN TU TERMINAL)
        // =================================================================
        error_log("---------------- DEBUG GENERATE VIEW DETAIL ----------------");
        error_log("ID Checkin: " . $checkin->id);
        error_log("Huésped: " . $checkin->guest->full_name);
        error_log("Pagos encontrados (Count): " . $checkin->payments->count());

        foreach ($checkin->payments as $p) {
            error_log(" > Pago ID: {$p->id} | Tipo: {$p->type} | Monto: {$p->amount}");
        }

        error_log("TOTAL PAGADO FINAL: " . $totalPagado);
        error_log("------------------------------------------------------------");
        // =================================================================


        return response()->json([
            'status' => 'success',
            'data' => [
                'checkin_id' => $checkin->id,
                'servicios' => $detailAdd,
                'total_adicional' => $totalServicios,
                'pagos' => $checkin->payments,
                'total_pagado' => $totalPagado
            ]
        ]);
    }

    // --- LÓGICA INTELIGENTE DE COBRO (CORREGIDA) ---
    private function calculateBillableDays(Checkin $checkin, Carbon $fechaSalidaReal, $waivePenalty = false)
    {
        // 1. Si ya está finalizado en BD, respetamos lo histórico
        if ($checkin->status === 'finalizado') {
            return max(1, intval($checkin->duration_days));
        }

        $ingreso = Carbon::parse($checkin->check_in_date);

        // AJUSTE DE ENTRADA (Mantenemos tolerancia automática al entrar)
        if ($checkin->schedule) {
            $horaOficialEntrada = Carbon::parse($ingreso->format('Y-m-d') . ' ' . $checkin->schedule->check_in_time);
            $inicioTolerancia = $horaOficialEntrada->copy()->subMinutes($checkin->schedule->entry_tolerance_minutes);

            if ($ingreso->between($inicioTolerancia, $horaOficialEntrada)) {
                $ingreso = $horaOficialEntrada;
            }
        }

        // =========================================================
        // 🚀 CASO A: SI SE PRESIONÓ EL BOTÓN DE TOLERANCIA
        // =========================================================
        if ($waivePenalty) {
            $diasCalendario = $ingreso->copy()->startOfDay()->diffInDays($fechaSalidaReal->copy()->startOfDay());
            // Retorna los días limpios, perdonando la noche extra
            return $diasCalendario == 0 ? 1 : $diasCalendario;
        }

        // --- LÓGICA DE DÍAS CALENDARIO BASE ---
        $diasBase = $ingreso->copy()->startOfDay()->diffInDays($fechaSalidaReal->copy()->startOfDay());

        if ($diasBase == 0) {
            return 1;
        }

        if (!$checkin->schedule) {
            return max(intval($checkin->duration_days), ceil($ingreso->floatDiffInDays($fechaSalidaReal)));
        }

        // =========================================================
        // 🛑 CASO B: LÓGICA ESTRICTA (DÍAS POSTERIORES)
        // =========================================================
        $horario = $checkin->schedule;

        // HORA OFICIAL EXACTA (Ya NO le sumamos la tolerancia aquí)
        $limiteSalidaHoy = Carbon::parse($fechaSalidaReal->format('Y-m-d') . ' ' . $horario->check_out_time);

        // ¿Pasó del minuto exacto de salida oficial?
        if ($fechaSalidaReal->greaterThan($limiteSalidaHoy)) {
            // SE PASÓ: Cobra el día extra de forma automática y estricta
            return $diasBase + 1;
        } else {
            // SALIÓ A TIEMPO
            return $diasBase;
        }
    }

    // ===================================================================
    // FUNCIÓN: FUSIÓN DE HABITACIONES (UNIR A GRUPO)
    // ===================================================================
    public function merge(Request $request, Checkin $checkin)
    {
        $request->validate([
            'target_room_id' => 'required|exists:rooms,id',
            'selected_guests' => 'required|array|min:1',
            'selected_guests.*' => 'integer',
            'reason' => 'required|string|max:255', // 🚀 MÓDULO 3: El motivo es obligatorio para la auditoría
        ]);

        return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $checkin) {
            $targetCheckin = \App\Models\Checkin::with('companions')
                ->where('room_id', $request->target_room_id)
                ->where('status', 'activo')
                ->first();

            if (!$targetCheckin) {
                return back()->withErrors(['target_room_id' => 'La habitación destino no tiene una asignación activa.']);
            }

            // Unimos al titular y los acompañantes de la habitación vieja en una sola lista
            $allGuestIds = array_merge([$checkin->guest_id], $checkin->companions->pluck('id')->toArray());
            $selectedGuests = $request->selected_guests;

            // Verificamos si se están llevando a TODOS o solo a algunos
            $isFullTransfer = count($selectedGuests) === count($allGuestIds);

            // Guardamos el room viejo para la auditoría
            $oldRoomId = $checkin->room_id;
            $ahora = now();
            $userId = \Illuminate\Support\Facades\Auth::id() ?? 1;

            // =======================================================
            // 🛑 FASE 1: DESVINCULAR Y MOVER DEUDAS PRIMERO
            // =======================================================
            if ($isFullTransfer) {
                // FUSIÓN COMPLETA: Cierra la vieja y traslada toda la cuenta
                $diasACobrar = $this->calculateBillableDays($checkin, $ahora, true);
                $precioVieja = $checkin->agreed_price ?? $checkin->room->price->amount ?? 0;
                $deudaAnterior = $diasACobrar * $precioVieja;

                $checkin->update([
                    'status' => 'transferido', // 'transferido' evita descuadrar reportes
                    'check_out_date' => $ahora,
                    'duration_days' => $diasACobrar,
                    'notes' => $checkin->notes . " | FUSIONADO (Todos pasaron a Hab. " . $targetCheckin->room->number . ")"
                ]);

                // LIBERAMOS A LOS ACOMPAÑANTES para no chocar con la base de datos
                $checkin->companions()->detach();
                \App\Models\Room::where('id', $oldRoomId)->update(['status' => 'LIMPIEZA']);

                // TRASLADAMOS LA DEUDA Y LOS CONSUMOS AL TITULAR DE LA NUEVA HABITACIÓN
                $targetCheckin->increment('carried_balance', $deudaAnterior);
                \Illuminate\Support\Facades\DB::table('checkin_details')->where('checkin_id', $checkin->id)->update(['checkin_id' => $targetCheckin->id]);
                \Illuminate\Support\Facades\DB::table('payments')->where('checkin_id', $checkin->id)->update(['checkin_id' => $targetCheckin->id]);
            } else {
                // FUSIÓN PARCIAL: Se divide la cuenta, los que se quedan asumen la deuda original
                $stayingIds = array_values(array_diff($allGuestIds, $selectedGuests));

                $checkin->update([
                    'guest_id' => $stayingIds[0], // Nombra a un nuevo titular para los que se quedan
                    'agreed_price' => $this->calculateAgreedPrice($checkin->room_id, count($stayingIds)),
                    'notes' => $checkin->notes . " | FUSIÓN PARCIAL (Algunos pasaron a Hab. " . $targetCheckin->room->number . ")"
                ]);
                // Desvinculamos a los que se fueron de la vieja habitación
                $checkin->companions()->sync(array_slice($stayingIds, 1));
            }

            // =======================================================
            // 🛑 FASE 2: AGREGAR A LOS HUÉSPEDES AL NUEVO CUARTO
            // =======================================================
            $targetCompanionIds = $targetCheckin->companions->pluck('id')->toArray();

            foreach ($selectedGuests as $guestId) {
                // Evitar duplicados si por algún error ya estaban
                if (!in_array($guestId, $targetCompanionIds) && $guestId !== $targetCheckin->guest_id) {
                    $targetCompanionIds[] = $guestId;
                }
            }

            // Sincronizamos la nueva familia gigante en la habitación destino
            $targetCheckin->companions()->sync($targetCompanionIds);

            // 🚀 MÓDULO 3: REGISTRO HISTÓRICO (La auditoría exige saber de dónde salieron)
            \App\Models\RoomTransfer::create([
                'checkin_id' => $targetCheckin->id,
                'from_room_id' => $oldRoomId,
                'to_room_id' => $targetCheckin->room_id,
                'user_id' => $userId,
                'transfer_date' => $ahora,
                'reason' => 'FUSIÓN DE CUENTAS - ' . strtoupper(trim($request->reason)),
            ]);

            // =================================================================
            // 🚀 REPARACIÓN DEL CRASH: Recalcular la capacidad y apagar la alarma is_temporary
            // =================================================================
            $targetRoomModel = \App\Models\Room::with('roomType')->find($targetCheckin->room_id);
            $maxCapacity = $targetRoomModel->roomType->capacity ?? 1;
            $totalGuestsNow = 1 + count($targetCompanionIds); // 1 Titular + acompañantes

            $hasOrigin = !empty($targetCheckin->origin);
            $isCapacityFull = $totalGuestsNow >= $maxCapacity;

            // Evaluamos: Si ya se llenó y tiene origen, apagamos el "is_temporary"
            $isTemporaryNewState = !($isCapacityFull && $hasOrigin);

            // Recalculamos la tarifa y aplicamos el nuevo estado is_temporary
            $targetCheckin->update([
                'agreed_price' => $this->calculateAgreedPrice($targetCheckin->room_id, $totalGuestsNow),
                'notes' => ltrim($targetCheckin->notes . " | Recibió huéspedes de Hab. " . \App\Models\Room::find($oldRoomId)->number, " | "),
                'is_temporary' => $isTemporaryNewState // 👈 ¡ESTO ES LO QUE ARREGLA EL ERROR!
            ]);

            return redirect()->back()->with('success', $isFullTransfer ? 'Fusión exitosa. Los huéspedes y sus deudas se unieron a la nueva habitación, la original pasó a LIMPIEZA.' : 'Fusión parcial exitosa.');
        });
    }
    /*Fucion a futuro* */
    // Ejemplo lógico (no copres esto todavía, es para que entiendas el flujo)

    // --- CONVERSIÓN DE RESERVA A CHECK-IN ---
    public function storeFromReservation(Request $request)
    {
        $request->validate([
            'reservation_id' => 'required|exists:reservations,id'
        ]);

        return \Illuminate\Support\Facades\DB::transaction(function () use ($request) {
            // Traemos la reserva con todas sus habitaciones y el huésped
            $reservation = \App\Models\Reservation::with(['details.room', 'guest'])->findOrFail($request->reservation_id);

            $primerCheckinId = null;

            // 🚀 VERIFICAMOS SI LA RESERVA ERA CORPORATIVA
            $isCorporate = ($reservation->guest_count ?? 0) >= 30;

            // Recorremos CADA HABITACIÓN reservada
            foreach ($reservation->details as $index => $detail) {

                $arrivalDate = $reservation->arrival_date ?? now();

                // 🚀 PREPARAMOS LAS NOTAS (Agregando la etiqueta corporativa si corresponde)
                $baseNotes = 'Generado desde Reserva #' . $reservation->id;
                if ($isCorporate) {
                    $baseNotes .= ' [CORPORATIVO]';
                }

                $checkin = \App\Models\Checkin::create([
                    'guest_id' => $reservation->guest_id,
                    'room_id'  => $detail->room_id,
                    'user_id'  => \Illuminate\Support\Facades\Auth::id() ?? 1,
                    'check_in_date' => now(),
                    'actual_arrival_date' => now(),
                    'duration_days' => $reservation->duration_days ?? 1,
                    'advance_payment' => 0,
                    'origin' => null, // 🚨 ESTO ES CLAVE: El sistema detectará que "Faltan Datos"
                    'status' => 'activo',
                    'is_temporary' => false,
                    'notes' => strtoupper($baseNotes), // 🚀 Guardamos con la etiqueta
                    'schedule_id' => $reservation->schedule_id, // Sin el error de clone
                ]);

                if ($index === 0) {
                    $primerCheckinId = $checkin->id;
                }

                // Pasamos la habitación a OCUPADO en la BD (Se verá Ámbar en el frontend)
                \App\Models\Room::where('id', $detail->room_id)->update(['status' => 'OCUPADO']);
            }

            // Trasladamos el pago (Adelanto)
            if ($primerCheckinId && $reservation->advance_payment > 0) {
                $pagos = \App\Models\Payment::where('reservation_id', $reservation->id)->get();
                foreach ($pagos as $pago) {
                    $pago->update([
                        'checkin_id' => $primerCheckinId,
                        'reservation_id' => null
                    ]);
                }

                // Actualizamos el total acumulado
                $totalPagos = $pagos->sum('amount') > 0 ? $pagos->sum('amount') : $reservation->advance_payment;
                \App\Models\Checkin::where('id', $primerCheckinId)->update(['advance_payment' => $totalPagos]);
            }

            // Marcamos la reserva original como completada
            $reservation->update(['status' => 'completada']);

            return redirect()->back()->with('success', 'Reserva confirmada. Por favor, ingrese a la habitación para completar los datos faltantes del Check-in.');
        });
    }

    // =========================================================================
    // 🚀 CHECKOUT MÚLTIPLE (FINALIZACIÓN GRUPAL)
    // =========================================================================
    public function multiCheckout(Request $request)
    {
        $request->validate([
            'checkin_ids' => 'required|array',
            'checkin_ids.*' => 'exists:checkins,id',
            'tipo_documento' => 'required|in:factura,recibo',
            'nombre_factura' => 'nullable|string',
            'nit_factura' => 'nullable|string',
            'metodo_pago' => 'required|string',
        ]);

        return DB::transaction(function () use ($request) {
            // 1. Traemos todos los checkins solicitados con sus relaciones necesarias
            $checkins = Checkin::with(['guest', 'room.price', 'room.roomType', 'checkinDetails.service', 'schedule', 'companions', 'payments'])
                ->whereIn('id', $request->checkin_ids)
                ->get();

            $salida = now();
            $totalAdelantosGlobal = 0;

            // Variables para estructurar la tabla del PDF
            $hospedajesPDF = [];
            $serviciosGlobales = [];

            // =========================================================
            // PASO 3: Lógica de Habitaciones y Cálculos
            // =========================================================
            foreach ($checkins as $checkin) {
                // Poner la habitación en limpieza
                $room = Room::find($checkin->room_id);
                if ($room) {
                    $room->update(['status' => 'LIMPIEZA']);
                }

                // Calcular días a cobrar
                $diasACobrar = $this->calculateBillableDays($checkin, $salida);

                // Calcular precio unitario (con soporte para tarifas corporativas)
                $precioUnitario = $checkin->agreed_price ?? ($checkin->room->price->amount ?? 0);
                if (str_contains(strtoupper($checkin->notes ?? ''), 'CORPORATIVO')) {
                    $bathroomType = strtolower($checkin->room->bathroom_type ?? '');
                    $isPrivate = $bathroomType === 'private' || $bathroomType === 'privado';
                    $ratePerPerson = $isPrivate ? 90 : 60;
                    $paxCount = 1 + $checkin->companions->count();
                    $precioUnitario = $ratePerPerson * $paxCount;
                }

                $totalHospedaje = $precioUnitario * $diasACobrar;

                // Formatear descripción unificada para el PDF ("Hab 1 Simple Priv")
                $bType = strtolower($checkin->room->bathroom_type ?? '');
                $bano = ($bType === 'shared' || $bType === 'compartido') ? 'Comp' : 'Priv';
                $tipoH = substr($checkin->room->roomType->name ?? 'Hab', 0, 10);
                $descHospedaje = "Hab {$checkin->room->number} {$tipoH} {$bano}";

                $hospedajesPDF[] = [
                    'desc' => $descHospedaje,
                    'cant' => $diasACobrar,
                    'punit' => $precioUnitario,
                    'subtot' => $totalHospedaje
                ];

                // Si esa habitación fue transferida, añadimos la deuda que traía arrastrando
                $carriedBalance = floatval($checkin->carried_balance ?? 0);
                if ($carriedBalance > 0) {
                    $hospedajesPDF[] = [
                        'desc' => "Deuda Transf. a Hab {$checkin->room->number}",
                        'cant' => 1,
                        'punit' => $carriedBalance,
                        'subtot' => $carriedBalance
                    ];
                }
                // Agrupar Consumos globalmente de todas las habitaciones
                foreach ($checkin->checkinDetails as $detalle) {
                    $precioReal = $detalle->selling_price ?? ($detalle->service->price ?? 0);
                    $subt = $detalle->quantity * $precioReal;

                    $nombreSrv = $detalle->service->name ?? 'Servicio';
                    if (!isset($serviciosGlobales[$nombreSrv])) {
                        $serviciosGlobales[$nombreSrv] = ['qty' => 0, 'total' => 0];
                    }
                    $serviciosGlobales[$nombreSrv]['qty'] += $detalle->quantity;
                    $serviciosGlobales[$nombreSrv]['total'] += $subt;
                }

                // Sumar pagos previos (Adelantos del historial)
                $totalPagadoReal = 0;
                if ($checkin->payments->count() > 0) {
                    foreach ($checkin->payments as $pago) {
                        if ($pago->type === 'DEVOLUCION') {
                            $totalPagadoReal -= $pago->amount;
                        } else {
                            $totalPagadoReal += $pago->amount;
                        }
                    }
                } else {
                    $totalPagadoReal = $checkin->advance_payment ?? 0;
                }
                $totalAdelantosGlobal += $totalPagadoReal;

                // Marcar el Checkin como finalizado
                $checkin->update([
                    'check_out_date' => $salida,
                    'duration_days' => $diasACobrar,
                    'status' => 'finalizado'
                ]);
            }

            // Recalcular Gran Total y Saldo a Pagar
            $granTotal = collect($hospedajesPDF)->sum('subtot') + collect($serviciosGlobales)->sum('total');
            $saldoPagar = max(0, $granTotal - $totalAdelantosGlobal);

            // =========================================================
            // PASO 4: Lógica de Pagos y Caja (Evitando el error 500)
            // =========================================================
            $userId = Auth::id() ?? 1;
            $primerCheckinId = $checkins->first()->id;

            // Filtro para que el ENUM de BD acepte el banco
            $metodoRecibido = strtoupper($request->metodo_pago);
            $bancoRecibido = strtoupper($request->banco_qr ?? '');

            if (in_array($metodoRecibido, ['YAPE', 'BNB', 'FIE', 'ECO'])) {
                $bancoRecibido = $metodoRecibido;
                $metodoRecibido = 'QR';
            }

            if ($request->metodo_pago === 'ambos') {
                if ($request->monto_efectivo > 0) {
                    Payment::create([
                        'checkin_id' => $primerCheckinId,
                        'user_id' => $userId,
                        'amount' => $request->monto_efectivo,
                        'method' => 'EFECTIVO',
                        'description' => 'PAGO FINAL MÚLTIPLE (MIXTO)',
                        'type' => 'PAGO'
                    ]);
                }
                if ($request->monto_qr > 0) {
                    Payment::create([
                        'checkin_id' => $primerCheckinId,
                        'user_id' => $userId,
                        'amount' => $request->monto_qr,
                        'method' => 'QR',
                        'bank_name' => $bancoRecibido,
                        'description' => 'PAGO FINAL MÚLTIPLE (MIXTO)',
                        'type' => 'PAGO'
                    ]);
                }
            } else {
                if ($saldoPagar > 0) {
                    Payment::create([
                        'checkin_id' => $primerCheckinId,
                        'user_id' => $userId,
                        'amount' => $saldoPagar,
                        'method' => $metodoRecibido,
                        'bank_name' => $metodoRecibido === 'QR' ? $bancoRecibido : null,
                        'description' => 'PAGO FINAL MÚLTIPLE',
                        'type' => 'PAGO'
                    ]);
                }
            }

            // =========================================================
            // 🚀 NUEVO PASO: GUARDAR FACTURA/RECIBO EN LA BASE DE DATOS
            // =========================================================
            $lastInvoice = Invoice::orderBy('invoice_number', 'desc')->first();
            $nextInvoiceNumber = $lastInvoice ? $lastInvoice->invoice_number + 1 : 1;

            $nuevaFactura = Invoice::create([
                'invoice_number' => $nextInvoiceNumber,
                'checkin_id'     => $primerCheckinId,
                'issue_date'     => now()->toDateString(),
                'control_code'   => '8A-F1-2C-99', // Puedes cambiar esto por tu lógica real
                'payment_method' => substr($metodoRecibido, 0, 2), // EF, QR, TA, TR
                'user_id'        => $userId,
                'issue_time'     => now(),
                'status'         => 'valid',
            ]);

            // Guardar los detalles (Hospedajes)
            // OJO: Como InvoiceDetail no tiene campo 'description' en la migración actual,
            // estamos dejando service_id como nulo. Si necesitas description a futuro, deberás añadirlo a la BD.
            foreach ($hospedajesPDF as $hosp) {
                InvoiceDetail::create([
                    'invoice_id' => $nuevaFactura->id,
                    'service_id' => null, // null = Hospedaje
                    'description' => $hosp['desc'],
                    'quantity'   => $hosp['cant'],
                    'unit_price' => $hosp['punit'],
                    'cost'       => $hosp['subtot'], // Se usa 'cost' en lugar de 'subtotal'
                ]);
            }

            // Guardar los detalles (Servicios)
            // Nota: Aquí estamos guardando agrupados por ID para no perder la relación con el servicio
            $groupedServiceIds = [];
            foreach ($checkins as $chk) {
                foreach ($chk->checkinDetails as $detalle) {
                    $sId = $detalle->service_id;
                    $pReal = $detalle->selling_price ?? ($detalle->service->price ?? 0);

                    if (!isset($groupedServiceIds[$sId])) {
                        $groupedServiceIds[$sId] = [
                            'qty' => 0,
                            'total' => 0,
                            'punit' => $pReal
                        ];
                    }
                    $groupedServiceIds[$sId]['qty'] += $detalle->quantity;
                    $groupedServiceIds[$sId]['total'] += ($detalle->quantity * $pReal);
                }
            }

            foreach ($groupedServiceIds as $sId => $data) {
                $pUnit = $data['qty'] > 0 ? $data['total'] / $data['qty'] : 0;
                InvoiceDetail::create([
                    'invoice_id' => $nuevaFactura->id,
                    'service_id' => $sId,
                    'quantity'   => $data['qty'],
                    'unit_price' => $pUnit,
                    'cost'       => $data['total'], // Se usa 'cost'
                ]);
            }
            // =========================================================
            // PASO 5: Generación del PDF (Unificado a 4 columnas y reordenado)
            // =========================================================
            $pdfLargo = max(150, 100 + (count($hospedajesPDF) * 5) + (count($serviciosGlobales) * 5));
            $pdf = new \FPDF('P', 'mm', array(80, $pdfLargo));
            $pdf->SetMargins(4, 4, 4);
            $pdf->SetAutoPageBreak(true, 2);
            $pdf->AddPage();

            // CABECERA
            $pdf->SetFont('Arial', 'B', 10);
            $pdf->Cell(0, 4, 'HOTEL SAN ANTONIO', 0, 1, 'C');
            $pdf->SetFont('Arial', '', 7);

            if ($request->tipo_documento === 'factura') {
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

                $pdf->Ln(2);

                $pdf->SetFont('Arial', 'B', 7);
                $pdf->Cell(30, 3, 'NIT:', 0, 0, 'R');
                $pdf->SetFont('Arial', '', 7);
                $pdf->Cell(35, 3, '3327479013', 0, 1, 'L');
                $pdf->SetFont('Arial', 'B', 7);
                $pdf->Cell(30, 3, utf8_decode('FACTURA N°:'), 0, 0, 'R');
                $pdf->SetFont('Arial', '', 7);
                $pdf->Cell(35, 3, str_pad($primerCheckinId, 5, '0', STR_PAD_LEFT), 0, 1, 'L');
                $pdf->SetFont('Arial', 'B', 7);
                $pdf->Cell(30, 3, utf8_decode('CÓD. AUTORIZACIÓN:'), 0, 0, 'R');
                $pdf->SetFont('Arial', '', 7);
                $pdf->Cell(35, 3, '456123ABC', 0, 1, 'L');
                $pdf->Ln(1);
            } else {
                $pdf->Cell(0, 4, utf8_decode('Calle Principal #123 - Potosi'), 0, 1, 'C');
                $pdf->Ln(2);
                $pdf->SetFont('Arial', 'B', 9);
                $pdf->Cell(0, 6, 'NOTA DE SALIDA GRUPAL', 0, 1, 'C');
                $pdf->SetFont('Arial', '', 8);
                $pdf->Cell(0, 4, 'Ref: ' . str_pad($primerCheckinId, 6, '0', STR_PAD_LEFT), 0, 1, 'C');
                $pdf->Ln(1);
            }

            $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
            $pdf->Ln(2);

            // DATOS CLIENTE
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(20, 4, 'Fecha:', 0, 0);
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(0, 4, now()->format('d/m/Y H:i:s'), 0, 1);
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(20, 4, 'Cliente:', 0, 0);
            $pdf->SetFont('Arial', '', 7);
            $pdf->MultiCell(0, 4, utf8_decode($request->nombre_factura ?? 'S/N'), 0, 'L');
            $pdf->SetFont('Arial', 'B', 7);
            $pdf->Cell(20, 4, 'NIT/CI:', 0, 0);
            $pdf->SetFont('Arial', '', 7);
            $pdf->Cell(0, 4, $request->nit_factura ?? '0', 0, 1);

            $pdf->Ln(1);
            $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
            $pdf->Ln(2);

            // =========================================================
            // DETALLE ITEMS UNIFICADOS (REORDENADOS)
            // =========================================================
            $pdf->SetFont('Arial', 'B', 6);
            $pdf->Cell(35, 3, 'DETALLE', 0, 0, 'L');
            $pdf->Cell(8, 3, 'CNT', 0, 0, 'C');
            $pdf->Cell(12, 3, 'P.UNI', 0, 0, 'R');
            $pdf->Cell(17, 3, 'TOTAL', 0, 1, 'R');
            $pdf->Ln(1);

            $pdf->SetFont('Arial', '', 6);

            // 1. Hospedajes 
            foreach ($hospedajesPDF as $hosp) {
                $pdf->Cell(35, 3, utf8_decode(substr($hosp['desc'], 0, 22)), 0, 0, 'L');
                $pdf->Cell(8, 3, $hosp['cant'], 0, 0, 'C');
                $pdf->Cell(12, 3, number_format($hosp['punit'], 2), 0, 0, 'R');
                $pdf->Cell(17, 3, number_format($hosp['subtot'], 2), 0, 1, 'R');
            }

            // 2. Consumos Globales
            foreach ($serviciosGlobales as $name => $data) {
                $pUnit = $data['qty'] > 0 ? $data['total'] / $data['qty'] : 0;
                $pdf->Cell(35, 3, utf8_decode(substr($name, 0, 22)), 0, 0, 'L');
                $pdf->Cell(8, 3, $data['qty'], 0, 0, 'C');
                $pdf->Cell(12, 3, number_format($pUnit, 2), 0, 0, 'R');
                $pdf->Cell(17, 3, number_format($data['total'], 2), 0, 1, 'R');
            }

            $pdf->Ln(1);
            $pdf->Cell(0, 0, str_repeat('-', 55), 0, 1, 'C');
            $pdf->Ln(2);

            // TOTALES AL PIE
            $pdf->SetFont('Arial', 'B', 8);
            $pdf->Cell(50, 4, 'TOTAL Bs', 0, 0, 'R');
            $pdf->Cell(22, 4, number_format($granTotal, 2), 0, 1, 'R');

            if ($totalAdelantosGlobal > 0) {
                $pdf->SetFont('Arial', '', 7);
                $pdf->Cell(50, 4, '(-) Pagos Anticipados:', 0, 0, 'R');
                $pdf->Cell(22, 4, number_format($totalAdelantosGlobal, 2), 0, 1, 'R');

                $pdf->SetFont('Arial', 'B', 8);
                $pdf->Cell(50, 4, 'A PAGAR EN CAJA:', 0, 0, 'R');
                $pdf->Cell(22, 4, number_format($saldoPagar, 2), 0, 1, 'R');
            }

            if ($request->tipo_documento === 'factura') {
                $pdf->Ln(2);
                $pdf->SetFont('Arial', '', 7);
                $montoLetras = $this->convertirNumeroALetras($granTotal);
                $pdf->MultiCell(0, 4, 'Son: ' . utf8_decode($montoLetras), 0, 'L');

                $pdf->Ln(2);
                $pdf->SetFont('Arial', 'B', 6);
                $pdf->Cell(35, 3, utf8_decode('IMPORTE BASE CRÉDITO FISCAL:'), 0, 0, 'L');
                $pdf->Cell(0, 3, number_format($granTotal, 2), 0, 1, 'R');
                $pdf->Ln(2);
                $pdf->Cell(0, 3, utf8_decode('CÓDIGO DE CONTROL: 8A-F1-2C-99'), 0, 1, 'C');
                $pdf->Ln(2);

                $logoPath = public_path('images/qrCop.png');
                if (file_exists($logoPath)) {
                    $x = (80 - 22) / 2;
                    $pdf->Image($logoPath, $x, $pdf->GetY(), 22, 22);
                    $pdf->Ln(24);
                } else {
                    $pdf->Ln(24);
                }

                $pdf->SetFont('Arial', 'B', 5);
                $pdf->MultiCell(0, 2.5, utf8_decode('"ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO SERÁ SANCIONADO PENALMENTE DE ACUERDO A LEY"'), 0, 'C');
                $pdf->Ln(1);
                $pdf->SetFont('Arial', '', 5);
                $pdf->MultiCell(0, 2.5, utf8_decode('Ley N° 453: Tienes derecho a recibir información correcta, veraz, oportuna y completa sobre las características y contenidos de los productos que compras.'), 0, 'C');
            } else {
                $pdf->Ln(6);
                $pdf->SetFont('Arial', 'I', 7);
                $pdf->MultiCell(0, 3, utf8_decode("Gracias por su preferencia.\nRevise su cambio antes de retirarse."), 0, 'C');
            }

            $pdf->Ln(3);
            $usuario = Auth::user() ? Auth::user()->name : 'Cajero';
            $pdf->Cell(0, 3, 'Atendido por: ' . utf8_decode($usuario), 0, 1, 'C');

            return response($pdf->Output('S'), 200)
                ->header('Content-Type', 'application/pdf');
        });
    }
}
