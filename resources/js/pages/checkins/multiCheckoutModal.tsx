import axios from 'axios';
import {
    ArrowLeft,
    Banknote,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Loader2,
    LogOut,
    SplitSquareHorizontal,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
    show: boolean;
    selectedRoomIds: number[];
    rooms: any[];
    guests?: any[];
    onClose: () => void;
}

export default function MultiCheckoutModal({
    show,
    selectedRoomIds,
    rooms,
    guests = [],
    onClose,
}: Props) {
    // Estados de Formulario de Facturación y Buscador
    const [tipoDocumento, setTipoDocumento] = useState<
        'factura' | 'recibo' | null
    >(null);
    const [nombreFactura, setNombreFactura] = useState('');
    const [nitFactura, setNitFactura] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [filteredGuests, setFilteredGuests] = useState<any[]>([]);

    // Estados de Pagos
    const [metodoPago, setMetodoPago] = useState<
        'efectivo' | 'yape' | 'bnb' | 'fie' | 'eco' | 'ambos' | null
    >(null);
    const [montoEfectivo, setMontoEfectivo] = useState<string>('');
    const [montoQR, setMontoQR] = useState<string>('');
    const [bancoMixto, setBancoMixto] = useState<
        'yape' | 'bnb' | 'fie' | 'eco' | null
    >(null);

    // Estados para Consumos y Desplegables
    const [expandedRooms, setExpandedRooms] = useState<number[]>([]);
    const [roomServices, setRoomServices] = useState<Record<number, any[]>>({});
    const [loadingServices, setLoadingServices] = useState(true);

    // --- NUEVOS ESTADOS PARA EL BACKEND Y PDF ---
    const [processing, setProcessing] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    // 1. Abrir la primera habitación automáticamente al mostrar el modal
    useEffect(() => {
        if (show && selectedRoomIds.length > 0) {
            setExpandedRooms([]);
        } else {
            setExpandedRooms([]);
        }
    }, [show, selectedRoomIds]);

    // Búsqueda de Consumos
    useEffect(() => {
        if (!show || selectedRoomIds.length === 0) return;
        let isMounted = true;
        setLoadingServices(true);

        const fetchAllServices = async () => {
            const promises = selectedRoomIds.map(async (roomId) => {
                const room = rooms.find((r) => r.id === roomId);
                const checkin = room?.checkins?.[0];
                if (checkin) {
                    try {
                        const res = await axios.get('/guests/view-detail', {
                            params: { guest_id: checkin.guest_id },
                        });
                        return {
                            roomId,
                            servicios:
                                res.data.status === 'success'
                                    ? res.data.data.servicios
                                    : [],
                        };
                    } catch (e) {
                        return { roomId, servicios: [] };
                    }
                }
                return { roomId, servicios: [] };
            });

            const results = await Promise.all(promises);
            if (!isMounted) return;

            const newServices: Record<number, any[]> = {};
            results.forEach((r) => {
                newServices[r.roomId] = r.servicios;
            });
            setRoomServices(newServices);
            setLoadingServices(false);
        };

        fetchAllServices();
        return () => {
            isMounted = false;
        };
    }, [show, selectedRoomIds, rooms]);

    // Pre-llenar el nombre del cliente con la primera habitación seleccionada
    useEffect(() => {
        if (show && selectedRoomIds.length > 0) {
            const firstRoom = rooms.find((r) => r.id === selectedRoomIds[0]);
            const firstGuest = firstRoom?.checkins?.[0]?.guest;
            if (firstGuest) {
                setNombreFactura(firstGuest.full_name || '');
                setNitFactura(firstGuest.identification_number || '');
            }
        }
    }, [show, selectedRoomIds, rooms]);

    // --- MANEJADORES DEL BUSCADOR DE HUÉSPEDES ---
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase();
        setNombreFactura(val);

        if (val.trim() === '') {
            setNitFactura(''); // Si borra el nombre, se borra el NIT
            setFilteredGuests([]);
            setIsDropdownOpen(false);
        } else {
            const filtered = guests.filter((g) =>
                g.full_name.toUpperCase().includes(val),
            );
            setFilteredGuests(filtered);
            setIsDropdownOpen(true);
        }
    };

    const handleNitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase();
        setNitFactura(val);
        if (val.trim() === '') {
            setNombreFactura(''); // Si borra el NIT, se borra el nombre
        }
    };

    const handleSelectGuest = (guest: any) => {
        setNombreFactura(guest.full_name);
        setNitFactura(guest.identification_number || '');
        setIsDropdownOpen(false);
    };

    // --- CÁLCULOS LOCALES PARA LA VISTA PREVIA ---
    const selectedRoomsData = rooms.filter((r) =>
        selectedRoomIds.includes(r.id),
    );

    let totalHospedajeGeneral = 0;
    let totalConsumosGeneral = 0;
    let totalAdelantosGeneral = 0;

    const desgloseHabitaciones = selectedRoomsData
        .map((room) => {
            const activeCheckin = room.checkins?.[0];
            if (!activeCheckin) return null;

            const ingreso = new Date(activeCheckin.check_in_date);
            const salida = new Date();
            const diffTime = Math.abs(salida.getTime() - ingreso.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

            const price = parseFloat(room.price?.amount || 0);
            const accomTotal = diffDays * price;
            totalHospedajeGeneral += accomTotal;

            const servicios = roomServices[room.id] || [];
            const servicesTotal = servicios.reduce(
                (acc: number, item: any) =>
                    acc + (parseFloat(item.subtotal) || 0),
                0,
            );
            totalConsumosGeneral += servicesTotal;

            const groupedServices = Object.values(
                servicios.reduce((acc: any, item: any) => {
                    const key = item.service;
                    if (!acc[key])
                        acc[key] = { ...item, count: 0, subtotal: 0 };
                    acc[key].count += parseInt(item.count || 0);
                    acc[key].subtotal += parseFloat(item.subtotal || 0);
                    return acc;
                }, {}),
            );

            let pagado = 0;
            if (activeCheckin.payments && activeCheckin.payments.length > 0) {
                pagado = activeCheckin.payments.reduce(
                    (acc: number, p: any) => acc + (parseFloat(p.amount) || 0),
                    0,
                );
            } else {
                pagado = parseFloat(activeCheckin.advance_payment || 0);
            }
            totalAdelantosGeneral += pagado;

            const totalHabitacion = accomTotal + servicesTotal - pagado;

            return {
                roomId: room.id,
                checkinId: activeCheckin.id, // <-- NECESARIO PARA EL BACKEND
                roomNumber: room.number,
                tipoHabitacion: room.room_type?.name || 'ESTÁNDAR',
                tipoBano:
                    room.bathroom_type === 'shared'
                        ? 'BAÑO COMPARTIDO'
                        : 'BAÑO PRIVADO',
                ingreso: activeCheckin.check_in_date,
                salida: salida,
                dias: diffDays,
                personas: 1 + (activeCheckin.companions?.length || 0),
                precioUnitario: price,
                accomTotal,
                servicesTotal,
                groupedServices,
                pagado,
                totalHabitacion,
            };
        })
        .filter(Boolean);

    const saldoPendienteFinal = Math.max(
        0,
        totalHospedajeGeneral + totalConsumosGeneral - totalAdelantosGeneral,
    );

    const efeNum = parseFloat(montoEfectivo) || 0;
    const qrNum = parseFloat(montoQR) || 0;
    const restanteMixto = Math.max(0, saldoPendienteFinal - (efeNum + qrNum));
    const estaCubierto = efeNum + qrNum >= saldoPendienteFinal - 0.05;

    useEffect(() => {
        if (metodoPago === 'ambos') {
            setMontoEfectivo('');
            setMontoQR('');
        }
    }, [metodoPago]);

    const handleMontoEfectivoChange = (val: string) => {
        setMontoEfectivo(val);
        const efe = parseFloat(val) || 0;
        const qr = Math.max(0, saldoPendienteFinal - efe);
        setMontoQR(qr.toFixed(2));
    };

    const handleMontoQRChange = (val: string) => {
        setMontoQR(val);
        const qr = parseFloat(val) || 0;
        const efe = Math.max(0, saldoPendienteFinal - qr);
        setMontoEfectivo(efe.toFixed(2));
    };

    const toggleRoom = (roomId: number) => {
        setExpandedRooms((prev) =>
            prev.includes(roomId)
                ? prev.filter((id) => id !== roomId)
                : [...prev, roomId],
        );
    };

    const isPaymentValid = () => {
        if (!metodoPago) return false;
        if (metodoPago === 'ambos') {
            if (!bancoMixto || !estaCubierto) return false;
        }
        return true;
    };

    const isFormValid =
        tipoDocumento &&
        nombreFactura.trim() !== '' &&
        nitFactura.trim() !== '' &&
        isPaymentValid();

    // =========================================================================
    // FUNCIÓN PRINCIPAL PARA CONECTAR AL BACKEND
    // =========================================================================
    const handleConfirmAndPreview = async () => {
        setProcessing(true);
        try {
            // Recopilamos los IDs de los checkins para enviar
            const checkinIds = desgloseHabitaciones.map(
                (d: any) => d.checkinId,
            );

            const payload = {
                checkin_ids: checkinIds,
                tipo_documento: tipoDocumento,
                nombre_factura: nombreFactura,
                nit_factura: nitFactura,
                metodo_pago: metodoPago,
                monto_efectivo:
                    montoEfectivo ||
                    (metodoPago === 'efectivo' ? saldoPendienteFinal : 0),
                monto_qr:
                    montoQR ||
                    (metodoPago !== 'efectivo' && metodoPago !== 'ambos'
                        ? saldoPendienteFinal
                        : 0),
                banco_qr:
                    metodoPago === 'ambos'
                        ? bancoMixto
                        : metodoPago !== 'efectivo'
                          ? metodoPago
                          : null,
                total_pagado: saldoPendienteFinal,
            };

            // Petición al backend
            const response = await axios.post(
                '/checkins/multi-checkout',
                payload,
                {
                    responseType: 'blob', // Crítico para recibir el PDF
                },
            );

            // Crear la URL temporal para mostrar el PDF en el iframe
            const pdfBlob = new Blob([response.data], {
                type: 'application/pdf',
            });
            const url = window.URL.createObjectURL(pdfBlob);
            setPdfUrl(url);
        } catch (error) {
            console.error('Error procesando checkout múltiple:', error);
            alert('Hubo un error al generar la salida múltiple.');
        } finally {
            setProcessing(false);
        }
    };

    // Cerrar y recargar la página para reflejar el estado "LIMPIEZA"
    const handleCloseFinal = () => {
        if (pdfUrl) {
            window.URL.revokeObjectURL(pdfUrl);
        }
        setPdfUrl(null);
        onClose();
        window.location.reload();
    };

    if (!show || selectedRoomIds.length === 0) return null;

    return (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200 zoom-in-95 fade-in">
            <div className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* HEADER MODAL */}
                <div className="flex flex-none items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
                    <h3 className="flex items-center gap-2 text-lg font-black tracking-wider text-gray-800 uppercase">
                        <LogOut className="h-6 w-6 text-red-600" />
                        Finalizar Estadía ({selectedRoomIds.length} Hab)
                    </h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* CONTENIDO (2 Columnas O VISOR DE PDF) */}
                <div className="flex flex-1 flex-col overflow-hidden bg-white md:flex-row">
                    {!pdfUrl ? (
                        <>
                            {/* ======================================================== */}
                            {/* COLUMNA IZQUIERDA: RESUMEN Y PAGOS                       */}
                            {/* ======================================================== */}
                            <div className="flex w-full shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white p-6 md:w-[420px]">
                                {/* 2. OCULTAR RESUMEN SI ES MIXTO */}
                                {metodoPago !== 'ambos' && (
                                    <div className="mb-2 rounded-xl border border-red-100 bg-red-50/50 p-3 text-base shadow-inner transition-colors">
                                        <div className="mb-3 border-b border-red-200 pb-2 text-center">
                                            <span className="block text-[20px] font-bold text-red-600 uppercase">
                                                Resumen Múltiple
                                            </span>
                                        </div>

                                        <div className="mb-2 grid grid-cols-2 gap-2 text-sm text-gray-800">
                                            <div className="col-span-2 grid grid-cols-[100px_1fr] items-center border-b border-dashed border-gray-300 py-1">
                                                <span className="font-bold">
                                                    Hospedaje:
                                                </span>
                                                <span className="text-right font-medium">
                                                    {totalHospedajeGeneral.toFixed(
                                                        2,
                                                    )}{' '}
                                                    Bs
                                                </span>
                                            </div>
                                            {totalConsumosGeneral > 0 && (
                                                <div className="col-span-2 grid grid-cols-[100px_1fr] items-center border-b border-dashed border-gray-300 py-1">
                                                    <span className="font-bold">
                                                        Consumos:
                                                    </span>
                                                    <span className="text-right font-medium">
                                                        {totalConsumosGeneral.toFixed(
                                                            2,
                                                        )}{' '}
                                                        Bs
                                                    </span>
                                                </div>
                                            )}
                                            {totalAdelantosGeneral > 0 && (
                                                <div className="col-span-2 grid grid-cols-[100px_1fr] items-center border-b border-dashed border-gray-300 py-1 text-green-700">
                                                    <span className="font-bold">
                                                        Adelantos:
                                                    </span>
                                                    <span className="text-right font-bold">
                                                        -{' '}
                                                        {totalAdelantosGeneral.toFixed(
                                                            2,
                                                        )}{' '}
                                                        Bs
                                                    </span>
                                                </div>
                                            )}

                                            <div className="col-span-2 mt-1 flex justify-between pt-1 text-lg">
                                                <span className="font-bold text-gray-900">
                                                    Total a Cobrar:
                                                </span>
                                                <span className="font-black text-red-600">
                                                    {saldoPendienteFinal.toFixed(
                                                        2,
                                                    )}{' '}
                                                    Bs
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TIPO DE DOCUMENTO */}
                                <div className="text-center">
                                    <h4 className="mb-2 flex items-center justify-center gap-1 text-sm font-bold tracking-wide text-gray-800 uppercase">
                                        <CreditCard className="h-5 w-5 text-gray-400" />{' '}
                                        1. Documento
                                    </h4>
                                    <div className="flex justify-center gap-3">
                                        <button
                                            onClick={() =>
                                                setTipoDocumento('recibo')
                                            }
                                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 transition-all ${tipoDocumento === 'recibo' ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-600' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            <div
                                                className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${tipoDocumento === 'recibo' ? 'border-emerald-600' : 'border-gray-300'}`}
                                            >
                                                {tipoDocumento === 'recibo' && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                                )}
                                            </div>
                                            <span className="text-xs font-bold uppercase">
                                                Sin Factura
                                            </span>
                                        </button>
                                        <button
                                            onClick={() =>
                                                setTipoDocumento('factura')
                                            }
                                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 transition-all ${tipoDocumento === 'factura' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-600' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            <div
                                                className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${tipoDocumento === 'factura' ? 'border-blue-600' : 'border-gray-300'}`}
                                            >
                                                {tipoDocumento ===
                                                    'factura' && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                                )}
                                            </div>
                                            <span className="text-xs font-bold uppercase">
                                                Con Factura
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* MÉTODO DE PAGO */}
                                {tipoDocumento && (
                                    <div className="mt-1 flex-1 animate-in text-center fade-in slide-in-from-top-2">
                                        <h4 className="mb-1 flex items-center justify-center gap-1 text-sm font-bold tracking-widest text-gray-800 uppercase">
                                            <Banknote className="h-4 w-4 text-gray-400" />{' '}
                                            2. Tipo de Pago
                                        </h4>

                                        {metodoPago !== 'ambos' && (
                                            <div className="mb-4 grid animate-in grid-cols-3 gap-1 zoom-in-95 fade-in">
                                                <button
                                                    onClick={() =>
                                                        setMetodoPago(
                                                            'efectivo',
                                                        )
                                                    }
                                                    className={`flex flex-col items-center justify-center rounded-xl border py-2 transition-all ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 ring-2 ring-green-500' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                                                >
                                                    <Banknote
                                                        className={`mb-1 h-6 w-6 ${metodoPago === 'efectivo' ? 'text-green-600' : 'text-gray-500'}`}
                                                    />
                                                    <span
                                                        className={`text-[10px] font-black uppercase ${metodoPago === 'efectivo' ? 'text-green-800' : 'text-gray-600'}`}
                                                    >
                                                        Efectivo
                                                    </span>
                                                </button>

                                                {[
                                                    'YAPE',
                                                    'BNB',
                                                    'FIE',
                                                    'ECO',
                                                ].map((banco) => (
                                                    <button
                                                        key={banco}
                                                        onClick={() =>
                                                            setMetodoPago(
                                                                banco.toLowerCase() as any,
                                                            )
                                                        }
                                                        className={`flex flex-col items-center justify-center rounded-xl border py-2 transition-all ${metodoPago === banco.toLowerCase() ? 'border-red-500 bg-red-50 ring-2 ring-red-500' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                                                    >
                                                        <img
                                                            src={`/images/bancos/${banco.toLowerCase()}.png`}
                                                            alt={banco}
                                                            className={`mb-1 h-6 object-contain ${metodoPago !== banco.toLowerCase() && 'opacity-70 grayscale'}`}
                                                        />
                                                        <span
                                                            className={`text-[10px] font-black uppercase ${metodoPago === banco.toLowerCase() ? 'text-red-800' : 'text-gray-600'}`}
                                                        >
                                                            {banco}
                                                        </span>
                                                    </button>
                                                ))}

                                                <button
                                                    onClick={() =>
                                                        setMetodoPago('ambos')
                                                    }
                                                    className="flex flex-col items-center justify-center rounded-xl border border-gray-300 bg-white py-2 shadow-sm transition-all hover:bg-gray-100"
                                                >
                                                    <SplitSquareHorizontal className="mb-1 h-6 w-6 text-gray-500" />
                                                    <span className="text-[10px] font-black text-gray-600 uppercase">
                                                        Ambos (Mixto)
                                                    </span>
                                                </button>
                                            </div>
                                        )}

                                        {/* "AMBOS" (MIXTO) */}
                                        {metodoPago === 'ambos' && (
                                            <div className="mt-2 animate-in rounded-xl border border-gray-200 bg-gray-50 p-3 shadow-sm fade-in slide-in-from-right-4">
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() =>
                                                            setMetodoPago(null)
                                                        }
                                                        className="mb-3 flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[10px] font-black text-gray-600 uppercase shadow-sm transition-colors hover:text-gray-900"
                                                    >
                                                        <ArrowLeft className="h-3 w-3" />{' '}
                                                        Volver
                                                    </button>
                                                </div>
                                                <div
                                                    className={`mb-3 rounded-xl border-2 p-3 text-center transition-all duration-300 ${estaCubierto ? 'border-green-500 bg-green-50 text-green-800 shadow-inner' : 'border-red-300 bg-white text-gray-800 shadow-md'}`}
                                                >
                                                    <span
                                                        className={`mb-1 block text-[10px] font-black tracking-widest uppercase ${estaCubierto ? 'text-green-700' : 'text-red-500'}`}
                                                    >
                                                        {estaCubierto
                                                            ? '¡Monto Completado!'
                                                            : 'Monto Restante por Cubrir'}
                                                    </span>
                                                    <div className="flex items-center justify-center gap-2">
                                                        {estaCubierto && (
                                                            <CheckCircle2 className="h-6 w-6 animate-in text-green-600 zoom-in" />
                                                        )}
                                                        <span
                                                            className={`text-2xl font-black ${estaCubierto ? 'text-green-700' : 'text-gray-900'}`}
                                                        >
                                                            {restanteMixto.toFixed(
                                                                2,
                                                            )}{' '}
                                                            Bs
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 border-b border-gray-200 pb-3">
                                                    <div className="rounded-xl border border-gray-300 bg-white p-2 shadow-md">
                                                        <label className="mb-1 flex items-center justify-center gap-1 text-[10px] font-black text-gray-500 uppercase">
                                                            <Banknote className="h-3 w-3 text-gray-400" />{' '}
                                                            Efectivo (Bs)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="0.00"
                                                            value={
                                                                montoEfectivo
                                                            }
                                                            onChange={(e) =>
                                                                handleMontoEfectivoChange(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full rounded-lg border-gray-400 text-center text-base font-black text-gray-800 focus:border-red-500 focus:ring-red-500"
                                                        />
                                                    </div>
                                                    <div className="rounded-xl border border-gray-300 bg-white p-2 shadow-md">
                                                        <label className="mb-1 flex items-center justify-center gap-1 text-[10px] font-black text-gray-500 uppercase">
                                                            <SplitSquareHorizontal className="h-3 w-3 text-gray-400" />{' '}
                                                            Banco / QR (Bs)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="0.00"
                                                            value={montoQR}
                                                            onChange={(e) =>
                                                                handleMontoQRChange(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            className="w-full rounded-lg border-gray-400 text-center text-base font-black text-gray-800 focus:border-red-500 focus:ring-red-500"
                                                        />
                                                    </div>
                                                </div>

                                                <label className="mt-2 mb-2 block text-[10px] font-black text-gray-700 uppercase">
                                                    Banco del QR:
                                                </label>
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[
                                                        'YAPE',
                                                        'BNB',
                                                        'FIE',
                                                        'ECO',
                                                    ].map((banco) => (
                                                        <button
                                                            key={banco}
                                                            type="button"
                                                            onClick={() =>
                                                                setBancoMixto(
                                                                    banco.toLowerCase() as any,
                                                                )
                                                            }
                                                            className={`flex flex-col items-center justify-center rounded-lg border-2 py-2 transition-all ${bancoMixto === banco.toLowerCase() ? 'border-red-500 bg-red-50 shadow-md ring-1 ring-red-500' : 'border-gray-300 bg-white hover:bg-gray-100'}`}
                                                        >
                                                            <img
                                                                src={`/images/bancos/${banco.toLowerCase()}.png`}
                                                                alt={banco}
                                                                className={`h-5 object-contain ${bancoMixto !== banco.toLowerCase() && 'opacity-70 grayscale'}`}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>

                            {/* ======================================================== */}
                            {/* COLUMNA DERECHA: FORMATO DE FACTURA CON BUSCADOR         */}
                            {/* ======================================================== */}
                            <div className="relative flex h-full flex-1 animate-in flex-col overflow-y-auto border-l border-red-100 bg-red-50/30 p-6 shadow-sm duration-300 fade-in slide-in-from-right-4">
                                {/* CABECERA: FECHA Y DATOS CON BUSCADOR AUTOMÁTICO */}
                                <div className="mb-5 border-b border-blue-200 pb-5">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-xs font-bold text-gray-800 uppercase">
                                            Fecha:{' '}
                                            {new Date().toLocaleDateString(
                                                'es-BO',
                                            )}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <label className="text-xs font-bold whitespace-nowrap text-gray-500 uppercase">
                                                NIT / CI
                                            </label>
                                            <input
                                                type="text"
                                                value={nitFactura}
                                                onChange={handleNitChange}
                                                className="w-48 rounded-xl border border-gray-400 bg-white px-2 py-2 text-sm text-black uppercase shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                placeholder="0000000"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="mb-1.5 block text-xs font-bold text-gray-800 uppercase">
                                            Señor(es)
                                        </label>
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                value={nombreFactura}
                                                onChange={handleNameChange}
                                                onFocus={() => {
                                                    if (
                                                        nombreFactura.length >
                                                            1 &&
                                                        filteredGuests.length >
                                                            0
                                                    ) {
                                                        setIsDropdownOpen(true);
                                                    }
                                                }}
                                                onBlur={() =>
                                                    setTimeout(
                                                        () =>
                                                            setIsDropdownOpen(
                                                                false,
                                                            ),
                                                        200,
                                                    )
                                                }
                                                className="w-full rounded-xl border border-gray-400 bg-white px-4 py-2 text-sm text-black uppercase shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                                placeholder="ESCRIBE PARA BUSCAR..."
                                                autoComplete="off"
                                            />

                                            {/* MENÚ DESPLEGABLE DEL BUSCADOR DE HUÉSPEDES */}
                                            {isDropdownOpen &&
                                                filteredGuests.length > 0 && (
                                                    <div className="absolute top-full left-0 z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-400 bg-white shadow-xl">
                                                        {filteredGuests.map(
                                                            (g) => (
                                                                <div
                                                                    key={g.id}
                                                                    onClick={() =>
                                                                        handleSelectGuest(
                                                                            g,
                                                                        )
                                                                    }
                                                                    className="cursor-pointer border-b border-gray-50 px-4 py-3 text-sm transition-colors last:border-0 hover:bg-green-50"
                                                                >
                                                                    <div className="font-bold text-gray-800">
                                                                        {
                                                                            g.full_name
                                                                        }
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                        <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono font-bold text-gray-600">
                                                                            CI:{' '}
                                                                            {g.identification_number ||
                                                                                'S/N'}
                                                                        </span>
                                                                        {g.nationality && (
                                                                            <span className="text-gray-400">
                                                                                •{' '}
                                                                                {
                                                                                    g.nationality
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>

                                {/* SECCIÓN DETALLES DE LA FACTURA */}
                                <div className="flex-1 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                                    <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-2">
                                        <h4 className="text-xs font-bold tracking-wider text-red-600 uppercase">
                                            Detalle de la Factura
                                        </h4>
                                        {loadingServices && (
                                            <span className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                                                <Loader2 className="h-3 w-3 animate-spin" />{' '}
                                                Extras...
                                            </span>
                                        )}
                                    </div>

                                    <div className="w-full text-sm">
                                        {/* CABECERA GRID */}
                                        <div className="mb-2 grid grid-cols-[1fr_60px_100px_100px_24px] items-center border-b border-gray-100 pb-2 text-[10px] font-bold text-gray-500 uppercase">
                                            <div className="text-left">
                                                Descripción
                                            </div>
                                            <div className="text-center">
                                                Cant.
                                            </div>
                                            <div className="text-right">
                                                P. Unitario
                                            </div>
                                            <div className="text-right">
                                                Total
                                            </div>
                                            <div></div>
                                        </div>

                                        {/* LISTA DE HABITACIONES (ACORDEONES) */}
                                        {desgloseHabitaciones.map(
                                            (item: any) => {
                                                const isExpanded =
                                                    expandedRooms.includes(
                                                        item.roomId,
                                                    );
                                                return (
                                                    <div
                                                        key={item.roomId}
                                                        className="mb-2 border-b border-gray-100 pb-2"
                                                    >
                                                        {/* 1. HABITACIÓN (Header Desplegable) */}
                                                        <div
                                                            onClick={() =>
                                                                toggleRoom(
                                                                    item.roomId,
                                                                )
                                                            }
                                                            className="grid cursor-pointer grid-cols-[1fr_60px_100px_100px_24px] items-center rounded-lg bg-gray-50/50 px-2 py-1.5 transition-colors hover:bg-gray-50"
                                                        >
                                                            <div className="text-[13px] font-bold text-gray-800 uppercase">
                                                                Habitación{' '}
                                                                {
                                                                    item.roomNumber
                                                                }{' '}
                                                                -{' '}
                                                                {
                                                                    item.tipoHabitacion
                                                                }{' '}
                                                                -{' '}
                                                                {item.tipoBano}
                                                            </div>
                                                            <div className="text-center font-bold text-gray-400">
                                                                -
                                                            </div>
                                                            <div className="text-right font-bold text-gray-400">
                                                                -
                                                            </div>
                                                            <div className="text-right text-[13px] font-bold text-gray-800">
                                                                {item.totalHabitacion.toFixed(
                                                                    2,
                                                                )}
                                                            </div>
                                                            <div className="flex justify-end">
                                                                {isExpanded ? (
                                                                    <ChevronUp className="h-4 w-4 text-gray-600" />
                                                                ) : (
                                                                    <ChevronDown className="h-4 w-4 text-gray-600" />
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* CONTENIDO EXPANDIBLE DEL DETALLE */}
                                                        <div
                                                            className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'mt-1 max-h-[1500px] opacity-100' : 'max-h-0 opacity-0'}`}
                                                        >
                                                            {/* 2. TARIFA */}
                                                            <div className="grid grid-cols-[1fr_60px_100px_100px_24px] items-start border-b border-gray-50 px-2 py-1.5">
                                                                <div className="pl-4">
                                                                    <div className="mb-1 text-[12px] font-bold text-gray-600">
                                                                        Tarifa
                                                                    </div>
                                                                    <div className="space-y-0.5 pl-2 text-[11px] text-gray-500">
                                                                        <div>
                                                                            Número
                                                                            de
                                                                            personas:{' '}
                                                                            <span className="font-bold text-gray-800">
                                                                                {
                                                                                    item.personas
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            Ingreso:{' '}
                                                                            <span className="font-bold text-gray-800">
                                                                                {new Date(
                                                                                    item.ingreso,
                                                                                ).toLocaleDateString(
                                                                                    'es-BO',
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            Salida:{' '}
                                                                            <span className="font-bold text-gray-800">
                                                                                {item.salida.toLocaleDateString(
                                                                                    'es-BO',
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            Total
                                                                            de
                                                                            días:{' '}
                                                                            <span className="font-bold text-gray-800">
                                                                                {
                                                                                    item.dias
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="pt-0.5 text-center text-xs font-medium text-gray-800">
                                                                    {item.dias}
                                                                </div>
                                                                <div className="pt-0.5 text-right text-xs font-medium text-gray-800">
                                                                    {item.precioUnitario.toFixed(
                                                                        2,
                                                                    )}
                                                                </div>
                                                                <div className="pt-0.5 text-right text-xs font-bold text-gray-800">
                                                                    {item.accomTotal.toFixed(
                                                                        2,
                                                                    )}
                                                                </div>
                                                                <div></div>
                                                            </div>

                                                            {/* 3. CONSUMO */}
                                                            <div className="grid grid-cols-[1fr_60px_100px_100px_24px] items-center border-b border-gray-50 px-2 py-1.5">
                                                                <div className="pl-4 text-[12px] font-bold text-gray-600">
                                                                    Consumo
                                                                </div>
                                                                <div className="text-center text-gray-400">
                                                                    -
                                                                </div>
                                                                <div className="text-right text-gray-400">
                                                                    -
                                                                </div>
                                                                <div className="text-right text-xs font-bold text-gray-800">
                                                                    {item.servicesTotal.toFixed(
                                                                        2,
                                                                    )}
                                                                </div>
                                                                <div></div>
                                                            </div>

                                                            {/* DETALLE CONSUMOS (1 x LAVANDERIA) */}
                                                            {item
                                                                .groupedServices
                                                                .length > 0 && (
                                                                <div className="mb-1">
                                                                    {item.groupedServices.map(
                                                                        (
                                                                            srv: any,
                                                                            idx: number,
                                                                        ) => {
                                                                            const unitPrice =
                                                                                (
                                                                                    srv.subtotal /
                                                                                    srv.count
                                                                                ).toFixed(
                                                                                    2,
                                                                                );
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        idx
                                                                                    }
                                                                                    className="grid grid-cols-[1fr_60px_100px_100px_24px] items-center border-b border-gray-50 px-2 py-1"
                                                                                >
                                                                                    <div className="pl-8 text-[11px] text-gray-600 uppercase">
                                                                                        {
                                                                                            srv.service
                                                                                        }
                                                                                    </div>
                                                                                    <div className="text-center text-[11px] font-medium text-gray-800">
                                                                                        {
                                                                                            srv.count
                                                                                        }
                                                                                    </div>
                                                                                    <div className="text-right text-[11px] font-medium text-gray-800">
                                                                                        {
                                                                                            unitPrice
                                                                                        }
                                                                                    </div>
                                                                                    <div className="text-right text-[11px] font-bold text-gray-800">
                                                                                        {srv.subtotal.toFixed(
                                                                                            2,
                                                                                        )}
                                                                                    </div>
                                                                                    <div></div>
                                                                                </div>
                                                                            );
                                                                        },
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* 4. OTROS */}
                                                            <div className="grid grid-cols-[1fr_60px_100px_100px_24px] items-center px-2 py-1.5">
                                                                <div className="pl-4 text-[12px] font-bold text-gray-600">
                                                                    Otros
                                                                </div>
                                                                <div className="text-center text-gray-400">
                                                                    -
                                                                </div>
                                                                <div className="text-right text-gray-400">
                                                                    -
                                                                </div>
                                                                <div className="text-right text-xs font-bold text-gray-800">
                                                                    0.00
                                                                </div>
                                                                <div></div>
                                                            </div>

                                                            {/* 5. ADELANTOS */}
                                                            {item.pagado >
                                                                0 && (
                                                                <div className="grid grid-cols-[1fr_60px_100px_100px_24px] items-center border-t border-dashed border-gray-200 bg-green-50/50 px-2 py-1.5 font-bold text-green-600">
                                                                    <div className="pl-4 text-[11px]">
                                                                        Adelantos/Pagos
                                                                        previos
                                                                    </div>
                                                                    <div className="text-center text-green-300">
                                                                        -
                                                                    </div>
                                                                    <div className="text-right text-green-300">
                                                                        -
                                                                    </div>
                                                                    <div className="text-right text-xs">
                                                                        -
                                                                        {item.pagado.toFixed(
                                                                            2,
                                                                        )}
                                                                    </div>
                                                                    <div></div>
                                                                </div>
                                                            )}

                                                            {/* 6. SALDO TOTAL DE LA HABITACIÓN */}
                                                            <div className="mx-2 mt-3 flex items-center justify-between rounded-xl bg-red-500 p-4 text-white shadow-lg">
                                                                <span className="text-xs font-bold tracking-wider uppercase">
                                                                    Saldo
                                                                    Pendiente
                                                                    (Hab{' '}
                                                                    {
                                                                        item.roomNumber
                                                                    }
                                                                    )
                                                                </span>
                                                                <span className="text-xl font-black">
                                                                    {item.totalHabitacion.toFixed(
                                                                        2,
                                                                    )}{' '}
                                                                    Bs
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        // =========================================================
                        // SI YA HAY PDF, MOSTRAMOS EL IFRAME OCUPANDO TODO EL ESPACIO
                        // =========================================================
                        <div className="flex h-full flex-1 flex-col overflow-hidden bg-gray-100 p-2">
                            <iframe
                                src={pdfUrl}
                                className="h-full w-full rounded-xl border border-gray-300 shadow-inner"
                                title="Factura/Recibo Grupal PDF"
                            />
                        </div>
                    )}
                </div>

                {/* ======================================================== */}
                {/* PIE DEL MODAL (FOOTER)                                   */}
                {/* ======================================================== */}
                <div className="z-20 flex flex-none justify-end gap-3 border-t border-gray-100 bg-white px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    {!pdfUrl ? (
                        <>
                            <button
                                onClick={onClose}
                                disabled={processing}
                                className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 active:scale-95 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={!isFormValid || processing}
                                onClick={handleConfirmAndPreview}
                                className="flex min-w-[200px] items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Sí, Finalizar Múltiple'
                                )}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleCloseFinal}
                            className="w-full rounded-xl bg-gray-900 px-6 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-black md:w-auto"
                        >
                            Cerrar y Limpiar Habitaciones
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
