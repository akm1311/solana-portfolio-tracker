import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { walletSchema, type WalletInput } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface WalletInputProps {
  onSubmit: (address: string) => void;
  isLoading: boolean;
}

export default function WalletInput({ onSubmit, isLoading }: WalletInputProps) {
  const form = useForm<WalletInput>({
    resolver: zodResolver(walletSchema),
    defaultValues: {
      address: ""
    }
  });

  const handleSubmit = (data: WalletInput) => {
    onSubmit(data.address);
  };

  return (
    <div className="max-w-3xl mx-auto mb-8">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 portfolio-card">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Enter Solana Wallet Address</h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter Solana wallet address..."
                        className="w-full px-4 py-2 font-mono text-sm dark:bg-gray-800 dark:text-white dark:border-gray-700"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 dark:text-red-400" />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit"
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-white dark:bg-primary dark:hover:bg-primary/90 dark:text-white"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg 
                      className="mr-2 h-4 w-4" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Track Portfolio
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
        
        <div className="mt-4 text-xs text-slate-500 dark:text-slate-300">
          <p>Example: Ai5spT4zukruzSm8m67ro1E2iuu92foU1fi1EvhMTPxj</p>
        </div>
      </div>
    </div>
  );
}
