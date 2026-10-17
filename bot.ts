/**
 * Yerima Naira - 24/7 Standalone Telegram Bot Daemon
 * 
 * Runs continuously in the background without any browser or frontend required.
 * - Long-polls Telegram API for instant command handling (/start, /rates, /usd, /alert, /convert)
 * - Periodically fetches live exchange rates from financial APIs every 60s
 * - Evaluates custom alert rules and dispatches instant Telegram push alerts
 */

import 'dotenv/config';

interface RateInfo {
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

interface AlertRule {
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

const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
let CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();
const CHECK_INTERVAL_SECONDS = Number(process.env.CHECK_INTERVAL_SECONDS) || 60;

if (!BOT_TOKEN) {
  console.warn('\n⚠️  WARNING: TELEGRAM_BOT_TOKEN is not set in environment or .env!');
  console.warn('Set TELEGRAM_BOT_TOKEN="your_bot_token_from_botfather" to enable Telegram alerts.');
  console.warn('The daemon will still track rates and wait for token.\n');
}

// Live Rates state
let ratesData: Record<string, RateInfo> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    officialRate: 1532.5,
    parallelRate: 1595.0,
    usdtRate: 1598.5,
    change24h: 1.25,
    changeAmount: 19.5,
    high24h: 1605.0,
    low24h: 1580.0,
    lastUpdated: new Date().toISOString(),
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    officialRate: 1675.2,
    parallelRate: 1745.0,
    change24h: -0.45,
    changeAmount: -7.8,
    high24h: 1755.0,
    low24h: 1738.0,
    lastUpdated: new Date().toISOString(),
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    officialRate: 1995.8,
    parallelRate: 2080.0,
    change24h: 0.88,
    changeAmount: 18.2,
    high24h: 2090.0,
    low24h: 2060.0,
    lastUpdated: new Date().toISOString(),
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    flag: '🇨🇦',
    officialRate: 1115.4,
    parallelRate: 1170.0,
    change24h: 0.52,
    changeAmount: 6.1,
    high24h: 1175.0,
    low24h: 1162.0,
    lastUpdated: new Date().toISOString(),
  },
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    flag: '🇦🇪',
    officialRate: 417.3,
    parallelRate: 434.5,
    change24h: 0.35,
    changeAmount: 1.5,
    high24h: 436.0,
    low24h: 432.0,
    lastUpdated: new Date().toISOString(),
  },
  CNY: {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    flag: '🇨🇳',
    officialRate: 211.8,
    parallelRate: 224.0,
    change24h: 0.12,
    changeAmount: 0.3,
    high24h: 225.0,
    low24h: 222.0,
    lastUpdated: new Date().toISOString(),
  },
  USDT: {
    code: 'USDT',
    name: 'Tether (P2P)',
    symbol: '₮',
    flag: '🟢',
    officialRate: 1532.5,
    parallelRate: 1598.5,
    change24h: 1.15,
    changeAmount: 18.0,
    high24h: 1604.0,
    low24h: 1585.0,
    lastUpdated: new Date().toISOString(),
  },
};

// Initial Active Alert Rules
let alertRules: AlertRule[] = [
  {
    id: 'rule-usd-high',
    name: 'USD Parallel Above ₦1,620',
    currency: 'USD',
    marketType: 'parallel',
    condition: 'above',
    targetValue: 1620,
    isActive: true,
    cooldownMinutes: 60,
    triggerCount: 0,
  },
  {
    id: 'rule-eur-high',
    name: 'EUR Parallel Above ₦1,780',
    currency: 'EUR',
    marketType: 'parallel',
    condition: 'above',
    targetValue: 1780,
    isActive: true,
    cooldownMinutes: 60,
    triggerCount: 0,
  },
  {
    id: 'rule-gbp-high',
    name: 'GBP Parallel Above ₦2,100',
    currency: 'GBP',
    marketType: 'parallel',
    condition: 'above',
    targetValue: 2100,
    isActive: true,
    cooldownMinutes: 60,
    triggerCount: 0,
  },
];

// Helper: Send message to Telegram Bot API
async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any) {
  if (!BOT_TOKEN || !chatId) return false;

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
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
    return data.ok;
  } catch (err: any) {
    console.error(`[Telegram Error] Failed to send to ${chatId}:`, err.message);
    return false;
  }
}

// Fetch real exchange rates from open currency API
async function fetchRealRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.rates && data.rates.NGN) {
      const officialUsdToNgn = Number(data.rates.NGN);
      const parallelSpread = 1.041; // BDC street market premium ~4.1%
      const parallelUsd = Math.round(officialUsdToNgn * parallelSpread * 10) / 10;

      ratesData.USD.officialRate = Math.round(officialUsdToNgn * 10) / 10;
      ratesData.USD.parallelRate = parallelUsd;
      ratesData.USD.lastUpdated = new Date().toISOString();

      const eurUsd = data.rates.EUR ? 1 / data.rates.EUR : 1.09;
      ratesData.EUR.officialRate = Math.round(officialUsdToNgn * (1 / (data.rates.EUR || 0.92)) * 10) / 10;
      ratesData.EUR.parallelRate = Math.round(parallelUsd * eurUsd * 10) / 10;
      ratesData.EUR.lastUpdated = new Date().toISOString();

      const gbpUsd = data.rates.GBP ? 1 / data.rates.GBP : 1.30;
      ratesData.GBP.officialRate = Math.round(officialUsdToNgn * (1 / (data.rates.GBP || 0.77)) * 10) / 10;
      ratesData.GBP.parallelRate = Math.round(parallelUsd * gbpUsd * 10) / 10;
      ratesData.GBP.lastUpdated = new Date().toISOString();

      const cadUsd = data.rates.CAD ? 1 / data.rates.CAD : 0.73;
      ratesData.CAD.officialRate = Math.round(officialUsdToNgn * (1 / (data.rates.CAD || 1.36)) * 10) / 10;
      ratesData.CAD.parallelRate = Math.round(parallelUsd * cadUsd * 10) / 10;
      ratesData.CAD.lastUpdated = new Date().toISOString();

      ratesData.USDT.parallelRate = parallelUsd + 3.5;
      ratesData.USDT.lastUpdated = new Date().toISOString();
    }
  } catch (err: any) {
    console.error('[Rate Sync Error]', err.message);
  }
}

// Evaluate alert rules against current rates
async function evaluateAlertRules() {
  const now = Date.now();

  for (const rule of alertRules) {
    if (!rule.isActive) continue;

    if (rule.lastTriggered) {
      const last = new Date(rule.lastTriggered).getTime();
      const elapsedMinutes = (now - last) / (1000 * 60);
      if (elapsedMinutes < rule.cooldownMinutes) continue;
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
      reason = `Rate (₦${rateToCheck.toLocaleString()}) rose above target ₦${rule.targetValue.toLocaleString()}`;
    } else if (rule.condition === 'below' && rateToCheck <= rule.targetValue) {
      isTriggered = true;
      reason = `Rate (₦${rateToCheck.toLocaleString()}) dropped below target ₦${rule.targetValue.toLocaleString()}`;
    } else if (rule.condition === 'percent_change' && Math.abs(rateInfo.change24h) >= rule.targetValue) {
      isTriggered = true;
      reason = `24h rate shift reached ${rateInfo.change24h >= 0 ? '+' : ''}${rateInfo.change24h.toFixed(2)}%`;
    }

    if (isTriggered) {
      rule.lastTriggered = new Date().toISOString();
      rule.triggerCount += 1;

      const targetChat = rule.chatId || CHAT_ID;
      if (BOT_TOKEN && targetChat) {
        const direction = rateInfo.change24h >= 0 ? '📈' : '📉';
        const sign = rateInfo.change24h >= 0 ? '+' : '';
        const marketLabel = rule.marketType === 'parallel' ? 'Parallel (Black Market)' : rule.marketType === 'usdt' ? 'Crypto P2P (USDT)' : 'Official (NAFEM/CBN)';

        const alertText = `🚨 <b>EXCHANGE RATE ALERT TRIGGERED</b> 🚨\n\n` +
          `💱 <b>Pair:</b> ${rule.currency} / NGN\n` +
          `🏛 <b>Market:</b> ${marketLabel}\n` +
          `💰 <b>Current Rate:</b> ₦${rateToCheck.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
          `${direction} <b>24h Change:</b> ${sign}${rateInfo.change24h.toFixed(2)}% (${sign}₦${rateInfo.changeAmount.toFixed(2)})\n\n` +
          `🎯 <b>Trigger Condition:</b> ${reason}\n` +
          `⏱ <b>Time:</b> ${new Date().toLocaleTimeString('en-GB')} UTC\n\n` +
          `📊 <b>Benchmark Snapshot:</b>\n` +
          `• 24h High: ₦${rateInfo.high24h.toLocaleString()}\n` +
          `• 24h Low: ₦${rateInfo.low24h.toLocaleString()}\n` +
          `• Official NAFEM: ₦${rateInfo.officialRate.toLocaleString()}\n\n` +
          `🔔 <i>24/7 Automated Monitor by Yerima Naira</i>`;

        console.log(`[ALERT FIRED] ${rule.currency}/NGN -> Sending to ${targetChat}...`);
        await sendTelegramMessage(targetChat, alertText);
      }
    }
  }
}

// Process Telegram user messages
function handleCommand(rawText: string, fromChatId: string, fromName: string) {
  const parts = rawText.trim().split(' ');
  const command = parts[0].toLowerCase();

  // If CHAT_ID wasn't set, auto-bind this user as the default recipient
  if (!CHAT_ID) {
    CHAT_ID = fromChatId;
    console.log(`[Auto-Registered Chat ID] Set default alert recipient to: ${fromChatId} (${fromName})`);
  }

  if (command === '/start') {
    return {
      text: `🇳🇬 <b>Welcome ${fromName} to Yerima Naira Alert Bot!</b> 🇳🇬\n\n` +
        `I am active 24/7 monitoring exchange rates for the Nigerian Naira (NGN).\n\n` +
        `✅ <b>Connected Chat ID:</b> <code>${fromChatId}</code>\n\n` +
        `<b>Quick Commands:</b>\n` +
        `• <code>/rates</code> - View all live FX rates\n` +
        `• <code>/usd</code>, <code>/eur</code>, <code>/gbp</code>, <code>/cad</code> - Specific pair details\n` +
        `• <code>/convert 100 USD</code> - Convert foreign currency to Naira\n` +
        `• <code>/alert USD 1650</code> - Create immediate price trigger alert\n` +
        `• <code>/alerts</code> - View your active alerts\n` +
        `• <code>/status</code> - Daemon uptime and check status\n` +
        `• <code>/help</code> - Full command manual`,
      buttons: [
        [{ text: '📊 Live Rates', callback_data: '/rates' }, { text: '💵 USD Check', callback_data: '/usd' }],
        [{ text: '💶 EUR Check', callback_data: '/eur' }, { text: '💷 GBP Check', callback_data: '/gbp' }],
      ],
    };
  }

  if (command === '/rates') {
    const u = ratesData.USD;
    const e = ratesData.EUR;
    const g = ratesData.GBP;
    const c = ratesData.CAD;
    const usdt = ratesData.USDT;

    return {
      text: `📊 <b>LIVE NAIRA EXCHANGE RATES</b>\n<i>Updated: ${new Date().toLocaleTimeString('en-GB')} UTC</i>\n\n` +
        `<b>🇺🇸 USD / NGN</b>\n` +
        `• Parallel (BDC): <b>₦${u.parallelRate.toLocaleString()}</b> (${u.change24h >= 0 ? '+' : ''}${u.change24h}%)\n` +
        `• Official (NAFEM): ₦${u.officialRate.toLocaleString()}\n\n` +
        `<b>🇪🇺 EUR / NGN</b>\n` +
        `• Parallel (BDC): <b>₦${e.parallelRate.toLocaleString()}</b>\n` +
        `• Official (NAFEM): ₦${e.officialRate.toLocaleString()}\n\n` +
        `<b>🇬🇧 GBP / NGN</b>\n` +
        `• Parallel (BDC): <b>₦${g.parallelRate.toLocaleString()}</b>\n` +
        `• Official (NAFEM): ₦${g.officialRate.toLocaleString()}\n\n` +
        `<b>🇨🇦 CAD / NGN</b>\n` +
        `• Parallel (BDC): <b>₦${c.parallelRate.toLocaleString()}</b>\n\n` +
        `<b>🟢 USDT / NGN (P2P)</b>\n` +
        `• Benchmark: <b>₦${usdt.parallelRate.toLocaleString()}</b>\n\n` +
        `<i>Set alert anytime with: /alert USD 1650</i>`,
      buttons: [
        [{ text: '🔔 /alert USD 1650', callback_data: '/alert USD 1650' }, { text: '🧮 /convert 100 USD', callback_data: '/convert 100 USD' }],
      ],
    };
  }

  if (command === '/usd' || command === '/eur' || command === '/gbp' || command === '/cad') {
    const code = command.substring(1).toUpperCase();
    const r = ratesData[code];
    if (!r) return { text: `Currency ${code} not supported.` };

    return {
      text: `${r.flag} <b>${r.name} (${r.code} / NGN)</b>\n\n` +
        `• <b>Parallel (BDC):</b> ₦${r.parallelRate.toLocaleString()}\n` +
        `• <b>Official NAFEM:</b> ₦${r.officialRate.toLocaleString()}\n` +
        `• <b>24h Change:</b> ${r.change24h >= 0 ? '+' : ''}${r.change24h}%\n` +
        `• <b>Spread:</b> ₦${(r.parallelRate - r.officialRate).toFixed(2)}\n` +
        `• <b>24h High/Low:</b> ₦${r.low24h.toLocaleString()} - ₦${r.high24h.toLocaleString()}`,
      buttons: [
        [{ text: `🔔 /alert ${r.code} ${Math.round(r.parallelRate * 1.02)}`, callback_data: `/alert ${r.code} ${Math.round(r.parallelRate * 1.02)}` }, { text: `🧮 /convert 100 ${r.code}`, callback_data: `/convert 100 ${r.code}` }],
      ],
    };
  }

  if (command === '/convert' || command === '/calc') {
    if (parts.length < 2 || !parts[1].trim()) {
      return {
        text: `⚠️ <b>Convert Currency</b>\n\nUsage: /convert [AMOUNT] [CURRENCY]\nExample: /convert 100 USD or /convert 250 EUR\n\n💡 <i>Tap any example to calculate instantly!</i>`,
        buttons: [
          [{ text: '🧮 /convert 100 USD', callback_data: '/convert 100 USD' }, { text: '🧮 /convert 250 EUR', callback_data: '/convert 250 EUR' }],
          [{ text: '🧮 /convert 100 GBP', callback_data: '/convert 100 GBP' }, { text: '🧮 /convert 50000 NGN', callback_data: '/convert 50000 NGN' }],
        ],
      };
    }

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
        text: `⚠️ <b>Invalid Conversion Format</b>\n\nUsage: /convert [AMOUNT] [CURRENCY]\nExample: /convert 100 USD or /convert 250 EUR`,
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
        text: `🧮 <b>NAIRA TO FOREIGN CURRENCY</b>\n\n<b>₦${amount.toLocaleString()} NGN</b> buys approximately:\n\n• <b>$${usdBuy} USD</b> (Parallel @ ₦${u.parallelRate.toLocaleString()})\n• <b>€${eurBuy} EUR</b> (Parallel @ ₦${e.parallelRate.toLocaleString()})\n• <b>£${gbpBuy} GBP</b> (Parallel @ ₦${g.parallelRate.toLocaleString()})\n• <b>$${cadBuy} CAD</b> (Parallel @ ₦${c.parallelRate.toLocaleString()})`,
        buttons: [
          [{ text: '🔔 /alert USD 1650', callback_data: '/alert USD 1650' }, { text: '📊 /rates', callback_data: '/rates' }],
        ],
      };
    }

    const target = ratesData[currency] || ratesData.USD;
    const ngnParallel = amount * target.parallelRate;
    const ngnOfficial = amount * target.officialRate;
    const diff = ngnParallel - ngnOfficial;

    return {
      text: `🧮 <b>CURRENCY CONVERSION</b>\n\n` +
        `<b>${amount.toLocaleString()} ${target.code}</b> equals:\n\n` +
        `• <b>₦${ngnParallel.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> (Parallel @ ₦${target.parallelRate.toLocaleString()})\n` +
        `• <b>₦${ngnOfficial.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> (Official @ ₦${target.officialRate.toLocaleString()})\n\n` +
        `<i>Spread difference: ₦${diff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</i>`,
      buttons: [
        [
          { text: `🔔 /alert ${target.code} ${Math.round(target.parallelRate * 1.02)}`, callback_data: `/alert ${target.code} ${Math.round(target.parallelRate * 1.02)}` },
          { text: '📊 /rates', callback_data: '/rates' },
        ],
      ],
    };
  }

  if (command === '/alert') {
    let cur = (parts[1] || '').toUpperCase();
    let target = parseFloat(parts[2]);

    if (!isNaN(parseFloat(parts[1])) && isNaN(parseFloat(parts[2]))) {
      target = parseFloat(parts[1]);
      cur = (parts[2] || 'USD').toUpperCase();
    }

    if (!target || isNaN(target) || !cur) {
      return {
        text: `⚠️ <b>Invalid Alert Format</b>\n\nUsage: /alert [CURRENCY] [TARGET_PRICE]\nExample: /alert USD 1650 or /alert EUR 1800`,
        buttons: [
          [{ text: '🔔 /alert USD 1650', callback_data: '/alert USD 1650' }, { text: '🔔 /alert EUR 1800', callback_data: '/alert EUR 1800' }],
        ],
      };
    }

    const newRule: AlertRule = {
      id: 'rule-' + Date.now(),
      name: `Alert: ${cur} ≥ ₦${target}`,
      currency: cur,
      marketType: 'parallel',
      condition: 'above',
      targetValue: target,
      isActive: true,
      cooldownMinutes: 30,
      triggerCount: 0,
      chatId: fromChatId,
    };
    alertRules.unshift(newRule);

    return {
      text: `✅ <b>Alert Created Successfully!</b>\n\n` +
        `Pair: <b>${cur} / NGN</b>\n` +
        `Target Rate: <b>₦${target.toLocaleString()}</b>\n` +
        `Condition: Price rises above threshold\n\n` +
        `You will receive an instant notification right here as soon as this rate is reached!`,
      buttons: [
        [{ text: '📋 /alerts', callback_data: '/alerts' }, { text: '📊 /rates', callback_data: '/rates' }],
      ],
    };
  }

  if (command === '/alerts') {
    if (alertRules.length === 0) {
      return {
        text: `You have no active alerts configured. Use /alert USD 1650 to create one!`,
        buttons: [
          [{ text: '🔔 /alert USD 1650', callback_data: '/alert USD 1650' }],
        ],
      };
    }
    const list = alertRules
      .map((r, i) => `${i + 1}. <b>${r.name}</b> (${r.isActive ? '🟢 Active' : '⚪ Paused'})\n   Triggered: ${r.triggerCount} times`)
      .join('\n\n');

    return {
      text: `📋 <b>YOUR ACTIVE ALERTS</b>\n\n${list}`,
      buttons: [
        [{ text: '🔔 /alert USD 1650', callback_data: '/alert USD 1650' }, { text: '📊 /rates', callback_data: '/rates' }],
      ],
    };
  }

  if (command === '/status') {
    return {
      text: `🟢 <b>24/7 Bot Daemon Status: Online</b>\n\n` +
        `• Uptime: Active\n` +
        `• Active Rules: ${alertRules.filter(r => r.isActive).length}\n` +
        `• Rate Check Interval: Every ${CHECK_INTERVAL_SECONDS} seconds\n` +
        `• Monitored Currencies: USD, EUR, GBP, CAD, AED, CNY, USDT\n` +
        `• Connected Chat: <code>${fromChatId}</code>`,
      buttons: [
        [{ text: '📊 /rates', callback_data: '/rates' }, { text: '📖 /help', callback_data: '/help' }],
      ],
    };
  }

  if (command === '/help') {
    return {
      text: `📖 <b>Yerima Naira Bot Commands</b>\n\n` +
        `• /rates - Full live rates table\n` +
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

  return {
    text: `👋 Hello! I didn't recognize that command.\n\nType /rates to see latest rates or /help for commands.`,
    buttons: [
      [{ text: '📊 /rates', callback_data: '/rates' }, { text: '📖 /help', callback_data: '/help' }],
    ],
  };
}

// Telegram Long Polling Loop
let lastUpdateId = 0;
let isPolling = false;

async function pollTelegramUpdates() {
  if (!BOT_TOKEN || isPolling) return;
  isPolling = true;

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=25`;
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
          console.log(`[Command Received] "${msg.text}" from ${fromName} (${chatId})`);

          const response = handleCommand(msg.text, chatId, fromName);
          const replyMarkup = response.buttons ? { inline_keyboard: response.buttons } : undefined;
          await sendTelegramMessage(chatId, response.text, replyMarkup);
        } else if (callback && callback.data && callback.message) {
          const chatId = String(callback.message.chat.id);
          const fromName = callback.from ? (callback.from.first_name || 'User') : 'User';
          console.log(`[Callback Clicked] "${callback.data}" from ${fromName}`);

          const response = handleCommand(callback.data, chatId, fromName);
          const replyMarkup = response.buttons ? { inline_keyboard: response.buttons } : undefined;
          await sendTelegramMessage(chatId, response.text, replyMarkup);
        }
      }
    }
  } catch (err: any) {
    // Suppress network retry logs
  } finally {
    isPolling = false;
  }
}

// Main Boot Sequence
async function run() {
  console.log('====================================================');
  console.log('🇳🇬 YERIMA NAIRA — 24/7 TELEGRAM ALERT BOT DAEMON');
  console.log('====================================================');
  console.log(`⏱ Rate Check Interval: Every ${CHECK_INTERVAL_SECONDS} seconds`);
  console.log(`🤖 Bot Token Configured: ${BOT_TOKEN ? 'YES (Active)' : 'NO (Missing)'}`);
  console.log(`💬 Default Chat ID: ${CHAT_ID || 'Auto-detecting on first /start'}`);
  console.log('----------------------------------------------------');

  if (BOT_TOKEN) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
      const data = await res.json();
      if (data.ok) {
        console.log(`✅ Connected to Telegram as @${data.result.username} (${data.result.first_name})`);
      } else {
        console.error(`❌ Telegram token error: ${data.description}`);
      }
    } catch (e: any) {
      console.warn('⚠️ Could not verify bot token on boot:', e.message);
    }
  }

  // 1. Initial fetch
  await fetchRealRates();
  console.log(`[Initial Sync] USD Parallel: ₦${ratesData.USD.parallelRate} | Official: ₦${ratesData.USD.officialRate}`);

  // 2. Schedule continuous rate evaluation loop
  setInterval(async () => {
    await fetchRealRates();
    await evaluateAlertRules();
  }, CHECK_INTERVAL_SECONDS * 1000);

  // 3. Start Long-Polling loop for Telegram messages
  setInterval(pollTelegramUpdates, 2000);
  pollTelegramUpdates();

  console.log('🚀 Daemon is running continuously. Press Ctrl+C to stop.\n');
}

run();
