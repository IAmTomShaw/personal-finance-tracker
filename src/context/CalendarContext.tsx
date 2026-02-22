'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { RecurringTransaction } from '@/types/finance';
import { isCloudSyncAllowed } from '@/lib/offline';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  getDate,
  getMonth,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  differenceInDays,
} from 'date-fns';

export interface CalendarOccurrence {
  transaction: RecurringTransaction;
  date: Date;
}

interface CalendarContextType {
  recurringTransactions: RecurringTransaction[];
  isLoading: boolean;
  addTransaction: (transaction: Omit<RecurringTransaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, updates: Partial<Omit<RecurringTransaction, 'id' | 'createdAt'>>) => void;
  deleteTransaction: (id: string) => void;
  getTransactionsForMonth: (year: number, month: number) => Map<string, CalendarOccurrence[]>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};

function migrateTransaction(t: RecurringTransaction & { recurrence?: string }): RecurringTransaction {
  const startDate = new Date(t.startDate);
  const endDate = t.endDate ? new Date(t.endDate) : undefined;
  const createdAt = new Date(t.createdAt);

  const frequency = t.frequency ?? (t.recurrence === 'yearly' ? 'annually' : (t.recurrence === 'weekly' || t.recurrence === 'monthly' ? t.recurrence : 'monthly'));

  return {
    ...t,
    frequency: frequency as RecurringTransaction['frequency'],
    startDate,
    endDate,
    createdAt,
  };
}

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('finance-calendar');
    if (saved) {
      const parsed = JSON.parse(saved);
      setRecurringTransactions(parsed.map((t: RecurringTransaction & { recurrence?: string }) => migrateTransaction(t)));
    }

    if (!isCloudSyncAllowed()) {
      setIsLoading(false);
      return;
    }

    // Fetch from cloud (calendar events are part of the /api/data response)
    fetch('/api/data', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data?.calendarEvents && Array.isArray(data.calendarEvents)) {
          const events = data.calendarEvents.map((t: RecurringTransaction & { recurrence?: string }) => migrateTransaction(t));
          setRecurringTransactions(events);
          localStorage.setItem('finance-calendar', JSON.stringify(events));
        }
      })
      .catch((error) => {
        console.error('Error fetching calendar cloud data:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('finance-calendar', JSON.stringify(recurringTransactions));
  }, [recurringTransactions]);

  const saveToCloud = async (transactions: RecurringTransaction[]) => {
    if (!isCloudSyncAllowed()) return;
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarEvents: transactions }),
      });
    } catch (error) {
      console.error('Failed to sync calendar to cloud:', error);
    }
  };

  const addTransaction = (data: Omit<RecurringTransaction, 'id' | 'createdAt'>) => {
    const newTransaction: RecurringTransaction = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    const updated = [...recurringTransactions, newTransaction];
    setRecurringTransactions(updated);
    saveToCloud(updated);
  };

  const updateTransaction = (id: string, updates: Partial<Omit<RecurringTransaction, 'id' | 'createdAt'>>) => {
    setRecurringTransactions((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      saveToCloud(updated);
      return updated;
    });
  };

  const deleteTransaction = (id: string) => {
    setRecurringTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveToCloud(updated);
      return updated;
    });
  };

  const getTransactionsForMonth = useCallback(
    (year: number, month: number): Map<string, CalendarOccurrence[]> => {
      const monthStart = startOfMonth(new Date(year, month));
      const monthEnd = endOfMonth(new Date(year, month));
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

      const occurrences = new Map<string, CalendarOccurrence[]>();

      for (const transaction of recurringTransactions) {
        const txStart = startOfDay(new Date(transaction.startDate));
        const txEnd = transaction.endDate ? startOfDay(new Date(transaction.endDate)) : null;

        const startDayOfWeek = getDay(txStart);
        const startDayOfMonth = transaction.dayOfMonth ?? getDate(txStart);
        const startMonthOfYear = transaction.monthOfYear ?? getMonth(txStart);

        for (const day of daysInMonth) {
          if (isBefore(day, txStart) && !isSameDay(day, txStart)) continue;
          if (txEnd && isAfter(day, txEnd) && !isSameDay(day, txEnd)) continue;

          let matches = false;

          switch (transaction.frequency) {
            case 'daily':
              matches = true;
              break;
            case 'weekly':
              matches = getDay(day) === startDayOfWeek;
              break;
            case 'bi-weekly': {
              const diff = differenceInDays(day, txStart);
              matches = diff >= 0 && diff % 14 === 0;
              break;
            }
            case 'monthly': {
              const lastDay = getDate(monthEnd);
              const targetDay = Math.min(startDayOfMonth, lastDay);
              matches = getDate(day) === targetDay;
              break;
            }
            case 'annually':
              matches =
                getMonth(day) === startMonthOfYear &&
                getDate(day) === Math.min(startDayOfMonth, getDate(monthEnd));
              break;
          }

          if (matches) {
            const key = day.toISOString().split('T')[0];
            const existing = occurrences.get(key) || [];
            existing.push({ transaction, date: day });
            occurrences.set(key, existing);
          }
        }
      }

      return occurrences;
    },
    [recurringTransactions]
  );

  return (
    <CalendarContext.Provider
      value={{
        recurringTransactions,
        isLoading,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        getTransactionsForMonth,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};
