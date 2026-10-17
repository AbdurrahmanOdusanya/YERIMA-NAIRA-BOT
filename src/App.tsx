import { useState, useEffect } from 'react';
import { AlertLog, AlertRule, BotConfig, HistoryPoint, RateInfo } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { RateCards } from './components/RateCards';
import { RateChart } from './components/RateChart';
import { Converter } from './components/Converter';
import { AlertManager } from './components/AlertManager';
import { TelegramSetup } from './components/TelegramSetup';
import { TelegramSimulator } from './components/TelegramSimulator';
import { PriceSimulator } from './components/PriceSimulator';
import { TelegramMiniApp } from './components/TelegramMiniApp';
import { DeploymentGuide } from './components/DeploymentGuide';

const DEFAULT_RATES: Record<string, RateInfo> = {
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
    high24h: 1602.0,
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
};

export default function App() {
  const isTmaMode =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('tma') === 'true' ||
      Boolean((window as any).Telegram?.WebApp?.initData));

  const [activeTab, setActiveTab] = useState<'rates' | 'alerts' | 'telegram' | 'deploy' | 'simulator' | 'simulator-rates'>('rates');
  const [rates, setRates] = useState<Record<string, RateInfo>>(DEFAULT_RATES);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [botConfig, setBotConfig] = useState<BotConfig>({
    botToken: '',
    chatId: '',
    botName: '',
    botUsername: '',
    autoCheckIntervalSeconds: 60,
    isEnabled: true,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Prefill state for alert creation from a card click
  const [prefillCurrency, setPrefillCurrency] = useState<string>('USD');
  const [prefillRate, setPrefillRate] = useState<number>(1600);

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [ratesRes, alertsRes, configRes] = await Promise.all([
        api.getRates(),
        api.getAlerts(),
        api.getBotConfig(),
      ]);

      if (ratesRes && ratesRes.rates && Object.keys(ratesRes.rates).length > 0) {
        setRates(ratesRes.rates);
        setHistory(ratesRes.history || []);
        setLastSyncTime(new Date().toLocaleTimeString('en-GB'));
      }

      if (alertsRes && alertsRes.rules) {
        setRules(alertsRes.rules);
        setLogs(alertsRes.logs || []);
      }

      if (configRes && configRes.config) {
        setBotConfig(configRes.config);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
    }
  };

  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.refreshRates();
      if (res && res.rates && Object.keys(res.rates).length > 0) {
        setRates(res.rates);
        setLastSyncTime(new Date().toLocaleTimeString('en-GB'));
      }
      // Re-fetch alert logs in case triggers were fired
      const alertsRes = await api.getAlerts();
      if (alertsRes && alertsRes.rules) {
        setRules(alertsRes.rules);
        setLogs(alertsRes.logs || []);
      }
    } catch (err: any) {
      console.warn('Failed to refresh rates:', err?.message || err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectAlertCurrency = (code: string, currentRate: number) => {
    setPrefillCurrency(code);
    setPrefillRate(currentRate);
    setActiveTab('alerts');
  };

  const activeRulesCount = rules.filter((r) => r.isActive).length;



  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Universal Top Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefreshRates={handleRefreshRates}
        isRefreshing={isRefreshing}
      />

      {/* Metric Context Sub-header */}
      <div className="border-b border-slate-800/60 bg-slate-950/40 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-200 font-medium">Exchange Rate Monitor</span>
            <span aria-hidden="true">·</span>
            <span>7 Monitored Pairs</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{activeRulesCount} Active Alert Rules</span>
            <span aria-hidden="true">·</span>
            <span>Last Sync: {lastSyncTime ? `${lastSyncTime} UTC` : 'Live'}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('deploy')}
              className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>🚀 24/7 Hosting Guide</span>
            </button>

            {botConfig.botUsername ? (
              <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Telegram Bot: @{botConfig.botUsername}
              </span>
            ) : (
              <button
                onClick={() => setActiveTab('telegram')}
                className="text-slate-400 hover:text-emerald-400 transition-colors text-[11px] cursor-pointer"
              >
                Connect Telegram Bot Token →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* VIEW 1: RATES & CHARTS */}
        {activeTab === 'rates' && (
          <div className="space-y-8">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Nigerian Naira (NGN) Exchange Rates
                </h1>
                <p className="text-xs text-slate-400">
                  Tracking Parallel Market (BDC) & Official NAFEM Windows
                </p>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time currency prices. Click any pair to set a personalized Telegram alert.
              </p>
            </div>

            {/* Live Rate Cards Grid */}
            <RateCards rates={rates} onSelectAlertCurrency={handleSelectAlertCurrency} />

            {/* 7-Day Trend Line Chart */}
            <RateChart history={history} />

            {/* Currency Converter */}
            <Converter rates={rates} botConfig={botConfig} />
          </div>
        )}

        {/* VIEW 2: ALERTS MANAGER */}
        {activeTab === 'alerts' && (
          <AlertManager
            rules={rules}
            logs={logs}
            rates={rates}
            botConfig={botConfig}
            onRefreshAlerts={loadAllData}
            prefillCurrency={prefillCurrency}
            prefillRate={prefillRate}
          />
        )}

        {/* VIEW 3: TELEGRAM BOT SETUP */}
        {activeTab === 'telegram' && (
          <TelegramSetup
            botConfig={botConfig}
            onUpdateConfig={loadAllData}
            onOpenTma={() => setActiveTab('deploy')}
          />
        )}

        {/* VIEW 4: 24/7 DEPLOYMENT GUIDE */}
        {activeTab === 'deploy' && (
          <DeploymentGuide
            botConfig={botConfig}
            onOpenTelegramSetup={() => setActiveTab('telegram')}
          />
        )}

        {/* VIEW 5: BOT PHONE SIMULATOR */}
        {activeTab === 'simulator' && (
          <TelegramSimulator rates={rates} botConfig={botConfig} />
        )}

        {/* VIEW 6: MARKET PRICE SHOCK TEST */}
        {activeTab === 'simulator-rates' && (
          <PriceSimulator rates={rates} rules={rules} onRateUpdated={loadAllData} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Yerima Naira</span>
            <span aria-hidden="true">·</span>
            <span>24/7 Automated Yerima Naira Alert Bot</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setActiveTab('rates')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Exchange Rates
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Alerts
            </button>
            <button
              onClick={() => setActiveTab('telegram')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Telegram Setup
            </button>
            <button
              onClick={() => setActiveTab('deploy')}
              className="hover:text-slate-200 transition-colors cursor-pointer text-emerald-400 font-semibold"
            >
              24/7 Deploy
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className="hover:text-slate-200 transition-colors cursor-pointer"
            >
              Simulator
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
