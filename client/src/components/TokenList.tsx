import { useState, useMemo } from "react";
import type { Portfolio, Token } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface TokenListProps {
  portfolio: Portfolio;
}

type SortDirection = "asc" | "desc";
type SortField = "value" | "name" | "balance";

export default function TokenList({ portfolio }: TokenListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tokenType, setTokenType] = useState<"all" | "spl" | "nft">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc"); // Default to highest value first
  const itemsPerPage = 10; // Increased from 5 to show more tokens
  const { toast } = useToast(); // For showing copy notifications

  // Filter tokens based on search query and token type
  const filteredTokens = useMemo(() => {
    return portfolio.tokens.filter(token => {
      const matchesSearch = 
        !searchQuery || 
        token.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        token.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.mint.toLowerCase().includes(searchQuery.toLowerCase());
        
      if (tokenType === "all") return matchesSearch;
      if (tokenType === "nft") return matchesSearch && token.decimals === 0;
      if (tokenType === "spl") return matchesSearch && token.decimals > 0;
      
      return matchesSearch;
    });
  }, [portfolio.tokens, searchQuery, tokenType]);

  // Sort tokens based on current sort field and direction
  const sortedTokens = useMemo(() => {
    return [...filteredTokens].sort((a, b) => {
      if (sortField === "value") {
        const aValue = a.value || 0;
        const bValue = b.value || 0;
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      if (sortField === "name") {
        const aName = a.name || a.symbol || a.mint;
        const bName = b.name || b.symbol || b.mint;
        return sortDirection === "asc" 
          ? aName.localeCompare(bName) 
          : bName.localeCompare(aName);
      }
      
      if (sortField === "balance") {
        return sortDirection === "asc" 
          ? a.uiBalance - b.uiBalance 
          : b.uiBalance - a.uiBalance;
      }
      
      return 0;
    });
  }, [filteredTokens, sortField, sortDirection]);

  // Paginate tokens
  const totalPages = Math.ceil(sortedTokens.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTokens = sortedTokens.slice(startIndex, startIndex + itemsPerPage);
  
  // Toggle sort direction or set a new sort field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort direction if clicking the same field
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to descending for value, ascending for others
      setSortField(field);
      setSortDirection(field === "value" ? "desc" : "asc");
    }
    // Reset to first page when changing sort
    setCurrentPage(1);
  };

  // Copy token address to clipboard
  const copyTokenAddress = (token: Token) => {
    navigator.clipboard.writeText(token.mint)
      .then(() => {
        toast({
          title: "Address copied!",
          description: `${token.symbol || token.name || 'Token'} address copied to clipboard`,
          duration: 3000,
        });
      })
      .catch(err => {
        console.error("Failed to copy address:", err);
        toast({
          title: "Copy failed",
          description: "Could not copy token address to clipboard",
          variant: "destructive",
          duration: 3000,
        });
      });
  };

  // Generate random gradient colors for tokens without symbols
  const getTokenColor = (index: number, symbol?: string) => {
    if (symbol) {
      // If we have a symbol, use a deterministic color based on it
      const charCodeSum = symbol.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const hue = charCodeSum % 360;
      return `from-[hsl(${hue},70%,50%)] to-[hsl(${(hue + 40) % 360},70%,50%)]`;
    }
    
    // Otherwise use index-based colors
    const colorPairs = [
      "from-blue-500 to-purple-500",
      "from-green-500 to-teal-500",
      "from-orange-500 to-red-500",
      "from-indigo-500 to-purple-500",
      "from-yellow-500 to-orange-500",
      "from-pink-500 to-rose-500",
    ];
    
    return colorPairs[index % colorPairs.length];
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 portfolio-card">
        <div className="flex justify-between items-center mb-4 flex-col md:flex-row gap-3">
          <h2 className="text-xl font-semibold portfolio-header dark:text-white">Token Holdings</h2>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <Input
                type="text"
                className="pl-8 pr-3 py-1.5 text-sm w-full md:w-60 dark:bg-gray-800 dark:text-white"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
              />
              <div className="absolute left-2.5 top-2 text-slate-400">
                <svg 
                  className="h-4 w-4" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <Select
              value={tokenType}
              onValueChange={(value: string) => {
                setTokenType(value as "all" | "spl" | "nft");
                setCurrentPage(1); // Reset to first page on filter change
              }}
            >
              <SelectTrigger className="py-1.5 px-3 text-sm h-9 w-[120px] dark:bg-gray-800 dark:text-white">
                <SelectValue placeholder="All Tokens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tokens</SelectItem>
                <SelectItem value="spl">SPL Tokens</SelectItem>
                <SelectItem value="nft">NFTs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full token-list-table">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="pb-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider w-12">#</th>
                <th 
                  className="pb-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider sortable-column"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Token
                    <span className={`sort-icon ml-1 ${sortField === "name" ? (sortDirection === "asc" ? "text-primary" : "text-primary") : "opacity-0"}`}>
                      {sortField === "name" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${sortDirection === "asc" ? "" : "transform rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </span>
                  </div>
                </th>
                <th 
                  className="pb-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider sortable-column"
                  onClick={() => handleSort("balance")}
                >
                  <div className="flex items-center justify-end">
                    Balance
                    <span className={`sort-icon ml-1 ${sortField === "balance" ? (sortDirection === "asc" ? "text-primary" : "text-primary") : "opacity-0"}`}>
                      {sortField === "balance" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${sortDirection === "asc" ? "" : "transform rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </span>
                  </div>
                </th>
                <th className="pb-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Price
                </th>
                <th 
                  className="pb-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider sortable-column"
                  onClick={() => handleSort("value")}
                >
                  <div className="flex items-center justify-end">
                    Value
                    <span className={`sort-icon ml-1 ${sortField === "value" ? (sortDirection === "asc" ? "text-primary" : "text-primary") : "opacity-0"}`}>
                      {sortField === "value" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${sortDirection === "asc" ? "" : "transform rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedTokens.length > 0 ? (
                paginatedTokens.map((token, index) => (
                  <tr key={token.mint} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-4 text-sm text-slate-500 dark:text-slate-300">{startIndex + index + 1}</td>
                    <td className="py-4">
                      <div className="flex items-center">
                        {token.icon ? (
                          <img 
                            src={token.icon} 
                            alt={token.symbol || "token"} 
                            className="h-8 w-8 rounded-full mr-3 object-cover bg-slate-100 dark:bg-slate-800"
                            onError={(e) => {
                              // If image fails to load, fall back to the gradient background with symbol
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              
                              // Get the next element and ensure it's an HTMLElement before accessing style
                              const nextElement = target.nextElementSibling;
                              if (nextElement && nextElement instanceof HTMLElement) {
                                nextElement.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        
                        {/* Fallback for when icon is not available or fails to load */}
                        <div 
                          className={`h-8 w-8 rounded-full bg-gradient-to-r ${getTokenColor(index, token.symbol)} 
                                    flex items-center justify-center text-white mr-3
                                    ${token.icon ? 'hidden' : ''}`}
                        >
                          {token.symbol?.slice(0, 3) || "???"}
                        </div>
                        
                        <div>
                          <div 
                            className="font-medium dark:text-white token-symbol cursor-pointer hover:text-primary hover:underline flex items-center"
                            onClick={() => copyTokenAddress(token)}
                            title={`Click to copy ${token.mint}`}
                          >
                            {token.name || 
                             (token.symbol ? `${token.symbol} Token` : `Token ${token.mint.slice(0, 8)}...`)}
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="14" 
                              height="14" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              className="ml-1 opacity-50 hover:opacity-100"
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-300 font-mono">
                            {token.symbol || 
                             (token.mint.length > 10 ? `${token.mint.slice(0, 6)}...${token.mint.slice(-4)}` : token.mint)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-right font-mono dark:text-slate-300 token-amount">
                      <div className="font-medium">{token.uiBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: token.decimals > 6 ? 4 : 2
                      })}</div>
                      {token.price && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          ≈ ${(token.uiBalance * (token.price || 0)).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-right dark:text-slate-300">
                      {token.price ? (
                        <div className="font-medium">${token.price.toLocaleString(undefined, {
                          minimumFractionDigits: token.price < 0.01 ? 6 : 2,
                          maximumFractionDigits: token.price < 0.01 ? 6 : 2
                        })}</div>
                      ) : (
                        <div className="text-xs text-slate-500 dark:text-slate-400">No price data</div>
                      )}
                      {token.change24h && (
                        <div className={`text-xs ${token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(1)}% (24h)
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-right font-medium dark:text-primary token-value">
                      {token.value ? (
                        `$${token.value.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}`
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-300">
                    No tokens found matching your search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {filteredTokens.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Showing <span className="font-medium">{Math.min(filteredTokens.length, itemsPerPage)}</span> of <span className="font-medium">{filteredTokens.length}</span> tokens
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button 
                  className="px-3 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  <svg 
                    className="h-4 w-4" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`px-3 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 ${
                      currentPage === page 
                        ? 'text-slate-700 dark:text-slate-200 border-primary' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                
                <button 
                  className="px-3 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  <svg 
                    className="h-4 w-4" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
