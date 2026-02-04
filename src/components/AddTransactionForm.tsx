'use client';

import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';


import { Transaction } from '@/types/finance';

interface AddTransactionFormProps {
  onUiClose?: () => void;
  initialData?: Transaction;
}

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ onUiClose, initialData }) => {
  const { accounts, addTransaction, updateTransaction } = useFinance();

  
  const [date, setDate] = useState(initialData ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');
  const [category, setCategory] = useState(initialData?.category || '');
  const [accountId, setAccountId] = useState(initialData?.accountId || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const DEFAULT_CATEGORIES = [
    "Groceries", "Salary", "Rent", "Utilities", "Transportation", 
    "Entertainment", "Healthcare", "Shopping", "Investment", 
    "Debt Payment", "Gift", "Other"
  ];

  const filteredCategories = DEFAULT_CATEGORIES.filter(c => 
    c.toLowerCase().includes(category.toLowerCase())
  );

  // Reset highlight when input changes
  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [category]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredCategories.length - 1 ? prev + 1 : prev
      );
      // Scroll handling logic could go here or via effect, simple effect below
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCategories[highlightedIndex]) {
        setCategory(filteredCategories[highlightedIndex]);
        setIsDropdownOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  // Auto-scroll to highlighted item
  React.useEffect(() => {
    if (isDropdownOpen && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isDropdownOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !amount || !accountId) return;

    if (initialData) {
      updateTransaction(initialData.id, {
        date: new Date(date),
        description,
        amount: Number(amount),
        type,
        category: category || 'Uncategorized',
        accountId
      });
    } else {
      addTransaction({
        date: new Date(date),
        description,
        amount: Number(amount),
        type,
        category: category || 'Uncategorized',
        accountId
      });
    }

    // Reset form
    if (!initialData) {
      setDescription('');
      setAmount('');
      setCategory('');
    }
    
    if (onUiClose) onUiClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800">{initialData ? 'Edit Transaction' : 'New Transaction'}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 px-4 py-2 text-sm font-medium border rounded-l-md ${
                type === 'expense' 
                  ? 'bg-red-50 text-red-700 border-red-200' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 px-4 py-2 text-sm font-medium border rounded-r-md -ml-px ${
                type === 'income' 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Grocery Shopping"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Amount</label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <input
            type="text"
            placeholder="Uncategorized"
            value={category}
            onFocus={() => setIsDropdownOpen(true)}
            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)} // Delay close to allow click
            onChange={(e) => {
              setCategory(e.target.value);
              setIsDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            autoComplete="off"
          />
          
          {isDropdownOpen && (
            <div 
              ref={listRef}
              className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
            >
              {filteredCategories.map((cat, index) => (
                <div
                  key={cat}
                  className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${
                    index === highlightedIndex ? 'bg-blue-600 text-white' : 'text-gray-900 hover:bg-blue-100'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    setCategory(cat);
                    setIsDropdownOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <span className={`block truncate ${category === cat ? 'font-semibold' : 'font-normal'}`}>
                    {cat}
                  </span>
                </div>
              ))}
              {/* Allow adding new category if it doesn't exist */}
              {category && !filteredCategories.some(c => c.toLowerCase() === category.toLowerCase()) && (
                <div className="cursor-default select-none relative py-2 pl-3 pr-9 text-gray-500 italic">
                  New category: &quot;{category}&quot;
                </div>
              )}
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Account</label>
          <select
            required
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          >
            <option value="">-- Select an account --</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">Link an account to sync balances.</p>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          className="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {initialData ? 'Update Transaction' : 'Add Transaction'}
        </button>
      </div>
    </form>
  );
};
