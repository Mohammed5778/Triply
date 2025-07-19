
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { useAuth, useToast } from '../App';
import { getTripById } from '../services/api';
import { Location, Trip } from '../types';
import { Spinner } from './common';
import { ChevronLeftIcon } from './Icons';

// --- LEAFLET ICONS FIX ---
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const StaticMap: React.FC<{ pickup: Location; dropoff: Location }> = ({ pickup, dropoff }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);

    useEffect(() => {
        if (mapRef.current && !mapInstance.current) {
            const map = L.map(mapRef.current, {
                zoomControl: false,
                attributionControl: false,
                dragging: false,
                scrollWheelZoom: false,
                doubleClickZoom: false,
            }).setView([30.0444, 31.2357], 13);

            const mapStyle = document.documentElement.classList.contains('dark') ? 'dark_all' : 'light_all';
            L.tileLayer(`https://{s}.basemaps.cartocdn.com/${mapStyle}/{z}/{x}/{y}{r}.png`, { maxZoom: 19 }).addTo(map);
            
            mapInstance.current = map;
            
            const routingControl = L.Routing.control({
                waypoints: [L.latLng(pickup.lat, pickup.lng), L.latLng(dropoff.lat, dropoff.lng)],
                addWaypoints: false,
                lineOptions: { styles: [{ color: '#ADFF2F', opacity: 1, weight: 5 }] } as any,
                createMarker: () => null // No default markers
            }).addTo(map);

            routingControl.on('routesfound', function(e) {
                if (e.routes.length > 0) {
                    map.fitBounds(e.routes[0].bounds, { padding: [50, 50] });
                    // Add custom markers
                    L.marker([pickup.lat, pickup.lng]).addTo(map);
                    L.marker([dropoff.lat, dropoff.lng]).addTo(map);
                }
            });
        }
    }, [pickup, dropoff]);

    return <div id="map" ref={mapRef} className="h-full w-full" />;
};


export default function TripDetailsPage() {
    const user = useAuth();
    const showToast = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const tripId = searchParams.get('id');
        if (!user) {
            navigate('/login');
            return;
        }
        if (!tripId) {
            showToast('لم يتم العثور على الرحلة', 'error');
            navigate('/trips');
            return;
        }

        const fetchTrip = async () => {
            setLoading(true);
            try {
                const tripData = await getTripById(tripId);
                if (tripData) {
                    setTrip(tripData);
                } else {
                    showToast('لا يمكن العثور على تفاصيل الرحلة', 'error');
                    navigate('/trips');
                }
            } catch (error) {
                console.error("Failed to fetch trip details:", error);
                showToast('فشل تحميل تفاصيل الرحلة', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchTrip();
    }, [user, searchParams, navigate, showToast]);

    if (loading || !trip) {
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <Spinner />
            </div>
        );
    }
    
    const date = trip.createdAt?.toDate();
    const formattedDate = date ? new Intl.DateTimeFormat('ar-EG', { dateStyle: 'full' }).format(date) : '';
    const formattedTime = date ? new Intl.DateTimeFormat('ar-EG', { timeStyle: 'short' }).format(date) : '';

    return (
        <div className="h-screen w-screen flex flex-col">
            <header className="absolute top-0 left-0 right-0 z-20 p-4">
                <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-md">
                   <ChevronLeftIcon />
                </button>
            </header>
            
            <div className="flex-1 relative">
                <StaticMap pickup={trip.pickup} dropoff={trip.dropoff} />
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-10">
                <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4"></div>
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold">تفاصيل الرحلة</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formattedDate} - {formattedTime}</p>
                    </div>
                    <div className="text-left">
                        <p className="text-2xl font-bold">{trip.finalPrice || trip.price || '--'} ج</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">الإجمالي</p>
                    </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-5 h-5 mt-1 rounded-full bg-[--brand-green] flex-shrink-0"></div>
                        <p className="font-medium">{trip.pickup.address}</p>
                    </div>
                     <div className="flex items-start gap-3">
                        <div className="w-5 h-5 mt-1 rounded-full bg-black dark:bg-white flex-shrink-0"></div>
                        <p className="font-medium">{trip.dropoff.address}</p>
                    </div>
                </div>
                
                {trip.driverInfo && (
                    <>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                        <div className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg flex items-center justify-between">
                            <div>
                               <p className="font-bold">{trip.driverInfo.name}</p>
                               <p className="text-sm text-gray-600 dark:text-gray-300">{trip.driverInfo.vehicle.model} - {trip.driverInfo.vehicle.plate}</p>
                            </div>
                             <div className="text-2xl">
                               {trip.vehicleType === 'car' ? '🚗' : trip.vehicleType === 'motorcycle' ? '🏍️' : '🛵'}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
