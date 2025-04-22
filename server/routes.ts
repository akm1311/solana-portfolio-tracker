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
        const priceResults = await fetchTokenPrices(mintAddresses);
        
        if (priceResults.success) {
          const prices = priceResults.data;
          
          // Add price data to tokens
          tokens.forEach(token => {
            if (prices[token.mint]) {
              token.price = prices[token.mint];
              token.value = token.uiBalance * token.price;
            }
          });
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
