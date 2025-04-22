import type { Portfolio } from "@shared/schema";

interface PortfolioSummaryProps {
  portfolio: Portfolio;
}

export default function PortfolioSummary({ portfolio }: PortfolioSummaryProps) {
  // Get NFTs count
  const nftCount = portfolio.tokens.filter(token => token.decimals === 0).length;
  // Get SPL tokens count (non-NFTs)
  const splTokenCount = portfolio.tokens.length - nftCount;
  
  // Format the wallet address for display
  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <div className="max-w-5xl mx-auto mb-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 portfolio-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold dark:text-white portfolio-header">Portfolio Summary</h2>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-300">
            Last updated: <span>{portfolio.lastUpdated}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto pb-2 portfolio-summary">
          <div className="flex flex-wrap md:flex-nowrap gap-4">
            <div className="bg-light-surface dark:bg-gray-800 rounded-lg p-4 w-full md:w-1/3 border dark:border-gray-700">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-300">Total Portfolio Value</div>
              <div className="text-2xl font-bold mt-1 dark:text-primary">
                ${portfolio.totalValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
              {/* We don't have 24h change data in this implementation */}
              <div className="text-slate-500 dark:text-slate-300 mt-1 text-sm font-medium">
                Based on current token prices
              </div>
            </div>
            
            <div className="bg-light-surface dark:bg-gray-800 rounded-lg p-4 w-full md:w-1/3 border dark:border-gray-700">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-300">Token Count</div>
              <div className="text-2xl font-bold mt-1 dark:text-primary-foreground">{portfolio.tokenCount} Tokens</div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-300 mt-1">
                <span className="text-blue-500 dark:text-blue-400">{nftCount} NFTs</span> • <span className="text-green-500 dark:text-green-400">{splTokenCount} SPL Tokens</span>
              </div>
            </div>
            
            <div className="bg-light-surface dark:bg-gray-800 rounded-lg p-4 w-full md:w-1/3 border dark:border-gray-700">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-300">Wallet Address</div>
              <div className="text-sm font-mono mt-1 truncate dark:text-white" title={portfolio.address}>
                {formatAddress(portfolio.address)}
              </div>
              <a 
                href={`https://explorer.solana.com/address/${portfolio.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-primary text-sm font-medium inline-flex items-center dark:text-blue-400 hover:underline"
              >
                <svg 
                  className="h-3 w-3 mr-1" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on Explorer
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
