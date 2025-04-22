import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSolanaTokens } from "./services/solana";
import { fetchTokenPrices } from "./services/jupiter";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint to get portfolio data for a wallet
  app.get("/api/portfolio/:address", async (req, res) => {
    try {
      const { address } = req.params;
      
      // Validate address format
      const addressPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      if (!addressPattern.test(address)) {
        return res.status(400).json({ 
          message: "Invalid Solana wallet address format"
        });
      }
      
      // Fetch token data from Solana
      const tokensResult = await getSolanaTokens(address);
      
      if (!tokensResult.success) {
        return res.status(400).json({ 
          message: tokensResult.error || "Failed to retrieve token data from Solana"
        });
      }
      
      // Initial token data
      const initialTokens = tokensResult.data;
      let filteredTokens = initialTokens;
      let totalValue = 0;
      
      // If we have tokens, fetch prices from Jupiter API
      if (initialTokens.length > 0) {
        // Extract mint addresses
        const mintAddresses = initialTokens.map(token => token.mint);
        
        // Fetch prices in batches of 100
        console.log(`Fetching price data for ${mintAddresses.length} tokens`);
        const priceResults = await fetchTokenPrices(mintAddresses);
        
        if (priceResults.success) {
          const prices = priceResults.data;
          console.log(`Successfully received price data for ${Object.keys(prices).length} tokens`);
          
          // Process tokens with prices and apply filtering
          let tokensWithPrices = 0;
          const validTokens: typeof initialTokens = [];
          
          // Process each token
          for (const token of initialTokens) {
            if (prices[token.mint]) {
              // Add price and value data
              token.price = prices[token.mint];
              token.value = token.uiBalance * token.price;
              tokensWithPrices++;
              
              // Check if this token is in the filtered list
              const isFiltered = priceResults.filteredTokens?.includes(token.mint) || false;
              
              // Skip tokens with very low liquidity (below $1000) unless they have significant value
              if (isFiltered && token.value < 10) {
                console.log(`Filtering out low liquidity token ${token.symbol || token.mint} with value $${token.value.toFixed(2)}`);
                continue;
              }
              
              if (isFiltered) {
                console.log(`Including potentially low liquidity token ${token.symbol || token.mint} due to high value ($${token.value.toFixed(2)})`);
              } else {
                console.log(`Token ${token.symbol || token.mint}: Price=${token.price}, Balance=${token.uiBalance}, Value=${token.value}`);
              }
              
              // Add to filtered list
              validTokens.push(token);
            }
          }
          
          console.log(`Added price data to ${tokensWithPrices} out of ${initialTokens.length} tokens`);
          console.log(`Filtered down to ${validTokens.length} valid tokens after liquidity check`);
          
          // Use the filtered tokens for the result
          filteredTokens = validTokens;
          
          // Calculate total value
          totalValue = validTokens.reduce((sum, token) => sum + (token.value || 0), 0);
        } else {
          console.log(`Failed to get price data: ${priceResults.error}`);
          
          // If no price data, just calculate total based on the original tokens
          totalValue = initialTokens.reduce((sum, token) => sum + (token.value || 0), 0);
        }
      }
      
      const portfolioData = {
        address,
        tokens: filteredTokens,
        totalValue,
        tokenCount: filteredTokens.length,
        lastUpdated: new Date().toLocaleString(),
      };
      
      return res.json(portfolioData);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "Internal server error" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
