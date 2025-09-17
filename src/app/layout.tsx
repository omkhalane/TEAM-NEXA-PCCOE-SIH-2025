import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { TimeProvider } from '@/context/TimeContext';
import { AlertTriangle } from 'lucide-react';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'RailPulse - Live Train Tracking & DSS',
  description: 'India’s Live Train Tracking Platform with Decision Support System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
      >
        <div className="bg-destructive text-destructive-foreground p-2 text-center text-sm flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <p>
                <strong>Prototype Notice:</strong> This is a prototype system and may produce inaccuracies; timestamps and suggestions can sometimes be wrong as it relies on free API services from RailRadar, where responses may be slow, outdated, incomplete, or occasionally corrupted, so the data should be used only for reference and not for official decision-making.
            </p>
        </div>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TimeProvider>
            {children}
            <Toaster />
          </TimeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
