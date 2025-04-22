import axios from "axios";

const JUP_API_BASE_URL = "https://fe-api.jup.ag/api/v1";

interface PriceResult {
  success: boolean;
  data: Record<string, number>;
  error?: string;
}

export async function fetchTokenPrices(mintAddresses: string[]): Promise<PriceResult> {
  try {
    console.log(`Fetching prices for ${mintAddresses.length} tokens`);
    
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
      
      console.log(`Fetching batch of ${batch.length} tokens from Jupiter API`);
      console.log(`Request URL: ${url}`);
      
      const response = await axios.get(url);
      console.log(`Jupiter API response status: ${response.status}`);
      
      // Log structure of the response to understand format
      console.log(`Response data structure: ${JSON.stringify(Object.keys(response.data))}`);
      
      const data = response.data.data;
      
      if (data) {
        console.log(`Received price data for ${Object.keys(data).length} tokens`);
        
        // Merge data from this batch into the main result
        Object.keys(data).forEach(mint => {
          console.log(`Processing mint: ${mint}, data:`, JSON.stringify(data[mint]));
          if (data[mint] && typeof data[mint].price === 'number') {
            priceData[mint] = data[mint].price;
            console.log(`Added price for ${mint}: ${data[mint].price}`);
          }
        });
      } else {
        console.log(`No data returned from Jupiter API in this batch`);
        console.log(`Full response: ${JSON.stringify(response.data)}`);
      }
    }
    
    console.log(`Final price data contains prices for ${Object.keys(priceData).length} tokens`);
    
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
