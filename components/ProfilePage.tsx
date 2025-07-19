
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../App';
import { auth } from '../services/firebase';
import { updateUserProfile } from '../services/api';
import { UserCircleIcon, PencilIcon, CheckIcon, LogoutIcon } from './Icons';
import { Spinner } from './common';

export default function ProfilePage() {
    const user = useAuth();
    const showToast = useToast();
    const navigate = useNavigate();

    const [name, setName] = useState(user?.name || '');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
        } else {
            setName(user.name || '');
        }
    }, [user, navigate]);
    
    const handleSave = async () => {
        if (!user || !name.trim()) {
            showToast('الاسم لا يمكن أن يكون فارغاً', 'error');
            return;
        }
        setIsSaving(true);
        try {
            await updateUserProfile(user.uid, { name: name.trim() });
            // The auth context will update automatically on next refresh,
            // but we can force a toast for immediate feedback.
            showToast('تم تحديث الاسم بنجاح!', 'success');
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update profile:", error);
            showToast('فشل تحديث الملف الشخصي', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignOut = () => {
        auth.signOut().then(() => {
            navigate('/');
        }).catch(err => {
            console.error("Sign out error", err);
            showToast('فشل تسجيل الخروج', 'error');
        });
    };

    if (!user) {
        // This is a fallback, useEffect should already redirect
        return <div className="flex items-center justify-center h-full"><Spinner /></div>;
    }

    return (
        <div className="max-w-md mx-auto">
            <div className="flex flex-col items-center pt-8 pb-12">
                <div className="w-28 h-28 rounded-full bg-gray-200 dark:bg-gray-700 mb-4 ring-4 ring-[--brand-green]/50 flex items-center justify-center overflow-hidden">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <UserCircleIcon />
                    )}
                </div>
                
                {!isEditing ? (
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">{name}</h1>
                        <button onClick={() => setIsEditing(true)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                            <PencilIcon />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 w-full max-w-xs">
                        <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            className="text-2xl font-bold text-center bg-transparent w-full border-b-2 border-[--brand-green] outline-none" 
                            autoFocus
                        />
                         <button onClick={handleSave} disabled={isSaving} className="p-1 rounded-full bg-green-500 text-white disabled:bg-gray-400">
                            {isSaving ? <Spinner /> : <CheckIcon />}
                        </button>
                    </div>
                )}

                <p className="text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
            </div>
            
            <div className="space-y-2">
                <button onClick={() => navigate('/trips')} className="w-full text-right bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <span>رحلاتي</span>
                    <span className="text-gray-400">&lsaquo;</span>
                </button>
                <button onClick={() => navigate('/places')} className="w-full text-right bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <span>الأماكن المحفوظة</span>
                     <span className="text-gray-400">&lsaquo;</span>
                </button>
                 <button onClick={handleSignOut} className="w-full text-right bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-red-600 dark:text-red-500 gap-2">
                    <LogoutIcon />
                    <span>تسجيل الخروج</span>
                </button>
            </div>
        </div>
    );
}
