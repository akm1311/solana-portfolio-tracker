import { Connection, PublicKey } from "@solana/web3.js";
import axios from "axios";
import type { Token } from "@shared/schema";

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
          });
        }
      } catch (error) {
        console.error("Error fetching SOL balance:", error);
      }
      
      // Try to get token metadata for symbols and names
      try {
        // Get metadata for tokens in batches
        const mintAddresses = tokens.map(token => token.mint);
        const metadataResults = await getTokenMetadataBatch(mintAddresses);
        
        // Update tokens with metadata
        for (const token of tokens) {
          const metadata = metadataResults[token.mint];
          if (metadata) {
            token.symbol = metadata.symbol;
            token.name = metadata.name;
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

// Helper to get token metadata using the Helius API for enhanced metadata
async function getTokenMetadataBatch(mints: string[]): Promise<Record<string, { symbol: string, name: string }>> {
  try {
    console.log(`Fetching metadata for ${mints.length} tokens...`);
    const results: Record<string, { symbol: string, name: string }> = {};
    
    // Process in smaller batches to avoid Request Entity Too Large error
    const batchSize = 50;
    for (let i = 0; i < mints.length; i += batchSize) {
      const mintBatch = mints.slice(i, i + batchSize);
      
      try {
        // Use the Helius API to get enhanced token metadata
        // This API provides more comprehensive token information
        const response = await axios.post(HELIUS_RPC_URL, {
          jsonrpc: "2.0",
          id: "helius-tokens",
          method: "getTokenMetadata",
          params: {
            mintAccounts: mintBatch
          }
        });
        
        if (response.data && response.data.result) {
          // Process the token metadata
          for (const item of response.data.result) {
            if (item && item.mint) {
              // Get the best available name and symbol
              const name = item.name || item.onChainMetadata?.metadata?.data?.name || '';
              const symbol = item.symbol || item.onChainMetadata?.metadata?.data?.symbol || '';
              
              results[item.mint] = {
                symbol: symbol,
                name: name
              };
              
              console.log(`Got metadata for ${item.mint}: ${name} (${symbol})`);
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching token metadata for batch ${i}-${i + batchSize}:`, error);
        
        // Fallback to simpler token account info for this batch
        try {
          const fallbackResponse = await axios.post(HELIUS_RPC_URL, {
            jsonrpc: "2.0",
            id: "token-accounts-fallback",
            method: "getTokenAccounts",
            params: {
              slotsByIndex: true,
              mintAccounts: mintBatch
            }
          });
          
          if (fallbackResponse.data && fallbackResponse.data.result) {
            for (const item of fallbackResponse.data.result) {
              if (item.mint && item.tokenInfo) {
                results[item.mint] = {
                  symbol: item.tokenInfo.symbol || '',
                  name: item.tokenInfo.name || ''
                };
              }
            }
          }
        } catch (fallbackError) {
          console.error("Fallback metadata retrieval also failed:", fallbackError);
        }
      }
    }
    
    console.log(`Successfully retrieved metadata for ${Object.keys(results).length} tokens`);
    return results;
  } catch (error) {
    console.error("Error in token metadata process:", error);
    return {};
  }
}
