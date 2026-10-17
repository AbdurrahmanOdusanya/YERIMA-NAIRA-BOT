import { useState } from 'react';
import { BotConfig } from '../types';

interface DeploymentGuideProps {
  botConfig: BotConfig;
  onOpenTelegramSetup: () => void;
}

export function DeploymentGuide({ botConfig, onOpenTelegramSetup }: DeploymentGuideProps) {
  const [activePlatform, setActivePlatform] = useState<'render' | 'railway' | 'vps' | 'docker' | 'pm2'>('render');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const envString = `TELEGRAM_BOT_TOKEN="${botConfig.botToken || 'YOUR_BOT_TOKEN_FROM_BOTFATHER'}"\nTELEGRAM_CHAT_ID="${botConfig.chatId || 'YOUR_CHAT_ID'}"\nNODE_ENV="production"\nPORT="3000"`;

  return (
    <div className="space-y-8">
      {/* Top Banner: Status & Mini App Pause Notice */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              24/7 Always-On Deployment Center
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Deploy Your Exchange Rate Bot for 24/7 Continuous Uptime
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl">
            AI Studio preview windows sleep when idle. To receive Telegram alerts when prices shift while your computer is asleep or offline, deploy this bot to a continuous cloud host.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <button
            onClick={onOpenTelegramSetup}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            {botConfig.botToken ? '✓ Bot Token Configured' : 'Configure Bot Token'}
          </button>
          <button
            onClick={() => copyToClipboard(envString, 'all-env')}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            {copiedKey === 'all-env' ? '✓ Copied .env Variables' : '📋 Copy Deployment .env'}
          </button>
        </div>
      </div>

      {/* Two Deployment Modes Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
              Option 1: Recommended For Most Users
            </span>
            <span className="text-xs text-slate-400 font-mono">npm run bot</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Dedicated 24/7 Bot Daemon (Ultra-Light)</h3>
            <p className="text-xs text-slate-400 mt-1">
              Runs purely the Telegram Bot long-polling engine and 60-second rate monitor. Uses under 35MB of RAM and requires zero web server configuration.
            </p>
          </div>
          <div className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 border border-slate-800/80 flex items-center justify-between">
            <code>npm run bot</code>
            <button
              onClick={() => copyToClipboard('npm run bot', 'cmd-bot')}
              className="text-emerald-400 hover:text-emerald-300 text-[11px] cursor-pointer"
            >
              {copiedKey === 'cmd-bot' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/60">
              Option 2: Full Web App + Bot
            </span>
            <span className="text-xs text-slate-400 font-mono">npm start</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Full-Stack Server + Web Dashboard</h3>
            <p className="text-xs text-slate-400 mt-1">
              Hosts both the interactive Yerima Naira web dashboard and the background 24/7 automated alert bot engine together on port 3000.
            </p>
          </div>
          <div className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 border border-slate-800/80 flex items-center justify-between">
            <code>npm run build && npm start</code>
            <button
              onClick={() => copyToClipboard('npm run build && npm start', 'cmd-start')}
              className="text-sky-400 hover:text-sky-300 text-[11px] cursor-pointer"
            >
              {copiedKey === 'cmd-start' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Cloud Platform Selector Tabs */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
        <div className="border-b border-slate-800 bg-slate-950/60 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-white">Choose Your 24/7 Hosting Platform:</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'render', label: 'Render.com (Free Tier)' },
              { id: 'railway', label: 'Railway.app' },
              { id: 'vps', label: 'Linux VPS / Ubuntu' },
              { id: 'docker', label: 'Docker' },
              { id: 'pm2', label: 'Local PM2 / PC' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePlatform(p.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activePlatform === p.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-750 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {/* TAB 1: RENDER.COM */}
          {activePlatform === 'render' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-white">Deploy on Render.com (Free / Easy)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Render provides free web hosting and background worker support. We have already generated a <code className="text-emerald-400">render.yaml</code> blueprint in your codebase.
                  </p>
                </div>
                <a
                  href="https://dashboard.render.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium border border-slate-700 transition-colors shrink-0"
                >
                  Open Render Dashboard ↗
                </a>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Push project code to GitHub</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Ensure your files including <code className="text-slate-300">bot.ts</code>, <code className="text-slate-300">server.ts</code>, and <code className="text-slate-300">render.yaml</code> are in your GitHub repository.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Create a New Web Service on Render</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Connect your GitHub repo, select <strong>Node</strong> runtime, and set:
                    </p>
                    <div className="mt-2 bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 border border-slate-800 space-y-1">
                      <div><span className="text-slate-500">Build Command:</span> npm install && npm run build</div>
                      <div><span className="text-slate-500">Start Command:</span> npm start</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="w-full">
                    <p className="text-sm font-semibold text-slate-200">Add Environment Variables on Render</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      In the Render dashboard under <strong>Environment</strong>, add these two variables:
                    </p>
                    <div className="mt-2 bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-emerald-400 font-bold">TELEGRAM_BOT_TOKEN</span>
                        <span className="text-slate-300 truncate max-w-xs">{botConfig.botToken || 'YOUR_BOT_TOKEN'}</span>
                        <button
                          onClick={() => copyToClipboard(botConfig.botToken || '', 'tok')}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedKey === 'tok' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono border-t border-slate-800 pt-2">
                        <span className="text-emerald-400 font-bold">TELEGRAM_CHAT_ID</span>
                        <span className="text-slate-300 truncate max-w-xs">{botConfig.chatId || 'YOUR_CHAT_ID'}</span>
                        <button
                          onClick={() => copyToClipboard(botConfig.chatId || '', 'cid')}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedKey === 'cid' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Deploy!</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Click <strong>Create Web Service</strong>. Render will build and start your application. The Telegram bot and rate checking daemon will now run 24/7 without stopping!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RAILWAY */}
          {activePlatform === 'railway' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white">Deploy on Railway.app (2-Minute Setup)</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Railway detects Node.js projects automatically and provides persistent 24/7 uptime without sleep intervals.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Go to Railway.app and create a new project</p>
                    <p className="text-xs text-slate-400 mt-0.5">Select <strong>Deploy from GitHub repo</strong> and choose your repository.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="w-full">
                    <p className="text-sm font-semibold text-slate-200">Add Variables in Railway</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click <strong>Variables</strong> and click <strong>RAW Editor</strong>, then paste:</p>
                    <div className="mt-2 bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 border border-slate-800 flex items-center justify-between">
                      <pre className="overflow-x-auto">{envString}</pre>
                      <button
                        onClick={() => copyToClipboard(envString, 'railway-env')}
                        className="text-emerald-400 hover:text-emerald-300 text-xs ml-4 shrink-0"
                      >
                        {copiedKey === 'railway-env' ? 'Copied!' : 'Copy RAW'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Finished!</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Railway will deploy and keep the bot active continuously. You will immediately be able to message your bot on Telegram.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LINUX VPS */}
          {activePlatform === 'vps' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white">Deploy on Linux VPS (Ubuntu / Debian / DigitalOcean)</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Using systemd ensures the bot automatically restarts on failure and on server reboot for 100% reliability.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-1">Step 1: Install Node.js & Clone Code on Server</p>
                  <div className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 border border-slate-800 flex items-center justify-between">
                    <code>git clone &lt;YOUR_REPO_URL&gt; /var/www/yerima-naira-bot && cd /var/www/yerima-naira-bot && npm install</code>
                    <button
                      onClick={() => copyToClipboard('git clone <YOUR_REPO_URL> /var/www/yerima-naira-bot && cd /var/www/yerima-naira-bot && npm install', 'vps-1')}
                      className="text-emerald-400 hover:text-emerald-300 text-[11px]"
                    >
                      {copiedKey === 'vps-1' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-1">Step 2: Create .env Configuration</p>
                  <div className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 border border-slate-800 flex items-center justify-between">
                    <code>cat &lt;&lt; 'EOF' &gt; /var/www/yerima-naira-bot/.env{'\n'}{envString}{'\n'}EOF</code>
                    <button
                      onClick={() => copyToClipboard(`cat << 'EOF' > /var/www/yerima-naira-bot/.env\n${envString}\nEOF`, 'vps-2')}
                      className="text-emerald-400 hover:text-emerald-300 text-[11px]"
                    >
                      {copiedKey === 'vps-2' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-1">Step 3: Enable Systemd Service for 24/7 Autostart</p>
                  <div className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 border border-slate-800 flex items-center justify-between">
                    <code>sudo cp systemd/yerima-naira-bot.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now yerima-naira-bot</code>
                    <button
                      onClick={() => copyToClipboard('sudo cp systemd/yerima-naira-bot.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now yerima-naira-bot', 'vps-3')}
                      className="text-emerald-400 hover:text-emerald-300 text-[11px]"
                    >
                      {copiedKey === 'vps-3' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-300 mb-1">Check Live Logs</p>
                  <div className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-400 border border-slate-800 flex items-center justify-between">
                    <code>journalctl -u yerima-naira-bot -f</code>
                    <button
                      onClick={() => copyToClipboard('journalctl -u yerima-naira-bot -f', 'vps-4')}
                      className="text-emerald-400 hover:text-emerald-300 text-[11px]"
                    >
                      {copiedKey === 'vps-4' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOCKER */}
          {activePlatform === 'docker' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white">Deploy with Docker / Docker Compose</h4>
                <p className="text-xs text-slate-400 mt-1">
                  We have included a production multi-stage <code className="text-emerald-400">Dockerfile</code> and <code className="text-emerald-400">docker-compose.yml</code>.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300">Run with Docker Compose:</p>
                <div className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 border border-slate-800 flex items-center justify-between">
                  <code>docker-compose up -d --build</code>
                  <button
                    onClick={() => copyToClipboard('docker-compose up -d --build', 'doc-1')}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px]"
                  >
                    {copiedKey === 'doc-1' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <p className="text-xs text-slate-300 mt-4">Or run standalone container directly:</p>
                <div className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 border border-slate-800 flex items-center justify-between">
                  <code>docker run -d --restart=always --name yerima-naira-bot -e TELEGRAM_BOT_TOKEN="{botConfig.botToken || 'TOKEN'}" -e TELEGRAM_CHAT_ID="{botConfig.chatId || 'CHAT_ID'}" yerima-naira</code>
                  <button
                    onClick={() => copyToClipboard(`docker run -d --restart=always --name yerima-naira-bot -e TELEGRAM_BOT_TOKEN="${botConfig.botToken || 'TOKEN'}" -e TELEGRAM_CHAT_ID="${botConfig.chatId || 'CHAT_ID'}" yerima-naira`, 'doc-2')}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px]"
                  >
                    {copiedKey === 'doc-2' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PM2 */}
          {activePlatform === 'pm2' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-base font-bold text-white">Run 24/7 Locally or On Server with PM2</h4>
                <p className="text-xs text-slate-400 mt-1">
                  PM2 is an industry standard process manager that keeps Node.js applications alive in the background and restarts them on reboot.
                </p>
              </div>

              <div className="space-y-3">
                <div className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 border border-slate-800 flex items-center justify-between">
                  <code>npm install -g pm2 tsx</code>
                  <button
                    onClick={() => copyToClipboard('npm install -g pm2 tsx', 'pm2-1')}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px]"
                  >
                    {copiedKey === 'pm2-1' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <p className="text-xs text-slate-300 mt-2">Start the 24/7 bot daemon in background:</p>
                <div className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 border border-slate-800 flex items-center justify-between">
                  <code>pm2 start bot.ts --name "yerima-naira-bot" --interpreter tsx</code>
                  <button
                    onClick={() => copyToClipboard('pm2 start bot.ts --name "yerima-naira-bot" --interpreter tsx', 'pm2-2')}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px]"
                  >
                    {copiedKey === 'pm2-2' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <p className="text-xs text-slate-300 mt-2">Save PM2 state so it restarts on computer startup:</p>
                <div className="bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 border border-slate-800 flex items-center justify-between">
                  <code>pm2 save && pm2 startup</code>
                  <button
                    onClick={() => copyToClipboard('pm2 save && pm2 startup', 'pm2-3')}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px]"
                  >
                    {copiedKey === 'pm2-3' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verification Checklist */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Pre-Flight Deployment Checklist
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${botConfig.botToken ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-xs font-semibold text-slate-200">1. Telegram Bot Token</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {botConfig.botToken ? 'Configured in app' : 'Get from @BotFather on Telegram'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${botConfig.chatId ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-xs font-semibold text-slate-200">2. Target Chat ID</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {botConfig.chatId ? `Connected (${botConfig.chatId})` : 'Auto-detected when you send /start'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">3. 60s Monitoring Loop</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Pre-configured in bot.ts & server.ts for live Naira alerts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
