import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  error: string;
  onReset: () => void;
}

export default function ErrorState({ error, onReset }: ErrorStateProps) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg p-6 flex items-start">
        <div className="text-xl mr-4">
          <svg 
            className="h-6 w-6" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold mb-1">Error Fetching Portfolio Data</h3>
          <p>{error || 'Unable to retrieve wallet data. Please check the wallet address and try again.'}</p>
          <Button 
            variant="outline" 
            onClick={onReset} 
            className="mt-4 bg-white dark:bg-slate-800 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
