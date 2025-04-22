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
      
      let tokens = tokensResult.data;
      let filteredTokensCount = 0;
      
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
          
          // Add price data to tokens
          let tokensWithPrices = 0;
          tokens.forEach(token => {
            if (prices[token.mint]) {
              token.price = prices[token.mint];
              token.value = token.uiBalance * token.price;
              tokensWithPrices++;
              console.log(`Token ${token.symbol || token.mint}: Price=${token.price}, Balance=${token.uiBalance}, Value=${token.value}`);
            }
          });
          console.log(`Added price data to ${tokensWithPrices} out of ${tokens.length} tokens`);
          
          // Filter out tokens with organicScore = 0 (filtered tokens)
          if (priceResults.filteredTokens && priceResults.filteredTokens.length > 0) {
            console.log(`Filtering out ${priceResults.filteredTokens.length} low-quality tokens`);
            filteredTokensCount = priceResults.filteredTokens.length;
            
            // Create a Set for O(1) lookups
            const filteredTokensSet = new Set(priceResults.filteredTokens);
            
            // Filter the tokens array to remove low-quality tokens
            tokens = tokens.filter(token => {
              // Skip tokens without a mint for safety
              if (!token.mint) return false;
              
              // Keep tokens that aren't in the filtered list
              if (!filteredTokensSet.has(token.mint)) return true;
              
              // Filter out tokens with organicScore = 0
              console.log(`Filtering out token: ${token.symbol || token.mint}`);
              return false;
            });
            
            console.log(`After filtering: ${tokens.length} tokens remaining`);
          }
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
        // Add detail about filtered tokens
        filteredTokensCount
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
