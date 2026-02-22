import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FinanceProvider } from "@/context/FinanceContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { CalendarProvider } from "@/context/CalendarContext";
import Navigation from "@/components/Navigation";
import ClientOnly from "@/components/ClientOnly";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal Finance Tracker",
  description: "Track your personal finances with balance sheets and account management",
};

// Inline script to prevent flash of wrong theme on page load
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('finance-theme') || 'system';
      var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) document.documentElement.classList.add('dark');
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-neutral-950 min-h-screen transition-colors duration-200`}
      >
        <GoogleAnalytics />
        <AuthProvider>
          <CurrencyProvider>
            <FinanceProvider>
              <CalendarProvider>
                <ThemeProvider>
                  <ClientOnly
                    fallback={
                      <nav className="bg-white dark:bg-neutral-900 shadow-lg border-b dark:border-neutral-700">
                        <div className="max-w-6xl mx-auto px-4">
                          <div className="flex justify-between items-center py-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl">📈</span>
                              <span className="text-xl font-bold text-gray-800 dark:text-neutral-200 hidden sm:block">Personal Finance Tracker</span>
                              <span className="text-lg font-bold text-gray-800 dark:text-neutral-200 sm:hidden">Finance Tracker</span>
                            </div>
                          </div>
                        </div>
                      </nav>
                    }
                  >
                    <Navigation />
                  </ClientOnly>
                  <main className="py-8 px-4">
                    {children}
                  </main>
                </ThemeProvider>
              </CalendarProvider>
            </FinanceProvider>
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
