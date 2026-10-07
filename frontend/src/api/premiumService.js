import apiClient, { streamEvents } from './client';

export const premiumService = {
  createGoal: async (payload) => (await apiClient.post('/premium/goals', payload)).data,
  getGoals: async () => (await apiClient.get('/premium/goals')).data,
  deleteGoal: async (goalId) => (await apiClient.delete(`/premium/goals/${goalId}`)).data,
  contributeToGoal: async (goalId, amount) => (await apiClient.put(`/premium/goals/${goalId}/contribute`, { amount })).data,

  /** Non-streaming chat (kept for simple callers). History: [{ role: 'user'|'advisor', text }] */
  sendChatMessage: async (message, history = []) =>
    (await apiClient.post('/premium/chat', { message, history })).data,

  /**
   * Streaming chat. onToken(text) is called per chunk; resolves to { source }.
   * Context is built on the server from the user's own data.
   */
  streamChat: async (message, history = [], { onToken, signal } = {}) => {
    let source = 'llm';
    await streamEvents('/premium/chat/stream', { message, history }, {
      signal,
      onEvent: (event) => {
        if (event.type === 'token') onToken?.(event.text);
        if (event.type === 'done') source = event.source;
      },
    });
    return { source };
  },

  analyzeScenario: async (payload) => (await apiClient.post('/premium/scenario', payload)).data,

  /** AI narration of the user's ML results ({ reply, source }). */
  getMonthlySummary: async () => (await apiClient.post('/premium/summary', { message: 'summary' })).data,

  getSmartSavings: async () => (await apiClient.get('/premium/smart-savings')).data,
  getLiveBudget: async () => (await apiClient.get('/premium/budget-live')).data,
  getNotifications: async () => (await apiClient.get('/premium/notifications')).data,
};
