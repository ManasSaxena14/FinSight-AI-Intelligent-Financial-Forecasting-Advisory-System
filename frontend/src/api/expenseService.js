import apiClient from './client';

/** Let every mounted view know the user's data changed. */
export const notifyExpensesUpdated = () => {
  try {
    window.dispatchEvent(new Event('expenses:updated'));
  } catch {
    // non-browser environment
  }
};

export const expenseService = {
  /** Add a month's totals: { period: 'YYYY-MM', income, expenses: {cat: amount} } */
  addMonthlyTotals: async (payload) => {
    const { data } = await apiClient.post('/expenses/add', payload);
    notifyExpensesUpdated();
    return data;
  },

  /** Monthly records, newest period first. */
  getExpenses: async () => {
    const { data } = await apiClient.get('/expenses/get');
    return data;
  },

  /** { date: 'YYYY-MM-DD', type: 'income'|'expense', category?, amount, merchant?, note? } */
  addTransaction: async (payload) => {
    const { data } = await apiClient.post('/transactions', payload);
    notifyExpensesUpdated();
    return data;
  },

  getTransactions: async ({ period, limit = 50 } = {}) => {
    const { data } = await apiClient.get('/transactions', { params: { period, limit } });
    return data;
  },

  deleteTransaction: async (id) => {
    const { data } = await apiClient.delete(`/transactions/${id}`);
    notifyExpensesUpdated();
    return data;
  },
};
