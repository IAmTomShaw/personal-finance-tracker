'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Account, Balance, AccountWithBalance, AccountWithHistory, ACCOUNT_CATEGORIES_TYPE, DEFAULT_ACCOUNT_CATEGORIES, AccountType } from '@/types/finance';
import { allowCloudSync, isCloudSyncAllowed } from '@/lib/offline';

interface FinanceContextType {
  accounts: Account[];
  balances: Balance[];
  isLoading: boolean;
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void;
  updateBalance: (accountId: string, amount: number) => void;
  updateMultipleBalances: (updates: { accountId: string; amount: number }[], date?: Date, replaceExisting?: boolean) => void;
  importBalances: (entries: { accountId: string; amount: number; date: Date }[], replaceExisting?: boolean) => void;
  getAccountsWithBalances: () => AccountWithBalance[];
  getAccountsWithHistory: () => AccountWithHistory[];
  deleteAccount: (accountId: string) => void;
  updateAccount: (accountId: string, updates: Pick<Account, 'name' | 'category' | 'type'>) => void;
  exportData: () => string;
  importData: (jsonData: string) => boolean;
  clearAllData: () => void;
  triggerCloudSync: () => Promise<void>;
  triggerRemoveCloudData: () => Promise<void>;
  // Category Management
  categories: ACCOUNT_CATEGORIES_TYPE;
  addCategory: (type: AccountType, name: string) => void;
  deleteCategory: (type: AccountType, name: string) => void;
  resetCategories: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [categories, setCategories] = useState<ACCOUNT_CATEGORIES_TYPE>(DEFAULT_ACCOUNT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from API on mount
  useEffect(() => {
    const savedAccounts = localStorage.getItem('finance-accounts');
    const savedBalances = localStorage.getItem('finance-balances');

    if (savedAccounts) {
      const parsedAccounts = JSON.parse(savedAccounts);
      setAccounts(parsedAccounts.map((acc: Account) => ({
        ...acc,
        createdAt: new Date(acc.createdAt)
      })));
    }
    if (savedBalances) {
      const parsedBalances = JSON.parse(savedBalances);
      setBalances(parsedBalances.map((bal: Balance) => ({
        ...bal,
        date: new Date(bal.date)
      })));
    }

    const savedCategories = localStorage.getItem('finance-categories');
    if (savedCategories) {
      try {
        setCategories(JSON.parse(savedCategories));
      } catch (e) {
        console.error('Failed to parse saved categories, using default', e);
        setCategories(DEFAULT_ACCOUNT_CATEGORIES);
      }
    }

    if (!isCloudSyncAllowed()) {
      setIsLoading(false);
      return;
    }
    getUserCloudData()
      .then((res: { accounts: Account[]; balances: Balance[] } | null) => {

        if (res === null) {
          allowCloudSync(false);
        } else {
          setAccounts(res.accounts);
          setBalances(res.balances.map(b => ({ ...b, date: new Date(b.date) })));

          localStorage.setItem('finance-accounts', JSON.stringify(res.accounts));
          localStorage.setItem('finance-balances', JSON.stringify(res.balances));
          allowCloudSync(true);
        }
      })
      .catch((error) => {
        console.error('Error fetching user cloud data:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const getUserCloudData = async (): Promise<{ accounts: Account[]; balances: Balance[] } | null> => {
    console.warn('Fetching user cloud data from API');
    const response = await fetch('/api/data', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return data;
  }

  const saveUserCloudData = async (accounts: Account[], balances: Balance[]) => {
    console.warn('Saving user cloud data to API');
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accounts, balances }),
    });

    if (!response.ok) {
      throw new Error('Failed to save user cloud data');
    }

    return;
  }

  const deleteUserCloudData = async (): Promise<void> => {
    console.warn('Deleting user cloud data from API');
    const response = await fetch('/api/data', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete user cloud data');
    }

    return;
  }

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('finance-accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('finance-balances', JSON.stringify(balances));
  }, [balances]);

  useEffect(() => {
    localStorage.setItem('finance-categories', JSON.stringify(categories));
  }, [categories]);

  const triggerCloudSync = () => {
    return saveUserCloudData(accounts, balances);
  }

  const triggerRemoveCloudData = () => {
    return deleteUserCloudData();
  }

  const addAccount = (accountData: Omit<Account, 'id' | 'createdAt'>) => {

    // If the user is using the API version, create account via API

    const newAccount: Account = {
      ...accountData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setAccounts(prev => [...prev, newAccount]);

    if (isCloudSyncAllowed()) {
      return saveUserCloudData([...accounts, newAccount], balances);
    }

  };

  const updateBalance = (accountId: string, amount: number) => {

    const newBalance: Balance = {
      id: crypto.randomUUID(),
      accountId,
      amount,
      date: new Date(),
    };
    setBalances(prev => [...prev, newBalance]);

    if (isCloudSyncAllowed()) {
      return saveUserCloudData(accounts, [...balances, newBalance]);
    }
  };

  const updateAccount = (accountId: string, updates: Pick<Account, 'name' | 'category' | 'type'>) => {
    setAccounts(prev => {
      const updatedAccounts = prev.map(account =>
        account.id === accountId ? { ...account, ...updates } : account
      );

      if (isCloudSyncAllowed()) {
        saveUserCloudData(updatedAccounts, balances);
      }

      return updatedAccounts;
    });
  };

  const updateMultipleBalances = (
    updates: { accountId: string; amount: number }[],
    date?: Date,
    replaceExisting: boolean = false
  ) => {
    const balanceDate = date || new Date();
    const targetDateString = balanceDate.toISOString().split('T')[0];

    const newBalances = updates.map(update => ({
      id: crypto.randomUUID(),
      accountId: update.accountId,
      amount: update.amount,
      date: balanceDate,
    }));

    setBalances(prev => {
      const filteredPrev = replaceExisting
        ? prev.filter(balance => balance.date.toISOString().split('T')[0] !== targetDateString)
        : prev;

      const updatedBalances = [...filteredPrev, ...newBalances];

      if (isCloudSyncAllowed()) {
        saveUserCloudData(accounts, updatedBalances);
      }

      return updatedBalances;
    });
  };

  const importBalances = (
    entries: { accountId: string; amount: number; date: Date }[],
    replaceExisting: boolean = false
  ) => {
    if (entries.length === 0) return;

    setBalances(prev => {
      let updatedPrev = prev;

      if (replaceExisting) {
        const dateKeys = new Set(
          entries.map(entry => `${entry.accountId}|${entry.date.toISOString().split('T')[0]}`)
        );
        updatedPrev = prev.filter(
          balance => !dateKeys.has(`${balance.accountId}|${balance.date.toISOString().split('T')[0]}`)
        );
      }

      const newBalances = entries.map(entry => ({
        id: crypto.randomUUID(),
        accountId: entry.accountId,
        amount: entry.amount,
        date: entry.date,
      }));

      const mergedBalances = [...updatedPrev, ...newBalances];

      if (isCloudSyncAllowed()) {
        saveUserCloudData(accounts, mergedBalances);
      }

      return mergedBalances;
    });
  };

  const getAccountsWithBalances = (): AccountWithBalance[] => {
    return accounts.map(account => {
      // Get the most recent balance for this account
      const accountBalances = balances
        .filter(balance => balance.accountId === account.id)
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      const currentBalance = accountBalances.length > 0 ? accountBalances[0].amount : 0;

      return {
        ...account,
        currentBalance,
      };
    });

  };

  const deleteAccount = (accountId: string) => {
    setAccounts(prev => prev.filter(account => account.id !== accountId));
    setBalances(prev => prev.filter(balance => balance.accountId !== accountId));

    if (isCloudSyncAllowed()) {
      return deleteUserCloudData();
    }
  };

  const addCategory = (type: AccountType, name: string) => {
    if (categories[type].includes(name)) return;

    setCategories(prev => ({
      ...prev,
      [type]: [...prev[type], name]
    }));
  };

  const deleteCategory = (type: AccountType, name: string) => {
    setCategories(prev => ({
      ...prev,
      [type]: prev[type].filter(c => c !== name)
    }));
  };

  const resetCategories = () => {
    setCategories(DEFAULT_ACCOUNT_CATEGORIES);
  };

  const exportData = (): string => {

    const accountsExportData = accounts;
    const balancesExportData = balances;
    const categoriesExportData = categories;

    const exportData = {
      version: '1.1',
      exportDate: new Date().toISOString(),
      accountsExportData,
      balancesExportData,
      categoriesExportData,
    };
    return JSON.stringify(exportData, null, 2);
  };

  const importData = (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData);

      // Validate the data structure
      if (!data.accounts || !data.balances || !Array.isArray(data.accounts) || !Array.isArray(data.balances)) {
        console.error('Invalid data format: missing accounts or balances arrays');
        return false;
      }

      // Validate accounts structure
      for (const account of data.accounts) {
        if (!account.id || !account.name || !account.type || !account.category) {
          console.error('Invalid account structure:', account);
          return false;
        }
      }

      // Validate balances structure
      for (const balance of data.balances) {
        if (!balance.id || !balance.accountId || typeof balance.amount !== 'number' || !balance.date) {
          console.error('Invalid balance structure:', balance);
          return false;
        }
      }

      // Convert date strings back to Date objects
      const importedAccounts = data.accounts.map((acc: Partial<Account> & { createdAt: string }) => ({
        ...acc,
        createdAt: new Date(acc.createdAt)
      }));

      const importedBalances = data.balances.map((bal: Partial<Balance> & { date: string }) => ({
        ...bal,
        date: new Date(bal.date)
      }));

      // Replace current data
      setAccounts(importedAccounts);
      setBalances(importedBalances);

      // Import categories if present (v1.1+)
      if (data.categoriesExportData) {
        setCategories(data.categoriesExportData);
      } else {
        // Fallback for v1.0 imports: keep existing or reset? 
        // Let's keep existing to be safe, or we could reset to default.
        // Actually, if importing a full backup, we might expect categories to reset to default if not provided.
        // But for backward compatibility with v1.0 backups, let's just stick to defaults.
        setCategories(DEFAULT_ACCOUNT_CATEGORIES);
      }

      if (isCloudSyncAllowed()) {

        saveUserCloudData(importedAccounts, importedBalances);

      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  };

  const clearAllData = () => {
    setAccounts([]);
    setBalances([]);
    setCategories(DEFAULT_ACCOUNT_CATEGORIES);
    localStorage.removeItem('finance-accounts');
    localStorage.removeItem('finance-balances');
    localStorage.removeItem('finance-categories');
  };

  const getAccountsWithHistory = (): AccountWithHistory[] => {
    return accounts.map(account => {
      // Get balances for this account within the date range
      const accountBalances = balances
        .filter(balance =>
          balance.accountId === account.id
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      return {
        ...account,
        balanceHistory: accountBalances,
      };
    });
  }

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        balances,
        isLoading,
        addAccount,
        updateBalance,
        updateMultipleBalances,
        importBalances,
        getAccountsWithBalances,
        updateAccount,
        deleteAccount,
        exportData,
        importData,
        clearAllData,
        triggerCloudSync,
        triggerRemoveCloudData,
        getAccountsWithHistory,
        categories,
        addCategory,
        deleteCategory,
        resetCategories,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};
