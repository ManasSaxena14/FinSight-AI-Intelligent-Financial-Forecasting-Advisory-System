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
   * Delete a goal by ID
   */
  deleteGoal: async (goalId) => {
    const response = await apiClient.delete(`/premium/goals/${goalId}`);
    return response.data;
  },

  /**
   * Contribute savings to a specific goal
   */
  contributeToGoal: async (goalId, amount) => {
    const response = await apiClient.put(`/premium/goals/${goalId}/contribute`, { amount });
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
  },

  /**
   * Get AI-powered smart savings recommendations based on user data
   */
  getSmartSavings: async () => {
    const response = await apiClient.get('/premium/smart-savings');
    return response.data;
  },

  /**
   * Get real-time live budget status for the dashboard
   */
  getLiveBudget: async () => {
    const response = await apiClient.get('/premium/budget-live');
    return response.data;
  },

  /**
   * Get real-time notifications / alerts
   */
  getNotifications: async () => {
    const response = await apiClient.get('/premium/notifications');
    return response.data;
  },
};
