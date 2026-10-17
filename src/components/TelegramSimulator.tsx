import { useState } from 'react';
import { BotConfig, ChatMessage, RateInfo } from '../types';
import { api } from '../services/api';
import { TelegramMiniApp } from './TelegramMiniApp';

interface TelegramSimulatorProps {
  rates: Record<string, RateInfo>;
  botConfig: BotConfig;
}

function formatClickableCommands(htmlText: string): string {
  // Matches bot commands in text, e.g. /alert USD 1650, /convert 100 USD, /convert 250 EUR, /rates, /usd, etc.
  const regex = /(?<!<)\/((?:alert\s+[A-Za-z]+\s+\d+)|(?:convert\s+\d+(?:\s+[A-Za-z]+)?)|(?:convert\s+[A-Za-z]+\s+\d+)|(?:rates|usd|eur|gbp|cad|usdt|alerts|status|help|start|alert|convert))\b/gi;
  return htmlText.replace(regex, (match) => {
    return `<button type="button" data-cmd="${match}" class="inline-flex items-center text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/25 px-1 py-0.5 rounded font-mono font-medium transition-colors cursor-pointer text-xs underline decoration-sky-400/50" title="Click to run ${match}">${match}</button>`;
  });
}

export function TelegramSimulator({ rates, botConfig }: TelegramSimulatorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      sender: 'bot',
      text: `🇳🇬 <b>Welcome to Yerima Naira Alert Bot!</b> 🇳🇬\n\nI monitor real-time foreign exchange rates against the Nigerian Naira (NGN) across both Parallel (BDC) and Official (NAFEM) markets.\n\n📱 <b>Telegram Mini App Available:</b> Tap the <b>"⚡ Open Naira FX Mini App"</b> button below to launch the live interactive app directly inside Telegram!\n\n<b>Available Commands:</b>\n• /rates - View all current live FX rates\n• /usd, /eur, /gbp - Quick pair check\n• /convert 100 USD - Instant currency converter\n• /alert USD 1650 - Set instant rate alert\n• /alerts - View your active alert rules\n• /help - Detailed command manual`,
      timestamp: '10:00 AM',
      buttons: [
        [{ text: '⚡ Open Naira FX Mini App', web_app: { url: `${botConfig.appUrl || ''}?tma=true` } }],
        [{ text: '📊 /rates', callback_data: '/rates' }, { text: '💵 /usd', callback_data: '/usd' }],
        [{ text: '🧮 /convert 100 USD', callback_data: '/convert 100 USD' }, { text: '🔔 /alert USD 1650', callback_data: '/alert USD 1650' }],
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMiniAppOpen, setIsMiniAppOpen] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const res = await api.simulateBotCommand(text.trim());
      const botMsg: ChatMessage = {
        id: 'msg-bot-' + Date.now(),
        sender: 'bot',
        text: res.replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        buttons: res.buttons,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const botError: ChatMessage = {
        id: 'msg-bot-' + Date.now(),
        sender: 'bot',
        text: '❌ Error processing command: ' + err.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botError]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage(inputValue);
    }
  };

  const handleResetChat = () => {
    setIsMiniAppOpen(false);
    sendMessage('/start');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Explanatory & Command shortcuts */}
      <div className="lg:col-span-5 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Interactive Telegram Simulator</h2>
          <p className="text-xs text-slate-400 mt-1">
            Test both the bot messaging commands and the new <b>Telegram WebApp (Mini App)</b> experience directly in this phone frame.
          </p>
        </div>

        {/* WebApp Launch Promo Box */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📱</span>
            <h3 className="text-xs font-bold text-white">Telegram Mini App Enabled</h3>
          </div>
          <p className="text-[11px] text-slate-300">
            Telegram bots can launch web interfaces right inside the app. Tap the button below or the <b>"Menu"</b> button in the phone to open the Mini App.
          </p>
          <button
            onClick={() => setIsMiniAppOpen(!isMiniAppOpen)}
            className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isMiniAppOpen ? 'Back to Chat View' : '⚡ Open Telegram Mini App Inside Phone'}
          </button>
        </div>

        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Quick Command Actions
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Click any command below to test how the bot responds in real-time:
          </p>

          <div className="flex flex-wrap gap-2">
            {[
              { label: '📊 /rates', cmd: '/rates' },
              { label: '💵 /usd', cmd: '/usd' },
              { label: '💶 /eur', cmd: '/eur' },
              { label: '💷 /gbp', cmd: '/gbp' },
              { label: '🧮 /convert 100 USD', cmd: '/convert 100 USD' },
              { label: '🔔 /alert USD 1650', cmd: '/alert USD 1650' },
              { label: '📋 /alerts', cmd: '/alerts' },
              { label: '🟢 /status', cmd: '/status' },
              { label: '📖 /help', cmd: '/help' },
            ].map((btn) => (
              <button
                key={btn.cmd}
                onClick={() => {
                  setIsMiniAppOpen(false);
                  sendMessage(btn.cmd);
                }}
                className="px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Telegram Phone Device Mockup */}
      <div className="lg:col-span-7 flex justify-center">
        <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[660px] relative">
          {/* Phone Header / Telegram Titlebar */}
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-base">
                ₦
              </div>
              <div>
                <h4 className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
                  Yerima Naira Bot
                  <span className="text-[10px] text-emerald-400 font-normal">bot</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isMiniAppOpen ? 'Mini App Active' : isTyping ? 'typing...' : 'bot · verified'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isMiniAppOpen ? (
                <button
                  onClick={() => setIsMiniAppOpen(false)}
                  className="text-xs text-emerald-400 font-medium px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
                >
                  ✕ Close App
                </button>
              ) : (
                <button
                  onClick={handleResetChat}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800/80 cursor-pointer"
                  title="Reset conversation"
                >
                  /start
                </button>
              )}
            </div>
          </div>

          {/* Conditional: Mini App view or Chat view */}
          {isMiniAppOpen ? (
            <div className="flex-1 overflow-y-auto bg-[#0E1621]">
              <TelegramMiniApp
                rates={rates}
                botConfig={botConfig}
                onExitTma={() => setIsMiniAppOpen(false)}
              />
            </div>
          ) : (
            <>
              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/80">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-xs'
                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs'
                      }`}
                    >
                      {/* Message formatted content with clickable commands */}
                      <div
                        className="leading-relaxed whitespace-pre-wrap break-words"
                        onClick={(e) => {
                          const target = (e.target as HTMLElement).closest('[data-cmd]');
                          if (target) {
                            const cmd = target.getAttribute('data-cmd');
                            if (cmd) {
                              sendMessage(cmd);
                            }
                          }
                        }}
                        dangerouslySetInnerHTML={{ __html: formatClickableCommands(msg.text) }}
                      />

                      {/* Inline Keyboards / Buttons (if bot returned buttons) */}
                      {msg.buttons && msg.buttons.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-800/60 space-y-1.5">
                          {msg.buttons.map((row, rIdx) => (
                            <div key={rIdx} className="flex gap-1.5">
                              {row.map((btn, bIdx) => (
                                <button
                                  key={bIdx}
                                  onClick={() => {
                                    if (btn.web_app || btn.text.includes('Mini App')) {
                                      setIsMiniAppOpen(true);
                                    } else if (btn.callback_data) {
                                      sendMessage(btn.callback_data);
                                    }
                                  }}
                                  className={`flex-1 py-1.5 px-2 text-[11px] font-semibold rounded border transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                                    btn.web_app || btn.text.includes('Mini App')
                                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 shadow-xs'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/80'
                                  }`}
                                >
                                  {btn.text}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}

                      <span
                        className={`block text-[10px] mt-1 text-right font-mono tabular-nums ${
                          msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-500'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs pl-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse delay-200" />
                    <span className="text-[11px] text-slate-500 ml-1">Bot is preparing rates...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar with Telegram Menu Button */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                {/* Persistent Menu Button (triggers Mini App) */}
                <button
                  onClick={() => setIsMiniAppOpen(true)}
                  className="px-2.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-bold border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  title="Telegram WebApp Menu Button"
                >
                  <span>⚡</span>
                  <span className="hidden sm:inline">Menu</span>
                </button>

                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type /rates or message..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim()}
                  className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
