'use client';

import { useEffect, useState, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Clock, FastForward, Timer } from 'lucide-react';
import { Autocomplete, type Suggestion } from '@/components/ui/autocomplete';
import { Button } from '@/components/ui/button';

interface Train {
  trainNumber: string;
  trainName: string;
  sourceStationCode: string;
  destinationStationCode: string;
  fromStationSchedule: {
    arrivalMinutes: number;
    departureMinutes: number;
    day: number;
    platform: string;
    distanceFromSourceKm: number;
  };
  toStationSchedule: {
    arrivalMinutes: number;
    departureMinutes: number;
    day: number;
    platform: string;
    distanceFromSourceKm: number;
  };
}

const formatTime = (minutes: number) => {
    if (minutes === -1) return 'N/A';
    const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mins = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${mins}`;
}

const getDurationInMinutes = (from: number, to: number) => {
    let diff = to - from;
    if (diff < 0) diff += 24 * 60; // Handles overnight journeys
    return diff;
}

const formatDuration = (totalMinutes: number) => {
    if (totalMinutes < 0) return 'N/A';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
}

function BetweenStationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const [fromStation, setFromStation] = useState<Suggestion | null>(null);
  const [toStation, setToStation] = useState<Suggestion | null>(null);

  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (from && to) {
      const fetchTrains = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/between-stations?from=${from}&to=${to}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch train data');
          }
          const data = await response.json();
          setTrains(data.data || []);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchTrains();
    }
  }, [from, to]);
  
  const handleTrainClick = (trainNumber: string) => {
    const today = new Date().toISOString().split('T')[0];
    router.push(`/live-status?trainNo=${trainNumber}&date=${today}`);
  }

  const handleFindTrains = () => {
    if (fromStation && toStation) {
      router.push(`/between-stations?from=${fromStation.value}&to=${toStation.value}`);
    }
  };

  const summary = useMemo(() => {
    if (trains.length === 0) return null;

    const earliestTrain = [...trains].sort((a, b) => a.fromStationSchedule.departureMinutes - b.fromStationSchedule.departureMinutes)[0];
    const lastTrain = [...trains].sort((a, b) => b.fromStationSchedule.departureMinutes - a.fromStationSchedule.departureMinutes)[0];
    
    const fastestTrain = [...trains].reduce((fastest, current) => {
      const fastestDuration = getDurationInMinutes(fastest.fromStationSchedule.departureMinutes, fastest.toStationSchedule.arrivalMinutes);
      const currentDuration = getDurationInMinutes(current.fromStationSchedule.departureMinutes, current.toStationSchedule.arrivalMinutes);
      return currentDuration < fastestDuration ? current : fastest;
    });
    
    const fastestDurationMins = getDurationInMinutes(fastestTrain.fromStationSchedule.departureMinutes, fastestTrain.toStationSchedule.arrivalMinutes);

    return {
      earliest: {
        time: formatTime(earliestTrain.fromStationSchedule.departureMinutes),
        name: earliestTrain.trainName
      },
      last: {
        time: formatTime(lastTrain.fromStationSchedule.departureMinutes),
        name: lastTrain.trainName,
      },
      fastest: {
        duration: formatDuration(fastestDurationMins),
        name: fastestTrain.trainName
      }
    };
  }, [trains]);


  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-secondary/50">
        <div className="container mx-auto px-4 py-8">
            <Card className='mb-8'>
              <CardHeader>
                <CardTitle>Trains Between Stations</CardTitle>
                <CardDescription>
                  Find all available trains between two stations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Autocomplete
                    type="stations"
                    placeholder="From Station"
                    onSelect={setFromStation}
                />
                <Autocomplete
                    type="stations"
                    placeholder="To Station"
                    onSelect={setToStation}
                />
                <Button className="w-full" onClick={handleFindTrains} disabled={!fromStation || !toStation}>Find Trains</Button>
                <p className="text-xs text-muted-foreground">
                  Enter station name or code (e.g., NDLS or New Delhi).
                </p>
              </CardContent>
            </Card>

            {from && to && (
              <>
                {error && (
                  <Alert variant="destructive" className="mt-8">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {loading && (
                    <Card className="mt-8">
                        <CardHeader><Skeleton className="h-8 w-2/3"/></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!loading && !error && trains.length > 0 && (
                   <Card className="mt-8">
                    <CardHeader>
                      <CardTitle>
                        Showing {trains.length} trains from {from} to {to}
                      </CardTitle>
                        {summary && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Earliest Train</CardTitle>
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{summary.earliest.time}</div>
                                        <p className="text-xs text-muted-foreground truncate">{summary.earliest.name}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Last Train</CardTitle>
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{summary.last.time}</div>
                                        <p className="text-xs text-muted-foreground truncate">{summary.last.name}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Fastest Train</CardTitle>
                                        <FastForward className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{summary.fastest.duration}</div>
                                        <p className="text-xs text-muted-foreground truncate">{summary.fastest.name}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Train</TableHead>
                              <TableHead>Departure</TableHead>
                              <TableHead>Arrival</TableHead>
                              <TableHead className="hidden sm:table-cell">Duration</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {trains.map((train) => (
                              <TableRow key={train.trainNumber} onClick={() => handleTrainClick(train.trainNumber)} className="cursor-pointer">
                                <TableCell>
                                  <div className="font-medium">{train.trainName}</div>
                                  <div className="text-sm text-muted-foreground">{train.trainNumber}</div>
                                </TableCell>
                                <TableCell>{formatTime(train.fromStationSchedule.departureMinutes)}</TableCell>
                                <TableCell>{formatTime(train.toStationSchedule.arrivalMinutes)}</TableCell>
                                <TableCell className="hidden sm:table-cell">{formatDuration(getDurationInMinutes(train.fromStationSchedule.departureMinutes, train.toStationSchedule.arrivalMinutes))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!loading && !error && trains.length === 0 && (
                    <Card className="mt-8">
                        <CardContent className="pt-6">
                            <div className="text-center py-12 text-muted-foreground">
                                No trains found between these stations for the selected criteria.
                            </div>
                        </CardContent>
                    </Card>
                )}
              </>
            )}

        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function BetweenStationsPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading...</div>}>
            <BetweenStationsContent />
        </Suspense>
    )
}
