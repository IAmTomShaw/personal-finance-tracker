'use client';

import React, { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Account, AccountWithBalance, Transaction } from '@/types/finance';
import { useCurrency } from '@/context/CurrencyContext';
import { CurrencySelector } from './CurrencySelector';
import { TransactionList } from './TransactionList';
import { AddTransactionForm } from './AddTransactionForm';
import WelcomeScreen from './WelcomeScreen';
import { ManageAccountModal } from './ManageAccountModal';

export const BalanceSheet: React.FC = () => {
  const { getAccountsWithBalances, deleteAccount, updateAccount, isLoading } = useFinance();
  const { formatCurrency } = useCurrency();
  const accountsWithBalances = getAccountsWithBalances();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [activeTab, setActiveTab] = useState<'balances' | 'transactions'>('balances');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleSaveAccount = (updates: Pick<Account, 'name' | 'category' | 'type'>) => {
    if (!editingAccount) return;
    updateAccount(editingAccount.id, updates);
    setEditingAccount(null);
  };

  const groupAccountsByType = (accounts: AccountWithBalance[]) => {
    return accounts.reduce((groups, account) => {
      if (!groups[account.type]) {
        groups[account.type] = {};
      }
      if (!groups[account.type][account.category]) {
        groups[account.type][account.category] = [];
      }
      groups[account.type][account.category].push(account);
      return groups;
    }, {} as Record<string, Record<string, AccountWithBalance[]>>);
  };

  const calculateTotalByType = (accounts: AccountWithBalance[], type: string) => {
    return accounts
      .filter(account => account.type === type)
      .reduce((total, account) => total + account.currentBalance, 0);
  };

  const groupedAccounts = groupAccountsByType(accountsWithBalances);
  const totalAssets = calculateTotalByType(accountsWithBalances, 'asset');
  const totalLiabilities = calculateTotalByType(accountsWithBalances, 'liability');
  const totalEquity = calculateTotalByType(accountsWithBalances, 'equity');
  const netWorth = totalAssets - totalLiabilities;

  const AccountSection: React.FC<{
    title: string;
    accounts: Record<string, AccountWithBalance[]>;
    total: number;
    type: 'asset' | 'liability' | 'equity';
  }> = ({ title, accounts, total, type }) => (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-300">
        {title}
      </h2>
      {Object.entries(accounts).map(([category, categoryAccounts]) => (
        <div key={category} className="mb-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{category}</h3>
          <div className="space-y-1">
            {categoryAccounts.map((account) => (
              <div
                key={account.id}
                className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
              >
                <span className="text-gray-800">{account.name}</span>
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${
                    account.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(account.currentBalance)}
                  </span>
                  <button
                    onClick={() => setEditingAccount(account)}
                    className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    title="Edit account"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteAccount(account.id)}
                    className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    title="Delete account"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-right mt-2 mr-3">
            <span className="text-sm font-medium text-gray-600">
              {category} Total: {formatCurrency(
                categoryAccounts.reduce((sum, account) => sum + account.currentBalance, 0)
              )}
            </span>
          </div>
        </div>
      ))}
      <div className="text-right font-bold text-lg border-t border-gray-300 pt-2 mt-4">
        <span className={`${type === 'asset' ? 'text-green-700' : type === 'liability' ? 'text-red-700' : 'text-blue-700'}`}>
          Total {title}: {formatCurrency(total)}
        </span>
      </div>
    </div>
  );

  // Show loading state during initial data fetch
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Personal Balance Sheet</h1>
            <p className="text-gray-600">Loading your financial data...</p>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (accountsWithBalances.length === 0 && activeTab === 'balances') {
    return <WelcomeScreen />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Personal Balance Sheet</h1>
          <p className="text-gray-600" suppressHydrationWarning>
            As of {new Date().toLocaleDateString()}
          </p>
        </div>
        {/* Currency Selection */}
        <div className="mb-8 flex justify-end">
          <CurrencySelector size="sm" />
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit mb-8">
          <button
            onClick={() => setActiveTab('balances')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'balances'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Balances & Accounts
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'transactions'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Transactions
          </button>
        </div>

        {activeTab === 'transactions' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Transaction History</h2>
              <button
                onClick={() => {
                  if (showAddTransaction) {
                    setShowAddTransaction(false);
                    setEditingTransaction(null);
                  } else {
                    setShowAddTransaction(true);
                    setEditingTransaction(null);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {showAddTransaction ? 'Cancel' : 'Add Transaction'}
              </button>
            </div>

            {showAddTransaction && (
              <AddTransactionForm 
                onUiClose={() => {
                  setShowAddTransaction(false);
                  setEditingTransaction(null);
                }}
                initialData={editingTransaction || undefined}
              />
            )}

            <TransactionList 
              onEdit={(transaction) => {
                setEditingTransaction(transaction);
                setShowAddTransaction(true);
              }}
            />
          </div>
        ) : (
          <>
            {groupedAccounts.asset && (
              <AccountSection
                title="Assets"
                accounts={groupedAccounts.asset}
                total={totalAssets}
                type="asset"
              />
            )}

            {/* Liabilities */}
            {groupedAccounts.liability && (
              <AccountSection
                title="Liabilities"
                accounts={groupedAccounts.liability}
                total={totalLiabilities}
                type="liability"
              />
            )}

            {/* Equity */}
            {groupedAccounts.equity && (
              <AccountSection
                title="Equity"
                accounts={groupedAccounts.equity}
                total={totalEquity}
                type="equity"
              />
            )}

            {/* Net Worth Summary */}
            <div className="border-t-2 border-gray-400 pt-6 mt-8">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600">Total Assets</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(totalAssets)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Liabilities</div>
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(totalLiabilities)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Net Worth</div>
                    <div className={`text-xl font-bold ${netWorth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(netWorth)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {editingAccount && (
        <ManageAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={handleSaveAccount}
        />
      )}
    </div>
  );
};
