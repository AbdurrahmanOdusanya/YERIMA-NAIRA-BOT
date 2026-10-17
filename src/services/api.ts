import { AlertLog, AlertRule, BotConfig, HistoryPoint, RateInfo } from '../types';

async function safeJson<T>(res: Response, fallback?: T): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Server returned non-JSON response (${res.status}): ${contentType || 'text/html'}`);
  }
  try {
    return await res.json();
  } catch (err: any) {
    if (fallback !== undefined) return fallback;
    throw new Error('Failed to parse JSON response: ' + err.message);
  }
}

export const api = {
  // 1. Rates
  async getRates(): Promise<{ rates: Record<string, RateInfo>; history: HistoryPoint[]; timestamp: string }> {
    const res = await fetch('/api/rates', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Failed to fetch rates');
    return safeJson(res, { rates: {}, history: [], timestamp: new Date().toISOString() });
  },

  async refreshRates(): Promise<{ rates: Record<string, RateInfo>; triggeredAlerts: AlertLog[] }> {
    const res = await fetch('/api/rates/refresh', {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      const err = await safeJson<{ error?: string }>(res, {});
      throw new Error(err.error || `Server responded with ${res.status}`);
    }
    return safeJson(res, { rates: {}, triggeredAlerts: [] });
  },

  async simulateRateShift(payload: { currency: string; percentDelta?: number; customRate?: number }): Promise<{
    success: boolean;
    updatedRate: RateInfo;
    triggeredAlerts: AlertLog[];
  }> {
    const res = await fetch('/api/rates/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to simulate rate shift');
    return safeJson(res);
  },

  // 2. Alerts
  async getAlerts(): Promise<{ rules: AlertRule[]; logs: AlertLog[] }> {
    const res = await fetch('/api/alerts', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return safeJson(res, { rules: [], logs: [] });
  },

  async createAlert(rule: Omit<AlertRule, 'id' | 'triggerCount'>): Promise<{ success: boolean; rule: AlertRule }> {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(rule),
    });
    if (!res.ok) throw new Error('Failed to create alert');
    return safeJson(res);
  },

  async updateAlert(id: string, updates: Partial<AlertRule>): Promise<{ success: boolean; rule: AlertRule }> {
    const res = await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update alert');
    return safeJson(res);
  },

  async deleteAlert(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Failed to delete alert');
    return safeJson(res, { success: true });
  },

  async triggerTestAlert(id: string): Promise<{
    success: boolean;
    delivered: boolean;
    telegramError?: string;
    messagePreview: string;
    log: AlertLog;
  }> {
    const res = await fetch(`/api/alerts/${id}/trigger-test`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to trigger alert test');
    return safeJson(res);
  },

  // 3. Bot Config & Telegram API
  async getBotConfig(): Promise<{ config: BotConfig }> {
    const res = await fetch('/api/bot/config', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Failed to fetch bot config');
    return safeJson(res);
  },

  async updateBotConfig(config: Partial<BotConfig>): Promise<{ success: boolean; config: BotConfig }> {
    const res = await fetch('/api/bot/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error('Failed to update bot config');
    return safeJson(res);
  },

  async verifyBotToken(botToken: string): Promise<{
    success: boolean;
    bot?: { id: number; first_name: string; username: string };
    error?: string;
    message?: string;
  }> {
    const res = await fetch('/api/bot/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ botToken }),
    });
    return safeJson(res, { success: false, error: 'Verification failed' });
  },

  async getBotUpdates(token?: string): Promise<{
    success: boolean;
    chats?: Array<{ chatId: string; type: string; username?: string; title?: string; lastMessage?: string; date: string }>;
    error?: string;
  }> {
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    const res = await fetch(`/api/bot/updates${query}`, { headers: { Accept: 'application/json' } });
    return safeJson(res, { success: false, error: 'Failed to get updates' });
  },

  async sendTestMessage(payload: { botToken?: string; chatId?: string; message?: string }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const res = await fetch('/api/bot/send-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    return safeJson(res, { success: false, error: 'Failed to send message' });
  },

  // 4. Simulator
  async simulateBotCommand(message: string): Promise<{
    success: boolean;
    replyText: string;
    buttons?: Array<Array<{ text: string; callback_data: string }>>;
  }> {
    const res = await fetch('/api/bot/simulate-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error('Failed to simulate command');
    return safeJson(res, { success: false, replyText: 'Error simulating command' });
  },

  // 5. Telegram WebApp Integration
  async setMenuButton(payload: { botToken?: string; webAppUrl?: string }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    const res = await fetch('/api/bot/set-menu-button', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    return safeJson(res, { success: false, error: 'Failed to configure Telegram menu button' });
  },

  async createWebappAlert(payload: {
    currency: string;
    targetValue: number;
    condition: 'above' | 'below' | 'percent_change';
    marketType: 'parallel' | 'official' | 'usdt';
    telegramUser?: any;
  }): Promise<{ success: boolean; message?: string; rule?: AlertRule }> {
    const res = await fetch('/api/bot/webapp-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    return safeJson(res, { success: false });
  },
};
