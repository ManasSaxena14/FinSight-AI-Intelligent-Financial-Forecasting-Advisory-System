import apiClient from './client';

export const mlService = {
  /**
   * Everything the Analytics page needs, computed from the user's stored history:
   * health, forecast (80% ranges + backtest), overspend risk, anomalies, alerts,
   * recommendations, pattern, peer benchmarks, model_info.
   * Rejects with a 404 when the user has no data yet.
   */
  getInsights: async (months = 3) => {
    const { data } = await apiClient.get('/ml/insights', { params: { months } });
    return data;
  },

  /** Stateless rule-based health score for arbitrary numbers (used by what-if). */
  getHealthScore: async ({ income, expenses }) => {
    const { data } = await apiClient.post('/ml/health-score', { income, expenses });
    return data;
  },
};
