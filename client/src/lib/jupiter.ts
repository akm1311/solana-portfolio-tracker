// Format batch addresses for Jupiter API
export const formatAddressesForJupiter = (addresses: string[]): string => {
  return addresses.join(',');
};

// Process Jupiter price response
export const processJupiterPrices = (priceData: Record<string, any>): Record<string, number> => {
  const prices: Record<string, number> = {};
  
  if (!priceData || typeof priceData !== 'object') {
    return prices;
  }
  
  // Extract price data from Jupiter response
  Object.entries(priceData).forEach(([mint, data]) => {
    if (data && typeof data === 'object' && 'price' in data) {
      prices[mint] = typeof data.price === 'number' ? data.price : 0;
    }
  });
  
  return prices;
};
