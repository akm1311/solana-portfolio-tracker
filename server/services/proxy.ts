import axios, { AxiosInstance, AxiosRequestConfig, AxiosProxyConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Interface for proxy configuration
interface ProxyConfig {
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}

// Proxy rotation system with Oxylabs integration
class ProxyRotator {
  private currentProxyIndex: number = 0;
  private axiosInstances: AxiosInstance[] = [];
  private proxyConfigs: ProxyConfig[] = [];
  private userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.59',
  ];
  
  // Track request counts to avoid overwhelming any single proxy
  private requestCounts: Record<number, number> = {};
  private maxRequestsPerProxy: number = 50; // Reset after this many requests
  
  constructor() {
    // Get Oxylabs credentials from environment variables
    const username = process.env.OXYLABS_PROXY_USERNAME;
    const password = process.env.OXYLABS_PROXY_PASSWORD;
    
    if (!username || !password) {
      console.warn("Oxylabs credentials not found in environment variables. Using fallback mode.");
      this.initializeFallbackMode();
      return;
    }
    
    // Configure Oxylabs proxy endpoints
    // These are the 5 different proxy servers (using different geo locations)
    this.proxyConfigs = [
      // Standard proxy for US
      {
        host: 'pr.oxylabs.io',
        port: 7777,
        auth: { username, password }
      },
      // US proxy
      {
        host: 'us-pr.oxylabs.io',
        port: 7777,
        auth: { username, password }
      },
      // UK proxy
      {
        host: 'uk-pr.oxylabs.io',
        port: 7777,
        auth: { username, password }
      },
      // Germany proxy
      {
        host: 'de-pr.oxylabs.io',
        port: 7777,
        auth: { username, password }
      },
      // Canada proxy
      {
        host: 'ca-pr.oxylabs.io', 
        port: 7777,
        auth: { username, password }
      }
    ];
    
    // Initialize Axios instances with these proxies
    this.initializeProxies();
    
    console.log(`Initialized ${this.axiosInstances.length} proxy-enabled Axios instances`);
  }
  
  private initializeProxies() {
    // Create an Axios instance for each proxy configuration
    for (let i = 0; i < this.proxyConfigs.length; i++) {
      const config = this.proxyConfigs[i];
      const userAgent = this.userAgents[i % this.userAgents.length];
      
      // Create an HTTP proxy agent for this configuration
      const proxyUrl = `http://${config.auth?.username}:${config.auth?.password}@${config.host}:${config.port}`;
      const httpsAgent = new HttpsProxyAgent(proxyUrl);
      
      // Create the Axios instance with proxy configuration
      const instance = axios.create({
        httpsAgent,
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json',
          'Origin': 'https://portfolio.solana.tools',
          'Referer': 'https://portfolio.solana.tools/',
        },
        timeout: 20000, // 20 seconds timeout for proxy requests
        proxy: false, // Don't use the default proxy settings as we're using httpsAgent
      });
      
      this.axiosInstances.push(instance);
      this.requestCounts[i] = 0;
    }
    
    // Also add a few non-proxy instances as fallbacks
    for (const userAgent of this.userAgents) {
      this.axiosInstances.push(axios.create({
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json',
          'Origin': 'https://portfolio.solana.tools',
          'Referer': 'https://portfolio.solana.tools/',
        },
        timeout: 10000, // 10 seconds timeout for direct requests
      }));
    }
  }
  
  private initializeFallbackMode() {
    console.log("Running in fallback mode with rotating user agents");
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
  }

  // Get the next axios instance in rotation
  public getNextAxios(): AxiosInstance {
    // Find an instance that hasn't hit the request limit
    const proxyCount = this.proxyConfigs.length;
    
    // Try to use a proxy instance first
    if (proxyCount > 0) {
      // Find the proxy with the fewest requests
      let minRequests = Infinity;
      let bestIndex = 0;
      
      for (let i = 0; i < proxyCount; i++) {
        const count = this.requestCounts[i] || 0;
        if (count < minRequests) {
          minRequests = count;
          bestIndex = i;
        }
      }
      
      // If the best proxy hasn't hit the limit, use it
      if (minRequests < this.maxRequestsPerProxy) {
        this.requestCounts[bestIndex] = (this.requestCounts[bestIndex] || 0) + 1;
        console.log(`Using proxy #${bestIndex} (request count: ${this.requestCounts[bestIndex]})`);
        return this.axiosInstances[bestIndex];
      }
      
      // If all proxies are at limit, reset counts and use the first one
      console.log("All proxies at request limit, resetting counts");
      for (let i = 0; i < proxyCount; i++) {
        this.requestCounts[i] = 0;
      }
      this.requestCounts[0] = 1;
      return this.axiosInstances[0];
    }
    
    // Fallback to rotating through all instances
    const instance = this.axiosInstances[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.axiosInstances.length;
    return instance;
  }

  // Make a get request with a rotated proxy
  public async get(url: string, config?: AxiosRequestConfig): Promise<any> {
    try {
      const axiosInstance = this.getNextAxios();
      return await axiosInstance.get(url, config);
    } catch (error: any) {
      console.error(`Proxy request failed for ${url}:`, error.message);
      
      // If we got a proxy error, try one more proxy before falling back
      if (error.message && (
          error.message.includes('proxy') || 
          error.message.includes('ECONNRESET') || 
          error.message.includes('timeout')
        )) {
        console.log("Trying one more proxy before falling back...");
        try {
          const anotherInstance = this.getNextAxios();
          return await anotherInstance.get(url, config);
        } catch (retryError) {
          console.error(`Second proxy attempt also failed: ${retryError}`);
        }
      }
      
      // Fall back to a direct request if proxy fails
      console.log("Falling back to direct request");
      return axios.get(url, config);
    }
  }
}

// Create a singleton instance
export const proxyRotator = new ProxyRotator();