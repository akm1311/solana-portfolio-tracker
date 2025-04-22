import type { Token } from "@shared/schema";

export const isValidSolanaAddress = (address: string): boolean => {
  // Basic validation - Solana addresses are 32-44 characters long
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

export const formatTokenData = (tokenData: any): Token => {
  const {
    mint,
    balance,
    decimals,
    uiBalance,
    symbol,
    name,
    price,
  } = tokenData;

  const formattedToken: Token = {
    mint,
    balance: typeof balance === 'string' ? parseInt(balance) : balance,
    decimals,
    uiBalance: uiBalance || 0,
    symbol: symbol || undefined,
    name: name || undefined,
    price: price || undefined,
    value: (uiBalance || 0) * (price || 0),
  };

  return formattedToken;
};

// Functions to truncate addresses for display
export const truncateAddress = (address: string, startChars = 4, endChars = 4): string => {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};
