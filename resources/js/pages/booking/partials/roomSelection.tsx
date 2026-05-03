import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Wifi, Tv, Flame, Bath, Trash2, Users, CheckCircle2, Plus, Minus } from 'lucide-react';
import { usePage } from '@inertiajs/react'; 

export default function RoomSelection({ bookingData, setBookingData, onNext, onBack }: any) {
    
    const pageProps = usePage().props as any;
    
    // Función para garantizar que siempre tengamos un Array de habitaciones
    const getRoomsArray = (roomsData: any) => {
        if (!roomsData) return [];
        if (Array.isArray(roomsData)) return roomsData;
        if (roomsData['Illuminate\\Support\\Collection']) return roomsData['Illuminate\\Support\\Collection'];
        return Object.values(roomsData);
    };

    const rawAvailableRoomTypes = pageProps.bookingData?.availableRooms || pageProps.availableRoomTypes || [];
    const totalGuests = Number(bookingData.guests) || Number(pageProps.bookingData?.guests) || 1;

    // Estados
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('Todos');
    const [filtroBano, setFiltroBano] = useState('Todos');
    const [cart, setCart] = useState<any[]>(bookingData.selectedRooms || []);

    // Matemáticas del Carrito
    const assignedGuests = cart.reduce((total, room) => total + (Number(room.capacity) || Number(room.capacidad) || 0), 0);
    const pendingGuests = Math.max(0, totalGuests - assignedGuests);
    const isCompleted = pendingGuests === 0;

    // ==========================================
    // 🧠 EL NUEVO SÚPER MOTOR DE FILTRADO
    // ==========================================
    // Filtramos las habitaciones "por dentro" de cada categoría dependiendo del baño elegido
    const availableRoomTypes = rawAvailableRoomTypes.map((type: any) => {
        const typeCopy = { ...type };
        let roomsList = getRoomsArray(typeCopy.rooms);

        // Si el usuario eligió un baño específico, borramos de la lista interna las que no coincidan
        if (filtroBano !== 'Todos') {
            roomsList = roomsList.filter((room: any) => {
                const rawBath = String(room.bath || room.bathroom_type || '').toLowerCase();
                const isShared = rawBath === 'shared' || rawBath === 'compartido';
                const normalizedBath = isShared ? 'compartido' : 'privado';
                
                return normalizedBath === filtroBano.toLowerCase();
            });
        }
        
        typeCopy.rooms = roomsList;
        return typeCopy;
    }).filter((type: any) => {
        // Excluimos Salones y Familiares
        if (!type || !type.name) return false;
        const typeName = type.name.toLowerCase();
        if (typeName.includes('salón') || typeName.includes('salon') || typeName.includes('familiar')) return false;

        // Si después de aplicar el filtro de baño la categoría se quedó sin cuartos, la ocultamos
        if (type.rooms.length === 0) return false;

        return true;
    });

    // Filtro para los botones laterales
    const sidebarRoomTypes = availableRoomTypes.filter((type: any) => {
        const sampleRoom = type.rooms[0] || {};
        const roomCapacity = Number(sampleRoom.capacity) || Number(type.capacity) || 99;
        return roomCapacity <= pendingGuests;
    });

    // Filtro para la columna central
    const filteredTypes = availableRoomTypes.filter((type: any) => {
        if (isCompleted) return false; 
        
        const sampleRoom = type.rooms[0] || {};
        const roomCapacity = Number(sampleRoom.capacity) || Number(type.capacity) || 99; 
        
        const cumpleCapacidad = roomCapacity <= pendingGuests;
        const cumpleTipo = selectedTypeFilter === 'Todos' || type.name === selectedTypeFilter;

        return cumpleCapacidad && cumpleTipo;
    });

    // ==========================================
    // FUNCIONES DEL CARRITO
    // ==========================================
    const handleAddType = (type: any) => {
        const sampleRoom = type.rooms[0] || {};
        const capacity = Number(sampleRoom.capacity) || Number(type.capacity) || 99;
        
        if (isCompleted || capacity > pendingGuests) return;

        const typeRoomsInCart = cart.filter(r => r.room_type_id === type.id);
        if (typeRoomsInCart.length < type.rooms.length) {
            // Buscamos una habitación disponible que no esté en el carrito
            const roomToAdd = type.rooms.find((r: any) => !cart.some((cr: any) => cr.id === r.id));
            if (roomToAdd) {
                const priceValue = Number(roomToAdd.price) || Number(roomToAdd.precio) || 0;
                setCart([...cart, { ...roomToAdd, typeName: type.name, capacity: capacity, price: priceValue }]);
            }
        }
    };

    const handleRemoveType = (type: any) => {
        const reversedIndex = [...cart].reverse().findIndex(r => r.room_type_id === type.id);
        if (reversedIndex !== -1) {
            const actualIndex = cart.length - 1 - reversedIndex;
            const newCart = [...cart];
            newCart.splice(actualIndex, 1);
            setCart(newCart);
        }
    };

    const handleRemoveFromCart = (indexToRemove: number) => {
        setCart(cart.filter((_, index) => index !== indexToRemove));
    };

    const handleNext = () => {
        if (pendingGuests > 0) return alert(`Aún te falta asignar habitación para ${pendingGuests} huésped(es)`);
        setBookingData({ ...bookingData, selectedRooms: cart });
        onNext();
    };

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
                                <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">Tipo de Habitación</h3>
                                <div className="space-y-1.5">
                                    <button
                                        onClick={() => setSelectedTypeFilter('Todos')}
                                        className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ${
                                            selectedTypeFilter === 'Todos' ? 'bg-red-50 text-[#b3282d] font-medium border-l-2 border-[#b3282d]' : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
                                        }`}
                                    >
                                        Ver Todas
                                    </button>
                                    
                                    {sidebarRoomTypes.map((type: any) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setSelectedTypeFilter(type.name)}
                                            className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ${
                                                selectedTypeFilter === type.name ? 'bg-red-50 text-[#b3282d] font-medium border-l-2 border-[#b3282d]' : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
                                            }`}
                                        >
                                            {type.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6 border-t border-gray-100 pt-4">
                                <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider flex items-center">
                                    <Bath className="w-4 h-4 mr-2" /> Tipo de Baño
                                </h3>
                                <div className="space-y-1.5">
                                    {['Todos', 'Privado', 'Compartido'].map((opcion) => (
                                        <button
                                            key={opcion}
                                            onClick={() => setFiltroBano(opcion)}
                                            className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ${
                                                filtroBano === opcion ? 'bg-blue-50 text-[#1e3a5f] font-medium border-l-2 border-[#1e3a5f]' : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
                                            }`}
                                        >
                                            {opcion}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                </div>

                {/* COLUMNA 2: LISTA CENTRAL */}
                <div className="lg:col-span-2 space-y-4">
                    {isCompleted ? (
                        <div className="bg-green-50 border border-green-200 rounded-sm p-8 text-center text-green-700 font-medium flex flex-col items-center shadow-sm">
                            <CheckCircle2 className="w-12 h-12 mb-3 text-green-500" />
                            <p className="text-lg">¡Excelente!</p>
                            <p className="text-sm mt-1">Todos los huéspedes ({totalGuests}) han sido asignados.<br/>Puedes continuar con tu reserva en el panel derecho.</p>
                        </div>
                    ) : filteredTypes.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-sm p-8 text-center text-gray-500 shadow-sm">
                            No se encontraron habitaciones con los filtros actuales.
                        </div>
                    ) : (
                        filteredTypes.map((type: any) => {
                            const qtyInCart = cart.filter(r => r.room_type_id === type.id).length;
                            const availableCount = type.rooms.length;
                            
                            // Los datos representativos ahora son de la lista YA FILTRADA
                            const sampleRoom = type.rooms[0] || {}; 
                            const roomCapacity = Number(sampleRoom.capacity) || Number(type.capacity) || 1;
                            const roomPrice = Number(sampleRoom.price) || 0;
                            
                            const rawBath = String(sampleRoom.bath || '').toLowerCase();
                            const isShared = rawBath === 'shared' || rawBath === 'compartido';

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
                                    
                                    <div className="p-5 flex-1 flex flex-col justify-between bg-white">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-xl font-bold text-[#1e3a5f] uppercase tracking-wide">{type.name}</h3>
                                                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-sm font-bold">Quedan {availableCount}</span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-2 flex items-center"><Users className="w-4 h-4 mr-1.5" /> Capacidad: {roomCapacity} persona(s)</p>

                                            <div className="mt-4 flex flex-wrap gap-3">
                                                <span className="flex items-center text-xs text-gray-600">
                                                    <Wifi className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" /> Wi-Fi
                                                </span>
                                                <span className="flex items-center text-xs text-gray-600">
                                                    <Tv className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" /> TV Cable
                                                </span>
                                                {!isShared ? (
                                                    <span className="flex items-center text-xs text-gray-600">
                                                        <Bath className="w-3.5 h-3.5 mr-1 text-blue-500" /> Baño Privado
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center text-xs text-gray-600">
                                                        <Users className="w-3.5 h-3.5 mr-1 text-orange-500" /> Baño Compartido
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-6 flex justify-between items-end border-t border-gray-100 pt-4">
                                            <div>
                                                <p className="text-2xl font-bold text-[#b3282d]">Bs. {roomPrice.toFixed(2)}</p>
                                                <p className="text-xs text-gray-400">por noche</p>
                                            </div>
                                            
                                            <div className="flex items-center border border-gray-300 rounded-sm h-10 overflow-hidden shadow-sm">
                                                <button onClick={() => handleRemoveType(type)} disabled={qtyInCart === 0} className="w-10 h-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 border-r border-gray-300 text-gray-600 flex items-center justify-center transition-colors">
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <div className="w-10 text-center text-sm text-gray-800 bg-white font-bold h-full flex items-center justify-center">
                                                    {qtyInCart}
                                                </div>
                                                <button onClick={() => handleAddType(type)} disabled={qtyInCart >= availableCount || isCompleted || roomCapacity > pendingGuests} className="w-10 h-full bg-[#1e3a5f] hover:bg-[#152a46] disabled:bg-gray-300 text-white flex items-center justify-center transition-colors">
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
                            <h3 className="font-bold text-[#1e3a5f] mb-4 flex items-center border-b border-gray-200 pb-3"><CheckCircle2 className="w-5 h-5 mr-2 text-[#b3282d]" /> Resumen Asignación</h3>
                            
                            <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-sm border border-gray-200 shadow-sm">
                                <span className="text-sm font-medium text-gray-600">Total Huéspedes:</span>
                                <span className="font-bold text-gray-800">{totalGuests}</span>
                            </div>

                            <div className={`flex justify-between items-center mb-6 p-3 rounded-sm border shadow-sm ${isCompleted ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                <span className="text-sm font-medium">{isCompleted ? '¡Completado!' : 'Faltan ubicar:'}</span>
                                <span className="font-bold text-lg">{isCompleted ? '0' : pendingGuests}</span>
                            </div>

                            <div className="space-y-3 mb-6 min-h-[100px]">
                                {cart.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center italic py-4">Aún no has agregado habitaciones.</p>
                                ) : (
                                    cart.map((selectedRoom, index) => {
                                        const c = Number(selectedRoom.capacity) || 0;
                                        const p = Number(selectedRoom.price) || 0;
                                        
                                        return (
                                            <div key={`cart-${index}`} className="flex justify-between items-center bg-white p-3 border border-gray-200 rounded-sm shadow-sm border-l-4 border-l-[#b3282d]">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-700">{selectedRoom.typeName || 'Habitación'}</p>
                                                    <p className="text-xs text-gray-500">Cap. {c} pax | Bs. {p.toFixed(2)}</p>
                                                </div>
                                                <button onClick={() => handleRemoveFromCart(index)} className="text-gray-400 hover:text-red-600 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <Button onClick={handleNext} disabled={!isCompleted} className="w-full bg-[#b3282d] hover:bg-[#921f24] text-white rounded-sm h-11 disabled:opacity-50 transition-all shadow-sm">
                                {isCompleted ? 'Continuar al registro' : 'Asigna todas las camas'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}