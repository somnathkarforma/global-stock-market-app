import React from 'react';
import { Stock } from '../data/mockData';
import { StockCard } from './StockCard';
import { PriceUpdate } from '../hooks/useLivePrices';

interface Props {
  stocks: Stock[];
  lastUpdated: Map<string, PriceUpdate>;
  watchlist: string[];
  onToggleWatch: (symbol: string) => void;
  onSelectStock: (stock: Stock) => void;
}

export const StockGrid: React.FC<Props> = ({
  stocks,
  lastUpdated,
  watchlist,
  onToggleWatch,
  onSelectStock,
}) => {
  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-slate-500 text-sm">No stocks match the current filters.</p>
        <p className="text-slate-600 text-xs mt-1">Try selecting a different exchange or clearing the watchlist filter.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {stocks.map(stock => (
        <StockCard
          key={stock.symbol}
          stock={stock}
          update={lastUpdated.get(stock.symbol)}
          isWatched={watchlist.includes(stock.symbol)}
          onToggleWatch={onToggleWatch}
          onClick={onSelectStock}
        />
      ))}
    </div>
  );
};
