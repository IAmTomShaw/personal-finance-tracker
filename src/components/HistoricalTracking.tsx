'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/context/FinanceContext';
import { BalanceChart } from './BalanceChart';
import { NetWorthChart } from './NetWorthChart';
import { useCurrency } from '@/context/CurrencyContext';
import { CurrencySelector } from './CurrencySelector';
import { buildSyntheticBalancesForCharts } from '@/lib/balance-history';

export const HistoricalTracking: React.FC = () => {
  const { accounts, balances, transactions, isLoading } = useFinance();
  const { formatCurrency } = useCurrency();
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  const getDateRangeFilter = (range: string) => {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // Beginning of time
    }
  };

  const dateFilter = useMemo(() => getDateRangeFilter(dateRange), [dateRange]);

  const chartBalances = useMemo(() => {
    return buildSyntheticBalancesForCharts(accounts, balances, transactions, dateFilter);
  }, [accounts, balances, transactions, dateFilter]);

  const accountsWithHistory = useMemo(() => {
    const toReturn = accounts.filter(account => 
      chartBalances.some(balance => balance.accountId === account.id)
    );
    return toReturn;
  }, [accounts, chartBalances]);

  const getAccountBalanceHistory = (accountId: string) => {
    return chartBalances
      .filter(balance => balance.accountId === accountId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const getAccountLatestBalance = (accountId: string) => {
    const accountBalances = getAccountBalanceHistory(accountId);
    return accountBalances.length > 0 ? accountBalances[accountBalances.length - 1].amount : 0;
  };

  const getAccountChangeFromFirst = (accountId: string) => {
    const accountBalances = getAccountBalanceHistory(accountId);
    if (accountBalances.length < 2) return 0;
    
    const first = accountBalances[0].amount;
    const latest = accountBalances[accountBalances.length - 1].amount;
    return latest - first;
  };

  const getAccountChangePercentage = (accountId: string) => {
    const accountBalances = getAccountBalanceHistory(accountId);
    if (accountBalances.length < 2) return 0;
    
    const first = accountBalances[0].amount;
    const latest = accountBalances[accountBalances.length - 1].amount;
    
    if (first === 0) return 0;
    return ((latest - first) / Math.abs(first)) * 100;
  };

  const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);

  // Show loading state while hydrating or loading data
  if (!isClient || isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Historical Tracking</h1>
            <p className="text-gray-600">Loading your historical data...</p>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (accountsWithHistory.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No historical data available</div>
            <p className="text-gray-400">Record some balances to see charts and trends.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Historical Tracking</h1>
          <p className="text-gray-600">View balance trends and historical data for your accounts</p>
        </div>

        {/* Currency Selection */}
        <div className="mb-6 flex justify-end">
          <CurrencySelector size="sm" />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <label htmlFor="account-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Account
            </label>
            <select
              id="account-select"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Accounts Overview</option>
              {accountsWithHistory.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 mb-2">
              Time Period
            </label>
            <select
              id="date-range"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | '1y' | 'all')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        {/* Chart Display */}
        {selectedAccount === 'all' ? (
          <div className="space-y-8">
            {/* Net Worth Chart */}
            <div className="mb-8">
              <NetWorthChart 
                accounts={accounts}
                balances={chartBalances}
                height={400}
              />
            </div>
            
            <h2 className="text-xl font-bold text-gray-800 mb-4">Individual Account Summary</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {accountsWithHistory.map((account) => {
                const latestBalance = getAccountLatestBalance(account.id);
                const change = getAccountChangeFromFirst(account.id);
                const changePercent = getAccountChangePercentage(account.id);
                
                return (
                  <div key={account.id} className="bg-gray-50 rounded-lg p-4 border">
                    <h3 className="font-semibold text-gray-800 mb-2">{account.name}</h3>
                    <div className="text-lg font-bold mb-1 text-gray-900">
                      {formatCurrency(latestBalance)}
                    </div>
                    <div className={`text-sm flex items-center space-x-2 ${
                      change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <span>{change >= 0 ? '↗' : '↘'}</span>
                      <span>
                        {formatCurrency(Math.abs(change))} 
                        ({Math.abs(changePercent).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getAccountBalanceHistory(account.id).length} data points
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Individual Charts */}
            <div className="space-y-8">
              {accountsWithHistory.map((account) => (
                <div key={account.id} className="border rounded-lg p-4">
                  <BalanceChart 
                    account={account} 
                    balances={chartBalances}
                    height={300}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          selectedAccountData && (
            <div>
              <BalanceChart 
                account={selectedAccountData} 
                balances={chartBalances}
                height={500}
              />
              
              {/* Account Details */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Current Balance</h3>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(getAccountLatestBalance(selectedAccount))}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Change</h3>
                  <div className={`text-2xl font-bold ${
                    getAccountChangeFromFirst(selectedAccount) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(getAccountChangeFromFirst(selectedAccount))}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Data Points</h3>
                  <div className="text-2xl font-bold text-gray-600">
                    {getAccountBalanceHistory(selectedAccount).length}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
