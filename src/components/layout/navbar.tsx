'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Moon, Sun, TrainFront, Clock } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useTime } from '@/context/TimeContext';
import { Input } from '../ui/input';

const navLinks = [
  { href: '/live-status', label: 'Live Status' },
  { href: '/between-stations', label: 'Between Stations' },
  { href: '/all-live-trains', label: 'All Live Trains' },
  { href: '/live-map', label: 'Live Map' },
  { href: '/dss-corridor', label: 'DSS Corridor' },
];

function EditableClock() {
    const { time, setTime } = useTime();

    return (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            <Input 
                type="time" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-24 h-8 bg-transparent border-0 focus-visible:ring-0"
            />
             <span>(IST)</span>
        </div>
    );
}


export function Navbar() {
  const { setTheme, theme } = useTheme();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <TrainFront className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">RailPulse</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <nav className="grid gap-6 text-lg font-medium mt-6">
                  <Link href="/" className="flex items-center space-x-2">
                     <TrainFront className="h-6 w-6 text-primary" />
                     <span className="font-bold">RailPulse</span>
                  </Link>
                  {navLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-4">
                <EditableClock />
            </div>
            <Button variant="ghost">Sign In</Button>
            <Button variant="default">Sign Up</Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
