import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Wifi, Tv, Flame, Bath, Trash2, Users, CheckCircle2 } from 'lucide-react';

export default function RoomSelection({ bookingData, setBookingData, onNext, onBack }: any) {
    
    // 1. OBTENEMOS LAS HABITACIONES DE LARAVEL (Vienen del Paso 1)
    const allRooms = bookingData.availableRooms || [];

    // Estados para los filtros y el carrito
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('Todos');
    const [selectedBathFilter, setSelectedBathFilter] = useState('Todos');
    
    // Inicializamos el carrito con las habitaciones que ya haya seleccionado (si retrocedió)
    const [cart, setCart] = useState<any[]>(bookingData.selectedRooms || []);

    // 2. LÓGICA DE ASIGNACIÓN (El carrito)
    const totalGuests = bookingData.guests;
    // Sumamos la capacidad de todas las habitaciones en el carrito
    const assignedGuests = cart.reduce((total, room) => total + room.capacity, 0);
    // Calculamos cuántos faltan (nunca menor a 0)
    const pendingGuests = Math.max(0, totalGuests - assignedGuests);

    const handleAddRoom = (room: any) => {
        setCart([...cart, room]);
    };

    const handleRemoveRoom = (indexToRemove: number) => {
        setCart(cart.filter((_, index) => index !== indexToRemove));
    };

    // Guardar en el estado global y avanzar al Paso 3
    const handleNext = () => {
        if (pendingGuests > 0) {
            alert(`Aún te falta asignar habitación para ${pendingGuests} huésped(es)`);
            return;
        }
        setBookingData({ ...bookingData, selectedRooms: cart });
        onNext();
    };

    // 3. FILTRADO DOBLE (Tipo de Habitación + Tipo de Baño)
    const filteredRooms = allRooms.filter((room: any) => {
        const matchType = selectedTypeFilter === 'Todos' || room.type === selectedTypeFilter;
        const matchBath = selectedBathFilter === 'Todos' || room.bath === selectedBathFilter;
        return matchType && matchBath;
    });

    return (
        <div className="w-full">
            <div className="flex items-center mb-6">
                <Button variant="ghost" onClick={onBack} className="text-gray-500 hover:text-gray-800 mr-2 px-2">
                    <ArrowLeft className="w-5 h-5 mr-2" /> Volver a buscar
                </Button>
                <h2 className="text-2xl font-bold text-[#1e3a5f]">Selección de Habitaciones</h2>
            </div>

            {/* LAYOUT DE 3 COLUMNAS */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* COLUMNA 1: FILTROS */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border border-gray-200 shadow-sm rounded-sm sticky top-24">
                        <CardContent className="p-5">
                            
                            {/* Filtro 1: Tipo de Habitación */}
                            <div className="mb-6">
                                <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">TIPO DE HABITACIÓN</h3>
                                <div className="space-y-1.5">
                                    {['Todos', 'Simple', 'Matrimonial', 'Doble'].map(filter => (
                                        <button
                                            key={filter}
                                            onClick={() => setSelectedTypeFilter(filter)}
                                            className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ${
                                                selectedTypeFilter === filter 
                                                ? 'bg-red-50 text-[#b3282d] font-medium border-l-2 border-[#b3282d]' 
                                                : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
                                            }`}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-gray-200 w-full mb-6"></div>

                            {/* Filtro 2: Tipo de Baño */}
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">TIPO DE BAÑO</h3>
                                <div className="space-y-1.5">
                                    {['Todos', 'Privado', 'Compartido'].map(filter => (
                                        <button
                                            key={filter}
                                            onClick={() => setSelectedBathFilter(filter)}
                                            className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ${
                                                selectedBathFilter === filter 
                                                ? 'bg-red-50 text-[#b3282d] font-medium border-l-2 border-[#b3282d]' 
                                                : 'text-gray-600 hover:bg-gray-50 border-l-2 border-transparent'
                                            }`}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                </div>

                {/* COLUMNA 2: LISTA DE HABITACIONES */}
                <div className="lg:col-span-2 space-y-4">
                    {filteredRooms.length === 0 ? (
                        <div className="bg-white border border-gray-200 rounded-sm p-8 text-center text-gray-500">
                            No se encontraron habitaciones disponibles con esos filtros para las fechas seleccionadas.
                        </div>
                    ) : (
                        filteredRooms.map((room: any) => (
                            <Card key={room.id} className="border border-gray-200 shadow-sm rounded-sm overflow-hidden flex flex-col sm:flex-row">
                                {/* Imagen a la izquierda */}
                                <div className="w-full sm:w-2/5 h-48 sm:h-auto bg-gray-200">
                                    {room.image ? (
                                        <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">Sin Imagen</div>
                                    )}
                                </div>
                                
                                {/* Detalles a la derecha */}
                                <div className="p-5 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-lg font-bold text-gray-800">{room.name}</h3>
                                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-sm font-medium">
                                                {room.type}
                                            </span>
                                        </div>
                                        
                                        <p className="text-sm text-gray-500 mt-1 flex items-center">
                                            <Users className="w-4 h-4 mr-1.5" /> Capacidad: {room.capacity} persona(s)
                                        </p>

                                        {/* Servicios Dinámicos */}
                                        <div className="mt-4 flex flex-wrap gap-3">
                                            <span className="flex items-center text-xs text-gray-600">
                                                <Wifi className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" /> Wi-Fi
                                            </span>
                                            <span className="flex items-center text-xs text-gray-600">
                                                <Tv className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" /> TV Cable
                                            </span>
                                            <span className="flex items-center text-xs text-gray-600">
                                                <Bath className="w-3.5 h-3.5 mr-1 text-[#1e3a5f]" /> Baño {room.bath}
                                            </span>
                                            {/* Calefacción solo si el baño es privado */}
                                            {room.bath === 'Privado' && (
                                                <span className="flex items-center text-xs text-gray-600">
                                                    <Flame className="w-3.5 h-3.5 mr-1 text-orange-500" /> Calefacción
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-between items-end border-t border-gray-100 pt-4">
                                        <div>
                                            <p className="text-2xl font-bold text-[#b3282d]">Bs. {room.price}</p>
                                            <p className="text-xs text-gray-400">por noche</p>
                                        </div>
                                        <Button 
                                            onClick={() => handleAddRoom(room)}
                                            className="bg-[#1e3a5f] hover:bg-[#152a46] text-white rounded-sm px-6 shadow-sm"
                                        >
                                            Agregar
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                {/* COLUMNA 3: RESUMEN DE ASIGNACIÓN (El Carrito) */}
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

                            <div className={`flex justify-between items-center mb-6 p-3 rounded-sm border ${pendingGuests === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                <span className="text-sm font-medium">Por asignar:</span>
                                <span className="font-bold">{pendingGuests}</span>
                            </div>

                            {/* Habitaciones seleccionadas en el carrito */}
                            <div className="space-y-3 mb-6 min-h-[100px]">
                                {cart.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center italic py-4">Aún no has agregado habitaciones.</p>
                                ) : (
                                    cart.map((selectedRoom, index) => (
                                        <div key={index} className="flex justify-between items-center bg-white p-3 border border-gray-200 rounded-sm shadow-sm border-l-4 border-l-[#b3282d]">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700">{selectedRoom.name}</p>
                                                <p className="text-xs text-gray-500">Cap. {selectedRoom.capacity} pax | Baño {selectedRoom.bath}</p>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveRoom(index)} 
                                                className="text-red-400 hover:text-red-600 transition-colors p-1"
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