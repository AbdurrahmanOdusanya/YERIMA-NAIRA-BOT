import { useState } from 'react';
import { AlertLog, AlertRule, BotConfig, RateInfo } from '../types';
import { api } from '../services/api';

interface AlertManagerProps {
  rules: AlertRule[];
  logs: AlertLog[];
  rates: Record<string, RateInfo>;
  botConfig: BotConfig;
  onRefreshAlerts: () => void;
  prefillCurrency?: string;
  prefillRate?: number;
}

export function AlertManager({
  rules,
  logs,
  rates,
  botConfig,
  onRefreshAlerts,
  prefillCurrency,
  prefillRate,
}: AlertManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string>('');
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);

  // Delete confirmation modal state
  const [ruleToDelete, setRuleToDelete] = useState<AlertRule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New alert form state
  const [currency, setCurrency] = useState(prefillCurrency || 'USD');
  const [name, setName] = useState('');
  const [marketType, setMarketType] = useState<'parallel' | 'official' | 'usdt'>('parallel');
  const [condition, setCondition] = useState<'above' | 'below' | 'percent_change'>('above');
  const [targetValue, setTargetValue] = useState<number>(prefillRate ? Math.round(prefillRate * 1.02) : 1620);
  const [cooldownMinutes, setCooldownMinutes] = useState(30);
  const [customChatId, setCustomChatId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRate = rates[currency] || rates.USD || {
    code: currency || 'USD',
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

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreateError(null);
    try {
      const generatedName =
        name ||
        `${currency} ${
          condition === 'above'
            ? `rose above ₦${targetValue.toLocaleString()}`
            : condition === 'below'
            ? `dropped below ₦${targetValue.toLocaleString()}`
            : `volatility ≥ ${targetValue}%`
        }`;

      await api.createAlert({
        name: generatedName,
        currency,
        marketType,
        condition,
        targetValue,
        isActive: true,
        cooldownMinutes,
        chatId: customChatId.trim() || undefined,
      });

      setShowCreateModal(false);
      setName('');
      setCreateError(null);
      onRefreshAlerts();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      await api.updateAlert(rule.id, { isActive: !rule.isActive });
      onRefreshAlerts();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!ruleToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteAlert(ruleToDelete.id);
      setTestStatus(`🗑️ Deleted alert rule for ${ruleToDelete.currency}/NGN`);
      setRuleToDelete(null);
      onRefreshAlerts();
      setTimeout(() => setTestStatus(''), 4000);
    } catch (err: any) {
      setTestStatus(`Failed to delete alert: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTriggerTest = async (rule: AlertRule) => {
    setTestingRuleId(rule.id);
    setTestStatus('Firing alert test to Telegram...');
    try {
      const res = await api.triggerTestAlert(rule.id);
      if (res.delivered) {
        setTestStatus(`✅ Alert dispatched directly to Telegram! (Chat ID: ${rule.chatId || botConfig.chatId || 'Active'})`);
      } else {
        setTestStatus(
          `⚠️ Alert logged! (Telegram delivery note: ${res.telegramError || 'Configure bot token in Telegram Setup tab'})`
        );
      }
      onRefreshAlerts();
      setTimeout(() => {
        setTestStatus('');
        setTestingRuleId(null);
      }, 5000);
    } catch (err: any) {
      setTestStatus(`Failed: ${err.message}`);
      setTimeout(() => {
        setTestStatus('');
        setTestingRuleId(null);
      }, 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Notification Banner */}
      {testStatus && (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <span>{testStatus}</span>
          <button onClick={() => setTestStatus('')} className="text-emerald-400 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Rules Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Exchange Rate Alert Rules</h2>
          <p className="text-xs text-slate-400 mt-1">
            Autonomous alert triggers that push instant notifications to Telegram when prices shift
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Alert Rule
        </button>
      </div>

      {/* Rules Table / Cards */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        {rules.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm mb-3">No exchange rate alert rules active</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              Add Your First Rate Alert
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-medium">
                  <th className="py-3 px-4">Rule Name</th>
                  <th className="py-3 px-4">Currency Pair</th>
                  <th className="py-3 px-4">Market</th>
                  <th className="py-3 px-4">Trigger Condition</th>
                  <th className="py-3 px-4">Cooldown</th>
                  <th className="py-3 px-4 text-center">Triggered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {rules.map((rule) => {
                  const currentRateInfo = rates[rule.currency] || rates.USD;
                  const currentPrice = currentRateInfo
                    ? rule.marketType === 'official'
                      ? currentRateInfo.officialRate
                      : currentRateInfo.parallelRate
                    : 0;

                  return (
                    <tr key={rule.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              rule.isActive ? 'bg-emerald-400' : 'bg-slate-600'
                            }`}
                          />
                          <span>{rule.name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                        {rule.currency} / NGN
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 capitalize">
                        {rule.marketType === 'parallel' ? 'Parallel (BDC)' : rule.marketType === 'usdt' ? 'USDT (P2P)' : 'Official (NAFEM)'}
                      </td>

                      <td className="py-3.5 px-4 font-mono tabular-nums">
                        {rule.condition === 'above' && (
                          <span className="text-emerald-400 font-semibold">
                            Rate ≥ ₦{rule.targetValue.toLocaleString()}
                          </span>
                        )}
                        {rule.condition === 'below' && (
                          <span className="text-rose-400 font-semibold">
                            Rate ≤ ₦{rule.targetValue.toLocaleString()}
                          </span>
                        )}
                        {rule.condition === 'percent_change' && (
                          <span className="text-amber-400 font-semibold">
                            Change ≥ {rule.targetValue}%
                          </span>
                        )}
                        <span className="block text-[11px] text-slate-500 font-sans mt-0.5">
                          Current: ₦{currentPrice.toLocaleString()}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono tabular-nums">
                        {rule.cooldownMinutes} min
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono tabular-nums">
                        <span className="text-slate-300">{rule.triggerCount} times</span>
                        {rule.lastTriggered && (
                          <span className="block text-[10px] text-slate-500 font-sans">
                            {new Date(rule.lastTriggered).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Test Trigger Button */}
                          <button
                            onClick={() => handleTriggerTest(rule)}
                            disabled={testingRuleId === rule.id}
                            className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Send immediate test alert to Telegram"
                          >
                            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>{testingRuleId === rule.id ? 'Sending...' : 'Test Alert'}</span>
                          </button>

                          {/* Toggle Active / Pause */}
                          <button
                            onClick={() => handleToggleRule(rule)}
                            className={`px-2 py-1 text-[11px] rounded border transition-colors cursor-pointer ${
                              rule.isActive
                                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                                : 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/50'
                            }`}
                          >
                            {rule.isActive ? 'Pause' : 'Activate'}
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setRuleToDelete(rule)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete rule"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alert Dispatch History / Audit Log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white tracking-tight">Recent Alert Dispatch Log</h3>
          <span className="text-xs text-slate-500">{logs.length} logged trigger events</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No alert dispatches logged yet. When price triggers fire or you click "Test Alert", events will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Pair & Market</th>
                    <th className="py-2.5 px-4">Trigger Rate</th>
                    <th className="py-2.5 px-4">Reason</th>
                    <th className="py-2.5 px-4 text-right">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px] tabular-nums whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString('en-GB')} · {new Date(log.timestamp).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-medium text-white whitespace-nowrap">
                        {log.currency} / NGN ({log.marketType})
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-emerald-400 font-bold whitespace-nowrap">
                        ₦{log.currentRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">
                        {log.triggerReason}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {log.deliveredToTelegram ? (
                          <span className="text-emerald-400 font-medium flex items-center justify-end gap-1">
                            <span>✓</span> Sent to Telegram
                          </span>
                        ) : (
                          <span className="text-slate-500" title={log.telegramError}>
                            In-App Logged {log.telegramError ? `(${log.telegramError})` : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Alert Rule */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">New Telegram Price Alert</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Currency Pair</label>
                <select
                  value={currency}
                  onChange={(e) => {
                    const c = e.target.value;
                    setCurrency(c);
                    const r = rates[c] || rates.USD;
                    setTargetValue(Math.round(r.parallelRate * 1.02));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  {Object.values(rates).map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.flag} {r.code} - {r.name} (Current: ₦{r.parallelRate.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Market Window</label>
                  <select
                    value={marketType}
                    onChange={(e: any) => setMarketType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="parallel">Parallel / BDC (Street)</option>
                    <option value="official">Official (NAFEM / CBN)</option>
                    <option value="usdt">Crypto USDT P2P</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Trigger Condition</label>
                  <select
                    value={condition}
                    onChange={(e: any) => setCondition(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="above">Price rises above (≥)</option>
                    <option value="below">Price drops below (≤)</option>
                    <option value="percent_change">24h Volatility shift (≥ %)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400">
                    {condition === 'percent_change' ? 'Target Shift Percentage (%)' : 'Target Price in Naira (₦)'}
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Current: ₦{selectedRate.parallelRate.toLocaleString()}
                  </span>
                </div>
                <input
                  type="number"
                  step={condition === 'percent_change' ? '0.1' : '1'}
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono tabular-nums text-sm focus:outline-none focus:border-emerald-500"
                  required
                />

                {/* Quick Presets */}
                {condition !== 'percent_change' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setTargetValue(Math.round(selectedRate.parallelRate * 1.015))}
                      className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-950 border border-slate-800"
                    >
                      +1.5% (₦{Math.round(selectedRate.parallelRate * 1.015)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetValue(Math.round(selectedRate.parallelRate * 1.03))}
                      className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-950 border border-slate-800"
                    >
                      +3% (₦{Math.round(selectedRate.parallelRate * 1.03)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetValue(Math.round(selectedRate.parallelRate * 0.985))}
                      className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-950 border border-slate-800"
                    >
                      -1.5% (₦{Math.round(selectedRate.parallelRate * 0.985)})
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Cooldown Throttling</label>
                  <select
                    value={cooldownMinutes}
                    onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={240}>4 Hours</option>
                    <option value={1440}>24 Hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Custom Telegram Chat ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={customChatId}
                    onChange={(e) => setCustomChatId(e.target.value)}
                    placeholder="Defaults to Bot Chat"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Custom Alert Label (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My USD Supplier Breach Alert"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {createError && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                  <span>{createError}</span>
                  <button type="button" onClick={() => setCreateError(null)} className="text-rose-400 font-bold hover:underline">
                    Dismiss
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateError(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Activate Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Replaces browser-blocking confirm()) */}
      {ruleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Delete Alert Rule?</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Currency Pair:</span>
                <span className="text-white font-semibold font-mono">{ruleToDelete.currency}/NGN</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Condition:</span>
                <span className="text-white font-mono">
                  {ruleToDelete.condition === 'above' ? '≥' : ruleToDelete.condition === 'below' ? '≤' : 'Δ'} ₦{ruleToDelete.targetValue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Label:</span>
                <span className="text-slate-300 truncate max-w-[200px]">{ruleToDelete.name}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              The automated bot engine will immediately stop monitoring this rule and will no longer send notifications for this threshold.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRuleToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Delete Alert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
