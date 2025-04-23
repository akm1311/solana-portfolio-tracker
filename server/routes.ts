import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSolanaTokens } from "./services/solana";
import { fetchTokenPrices } from "./services/jupiter";
import { z } from "zod";
import axios from "axios";
import { proxyRotator } from "./services/proxy";

export async function registerRoutes(app: Express): Promise<Server> {
  // Helper function to clear price cache
  const clearPriceCache = () => {
    try {
      const cacheFile = path.join(__dirname, 'cache', 'token_prices_cache.json');
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
        console.log('Price cache cleared to ensure fresh data');
      }
    } catch (error) {
      console.error('Error clearing price cache:', error);
    }
  };

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
      
      // Clear price cache to ensure fresh data
      clearPriceCache();
      
      // Fetch token data from Solana
      const tokensResult = await getSolanaTokens(address);
      
      if (!tokensResult.success) {
        return res.status(400).json({ 
          message: tokensResult.error || "Failed to retrieve token data from Solana"
        });
      }
      
      const tokens = tokensResult.data;
      
      // If we have tokens, get price data while fetching metadata
      if (tokens.length > 0) {
        // We will try to get price data from token metadata first to reduce API calls
        // This is already being done in getSolanaTokens
        // For any tokens that don't have prices from metadata, we'll try Jupiter API
        
        // Find tokens that already have price data from metadata
        const tokensWithPrices = tokens.filter(token => token.price !== undefined);
        const tokensWithoutPrices = tokens.filter(token => token.price === undefined);
        
        console.log(`${tokensWithPrices.length} tokens already have price data from metadata`);
        console.log(`${tokensWithoutPrices.length} tokens need price data from Jupiter API`);
        
        // Only fetch prices for tokens that don't already have price data
        if (tokensWithoutPrices.length > 0) {
          const mintAddressesForPrices = tokensWithoutPrices.map(token => token.mint);
          
          // First pass: Get prices for remaining tokens
          console.log(`Fetching price data for ${mintAddressesForPrices.length} tokens without prices`);
          try {
            const priceResults = await fetchTokenPrices(mintAddressesForPrices);
            
            if (priceResults.success) {
              const prices = priceResults.data;
              console.log(`Successfully received price data for ${Object.keys(prices).length} tokens`);
              
              // Add price data to tokens without prices
              tokensWithoutPrices.forEach(token => {
                if (prices[token.mint]) {
                  token.price = prices[token.mint];
                  token.value = token.uiBalance * token.price;
                }
              });
            } else {
              console.log(`Failed to get price data: ${priceResults.error}`);
            }
          } catch (error) {
            console.error("Error fetching token prices:", error);
          }
        }
        
        // Calculate values for all tokens with prices
        tokens.forEach(token => {
          if (token.price) {
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
          try {
            // Check each high-value token with DexScreener
            for (const token of highValueTokens) {
              try {
                // Add a delay between token checks (300-800ms)
                await new Promise(resolve => setTimeout(resolve, 300 + Math.floor(Math.random() * 500)));
                
                // Use DexScreener API to check if token has liquidity via proxy rotator
                const response = await proxyRotator.get(`https://api.dexscreener.com/latest/dex/tokens/${token.mint}`, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                    'Referer': 'https://dexscreener.com/',
                  }
                });
                
                // If pairs is null, this token has no liquidity
                const hasLiquidity = response.data.pairs !== null;
                
                if (!hasLiquidity) {
                  // Token has no liquidity, filter it out
                  token.price = undefined;
                  token.value = undefined;
                  console.log(`Filtered out high-value token ${token.symbol || token.mint} due to no liquidity`);
                } else {
                  console.log(`High-value token ${token.symbol || token.mint} passed liquidity check: Value=${token.value}`);
                }
              } catch (error) {
                console.error(`Error checking liquidity for ${token.mint}:`, error);
                // Don't filter if we couldn't check, to avoid false negatives
              }
            }
          } catch (error) {
            console.error("Error in liquidity checking process:", error);
          }
        }
        
        // Count tokens with price data
        let tokensWithPricesAfter = tokens.filter(token => token.price !== undefined).length;
        console.log(`Final count: ${tokensWithPricesAfter} out of ${tokens.length} tokens with price data`);
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
