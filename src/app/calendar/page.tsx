'use client';

import React, { useState, useMemo, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import ClientOnly from '@/components/ClientOnly';
import CalendarGrid from '@/components/CalendarGrid';
import CalendarEventModal from '@/components/CalendarEventModal';
import DayEventList from '@/components/DayEventList';
import { useCalendar } from '@/context/CalendarContext';
import { RecurringTransaction } from '@/types/finance';
import { useCurrency } from '@/context/CurrencyContext';
import { getMonth, getYear } from 'date-fns';

export default function CalendarPage() {
  const {
    recurringTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionsForMonth,
  } = useCalendar();
  const { formatCurrency } = useCurrency();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<RecurringTransaction | undefined>(undefined);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const year = getYear(currentDate);
  const month = getMonth(currentDate);

  const occurrences = useMemo(
    () => getTransactionsForMonth(year, month),
    [getTransactionsForMonth, year, month]
  );

  const selectedDayKey = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
  const selectedDayOccurrences = selectedDayKey ? occurrences.get(selectedDayKey) || [] : [];

  const handleAddEvent = useCallback(() => {
    setEditingTransaction(undefined);
    setIsModalOpen(true);
  }, []);

  const handleEdit = useCallback(
    (transactionId: string) => {
      const tx = recurringTransactions.find((t) => t.id === transactionId);
      if (tx) {
        setEditingTransaction(tx);
        setIsModalOpen(true);
      }
    },
    [recurringTransactions]
  );

  const handleDelete = useCallback((transactionId: string) => {
    setDeleteConfirmId(transactionId);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      deleteTransaction(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, deleteTransaction]);

  const handleModalSave = useCallback(
    (data: Omit<RecurringTransaction, 'id' | 'createdAt'>) => {
      if (editingTransaction) {
        updateTransaction(editingTransaction.id, data);
      } else {
        addTransaction(data);
      }
      setIsModalOpen(false);
      setEditingTransaction(undefined);
    },
    [editingTransaction, addTransaction, updateTransaction]
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingTransaction(undefined);
  }, []);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    occurrences.forEach((dayOccs) => {
      dayOccs.forEach((occ) => {
        if (occ.transaction.type === 'income') {
          income += occ.transaction.amount;
        } else {
          expenses += occ.transaction.amount;
        }
      });
    });
    return { income, expenses, net: income - expenses };
  }, [occurrences]);

  return (
    <ProtectedRoute>
      <ClientOnly>
        <div className="max-w-6xl mx-auto">
          {/* Page header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Finance Calendar</h1>
            <p className="text-gray-600">
              Visualise your recurring transactions at a glance
            </p>
          </div>

          {/* Monthly summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Income</p>
              <p className="text-lg font-bold text-green-600 mt-1">
                {formatCurrency(monthlySummary.income)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Expenses</p>
              <p className="text-lg font-bold text-red-600 mt-1">
                {formatCurrency(monthlySummary.expenses)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net</p>
              <p className={`text-lg font-bold mt-1 ${monthlySummary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(monthlySummary.net)}
              </p>
            </div>
          </div>

          {/* Calendar grid */}
          <CalendarGrid
            currentDate={currentDate}
            selectedDate={selectedDate}
            occurrences={occurrences}
            onSelectDate={setSelectedDate}
            onChangeMonth={setCurrentDate}
            onAddEvent={handleAddEvent}
          />

          {/* Day detail panel */}
          <div className="mt-6">
            <DayEventList
              selectedDate={selectedDate}
              occurrences={selectedDayOccurrences}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          {/* Add/Edit modal */}
          {isModalOpen && (
            <CalendarEventModal
              transaction={editingTransaction}
              onSave={handleModalSave}
              onClose={handleModalClose}
            />
          )}

          {/* Delete confirmation */}
          {deleteConfirmId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Transaction</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete this recurring transaction? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ClientOnly>
    </ProtectedRoute>
  );
}
