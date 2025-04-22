import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type: "no-wallet" | "no-tokens";
  onReset: () => void;
}

export default function EmptyState({ type, onReset }: EmptyStateProps) {
  if (type === "no-wallet") {
    return (
      <div className="max-w-3xl mx-auto text-center py-8">
        <div className="bg-light-surface dark:bg-slate-800 rounded-lg p-8 inline-block mb-4">
          <svg 
            className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-2">No Portfolio Data</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
          Enter a Solana wallet address above to track its portfolio and token holdings
        </p>
      </div>
    );
  }
  
  // No tokens found
  return (
    <div className="max-w-3xl mx-auto text-center py-8">
      <div className="bg-light-surface dark:bg-slate-800 rounded-lg p-8 inline-block mb-4">
        <svg 
          className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold mb-2">No Tokens Found</h3>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
        This wallet doesn't contain any tokens or NFTs that we could find
      </p>
      <Button 
        onClick={onReset} 
        className="bg-primary hover:bg-opacity-90 text-white"
      >
        Try Another Wallet
      </Button>
    </div>
  );
}
