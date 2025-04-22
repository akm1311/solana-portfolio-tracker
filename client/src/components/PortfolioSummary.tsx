import { useMemo } from "react";
import type { Portfolio } from "@shared/schema";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { format } from "date-fns";

interface PortfolioSummaryProps {
  portfolio: Portfolio;
}

interface AssetAllocation {
  name: string;
  value: number;
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
    
    // Create pie chart data
    const chartData: AssetAllocation[] = topTokens.map((token, index) => ({
      name: token.symbol || token.name || `Token ${token.mint.slice(0, 6)}...`,
      value: token.value || 0,
      color: getChartColor(index)
    }));
    
    // Add 'Other' category if there are more than 5 tokens
    if (otherTokensValue > 0) {
      chartData.push({
        name: "Other",
        value: otherTokensValue,
        color: getChartColor(5)
      });
    }
    
    return chartData;
  }, [portfolio.tokens]);
  
  // Get chart colors
  function getChartColor(index: number): string {
    const colors = [
      "#3b82f6", // blue-500
      "#10b981", // emerald-500
      "#f59e0b", // amber-500
      "#8b5cf6", // violet-500
      "#ec4899", // pink-500
      "#6b7280", // gray-500
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
              <h3 className="text-lg font-medium mb-4 dark:text-white">Asset Allocation</h3>
              <div className="bg-light-surface dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
                <div className="flex flex-col md:flex-row items-center">
                  <div className="w-full md:w-1/2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={50}
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="w-full md:w-1/2 pl-0 md:pl-6 mt-4 md:mt-0">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Top Holdings</h4>
                    <div className="space-y-2">
                      {pieChartData.map((token, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: token.color }}
                            ></div>
                            <span className="text-sm font-medium dark:text-slate-200">{token.name}</span>
                          </div>
                          <div className="text-sm dark:text-slate-300">
                            ${token.value.toLocaleString(undefined, { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total:</span>
                        <span className="text-sm font-bold dark:text-primary">
                          ${portfolio.totalValue.toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </span>
                      </div>
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
