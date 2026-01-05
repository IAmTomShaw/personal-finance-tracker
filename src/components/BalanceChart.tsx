'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { Balance, Account } from '@/types/finance';
import { useCurrency } from '@/context/CurrencyContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface BalanceChartProps {
  account: Account;
  balances: Balance[];
  height?: number;
}

export const BalanceChart: React.FC<BalanceChartProps> = ({ account, balances, height = 400 }) => {
  const { formatCurrency, selectedCurrency } = useCurrency();
  // Sort balances by date
  const sortedBalances = balances
    .filter(balance => balance.accountId === account.id)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (sortedBalances.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No historical data available for this account</p>
      </div>
    );
  }

  const data = {
    labels: sortedBalances.map(balance => balance.date),
    datasets: [
      {
        label: account.name,
        data: sortedBalances.map(balance => balance.amount),
        borderColor: account.type === 'asset' ? 'rgb(34, 197, 94)' : 
                     account.type === 'liability' ? 'rgb(239, 68, 68)' : 
                     'rgb(59, 130, 246)',
        backgroundColor: account.type === 'asset' ? 'rgba(34, 197, 94, 0.1)' : 
                        account.type === 'liability' ? 'rgba(239, 68, 68, 0.1)' : 
                        'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${account.name} - Historical Balance`,
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'line'>) {
            const y = context.parsed.y;
            return y == null ? 'Balance: N/A' : `Balance: ${formatCurrency(y)}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
        },
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        title: {
          display: true,
          text: `Balance (${selectedCurrency.symbol})`,
        },
        ticks: {
          callback: function(value: number | string) {
            return formatCurrency(Number(value));
          },
        },
      },
    },
  };

  return (
    <div style={{ height: `${height}px` }} className="w-full">
      <Line data={data} options={options} />
    </div>
  );
};
