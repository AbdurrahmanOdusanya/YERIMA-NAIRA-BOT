import { useState, useEffect } from 'react';
import { BotConfig } from '../types';
import { api } from '../services/api';

interface TelegramSetupProps {
  botConfig: BotConfig;
  onUpdateConfig: () => void;
  onOpenTma?: () => void;
}

export function TelegramSetup({ botConfig, onUpdateConfig, onOpenTma }: TelegramSetupProps) {
  const [tokenInput, setTokenInput] = useState(botConfig.botToken || '');
  const [chatIdInput, setChatIdInput] = useState(botConfig.chatId || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string; bot?: any } | null>(null);

  const [isSettingMenu, setIsSettingMenu] = useState(false);
  const [menuResult, setMenuResult] = useState<{ success: boolean; message: string } | null>(null);

  const [copiedAppUrl, setCopiedAppUrl] = useState(false);
  const [customWebAppUrl, setCustomWebAppUrl] = useState(
    botConfig.appUrl ? botConfig.appUrl.replace('?tma=true', '') : ''
  );
  const [isSavingUrl, setIsSavingUrl] = useState(false);

  const sharedPublicUrl = 'https://ais-pre-nay7legzhqu6yik4uteju3-833500938364.europe-west2.run.app';

  const webAppUrl = (customWebAppUrl || botConfig.appUrl || window.location.origin).replace('?tma=true', '') + '?tma=true';

  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isDetectingChat, setIsDetectingChat] = useState(false);
  const [detectedChats, setDetectedChats] = useState<any[]>([]);
  const [detectStatus, setDetectStatus] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);
  const [urlSaveStatus, setUrlSaveStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const [copiedCommands, setCopiedCommands] = useState(false);

  useEffect(() => {
    setTokenInput(botConfig.botToken || '');
    setChatIdInput(botConfig.chatId || '');
    if (botConfig.appUrl) {
      setCustomWebAppUrl(botConfig.appUrl.replace('?tma=true', ''));
    }
  }, [botConfig]);

  const handleVerify = async () => {
    if (!tokenInput.trim()) {
      setVerifyResult({ success: false, message: 'Please enter a Telegram Bot Token.' });
      return;
    }

    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.verifyBotToken(tokenInput.trim());
      if (res.success) {
        setVerifyResult({
          success: true,
          message: `Verified! Connected to @${res.bot?.username} (${res.bot?.first_name})`,
          bot: res.bot,
        });
        // Save config
        await api.updateBotConfig({ botToken: tokenInput.trim() });
        onUpdateConfig();
      } else {
        setVerifyResult({
          success: false,
          message: res.error || 'Failed to verify token with Telegram API.',
        });
      }
    } catch (err: any) {
      setVerifyResult({ success: false, message: 'Connection error: ' + err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveChatId = async () => {
    try {
      await api.updateBotConfig({ chatId: chatIdInput.trim() });
      onUpdateConfig();
      setTestResult({ success: true, message: 'Chat ID saved successfully!' });
      setTimeout(() => setTestResult(null), 3000);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    }
  };

  const handleSendTestMessage = async () => {
    if (!tokenInput.trim() || !chatIdInput.trim()) {
      setTestResult({ success: false, message: 'Both Bot Token and Chat ID are required to send a test alert.' });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await api.sendTestMessage({
        botToken: tokenInput.trim(),
        chatId: chatIdInput.trim(),
        message: `🚨 <b>Yerima Naira Alert Bot Test Message</b> 🚨\n\nYour exchange rate alert bot is successfully linked and active!\n\n💱 <b>Monitored Pairs:</b> USD/NGN, EUR/NGN, GBP/NGN, CAD/NGN, USDT/NGN\n⚡ <b>Latency:</b> Real-time push alerts\n\n<i>You will receive instant notifications whenever your price triggers are crossed.</i>`,
      });

      if (res.success) {
        setTestResult({ success: true, message: 'Test message delivered to your Telegram app!' });
      } else {
        setTestResult({ success: false, message: res.error || 'Failed to send message.' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: 'Error: ' + err.message });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDetectChats = async () => {
    setIsDetectingChat(true);
    setDetectStatus(null);
    try {
      const res = await api.getBotUpdates(tokenInput.trim());
      if (res.success && res.chats && res.chats.length > 0) {
        setDetectedChats(res.chats);
        // Automatically pick the latest chat ID
        const latest = res.chats[0];
        setChatIdInput(latest.chatId);
        await api.updateBotConfig({ chatId: latest.chatId });
        onUpdateConfig();
        setDetectStatus({
          type: 'success',
          message: `Detected ${res.chats.length} active chat(s)! Automatically selected Chat ID: ${latest.chatId}`,
        });
      } else {
        setDetectedChats([]);
        setDetectStatus({
          type: 'info',
          message: 'No incoming messages found yet. Please open your bot on Telegram, press Start or send /start, then click this button again!',
        });
      }
    } catch (err: any) {
      setDetectStatus({
        type: 'error',
        message: 'Failed to fetch updates: ' + err.message,
      });
    } finally {
      setIsDetectingChat(false);
    }
  };

  const botCommandsText = `rates - Check live exchange rates (USD, EUR, GBP, CAD to NGN)
usd - Check live US Dollar rate and spread
eur - Check live Euro rate
gbp - Check live British Pound rate
convert - Convert currency (e.g. /convert 100 USD)
alert - Set price alert (e.g. /alert USD 1650)
alerts - View your active rate alert rules
help - Bot manual and commands list
status - System health and last sync timestamp`;

  const handleCopyCommands = () => {
    navigator.clipboard.writeText(botCommandsText);
    setCopiedCommands(true);
    setTimeout(() => setCopiedCommands(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Telegram Bot Integration</h2>
        <p className="text-xs text-slate-400 mt-1">
          Connect your custom Telegram Bot using a Bot Token from Telegram @BotFather to receive automated exchange rate alerts.
        </p>
      </div>

      {/* Bot Credentials Form */}
      <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800">
        <h3 className="text-base font-bold text-white mb-4">Bot API Credentials</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Bot Token Input */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Telegram Bot Token
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. 7123456789:AAHkQd..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isVerifying ? 'Verifying...' : 'Verify Token'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Created via @BotFather on Telegram. Token looks like <span className="font-mono text-slate-400">123456789:ABC-DEF...</span>
            </p>

            {verifyResult && (
              <div
                className={`mt-2 p-2.5 rounded-lg text-xs font-medium ${
                  verifyResult.success
                    ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
                }`}
              >
                {verifyResult.message}
              </div>
            )}
          </div>

          {/* Telegram Chat ID Input */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Target Chat ID or Group ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                placeholder="e.g. 987654321 or -100123456789"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSaveChatId}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer whitespace-nowrap"
              >
                Save ID
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[11px]">
              <span className="text-slate-500">Your personal Telegram user ID or group chat ID.</span>
              <button
                onClick={handleDetectChats}
                disabled={isDetectingChat}
                className="text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
              >
                {isDetectingChat ? 'Scanning...' : 'Auto-Detect Chat ID'}
              </button>
            </div>
          </div>
        </div>

        {/* Detect Status Banner */}
        {detectStatus && (
          <div
            className={`p-3 mb-4 rounded-lg text-xs flex items-center justify-between ${
              detectStatus.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                : detectStatus.type === 'error'
                ? 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
                : 'bg-blue-950/60 border border-blue-500/40 text-blue-200'
            }`}
          >
            <span>{detectStatus.message}</span>
            <button
              onClick={() => setDetectStatus(null)}
              className="text-slate-400 hover:text-white font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Detected Chats List (if scanned) */}
        {detectedChats.length > 0 && (
          <div className="p-3 mb-6 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium block mb-2">Detected Telegram Interactions:</span>
            <div className="space-y-1.5">
              {detectedChats.map((chat, i) => (
                <div key={i} className="flex items-center justify-between py-1 px-2 rounded bg-slate-900 border border-slate-800/60">
                  <span className="font-mono text-slate-200">
                    {chat.title || chat.username || 'User'} (ID: {chat.chatId})
                  </span>
                  <button
                    onClick={() => {
                      setChatIdInput(chat.chatId);
                      api.updateBotConfig({ chatId: chat.chatId }).then(onUpdateConfig);
                    }}
                    className="text-emerald-400 hover:underline text-[11px]"
                  >
                    Select this Chat ID
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button: Send Test Alert */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            {botConfig.botUsername ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Linked Bot: <span className="text-white font-mono font-medium">@{botConfig.botUsername}</span>
              </span>
            ) : (
              <span className="text-slate-500">No bot token verified yet (you can also use the built-in phone simulator)</span>
            )}
          </div>

          <button
            onClick={handleSendTestMessage}
            disabled={isSendingTest}
            className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span>{isSendingTest ? 'Sending Test...' : 'Send Live Test Alert to Telegram'}</span>
          </button>
        </div>

        {testResult && (
          <div
            className={`mt-3 p-3 rounded-lg text-xs font-medium ${
              testResult.success
                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
            }`}
          >
            {testResult.message}
          </div>
        )}
      </div>

      {/* NEW: Telegram WebApp (Mini App) Configuration Card */}
      <div className="p-6 rounded-xl bg-slate-900/60 border border-emerald-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-base font-bold text-white">Telegram WebApp (Mini App) Setup</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Launch this full exchange rate interface directly inside Telegram via chat buttons or the persistent menu bar.
            </p>
          </div>

          {onOpenTma && (
            <button
              onClick={onOpenTma}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              📱 Preview Mini App View →
            </button>
          )}
        </div>

        {/* Notice explaining Google Sign-In */}
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200/90 text-xs space-y-2 mb-4">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Why did Telegram show a Google "Sign in" screen?</span>
          </div>
          <p className="leading-relaxed text-[11px] text-amber-200/80">
            The development sandbox URL (<code>ais-dev-...</code>) is a private environment protected by Google login. Because Telegram's in-app webview doesn't have your Google AI Studio browser session cookies, Google asks you to sign in.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-amber-500/20">
              <span className="font-semibold text-white block mb-0.5">💡 Solution 1: Use the Shared Public URL</span>
              <span className="text-slate-300">Click <b>"Share"</b> in the top right of Google AI Studio, then click <b>"Use Public Shared URL"</b> below to eliminate the Google login barrier!</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-amber-500/20">
              <span className="font-semibold text-white block mb-0.5">💬 Solution 2: Use Direct Bot Commands</span>
              <span className="text-slate-300">Commands like <code>/rates</code>, <code>/usd</code>, <code>/alert USD 1650</code> run inside Telegram chat messages directly with <b>zero login</b> and no browser needed!</span>
            </div>
          </div>
        </div>

        {/* WebApp URL Configuration Box */}
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Telegram WebApp Target URL</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCustomWebAppUrl(sharedPublicUrl)}
                className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
              >
                Use Public Shared URL (ais-pre)
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customWebAppUrl}
              onChange={(e) => setCustomWebAppUrl(e.target.value)}
              placeholder="e.g. https://ais-pre-...run.app or your custom domain"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={async () => {
                setIsSavingUrl(true);
                setUrlSaveStatus(null);
                try {
                  await api.updateBotConfig({ appUrl: customWebAppUrl.trim() });
                  onUpdateConfig();
                  setUrlSaveStatus({
                    type: 'success',
                    message: 'WebApp URL saved! Click "Configure Telegram Menu Button Now" below to update Telegram.',
                  });
                } catch (err: any) {
                  setUrlSaveStatus({
                    type: 'error',
                    message: 'Failed to save URL: ' + err.message,
                  });
                } finally {
                  setIsSavingUrl(false);
                }
              }}
              disabled={isSavingUrl}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {isSavingUrl ? 'Saving...' : 'Save URL'}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(webAppUrl);
                setCopiedAppUrl(true);
                setTimeout(() => setCopiedAppUrl(false), 2500);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedAppUrl ? 'Copied!' : 'Copy for BotFather'}
            </button>
          </div>

          {urlSaveStatus && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center justify-between ${
                urlSaveStatus.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
              }`}
            >
              <span>{urlSaveStatus.message}</span>
              <button
                onClick={() => setUrlSaveStatus(null)}
                className="text-slate-400 hover:text-white font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <p className="text-[10px] text-slate-500 font-mono">
            Active TMA link: {webAppUrl}
          </p>
        </div>

        {/* 1-Click Menu Button Provisioning */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                <span>⚡</span> 1-Click Bot Menu Button
              </h4>
              <p className="text-[11px] text-slate-400 mb-3">
                Automatically configures Telegram's persistent bottom-left chat menu button so every user sees <b>"📈 Yerima Naira"</b>.
              </p>
            </div>

            <button
              onClick={async () => {
                if (!tokenInput.trim()) {
                  setMenuResult({ success: false, message: 'Please enter your Bot Token first.' });
                  return;
                }
                setIsSettingMenu(true);
                setMenuResult(null);
                try {
                  const res = await api.setMenuButton({
                    botToken: tokenInput.trim(),
                    webAppUrl,
                  });
                  setMenuResult({
                    success: res.success,
                    message: res.message || res.error || (res.success ? 'Menu button configured successfully!' : 'Failed to configure menu button'),
                  });
                } catch (err: any) {
                  setMenuResult({ success: false, message: err.message });
                } finally {
                  setIsSettingMenu(false);
                }
              }}
              disabled={isSettingMenu}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSettingMenu ? 'Configuring Menu Button...' : 'Configure Telegram Menu Button Now'}
            </button>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                <span>⚙️</span> Manual BotFather Setup
              </h4>
              <p className="text-[11px] text-slate-400">
                1. In <span className="text-emerald-400 font-mono">@BotFather</span>, send <code className="text-slate-200">/setmenubutton</code><br />
                2. Select your bot<br />
                3. Paste your WebApp URL above<br />
                4. Set button text: <b>📈 Naira FX App</b>
              </p>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Or use <code className="text-slate-400">/newapp</code> to create a short link (e.g. t.me/bot/app).
            </p>
          </div>
        </div>

        {menuResult && (
          <div
            className={`mt-3 p-3 rounded-lg text-xs font-medium ${
              menuResult.success
                ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
            }`}
          >
            {menuResult.message}
          </div>
        )}
      </div>

      {/* Step-by-Step BotFather Guide */}
      <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800">
        <h3 className="text-base font-bold text-white mb-4">How to Create Your Telegram Bot (2-Minute Setup)</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center mb-2">
              1
            </div>
            <h4 className="text-xs font-bold text-white mb-1">Open @BotFather</h4>
            <p className="text-[11px] text-slate-400">
              Open your Telegram app, search for verified user <span className="text-emerald-400 font-mono">@BotFather</span> and click Start.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center mb-2">
              2
            </div>
            <h4 className="text-xs font-bold text-white mb-1">Create Bot</h4>
            <p className="text-[11px] text-slate-400">
              Send <code className="text-emerald-400 font-mono">/newbot</code>. Give it a name (e.g. <i>NairaRateBot</i>) and a username ending in <span className="font-mono text-slate-300">bot</span>.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center mb-2">
              3
            </div>
            <h4 className="text-xs font-bold text-white mb-1">Paste HTTP Token</h4>
            <p className="text-[11px] text-slate-400">
              BotFather will reply with your HTTP API token. Paste it into the form above and click <b>Verify Token</b>.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center mb-2">
              4
            </div>
            <h4 className="text-xs font-bold text-white mb-1">Send /start & Link</h4>
            <p className="text-[11px] text-slate-400">
              Search your bot on Telegram, click <b>Start</b>, then click <b>Auto-Detect Chat ID</b> above to connect!
            </p>
          </div>
        </div>

        {/* Copyable Bot Commands for BotFather Menu */}
        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold text-slate-200">Recommended BotFather Commands Configuration</h4>
              <p className="text-[11px] text-slate-400">
                In @BotFather, type <code className="text-emerald-400 font-mono">/setcommands</code>, select your bot, then paste this block:
              </p>
            </div>
            <button
              onClick={handleCopyCommands}
              className="px-3 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 cursor-pointer"
            >
              {copiedCommands ? 'Copied!' : 'Copy Commands List'}
            </button>
          </div>
          <pre className="font-mono text-[11px] text-slate-300 bg-slate-900/80 p-3 rounded border border-slate-800/60 overflow-x-auto">
            {botCommandsText}
          </pre>
        </div>
      </div>
    </div>
  );
}
