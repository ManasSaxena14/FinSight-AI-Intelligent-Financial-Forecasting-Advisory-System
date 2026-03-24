import apiClient from './client';

export const premiumService = {
  /**
   * Save a new financial goal
   */
  createGoal: async (payload) => {
    const response = await apiClient.post('/premium/goals', payload);
    return response.data;
  },

  /**
   * Get all active goals
   */
  getGoals: async () => {
    const response = await apiClient.get('/premium/goals');
    return response.data;
  },

  /**
   * Send a chat message to the AI advisor
   */
  sendChatMessage: async (message, context = null) => {
    const response = await apiClient.post('/premium/chat', { message, context });
    return response.data;
  },

  /**
   * Analyze a what-if budget scenario
   */
  analyzeScenario: async (payload) => {
    const response = await apiClient.post('/premium/scenario', payload);
    return response.data;
  },

  /**
   * Generate an AI narrative summary of monthly performance
   */
  getMonthlySummary: async (context) => {
    const response = await apiClient.post('/premium/summary', { message: "Generate summary", context });
    return response.data;
  }
};
