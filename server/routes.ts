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
          
          // Check if any tokens were filtered due to low liquidity
          const filteredTokens = priceResults.filteredTokens || [];
          
          // Add price data to tokens
          let tokensWithPrices = 0;
          
          // Well-known tokens and their mint addresses for special handling
          const knownTokens = new Set([
            'So11111111111111111111111111111111111111112', // SOL
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
            'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
            'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
            'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ', // DUST
            'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
            'WEN1tWh9KuyjPXW3oJpCY5q25xoLfYcUKDWzRMfeFbh', // WEN
          ]);
          
          tokens.forEach(token => {
            // For tagged "low liquidity" tokens, we need to be careful
            const isLowLiquidity = filteredTokens.includes(token.mint);
            const isKnownToken = knownTokens.has(token.mint);
            
            if (prices[token.mint]) {
              token.price = prices[token.mint];
              token.value = token.uiBalance * token.price;
              
              // For potentially risky tokens, add a flag
              if (isLowLiquidity && !isKnownToken) {
                // Cap the value based on liquidity concerns
                // If token claims to be worth more than $10,000 but isn't a known token,
                // it's likely a pricing error or low-liquidity token
                if (token.value > 10000) {
                  console.log(`Suspicious high value for token ${token.symbol || token.mint}: $${token.value.toFixed(2)}`);
                  token.isLowLiquidity = true as any; // Type assertion to handle schema update
                  // Cap the value at something more reasonable for portfolio total
                  token.value = 0; // zero out value for safety
                }
              }
              
              tokensWithPrices++;
              console.log(`Token ${token.symbol || token.mint}: Price=${token.price}, Balance=${token.uiBalance}, Value=${token.value}`);
            }
          });
          
          console.log(`Added price data to ${tokensWithPrices} out of ${tokens.length} tokens`);
          
          // Sort tokens by value, with reliable tokens prioritized
          tokens.sort((a, b) => {
            // Always put known tokens at the top regardless of value
            if (knownTokens.has(a.mint) && !knownTokens.has(b.mint)) return -1;
            if (!knownTokens.has(a.mint) && knownTokens.has(b.mint)) return 1;
            
            // Then sort by value (highest first)
            return (b.value || 0) - (a.value || 0);
          });
          
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
