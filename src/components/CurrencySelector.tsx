'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  useCurrency,
  SUPPORTED_CURRENCIES,
  CURRENCY_REGIONS,
  getCurrenciesByRegion,
  type Currency,
} from '@/context/CurrencyContext';
import { useAnalytics } from '@/hooks/useAnalytics';

interface CurrencySelectorProps {
  className?: string;
  showLabel?: boolean;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  className = '',
  showLabel = true,
}) => {
  const { selectedCurrency, setSelectedCurrency } = useCurrency();
  const { trackEvent } = useAnalytics();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeRegion, setActiveRegion] = useState<string>('All');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Arrow visibility state
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Outside click ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Auto-focus search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // ── Region-tabs scroll arrows ──────────────────────────────────────────────
  const updateArrows = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 4);
    setShowRightArrow(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, isOpen]);

  const scrollTabs = (dir: 'left' | 'right') => {
    const el = tabsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -120 : 120, behavior: 'smooth' });
  };

  // ── Currency select ────────────────────────────────────────────────────────
  const handleSelect = useCallback(
    (currency: Currency) => {
      trackEvent('currency_changed', {
        from_currency: selectedCurrency.code,
        to_currency: currency.code,
      });
      setSelectedCurrency(currency);
      setIsOpen(false);
      setSearch('');
      setFocusedIndex(-1);
    },
    [selectedCurrency.code, setSelectedCurrency, trackEvent]
  );

  // ── Filtering ─────────────────────────────────────────────────────────────
  const query = search.toLowerCase().trim();
  const filteredCurrencies = SUPPORTED_CURRENCIES.filter((c) => {
    const matchesSearch =
      !query ||
      c.code.toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query) ||
      c.symbol.toLowerCase().includes(query) ||
      c.region.toLowerCase().includes(query);
    const matchesRegion = activeRegion === 'All' || c.region === activeRegion;
    return matchesSearch && matchesRegion;
  });

  // Reset focused index when list changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [query, activeRegion]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, filteredCurrencies.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredCurrencies.length) {
        handleSelect(filteredCurrencies[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
      setFocusedIndex(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusedIndex(filteredCurrencies.length - 1);
    }
  };

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const item = listRef.current.querySelector<HTMLElement>(
      `[data-index="${focusedIndex}"]`
    );
    item?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  // ── Grouping ──────────────────────────────────────────────────────────────
  const regionGroups: { region: string; currencies: Currency[] }[] = [];
  if (activeRegion === 'All' && !query) {
    CURRENCY_REGIONS.forEach((region) => {
      regionGroups.push({ region, currencies: getCurrenciesByRegion(region) });
    });
  } else {
    regionGroups.push({ region: '', currencies: filteredCurrencies });
  }

  const regions = ['All', ...CURRENCY_REGIONS];

  // Flat index map for keyboard nav (needed because of region group headers)
  let flatIndex = -1;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* FIX #4: label is now associated with the trigger button via htmlFor */}
      {showLabel && (
        <label
          htmlFor="currency-select"
          className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5"
        >
          Currency
        </label>
      )}

      {/* ── Trigger button ─────────────────────────────────────────────────── */}
      <button
        id="currency-select"
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="
          w-full flex items-center justify-between gap-3
          px-3 py-2.5 rounded-lg
          border border-gray-300 dark:border-neutral-600
          bg-white dark:bg-neutral-800
          text-gray-900 dark:text-neutral-100
          shadow-sm hover:border-blue-400 dark:hover:border-blue-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all duration-150
          text-sm font-medium
        "
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="currency-listbox"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl leading-none shrink-0">{selectedCurrency.flag}</span>
          <span className="truncate">{selectedCurrency.code}</span>
          <span className="text-gray-400 dark:text-neutral-500 font-normal truncate hidden sm:inline">
            — {selectedCurrency.name}
          </span>
        </span>
        <span
          className={`shrink-0 text-gray-400 dark:text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
            }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* ── Dropdown panel ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          id="currency-listbox"
          className="
            absolute z-50 mt-2 w-full min-w-[280px] max-w-md
            right-0
            bg-white dark:bg-neutral-900
            border border-gray-200 dark:border-neutral-700
            rounded-xl shadow-xl shadow-black/10 dark:shadow-black/40
            flex flex-col overflow-hidden
          "
          style={{ maxHeight: '400px' }}
          role="listbox"
          aria-label="Select currency"
          aria-activedescendant={
            focusedIndex >= 0 ? `currency-option-${filteredCurrencies[focusedIndex]?.code}` : undefined
          }
        >
          {/* Search + tab strip */}
          <div className="p-3 border-b border-gray-100 dark:border-neutral-800">

            {/* Search field */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500"
                width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden
              >
                <path
                  d="M10 6.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM9.5 10.207l2.646 2.646"
                  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
                />
              </svg>
              <input
                ref={searchRef}
                type="text"
                role="combobox"
                aria-expanded={isOpen}
                aria-controls="currency-listbox"
                aria-autocomplete="list"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveRegion('All');
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search currency, code or region…"
                className="
                  w-full pl-9 pr-8 py-2 text-sm rounded-lg
                  bg-gray-50 dark:bg-neutral-800
                  border border-gray-200 dark:border-neutral-700
                  text-gray-900 dark:text-neutral-100
                  placeholder:text-gray-400 dark:placeholder:text-neutral-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all
                "
              />
              {/* FIX #1: type="button" + aria-label added */}
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            {/* Region tabs — hidden scrollbar + fade-edge arrows */}
            {!query && (
              <div className="relative mt-2.5">

                {/* Left fade + arrow */}
                {showLeftArrow && (
                  <div className="
                    absolute left-0 top-0 bottom-0 z-10
                    w-10 flex items-center justify-start
                    pointer-events-none
                    bg-gradient-to-r from-white dark:from-neutral-900 to-transparent
                  ">
                    <button
                      type="button"
                      onClick={() => scrollTabs('left')}
                      aria-label="Scroll regions left"
                      className="
                        pointer-events-auto
                        flex items-center justify-center
                        w-5 h-5 rounded-full ml-0.5
                        bg-gray-100 dark:bg-neutral-700
                        text-gray-500 dark:text-neutral-400
                        hover:bg-gray-200 dark:hover:bg-neutral-600
                        hover:text-gray-700 dark:hover:text-neutral-200
                        transition-all duration-150
                      "
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path d="M7.5 2L4 6l3.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Scrollable tabs strip */}
                <div
                  ref={tabsRef}
                  className={`
                    scrollbar-hide flex gap-1.5 overflow-x-auto
                    ${showLeftArrow ? 'pl-8' : ''}
                    ${showRightArrow ? 'pr-8' : ''}
                  `}
                >
                  {regions.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => setActiveRegion(region)}
                      className={`
                        shrink-0 px-2.5 py-1 text-xs rounded-full font-medium transition-all duration-150
                        ${activeRegion === region
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
                        }
                      `}
                    >
                      {region}
                    </button>
                  ))}
                </div>

                {/* Right fade + arrow */}
                {showRightArrow && (
                  <div className="
                    absolute right-0 top-0 bottom-0 z-10
                    w-10 flex items-center justify-end
                    pointer-events-none
                    bg-gradient-to-l from-white dark:from-neutral-900 to-transparent
                  ">
                    <button
                      type="button"
                      onClick={() => scrollTabs('right')}
                      aria-label="Scroll regions right"
                      className="
                        pointer-events-auto
                        flex items-center justify-center
                        w-5 h-5 rounded-full mr-0.5
                        bg-gray-100 dark:bg-neutral-700
                        text-gray-500 dark:text-neutral-400
                        hover:bg-gray-200 dark:hover:bg-neutral-600
                        hover:text-gray-700 dark:hover:text-neutral-200
                        transition-all duration-150
                      "
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                        <path d="M4.5 2L8 6l-3.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Currency list ───────────────────────────────────────────────── */}
          <div className="overflow-y-auto flex-1" ref={listRef}>
            {filteredCurrencies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-neutral-500">
                <span className="text-3xl mb-2">🔍</span>
                <p className="text-sm">No currencies match &ldquo;{search}&rdquo;</p>
              </div>
            ) : (
              regionGroups.map(({ region, currencies }) =>
                currencies.length === 0 ? null : (
                  <div key={region || 'results'}>
                    {region && (
                      <div className="sticky top-0 px-3 py-1.5 bg-gray-50 dark:bg-neutral-800/80 backdrop-blur-sm border-b border-gray-100 dark:border-neutral-700/50">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
                          {region}
                        </span>
                      </div>
                    )}
                    {currencies.map((currency) => {
                      flatIndex += 1;
                      const currentIndex = flatIndex;
                      const isSelected = selectedCurrency.code === currency.code;
                      const isFocused = focusedIndex === currentIndex;
                      return (
                        <button
                          key={currency.code}
                          id={`currency-option-${currency.code}`}
                          data-index={currentIndex}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(currency)}
                          onMouseEnter={() => setFocusedIndex(currentIndex)}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2.5
                            text-left text-sm transition-colors duration-100
                            ${isFocused && !isSelected
                              ? 'bg-gray-100 dark:bg-neutral-800'
                              : isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'text-gray-800 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-800'
                            }
                          `}
                        >
                          <span className="text-xl leading-none shrink-0 w-7 text-center">
                            {currency.flag}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="font-semibold">{currency.code}</span>
                            <span className="ml-2 text-gray-500 dark:text-neutral-400 font-normal truncate">
                              {currency.name}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-mono text-gray-400 dark:text-neutral-500">
                            {currency.symbol}
                          </span>
                          {isSelected && (
                            <span className="shrink-0 text-blue-600 dark:text-blue-400">
                              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
                                <path d="M3 8l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )
              )
            )}
          </div>

          {/* ── Footer count ────────────────────────────────────────────────── */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
            <p className="text-xs text-gray-400 dark:text-neutral-500 text-center">
              {filteredCurrencies.length} of {SUPPORTED_CURRENCIES.length} currencies
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
