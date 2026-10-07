import apiClient, { streamEvents } from './client';
import { notifyExpensesUpdated } from './expenseService';

export const advisorService = {
  listConversations: async () => (await apiClient.get('/advisor/conversations')).data,
  getConversation: async (id) => (await apiClient.get(`/advisor/conversations/${id}`)).data,
  renameConversation: async (id, title) => (await apiClient.patch(`/advisor/conversations/${id}`, { title })).data,
  deleteConversation: async (id) => (await apiClient.delete(`/advisor/conversations/${id}`)).data,
  suggestions: async () => (await apiClient.get('/advisor/suggestions')).data,
  feedback: async (conversationId, messageId, rating, comment) =>
    (await apiClient.post('/advisor/feedback', { conversation_id: conversationId, message_id: messageId, rating, comment })).data,

  /** Streams agent events (meta, token, tool, card, sources, done) to onEvent. */
  chat: (message, conversationId, { onEvent, signal } = {}) =>
    streamEvents('/advisor/chat', { message, conversation_id: conversationId || undefined }, { onEvent, signal }),

  transcribe: async (blob, language) => {
    const form = new FormData();
    const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    form.append('audio', blob, `voice.${ext}`);
    if (language) form.append('language', language);
    return (await apiClient.post('/advisor/transcribe', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
};

export const aiService = {
  parseText: async (text) => (await apiClient.post('/ai/parse', { text })).data,
  categorize: async (merchant, note) => (await apiClient.get('/ai/categorize', { params: { merchant, note } })).data,

  importFile: async (file) => {
    const form = new FormData();
    form.append('file', file);
    return (await apiClient.post('/ai/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  importSms: async (sms) => {
    const form = new FormData();
    form.append('sms', sms);
    return (await apiClient.post('/ai/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  scanReceipt: async (file) => {
    const form = new FormData();
    form.append('image', file);
    return (await apiClient.post('/ai/receipt', form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },

  /** Save confirmed proposals. source: ai-text | import | receipt | advisor | voice */
  confirmTransactions: async (transactions, source) => {
    const payload = transactions.map(({ date, type, category, amount, merchant, note }) => ({
      date, type, category: type === 'income' ? undefined : category, amount: Number(amount), merchant: merchant || undefined, note: note || undefined,
    }));
    const { data } = await apiClient.post('/transactions/batch', { transactions: payload, source });
    notifyExpensesUpdated();
    return data;
  },

  whatIf: async (text) => (await apiClient.post('/ai/what-if', { text })).data,
  explainChange: async () => (await apiClient.get('/ai/explain-change')).data,
  recurring: async () => (await apiClient.get('/ai/recurring')).data,
  suggestBudgets: async (target = 0.2) => (await apiClient.get('/ai/budgets/suggest', { params: { target } })).data,
  getBudgets: async () => (await apiClient.get('/ai/budgets')).data,
  saveBudgets: async (categories, targetRate) => (await apiClient.put('/ai/budgets', { categories, target_rate: targetRate })).data,
  goalPlan: async (goalId, monthly) => (await apiClient.get(`/ai/goals/${goalId}/plan`, { params: { monthly: monthly || undefined } })).data,
  digest: async (refresh = false) => (await apiClient.get('/ai/digest', { params: { refresh } })).data,
  itemFeedback: async (kind, key, rating) => (await apiClient.post('/ai/feedback', { kind, key, rating })).data,
  resetFeedback: async (kind) => (await apiClient.post('/ai/feedback/reset', null, { params: { kind } })).data,
  modelInfo: async () => (await apiClient.get('/ml/model-info')).data,
  getPreferences: async () => (await apiClient.get('/ai/preferences')).data,
  setLanguage: async (language) => (await apiClient.put('/ai/preferences', { language })).data,
};

export const apiError = (err, fallback) => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg.replace(/^Value error, /, '');
  return fallback;
};
