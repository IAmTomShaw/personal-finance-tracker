'use client';

import React, { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { CalendarOccurrence } from '@/context/CalendarContext';
import { CALENDAR_COLORS } from '@/types/finance';

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date | null;
  occurrences: Map<string, CalendarOccurrence[]>;
  onSelectDate: (date: Date) => void;
  onChangeMonth: (date: Date) => void;
  onAddEvent: () => void;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  selectedDate,
  occurrences,
  onSelectDate,
  onChangeMonth,
  onAddEvent,
}) => {
  const today = useMemo(() => new Date(), []);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const handlePrevMonth = () => onChangeMonth(subMonths(currentDate, 1));
  const handleNextMonth = () => onChangeMonth(addMonths(currentDate, 1));

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg dark:shadow-neutral-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
        <div className="flex items-center justify-between sm:justify-start space-x-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-600 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200 transition-colors"
            aria-label="Previous month"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-neutral-100 min-w-[140px] sm:min-w-[180px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-600 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200 transition-colors"
            aria-label="Next month"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={onAddEvent}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 transition-colors"
        >
          + Add Transaction
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-neutral-700">
        {WEEKDAY_LABELS.map((label, idx) => (
          <div
            key={label}
            className="px-1 sm:px-2 py-3 text-center text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider"
          >
            <span className="sm:hidden">{WEEKDAY_LABELS_SHORT[idx]}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const key = day.toISOString().split('T')[0];
          const dayOccurrences = occurrences.get(key) || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

          return (
            <button
              key={key}
              onClick={() => onSelectDate(day)}
              className={`
                relative min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 border-b border-r border-gray-100 dark:border-neutral-700 text-left
                transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500
                ${!isCurrentMonth ? 'bg-gray-50 dark:bg-neutral-900/50' : 'bg-white dark:bg-neutral-800'}
                ${isSelected ? 'ring-2 ring-inset ring-blue-500 bg-blue-50 dark:bg-blue-900/40' : ''}
              `}
            >
              <span
                className={`
                  inline-flex items-center justify-center w-7 h-7 text-sm rounded-full
                  ${isToday ? 'bg-blue-600 text-white font-bold' : ''}
                  ${!isToday && isCurrentMonth ? 'text-gray-800 dark:text-neutral-200' : ''}
                  ${!isToday && !isCurrentMonth ? 'text-gray-400 dark:text-neutral-500' : ''}
                `}
              >
                {format(day, 'd')}
              </span>

              {/* Event dots / pills */}
              {dayOccurrences.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {dayOccurrences.slice(0, 3).map((occ, idx) => (
                    <div
                      key={`${occ.transaction.id}-${idx}`}
                      className="flex items-center text-[10px] sm:text-xs leading-tight truncate rounded px-1 py-0.5"
                      style={{
                        backgroundColor: `${occ.transaction.color || CALENDAR_COLORS[occ.transaction.category] || '#6b7280'}25`,
                        color: occ.transaction.color || CALENDAR_COLORS[occ.transaction.category] || '#6b7280',
                      }}
                    >
                      <span className="truncate">{occ.transaction.name}</span>
                    </div>
                  ))}
                  {dayOccurrences.length > 3 && (
                    <span className="text-xs text-gray-500 dark:text-neutral-400 pl-1">
                      +{dayOccurrences.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
