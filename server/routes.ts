import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSolanaTokens } from "./services/solana";
import { fetchTokenPrices } from "./services/jupiter";
import { z } from "zod";
import axios from "axios";

/**
 * Check token liquidity via BullX API and filter out scam tokens
 */
async function checkTokenLiquidity(token: any): Promise<boolean> {
  try {
    console.log(`Token ${token.symbol || token.mint} has high value ($${token.value?.toFixed(2)}), checking BullX API`);
    
    // Query BullX API directly for high-value tokens
    const BULLX_API_URL = "https://api-neo.bullx.io/v2/searchV3";
    const SOLANA_CHAIN_ID = "1399811149";
    
    // Add browser-like headers to avoid CloudFront blocking
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Referer': 'https://bullx.io/',
      'Origin': 'https://bullx.io',
      'Accept': 'application/json'
    };
    
    const url = `${BULLX_API_URL}?q=${token.mint}&chainIds=${SOLANA_CHAIN_ID}`;
    console.log(`Requesting BullX API: ${url}`);
    
    const response = await axios.get(url, { headers });
    
    // If response is empty array - likely a scam token
    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      console.log(`BullX API returned empty results for ${token.mint} (${token.symbol}) - filtering out scam token`);
      return false;
    }
    
    // Find the token in the response
    const tokenData = response.data.find((t: any) => t.address === token.mint);
    
    // Check liquidity
    if (tokenData && tokenData.liquidity !== undefined) {
      const liquidity = parseFloat(tokenData.liquidity) || 0;
      console.log(`BullX API reports liquidity for ${token.mint} (${token.symbol}): $${liquidity}`);
      
      // Filter out if liquidity is below threshold
      if (liquidity < 1000) {
        console.log(`Filtering out token ${token.symbol} due to low liquidity: $${liquidity}`);
        return false;
      }
      
      return true;
    } else {
      console.log(`No liquidity data found in BullX API for ${token.mint} (${token.symbol}) - filtering out`);
      return false;
    }
  } catch (error) {
    console.error(`Error checking BullX API for ${token.mint} (${token.symbol}):`, error);
    // On error, we'll keep the token (err on the side of showing more data)
    return true;
  }
}

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
              
              // Process the token
              console.log(`Processing token ${token.symbol || token.mint} (${token.mint}) with value $${token.value.toFixed(2)}`);
              
              // Check if this token is in the filtered list (liquidity check from the initial check)
              const isFiltered = priceResults.filteredTokens?.includes(token.mint) || false;
              
              // Skip tokens with very low liquidity (below $1000) and low value
              if (isFiltered && token.value < 10) {
                console.log(`Filtering out low liquidity token ${token.symbol || token.mint} with value $${token.value.toFixed(2)}`);
                continue;
              }
              
              // Add this token to valid tokens by default
              let isValid = true;
              
              // For high-value tokens (>$10k), do a more rigorous liquidity check
              if (token.value > 10000 || token.symbol === "MYSPACE") { // Also check known problematic tokens
                isValid = await checkTokenLiquidity(token);
              }
              
              // Final decision on whether to include the token
              if (isValid) {
                if (isFiltered) {
                  console.log(`Including token ${token.symbol || token.mint} despite initial filtering ($${token.value.toFixed(2)})`);
                } else {
                  console.log(`Including token ${token.symbol || token.mint}: Price=${token.price}, Value=${token.value.toFixed(2)}`);
                }
                validTokens.push(token);
              }
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
