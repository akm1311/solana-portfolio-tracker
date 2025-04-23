import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Simplified client with rotating user agents
class ApiClient {
  private currentIndex: number = 0;
  private axiosInstances: AxiosInstance[] = [];
  private userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.59',
  ];
  
  constructor() {
    console.log("Initializing direct API client with rotating user agents");
    
    // Initialize with direct connections and different user-agents
    for (const userAgent of this.userAgents) {
      this.axiosInstances.push(axios.create({
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json',
          'Origin': 'https://portfolio.solana.tools',
          'Referer': 'https://portfolio.solana.tools/',
        },
        timeout: 10000, // 10 seconds timeout
      }));
    }
    
    console.log(`Initialized ${this.axiosInstances.length} API client instances`);
  }

  // Get the next axios instance in rotation
  public getNextAxios(): AxiosInstance {
    const instance = this.axiosInstances[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.axiosInstances.length;
    return instance;
  }

  // Make a get request with rotation
  public async get(url: string, config?: AxiosRequestConfig): Promise<any> {
    try {
      const axiosInstance = this.getNextAxios();
      return await axiosInstance.get(url, config);
    } catch (error: any) {
      console.error(`Request failed for ${url}:`, error.message);
      
      // Fall back to a direct axios request if our instance fails
      return axios.get(url, config);
    }
  }
}

// Create a singleton instance
export const proxyRotator = new ApiClient();