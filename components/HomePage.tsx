
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../App';
import { getRecentTrips, getSavedPlaces, getSmartSuggestions, getCurrentLocation, listenForActiveRide } from '../services/api';
import { Trip, Place, Suggestion, Location } from '../types';
import { PLACE_ICONS } from '../constants';
import { QuickActionButton, SmartSuggestionButton, Skeleton } from './common';
import { ArrowRightIcon, DocumentReportIcon } from './Icons';

const ActiveRideIndicator: React.FC<{ ride: Trip }> = ({ ride }) => {
    const navigate = useNavigate();
    const getStatusText = () => {
        switch (ride.status) {
            case 'searching': return 'جاري البحث عن سائق...';
            case 'accepted': return `السائق في الطريق ${ride.driverInfo?.eta ? `(${ride.driverInfo.eta}د)` : ''}`;
            case 'arrived': return 'السائق وصل';
            case 'started': return 'الرحلة جارية';
            default: return 'رحلة نشطة';
        }
    };
    return (
        <div className="fixed bottom-24 left-4 right-4 bg-[--brand-green] text-black p-3 rounded-xl shadow-lg z-40 animate-fade-in-up">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="font-medium text-sm">رحلة نشطة</div>
                    <div className="text-xs">{getStatusText()}</div>
                </div>
                <button onClick={() => navigate(`/trip?rideId=${ride.id}`)} className="px-4 py-1.5 bg-black text-white rounded-lg text-xs font-medium">
                    متابعة
                </button>
            </div>
        </div>
    );
};

export default function HomePage() {
    const user = useAuth();
    const showToast = useToast();
    const navigate = useNavigate();

    const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
    const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState({ trips: true, places: true, suggestions: true });
    const [activeRide, setActiveRide] = useState<Trip | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) {
            setLoading({ trips: false, places: false, suggestions: false });
            setRecentTrips([]);
            setSavedPlaces([]);
            setSuggestions([]);
            return;
        }

        setLoading({ trips: true, places: true, suggestions: true });
        try {
            const [trips, places] = await Promise.all([
                getRecentTrips(user.uid),
                getSavedPlaces(user.uid)
            ]);
            setRecentTrips(trips);
            setSavedPlaces(places);
            setLoading(prev => ({ ...prev, trips: false, places: false }));

            // Fetch suggestions after getting trips and places
            const aiSuggestions = await getSmartSuggestions(trips, places);
            setSuggestions(aiSuggestions);
            setLoading(prev => ({ ...prev, suggestions: false }));

        } catch (error) {
            console.error("Error fetching homepage data:", error);
            showToast('حدث خطأ في تحميل البيانات', 'error');
            setLoading({ trips: false, places: false, suggestions: false });
        }
    }, [user, showToast]);

    useEffect(() => {
        fetchData();
        if (user) {
            const unsubscribe = listenForActiveRide(user.uid, setActiveRide);
            return () => unsubscribe();
        }
    }, [user, fetchData]);

    const handleStartNewTrip = async () => {
        if (!user) return navigate('/login');
        showToast('جاري تحديد موقعك...', 'info');
        try {
            const position = await getCurrentLocation();
            const location: Location = { lat: position.coords.latitude, lng: position.coords.longitude };
            sessionStorage.setItem('prefillPickup', JSON.stringify(location));
            showToast('تم تحديد موقع الانطلاق.', 'success');
        } catch (error) {
            console.warn("Could not get current location:", error);
            showToast('لم نتمكن من تحديد موقعك الحالي.', 'info');
            sessionStorage.removeItem('prefillPickup');
        } finally {
            navigate('/trip');
        }
    };
    
    const handleUseSuggestion = (suggestion: Suggestion) => {
        if (!user) return navigate('/login');
        sessionStorage.setItem('prefillDestination', JSON.stringify(suggestion.location));
        handleStartNewTrip();
    };

    return (
        <div className="space-y-4">
            {user && (
                 <div className="py-2">
                     <h2 className="text-xl font-semibold">مرحباً بك، <span className="text-[--brand-green]">{user.name?.split(' ')[0]}</span>!</h2>
                     <p className="text-gray-600 dark:text-gray-400">جاهز لرحلتك القادمة؟</p>
                </div>
            )}
           
            <button onClick={handleStartNewTrip} className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <span className="text-lg font-medium text-gray-700 dark:text-gray-300">إلى أين تريد الذهاب؟</span>
                <div className="bg-[--brand-green] p-2 rounded-full">
                    <ArrowRightIcon />
                </div>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex flex-col min-h-[180px]">
                    <h3 className="font-medium mb-3 text-gray-800 dark:text-gray-200">رحلاتك الأخيرة</h3>
                    {loading.trips ? (
                        <div className="space-y-2"><Skeleton type="trip" /><Skeleton type="trip" /></div>
                    ) : user ? (
                        recentTrips.length > 0 ? (
                            recentTrips.map(trip => (
                                <QuickActionButton
                                    key={trip.id}
                                    icon={<DocumentReportIcon />}
                                    title={trip.dropoff.address || 'وجهة غير معروفة'}
                                    subtitle={trip.createdAt?.toDate().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) || ''}
                                    onClick={() => navigate(`/trip-details?id=${trip.id}`)}
                                />
                            ))
                        ) : <p className="text-center text-gray-500 text-sm flex-grow flex items-center justify-center">لا توجد رحلات حديثة.</p>
                    ) : <p className="text-center text-gray-500 text-sm flex-grow flex items-center justify-center">سجل الدخول لعرض رحلاتك.</p>}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex flex-col min-h-[180px]">
                    <h3 className="font-medium mb-3 text-gray-800 dark:text-gray-200">أماكنك المحفوظة</h3>
                    {loading.places ? (
                        <div className="space-y-2"><Skeleton type="trip" /><Skeleton type="trip" /></div>
                    ) : user ? (
                        savedPlaces.length > 0 ? (
                            savedPlaces.map(place => (
                                <QuickActionButton
                                    key={place.id}
                                    icon={<span>{PLACE_ICONS[place.type] || '📍'}</span>}
                                    title={place.name}
                                    subtitle={place.address}
                                    onClick={() => handleUseSuggestion({ title: place.name, subtitle: place.address, icon: PLACE_ICONS[place.type] || '📍', location: { lat: place.location.latitude, lng: place.location.longitude, address: place.address }})}
                                />
                            ))
                        ) : <p className="text-center text-gray-500 text-sm flex-grow flex items-center justify-center">لم تقم بحفظ أي أماكن.</p>
                    ) : <p className="text-center text-gray-500 text-sm flex-grow flex items-center justify-center">سجل الدخول لعرض أماكنك.</p>}
                </div>
            </div>

            <div>
                <h3 className="font-medium mb-4 text-gray-800 dark:text-gray-200">مقترحات ذكية لك</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {loading.suggestions ? (
                     <><Skeleton type="suggestion" /><Skeleton type="suggestion" /></>
                ) : user ? (
                    suggestions.length > 0 ? (
                        suggestions.map((sug, index) => (
                            <SmartSuggestionButton
                                key={index}
                                icon={<span>{sug.icon}</span>}
                                title={sug.title}
                                subtitle={sug.subtitle}
                                onClick={() => handleUseSuggestion(sug)}
                                bgColorClass={index % 2 === 0 ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-purple-100 dark:bg-purple-900/50'}
                            />
                        ))
                    ) : <p className="text-center text-gray-500 text-sm col-span-full py-4">لا توجد اقتراحات حالياً. أضف أماكن للمنزل والعمل لتجربة أفضل!</p>
                ) : <p className="text-center text-gray-500 text-sm col-span-full py-4">سجل الدخول لرؤية الاقتراحات الذكية.</p>}
                </div>
            </div>
            {activeRide && <ActiveRideIndicator ride={activeRide} />}
        </div>
    );
}
