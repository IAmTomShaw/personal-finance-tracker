import type { Account, Balance, Transaction } from '@/types/finance';

const roundCurrency = (amount: number) => Math.round(amount * 100) / 100;

const toDayKey = (date: Date) => date.toISOString().split('T')[0];

const isDateOnlyUTC = (date: Date) =>
  date.getUTCHours() === 0 &&
  date.getUTCMinutes() === 0 &&
  date.getUTCSeconds() === 0 &&
  date.getUTCMilliseconds() === 0;

const signedTransactionAmount = (tx: Transaction) =>
  tx.type === 'income' ? tx.amount : -tx.amount;

export interface DailyBalancePoint {
  dayKey: string;
  date: Date;
  amount: number;
}

export const computeAccountDailySeries = (
  accountId: string,
  balances: Balance[],
  transactions: Transaction[]
): DailyBalancePoint[] => {
  const snapshotByDay = new Map<string, { dateMs: number; amount: number }>();

  for (const balance of balances) {
    if (balance.accountId !== accountId) continue;
    if (!isDateOnlyUTC(balance.date)) continue;

    const dayKey = toDayKey(balance.date);
    const prev = snapshotByDay.get(dayKey);

    if (!prev || balance.date.getTime() >= prev.dateMs) {
      snapshotByDay.set(dayKey, { dateMs: balance.date.getTime(), amount: balance.amount });
    }
  }

  const transactionsByDay = new Map<string, Array<{ tx: Transaction; index: number }>>();
  for (let index = 0; index < transactions.length; index++) {
    const tx = transactions[index];
    if (tx.accountId !== accountId) continue;

    const dayKey = toDayKey(tx.date);
    const list = transactionsByDay.get(dayKey);
    if (list) list.push({ tx, index });
    else transactionsByDay.set(dayKey, [{ tx, index }]);
  }

  const dayKeys = Array.from(new Set([...snapshotByDay.keys(), ...transactionsByDay.keys()])).sort();

  let current = 0;
  const points: DailyBalancePoint[] = [];

  for (const dayKey of dayKeys) {
    const baseDate = new Date(dayKey);

    const snapshot = snapshotByDay.get(dayKey);
    if (snapshot) {
      current = roundCurrency(snapshot.amount);
      points.push({ dayKey, date: baseDate, amount: current });
    }

    const dayTransactions = transactionsByDay.get(dayKey) ?? [];
    // Stable order: primary by actual timestamp
    dayTransactions.sort((a, b) => {
      const at = a.tx.date.getTime();
      const bt = b.tx.date.getTime();
      if (at !== bt) return at - bt;
      return a.index - b.index;
    });

    for (let eventIndex = 0; eventIndex < dayTransactions.length; eventIndex++) {
      const { tx } = dayTransactions[eventIndex];
      current = roundCurrency(current + signedTransactionAmount(tx));

      // add a small offset so multiple events on the same day are visually distinct.
      const eventDate = new Date(baseDate.getTime() + (eventIndex + 1) * 1000);
      points.push({ dayKey, date: eventDate, amount: current });
    }
  }

  return points;
};

export const computeCurrentBalance = (
  accountId: string,
  balances: Balance[],
  transactions: Transaction[]
): number => {
  const series = computeAccountDailySeries(accountId, balances, transactions);
  return series.length > 0 ? series[series.length - 1].amount : 0;
};

export const buildSyntheticBalancesForCharts = (
  accounts: Account[],
  balances: Balance[],
  transactions: Transaction[],
  rangeStart?: Date
): Balance[] => {
  const rangeStartKey = rangeStart ? toDayKey(rangeStart) : null;

  const all: Balance[] = [];

  for (const account of accounts) {
    const series = computeAccountDailySeries(account.id, balances, transactions);

    if (series.length === 0) continue;

    let filtered = series;

    if (rangeStartKey) {
      const firstAfterIdx = series.findIndex(p => p.dayKey >= rangeStartKey);
      const hasAfter = firstAfterIdx !== -1;
      const lastBefore = hasAfter && firstAfterIdx > 0 ? series[firstAfterIdx - 1] : null;

      filtered = series.filter(p => p.dayKey >= rangeStartKey);

      // anchor point at the start of the range so charts don't jump from 0.
      if (hasAfter && lastBefore && filtered[0]?.dayKey !== rangeStartKey) {
        filtered = [{ dayKey: rangeStartKey, date: new Date(rangeStartKey), amount: lastBefore.amount }, ...filtered];
      }
    }

    for (const point of filtered) {
      all.push({
        id: `${account.id}:${point.dayKey}`,
        accountId: account.id,
        amount: point.amount,
        date: point.date,
      });
    }
  }

  return all;
};
