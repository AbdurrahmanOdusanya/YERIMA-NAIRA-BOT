import { useState } from 'react';
import { BotConfig, RateInfo } from '../types';
import { api } from '../services/api';

interface ConverterProps {
  rates: Record<string, RateInfo>;
  botConfig: BotConfig;
}

export function Converter({ rates, botConfig }: ConverterProps) {
  const [amount, setAmount] = useState<number>(100);
  const [currency, setCurrency] = useState<string>('USD');
  const [mode, setMode] = useState<'foreignToNgn' | 'ngnToForeign'>('foreignToNgn');
  const [copyStatus, setCopyStatus] = useState<string>('');
  const [sendTelegramStatus, setSendTelegramStatus] = useState<string>('');

  const currentRate = rates[currency] || rates.USD || {
    code: currency,
    name: currency,
    symbol: '$',
    flag: '🇺🇸',
    officialRate: 1532.5,
    parallelRate: 1595.0,
    change24h: 0,
    changeAmount: 0,
    high24h: 1602.0,
    low24h: 1580.0,
    lastUpdated: '',
  };

  // Calculation
  const parallelRate = currentRate?.parallelRate ?? 0;
  const officialRate = currentRate?.officialRate ?? 0;

  let parallelResult = 0;
  let officialResult = 0;

  if (mode === 'foreignToNgn') {
    parallelResult = amount * parallelRate;
    officialResult = amount * officialRate;
  } else {
    parallelResult = parallelRate > 0 ? amount / parallelRate : 0;
    officialResult = officialRate > 0 ? amount / officialRate : 0;
  }

  const difference = Math.abs(parallelResult - officialResult);

  const handleCopy = () => {
    const text =
      mode === 'foreignToNgn'
        ? `${amount} ${currency} = ₦${parallelResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Parallel BDC @ ₦${parallelRate}) | ₦${officialResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Official @ ₦${officialRate})`
        : `₦${amount.toLocaleString()} = ${parallelResult.toFixed(2)} ${currency} (Parallel BDC) | ${officialResult.toFixed(2)} ${currency} (Official)`;

    navigator.clipboard.writeText(text);
    setCopyStatus('Copied to clipboard!');
    setTimeout(() => setCopyStatus(''), 2500);
  };

  const handleSendToTelegram = async () => {
    if (!botConfig.botToken || !botConfig.chatId) {
      setSendTelegramStatus('Please configure Bot Token and Chat ID in Telegram Setup tab first.');
      setTimeout(() => setSendTelegramStatus(''), 4000);
      return;
    }

    try {
      setSendTelegramStatus('Sending to Telegram...');
      const msg = `🧮 <b>Yerima Naira Calculation</b>\n\n• <b>Amount:</b> ${amount.toLocaleString()} ${mode === 'foreignToNgn' ? currency : 'NGN'}\n• <b>Parallel (BDC):</b> ${mode === 'foreignToNgn' ? '₦' + parallelResult.toLocaleString('en-US', { minimumFractionDigits: 2 }) : parallelResult.toFixed(2) + ' ' + currency}\n• <b>Official (NAFEM):</b> ${mode === 'foreignToNgn' ? '₦' + officialResult.toLocaleString('en-US', { minimumFractionDigits: 2 }) : officialResult.toFixed(2) + ' ' + currency}\n• <b>Spread Difference:</b> ₦${difference.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

      const res = await api.sendTestMessage({
        botToken: botConfig.botToken,
        chatId: botConfig.chatId,
        message: msg,
      });

      if (res.success) {
        setSendTelegramStatus('✅ Sent to your Telegram!');
      } else {
        setSendTelegramStatus(`❌ Error: ${res.error}`);
      }
      setTimeout(() => setSendTelegramStatus(''), 3500);
    } catch (e: any) {
      setSendTelegramStatus('Failed to send: ' + e.message);
      setTimeout(() => setSendTelegramStatus(''), 3500);
    }
  };

  return (
    <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Currency Converter & Spread Analyzer
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Instant conversion at live Parallel (BDC) and Official (NAFEM) exchange rates
          </p>
        </div>

        {/* Direction Toggle */}
        <button
          onClick={() => setMode(mode === 'foreignToNgn' ? 'ngnToForeign' : 'foreignToNgn')}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Switch Direction ({mode === 'foreignToNgn' ? `${currency} → NGN` : `NGN → ${currency}`})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Amount Input */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            {mode === 'foreignToNgn' ? `Amount in ${currency}` : 'Amount in Naira (NGN)'}
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white font-mono tabular-nums text-sm focus:outline-none focus:border-emerald-500"
              placeholder="100"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">
              {mode === 'foreignToNgn' ? currency : 'NGN'}
            </span>
          </div>
        </div>

        {/* Currency Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Foreign Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {Object.values(rates).map((r) => (
              <option key={r.code} value={r.code}>
                {r.flag} {r.code} - {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Amount Presets */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Quick Presets</label>
          <div className="flex items-center gap-1.5 h-10">
            {[50, 100, 500, 1000].map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset)}
                className="flex-1 h-full bg-slate-950 hover:bg-slate-800 text-xs text-slate-300 font-mono tabular-nums border border-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 mb-4">
        {/* Parallel BDC Result */}
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Parallel Market (BDC / Street)</span>
            <span className="font-mono text-[11px] text-emerald-400">Rate: ₦{parallelRate.toLocaleString()}</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-white">
            {mode === 'foreignToNgn' ? (
              <>₦{parallelResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
            ) : (
              <>{parallelResult.toFixed(2)} {currency}</>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Real-time street & Bureau de Change rate benchmark</p>
        </div>

        {/* Official NAFEM Result */}
        <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Official Market (NAFEM / CBN)</span>
            <span className="font-mono text-[11px] text-blue-400">Rate: ₦{officialRate.toLocaleString()}</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-200">
            {mode === 'foreignToNgn' ? (
              <>₦{officialResult.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
            ) : (
              <>{officialResult.toFixed(2)} {currency}</>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Central Bank of Nigeria official FX window</p>
        </div>
      </div>

      {/* Footer Actions & Spread Note */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="text-slate-400 font-mono tabular-nums">
          Spread difference: <span className="text-amber-400 font-bold">₦{difference.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div className="flex items-center gap-2">
          {copyStatus && <span className="text-emerald-400 text-xs font-medium">{copyStatus}</span>}
          {sendTelegramStatus && <span className="text-emerald-400 text-xs font-medium">{sendTelegramStatus}</span>}

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700 cursor-pointer"
          >
            Copy Summary
          </button>
          <button
            onClick={handleSendToTelegram}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.37.74-.56 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06-.01.19-.03.3z" />
            </svg>
            Send to Telegram
          </button>
        </div>
      </div>
    </div>
  );
}
