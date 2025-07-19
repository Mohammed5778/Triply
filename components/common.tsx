
import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { User } from '../types';

export const Spinner: React.FC = () => <div className="loading"></div>;

interface QuickActionButtonProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  isLoading?: boolean;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon, title, subtitle, onClick, isLoading }) => (
  <button onClick={onClick} disabled={isLoading} className="w-full text-right p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 group disabled:opacity-50 disabled:pointer-events-none">
    <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 flex-shrink-0 flex items-center justify-center w-9 h-9 text-lg">
      {icon}
    </div>
    <div className="overflow-hidden flex-grow">
      <div className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">{title}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</div>
    </div>
    {isLoading && <div className="ms-auto"><Spinner /></div>}
  </button>
);


interface SmartSuggestionButtonProps {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    onClick: () => void;
    bgColorClass: string;
}

export const SmartSuggestionButton: React.FC<SmartSuggestionButtonProps> = ({ icon, title, subtitle, onClick, bgColorClass }) => (
    <button onClick={onClick} className="w-full text-right p-3 rounded-xl transition-colors bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 group shadow-sm">
        <div className={`p-2 rounded-full flex-shrink-0 flex items-center justify-center w-9 h-9 text-lg ${bgColorClass}`}>
            {icon}
        </div>
        <div className="overflow-hidden flex-grow">
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</div>
        </div>
    </button>
);

export const Skeleton: React.FC<{ type: 'line' | 'suggestion' | 'trip' | 'card' }> = ({ type }) => {
    if (type === 'suggestion') {
        return (
            <div className="animate-pulse flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm col-span-1">
                <div className="w-9 h-9 skeleton-loader !rounded-full"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 skeleton-loader w-1/3"></div>
                    <div className="h-3 skeleton-loader w-2/3"></div>
                </div>
            </div>
        );
    }
    if (type === 'trip') {
        return (
             <div className="space-y-2 animate-pulse p-2">
                <div className="h-4 skeleton-loader w-3/4"></div>
                <div className="h-3 skeleton-loader w-1/2"></div>
            </div>
        );
    }
    if (type === 'card') {
        return (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm animate-pulse">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 skeleton-loader rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                         <div className="h-4 skeleton-loader w-3/4"></div>
                         <div className="h-3 skeleton-loader w-1/2"></div>
                    </div>
                </div>
            </div>
        );
    }
    return <div className="skeleton-loader h-4 w-full"></div>;
};


interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEsc);
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEsc);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 animate-fade-in-up" 
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md m-auto relative"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};
