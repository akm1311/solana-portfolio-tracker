import React from 'react';
import { Link } from 'wouter';
import { FaTwitter } from 'react-icons/fa';

export function Footer() {
  return (
    <footer className="mt-auto py-6 bg-slate-100 dark:bg-gray-900 border-t border-slate-200 dark:border-gray-800">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} Solana Portfolio Tracker. All rights reserved.
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link href="/about" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors">
              About
            </Link>
            <Link href="/privacy" className="text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <a 
              href="https://x.com/Aman_Kumar_1311" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center text-sm text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors"
            >
              <FaTwitter className="mr-1" />
              <span>Contact</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;