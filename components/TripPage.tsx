
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { useAuth, useToast } from '../App';
import { getCurrentLocation, reverseGeocode, searchLocations, createTrip } from '../services/api';
import { Location, VehicleType, VehicleOption } from '../types';
import { PRICING_CONFIG } from '../constants';
import { ChevronLeftIcon } from './Icons';
import { Spinner } from './common';

// --- LEAFLET ICONS FIX ---
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


// --- MAP COMPONENT ---
interface MapComponentProps {
    pickup: Location | null;
    dropoff: Location | null;
    onMapReady: (map: L.Map) => void;
    onRouteFound: (summary: L.Routing.RouteSummary) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ pickup, dropoff, onMapReady, onRouteFound }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const routingControlRef = useRef<L.Routing.Control | null>(null);
    const pickupMarkerRef = useRef<L.Marker | null>(null);
    const dropoffMarkerRef = useRef<L.Marker | null>(null);

    useEffect(() => {
        if (mapRef.current && !mapInstance.current) {
            const map = L.map(mapRef.current, {
                zoomControl: false,
                attributionControl: false,
            }).setView([30.0444, 31.2357], 13);
            
            const mapStyle = document.documentElement.classList.contains('dark') ? 'dark_all' : 'light_all';
            L.tileLayer(`https://{s}.basemaps.cartocdn.com/${mapStyle}/{z}/{x}/{y}{r}.png`, {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19,
                // @ts-ignore
                r: L.Browser.retina ? '@2x' : ''
            }).addTo(map);

            L.control.zoom({ position: 'bottomright' }).addTo(map);
            mapInstance.current = map;
            onMapReady(map);
        }
    }, [onMapReady]);

    useEffect(() => {
        const map = mapInstance.current;
        if (!map) return;

        if (pickup) {
            if (!pickupMarkerRef.current) {
                pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng]).addTo(map);
            } else {
                pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
            }
        } else if (pickupMarkerRef.current) {
            map.removeLayer(pickupMarkerRef.current);
            pickupMarkerRef.current = null;
        }

        if (dropoff) {
            if (!dropoffMarkerRef.current) {
                dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng]).addTo(map);
            } else {
                dropoffMarkerRef.current.setLatLng([dropoff.lat, dropoff.lng]);
            }
        } else if (dropoffMarkerRef.current) {
            map.removeLayer(dropoffMarkerRef.current);
            dropoffMarkerRef.current = null;
        }

        if (pickup && dropoff) {
            if (routingControlRef.current) {
                map.removeControl(routingControlRef.current);
            }
            routingControlRef.current = L.Routing.control({
                waypoints: [
                    L.latLng(pickup.lat, pickup.lng),
                    L.latLng(dropoff.lat, dropoff.lng)
                ],
                routeWhileDragging: false,
                addWaypoints: false,
                draggableWaypoints: false,
                show: false,
                lineOptions: {
                    styles: [{ color: '#ADFF2F', opacity: 1, weight: 5 }]
                } as any
            }).addTo(map);
            
            routingControlRef.current.on('routesfound', function(e) {
                const routes = e.routes;
                if (routes.length > 0) {
                     map.fitBounds(routes[0].bounds, {padding: [50, 50]});
                     onRouteFound(routes[0].summary);
                }
            });

        } else if (routingControlRef.current) {
            map.removeControl(routingControlRef.current);
            routingControlRef.current = null;
        } else if (pickup) {
            map.setView([pickup.lat, pickup.lng], 15);
        }

    }, [pickup, dropoff, onRouteFound]);

    return <div id="map" ref={mapRef} className="h-screen w-full fixed top-0 left-0 z-10" />;
};


// --- UI SUB-COMPONENTS ---
const SearchResults: React.FC<{
    results: Location[];
    isLoading: boolean;
    onSelect: (location: Location) => void;
}> = ({ results, isLoading, onSelect }) => {
    if (isLoading) {
        return <div className="p-4 text-center text-gray-500">جاري البحث...</div>;
    }
    if (results.length === 0) {
        return null;
    }
    return (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-white dark:bg-gray-700 shadow-inner">
            <ul className="divide-y divide-gray-200 dark:divide-gray-600">
                {results.map((result, index) => (
                    <li key={index}>
                        <button onClick={() => onSelect(result)} className="w-full text-right p-3 hover:bg-gray-100 dark:hover:bg-gray-600">
                            <p className="font-medium text-sm truncate">{result.address?.split(',')[0]}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.address}</p>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const LocationOverlay: React.FC<{
    pickup: Location | null;
    dropoff: Location | null;
    onPickupChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDropoffChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFocus: (type: 'pickup' | 'dropoff') => void;
    searchResults: Location[];
    isSearching: boolean;
    onSelectSearchResult: (location: Location) => void;
}> = ({ pickup, dropoff, onPickupChange, onDropoffChange, onFocus, searchResults, isSearching, onSelectSearchResult }) => (
    <div id="locationOverlay" className="fixed top-[75px] left-4 right-4 max-w-md mx-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-4 rounded-2xl shadow-lg z-20">
        <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1 mt-2.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[--brand-green] ring-2 ring-white dark:ring-gray-800"></div>
                <div className="w-px h-10 bg-gray-300 dark:bg-gray-600"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-black dark:bg-white ring-2 ring-white dark:ring-gray-800"></div>
            </div>
            <div className="flex-1 space-y-2.5">
                 <input type="text" placeholder="من أين؟" value={pickup?.address || ''} onChange={onPickupChange} onFocus={() => onFocus('pickup')} className="w-full bg-gray-100 dark:bg-gray-700 p-2.5 rounded-lg border-2 border-transparent focus:border-[--brand-green] focus:bg-white dark:focus:bg-gray-800 outline-none transition" autoComplete="off" />
                 <input type="text" placeholder="إلى أين؟" value={dropoff?.address || ''} onChange={onDropoffChange} onFocus={() => onFocus('dropoff')} className="w-full bg-gray-100 dark:bg-gray-700 p-2.5 rounded-lg border-2 border-transparent focus:border-[--brand-green] focus:bg-white dark:focus:bg-gray-800 outline-none transition" autoComplete="off" />
            </div>
        </div>
         <SearchResults results={searchResults} isLoading={isSearching} onSelect={onSelectSearchResult} />
    </div>
);

const VehicleSelection: React.FC<{
    onSelectVehicle: (type: VehicleType) => void,
    selectedVehicle: VehicleType | null,
    onConfirm: () => void,
    isConfirming: boolean,
    routeSummary: L.Routing.RouteSummary | null,
}> = ({ onSelectVehicle, selectedVehicle, onConfirm, isConfirming, routeSummary }) => {
    
    const calculatePrice = (vehicle: VehicleOption): number => {
        if (!routeSummary) return vehicle.minFare;
        const distanceKm = routeSummary.totalDistance / 1000;
        const durationMin = routeSummary.totalTime / 60;
        const price = vehicle.baseFare + (distanceKm * vehicle.perKm) + (durationMin * vehicle.perMin);
        return Math.max(price, vehicle.minFare);
    };

    return (
        <div>
            <h3 className="text-xl font-bold text-center mb-4">اختر مركبة</h3>
            <div className="space-y-3">
                {Object.values(PRICING_CONFIG).map(vehicle => {
                    const estimatedPrice = calculatePrice(vehicle);
                    return (
                        <button key={vehicle.id} onClick={() => onSelectVehicle(vehicle.id)} className={`w-full flex items-center gap-4 p-3 rounded-xl border-2 transition ${selectedVehicle === vehicle.id ? 'border-[--brand-green] bg-lime-50 dark:bg-lime-900/50' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'}`}>
                            <span className="text-4xl">{vehicle.icon}</span>
                            <div className="text-right">
                                <p className="font-bold text-lg">{vehicle.name}</p>
                                <p className="text-sm text-gray-500">{Math.round(routeSummary ? routeSummary.totalTime / 60 : 0)} دقيقة</p>
                            </div>
                            <div className="ms-auto text-left">
                                <p className="font-bold text-lg">~{Math.round(estimatedPrice)} ج</p>
                                <p className="text-sm text-gray-500">تقريبي</p>
                            </div>
                        </button>
                    )
                })}
            </div>
            <button onClick={onConfirm} disabled={!selectedVehicle || isConfirming} className="w-full mt-6 bg-[--brand-green] text-black font-bold py-4 rounded-xl text-lg disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isConfirming ? <Spinner/> : null}
                {isConfirming ? 'جاري التأكيد...' : 'تأكيد الطلب'}
            </button>
        </div>
    );
};


// --- MAIN PAGE COMPONENT ---

export default function TripPage() {
    const user = useAuth();
    const showToast = useToast();
    const navigate = useNavigate();

    const [pickup, setPickup] = useState<Location | null>(null);
    const [dropoff, setDropoff] = useState<Location | null>(null);
    const [map, setMap] = useState<L.Map | null>(null);
    const [rideStatus, setRideStatus] = useState<'idle' | 'selectingVehicle' | 'searching' | 'inProgress' | 'completed'>('idle');
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    
    const [routeSummary, setRouteSummary] = useState<L.Routing.RouteSummary | null>(null);
    const [activeInput, setActiveInput] = useState<'pickup' | 'dropoff' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Location[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMapReady = useCallback((mapInstance: L.Map) => setMap(mapInstance), []);
    const handleRouteFound = useCallback((summary: L.Routing.RouteSummary) => setRouteSummary(summary), []);

    useEffect(() => {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        if (searchQuery.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        debounceTimeoutRef.current = setTimeout(async () => {
            const results = await searchLocations(searchQuery);
            setSearchResults(results);
            setIsSearching(false);
        }, 500);

        return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
    }, [searchQuery]);


    useEffect(() => {
        const prefillPickup = sessionStorage.getItem('prefillPickup');
        if (prefillPickup) {
            const loc = JSON.parse(prefillPickup) as Location;
            reverseGeocode(loc.lat, loc.lng).then(address => setPickup({ ...loc, address }));
            sessionStorage.removeItem('prefillPickup');
        }

        const prefillDestination = sessionStorage.getItem('prefillDestination');
        if (prefillDestination) {
            const loc = JSON.parse(prefillDestination) as Location;
            setDropoff(loc); // Address might be included already
            if (!loc.address) {
                reverseGeocode(loc.lat, loc.lng).then(address => setDropoff({ ...loc, address }));
            }
            sessionStorage.removeItem('prefillDestination');
        }
    }, []);

    useEffect(() => {
        if (!pickup) {
            getCurrentLocation()
                .then(pos => reverseGeocode(pos.coords.latitude, pos.coords.longitude).then(address => setPickup({ lat: pos.coords.latitude, lng: pos.coords.longitude, address })))
                .catch(() => showToast('لم نتمكن من تحديد موقعك', 'error'));
        }
    }, [pickup, showToast]);

    useEffect(() => {
        if (pickup && dropoff && pickup.address && dropoff.address) {
            setRideStatus('selectingVehicle');
        } else {
            setRideStatus('idle');
        }
    }, [pickup, dropoff]);

    const handlePickupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newAddress = e.target.value;
        setPickup(p => (p ? { ...p, address: newAddress } : { lat: 0, lng: 0, address: newAddress }));
        setSearchQuery(newAddress);
    };

    const handleDropoffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newAddress = e.target.value;
        setDropoff(d => (d ? { ...d, address: newAddress } : { lat: 0, lng: 0, address: newAddress }));
        setSearchQuery(newAddress);
    };
    
    const handleFocus = (type: 'pickup' | 'dropoff') => {
        setActiveInput(type);
        setSearchQuery(type === 'pickup' ? pickup?.address || '' : dropoff?.address || '');
        setSearchResults([]);
    };
    
    const handleSelectSearchResult = (location: Location) => {
        if (activeInput === 'pickup') setPickup(location);
        else if (activeInput === 'dropoff') setDropoff(location);
        setSearchResults([]);
        setSearchQuery('');
        setActiveInput(null);
    };


    const handleConfirmRequest = async () => {
        if (!user) {
            showToast('الرجاء تسجيل الدخول أولاً', 'error');
            navigate('/login');
            return;
        }
        if (!pickup || !dropoff || !selectedVehicle || !routeSummary) {
            showToast('الرجاء تحديد نقطة الانطلاق والوجهة والمركبة', 'error');
            return;
        }

        setIsConfirming(true);
        try {
            const vehicleConfig = PRICING_CONFIG[selectedVehicle];
            const distanceKm = routeSummary.totalDistance / 1000;
            const durationMin = routeSummary.totalTime / 60;
            const price = vehicleConfig.baseFare + (distanceKm * vehicleConfig.perKm) + (durationMin * vehicleConfig.perMin);
            const finalPrice = Math.max(price, vehicleConfig.minFare);

            await createTrip({
                userId: user.uid,
                pickup,
                dropoff,
                vehicleType: selectedVehicle,
                price: parseFloat(finalPrice.toFixed(2)),
            });
            showToast(`جاري البحث عن ${PRICING_CONFIG[selectedVehicle].name}...`, 'info');
            setRideStatus('searching');
        } catch (error) {
            console.error("Failed to create trip:", error);
            showToast('فشل في طلب الرحلة. حاول مرة أخرى.', 'error');
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <div className="h-screen w-screen overflow-hidden">
            <MapComponent pickup={pickup} dropoff={dropoff} onMapReady={handleMapReady} onRouteFound={handleRouteFound} />

            <header className="fixed top-0 left-0 right-0 z-20 p-4">
                <button onClick={() => rideStatus === 'idle' || rideStatus === 'selectingVehicle' ? navigate('/') : setRideStatus('selectingVehicle')} className="w-10 h-10 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-md">
                   <ChevronLeftIcon />
                </button>
            </header>

            {rideStatus === 'idle' && (
                <LocationOverlay 
                    pickup={pickup} 
                    dropoff={dropoff}
                    onPickupChange={handlePickupChange}
                    onDropoffChange={handleDropoffChange}
                    onFocus={handleFocus}
                    searchResults={activeInput ? searchResults : []}
                    isSearching={isSearching}
                    onSelectSearchResult={handleSelectSearchResult}
                />
            )}

            {rideStatus !== 'idle' && (
                <div className="fixed bottom-0 left-0 right-0 z-20">
                    <div className="bg-white dark:bg-gray-800 p-4 pt-2 rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
                       <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3"></div>
                        
                        {rideStatus === 'selectingVehicle' && (
                           <VehicleSelection 
                                onSelectVehicle={setSelectedVehicle} 
                                selectedVehicle={selectedVehicle} 
                                onConfirm={handleConfirmRequest} 
                                isConfirming={isConfirming}
                                routeSummary={routeSummary}
                            />
                        )}

                        {rideStatus === 'searching' && (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[--brand-green] mx-auto"></div>
                                <h3 className="text-xl font-bold mt-4">جاري البحث عن سائق...</h3>
                                <p className="text-gray-500">سيتم إعلامك عند العثور على سائق</p>
                            </div>
                        )}
                        
                    </div>
                </div>
            )}
        </div>
    );
}
