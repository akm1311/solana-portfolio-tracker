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
        
        // First pass: Get all prices to determine token values
        console.log(`Fetching price data for ${mintAddresses.length} tokens`);
        const priceResults = await fetchTokenPrices(mintAddresses);
        
        if (priceResults.success) {
          const prices = priceResults.data;
          console.log(`Successfully received price data for ${Object.keys(prices).length} tokens`);
          
          // Add price data to tokens and calculate values
          tokens.forEach(token => {
            if (prices[token.mint]) {
              token.price = prices[token.mint];
              token.value = token.uiBalance * token.price;
            }
          });
          
          // Second pass: Check liquidity only for high-value tokens
          const highValueTokens = tokens.filter(token => token.value && token.value > 10000);
          const lowValueTokens = tokens.filter(token => !token.value || token.value <= 10000);
          
          console.log(`Found ${highValueTokens.length} high-value tokens (>$10,000) to check liquidity`);
          
          // Create separate arrays for tokens to check and tokens to keep
          const highValueMints = highValueTokens.map(token => token.mint);
          
          // Only check DexScreener liquidity for high value tokens
          if (highValueMints.length > 0) {
            console.log(`Checking liquidity for ${highValueMints.length} high-value tokens...`);
            const liquidityResults = await fetchTokenPrices(highValueMints, true); // true flag for liquidity check
            
            if (liquidityResults.success) {
              const verifiedPrices = liquidityResults.data;
              const filteredTokens = liquidityResults.filteredTokens || [];
              
              // Filter the high-value tokens based on liquidity check
              highValueTokens.forEach(token => {
                if (!verifiedPrices[token.mint]) {
                  // If the token was filtered out due to liquidity, mark it
                  token.price = undefined;
                  token.value = undefined;
                  console.log(`Filtered out high-value token ${token.symbol || token.mint} due to liquidity check`);
                } else {
                  console.log(`High-value token ${token.symbol || token.mint} passed liquidity check: Value=${token.value}`);
                }
              });
            }
          }
          
          // Count tokens with price data
          let tokensWithPrices = tokens.filter(token => token.price !== undefined).length;
          console.log(`Added price data to ${tokensWithPrices} out of ${tokens.length} tokens`);
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
