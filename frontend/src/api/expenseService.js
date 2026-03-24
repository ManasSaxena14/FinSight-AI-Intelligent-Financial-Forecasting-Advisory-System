import apiClient from './client';

export const expenseService = {
  /**
   * Submit a new expense record
   * @param {Object} payload - { month, income, expenses }
   * @returns {Promise<Object>} The saved expense record
   */
  addExpense: async (payload) => {
    const response = await apiClient.post('/expenses/add', payload);
    return response.data;
  },

  /**
   * Retrieve all expenses for the authenticated user
   * @returns {Promise<Array>} List of expense records sorted by date descending
   */
  getExpenses: async () => {
    const response = await apiClient.get('/expenses/get');
    return response.data;
  }
};
