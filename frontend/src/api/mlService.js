import apiClient from './client';

export const mlService = {
  /**
   * Get dynamic health score based on latest income/expenses
   * @param {Object} profile - { income, expenses }
   * @returns {Promise<Object>} { score, status, savings_rate_pct, feedback }
   */
  getHealthScore: async (profile) => {
    const response = await apiClient.post('/ml/health-score', profile);
    return response.data;
  },

  /**
   * Forecast next month's total expense
   * @param {Object} profile - { income, expenses }
   * @returns {Promise<Object>} forecast data including predicted_next_month_expense
   */
  getForecast: async (profile) => {
    const response = await apiClient.post('/ml/forecast', profile);
    return response.data;
  },

  /**
   * Get AI recommendations and smart overspending alerts
   * @param {Object} profile - { income, expenses }
   * @returns {Promise<Object>} { recommendations: [...], alerts: [...] }
   */
  getRecommendations: async (profile) => {
    const response = await apiClient.post('/ml/recommendations', profile);
    return response.data;
  }
};
