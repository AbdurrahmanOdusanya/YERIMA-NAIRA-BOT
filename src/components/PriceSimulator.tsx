import { useState } from 'react';
import { AlertLog, AlertRule, RateInfo } from '../types';
import { api } from '../services/api';

interface PriceSimulatorProps {
  rates: Record<string, RateInfo>;
  rules: AlertRule[];
  onRateUpdated: () => void;
}

export function PriceSimulator({ rates, rules, onRateUpdated }: PriceSimulatorProps) {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [percentDelta, setPercentDelta] = useState<number>(2.5);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{
    updatedRate: RateInfo;
    triggeredAlerts: AlertLog[];
  } | null>(null);

  const currentRate = rates[selectedCurrency] || rates.USD || {
    code: selectedCurrency || 'USD',
    name: 'US Dollar',
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

  const handleSimulatePercent = async (delta: number) => {
    setIsSimulating(true);
    setErrorMessage(null);
    setLastResult(null);
    try {
      const res = await api.simulateRateShift({
        currency: selectedCurrency,
        percentDelta: delta,
      });
      setLastResult(res);
      onRateUpdated();
    } catch (err: any) {
      setErrorMessage('Simulation error: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulateCustom = async () => {
    if (!customPrice || isNaN(Number(customPrice))) {
      setErrorMessage('Please enter a valid price in Naira.');
      return;
    }
    setIsSimulating(true);
    setErrorMessage(null);
    setLastResult(null);
    try {
      const res = await api.simulateRateShift({
        currency: selectedCurrency,
        customRate: Number(customPrice),
      });
      setLastResult(res);
      onRateUpdated();
    } catch (err: any) {
      setErrorMessage('Simulation error: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetToLive = async () => {
    setIsSimulating(true);
    setErrorMessage(null);
    try {
      await api.refreshRates();
      setLastResult(null);
      onRateUpdated();
    } catch (err: any) {
      setErrorMessage('Failed to reset: ' + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Market Price Shock Test</h2>
        <p className="text-xs text-slate-400 mt-1">
          Simulate volatility spikes and sudden exchange rate shifts to test how your Telegram alert bot detects and delivers alerts.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-base font-bold text-white mb-4">Choose Currency & Shift</h3>

            {/* Currency Picker */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Target Currency</label>
              <div className="grid grid-cols-4 gap-2">
                {['USD', 'EUR', 'GBP', 'CAD'].map((code) => {
                  const r = rates[code];
                  return (
                    <button
                      key={code}
                      onClick={() => {
                        setSelectedCurrency(code);
                        setCustomPrice('');
                      }}
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        selectedCurrency === code
                          ? 'bg-slate-800 border-emerald-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{r?.flag || '💱'} {code}</span>
                      <span className="font-mono tabular-nums text-[11px] text-slate-300">
                        ₦{r?.parallelRate ? r.parallelRate.toLocaleString() : '---'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Price Surge & Drop Presets */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Simulate Percentage Movements
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => handleSimulatePercent(2.0)}
                  disabled={isSimulating}
                  className="py-2 px-3 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  +2.0% Surge
                </button>
                <button
                  onClick={() => handleSimulatePercent(4.5)}
                  disabled={isSimulating}
                  className="py-2 px-3 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 text-emerald-200 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  +4.5% Spike
                </button>
                <button
                  onClick={() => handleSimulatePercent(-2.0)}
                  disabled={isSimulating}
                  className="py-2 px-3 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  -2.0% Dip
                </button>
                <button
                  onClick={() => handleSimulatePercent(-4.0)}
                  disabled={isSimulating}
                  className="py-2 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  -4.0% Crash
                </button>
              </div>
            </div>

            {/* Custom Exact Price Input */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Or Set Exact Target Price (₦)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder={`e.g. ${Math.round((currentRate?.parallelRate || 1600) * 1.03)}`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono tabular-nums text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleSimulateCustom}
                  disabled={isSimulating || !customPrice}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  Apply Price
                </button>
              </div>
            </div>

            {/* Reset to live feeds */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Restore actual real-world market values</span>
              <button
                onClick={handleResetToLive}
                disabled={isSimulating}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer disabled:opacity-50"
              >
                Reset to Live FX APIs
              </button>
            </div>
          </div>
        </div>

        {/* Results & Trigger Outcome Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 h-full flex flex-col">
            <h3 className="text-base font-bold text-white mb-2">Simulated Outcome & Alert Evaluation</h3>
            <p className="text-xs text-slate-400 mb-4">
              Instant feedback showing whether any active rules crossed threshold conditions
            </p>

            {lastResult ? (
              <div className="space-y-4 flex-1">
                {/* Rate Shift Banner */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{lastResult.updatedRate.flag} {lastResult.updatedRate.code} / NGN (Parallel)</span>
                    <span className={`font-mono font-semibold ${lastResult.updatedRate.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {lastResult.updatedRate.change24h >= 0 ? '+' : ''}{lastResult.updatedRate.change24h}%
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-white">
                    ₦{lastResult.updatedRate.parallelRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    Shift Amount: {lastResult.updatedRate.changeAmount >= 0 ? '+' : ''}₦{lastResult.updatedRate.changeAmount.toFixed(2)}
                  </p>
                </div>

                {/* Triggered Alerts Count */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Alert Rules Triggered: {lastResult.triggeredAlerts.length}
                  </h4>

                  {lastResult.triggeredAlerts.length === 0 ? (
                    <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-500">
                      No alert rules matched this price change. (Check active threshold targets in the Alert Rules tab or try a larger price jump).
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lastResult.triggeredAlerts.map((t, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-300">{t.ruleName}</span>
                            <span className="text-[11px] font-mono text-emerald-400">
                              {t.deliveredToTelegram ? '✓ Sent to Telegram' : 'Logged'}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px]">{t.triggerReason}</p>
                          {t.telegramError && (
                            <p className="text-amber-400 text-[10px]">
                              Note: {t.telegramError}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                <svg className="w-8 h-8 text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Click a percentage surge or enter a price on the left to simulate a live market shock.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
