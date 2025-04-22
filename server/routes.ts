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
      
      const tokens = tokensResult.data;
      
      // If we have tokens, fetch prices from Jupiter API
      if (tokens.length > 0) {
        // Extract mint addresses
        const mintAddresses = tokens.map(token => token.mint);
        
        // Fetch prices in batches of 100
        console.log(`Fetching price data for ${mintAddresses.length} tokens`);
        const priceResults = await fetchTokenPrices(mintAddresses);
        
        if (priceResults.success) {
          const prices = priceResults.data;
          console.log(`Successfully received price data for ${Object.keys(prices).length} tokens`);
          
          // Add price data to tokens and filter low liquidity tokens
          let tokensWithPrices = 0;
          
          // Create a new filtered array of tokens
          const validTokens = tokens.filter(token => {
            // If we have price data for this token
            if (prices[token.mint]) {
              // Add price and value data
              token.price = prices[token.mint];
              token.value = token.uiBalance * token.price;
              tokensWithPrices++;
              
              // Check if this token is in the filtered list
              const isFiltered = priceResults.filteredTokens?.includes(token.mint) || false;
              
              // Skip tokens with very low liquidity (below $1000) unless they're exempted
              if (isFiltered) {
                // Only retain tokens with significant value
                if (token.value >= 10) {
                  console.log(`Including potentially low liquidity token ${token.symbol || token.mint} due to high value ($${token.value.toFixed(2)})`);
                  return true;
                }
                console.log(`Filtering out low liquidity token ${token.symbol || token.mint} with value $${token.value.toFixed(2)}`);
                return false;
              }
              
              // Log token details for tokens we're keeping
              console.log(`Token ${token.symbol || token.mint}: Price=${token.price}, Balance=${token.uiBalance}, Value=${token.value}`);
              return true;
            }
            
            // No price data, exclude from results
            return false;
          });
          
          console.log(`Added price data to ${tokensWithPrices} out of ${tokens.length} tokens`);
          console.log(`Filtered down to ${validTokens.length} valid tokens after liquidity check`);
          
          // Replace the tokens array with our filtered version
          tokens = validTokens;
        } else {
          console.log(`Failed to get price data: ${priceResults.error}`);
        }
      }
      
      // Calculate total value
      const totalValue = tokens.reduce((sum, token) => sum + (token.value || 0), 0);
      
      const portfolioData = {
        address,
        tokens,
        totalValue,
        tokenCount: tokens.length,
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
