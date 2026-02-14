'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function isValidTheme(theme: unknown): theme is Theme {
    return typeof theme === 'string' && ['light', 'dark', 'system'].includes(theme);
}

function applyTheme(theme: Theme) {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    const root = document.documentElement;

    if (resolved === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }

    return resolved;
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setThemeState] = useState<Theme>('system');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    // Load saved theme on mount
    useEffect(() => {
        let initial: Theme = 'system';
        try {
            const saved = localStorage.getItem('finance-theme');
            if (saved && isValidTheme(saved)) {
                initial = saved;
            }
        } catch (error) {
            console.error('Failed to load theme from localStorage:', error);
        }

        setThemeState(initial);
        const resolved = applyTheme(initial);
        setResolvedTheme(resolved);
    }, []);

    // Listen for OS theme changes when in system mode
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            if (theme === 'system') {
                const resolved = applyTheme('system');
                setResolvedTheme(resolved);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    // Sync across tabs
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'finance-theme') {
                const newTheme = (e.newValue as Theme) || 'system';
                if (isValidTheme(newTheme)) {
                    setThemeState(newTheme);
                    const resolved = applyTheme(newTheme);
                    setResolvedTheme(resolved);
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        try {
            localStorage.setItem('finance-theme', newTheme);
        } catch (error) {
            console.error('Failed to save theme to localStorage:', error);
        }
        const resolved = applyTheme(newTheme);
        setResolvedTheme(resolved);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
