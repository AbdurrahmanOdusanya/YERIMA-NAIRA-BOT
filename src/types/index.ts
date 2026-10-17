export interface RateInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  officialRate: number;
  parallelRate: number;
  usdtRate?: number;
  change24h: number;
  changeAmount: number;
  high24h: number;
  low24h: number;
  lastUpdated: string;
}

export interface HistoryPoint {
  date: string;
  USD: number;
  EUR: number;
  GBP: number;
  CAD: number;
}

export interface AlertRule {
  id: string;
  name: string;
  currency: string;
  marketType: 'parallel' | 'official' | 'usdt';
  condition: 'above' | 'below' | 'percent_change';
  targetValue: number;
  isActive: boolean;
  cooldownMinutes: number;
  lastTriggered?: string;
  triggerCount: number;
  chatId?: string;
}

export interface AlertLog {
  id: string;
  timestamp: string;
  ruleId: string;
  ruleName: string;
  currency: string;
  marketType: string;
  currentRate: number;
  triggerReason: string;
  deliveredToTelegram: boolean;
  telegramError?: string;
}

export interface BotConfig {
  botToken: string;
  chatId: string;
  botName: string;
  botUsername: string;
  autoCheckIntervalSeconds: number;
  isEnabled: boolean;
  lastChecked?: string;
  botTokenMasked?: string;
  appUrl?: string;
  pollingStatus?: {
    active: boolean;
    lastPoll?: string;
    errors?: number;
  };
}

export interface ChatButton {
  text: string;
  callback_data?: string;
  web_app?: { url: string };
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  buttons?: Array<Array<ChatButton>>;
}

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

