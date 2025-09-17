'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface LiveTrain {
  train_number: string;
  train_name: string;
  latitude: number;
  longitude: number;
  speed: number;
  delay: number;
  current_station_name: string;
}

type SortKey = 'train_name' | 'train_number';

function AllLiveTrainsContent() {
  const router = useRouter();
  const [liveTrains, setLiveTrains] = useState<LiveTrain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'train_name', direction: 'ascending' });

  useEffect(() => {
    const fetchLiveTrains = async () => {
      try {
        const response = await fetch('/api/all-live-trains');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch live train data');
        }
        const data = await response.json();
        
        const formattedTrains = data.map((train: any) => ({
            train_number: train.train_number,
            train_name: train.train_name,
            latitude: train.latitude,
            longitude: train.longitude,
            speed: train.speed,
            delay: train.delay,
            current_station_name: train.current_station_name,
        }));

        setLiveTrains(formattedTrains);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveTrains();
    const interval = setInterval(fetchLiveTrains, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleTrainClick = (trainNumber: string) => {
    const today = new Date().toISOString().split('T')[0];
    router.push(`/live-status?trainNo=${trainNumber}&date=${today}`);
  };

  const sortedAndFilteredTrains = useMemo(() => {
    let sortableItems = [...liveTrains];
    
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableItems.filter(train => 
        train.train_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        train.train_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [liveTrains, sortConfig, searchTerm]);


  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-secondary/50">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <CardTitle>All Live Trains</CardTitle>
                    <CardDescription>A list of all trains currently running across the network. Data refreshes automatically.</CardDescription>
                </div>
                <Input 
                    placeholder="Filter by name or number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center">Train</div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [...Array(10)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="flex justify-between items-center">
                              <Skeleton className="h-5 w-48" />
                              <Skeleton className="h-6 w-20" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      sortedAndFilteredTrains.map((train) => (
                        <TableRow key={train.train_number} onClick={() => handleTrainClick(train.train_number)} className="cursor-pointer">
                          <TableCell>
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{train.train_name}</span>
                              <span className="text-lg font-semibold text-muted-foreground">{train.train_number}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
                {!loading && sortedAndFilteredTrains.length === 0 && !error && (
                    <div className="text-center py-12 text-muted-foreground">
                        No live trains found matching your search.
                    </div>
                )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function AllLiveTrainsPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading...</div>}>
            <AllLiveTrainsContent />
        </Suspense>
    )
}
