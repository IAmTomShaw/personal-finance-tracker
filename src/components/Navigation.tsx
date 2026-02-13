'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';

const Navigation = () => {
  const { user, isLoading, isAuthConfigured } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const displayEmail = user?.email ?? 'Logged in user';
  const defaultAvatar = '/image.png';

  const navItems = [
    { href: '/', label: 'Balance Sheet', icon: '📊' },
    { href: '/add-account', label: 'Add Account', icon: '➕' },
    { href: '/record-balances', label: 'Record Balances', icon: '💰' },
    { href: '/bank-statements', label: 'Bank Statements', icon: '🏦' },
    { href: '/historical', label: 'Historical Tracking', icon: '📈' },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  if (isLoading) {
    return null;
  }

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-900/50 border-b dark:border-gray-700 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📈</span>
            <span className="text-xl font-bold text-gray-800 dark:text-gray-100 hidden sm:block">Personal Finance Tracker</span>
            <span className="text-lg font-bold text-gray-800 dark:text-gray-100 sm:hidden">Finance Tracker</span>
          </div>

          {/* Desktop Navigation - shown when user logged in OR in offline mode */}
          {(user || !isAuthConfigured) && (
            <div className="hidden md:flex space-x-1 items-center">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100'
                      }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Profile menu - only show when Auth0 is configured and user is logged in */}
              {isAuthConfigured && user && (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={toggleProfileMenu}
                    className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-haspopup="true"
                    aria-expanded={isProfileMenuOpen}
                  >
                    <Image
                      src={defaultAvatar}
                      alt="Profile avatar"
                      width={36}
                      height={36}
                      className="rounded-full border border-gray-200 dark:border-gray-600 shadow-sm"
                    />
                  </button>
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-50">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Signed in as</p>
                        <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{displayEmail}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/settings"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          Settings
                        </Link>
                        <Link
                          href="/disclaimer"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          Privacy
                        </Link>
                        <a
                          href="/auth/logout"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Logout
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {!user && isAuthConfigured && (
            <div className="hidden md:flex items-center space-x-1">
              <ThemeToggle />
              <a
                href="/auth/login?screen_hint=signup"
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100"
              >
                <span>🔑</span>
                <span>Login</span>
              </a>
            </div>
          )}

          {/* Mobile Menu Button - shown when user logged in OR in offline mode */}
          {(user || !isAuthConfigured) && (
            <div className="md:hidden flex items-center space-x-1">
              <ThemeToggle />
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {!isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700">
            <div className="flex items-center space-x-3 px-3 py-3 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
              <Image src={defaultAvatar} alt="Profile avatar" width={40} height={40} className="rounded-full border border-gray-200 dark:border-gray-600" />
              <div className="flex flex-col">
                <span className="text-sm text-gray-500 dark:text-gray-400">Signed in as</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{displayEmail}</span>
              </div>
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors ${isActive
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100'
                    }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Link
              href="/settings"
              onClick={closeMobileMenu}
              className="flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100"
            >
              <span className="text-lg">⚙️</span>
              <span>Settings</span>
            </Link>
            <Link
              href="/disclaimer"
              onClick={closeMobileMenu}
              className="flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100"
            >
              <span className="text-lg">📋</span>
              <span>Privacy</span>
            </Link>
            {/* Only show logout when Auth0 is configured and user is logged in */}
            {isAuthConfigured && user && (
              <a
                href="/auth/logout"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100"
              >
                <span className="text-lg">🔒</span>
                <span>Logout</span>
              </a>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
