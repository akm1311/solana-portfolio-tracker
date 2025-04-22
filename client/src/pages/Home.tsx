import { useState } from "react";
import WalletInput from "@/components/WalletInput";
import PortfolioSummary from "@/components/PortfolioSummary";
import TokenList from "@/components/TokenList";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import useDarkMode from "@/hooks/useDarkMode";
import type { Portfolio } from "@shared/schema";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { toast } = useToast();

  const portfolioMutation = useMutation({
    mutationFn: async (address: string) => {
      const response = await apiRequest("GET", `/api/portfolio/${address}`, undefined);
      return response.json() as Promise<Portfolio>;
    },
    onSuccess: (data) => {
      setPortfolio(data);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error fetching portfolio",
        description: error.message,
      });
    },
  });

  const handleTrackPortfolio = (address: string) => {
    setWalletAddress(address);
    portfolioMutation.mutate(address);
  };

  const resetPortfolio = () => {
    setWalletAddress("");
    setPortfolio(null);
    portfolioMutation.reset();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-dark-surface shadow-md">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="mr-3 text-primary">
              <i className="fas fa-wallet text-2xl"></i>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-primary">Solana Portfolio Tracker</h1>
          </div>
          
          <div className="flex items-center">
            <button 
              onClick={toggleDarkMode} 
              className="p-2 rounded-full hover:bg-light-surface dark:hover:bg-slate-700 mr-2"
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        <WalletInput 
          onSubmit={handleTrackPortfolio} 
          isLoading={portfolioMutation.isPending} 
        />

        {portfolioMutation.isPending && <LoadingState />}

        {portfolioMutation.isError && (
          <ErrorState 
            error={portfolioMutation.error.message} 
            onReset={resetPortfolio} 
          />
        )}

        {!portfolioMutation.isPending && !portfolioMutation.isError && portfolio && (
          <>
            <PortfolioSummary portfolio={portfolio} />
            <TokenList portfolio={portfolio} />
          </>
        )}

        {!portfolioMutation.isPending && !portfolioMutation.isError && !portfolio && !walletAddress && (
          <EmptyState type="no-wallet" onReset={resetPortfolio} />
        )}

        {!portfolioMutation.isPending && !portfolioMutation.isError && portfolio && portfolio.tokens.length === 0 && (
          <EmptyState type="no-tokens" onReset={resetPortfolio} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-dark-surface shadow-inner mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 dark:text-slate-400">
            <div className="mb-2 md:mb-0">
              © {new Date().getFullYear()} Solana Portfolio Tracker
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-primary">About</a>
              <a href="#" className="hover:text-primary">Privacy Policy</a>
              <a href="#" className="hover:text-primary">Terms of Service</a>
              <a href="#" className="hover:text-primary">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
