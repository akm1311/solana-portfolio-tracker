import axios from "axios";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules-compatible way to get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JUP_API_BASE_URL = "https://fe-api.jup.ag/api/v1";
const TOKEN_CACHE_DIR = path.join(__dirname, '..', 'cache');
const TOKEN_CACHE_FILE = path.join(TOKEN_CACHE_DIR, 'token_prices_cache.json');
const TOKEN_METADATA_CACHE_FILE = path.join(TOKEN_CACHE_DIR, 'token_metadata_cache.json');
const CACHE_EXPIRY = 3600000; // 1 hour in milliseconds

// Minimum liquidity threshold for tokens to be considered valid (in USD)
const MIN_LIQUIDITY_THRESHOLD = 1000;
// Maximum token value as percentage of portfolio for "unknown" tokens
const MAX_TOKEN_VALUE_PERCENT = 5;

// Create cache directory if it doesn't exist
try {
  if (!fs.existsSync(TOKEN_CACHE_DIR)) {
    fs.mkdirSync(TOKEN_CACHE_DIR, { recursive: true });
  }
} catch (error) {
  console.error("Error creating cache directory:", error);
}

interface CacheEntry {
  timestamp: number;
  data: any;
}

interface PriceResult {
  success: boolean;
  data: Record<string, number>;
  error?: string;
  filteredTokens?: string[]; // Tokens that were filtered out due to low liquidity
}

interface TokenMetadata {
  symbol: string;
  name: string;
  icon?: string;
  isVerified?: boolean;
  liquidity?: number;
  hasLiquidity?: boolean;
}

// Cache management functions
function saveToCache(cacheFile: string, data: any): void {
  try {
    const cacheEntry: CacheEntry = {
      timestamp: Date.now(),
      data
    };
    fs.writeFileSync(cacheFile, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error(`Error saving to cache ${cacheFile}:`, error);
  }
}

function getFromCache(cacheFile: string): any | null {
  try {
    if (!fs.existsSync(cacheFile)) {
      return null;
    }

    const cacheData = fs.readFileSync(cacheFile, 'utf8');
    const cacheEntry: CacheEntry = JSON.parse(cacheData);

    // Check if cache is expired
    if (Date.now() - cacheEntry.timestamp > CACHE_EXPIRY) {
      console.log(`Cache expired for ${cacheFile}`);
      return null;
    }

    return cacheEntry.data;
  } catch (error) {
    console.error(`Error reading from cache ${cacheFile}:`, error);
    return null;
  }
}

// Token metadata functions
export async function getTokenMetadata(mintAddress: string): Promise<TokenMetadata | null> {
  try {
    // Try to get from cache first
    const metadataCache = getFromCache(TOKEN_METADATA_CACHE_FILE) || {};
    
    if (metadataCache[mintAddress]) {
      return metadataCache[mintAddress];
    }

    // Not in cache, fetch from API
    const response = await axios.get(`${JUP_API_BASE_URL}/tokens/search?query=${mintAddress}`);
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      const tokenData = response.data.data.find((token: any) => token.address === mintAddress);
      
      if (tokenData) {
        const metadata: TokenMetadata = {
          symbol: tokenData.symbol || '',
          name: tokenData.name || '',
          icon: tokenData.logoURI || undefined,
          isVerified: tokenData.tags?.includes('verified') || false,
          hasLiquidity: true // Assume tokens returned by Jupiter have some liquidity
        };

        // Update cache
        metadataCache[mintAddress] = metadata;
        saveToCache(TOKEN_METADATA_CACHE_FILE, metadataCache);
        
        return metadata;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching token metadata for ${mintAddress}:`, error);
    return null;
  }
}

export async function fetchTokenPrices(mintAddresses: string[], checkLiquidity: boolean = false): Promise<PriceResult> {
  try {
    console.log(`Fetching prices for ${mintAddresses.length} tokens`);
    
    // Check cache first
    const cachedPrices = getFromCache(TOKEN_CACHE_FILE) || {};
    const filteredTokens: string[] = [];
    const priceData: Record<string, number> = {};
    
    // Create a list of missing tokens that aren't in cache
    const missingTokens = mintAddresses.filter(mint => !cachedPrices[mint]);
    
    if (missingTokens.length > 0) {
      console.log(`Found ${mintAddresses.length - missingTokens.length} tokens in cache, fetching ${missingTokens.length} missing tokens`);
      
      // Process in batches of 100 as specified
      const batchSize = 100;
      const batches = [];
      
      for (let i = 0; i < missingTokens.length; i += batchSize) {
        batches.push(missingTokens.slice(i, i + batchSize));
      }
      
      // Process each batch
      for (const batch of batches) {
        const addressList = batch.join(',');
        const url = `${JUP_API_BASE_URL}/prices?list_address=${addressList}`;
        
        console.log(`Fetching batch of ${batch.length} tokens from Jupiter API`);
        
        // Add delay between batches to respect rate limits
        if (batches.indexOf(batch) > 0) {
          console.log('Waiting 2 seconds before next batch to respect rate limits');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        const response = await axios.get(url);
        
        // Check if the response has a 'prices' object (new API format)
        if (response.data.prices) {
          const prices = response.data.prices;
          console.log(`Received price data for ${Object.keys(prices).length} tokens from 'prices' object`);
          
          // Add the new prices to the cache
          Object.entries(prices).forEach(([mint, price]) => {
            if (typeof price === 'number') {
              cachedPrices[mint] = price;
            }
          });
        } 
        // Fall back to checking for 'data' property (old API format)
        else if (response.data.data) {
          const data = response.data.data;
          console.log(`Received price data for ${Object.keys(data).length} tokens from 'data' object`);
          
          // Add the new prices to the cache
          Object.keys(data).forEach(mint => {
            if (data[mint] && typeof data[mint].price === 'number') {
              cachedPrices[mint] = data[mint].price;
            }
          });
        } else {
          console.log(`No recognizable price data format in Jupiter API response`);
        }
      }
      
      // Save updated cache
      saveToCache(TOKEN_CACHE_FILE, cachedPrices);
    } else {
      console.log(`All ${mintAddresses.length} tokens found in cache`);
    }
    
    // Now we have all available prices in cachedPrices
    // Create a list of verified and popular tokens (to support the $1000 liquidity requirement)
    const verifiedTokens = new Set([
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
      'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ', // DUST
      'foodQJAztMzX1DKpLaiounNe2BDMds5RNuPC6jsNrDG', // FOOD
      '7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx', // GMT
      'kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6', // KIN
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
      'DFL1zNkaGPWm1BqAVqRjCZvHmwTFrEaJtbzJWgseoNJh', // Degen Fren Land
      'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', // ORCA
      'WEN1tWh9KuyjPXW3oJpCY5q25xoLfYcUKDWzRMfeFbh', // WEN
      'JitoExSAaJJYioV9NQ3XbQEsZdxsLPwMKBJUvPGgxYd', // JitoSOL
    ]);
    
    // Apply token filtering based on parameters
    for (const mint of mintAddresses) {
      const price = cachedPrices[mint];
      
      if (price) {
        // Always include verified and popular tokens
        if (verifiedTokens.has(mint)) {
          priceData[mint] = price;
          continue;
        }
        
        // If checkLiquidity parameter is true, check with DexScreener
        if (checkLiquidity) {
          try {
            // Use DexScreener API to check if token has liquidity
            const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
            
            // If pairs is null, this token has no liquidity
            const hasLiquidity = response.data.pairs !== null;
            
            if (hasLiquidity) {
              // Token has liquidity according to DexScreener
              priceData[mint] = price;
            } else {
              // Token has no liquidity, filter it out
              filteredTokens.push(mint);
              // Skip adding to priceData
              continue;
            }
          } catch (error) {
            console.error(`Error checking liquidity for ${mint}:`, error);
            // If there's an error, assume no liquidity and filter out
            filteredTokens.push(mint);
            continue;
          }
        } else {
          // Otherwise, include all tokens (will be filtered by value in routes.ts)
          priceData[mint] = price;
        }
      }
    }
    
    console.log(`Final price data contains prices for ${Object.keys(priceData).length} tokens`);
    console.log(`Filtered ${filteredTokens.length} potentially low-liquidity tokens`);
    
    return {
      success: true,
      data: priceData,
      filteredTokens
    };
  } catch (error) {
    console.error("Error fetching token prices from Jupiter:", error);
    return {
      success: false,
      data: {},
      error: error instanceof Error ? error.message : "Unknown error occurred fetching token prices"
    };
  }
}
