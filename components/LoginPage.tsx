
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../App';
import { signInWithGoogle } from '../services/firebase';
import { GoogleIcon } from './Icons';
import { Spinner } from './common';

export default function LoginPage() {
    const user = useAuth();
    const navigate = useNavigate();
    const showToast = useToast();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // If user is already logged in, redirect to home
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await signInWithGoogle();
            showToast('تم تسجيل الدخول بنجاح!', 'success');
            navigate('/');
        } catch (error: any) {
            console.error("Login failed:", error);
            if (error.code !== 'auth/popup-closed-by-user') {
               showToast('حدث خطأ أثناء تسجيل الدخول', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4 text-center">
            <div className="max-w-sm w-full">
                <div className="flex items-center justify-center gap-3 cursor-pointer mb-6">
                    <span className="logo-text text-5xl font-semibold">
                        <span className="text-[--brand-green]">Trip</span><span className="text-black dark:text-white">ly</span>
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">مرحباً بك في تريبلي</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">أسرع وأسهل طريقة للتنقل في مدينتك.</p>

                <button 
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-white font-medium py-3 px-4 rounded-xl shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {isLoading ? <Spinner/> : <GoogleIcon />}
                    {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول باستخدام جوجل'}
                </button>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                    بالنقر، أنت توافق على شروط الخدمة و سياسة الخصوصية.
                </p>
            </div>
        </div>
    );
}
