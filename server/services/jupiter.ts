import axios from "axios";

const JUP_API_BASE_URL = "https://fe-api.jup.ag/api/v1";

interface PriceResult {
  success: boolean;
  data: Record<string, number>;
  error?: string;
}

export async function fetchTokenPrices(mintAddresses: string[]): Promise<PriceResult> {
  try {
    // Process in batches of 100 as specified
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < mintAddresses.length; i += batchSize) {
      batches.push(mintAddresses.slice(i, i + batchSize));
    }
    
    const priceData: Record<string, number> = {};
    
    // Process each batch
    for (const batch of batches) {
      const addressList = batch.join(',');
      const url = `${JUP_API_BASE_URL}/prices?list_address=${addressList}`;
      
      const response = await axios.get(url);
      const data = response.data.data;
      
      if (data) {
        // Merge data from this batch into the main result
        Object.keys(data).forEach(mint => {
          if (data[mint] && data[mint].price) {
            priceData[mint] = data[mint].price;
          }
        });
      }
    }
    
    return {
      success: true,
      data: priceData
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
