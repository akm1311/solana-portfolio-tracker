import { Connection, PublicKey } from "@solana/web3.js";
import axios from "axios";
import type { Token } from "@shared/schema";
import { proxyRotator } from "./proxy";

// Use Helius RPC endpoint
const HELIUS_RPC_URL = "https://mainnet.helius-rpc.com/?api-key=6ebf9f53-df4d-4549-8258-c506ad07db38";
const connection = new Connection(HELIUS_RPC_URL);

interface TokenResult {
  success: boolean;
  data: Token[];
  error?: string;
}

export async function getSolanaTokens(walletAddress: string): Promise<TokenResult> {
  try {
    // Validate wallet address
    let pubkey: PublicKey;
    try {
      pubkey = new PublicKey(walletAddress);
    } catch (error) {
      return {
        success: false,
        data: [],
        error: "Invalid Solana wallet address"
      };
    }

    // Get token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubkey,
      { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
    );

    const tokens: Token[] = [];
    
    if (tokenAccounts.value && tokenAccounts.value.length > 0) {
      for (const accountInfo of tokenAccounts.value) {
        const parsedInfo = accountInfo.account.data.parsed;
        const tokenInfo = parsedInfo.info;
        
        const mintAddress = tokenInfo.mint;
        const balance = tokenInfo.tokenAmount.amount;
        const decimals = tokenInfo.tokenAmount.decimals;
        const uiBalance = tokenInfo.tokenAmount.uiAmount || 0;
        
        // Skip tokens with zero balance
        if (balance === "0") continue;
        
        // Create token object
        const token: Token = {
          mint: mintAddress,
          balance: parseInt(balance),
          decimals,
          uiBalance,
          symbol: undefined,
          name: undefined,
          price: undefined,
          value: undefined,
          icon: undefined,
        };
        
        tokens.push(token);
      }
      
      // Also check for SOL balance
      try {
        const solBalance = await connection.getBalance(pubkey);
        if (solBalance > 0) {
          const uiBalance = solBalance / 1_000_000_000; // SOL has 9 decimals
          tokens.push({
            mint: "So11111111111111111111111111111111111111112", // Native SOL mint
            symbol: "SOL",
            name: "Solana",
            balance: solBalance,
            decimals: 9,
            uiBalance,
            price: undefined,
            value: undefined,
            icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
          });
        }
      } catch (error) {
        console.error("Error fetching SOL balance:", error);
      }
      
      // Try to get token metadata for symbols, names, and prices
      try {
        // Get metadata for tokens in batches
        const mintAddresses = tokens.map(token => token.mint);
        const metadataResults = await getTokenMetadataBatch(mintAddresses);
        
        // Update tokens with metadata, including any price data if available
        for (const token of tokens) {
          const metadata = metadataResults[token.mint];
          if (metadata) {
            token.symbol = metadata.symbol;
            token.name = metadata.name;
            token.icon = metadata.icon;
            
            // If the metadata includes price info, use it
            if (metadata.price) {
              token.price = metadata.price;
              token.value = token.uiBalance * metadata.price;
              console.log(`Got price for ${token.symbol || token.mint} from metadata: ${metadata.price}`);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching token metadata:", error);
      }
    }
    
    return {
      success: true,
      data: tokens
    };
  } catch (error) {
    console.error("Error fetching Solana tokens:", error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

// Helper to get token metadata using the Jupiter API for better token names and symbols
async function getTokenMetadataBatch(mints: string[]): Promise<Record<string, { 
  symbol: string, 
  name: string, 
  icon?: string, 
  price?: number,
  hasLiquidity?: boolean
}>> {
  try {
    console.log(`Fetching metadata for ${mints.length} tokens...`);
    const results: Record<string, { 
      symbol: string, 
      name: string, 
      icon?: string,
      price?: number,
      hasLiquidity?: boolean
    }> = {};
    
    // Store price data to avoid additional API calls
    const priceData: Record<string, number> = {};
    
    // Process tokens using Jupiter's search API
    for (const mint of mints) {
      try {
        console.log(`Fetching Jupiter metadata for token: ${mint}`);
        
        // Add minimal delay for API rate limits
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const response = await proxyRotator.get(`https://fe-api.jup.ag/api/v1/tokens/search?query=${mint}`, {
          headers: {
            // Add a custom key for Jupiter API (assuming they have some form of API key)
            'x-jup-key': 'portfolio-tracker-app',
            'x-jup-request-source': 'portfolio-tracker'
          }
        });
        
        if (response.data && response.data.tokens && response.data.tokens.length > 0) {
          // Find exact matching token by address
          const token = response.data.tokens.find((t: any) => t.address === mint);
          
          if (token) {
            // Extract price if available
            const price = token.price || token.priceUsd || token.usdPrice || undefined;
            
            results[mint] = {
              symbol: token.symbol || '',
              name: token.name || token.symbol || '',
              icon: token.icon || undefined,
              price: typeof price === 'number' ? price : undefined,
              // If the token has a price, assume it has some liquidity
              hasLiquidity: typeof price === 'number' && price > 0
            };
            
            // Store price data for later use
            if (results[mint].price) {
              priceData[mint] = results[mint].price as number;
            }
            
            console.log(`Got Jupiter metadata for ${mint}: ${token.name} (${token.symbol})`);
            continue; // Skip to the next token in the loop
          }
        }
        
        // If no results from search API or no match found, try fallback to Helius
        console.log(`Jupiter search API didn't find ${mint}, trying fallback...`);
        throw new Error("No matching token found in Jupiter search results");
        
      } catch (error) {
        // If Jupiter API fails, try the Helius API as fallback
        try {
          const response = await axios.post(HELIUS_RPC_URL, {
            jsonrpc: "2.0",
            id: "helius-tokens",
            method: "getTokenMetadata",
            params: {
              mintAccounts: [mint]
            }
          });
          
          if (response.data && response.data.result && response.data.result[0]) {
            const item = response.data.result[0];
            if (item && item.mint) {
              // Get the best available name and symbol
              const name = item.name || item.onChainMetadata?.metadata?.data?.name || '';
              const symbol = item.symbol || item.onChainMetadata?.metadata?.data?.symbol || '';
              const icon = item.logoURI || undefined;
              
              results[mint] = {
                symbol: symbol,
                name: name,
                icon: icon
              };
              
              console.log(`Got Helius metadata for ${mint}: ${name} (${symbol})`);
            }
          }
        } catch (fallbackError) {
          console.log(`Fallback failed for ${mint}, using abbreviated address as name`);
          
          // If all else fails, use a shortened version of the address
          if (!results[mint]) {
            const shortenedAddress = mint.length > 8 ? 
              `${mint.slice(0, 6)}...${mint.slice(-4)}` : mint;
              
            results[mint] = {
              symbol: shortenedAddress,
              name: `Token ${shortenedAddress}`
            };
          }
        }
      }
    }
    
    // Also add Solana native token manually to ensure it displays properly
    results["So11111111111111111111111111111111111111112"] = {
      symbol: "SOL",
      name: "Solana",
      icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
    };
    
    console.log(`Successfully retrieved metadata for ${Object.keys(results).length} tokens`);
    return results;
  } catch (error) {
    console.error("Error in token metadata process:", error);
    return {};
  }
}
