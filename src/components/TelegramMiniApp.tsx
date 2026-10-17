import { useState, useEffect } from 'react';
import { BotConfig, RateInfo, TelegramWebAppUser } from '../types';
import { api } from '../services/api';

interface TelegramMiniAppProps {
  rates: Record<string, RateInfo>;
  botConfig: BotConfig;
  onAlertCreated?: () => void;
  onExitTma?: () => void;
}

export function TelegramMiniApp({ rates, botConfig, onAlertCreated, onExitTma }: TelegramMiniAppProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [convertAmount, setConvertAmount] = useState<number>(100);
  const [targetPrice, setTargetPrice] = useState<number>(1600);
  const [marketType, setMarketType] = useState<'parallel' | 'official' | 'usdt'>('parallel');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [isSaving, setIsSaving] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState<string>('');
  const [alertError, setAlertError] = useState<string>('');
  const [telegramUser, setTelegramUser] = useState<TelegramWebAppUser | null>(null);

  const rateInfo = rates[selectedCurrency] || rates.USD;

  // Initialize Telegram WebApp SDK if running inside real Telegram
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        setTelegramUser(tg.initDataUnsafe.user);
      }
    }
  }, []);

  // Update target price default when currency changes
  useEffect(() => {
    if (rateInfo) {
      const base = rateInfo.parallelRate || 1600;
      setTargetPrice(Math.round(base * 1.02));
    }
  }, [selectedCurrency, rateInfo]);

  const handleCurrencySelect = (code: string) => {
    setSelectedCurrency(code);
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('light');
    }
  };

  const handleSaveAlert = async () => {
    setIsSaving(true);
    setAlertSuccess('');
    setAlertError('');

    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('medium');
    }

    try {
      const res = await api.createWebappAlert({
        currency: selectedCurrency,
        targetValue: targetPrice,
        condition,
        marketType,
        telegramUser,
      });

      if (res.success) {
        setAlertSuccess(`✅ Alert set! We will notify you on Telegram when ${selectedCurrency} ${condition === 'above' ? '≥' : '≤'} ₦${targetPrice.toLocaleString()}`);
        if (tg?.HapticFeedback) {
          tg.HapticFeedback.notificationOccurred('success');
        }
        if (onAlertCreated) onAlertCreated();
        setTimeout(() => setAlertSuccess(''), 5000);
      } else {
        setAlertError(res.message || 'Failed to save alert');
      }
    } catch (err: any) {
      setAlertError('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && typeof tg.close === 'function') {
      tg.close();
    } else if (onExitTma) {
      onExitTma();
    }
  };

  const currentRate = rateInfo?.parallelRate || 1595;
  const officialRate = rateInfo?.officialRate || 1532;
  const spread = currentRate - officialRate;
  const convertedNaira = convertAmount * currentRate;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0E1621] text-white flex flex-col font-sans pb-10">
      {/* Telegram Mini App Top Nav Bar */}
      <div className="bg-[#17212B] px-4 py-3 border-b border-[#242F3D] flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
            ₦
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
              Yerima Naira
            </h1>
            <p className="text-[11px] text-[#7F91A4]">
              {telegramUser ? `Hi, ${telegramUser.first_name}` : 'Telegram Mini App'}
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="px-2.5 py-1 text-xs rounded bg-[#242F3D] hover:bg-[#2F3C4C] text-[#7F91A4] hover:text-white transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Success Banner */}
        {alertSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-medium animate-fadeIn">
            {alertSuccess}
          </div>
        )}

        {/* Error Banner */}
        {alertError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs font-medium animate-fadeIn flex items-center justify-between">
            <span>{alertError}</span>
            <button
              onClick={() => setAlertError('')}
              className="text-rose-400 font-bold hover:underline cursor-pointer ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Currency Quick-Tabs Strip */}
        <div>
          <span className="text-[11px] font-semibold text-[#7F91A4] uppercase tracking-wider block mb-2">
            Select Currency
          </span>
          <div className="grid grid-cols-4 gap-2">
            {['USD', 'EUR', 'GBP', 'CAD'].map((code) => {
              const r = rates[code];
              const isSelected = selectedCurrency === code;
              return (
                <button
                  key={code}
                  onClick={() => handleCurrencySelect(code)}
                  className={`p-2 rounded-xl text-center transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#2B5278] border-[#5288C1] text-white shadow-sm'
                      : 'bg-[#17212B] border-[#242F3D] text-[#7F91A4] hover:text-white'
                  }`}
                >
                  <div className="text-base">{r?.flag || '💱'}</div>
                  <div className="text-xs font-bold mt-0.5">{code}</div>
                  <div className="text-[10px] font-mono tabular-nums opacity-90">
                    ₦{r?.parallelRate ? Math.round(r.parallelRate) : '---'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Active Currency Hero Card */}
        <div className="p-4 rounded-2xl bg-[#17212B] border border-[#242F3D] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{rateInfo?.flag}</span>
              <div>
                <h2 className="text-base font-bold text-white">{rateInfo?.name}</h2>
                <span className="text-xs text-[#7F91A4]">{rateInfo?.code} to Nigerian Naira</span>
              </div>
            </div>

            <div
              className={`text-right text-xs font-mono font-bold ${
                (rateInfo?.change24h || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(rateInfo?.change24h || 0) >= 0 ? '▲ +' : '▼ '}
              {rateInfo?.change24h || 0}%
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-2.5 rounded-xl bg-[#0E1621] border border-[#242F3D]">
              <span className="text-[10px] text-[#7F91A4] block">Parallel Market (BDC)</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                ₦{currentRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[#0E1621] border border-[#242F3D]">
              <span className="text-[10px] text-[#7F91A4] block">Official Rate (NAFEM)</span>
              <span className="text-base font-bold font-mono text-slate-200">
                ₦{officialRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#7F91A4] pt-1">
            <span>Market Spread: ₦{spread.toFixed(2)}</span>
            <span>24h Range: ₦{rateInfo?.low24h || 0} - ₦{rateInfo?.high24h || 0}</span>
          </div>
        </div>

        {/* Quick FX Calculator */}
        <div className="p-4 rounded-2xl bg-[#17212B] border border-[#242F3D] space-y-3">
          <h3 className="text-xs font-bold text-[#7F91A4] uppercase tracking-wider">
            Quick Converter
          </h3>

          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="number"
                value={convertAmount}
                onChange={(e) => setConvertAmount(Math.max(0, Number(e.target.value)))}
                className="w-full bg-[#0E1621] border border-[#242F3D] rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#5288C1]"
              />
              <span className="absolute right-3 top-2 text-xs text-[#7F91A4] font-bold">
                {selectedCurrency}
              </span>
            </div>

            <span className="text-slate-400 font-bold">=</span>

            <div className="flex-1 bg-[#0E1621] border border-[#242F3D] rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-sm">
              ₦{convertedNaira.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Set Telegram Alert Form */}
        <div className="p-4 rounded-2xl bg-[#17212B] border border-[#242F3D] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#7F91A4] uppercase tracking-wider">
              Set Instant Price Alert
            </h3>
            <span className="text-[11px] text-emerald-400 font-medium">Delivered to your Telegram</span>
          </div>

          {/* Condition toggle */}
          <div className="grid grid-cols-2 gap-2 bg-[#0E1621] p-1 rounded-xl border border-[#242F3D]">
            <button
              onClick={() => setCondition('above')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                condition === 'above' ? 'bg-[#2B5278] text-white' : 'text-[#7F91A4]'
              }`}
            >
              When Price Rises (≥)
            </button>
            <button
              onClick={() => setCondition('below')}
              className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                condition === 'below' ? 'bg-[#2B5278] text-white' : 'text-[#7F91A4]'
              }`}
            >
              When Price Drops (≤)
            </button>
          </div>

          {/* Target Price Input */}
          <div>
            <div className="flex justify-between text-xs text-[#7F91A4] mb-1">
              <span>Target Alert Price (₦)</span>
              <span>Current: ₦{currentRate.toLocaleString()}</span>
            </div>
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(Number(e.target.value))}
              className="w-full bg-[#0E1621] border border-[#242F3D] rounded-xl px-3 py-2.5 text-white font-mono text-base font-bold focus:outline-none focus:border-[#5288C1]"
            />
          </div>

          {/* Quick presets */}
          <div className="flex gap-2">
            <button
              onClick={() => setTargetPrice(Math.round(currentRate * 1.015))}
              className="flex-1 py-1 rounded-lg bg-[#0E1621] hover:bg-[#242F3D] text-[11px] font-mono text-[#7F91A4] border border-[#242F3D]"
            >
              +1.5%
            </button>
            <button
              onClick={() => setTargetPrice(Math.round(currentRate * 1.03))}
              className="flex-1 py-1 rounded-lg bg-[#0E1621] hover:bg-[#242F3D] text-[11px] font-mono text-[#7F91A4] border border-[#242F3D]"
            >
              +3.0%
            </button>
            <button
              onClick={() => setTargetPrice(Math.round(currentRate * 0.985))}
              className="flex-1 py-1 rounded-lg bg-[#0E1621] hover:bg-[#242F3D] text-[11px] font-mono text-[#7F91A4] border border-[#242F3D]"
            >
              -1.5%
            </button>
          </div>

          {/* Big Action Button */}
          <button
            onClick={handleSaveAlert}
            disabled={isSaving}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#2B5278] hover:bg-[#346392] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 mt-2"
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>
              {isSaving
                ? 'Setting Alert...'
                : `Set Alert for ${selectedCurrency} @ ₦${targetPrice.toLocaleString()}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
