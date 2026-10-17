import { RateInfo } from '../types';

interface RateCardsProps {
  rates: Record<string, RateInfo>;
  onSelectAlertCurrency: (code: string, currentRate: number) => void;
}

export function RateCards({ rates, onSelectAlertCurrency }: RateCardsProps) {
  const rateList = Object.values(rates);

  if (rateList.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 animate-pulse h-48 flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="w-20 h-4 bg-slate-800 rounded" />
              <div className="w-12 h-4 bg-slate-800 rounded" />
            </div>
            <div className="w-full h-14 bg-slate-950/80 rounded" />
            <div className="w-full h-8 bg-slate-800/60 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {rateList.map((item) => {
        const isPositive = item.change24h >= 0;
        const spread = item.parallelRate - item.officialRate;

        return (
          <div
            key={item.code}
            className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Card Header: Currency flag, code & name */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl" role="img" aria-label={item.name}>
                    {item.flag}
                  </span>
                  <div>
                    <h3 className="font-bold text-white tracking-tight flex items-center gap-1.5 text-base">
                      {item.code} <span className="text-slate-400 font-normal text-xs">/ NGN</span>
                    </h3>
                    <p className="text-xs text-slate-400">{item.name}</p>
                  </div>
                </div>

                {/* 24h Change Indicator */}
                <div
                  className={`text-right font-mono tabular-nums text-xs font-semibold ${
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  <div className="flex items-center justify-end gap-0.5">
                    <span>{isPositive ? '▲' : '▼'}</span>
                    <span>{Math.abs(item.change24h).toFixed(2)}%</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {isPositive ? '+' : ''}₦{item.changeAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Main Rates: Parallel (BDC) vs Official (NAFEM) */}
              <div className="my-4 py-3 px-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-slate-400 font-medium">Parallel (BDC):</span>
                  <span className="text-xl font-bold font-mono tabular-nums text-white">
                    ₦{item.parallelRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/50">
                  <span>Official (NAFEM):</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    ₦{item.officialRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Spread & Range Metadata (Unboxed text with dots) */}
              <div className="flex items-center justify-between text-xs text-slate-500 mb-4 font-mono tabular-nums">
                <div>
                  <span className="text-slate-400 font-sans">Spread:</span> ₦{spread.toFixed(2)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span>L: ₦{item.low24h.toLocaleString()}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>H: ₦{item.high24h.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Button */}
            <button
              onClick={() => onSelectAlertCurrency(item.code, item.parallelRate)}
              className="w-full py-2 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg transition-colors border border-slate-700/50 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Set Telegram Alert for {item.code}
            </button>
          </div>
        );
      })}
    </div>
  );
}
