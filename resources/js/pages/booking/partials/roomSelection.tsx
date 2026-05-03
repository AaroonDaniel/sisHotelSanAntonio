import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Wifi, Tv, Flame, Bath, Trash2, Users, CheckCircle2, Plus, Minus } from 'lucide-react';

export default function RoomSelection({ bookingData, setBookingData, onNext, onBack }: any) {
    
    const totalGuests = bookingData.guests || 1;

    // ==========================================
    // 1. FILTRADO INTELIGENTE DESDE LA BASE
    // ==========================================
    const rawAvailableRoomTypes = bookingData.availableRooms || [];

    const availableRoomTypes = rawAvailableRoomTypes.filter((type: any) => {
        const typeName = type.name.toLowerCase();
        
        // Regla A: Ocultar Salones y Habitaciones Familiares
        if (typeName.includes('salón') || typeName.includes('salon') || typeName.includes('familiar')) {
            return false;
        }

        // Regla B: Ocultar habitaciones cuya capacidad supere la cantidad total de huéspedes
        // (Ej: Si busco 2 huéspedes, ocultar habitaciones con capacidad de 3 o más)
        const sampleRoom = type.rooms && type.rooms.length > 0 ? type.rooms[0] : {};
        const roomCapacity = sampleRoom.capacity || 0;
        
        if (roomCapacity > totalGuests) {
            return false;
        }

        return true;
    });

    // Estados
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('Todos');
    const [cart, setCart] = useState<any[]>(bookingData.selectedRooms || []);

    // ==========================================
    // 2. LÓGICA DE ASIGNACIÓN (CARRITO)
    // ==========================================
    const assignedGuests = cart.reduce((total, room) => total + (room.capacity || 0), 0);
    // Usamos Math.max para que nunca muestre números negativos si se pasa un poco por la capacidad de las camas
    const pendingGuests = Math.max(0, totalGuests - assignedGuests);

    // Función para AGREGAR (+)
    const handleAddType = (type: any) => {
        const typeRoomsInCart = cart.filter(r => r.room_type_id === type.id);
        
        if (typeRoomsInCart.length < type.rooms.length) {
            const roomToAdd = type.rooms.find((r: any) => !cart.some((cr: any) => cr.id === r.id));
            if (roomToAdd) {
                setCart([...cart, { ...roomToAdd, typeName: type.name }]);
            }
        }
    };

    // Función para QUITAR (-)
    const handleRemoveType = (type: any) => {
        const reversedIndex = [...cart].reverse().findIndex(r => r.room_type_id === type.id);
        if (reversedIndex !== -1) {
            const actualIndex = cart.length - 1 - reversedIndex;
            const newCart = [...cart];
            newCart.splice(actualIndex, 1);
            setCart(newCart);
        }
    };

    // Función para quitar desde el tacho de basura
    const handleRemoveFromCart = (indexToRemove: number) => {
        setCart(cart.filter((_, index) => index !== indexToRemove));
    };

    // Avanzar al paso 3
    const handleNext = () => {
        if (pendingGuests > 0) {
            alert(`Aún te falta asignar habitación para ${pendingGuests} huésped(es)`);
            return;
        }
        setBookingData({ ...bookingData, selectedRooms: cart });
        onNext();
    };

    // Filtro visual de los botones de la izquierda
    const filteredTypes = availableRoomTypes.filter((type: any) => {
        return selectedTypeFilter === 'Todos' || type.name === selectedTypeFilter;
    });

    return (
        <div className="w-full">
            <div className="flex items-center mb-6">
                <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-800 mr-2 px-2">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Volver a buscar
                </Button>
                <h2 className="text-2xl font-bold text-[#1e3a5f]">Selección de Habitaciones</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* COLUMNA 1: FILTROS */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border border-gray-200 shadow-sm rounded-sm sticky top-24">
                        <CardContent className="p-5">
                            
                            <div className="mb-6">
                                <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">Filtro de Opciones</h3>
                                <div className="space-y-1.5">
                                    <button
                                        onClick={() => setSelectedTypeFilter('Todos')}
                                        className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ${
                                            selectedTypeFilter === 'Todos' 
                                            ? 'bg-red-50 text-[#b3282d] font-medium border-l-2 border-[#b3282d]' 
                                            : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
                                        }`}
                                    >
                                        Ver Todas
                                    </button>
                                    
                                    {availableRoomTypes.map((type: any) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setSelectedTypeFilter(type.name)}
                                            className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ${
                                                selectedTypeFilter === type.name 
                                                ? 'bg-red-50 text-[#b3282d] font-medium border-l-2 border-[#b3282d]' 
                                                : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
                                            }`}
                                        >
                                            {type.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                </div>

                {/* COLUMNA 2: LISTA DE HABITACIONES */}
                <div className="lg:col-span-2 space-y-4">
                    {filteredTypes.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-sm p-8 text-center text-gray-500">
                            No se encontraron habitaciones para la cantidad de huéspedes solicitada.
                        </div>
                    ) : (
                        filteredTypes.map((type: any) => {
                            const qtyInCart = cart.filter(r => r.room_type_id === type.id).length;
                            const availableCount = type.rooms.length;
                            const sampleRoom = type.rooms[0] || {}; 

                            return (
                                <Card key={type.id} className={`border ${qtyInCart > 0 ? 'border-[#b3282d]' : 'border-gray-200'} shadow-sm rounded-sm overflow-hidden flex flex-col sm:flex-row transition-colors`}>
                                    
                                    <div className="w-full sm:w-2/5 h-48 sm:h-auto bg-gray-200 relative">
                                        {type.image || sampleRoom.image ? (
                                            <img src={type.image || sampleRoom.image} alt={type.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">Sin Imagen</div>
                                        )}
                                        {qtyInCart > 0 && (
                                            <div className="absolute top-2 left-2 bg-[#b3282d] text-white px-2 py-1 text-xs font-bold rounded shadow">
                                                {qtyInCart} Seleccionada(s)
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-xl font-bold text-[#1e3a5f] uppercase tracking-wide">{type.name}</h3>
                                                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-sm font-bold">
                                                    Quedan {availableCount}
                                                </span>
                                            </div>
                                            
                                            <p className="text-sm text-gray-500 mt-2 flex items-center">
                                                <Users className="w-4 h-4 mr-1.5" /> Capacidad: {sampleRoom.capacity || '?'} persona(s)
                                            </p>

                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <span className="flex items-center text-xs text-gray-600">
                                                    <Wifi className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" /> Wi-Fi
                                                </span>
                                                <span className="flex items-center text-xs text-gray-600">
                                                    <Tv className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" /> TV Cable
                                                </span>
                                                {sampleRoom.bath === 'Privado' && (
                                                    <span className="flex items-center text-xs text-gray-600">
                                                        <Flame className="w-3.5 h-3.5 mr-1 text-orange-500" /> Calefacción
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-6 flex justify-between items-end border-t border-gray-100 pt-4">
                                            <div>
                                                <p className="text-2xl font-bold text-[#b3282d]">Bs. {sampleRoom.price || '0.00'}</p>
                                                <p className="text-xs text-gray-400">por noche</p>
                                            </div>
                                            
                                            {/* REGLA C: CONTROL DE CANTIDAD CON RESTRICCIÓN DE EXCESO */}
                                            <div className="flex items-center border border-gray-300 rounded-sm h-10 overflow-hidden">
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveType(type)} 
                                                    disabled={qtyInCart === 0} 
                                                    className="w-10 h-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 border-r border-gray-300 text-gray-600 flex items-center justify-center transition-colors"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <div className="w-10 text-center text-sm text-gray-800 bg-white font-bold h-full flex items-center justify-center">
                                                    {qtyInCart}
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleAddType(type)} 
                                                    // EL BOTÓN "+" SE BLOQUEA SI: 1) Ya eligió todas las de ese tipo o 2) Ya asignó a todos los huéspedes
                                                    disabled={qtyInCart >= availableCount || pendingGuests === 0} 
                                                    className="w-10 h-full bg-[#1e3a5f] hover:bg-[#152a46] disabled:bg-gray-300 text-white disabled:text-gray-500 flex items-center justify-center transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>

                                        </div>
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* COLUMNA 3: RESUMEN (CARRITO) */}
                <div className="lg:col-span-1">
                    <Card className="border border-gray-300 shadow-md rounded-sm sticky top-24 bg-gray-50/50">
                        <CardContent className="p-5">
                            <h3 className="font-bold text-[#1e3a5f] mb-4 flex items-center border-b border-gray-200 pb-3">
                                <CheckCircle2 className="w-5 h-5 mr-2 text-[#b3282d]" /> Resumen Asignación
                            </h3>
                            
                            <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-sm border border-gray-200">
                                <span className="text-sm font-medium text-gray-600">Huéspedes:</span>
                                <span className="font-bold text-gray-800">{totalGuests}</span>
                            </div>

                            {/* REGLA C: EL CONTADOR CAMBIA A VERDE Y BLOQUEA EXCESOS */}
                            <div className={`flex justify-between items-center mb-6 p-3 rounded-sm border transition-colors ${pendingGuests === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                <span className="text-sm font-medium">{pendingGuests === 0 ? '¡Completado!' : 'Por asignar:'}</span>
                                <span className="font-bold">{pendingGuests === 0 ? '0' : pendingGuests}</span>
                            </div>

                            <div className="space-y-3 mb-6 min-h-[100px]">
                                {cart.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center italic py-4">Aún no has agregado habitaciones.</p>
                                ) : (
                                    cart.map((selectedRoom, index) => (
                                        <div key={`cart-${index}`} className="flex justify-between items-center bg-white p-3 border border-gray-200 rounded-sm shadow-sm border-l-4 border-l-[#b3282d]">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700">{selectedRoom.typeName || 'Habitación'}</p>
                                                <p className="text-xs text-gray-500">Cap. {selectedRoom.capacity || 0} pax</p>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveFromCart(index)} 
                                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <Button 
                                onClick={handleNext}
                                disabled={pendingGuests > 0}
                                className="w-full bg-[#b3282d] hover:bg-[#921f24] text-white rounded-sm h-11 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                {pendingGuests > 0 ? 'Faltan huéspedes' : 'Continuar al registro'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}