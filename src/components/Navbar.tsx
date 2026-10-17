interface NavbarProps {
  activeTab: 'rates' | 'alerts' | 'telegram' | 'deploy' | 'simulator' | 'simulator-rates';
  setActiveTab: (tab: 'rates' | 'alerts' | 'telegram' | 'deploy' | 'simulator' | 'simulator-rates') => void;
  onRefreshRates: () => void;
  isRefreshing: boolean;
}

export function Navbar({ activeTab, setActiveTab, onRefreshRates, isRefreshing }: NavbarProps) {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base">
            ₦
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Yerima Naira
          </span>
        </div>

        {/* Zone 2: concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('rates')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === 'rates'
                ? 'text-white border-b-2 border-emerald-500 pb-1 -mb-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Rates & Charts
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === 'alerts'
                ? 'text-white border-b-2 border-emerald-500 pb-1 -mb-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Alert Rules & Logs
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === 'telegram'
                ? 'text-white border-b-2 border-emerald-500 pb-1 -mb-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Telegram Bot Setup
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'deploy'
                ? 'text-emerald-400 border-b-2 border-emerald-500 pb-1 -mb-1 font-semibold'
                : 'text-emerald-400/80 hover:text-emerald-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>24/7 Deploy</span>
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === 'simulator'
                ? 'text-white border-b-2 border-emerald-500 pb-1 -mb-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bot Simulator
          </button>
          <button
            onClick={() => setActiveTab('simulator-rates')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === 'simulator-rates'
                ? 'text-white border-b-2 border-emerald-500 pb-1 -mb-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Price Shock Test
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onRefreshRates}
            disabled={isRefreshing}
            className="px-4 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition-all rounded-lg whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isRefreshing ? 'Syncing...' : 'Sync Live FX'}</span>
          </button>
        </div>
      </div>

      {/* Mobile nav strip */}
      <div className="flex md:hidden overflow-x-auto px-6 py-2 border-t border-slate-800 gap-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('rates')}
          className={`whitespace-nowrap ${activeTab === 'rates' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
        >
          Rates & Charts
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`whitespace-nowrap ${activeTab === 'alerts' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
        >
          Alerts
        </button>
        <button
          onClick={() => setActiveTab('telegram')}
          className={`whitespace-nowrap ${activeTab === 'telegram' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
        >
          Telegram Bot
        </button>
        <button
          onClick={() => setActiveTab('deploy')}
          className={`whitespace-nowrap ${activeTab === 'deploy' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
        >
          🚀 24/7 Deploy
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`whitespace-nowrap ${activeTab === 'simulator' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
        >
          Simulator
        </button>
        <button
          onClick={() => setActiveTab('simulator-rates')}
          className={`whitespace-nowrap ${activeTab === 'simulator-rates' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}`}
        >
          Shock Test
        </button>
      </div>
    </header>
  );
}
