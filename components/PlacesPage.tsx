
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../App';
import { getAllSavedPlaces, addSavedPlace, deleteSavedPlace, searchLocations } from '../services/api';
import { Place, Location } from '../types';
import { PLACE_ICONS } from '../constants';
import { Skeleton, Modal, Spinner } from './common';
import { LocationMarkerIcon, PlusIcon, TrashIcon } from './Icons';

const AddPlaceForm: React.FC<{onSuccess: () => void}> = ({ onSuccess }) => {
    const user = useAuth();
    const showToast = useToast();
    const [name, setName] = useState('');
    const [type, setType] = useState<'home' | 'work' | 'gym' | 'generic'>('generic');
    const [search, setSearch] = useState('');
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [searchResults, setSearchResults] = useState<Location[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        if (search.length < 3) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        debounceTimeoutRef.current = setTimeout(async () => {
            const results = await searchLocations(search);
            setSearchResults(results);
            setIsSearching(false);
        }, 500);

        return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
    }, [search]);

    const handleSelectLocation = (location: Location) => {
        setSelectedLocation(location);
        setSearch(location.address || '');
        setSearchResults([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name || !selectedLocation) {
            showToast('الرجاء تعبئة جميع الحقول', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const newPlace: Omit<Place, 'id' | 'userId'> = {
                name,
                type,
                address: selectedLocation.address!,
                location: {
                    latitude: selectedLocation.lat,
                    longitude: selectedLocation.lng,
                }
            };
            await addSavedPlace(user.uid, newPlace);
            showToast('تم حفظ المكان بنجاح', 'success');
            onSuccess();
        } catch (error) {
            console.error("Failed to save place:", error);
            showToast('فشل حفظ المكان', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                <label htmlFor="place-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المكان (مثال: المنزل)</label>
                <input id="place-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-gray-100 dark:bg-gray-700 p-2.5 rounded-lg border-2 border-transparent focus:border-[--brand-green] focus:bg-white dark:focus:bg-gray-800 outline-none transition" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النوع</label>
                <div className="flex gap-2">
                    {(Object.keys(PLACE_ICONS) as Array<keyof typeof PLACE_ICONS>).map(key => (
                       <button type="button" key={key} onClick={() => setType(key as any)} className={`px-3 py-2 rounded-lg border-2 transition ${type === key ? 'border-[--brand-green] bg-lime-50 dark:bg-lime-900/50' : 'border-gray-200 dark:border-gray-600'}`}>
                           {PLACE_ICONS[key]}
                       </button> 
                    ))}
                </div>
            </div>

             <div>
                <label htmlFor="place-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
                <input id="place-address" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن العنوان" required className="w-full bg-gray-100 dark:bg-gray-700 p-2.5 rounded-lg border-2 border-transparent focus:border-[--brand-green] focus:bg-white dark:focus:bg-gray-800 outline-none transition" />
                {isSearching && <p className="text-sm text-gray-500 mt-2">جاري البحث...</p>}
                {searchResults.length > 0 && (
                    <ul className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-700/50 divide-y divide-gray-200 dark:divide-gray-600">
                        {searchResults.map((loc, i) => (
                           <li key={i}><button type="button" onClick={() => handleSelectLocation(loc)} className="w-full text-right p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 truncate">{loc.address}</button></li>
                        ))}
                    </ul>
                )}
            </div>

            <button type="submit" disabled={isSaving} className="w-full bg-[--brand-green] text-black font-bold py-3 rounded-lg text-base disabled:bg-gray-300 flex items-center justify-center gap-2">
                 {isSaving && <Spinner />}
                 {isSaving ? 'جاري الحفظ...' : 'حفظ المكان'}
            </button>
        </form>
    );
};


export default function PlacesPage() {
    const user = useAuth();
    const showToast = useToast();
    const navigate = useNavigate();
    const [places, setPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchPlaces = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userPlaces = await getAllSavedPlaces(user.uid);
            setPlaces(userPlaces);
        } catch (error) {
            console.error("Failed to fetch places:", error);
            showToast('فشل تحميل الأماكن', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, showToast]);
    
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchPlaces();
    }, [user, navigate, fetchPlaces]);

    const handleDelete = async (placeId: string) => {
        if (!user) return;
        // Optimistic UI update
        setPlaces(prev => prev.filter(p => p.id !== placeId));
        try {
            await deleteSavedPlace(user.uid, placeId);
            showToast('تم حذف المكان', 'success');
        } catch (error) {
            showToast('فشل حذف المكان', 'error');
            fetchPlaces(); // Revert if delete failed
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">أماكنك المحفوظة</h1>
                <button onClick={() => setIsModalOpen(true)} className="bg-[--brand-green] text-black rounded-full p-2 shadow hover:scale-105 transition-transform">
                    <PlusIcon className="w-6 h-6" />
                </button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} type="card" />)}
                </div>
            ) : places.length > 0 ? (
                <div className="space-y-3">
                    {places.map(place => (
                        <div key={place.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm flex items-center gap-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl">{PLACE_ICONS[place.type]}</div>
                            <div className="flex-1 overflow-hidden">
                                <p className="font-bold truncate">{place.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{place.address}</p>
                            </div>
                            <button onClick={() => handleDelete(place.id)} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                                <TrashIcon className="w-5 h-5 text-red-500" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                        <LocationMarkerIcon />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold">لا توجد أماكن محفوظة</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">إضافة منزلك وعملك يجعل طلب الرحلات أسرع.</p>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة مكان جديد">
                <AddPlaceForm onSuccess={() => {
                    setIsModalOpen(false);
                    fetchPlaces();
                }} />
            </Modal>
        </div>
    );
}
