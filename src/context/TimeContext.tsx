'use client';

import * as React from 'react';

interface TimeContextType {
  time: string; // HH:MM format
  setTime: React.Dispatch<React.SetStateAction<string>>;
}

const TimeContext = React.createContext<TimeContextType | undefined>(undefined);

export function TimeProvider({ children }: { children: React.ReactNode }) {
  const [time, setTime] = React.useState(() => {
    const now = new Date();
    const istTime = new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
      hour12: false,
    }).format(now);
    return istTime;
  });

  return (
    <TimeContext.Provider value={{ time, setTime }}>
      {children}
    </TimeContext.Provider>
  );
}

export function useTime() {
  const context = React.useContext(TimeContext);
  if (context === undefined) {
    throw new Error('useTime must be used within a TimeProvider');
  }
  return context;
}
