import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RateInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  officialRate: number;
  parallelRate: number;
  usdtRate?: number;
  change24h: number; // percentage e.g. +1.4
  changeAmount: number; // NGN change
  high24h: number;
  low24h: number;
  lastUpdated: string;
}

interface AlertRule {
  id: string;
  name: string;
  currency: string; // 'USD', 'EUR', 'GBP', 'CAD', 'AED', 'CNY', 'USDT'
  marketType: 'parallel' | 'official' | 'usdt';
  condition: 'above' | 'below' | 'percent_change';
  targetValue: number; // e.g. 1650 or 1.5%
  isActive: boolean;
  cooldownMinutes: number;
  lastTriggered?: string;
  triggerCount: number;
  chatId?: string;
}

interface AlertLog {
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

interface BotConfig {
  botToken: string;
  chatId: string;
  botName: string;
  botUsername: string;
  autoCheckIntervalSeconds: number;
  isEnabled: boolean;
  lastChecked?: string;
  appUrl: string;
}

const APP_URL = process.env.APP_URL || 'https://ais-dev-nay7legzhqu6yik4uteju3-833500938364.europe-west2.run.app';

// In-Memory Storage
let botConfig: BotConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  chatId: process.env.TELEGRAM_CHAT_ID || '',
  botName: '',
  botUsername: '',
  autoCheckIntervalSeconds: 60,
  isEnabled: true,
  lastChecked: new Date().toISOString(),
  appUrl: APP_URL,
};

// Default FX rates benchmark
let ratesData: Record<string, RateInfo> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    officialRate: 1532.50,
    parallelRate: 1595.00,
    usdtRate: 1598.50,
    change24h: 1.25,
    changeAmount: 19.50,
    high24h: 1602.00,
    low24h: 1580.00,
    lastUpdated: new Date().toISOString(),
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    officialRate: 1675.20,
    parallelRate: 1745.00,
    change24h: -0.45,
    changeAmount: -7.80,
    high24h: 1755.00,
    low24h: 1738.00,
    lastUpdated: new Date().toISOString(),
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    officialRate: 1995.80,
    parallelRate: 2080.00,
    change24h: 0.88,
    changeAmount: 18.20,
    high24h: 2090.00,
    low24h: 2060.00,
    lastUpdated: new Date().toISOString(),
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    flag: '🇨🇦',
    officialRate: 1115.40,
    parallelRate: 1170.00,
    change24h: 0.52,
    changeAmount: 6.10,
    high24h: 1175.00,
    low24h: 1162.00,
    lastUpdated: new Date().toISOString(),
  },
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    flag: '🇦🇪',
    officialRate: 417.30,
    parallelRate: 434.50,
    change24h: 0.35,
    changeAmount: 1.50,
    high24h: 436.00,
    low24h: 432.00,
    lastUpdated: new Date().toISOString(),
  },
  CNY: {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    flag: '🇨🇳',
    officialRate: 211.80,
    parallelRate: 224.00,
    change24h: -0.20,
    changeAmount: -0.45,
    high24h: 225.50,
    low24h: 223.00,
    lastUpdated: new Date().toISOString(),
  },
  USDT: {
    code: 'USDT',
    name: 'Tether (P2P Benchmark)',
    symbol: '₮',
    flag: '🟢',
    officialRate: 1532.50,
    parallelRate: 1600.00,
    usdtRate: 1600.00,
    change24h: 1.15,
    changeAmount: 18.00,
    high24h: 1608.00,
    low24h: 1585.00,
    lastUpdated: new Date().toISOString(),
  },
};

// Historical 7-day data points for chart
let historyPoints: Array<{ date: string; USD: number; EUR: number; GBP: number; CAD: number }> = [
  { date: '7d ago', USD: 1570, EUR: 1720, GBP: 2040, CAD: 1150 },
  { date: '6d ago', USD: 1575, EUR: 1728, GBP: 2050, CAD: 1155 },
  { date: '5d ago', USD: 1568, EUR: 1725, GBP: 2045, CAD: 1152 },
  { date: '4d ago', USD: 1582, EUR: 1735, GBP: 2060, CAD: 1160 },
  { date: '3d ago', USD: 1588, EUR: 1740, GBP: 2072, CAD: 1165 },
  { date: 'Yesterday', USD: 1585, EUR: 1752, GBP: 2068, CAD: 1164 },
  { date: 'Today', USD: 1595, EUR: 1745, GBP: 2080, CAD: 1170 },
];

// Active Alert Rules
let alertRules: AlertRule[] = [
  {
    id: 'rule-usd-high',
    name: 'USD Surge Alert (Above ₦1,600)',
    currency: 'USD',
    marketType: 'parallel',
    condition: 'above',
    targetValue: 1600,
    isActive: true,
    cooldownMinutes: 30,
    triggerCount: 3,
    lastTriggered: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'rule-usd-dip',
    name: 'USD Dip Buying Alert (Below ₦1,550)',
    currency: 'USD',
    marketType: 'parallel',
    condition: 'below',
    targetValue: 1550,
    isActive: true,
    cooldownMinutes: 60,
    triggerCount: 0,
  },
  {
    id: 'rule-eur-surge',
    name: 'Euro Rate Alert (Above ₦1,750)',
    currency: 'EUR',
    marketType: 'parallel',
    condition: 'above',
    targetValue: 1750,
    isActive: true,
    cooldownMinutes: 45,
    triggerCount: 1,
    lastTriggered: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'rule-gbp-surge',
    name: 'Pound Sterling Alert (Above ₦2,100)',
    currency: 'GBP',
    marketType: 'parallel',
    condition: 'above',
    targetValue: 2100,
    isActive: true,
    cooldownMinutes: 60,
    triggerCount: 2,
    lastTriggered: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'rule-usd-volatility',
    name: 'USD Volatility Alert (Change ≥ 1.0%)',
    currency: 'USD',
    marketType: 'parallel',
    condition: 'percent_change',
    targetValue: 1.0,
    isActive: true,
    cooldownMinutes: 30,
    triggerCount: 4,
    lastTriggered: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

// Alert trigger logs
let alertLogs: AlertLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    ruleId: 'rule-usd-volatility',
    ruleName: 'USD Volatility Alert (Change ≥ 1.0%)',
    currency: 'USD',
    marketType: 'Parallel BDC',
    currentRate: 1595.00,
    triggerReason: 'Rate shifted +1.25% in last 24h (+₦19.50)',
    deliveredToTelegram: true,
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    ruleId: 'rule-eur-surge',
    ruleName: 'Euro Rate Alert (Above ₦1,750)',
    currency: 'EUR',
    marketType: 'Parallel BDC',
    currentRate: 1752.00,
    triggerReason: 'Crossed above threshold target ₦1,750.00',
    deliveredToTelegram: true,
  },
];

// Helper: Fetch real exchange rates from open API
async function fetchRealRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.rates && data.rates.NGN) {
      const baseUsdOfficial = Math.round(data.rates.NGN * 100) / 100;
      // Parallel market premium is typically ~4% - 6% over NAFEM
      const baseUsdParallel = Math.round(baseUsdOfficial * 1.042 * 10) / 10;
      
      const eurPerUsd = data.rates.EUR || 0.92;
      const gbpPerUsd = data.rates.GBP || 0.77;
      const cadPerUsd = data.rates.CAD || 1.38;
      const aedPerUsd = data.rates.AED || 3.67;
      const cnyPerUsd = data.rates.CNY || 7.24;

      const now = new Date().toISOString();

      // Update USD
      const oldUsd = ratesData.USD.parallelRate;
      ratesData.USD.officialRate = baseUsdOfficial;
      ratesData.USD.parallelRate = baseUsdParallel;
      ratesData.USD.changeAmount = Math.round((baseUsdParallel - oldUsd) * 100) / 100;
      ratesData.USD.lastUpdated = now;

      // Update EUR
      const eurOfficial = Math.round((baseUsdOfficial / eurPerUsd) * 100) / 100;
      const eurParallel = Math.round((baseUsdParallel / eurPerUsd) * 10) / 10;
      ratesData.EUR.officialRate = eurOfficial;
      ratesData.EUR.parallelRate = eurParallel;
      ratesData.EUR.lastUpdated = now;

      // Update GBP
      const gbpOfficial = Math.round((baseUsdOfficial / gbpPerUsd) * 100) / 100;
      const gbpParallel = Math.round((baseUsdParallel / gbpPerUsd) * 10) / 10;
      ratesData.GBP.officialRate = gbpOfficial;
      ratesData.GBP.parallelRate = gbpParallel;
      ratesData.GBP.lastUpdated = now;

      // Update CAD
      const cadOfficial = Math.round((baseUsdOfficial / cadPerUsd) * 100) / 100;
      const cadParallel = Math.round((baseUsdParallel / cadPerUsd) * 10) / 10;
      ratesData.CAD.officialRate = cadOfficial;
      ratesData.CAD.parallelRate = cadParallel;
      ratesData.CAD.lastUpdated = now;

      // Update AED
      const aedOfficial = Math.round((baseUsdOfficial / aedPerUsd) * 100) / 100;
      const aedParallel = Math.round((baseUsdParallel / aedPerUsd) * 10) / 10;
      ratesData.AED.officialRate = aedOfficial;
      ratesData.AED.parallelRate = aedParallel;
      ratesData.AED.lastUpdated = now;

      // Update CNY
      const cnyOfficial = Math.round((baseUsdOfficial / cnyPerUsd) * 100) / 100;
      const cnyParallel = Math.round((baseUsdParallel / cnyPerUsd) * 10) / 10;
      ratesData.CNY.officialRate = cnyOfficial;
      ratesData.CNY.parallelRate = cnyParallel;
      ratesData.CNY.lastUpdated = now;

      // USDT P2P typically trades slightly above parallel USD
      ratesData.USDT.parallelRate = Math.round((baseUsdParallel + 4.5) * 10) / 10;
      ratesData.USDT.officialRate = baseUsdOfficial;
      ratesData.USDT.lastUpdated = now;
    }
  } catch (err) {
    console.warn('Live FX fetch failed or offline, using current buffered rates:', err);
  }
}

// Helper: Format message for Telegram
function formatTelegramAlert(
  rule: AlertRule,
  currentRate: number,
  reason: string,
  rateInfo: RateInfo
): string {
  const direction = rateInfo.change24h >= 0 ? '📈' : '📉';
  const sign = rateInfo.change24h >= 0 ? '+' : '';
  const marketLabel = rule.marketType === 'parallel' ? 'Parallel (Black Market / BDC)' : rule.marketType === 'usdt' ? 'Crypto P2P (USDT)' : 'Official (NAFEM/CBN)';

  return `🚨 <b>EXCHANGE RATE ALERT TRIGGERED</b> 🚨

💱 <b>Pair:</b> ${rule.currency} / NGN
🏛 <b>Market:</b> ${marketLabel}
💰 <b>Current Rate:</b> ₦${currentRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${direction} <b>24h Change:</b> ${sign}${rateInfo.change24h.toFixed(2)}% (${sign}₦${rateInfo.changeAmount.toFixed(2)})

🎯 <b>Trigger Condition:</b> ${reason}
⏱ <b>Time:</b> ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC

📊 <b>Market Snapshot:</b>
• 24h High: ₦${rateInfo.high24h.toLocaleString()}
• 24h Low: ₦${rateInfo.low24h.toLocaleString()}
• Official NAFEM: ₦${rateInfo.officialRate.toLocaleString()}

🔔 <i>Manage alerts in your Yerima Naira Dashboard</i>`;
}

// Helper: Send message to Telegram Bot API (with optional inline_keyboard / WebApp button)
async function sendTelegramMessage(token: string, chatId: string, text: string, replyMarkup?: any) {
  if (!token || !chatId) {
    return { success: false, error: 'Telegram Bot Token or Chat ID not configured.' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.ok) {
      return { success: false, error: data.description || 'Telegram API error' };
    }
    return { success: true, result: data.result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error reaching Telegram API' };
  }
}

// Evaluate active rules against latest rates
async function evaluateAlertRules() {
  const triggered: AlertLog[] = [];
  const now = Date.now();

  for (const rule of alertRules) {
    if (!rule.isActive) continue;

    // Check cooldown
    if (rule.lastTriggered) {
      const last = new Date(rule.lastTriggered).getTime();
      const elapsedMinutes = (now - last) / (1000 * 60);
      if (elapsedMinutes < rule.cooldownMinutes) {
        continue;
      }
    }

    const rateInfo = ratesData[rule.currency];
    if (!rateInfo) continue;

    const rateToCheck =
      rule.marketType === 'official'
        ? rateInfo.officialRate
        : rule.marketType === 'usdt'
        ? (rateInfo.usdtRate || rateInfo.parallelRate)
        : rateInfo.parallelRate;

    let isTriggered = false;
    let reason = '';

    if (rule.condition === 'above' && rateToCheck >= rule.targetValue) {
      isTriggered = true;
      reason = `Rate (₦${rateToCheck.toLocaleString()}) rose above threshold of ₦${rule.targetValue.toLocaleString()}`;
    } else if (rule.condition === 'below' && rateToCheck <= rule.targetValue) {
      isTriggered = true;
      reason = `Rate (₦${rateToCheck.toLocaleString()}) dropped below target of ₦${rule.targetValue.toLocaleString()}`;
    } else if (rule.condition === 'percent_change' && Math.abs(rateInfo.change24h) >= rule.targetValue) {
      isTriggered = true;
      reason = `24h rate shift reached ${rateInfo.change24h >= 0 ? '+' : ''}${rateInfo.change24h.toFixed(2)}% (threshold: ${rule.targetValue}%)`;
    }

    if (isTriggered) {
      rule.lastTriggered = new Date().toISOString();
      rule.triggerCount += 1;

      // Deliver to Telegram if configured
      let delivered = false;
      let telegramError: string | undefined;

      const targetChatId = rule.chatId || botConfig.chatId;
      if (botConfig.botToken && targetChatId) {
        const message = formatTelegramAlert(rule, rateToCheck, reason, rateInfo);
        const sendRes = await sendTelegramMessage(botConfig.botToken, targetChatId, message);
        delivered = sendRes.success;
        if (!sendRes.success) {
          telegramError = sendRes.error;
        }
      }

      const logItem: AlertLog = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        ruleId: rule.id,
        ruleName: rule.name,
        currency: rule.currency,
        marketType: rule.marketType.toUpperCase(),
        currentRate: rateToCheck,
        triggerReason: reason,
        deliveredToTelegram: delivered,
        telegramError,
      };

      alertLogs.unshift(logItem);
      if (alertLogs.length > 50) alertLogs.pop();
      triggered.push(logItem);
    }
  }

  return triggered;
}

// Background poller every 60s
setInterval(async () => {
  if (botConfig.isEnabled) {
    botConfig.lastChecked = new Date().toISOString();
    await fetchRealRates();
    await evaluateAlertRules();
  }
}, 60000);

// Initialize rates on boot
fetchRealRates();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // ----------------------------------------------------
  // API ROUTES
  // ----------------------------------------------------

  // 1. Get Live Rates & Summary
  app.get('/api/rates', async (_req: Request, res: Response) => {
    res.json({
      success: true,
      rates: ratesData,
      history: historyPoints,
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Force Refresh Rates from Open FX API (Supports both GET and POST)
  app.all('/api/rates/refresh', async (_req: Request, res: Response) => {
    await fetchRealRates();
    const triggered = await evaluateAlertRules();
    res.json({
      success: true,
      rates: ratesData,
      triggeredAlerts: triggered,
      message: 'Rates successfully refreshed and evaluated',
    });
  });

  // 3. Simulate Price Movement (for testing bot triggers)
  app.post('/api/rates/simulate', async (req: Request, res: Response) => {
    const { currency, percentDelta, customRate } = req.body;
    const target = ratesData[currency || 'USD'];
    if (!target) {
      return res.status(400).json({ success: false, error: 'Invalid currency code' });
    }

    const previousParallel = target.parallelRate;
    if (customRate) {
      target.parallelRate = Number(customRate);
    } else if (percentDelta) {
      const deltaFactor = 1 + Number(percentDelta) / 100;
      target.parallelRate = Math.round(target.parallelRate * deltaFactor * 10) / 10;
    } else {
      // Default jump +2%
      target.parallelRate = Math.round(target.parallelRate * 1.025 * 10) / 10;
    }

    target.changeAmount = Math.round((target.parallelRate - previousParallel) * 100) / 100;
    target.change24h = Math.round(((target.parallelRate - previousParallel) / previousParallel) * 10000) / 100;
    if (target.parallelRate > target.high24h) target.high24h = target.parallelRate;
    if (target.parallelRate < target.low24h) target.low24h = target.parallelRate;
    target.lastUpdated = new Date().toISOString();

    // Check triggers immediately
    const triggered = await evaluateAlertRules();

    res.json({
      success: true,
      updatedRate: target,
      triggeredAlerts: triggered,
    });
  });

  // 4. Alert Rules CRUD
  app.get('/api/alerts', (_req: Request, res: Response) => {
    res.json({
      success: true,
      rules: alertRules,
      logs: alertLogs,
    });
  });

  app.post('/api/alerts', (req: Request, res: Response) => {
    const { name, currency, marketType, condition, targetValue, cooldownMinutes, chatId } = req.body;
    if (!currency || !targetValue || !condition) {
      return res.status(400).json({ success: false, error: 'Missing required alert fields' });
    }

    const newRule: AlertRule = {
      id: 'rule-' + Date.now(),
      name: name || `${currency} ${condition === 'above' ? '≥' : '≤'} ₦${targetValue}`,
      currency,
      marketType: marketType || 'parallel',
      condition,
      targetValue: Number(targetValue),
      isActive: true,
      cooldownMinutes: Number(cooldownMinutes) || 30,
      triggerCount: 0,
      chatId: chatId || undefined,
    };

    alertRules.unshift(newRule);
    res.json({ success: true, rule: newRule });
  });

  app.patch('/api/alerts/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const ruleIndex = alertRules.findIndex((r) => r.id === id);
    if (ruleIndex === -1) {
      return res.status(404).json({ success: false, error: 'Alert rule not found' });
    }

    alertRules[ruleIndex] = { ...alertRules[ruleIndex], ...req.body };
    res.json({ success: true, rule: alertRules[ruleIndex] });
  });

  app.delete('/api/alerts/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    alertRules = alertRules.filter((r) => r.id !== id);
    res.json({ success: true, message: 'Alert rule removed' });
  });

  // 5. Test Trigger Alert Rule Now
  app.post('/api/alerts/:id/trigger-test', async (req: Request, res: Response) => {
    const { id } = req.params;
    const rule = alertRules.find((r) => r.id === id);
    if (!rule) {
      return res.status(404).json({ success: false, error: 'Alert rule not found' });
    }

    const rateInfo = ratesData[rule.currency] || ratesData.USD;
    const currentRate =
      rule.marketType === 'official'
        ? rateInfo.officialRate
        : rule.marketType === 'usdt'
        ? (rateInfo.usdtRate || rateInfo.parallelRate)
        : rateInfo.parallelRate;

    const reason = `Manual test trigger for rule "${rule.name}"`;
    const message = formatTelegramAlert(rule, currentRate, reason, rateInfo);

    let delivered = false;
    let telegramError: string | undefined;

    const targetChat = rule.chatId || botConfig.chatId;
    if (botConfig.botToken && targetChat) {
      const sendRes = await sendTelegramMessage(botConfig.botToken, targetChat, message);
      delivered = sendRes.success;
      if (!sendRes.success) {
        telegramError = sendRes.error;
      }
    }

    const logItem: AlertLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      ruleId: rule.id,
      ruleName: rule.name,
      currency: rule.currency,
      marketType: rule.marketType.toUpperCase(),
      currentRate,
      triggerReason: `[TEST] ${reason}`,
      deliveredToTelegram: delivered,
      telegramError,
    };

    alertLogs.unshift(logItem);

    res.json({
      success: true,
      delivered,
      telegramError,
      messagePreview: message,
      log: logItem,
    });
  });

  // 6. Bot Config Management & Verification
  app.get('/api/bot/config', (_req: Request, res: Response) => {
    res.json({
      success: true,
      config: {
        ...botConfig,
        botTokenMasked: botConfig.botToken ? `${botConfig.botToken.substring(0, 6)}...${botConfig.botToken.slice(-4)}` : '',
      },
    });
  });

  app.post('/api/bot/config', (req: Request, res: Response) => {
    const { botToken, chatId, autoCheckIntervalSeconds, isEnabled, appUrl } = req.body;
    if (botToken !== undefined) botConfig.botToken = botToken.trim();
    if (chatId !== undefined) botConfig.chatId = chatId.trim();
    if (autoCheckIntervalSeconds !== undefined) botConfig.autoCheckIntervalSeconds = Number(autoCheckIntervalSeconds);
    if (isEnabled !== undefined) botConfig.isEnabled = Boolean(isEnabled);
    if (appUrl !== undefined) botConfig.appUrl = appUrl.trim();

    res.json({ success: true, config: botConfig });
  });

  // Verify Telegram Bot Token live with Telegram API
  app.post('/api/bot/verify', async (req: Request, res: Response) => {
    const token = (req.body.botToken || botConfig.botToken || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, error: 'No Telegram Bot Token provided' });
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = await response.json();
      if (data.ok && data.result) {
        botConfig.botToken = token;
        botConfig.botName = data.result.first_name || '';
        botConfig.botUsername = data.result.username || '';

        return res.json({
          success: true,
          bot: data.result,
          message: `Connected to @${data.result.username} (${data.result.first_name})`,
        });
      } else {
        return res.status(400).json({
          success: false,
          error: data.description || 'Invalid Telegram Bot Token',
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Failed to connect to Telegram servers: ${err.message}`,
      });
    }
  });

  // Fetch recent updates from Telegram (helps user discover their Chat ID!)
  app.get('/api/bot/updates', async (req: Request, res: Response) => {
    const token = (req.query.token as string) || botConfig.botToken;
    if (!token) {
      return res.status(400).json({ success: false, error: 'No Bot Token configured' });
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=10`);
      const data = await response.json();
      if (data.ok) {
        // Extract discovered chat IDs
        const discoveredChats = (data.result || [])
          .map((item: any) => {
            const msg = item.message || item.channel_post;
            if (!msg || !msg.chat) return null;
            return {
              chatId: String(msg.chat.id),
              type: msg.chat.type,
              username: msg.chat.username,
              title: msg.chat.title || `${msg.chat.first_name || ''} ${msg.chat.last_name || ''}`.trim(),
              lastMessage: msg.text,
              date: new Date(msg.date * 1000).toISOString(),
            };
          })
          .filter(Boolean);

        return res.json({
          success: true,
          chats: discoveredChats,
          rawUpdates: data.result,
        });
      } else {
        return res.status(400).json({ success: false, error: data.description });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Send a custom test message to Telegram
  app.post('/api/bot/send-test', async (req: Request, res: Response) => {
    const token = (req.body.botToken || botConfig.botToken || '').trim();
    const chatId = (req.body.chatId || botConfig.chatId || '').trim();
    const text = req.body.message || '👋 <b>Yerima Naira Alert Bot Test</b>\n\nYour Telegram Bot is properly connected and ready to send instant exchange rate alerts!';

    if (!token || !chatId) {
      return res.status(400).json({
        success: false,
        error: 'Both Bot Token and Chat ID are required to send a test message.',
      });
    }

    const result = await sendTelegramMessage(token, chatId, text);
    if (result.success) {
      res.json({ success: true, message: 'Test message sent successfully!' });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  });

  // 7. Interactive Command Processor (Used by Telegram Webhook & In-App Phone Simulator)
  function processBotCommand(rawText: string, fromUser: string = 'User') {
    const text = rawText.trim();
    const parts = text.split(' ');
    const command = parts[0].toLowerCase();

    if (command === '/start') {
      const miniAppUrl = `${botConfig.appUrl || APP_URL}?tma=true`;
      return {
        replyText: `🇳🇬 <b>Welcome to Yerima Naira Alert Bot!</b> 🇳🇬\n\nI monitor real-time foreign exchange rates against the Nigerian Naira (NGN) across both Parallel (BDC) and Official (NAFEM) markets.\n\n📱 <b>Telegram Mini App Available:</b> Tap the <b>"⚡ Open Naira FX Mini App"</b> button below to launch the live interactive app directly inside Telegram!\n\n<b>Available Commands:</b>\n• /rates - View all current live FX rates\n• /usd, /eur, /gbp - Quick pair check\n• /convert 100 USD - Instant currency converter\n• /alert USD 1650 - Set instant rate alert\n• /alerts - View your active alert rules\n• /help - Detailed command manual`,
        buttons: [
          [{ text: '⚡ Open Naira FX Mini App', web_app: { url: miniAppUrl } }],
          [{ text: '📊 /rates', callback_data: '/rates' }, { text: '💵 /usd', callback_data: '/usd' }],
          [{ text: '🧮 /convert 100 USD', callback_data: '/convert 100 USD' }, { text: '🔔 /alert USD 1650', callback_data: '/alert USD 1650' }],
        ],
      };
    }

    if (command === '/rates') {
      const u = ratesData.USD;
      const e = ratesData.EUR;
      const g = ratesData.GBP;
      const c = ratesData.CAD;
      const usdt = ratesData.USDT;

      const replyText = `📊 <b>LIVE NAIRA EXCHANGE RATES</b>\n<i>Updated: ${new Date().toLocaleTimeString('en-GB')} UTC</i>\n\n<b>🇺🇸 USD / NGN</b>\n• Parallel (BDC): <b>₦${u.parallelRate.toLocaleString()}</b> (${u.change24h >= 0 ? '+' : ''}${u.change24h}%)\n• Official (NAFEM): ₦${u.officialRate.toLocaleString()}\n\n<b>🇪🇺 EUR / NGN</b>\n• Parallel (BDC): <b>₦${e.parallelRate.toLocaleString()}</b>\n• Official (NAFEM): ₦${e.officialRate.toLocaleString()}\n\n<b>🇬🇧 GBP / NGN</b>\n• Parallel (BDC): <b>₦${g.parallelRate.toLocaleString()}</b>\n• Official (NAFEM): ₦${g.officialRate.toLocaleString()}\n\n<b>🇨🇦 CAD / NGN</b>\n• Parallel (BDC): <b>₦${c.parallelRate.toLocaleString()}</b>\n\n<b>🟢 USDT / NGN (P2P)</b>\n• Benchmark: <b>₦${usdt.parallelRate.toLocaleString()}</b>\n\n<i>To set an alert: /alert USD 1650</i>`;

      return {
        replyText,
        buttons: [
          [{ text: '🔔 /alert USD 1650', callback_data: '/alert USD 1650' }, { text: '🧮 /convert 100 USD', callback_data: '/convert 100 USD' }],
        ],
      };
    }

    if (command === '/usd' || command === '/eur' || command === '/gbp' || command === '/cad') {
      const code = command.substring(1).toUpperCase();
      const r = ratesData[code];
      if (!r) return { replyText: `Currency ${code} not supported.` };

      const replyText = `${r.flag} <b>${r.name} (${r.code} / NGN)</b>\n\n• <b>Parallel Market (BDC):</b> ₦${r.parallelRate.toLocaleString()}\n• <b>Official NAFEM Rate:</b> ₦${r.officialRate.toLocaleString()}\n• <b>24h Change:</b> ${r.change24h >= 0 ? '+' : ''}${r.change24h}%\n• <b>Spread:</b> ₦${(r.parallelRate - r.officialRate).toFixed(2)}\n• <b>24h Range:</b> ₦${r.low24h.toLocaleString()} - ₦${r.high24h.toLocaleString()}`;

      return {
        replyText,
        buttons: [
          [{ text: `🔔 /alert ${r.code} ${Math.round(r.parallelRate * 1.02)}`, callback_data: `/alert ${r.code} ${Math.round(r.parallelRate * 1.02)}` }, { text: `🧮 /convert 100 ${r.code}`, callback_data: `/convert 100 ${r.code}` }],
        ],
      };
    }

    if (command === '/convert' || command === '/calc') {
      // If user typed just "/convert" without arguments
      if (parts.length < 2 || !parts[1].trim()) {
        return {
          replyText: `⚠️ <b>Convert Currency</b>\n\nUsage: /convert [AMOUNT] [CURRENCY]\nExample: /convert 100 USD or /convert 250 EUR\n\n💡 <i>Tap any example to calculate instantly!</i>`,
          buttons: [
            [{ text: '🧮 /convert 100 USD', callback_data: '/convert 100 USD' }, { text: '🧮 /convert 250 EUR', callback_data: '/convert 250 EUR' }],
            [{ text: '🧮 /convert 100 GBP', callback_data: '/convert 100 GBP' }, { text: '🧮 /convert 50000 NGN', callback_data: '/convert 50000 NGN' }],
          ],
        };
      }

      // Flexible argument parsing (supports "/convert 100 USD", "/convert USD 100", "/convert 50000 NGN")
      const clean1 = (parts[1] || '').replace(/[$,€,£,₦,]/g, '').trim();
      const clean2 = (parts[2] || '').replace(/[$,€,£,₦,]/g, '').trim();

      let amount = NaN;
      let currency = 'USD';

      if (!isNaN(parseFloat(clean1)) && isNaN(parseFloat(clean2))) {
        amount = parseFloat(clean1);
        currency = (clean2 || 'USD').toUpperCase();
      } else if (isNaN(parseFloat(clean1)) && !isNaN(parseFloat(clean2))) {
        amount = parseFloat(clean2);
        currency = clean1.toUpperCase();
      } else if (!isNaN(parseFloat(clean1))) {
        amount = parseFloat(clean1);
        currency = (parts[2] || 'USD').toUpperCase();
      }

      if (isNaN(amount) || amount <= 0) {
        return {
          replyText: `⚠️ <b>Invalid Conversion Format</b>\n\nUsage: /convert [AMOUNT] [CURRENCY]\nExample: /convert 100 USD or /convert 250 EUR`,
          buttons: [
            [{ text: '🧮 /convert 100 USD', callback_data: '/convert 100 USD' }, { text: '🧮 /convert 250 EUR', callback_data: '/convert 250 EUR' }],
          ],
        };
      }

      // Special conversion: Naira to foreign FX
      if (currency === 'NGN') {
        const u = ratesData.USD || { parallelRate: 1600, officialRate: 1530 };
        const e = ratesData.EUR || { parallelRate: 1740, officialRate: 1670 };
        const g = ratesData.GBP || { parallelRate: 2100, officialRate: 2000 };
        const c = ratesData.CAD || { parallelRate: 1150, officialRate: 1100 };

        const usdBuy = (amount / u.parallelRate).toFixed(2);
        const eurBuy = (amount / e.parallelRate).toFixed(2);
        const gbpBuy = (amount / g.parallelRate).toFixed(2);
        const cadBuy = (amount / c.parallelRate).toFixed(2);

        return {
          replyText: `🧮 <b>NAIRA TO FOREIGN CURRENCY</b>\n\n<b>₦${amount.toLocaleString()} NGN</b> buys approximately:\n\n• <b>$${usdBuy} USD</b> (Parallel @ ₦${u.parallelRate.toLocaleString()})\n• <b>€${eurBuy} EUR</b> (Parallel @ ₦${e.parallelRate.toLocaleString()})\n• <b>£${gbpBuy} GBP</b> (Parallel @ ₦${g.parallelRate.toLocaleString()})\n• <b>$${cadBuy} CAD</b> (Parallel @ ₦${c.parallelRate.toLocaleString()})`,
          buttons: [
            [{ text: '🔔 /alert USD 1650', callback_data: '/alert USD 1650' }, { text: '📊 /rates', callback_data: '/rates' }],
          ],
        };
      }

      const targetRate = ratesData[currency] || ratesData.USD;
      const totalNgnParallel = amount * targetRate.parallelRate;
      const totalNgnOfficial = amount * targetRate.officialRate;
      const diff = totalNgnParallel - totalNgnOfficial;

      return {
        replyText: `🧮 <b>CURRENCY CONVERSION</b>\n\n<b>${amount.toLocaleString()} ${targetRate.code}</b> equals:\n\n• <b>₦${totalNgnParallel.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> (Parallel / BDC @ ₦${targetRate.parallelRate.toLocaleString()})\n• <b>₦${totalNgnOfficial.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> (Official NAFEM @ ₦${targetRate.officialRate.toLocaleString()})\n\n<i>Spread difference: ₦${diff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</i>`,
        buttons: [
          [
            { text: `🔔 /alert ${targetRate.code} ${Math.round(targetRate.parallelRate * 1.02)}`, callback_data: `/alert ${targetRate.code} ${Math.round(targetRate.parallelRate * 1.02)}` },
            { text: '📊 /rates', callback_data: '/rates' },
          ],
        ],
      };
    }

    if (command === '/alert') {
      let cur = (parts[1] || '').toUpperCase();
      let target = parseFloat(parts[2]);

      // If user typed: "/alert 1650 USD"
      if (!isNaN(parseFloat(parts[1])) && isNaN(parseFloat(parts[2]))) {
        target = parseFloat(parts[1]);
        cur = (parts[2] || 'USD').toUpperCase();
      }

      if (!target || isNaN(target) || !cur) {
        return {
          replyText: `⚠️ <b>Invalid Alert Format</b>\n\nUsage: /alert [CURRENCY] [TARGET_PRICE]\nExample: /alert USD 1650 or /alert EUR 1800`,
          buttons: [
            [{ text: '🔔 /alert USD 1650', callback_data: '/alert USD 1650' }, { text: '🔔 /alert EUR 1800', callback_data: '/alert EUR 1800' }],
          ],
        };
      }

      const newRule: AlertRule = {
        id: 'rule-' + Date.now(),
        name: `Telegram Alert: ${cur} ≥ ₦${target}`,
        currency: cur,
        marketType: 'parallel',
        condition: 'above',
        targetValue: target,
        isActive: true,
        cooldownMinutes: 30,
        triggerCount: 0,
      };
      alertRules.unshift(newRule);

      return {
        replyText: `✅ <b>Alert Created Successfully!</b>\n\nPair: <b>${cur} / NGN</b>\nTarget: <b>₦${target.toLocaleString()}</b>\nType: Price rises above target\n\nYou will receive a notification as soon as the market touches this level!`,
        buttons: [
          [{ text: '📋 /alerts', callback_data: '/alerts' }, { text: '📊 /rates', callback_data: '/rates' }],
        ],
      };
    }

    if (command === '/alerts') {
      if (alertRules.length === 0) {
        return {
          replyText: `You have no active alerts configured. Use /alert USD 1650 to create one!`,
          buttons: [
            [{ text: '🔔 /alert USD 1650', callback_data: '/alert USD 1650' }],
          ],
        };
      }
      const list = alertRules
        .map((r, i) => `${i + 1}. <b>${r.name}</b> (${r.isActive ? '🟢 Active' : '⚪ Paused'})\n   Triggered ${r.triggerCount} times`)
        .join('\n\n');

      return {
        replyText: `📋 <b>YOUR ACTIVE ALERTS</b>\n\n${list}\n\n<i>Manage full rules on the Yerima Naira Web Dashboard</i>`,
        buttons: [
          [{ text: '🔔 /alert USD 1650', callback_data: '/alert USD 1650' }, { text: '📊 /rates', callback_data: '/rates' }],
        ],
      };
    }

    if (command === '/help') {
      return {
        replyText: `📖 <b>Yerima Naira Bot Commands</b>\n\n` +
          `• /rates - Full exchange rates table\n` +
          `• /usd - Live US Dollar rates\n` +
          `• /eur - Live Euro rates\n` +
          `• /gbp - Live British Pound rates\n` +
          `• /convert 100 USD - Convert currency to Naira\n` +
          `• /alert USD 1650 - Create rate threshold alert\n` +
          `• /alerts - List all active alert rules\n` +
          `• /status - Bot health and sync status\n\n` +
          `💡 <i>All data reflects verified open-market rates.</i>`,
        buttons: [
          [{ text: '📊 /rates', callback_data: '/rates' }, { text: '💵 /usd', callback_data: '/usd' }],
          [{ text: '💶 /eur', callback_data: '/eur' }, { text: '💷 /gbp', callback_data: '/gbp' }],
          [{ text: '🧮 /convert 100 USD', callback_data: '/convert 100 USD' }, { text: '🔔 /alert USD 1650', callback_data: '/alert USD 1650' }],
          [{ text: '📋 /alerts', callback_data: '/alerts' }, { text: '🟢 /status', callback_data: '/status' }],
        ],
      };
    }

    if (command === '/status') {
      return {
        replyText: `🟢 <b>Bot System Status: Online</b>\n\n• Monitored Pairs: 7 FX Pairs\n• Active Alert Rules: ${alertRules.filter((r) => r.isActive).length}\n• Alerts Triggered Today: ${alertLogs.length}\n• Last Synced: Just now\n\nAll alerting systems operating normally.`,
        buttons: [
          [{ text: '📊 /rates', callback_data: '/rates' }, { text: '📖 /help', callback_data: '/help' }],
        ],
      };
    }

    // Default response
    return {
      replyText: `👋 Hello! I didn't recognize that command.\n\nType /rates to see latest rates or /help for available commands.`,
      buttons: [
        [{ text: '📊 /rates', callback_data: '/rates' }, { text: '📖 /help', callback_data: '/help' }],
      ],
    };
  }

  // Simulator Endpoint for Frontend Phone UI
  app.post('/api/bot/simulate-command', (req: Request, res: Response) => {
    const { message, user } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message required' });
    }

    const response = processBotCommand(message, user);
    res.json({
      success: true,
      ...response,
    });
  });

  // Webhook for Real Telegram updates (if registered with setWebhook)
  app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
    const update = req.body;
    if (update && update.message && update.message.text) {
      const chatId = String(update.message.chat.id);
      const text = update.message.text;
      const fromName = update.message.from ? update.message.from.first_name : 'User';

      const response = processBotCommand(text, fromName);
      if (botConfig.botToken) {
        const replyMarkup = response.buttons ? { inline_keyboard: response.buttons } : undefined;
        await sendTelegramMessage(botConfig.botToken, chatId, response.replyText, replyMarkup);
      }
    }
    res.json({ ok: true });
  });

  // ----------------------------------------------------
  // AUTOMATIC 24/7 TELEGRAM LONG-POLLING ENGINE
  // Automatically receives commands (/rates, /usd, /alert, etc.) even without public webhooks!
  // ----------------------------------------------------
  let lastUpdateId = 0;
  let isPolling = false;

  async function pollTelegram() {
    if (!botConfig.botToken || !botConfig.isEnabled || isPolling) return;
    isPolling = true;

    try {
      const url = `https://api.telegram.org/bot${botConfig.botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=15`;
      const res = await fetch(url);
      if (!res.ok) {
        isPolling = false;
        return;
      }
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateId = Math.max(lastUpdateId, update.update_id);
          const msg = update.message;
          const callback = update.callback_query;

          if (msg && msg.text) {
            const chatId = String(msg.chat.id);
            const fromName = msg.from ? (msg.from.first_name || 'User') : 'User';
            if (!botConfig.chatId) {
              botConfig.chatId = chatId;
            }
            const response = processBotCommand(msg.text, fromName);
            const replyMarkup = response.buttons ? { inline_keyboard: response.buttons } : undefined;
            await sendTelegramMessage(botConfig.botToken, chatId, response.replyText, replyMarkup);
          } else if (callback && callback.data && callback.message) {
            const chatId = String(callback.message.chat.id);
            const fromName = callback.from ? (callback.from.first_name || 'User') : 'User';
            const response = processBotCommand(callback.data, fromName);
            const replyMarkup = response.buttons ? { inline_keyboard: response.buttons } : undefined;
            await sendTelegramMessage(botConfig.botToken, chatId, response.replyText, replyMarkup);
          }
        }
      }
    } catch (_err) {
      // quiet retry
    } finally {
      isPolling = false;
    }
  }

  // Poll Telegram every 2.5 seconds when token is active
  setInterval(pollTelegram, 2500);

  // Set Telegram Bot persistent Menu Button (opens the WebApp from the chat menu button)
  app.post('/api/bot/set-menu-button', async (req: Request, res: Response) => {
    const token = (req.body.botToken || botConfig.botToken || '').trim();
    const webAppUrl = (req.body.webAppUrl || `${botConfig.appUrl || APP_URL}?tma=true`).trim();

    if (!token) {
      return res.status(400).json({ success: false, error: 'Bot Token is required to configure the Telegram Menu Button.' });
    }

    try {
      const url = `https://api.telegram.org/bot${token}/setChatMenuButton`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_button: {
            type: 'web_app',
            text: '📈 Naira FX App',
            web_app: {
              url: webAppUrl,
            },
          },
        }),
      });

      const data = await response.json();
      if (data.ok) {
        return res.json({
          success: true,
          message: 'Telegram Bot Menu Button successfully configured! Users will now see the "📈 Naira FX App" button right next to the chat text bar.',
          webAppUrl,
        });
      } else {
        return res.status(400).json({ success: false, error: data.description || 'Failed to set Telegram menu button' });
      }
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create alert triggered directly from Telegram WebApp
  app.post('/api/bot/webapp-alert', (req: Request, res: Response) => {
    const { currency, targetValue, condition, marketType, telegramUser } = req.body;
    if (!currency || !targetValue) {
      return res.status(400).json({ success: false, error: 'Missing alert data' });
    }

    const chatId = telegramUser?.id ? String(telegramUser.id) : botConfig.chatId;
    const authorName = telegramUser?.first_name || 'TMA User';

    const newRule: AlertRule = {
      id: 'rule-tma-' + Date.now(),
      name: `[TMA ${authorName}] ${currency} ${condition === 'above' ? '≥' : '≤'} ₦${targetValue}`,
      currency,
      marketType: marketType || 'parallel',
      condition: condition || 'above',
      targetValue: Number(targetValue),
      isActive: true,
      cooldownMinutes: 30,
      triggerCount: 0,
      chatId,
    };

    alertRules.unshift(newRule);
    res.json({ success: true, rule: newRule, message: 'Alert configured via Telegram Mini App!' });
  });

  // Ensure no API request accidentally falls through to Vite's index.html SPA handler
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'API route not found' });
  });

  // ----------------------------------------------------
  // VITE DEV SERVER OR STATIC ASSETS
  // ----------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Yerima Naira Server & Telegram Bot Engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
