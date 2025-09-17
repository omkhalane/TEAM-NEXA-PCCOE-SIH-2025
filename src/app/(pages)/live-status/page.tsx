

'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Gauge, Navigation, TramFront, AlertCircle, CalendarIcon, Info, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Autocomplete, type Suggestion } from '@/components/ui/autocomplete';
import { Input } from '@/components/ui/input';

interface TimelineStop {
    station_name: string;
    scheduled_arrival: string;
    actual_arrival: string;
    scheduled_departure: string;
    actual_departure: string;
    delay: number;
    platform: string | number;
    status: 'Departed' | 'Current' | 'Upcoming';
    halt_minutes: number;
}

interface LiveStatusData {
    train: {
        train_name: string;
        train_number: string;
    };
    current_station_name: string;
    latitude: number | null;
    longitude: number | null;
    delay: number;
    speed: number;
    next_station_name: string;
    current_platform: string | number;
    last_updated_at: string;
    status_summary: string;
    timeline: TimelineStop[];
}

function LiveStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trainNo = searchParams.get('trainNo');
  const date = searchParams.get('date');

  const [searchTrain, setSearchTrain] = useState<Suggestion | null>(null);
  const [searchDate, setSearchDate] = useState(date || new Date().toISOString().split('T')[0]);

  const [liveData, setLiveData] = useState<LiveStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveStatus = useCallback(async (isInitialLoad = false) => {
      if (!trainNo || !date) {
          if (isInitialLoad) setLoading(false);
          return;
      }
      if (isInitialLoad) {
          setLoading(true);
          setError(null);
          setLiveData(null);
      }
      try {
        const response = await fetch(`/api/live-status?trainNo=${trainNo}&date=${date}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch live status');
        }
        const data = await response.json();
        setLiveData(data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        if (isInitialLoad) setLoading(false);
      }
  }, [trainNo, date]);

  useEffect(() => {
    fetchLiveStatus(true); // Initial fetch

    const interval = setInterval(() => {
        fetchLiveStatus(false); // Subsequent fetches every 30 seconds
    }, 30000);

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [fetchLiveStatus]);

  const handleSearch = () => {
    if (searchTrain && searchDate) {
        router.push(`/live-status?trainNo=${searchTrain.value}&date=${searchDate}`);
    }
  }

  const getDelayColor = (delay: number) => {
    if (delay <= 0) return 'text-green-600';
    if (delay > 0 && delay <= 30) return 'text-orange-500';
    return 'text-destructive';
  }

  const getTimelineBadgeVariant = (status: string) => {
    if (status === 'Current') return 'default';
    if (status === 'Departed') return 'secondary';
    return 'outline';
  }

  const getTimelineLineClass = (status: string, isFirst: boolean) => {
      if (isFirst && status !== 'Departed') return 'hidden'
      if (status === 'Departed') return 'bg-blue-500'
      if (status === 'Current') return 'bg-destructive'
      return 'bg-muted-foreground/50'
  }

  const getTimelineDotClass = (status: string) => {
       if (status === 'Current') return 'bg-destructive ring-4 ring-destructive/30'
       if (status === 'Departed') return 'bg-blue-500'
       return 'bg-muted-foreground'
  }


  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-secondary/50">
        <div className="container mx-auto px-4 py-8">
            <Card className="mb-8">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center justify-between">
                        <CardTitle>Search Live Status</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <div className="w-full sm:w-64">
                                <Autocomplete 
                                    type="trains"
                                    placeholder="Train No. or Name"
                                    onSelect={setSearchTrain}
                                />
                            </div>
                            <Input type="date" placeholder="Journey Date" className="w-full sm:w-auto" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} />
                            <Button onClick={handleSearch} disabled={!searchTrain || !searchDate} className="w-full sm:w-auto">Search</Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

          {loading && (
            <>
              <Card className="mb-8">
                <CardHeader>
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Live Timeline</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full"/>
                    ))}
                </CardContent>
              </Card>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !error && !liveData && (
             <Card>
                <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground py-8">
                        {trainNo && date ? 'Could not find live status for this train and date.' : 'Please search for a train to see its live status.'}
                    </div>
                </CardContent>
             </Card>
          )}

          {liveData && (
            <>
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-xl md:text-2xl">{liveData.train.train_number} - {liveData.train.train_name}</CardTitle>
                  <CardDescription className="flex flex-col sm:flex-row sm:items-center sm:gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5"><CalendarIcon size={14}/> Journey Date: {new Date(searchDate || '').toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric'})}</span>
                    <span className="hidden sm:block">|</span>
                    <span className="flex items-center gap-1.5"><Clock size={14}/> Last Updated: {new Date(liveData.last_updated_at).toLocaleTimeString('en-IN')}</span>
                  </CardDescription>
                  {liveData.status_summary &&
                    <Alert className="mt-4">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Status</AlertTitle>
                        <AlertDescription>{liveData.status_summary}</AlertDescription>
                    </Alert>
                  }
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-center">
                    <div className="p-4 bg-secondary rounded-lg flex flex-col justify-center">
                        <p className="text-sm font-medium text-muted-foreground">Current Speed</p>
                        <p className="text-lg font-semibold flex items-center justify-center gap-2"><Gauge size={16} className="text-primary"/> {liveData.speed} km/h</p>
                    </div>
                     <div className="p-4 bg-secondary rounded-lg flex flex-col justify-center">
                        <p className="text-sm font-medium text-muted-foreground">Overall Delay</p>
                        <p className={`text-lg font-semibold flex items-center justify-center gap-2 ${getDelayColor(liveData.delay)}`}><Clock size={16} /> {liveData.delay > 0 ? `${liveData.delay} Mins` : 'On Time'}</p>
                    </div>
                     <div className="p-4 bg-secondary rounded-lg flex flex-col justify-center">
                        <p className="text-sm font-medium text-muted-foreground">Next Halt</p>
                        <p className="text-lg font-semibold flex items-center justify-center gap-2"><TramFront size={16} className="text-primary"/> {liveData.next_station_name}</p>
                    </div>
                     <div className="p-4 bg-secondary rounded-lg flex flex-col justify-center">
                        <p className="text-sm font-medium text-muted-foreground">Current Platform</p>
                        <p className="text-lg font-semibold flex items-center justify-center gap-2"><Gauge size={16} className="text-primary"/> PF {liveData.current_platform || 'Upcoming'}</p>
                    </div>
                    <div className="p-4 bg-secondary rounded-lg flex flex-col justify-center">
                        <p className="text-sm font-medium text-muted-foreground">Live Position</p>
                        <p className="text-lg font-semibold flex items-center justify-center gap-2 truncate"><MapPin size={16} className="text-primary"/> {liveData.latitude ? `${liveData.latitude.toFixed(4)}, ${liveData.longitude?.toFixed(4)}` : 'Upcoming'}</p>
                    </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Live Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                   <ul className="space-y-4">
                    {liveData.timeline.map((stop, index) => (
                        <li key={index} className="relative pl-8">
                             <div className={`absolute left-[10px] top-4 h-full w-0.5 ${getTimelineLineClass(stop.status, index === 0)}`}></div>
                            <div className={`absolute left-0 top-4 h-6 w-6 rounded-full flex items-center justify-center ${getTimelineDotClass(stop.status)}`}>
                               {stop.status === 'Current' && <div className="h-2 w-2 bg-destructive-foreground rounded-full"/>}
                            </div>

                            <div className="p-4 rounded-lg border bg-background">
                                <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-2">
                                    <p className="font-semibold">{stop.station_name}</p>
                                    <Badge variant={getTimelineBadgeVariant(stop.status)}>{stop.status}</Badge>
                                </div>
                                <Separator className="my-2"/>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 text-sm">
                                    <div><p className="text-muted-foreground">Sch. Arrival</p><p>{stop.scheduled_arrival}</p></div>
                                    <div><p className="text-muted-foreground">Actual Arrival</p><p>{stop.actual_arrival || 'Upcoming'}</p></div>
                                    <div><p className="text-muted-foreground">Sch. Departure</p><p>{stop.scheduled_departure}</p></div>
                                    <div><p className="text-muted-foreground">Actual Dept.</p><p>{stop.actual_departure || 'Upcoming'}</p></div>
                                    <div><p className="text-muted-foreground">Halt / Delay</p><p>{stop.halt_minutes}m / <span className={getDelayColor(stop.delay)}>{stop.delay > 0 ? `${stop.delay}m` : 'On Time'}</span></p></div>
                                </div>
                            </div>
                        </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}


export default function LiveStatusPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading...</div>}>
            <LiveStatusContent />
        </Suspense>
    )
}
