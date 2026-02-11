'use client';

import React from 'react';
import { format } from 'date-fns';
import { CalendarOccurrence } from '@/context/CalendarContext';
import { CALENDAR_COLORS } from '@/types/finance';
import { useCurrency } from '@/context/CurrencyContext';

interface DayEventListProps {
  selectedDate: Date | null;
  occurrences: CalendarOccurrence[];
  onEdit: (transactionId: string) => void;
  onDelete: (transactionId: string) => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly',
  monthly: 'Monthly',
  annually: 'Annually',
  yearly: 'Annually',
};

const DayEventList: React.FC<DayEventListProps> = ({
  selectedDate,
  occurrences,
  onEdit,
  onDelete,
}) => {
  const { formatCurrency } = useCurrency();

  if (!selectedDate) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <p className="text-gray-500 text-center">Select a day on the calendar to see its transactions.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
      </h3>

      {occurrences.length === 0 ? (
        <p className="text-gray-500 text-sm">No recurring transactions on this day.</p>
      ) : (
        <div className="space-y-3">
          {occurrences.map((occ) => {
            const tx = occ.transaction;
            const txColor = tx.color || CALENDAR_COLORS[tx.category] || '#6b7280';
            const isIncome = tx.type === 'income';

            return (
              <div
                key={tx.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: txColor }}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{tx.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {tx.category} &middot; {FREQUENCY_LABELS[tx.frequency ?? 'monthly']}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 sm:ml-3">
                  <span
                    className={`text-sm font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onEdit(tx.id)}
                      className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      aria-label={`Edit ${tx.name}`}
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(tx.id)}
                      className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label={`Delete ${tx.name}`}
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Summary */}
          {occurrences.length > 0 && (
            <div className="pt-3 mt-3 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Day total</span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(
                    occurrences.reduce((sum, occ) => {
                      return sum + (occ.transaction.type === 'income' ? occ.transaction.amount : -occ.transaction.amount);
                    }, 0)
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DayEventList;
