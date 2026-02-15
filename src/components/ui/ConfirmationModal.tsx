'use client';
import React, { useEffect, useState, useRef } from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    requiresChallenge?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    requiresChallenge = false,
}) => {
    const [challengeValue, setChallengeValue] = useState('');
    const [isRendered, setIsRendered] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Handle Open/Close state and Focus Management
    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement as HTMLElement;
            setIsRendered(true);
            document.body.style.overflow = 'hidden';

            // Slight delay to ensure focusable elements are in DOM
            const timer = setTimeout(() => {
                const focusableElements = modalRef.current?.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements && focusableElements.length > 0) {
                    (focusableElements[0] as HTMLElement).focus();
                }
            }, 50);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(() => setIsRendered(false), 300);
            document.body.style.overflow = 'unset';

            // Restore focus
            if (previousFocusRef.current) {
                previousFocusRef.current.focus();
            }

            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Focus Trapping Logic
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                onClose();
                return;
            }

            if (e.key === 'Tab') {
                const focusableElements = modalRef.current?.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );

                if (!focusableElements || focusableElements.length === 0) return;

                const firstElement = focusableElements[0] as HTMLElement;
                const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isRendered) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: '⚠️',
                    button: 'bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-100',
                    titleColor: 'text-red-800',
                };
            case 'warning':
                return {
                    icon: '🔸',
                    button: 'bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-100',
                    titleColor: 'text-amber-800',
                };
            default:
                return {
                    icon: 'ℹ️',
                    button: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-100',
                    titleColor: 'text-blue-800',
                };
        }
    };

    const styles = getVariantStyles();
    const isConfirmDisabled = requiresChallenge && challengeValue !== 'DELETE';

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'
                }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
        >
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-neutral-900/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div
                ref={modalRef}
                className={`relative w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.15)] transition-all duration-300 border border-neutral-100 ${isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'
                    }`}
            >
                <div className="flex items-center space-x-3 mb-4">
                    <span className="text-2xl" aria-hidden="true">{styles.icon}</span>
                    <h3 id="modal-title" className={`text-2xl font-black tracking-tight ${styles.titleColor}`}>
                        {title}
                    </h3>
                </div>

                <p id="modal-description" className="text-neutral-600 mb-8 leading-relaxed text-lg">
                    {message}
                </p>

                {requiresChallenge && (
                    <div className="mb-8">
                        <label className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-2">
                            Type <span className="text-red-600">DELETE</span> to confirm
                        </label>
                        <input
                            type="text"
                            value={challengeValue}
                            onChange={(e) => setChallengeValue(e.target.value)}
                            placeholder="DELETE"
                            className="w-full px-5 py-4 rounded-2xl border-2 border-neutral-100 bg-neutral-50 text-neutral-900 focus:border-red-500 focus:ring-0 transition-all outline-none font-bold text-lg placeholder:text-neutral-300"
                        />
                    </div>
                )}

                <div className="flex flex-col sm:flex-row-reverse gap-4">
                    <button
                        onClick={() => {
                            onConfirm();
                            setChallengeValue('');
                        }}
                        disabled={isConfirmDisabled}
                        className={`flex-[2] py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed ${styles.button}`}
                    >
                        {confirmText}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 rounded-2xl font-bold text-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 cursor-pointer transition-all active:scale-[0.98]"
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
};
