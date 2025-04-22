import React from 'react';

export default function Privacy() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">Privacy Policy</h1>
      
      <div className="prose dark:prose-invert max-w-none">
        <p className="text-lg mb-6">
          Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        
        <h2>1. Introduction</h2>
        <p>
          Welcome to the Solana Portfolio Tracker. We respect your privacy and are committed to protecting your personal data.
          This privacy policy will inform you about how we look after your personal data when you visit our website
          and tell you about your privacy rights and how the law protects you.
        </p>
        
        <h2>2. Data Collection</h2>
        <p>
          We collect only the Solana wallet addresses that you provide to us for the purpose of retrieving your token balances.
          We do not store these addresses on our servers. All queries for wallet data and token prices are processed in real-time.
        </p>
        
        <h2>3. Use of Data</h2>
        <p>
          The wallet addresses you provide are used solely to query the Solana blockchain for token balances
          and to retrieve price information from Jupiter API to calculate portfolio values.
        </p>
        
        <h2>4. Data Security</h2>
        <p>
          Your wallet address is transmitted securely, and we do not access or store your private keys.
          You retain full control over your assets at all times.
        </p>
        
        <h2>5. Contact</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us via Twitter:
          <a href="https://x.com/Aman_Kumar_1311" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">@Aman_Kumar_1311</a>
        </p>
      </div>
    </div>
  );
}