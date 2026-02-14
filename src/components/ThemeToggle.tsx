'use client';

import { useTheme, type Theme } from '@/context/ThemeContext';

interface ThemeToggleProps {
    className?: string;
}

export const ThemeToggle = ({ className = '' }: ThemeToggleProps) => {
    const { theme, setTheme } = useTheme();

    const cycleTheme = () => {
        const order: Theme[] = ['light', 'dark', 'system'];
        const currentIndex = order.indexOf(theme);
        const nextIndex = (currentIndex + 1) % order.length;
        setTheme(order[nextIndex]);
    };

    const getIcon = () => {
        switch (theme) {
            case 'light': return '☀️';
            case 'dark': return '🌙';
            case 'system': return '💻';
        }
    };

    const getLabel = () => {
        switch (theme) {
            case 'light': return 'Light';
            case 'dark': return 'Dark';
            case 'system': return 'System';
        }
    };

    return (
        <button
            type="button"
            onClick={cycleTheme}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors
        text-gray-600 hover:text-gray-900 hover:bg-gray-100
        dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700
        ${className}`}
            aria-label={`Theme: ${getLabel()}. Click to change.`}
            title={`Theme: ${getLabel()}`}
        >
            <span>{getIcon()}</span>
            <span className="hidden sm:inline">{getLabel()}</span>
        </button>
    );
};
