
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../App';
import { getAllUserTrips } from '../services/api';
import { Trip } from '../types';
import { Skeleton } from './common';
import { CalendarIcon, ChevronLeftIcon } from './Icons';

const TripCard: React.FC<{ trip: Trip }> = ({ trip }) => {
    const navigate = useNavigate();
    const date = trip.createdAt?.toDate();
    const formattedDate = date ? new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date) : '...';

    const formattedTime = date ? new Intl.DateTimeFormat('ar-EG', {
        hour: 'numeric',
        minute: 'numeric'
    }).format(date) : '...';

    return (
        <button 
            onClick={() => navigate(`/trip-details?id=${trip.id}`)}
            className="w-full text-right bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
        >
            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl">
                {trip.vehicleType === 'car' ? '🚗' : trip.vehicleType === 'motorcycle' ? '🏍️' : '🛵'}
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="font-bold truncate">{trip.dropoff.address || 'وجهة غير معروفة'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formattedDate} - {formattedTime}</p>
            </div>
            <div className="flex-shrink-0 text-left">
                <p className="font-bold text-lg">{trip.finalPrice || trip.price || '...'} ج</p>
                <ChevronLeftIcon />
            </div>
        </button>
    );
};

export default function TripsPage() {
    const user = useAuth();
    const showToast = useToast();
    const navigate = useNavigate();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const fetchTrips = async () => {
            setLoading(true);
            try {
                const userTrips = await getAllUserTrips(user.uid);
                setTrips(userTrips);
            } catch (error) {
                console.error("Failed to fetch trips:", error);
                showToast('فشل تحميل الرحلات', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchTrips();
    }, [user, navigate, showToast]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">رحلاتي</h1>
            {loading ? (
                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} type="card" />)}
                </div>
            ) : trips.length > 0 ? (
                <div className="space-y-4">
                    {trips.map(trip => <TripCard key={trip.id} trip={trip} />)}
                </div>
            ) : (
                <div className="text-center py-16">
                    <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <CalendarIcon />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold">لا توجد رحلات بعد</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">تبدو رحلتك الأولى على بعد نقرة واحدة!</p>
                    <button onClick={() => navigate('/trip')} className="mt-6 bg-[--brand-green] text-black font-bold py-2 px-6 rounded-full">
                        اطلب رحلة الآن
                    </button>
                </div>
            )}
        </div>
    );
}
