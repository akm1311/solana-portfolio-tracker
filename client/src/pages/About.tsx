import React from 'react';

export default function About() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">About Solana Portfolio Tracker</h1>
      
      <div className="prose dark:prose-invert max-w-none">
        <p>
          The Solana Portfolio Tracker is a comprehensive tool for monitoring your Solana wallet holdings.
          With real-time price data from Jupiter, you can keep track of your token values, analyze your portfolio
          composition, and make informed investment decisions.
        </p>
        
        <h2>Features</h2>
        <ul>
          <li>Real-time token valuation using Jupiter API</li>
          <li>Portfolio breakdown and analytics</li>
          <li>Token sorting by name, value, or balance</li>
          <li>Dark mode support for comfortable viewing</li>
          <li>Wallet connection without requiring private keys</li>
          <li>Mobile-friendly responsive design</li>
        </ul>
        
        <h2>Contact</h2>
        <p>
          For support or inquiries about the Solana Portfolio Tracker, you can reach out to the developer
          on Twitter: <a href="https://x.com/Aman_Kumar_1311" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@Aman_Kumar_1311</a>
        </p>
      </div>
    </div>
  );
}