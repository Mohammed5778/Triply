
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { HashRouter, Routes, Route, NavLink, useNavigate, Outlet } from 'react-router-dom';
import { auth } from './services/firebase';
import { getUserProfile } from './services/api';
import { User, ToastMessage } from './types';

import HomePage from './components/HomePage';
import TripPage from './components/TripPage';
import LoginPage from './components/LoginPage';
import TripsPage from './components/TripsPage';
import PlacesPage from './components/PlacesPage';
import ProfilePage from './components/ProfilePage';
import TripDetailsPage from './components/TripDetailsPage';
import { MoonIcon, SunIcon, UserCircleIcon, CalendarIcon, LogoutIcon, LocationMarkerIcon, UserIcon } from './components/Icons';

// --- CONTEXTS ---
export const AuthContext = createContext<User | null>(null);
export const ThemeContext = createContext<{ theme: string; toggleTheme: () => void }>({ theme: 'light', toggleTheme: () => {} });
export const ToastContext = createContext<(message: string, type?: 'success' | 'error' | 'info') => void>(() => {});

// --- HOOKS ---
export const useAuth = () => useContext(AuthContext);
export const useTheme = () => useContext(ThemeContext);
export const useToast = () => useContext(ToastContext);


// --- LAYOUT COMPONENTS ---

const Header: React.FC = () => {
    const user = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleSignOut = () => {
        auth.signOut().catch(err => console.error("Sign out error", err));
        navigate('/');
    };
    
    useEffect(() => {
        const closeMenuOnClickOutside = (event: MouseEvent) => {
            if (menuOpen) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('click', closeMenuOnClickOutside);
        return () => {
            document.removeEventListener('click', closeMenuOnClickOutside);
        };
    }, [menuOpen]);

    return (
        <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm z-50">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <span className="logo-text text-2xl font-semibold">
                            <span className="text-[--brand-green]">Trip</span><span className="text-black dark:text-white">ly</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                        </button>
                        {user ? (
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full ps-3 pe-1 py-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                                        { user.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <UserCircleIcon /> }
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.name?.split(' ')[0] || ''}</span>
                                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </button>
                                {menuOpen && (
                                     <div className="absolute top-full start-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-2 min-w-[220px] origin-top-left z-50">
                                       <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                           <div className="font-medium text-gray-900 dark:text-white truncate">{user.name}</div>
                                           <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                                       </div>
                                       <NavLink to="/profile" className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><UserIcon /><span>الملف الشخصي</span></NavLink>
                                       <NavLink to="/trips" className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><CalendarIcon /><span>رحلاتي</span></NavLink>
                                       <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                       <button onClick={handleSignOut} className="w-full text-start flex items-center gap-3 px-4 py-2 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50"><LogoutIcon /><span>تسجيل خروج</span></button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button onClick={() => navigate('/login')} className="bg-black dark:bg-white text-white dark:text-black px-5 py-2 rounded-full text-sm font-medium hover:bg-opacity-90 transition-colors">تسجيل دخول</button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const navItemClass = "nav-item flex flex-col items-center text-gray-500 dark:text-gray-400 hover:text-[--brand-green] dark:hover:text-[--brand-green]";
    const activeNavItemClass = "text-[--brand-green]";

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-around py-2">
                    <NavLink to="/" className={({isActive}) => `${navItemClass} ${isActive ? activeNavItemClass : ''}`}>
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>
                        <span className="text-xs mt-1 font-medium">الرئيسية</span>
                    </NavLink>
                    <NavLink to="/trips" className={({isActive}) => `${navItemClass} ${isActive ? activeNavItemClass : ''}`}>
                        <CalendarIcon /><span className="text-xs mt-1">رحلاتي</span>
                    </NavLink>
                    <button onClick={() => navigate('/trip')} className="w-14 h-14 bg-[--brand-green] rounded-full flex items-center justify-center -mt-6 shadow-lg active:scale-95 transform transition-transform duration-150">
                        <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    </button>
                    <NavLink to="/places" className={({isActive}) => `${navItemClass} ${isActive ? activeNavItemClass : ''}`}>
                        <LocationMarkerIcon /><span className="text-xs mt-1">الأماكن</span>
                    </NavLink>
                    <NavLink to="/profile" className={({isActive}) => `${navItemClass} ${isActive ? activeNavItemClass : ''}`}>
                        <UserIcon /><span className="text-xs mt-1">حسابي</span>
                    </NavLink>
                </div>
            </div>
        </nav>
    );
}

const AppLayout: React.FC = () => (
    <div className="pt-20 pb-24">
        <Header />
        <main className="container mx-auto px-4">
            <Outlet />
        </main>
        <BottomNav />
    </div>
);


const Toast: React.FC<ToastMessage> = ({ message, type }) => {
    const baseClasses = "fixed top-5 left-1/2 -translate-x-1/2 text-white px-4 py-2 rounded-lg shadow-md z-[2000] text-sm transition-all duration-300";
    const typeClasses = {
        info: 'bg-black/80',
        success: 'bg-green-600',
        error: 'bg-red-600'
    };
    return <div className={`${baseClasses} ${typeClasses[type]}`}>{message}</div>;
};

// --- MAIN APP COMPONENT ---

export default function App() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userProfile = await getUserProfile(user.uid);
                setCurrentUser(userProfile || { uid: user.uid, email: user.email, name: user.displayName, photoURL: user.photoURL });
            } else {
                setCurrentUser(null);
            }
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

    const toggleTheme = () => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Date.now();
        setToasts(prevToasts => [...prevToasts, { id, message, type }]);
        setTimeout(() => {
            setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
        }, 3000);
    }, []);

    if (loadingAuth) {
        return <div className="w-screen h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="loading"></div></div>;
    }

    return (
        <AuthContext.Provider value={currentUser}>
            <ThemeContext.Provider value={{ theme, toggleTheme }}>
                <ToastContext.Provider value={showToast}>
                    <HashRouter>
                         <Routes>
                            {/* Full-screen pages */}
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/trip" element={<TripPage />} />
                            <Route path="/trip-details" element={<TripDetailsPage />} />
                            
                            {/* Pages with standard layout */}
                            <Route element={<AppLayout />}>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/trips" element={<TripsPage />} />
                                <Route path="/places" element={<PlacesPage />} />
                                <Route path="/profile" element={<ProfilePage />} />
                            </Route>
                         </Routes>
                    </HashRouter>
                    <div className="fixed top-0 left-0 right-0 z-[2000] flex flex-col items-center space-y-2 p-4 pointer-events-none">
                        {toasts.map(toast => <Toast key={toast.id} {...toast} />)}
                    </div>
                </ToastContext.Provider>
            </ThemeContext.Provider>
        </AuthContext.Provider>
    );
}
