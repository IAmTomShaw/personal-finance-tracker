'use client';

import React, { useState, useEffect } from 'react';
import { RecurringTransaction, CALENDAR_CATEGORIES, CALENDAR_COLORS } from '@/types/finance';
import { useCurrency } from '@/context/CurrencyContext';

interface CalendarEventModalProps {
  transaction?: RecurringTransaction; // undefined = create mode
  onSave: (data: Omit<RecurringTransaction, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const CalendarEventModal: React.FC<CalendarEventModalProps> = ({ transaction, onSave, onClose }) => {
  const { selectedCurrency } = useCurrency();
  const isEditing = !!transaction;

  const [name, setName] = useState(transaction?.name ?? '');
  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? '');
  const [type, setType] = useState<'income' | 'expense'>(transaction?.type ?? 'expense');
  const [frequency, setFrequency] = useState<RecurringTransaction['frequency']>(
    transaction?.frequency ?? 'monthly'
  );
  const [category, setCategory] = useState(transaction?.category ?? CALENDAR_CATEGORIES[0]);
  const [color, setColor] = useState(transaction?.color ?? '');
  const [startDate, setStartDate] = useState(
    transaction?.startDate
      ? new Date(transaction.startDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    transaction?.endDate ? new Date(transaction.endDate).toISOString().split('T')[0] : ''
  );

  // Auto-set color based on category when no custom color is set
  useEffect(() => {
    if (!transaction?.color) {
      setColor(CALENDAR_COLORS[category] || '#6b7280');
    }
  }, [category, transaction?.color]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !amount) return;

    onSave({
      name: trimmedName,
      amount: parseFloat(amount),
      type,
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      category,
      color,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl dark:shadow-neutral-900/50 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-neutral-100">
              {isEditing ? 'Edit Transaction' : 'Add Recurring Transaction'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              {isEditing ? 'Update the recurring transaction details.' : 'Set up a new recurring transaction to display on your calendar.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="event-name" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Name
            </label>
            <input
              id="event-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:placeholder-neutral-400"
              placeholder="e.g., Salary, Netflix, Rent"
              required
            />
          </div>

          {/* Amount + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-amount" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Amount ({selectedCurrency.symbol})
              </label>
              <input
                id="event-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:placeholder-neutral-400"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label htmlFor="event-type" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Type
              </label>
              <select
                id="event-type"
                value={type}
                onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                className="w-full border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="event-category" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Category
            </label>
            <select
              id="event-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {CALENDAR_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label htmlFor="event-frequency" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Frequency
            </label>
            <select
              id="event-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as RecurringTransaction['frequency'])}
              className="w-full border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          {/* Start / End Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-start-date" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Start Date
              </label>
              <input
                id="event-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:scheme-dark"
                required
              />
              <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                The schedule is based on your start date (e.g. monthly = same day each month)
              </p>
            </div>
            <div>
              <label htmlFor="event-end-date" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                End Date <span className="text-gray-400 dark:text-neutral-500">(optional)</span>
              </label>
              <input
                id="event-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:scheme-dark"
              />
            </div>
          </div>

          {/* Color indicator */}
          <div className="flex items-center space-x-3">
            <div
              className="w-5 h-5 rounded-full border border-gray-200 dark:border-neutral-600"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm text-gray-500 dark:text-neutral-400">
              Color auto-assigned by category
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              {isEditing ? 'Save Changes' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarEventModal;
