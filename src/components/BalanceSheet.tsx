'use client';

import { useState } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { Account, AccountWithBalance } from '@/types/finance';
import { useCurrency } from '@/context/CurrencyContext';
import { CurrencySelector } from './CurrencySelector';
import WelcomeScreen from './WelcomeScreen';
import { ManageAccountModal } from './ManageAccountModal';
import { ConfirmationModal } from './ui/ConfirmationModal';

export const BalanceSheet = () => {
  const { getAccountsWithBalances, deleteAccount, updateAccount, isLoading } = useFinance();
  const { formatCurrency } = useCurrency();
  const accountsWithBalances = getAccountsWithBalances();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

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

  const AccountSection = ({ title, accounts, total, type }: {
    title: string;
    accounts: Record<string, AccountWithBalance[]>;
    total: number;
    type: 'asset' | 'liability' | 'equity';
  }) => (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-800 dark:text-neutral-100 mb-4 pb-2 border-b border-gray-300 dark:border-neutral-600">
        {title}
      </h2>
      {Object.entries(accounts).map(([category, categoryAccounts]) => (
        <div key={category} className="mb-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-neutral-300 mb-2">{category}</h3>
          <div className="space-y-1">
            {categoryAccounts.map((account) => (
              <div
                key={account.id}
                className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-neutral-700/50 rounded hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <span className="text-gray-800 dark:text-neutral-200">{account.name}</span>
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${account.currentBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                    {formatCurrency(account.currentBalance)}
                  </span>
                  <button
                    onClick={() => setEditingAccount(account)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    title="Edit account"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setAccountToDelete(account)}
                    className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    title="Delete account"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-right mt-2 mr-3">
            <span className="text-sm font-medium text-gray-600 dark:text-neutral-400">
              {category} Total: {formatCurrency(
                categoryAccounts.reduce((sum, account) => sum + account.currentBalance, 0)
              )}
            </span>
          </div>
        </div>
      ))}
      <div className="text-right font-bold text-lg border-t border-gray-300 dark:border-neutral-600 pt-2 mt-4">
        <span className={`${type === 'asset' ? 'text-green-700 dark:text-green-400' : type === 'liability' ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}>
          Total {title}: {formatCurrency(total)}
        </span>
      </div>
    </div>
  );

  // Show loading state during initial data fetch
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg dark:shadow-neutral-900/50 p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-neutral-100 mb-2">Personal Balance Sheet</h1>
            <p className="text-gray-600 dark:text-neutral-400">Loading your financial data...</p>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (accountsWithBalances.length === 0) {
    return <WelcomeScreen />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg dark:shadow-neutral-900/50 p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-neutral-100 mb-2">Personal Balance Sheet</h1>
          <p className="text-gray-600 dark:text-neutral-400" suppressHydrationWarning>
            As of {new Date().toLocaleDateString()}
          </p>
        </div>
        {/* Currency Selection */}
        <div className="mb-8 flex justify-end">
          <CurrencySelector size="sm" />
        </div>
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
        <div className="border-t-2 border-gray-400 dark:border-neutral-500 pt-6 mt-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-600 dark:text-neutral-400">Total Assets</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(totalAssets)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-neutral-400">Total Liabilities</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(totalLiabilities)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-neutral-400">Net Worth</div>
                <div className={`text-xl font-bold ${netWorth >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {formatCurrency(netWorth)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingAccount && (
        <ManageAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={handleSaveAccount}
        />
      )}

      <ConfirmationModal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={() => {
          if (accountToDelete) {
            deleteAccount(accountToDelete.id);
            setAccountToDelete(null);
          }
        }}
        title={
          accountToDelete?.category === 'Credit Cards'
            ? 'Remove Card Record'
            : accountToDelete?.category === 'Cash and Cash Equivalents'
              ? 'Remove Cash Account'
              : `Remove ${accountToDelete?.category || 'Account'} Record`
        }
        message={`Are you sure you want to delete "${accountToDelete?.name && accountToDelete.name.length > 50
          ? accountToDelete.name.substring(0, 50) + '...'
          : accountToDelete?.name
          }"? This will also remove all associated balance history. This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
