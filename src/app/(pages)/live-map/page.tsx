'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

import { Navbar } from '@/components/layout/navbar';
import { Autocomplete, type Suggestion } from '@/components/ui/autocomplete';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/layout/footer';

// Dynamically import the LiveMap with SSR turned off
const LiveMap = dynamic(() => import('@/components/live-map'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 z-0 h-full w-full bg-muted flex items-center justify-center">Loading Map...</div>
});

function LiveMapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trainNoFromQuery = searchParams.get('trainNo');

  const [trainToSearch, setTrainToSearch] = React.useState<Suggestion | null>(null);

  // Effect to sync the autocomplete input with the URL query parameter
  React.useEffect(() => {
    if (trainNoFromQuery) {
        if (!trainToSearch || trainToSearch.value !== trainNoFromQuery) {
            setTrainToSearch({ value: trainNoFromQuery, label: `Train ${trainNoFromQuery}` });
        }
    } else if (!trainNoFromQuery && trainToSearch) {
        setTrainToSearch(null);
    }
  }, [trainNoFromQuery, trainToSearch]);


  const handleSearch = React.useCallback((selectedTrain: Suggestion | null) => {
    const newTrainNo = selectedTrain ? selectedTrain.value : null;
    const url = newTrainNo ? `/live-map?trainNo=${newTrainNo}` : '/live-map';
    router.push(url, { scroll: false });
  }, [router]);
  
  const handleSelectTrain = (suggestion: Suggestion | null) => {
      setTrainToSearch(suggestion);
      handleSearch(suggestion);
  }

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
        <main className="relative flex-1">
            <LiveMap trainNo={trainNoFromQuery} showAll={!trainNoFromQuery} />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-2rem)] max-w-sm sm:max-w-md md:max-w-lg">
                <Card>
                <CardHeader className="p-4">
                    <CardTitle>Live Train Map</CardTitle>
                    <CardDescription>View all active trains or search for a specific one.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex flex-col gap-4">
                    <div className="relative">
                    <Autocomplete
                        type="trains"
                        placeholder="Search for a train..."
                        onSelect={handleSelectTrain}
                        initialValue={trainToSearch?.label}
                    />
                    <Button size="icon" className="absolute right-1 top-1 h-8 w-8" onClick={() => handleSearch(trainToSearch)}>
                        <Search className="h-4 w-4" />
                        <span className="sr-only">Search</span>
                    </Button>
                    </div>
                </CardContent>
                </Card>
            </div>
        </main>
        <Footer />
    </div>
  );
}

export default function LiveMapPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading Page...</div>}>
            <LiveMapPageContent />
        </Suspense>
    )
}
