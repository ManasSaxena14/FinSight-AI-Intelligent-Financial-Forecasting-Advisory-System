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
   * Forecast next N months of expenses (data-driven seasonal patterns)
   * @param {Object} payload - { income, expenses, months? }
   * @returns {Promise<Object>} {
   *   predicted_next_month_expense, trend_direction,
   *   forecast: [{ month, month_name, predicted_expense, savings, categories }],
   *   average_predicted_expense, average_savings
   * }
   */
  getForecast: async (payload) => {
    try {
      const response = await apiClient.post('/ml/forecast', payload);
      return response.data;
    } catch (error) {
      // Retry once for transient backend/model warmup failures.
      const status = error?.response?.status;
      if (status >= 500) {
        const retry = await apiClient.post('/ml/forecast', payload);
        return retry.data;
      }
      throw error;
    }
  },

  /**
   * Behavioral classification using upgraded GBM classifier
   * @param {Object} payload - { income, expenses }
   * @returns {Promise<Object>} { predicted_class, confidence_score, behavioral_insight }
   */
  getClassification: async (payload) => {
    const response = await apiClient.post('/ml/predict-classification', payload);
    return response.data;
  },

  /**
   * Get AI recommendations and smart overspending alerts
   * @param {Object} profile - { income, expenses, previous_expenses? }
   * @returns {Promise<Object>} {
   *   recommendations: [...], alerts: [...], anomalies: [...],
   *   overall_anomaly_score: number
   * }
   */
  getRecommendations: async (profile) => {
    const response = await apiClient.post('/ml/recommendations', profile);
    return response.data;
  },

  /**
   * NEW — Predict savings risk using upgraded GBM classifier with feature engineering
   * @param {Object} profile - { income, expenses }
   * @returns {Promise<Object>} {
   *   risk_level: "low"|"medium"|"high",
   *   predicted_class: 0|1|2,
   *   class_label: "Good"|"Moderate"|"Poor",
   *   probabilities: { Poor, Moderate, Good },
   *   confidence: number,
   *   risk_score: number   // 0 = safe, 100 = critical
   * }
   */
  getSavingsRisk: async (profile) => {
    const response = await apiClient.post('/ml/savings-risk', profile);
    return response.data;
  },

  /**
   * NEW — Identify spending archetype and peer comparison
   * @param {Object} profile - { income, expenses }
   * @returns {Promise<Object>} {
   *   archetype: string,
   *   dominant_category: string,
   *   dominant_pct: number,
   *   essential_ratio: number,
   *   discretionary_ratio: number,
   *   savings_ratio: number,
   *   peer_comparison: string
   * }
   */
  getSpendingPattern: async (profile) => {
    const response = await apiClient.post('/ml/spending-pattern', profile);
    return response.data;
  },
};