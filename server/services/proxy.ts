import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// List of free proxies that can be rotated
// These are example proxies and should be replaced with real ones in production
// You can obtain working proxies from proxy services like BrightData, Oxylabs, etc.
// For testing purposes, using direct connections with randomized User-Agent is safer
interface ProxyConfig {
  host: string;
  port: number;
  auth?: {
    username?: string;
    password?: string;
  };
}

// Proxy rotation system
class ProxyRotator {
  private currentProxyIndex: number = 0;
  private axiosInstances: AxiosInstance[] = [];
  private userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.59',
  ];

  constructor() {
    // Initialize with direct connections and different user-agents
    for (const userAgent of this.userAgents) {
      this.axiosInstances.push(axios.create({
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json',
          'Origin': 'https://portfolio.solana.tools', // Use a legitimate origin
          'Referer': 'https://portfolio.solana.tools/', // Use a legitimate referer
        },
        timeout: 10000, // 10 seconds timeout
      }));
    }
  }

  // Get the next axios instance in rotation
  public getNextAxios(): AxiosInstance {
    const instance = this.axiosInstances[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.axiosInstances.length;
    return instance;
  }

  // Make a get request with a rotated proxy
  public async get(url: string, config?: AxiosRequestConfig): Promise<any> {
    try {
      const axiosInstance = this.getNextAxios();
      return await axiosInstance.get(url, config);
    } catch (error) {
      console.error(`Proxy request failed for ${url}:`, error);
      // Fall back to a direct request if proxy fails
      return axios.get(url, config);
    }
  }
}

// Create a singleton instance
export const proxyRotator = new ProxyRotator();