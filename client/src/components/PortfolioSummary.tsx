import { useMemo } from "react";
import type { Portfolio } from "@shared/schema";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { format } from "date-fns";

interface PortfolioSummaryProps {
  portfolio: Portfolio;
}

interface AssetAllocation {
  name: string;
  displayName: string;
  value: number;
  valueFormatted: string;
  percentage: string;
  color: string;
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
  
  // Format the last updated timestamp
  const formattedTimestamp = useMemo(() => {
    try {
      const date = new Date(portfolio.lastUpdated);
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      return portfolio.lastUpdated; // Fallback to original format
    }
  }, [portfolio.lastUpdated]);
  
  // Prepare data for the pie chart - get top 5 tokens by value
  const pieChartData = useMemo(() => {
    const tokensByValue = [...portfolio.tokens]
      .filter(token => token.value && token.value > 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
    
    // Take top 5 tokens
    const topTokens = tokensByValue.slice(0, 5);
    
    // Calculate 'Other' category value
    const otherTokensValue = tokensByValue
      .slice(5)
      .reduce((sum, token) => sum + (token.value || 0), 0);
    
    // Create pie chart data with cleaner labels
    const chartData: AssetAllocation[] = topTokens.map((token, index) => {
      // Get a clean symbol - prefer the actual symbol, fallback to shorter options
      let symbol = token.symbol || '';
      
      // Clean up any long symbols or weird characters
      if (!symbol || symbol.length > 10 || symbol.includes('...')) {
        // Try to use token name if symbol is problematic
        if (token.name && token.name.length < 10 && !token.name.includes('...')) {
          symbol = token.name;
        } else {
          // Last resort - use a very short version of mint
          symbol = token.mint.slice(0, 4);
        }
      }
      
      return {
        name: symbol,
        displayName: symbol, // For cleaner display
        value: token.value || 0,
        valueFormatted: `$${(token.value || 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`,
        percentage: ((token.value || 0) / portfolio.totalValue * 100).toFixed(2) + '%',
        color: getChartColor(index)
      };
    });
    
    // Add 'Other' category if there are more than 5 tokens
    if (otherTokensValue > 0) {
      chartData.push({
        name: "Other",
        displayName: "Other",
        value: otherTokensValue,
        valueFormatted: `$${otherTokensValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`,
        percentage: (otherTokensValue / portfolio.totalValue * 100).toFixed(2) + '%',
        color: getChartColor(5)
      });
    }
    
    return chartData;
  }, [portfolio.tokens, portfolio.totalValue]);
  
  // Get chart colors - using colors from reference image
  function getChartColor(index: number): string {
    const colors = [
      "#c4ef65", // light green for USDC
      "#38d9e6", // light blue for SOL
      "#54c2a8", // teal for Watch
      "#5871e4", // blue for TWIN
      "#9775ea", // purple for SYBAU
      "#f8a3a3", // light pink for "Other"
    ];
    return colors[index % colors.length];
  }
  
  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-md border dark:border-gray-700">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">
            ${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {((data.value / portfolio.totalValue) * 100).toFixed(1)}% of portfolio
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto mb-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 portfolio-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold dark:text-white portfolio-header">Portfolio Summary</h2>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-300">
            Last updated: <span>{formattedTimestamp}</span>
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
          
          {/* Asset allocation pie chart */}
          {pieChartData.length > 0 && (
            <div className="mt-6">
              <div className="bg-light-surface dark:bg-gray-800 rounded-lg p-6 border dark:border-gray-700">
                <div className="flex flex-col items-center">
                  {/* Chart */}
                  <div className="w-full h-64 max-w-md mx-auto">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                          labelLine={false}
                          label={false} // Remove labels from chart directly
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={1} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend */}
                  <div className="w-full mt-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {pieChartData.map((token, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: token.color }}
                          />
                          <div className="flex gap-2 items-baseline flex-grow">
                            <span className="text-sm font-medium dark:text-white">{token.name}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">({token.valueFormatted})</span>
                          </div>
                          <div className="text-sm font-bold dark:text-white">{token.percentage}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Tab-like buttons at the bottom */}
                  <div className="mt-8 flex justify-center">
                    <div className="inline-flex rounded-md overflow-hidden border dark:border-gray-600">
                      <button className="px-4 py-2 bg-gray-700 text-white text-sm font-medium">
                        Assets
                      </button>
                      <button className="px-4 py-2 bg-transparent text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-gray-800">
                        Platforms
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
