
'use client';

import * as React from 'react';
import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  BarChart2,
  BrainCircuit,
  Zap,
  Clock,
  Users,
  Box,
  ShieldAlert,
  Map,
  AlertTriangle,
  MapPin,
  Waypoints,
  UserCheck,
  CheckCircle2,
  LineChart,
  HardHat,
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Toaster } from '@/components/ui/toaster';
import { DssPanel } from '@/components/dss-panel';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge';
import { runUpdate, type DssOutput, type Suggestion } from '@/lib/dss-engine';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { useTime } from '@/context/TimeContext';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog"


const getSeverityColor = (severity: "High" | "Medium" | "Low") => {
    if (severity === 'High') return 'text-red-500';
    if (severity === 'Medium') return 'text-yellow-500';
    return 'text-green-500';
}

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--primary))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--secondary))",
  },
} satisfies ChartConfig

function DssCorridorPageContent() {
  const router = useRouter();
  const [dssData, setDssData] = useState<DssOutput | null>(null);
  const { time, setTime } = useTime();
  const isManuallyChanged = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const timeRef = useRef(time);
  const manualChangeTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timeRef.current = time;
    isManuallyChanged.current = true;
    if (manualChangeTimeout.current) clearTimeout(manualChangeTimeout.current);
    manualChangeTimeout.current = setTimeout(() => {
        isManuallyChanged.current = false;
    }, 4000);
  }, [time]);

  const updateData = useCallback(() => {
    const [hours, minutes] = timeRef.current.split(':').map(Number);
    const now = new Date();
    // Use a fixed date for deterministic simulation, but real time for hours/minutes
    now.setUTCFullYear(2025, 8, 22); // Month is 0-indexed, so 8 is September
    now.setUTCHours(hours, minutes, 0, 0);

    const data = runUpdate(now);
    setDssData(data);
    setIsRefreshing(false);
  }, []);
  
  useEffect(() => {
    updateData(); // Initial load

    const interval = setInterval(() => {
      if (!isManuallyChanged.current) {
        setTime(prevTime => {
          const [h, m] = prevTime.split(':').map(Number);
          const date = new Date();
          date.setHours(h, m);
          date.setMinutes(date.getMinutes() + 3);
          const newH = date.getHours().toString().padStart(2, '0');
          const newM = date.getMinutes().toString().padStart(2, '0');
          return `${newH}:${newM}`;
        });
      }
    }, 3 * 60 * 1000); 

    return () => clearInterval(interval);
  }, [setTime, updateData]);

  // This effect runs when `time` changes, triggering a re-render and data update
  useEffect(() => {
    updateData();
  }, [time, updateData]);


  const handleAcceptSuggestion = useCallback((suggestionId: string) => {
    setDssData(prevData => {
        if (!prevData) return null;

        const acceptedSuggestion = prevData.aiSuggestions.find(s => s.suggestionId === suggestionId);
        const updatedSuggestions = prevData.aiSuggestions.filter(s => s.suggestionId !== suggestionId);
        const updatedKPIs = { ...prevData.computedKPIs };

        updatedKPIs.avgDelayMinutes = Math.max(0, parseFloat((updatedKPIs.avgDelayMinutes - (Math.random() * 0.5 + 0.1)).toFixed(1)));
        updatedKPIs.onTimePercent = Math.min(100, Math.round(updatedKPIs.onTimePercent + (Math.random() * 1 + 0.5)));
        updatedKPIs.conflictResolutionTime = Math.max(1, parseFloat((updatedKPIs.conflictResolutionTime - (Math.random() * 0.3 + 0.1)).toFixed(1)));
        updatedKPIs.avgPassengerDelay = Math.max(0, parseFloat((updatedKPIs.avgPassengerDelay - (Math.random() * 0.4 + 0.1)).toFixed(1)));

        toast({
            title: `Action: Accepted`,
            description: `Recommendation for conflict ${acceptedSuggestion?.conflictId} has been accepted. KPIs updated.`,
        });

        // Auto-refresh if this was the last suggestion
        if (updatedSuggestions.length === 0) {
            setIsRefreshing(true);
            setTimeout(() => {
                setTime(prevTime => {
                    const [h, m] = prevTime.split(':').map(Number);
                    const date = new Date();
                    date.setHours(h, m);
                    date.setMinutes(date.getMinutes() + 1); // Advance time slightly
                    const newH = date.getHours().toString().padStart(2, '0');
                    const newM = date.getMinutes().toString().padStart(2, '0');
                    isManuallyChanged.current = true;
                    return `${newH}:${newM}`;
                });
            }, 1500); // Wait for toast to be visible
        }

        return {
            ...prevData,
            aiSuggestions: updatedSuggestions,
            computedKPIs: updatedKPIs
        };
    });
  }, [setTime]);

  const handleRejectSuggestion = useCallback((suggestionId: string) => {
      const rejectedSuggestion = dssData?.aiSuggestions.find(s => s.suggestionId === suggestionId);
      if (dssData && rejectedSuggestion) {
         setDssData(prevData => {
            if (!prevData) return null;
            const updatedSuggestions = prevData.aiSuggestions.filter(s => s.suggestionId !== suggestionId);
            
            // Auto-refresh if this was the last suggestion
            if (updatedSuggestions.length === 0) {
                setIsRefreshing(true);
                setTimeout(() => {
                  setTime(prevTime => {
                      const [h, m] = prevTime.split(':').map(Number);
                      const date = new Date();
                      date.setHours(h, m);
                      date.setMinutes(date.getMinutes() + 1); // Advance time slightly
                      const newH = date.getHours().toString().padStart(2, '0');
                      const newM = date.getMinutes().toString().padStart(2, '0');
                      isManuallyChanged.current = true;
                      return `${newH}:${newM}`;
                  });
                }, 1500); // Wait for toast to be visible
            }

            return {
                ...prevData,
                aiSuggestions: updatedSuggestions,
            }
         });
         toast({
            title: `Action: Rejected`,
            description: `Recommendation for conflict ${rejectedSuggestion.conflictId} has been rejected.`,
            variant: "destructive"
        });
      }
  }, [dssData, setTime]);


  if (!dssData) {
    return <div className="h-screen w-full flex items-center justify-center">Initializing DSS Engine...</div>;
  }
  
  const { computedKPIs, conflicts, aiSuggestions } = dssData;

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <main className="flex-1 overflow-y-auto bg-secondary/50 p-4 lg:p-8">
        <div className="flex flex-col gap-6">
            
            <DssPanel 
              suggestions={aiSuggestions} 
              onAccept={handleAcceptSuggestion} 
              onReject={handleRejectSuggestion}
              isRefreshing={isRefreshing}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BarChart2 className="text-primary"/> KPIs & Analytics</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex flex-col space-y-1">
                                <span className="text-muted-foreground">Throughput</span>
                                <span className="font-semibold">{computedKPIs.throughputTrainsPerHour} trains/hr</span>
                            </div>
                             <div className="flex flex-col space-y-1">
                                <span className="text-muted-foreground">Avg. Delay</span>
                                <span className="font-semibold">{computedKPIs.avgDelayMinutes} min</span>
                            </div>
                             <div className="flex flex-col space-y-1">
                                <span className="text-muted-foreground">On-Time %</span>
                                <span className="font-semibold">{computedKPIs.onTimePercent}%</span>
                            </div>
                             <div className="flex flex-col space-y-1">
                                <span className="text-muted-foreground">Resolution Time</span>
                                <span className="font-semibold">{computedKPIs.conflictResolutionTime} min</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Waypoints className="text-primary"/> Infrastructure Utilization</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                             <div className="flex justify-between"><span>Platform Utilization:</span> <span className="font-semibold">{computedKPIs.platformUtilizationPercent['3'] || 78}%</span></div>
                             <div className="font-medium mt-2">Track Utilization:</div>
                             {computedKPIs.trackUtilization ? (
                               <ul className="list-disc list-inside text-muted-foreground pl-2">
                                  <li>NDLS–PALWAL: <span className="font-semibold text-foreground">{computedKPIs.trackUtilization.A}%</span></li>
                                  <li>PALWAL–MTJ: <span className="font-semibold text-foreground">{computedKPIs.trackUtilization.B}%</span></li>
                                  <li>MTJ–AGRA: <span className="font-semibold text-foreground">{computedKPIs.trackUtilization.C}%</span></li>
                               </ul>
                              ) : <p className="text-muted-foreground text-xs">No track utilization data.</p>}
                             <div className="font-medium mt-2">Yard Utilization:</div>
                              {computedKPIs.yardUtilization ? (
                                <ul className="list-disc list-inside text-muted-foreground pl-2">
                                  <li>Yard X: <span className="font-semibold text-foreground">{computedKPIs.yardUtilization.X}%</span></li>
                                  <li>Yard Y: <span className="font-semibold text-foreground">{computedKPIs.yardUtilization.Y}%</span></li>
                                </ul>
                              ) : <p className="text-muted-foreground text-xs">No yard utilization data.</p>}
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-col gap-6">
                   <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-yellow-500"/> Conflict Alerts</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {conflicts.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No conflicts detected in the next {dssData.relevantWindowMinutes} minutes.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Location</TableHead>
                                            <TableHead>Time To Conflict</TableHead>
                                            <TableHead>Severity</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {conflicts.slice(0, 4).map(c => (
                                        <TableRow key={c.conflictId}>
                                            <TableCell className="font-medium">{c.stationCode} - Platform {c.platform}</TableCell>
                                            <TableCell>{c.timeToConflictMinutes} min</TableCell>
                                            <TableCell className={getSeverityColor(c.severity)}>{c.severity}</TableCell>
                                        </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ShieldAlert className="text-red-500"/> Safety & Reliability</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                           <div className="flex justify-between"><span>Signal Failures (1hr):</span> <span className="font-semibold">{computedKPIs.signalFailures}</span></div>
                           <div className="flex justify-between"><span>Emergency Holds:</span> <span className="font-semibold">{computedKPIs.emergencyHolds}</span></div>
                           <div className="flex justify-between"><span>Maintenance Blocks:</span> <span className="font-semibold">{computedKPIs.maintenanceBlocks} Active</span></div>
                           <div className="flex justify-between"><span>AI Safety Overrides:</span> <span className="font-semibold">{computedKPIs.aiSafetyOverrides}</span></div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-col gap-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><UserCheck className="text-primary"/> Passenger-Centric KPIs</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                           <div className="flex justify-between"><span>Passengers Affected (1hr):</span> <span className="font-semibold">{computedKPIs.passengersAffectedNextHour?.toLocaleString() ?? 'N/A'}</span></div>
                           <div className="flex justify-between"><span>Average Passenger Delay:</span> <span className="font-semibold">{computedKPIs.avgPassengerDelay} min</span></div>
                           <div className="flex justify-between"><span>Priority Train Punctuality:</span> <span className="font-semibold">{computedKPIs.priorityTrainPunctuality}%</span></div>
                           <div className="flex justify-between"><span>Suburban/Local On-Time Rate:</span> <span className="font-semibold">{computedKPIs.suburbanOnTimeRate}%</span></div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Box className="text-primary"/> Freight-Centric KPIs</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                           <div className="flex justify-between"><span>Avg. Freight Delay:</span> <span className="font-semibold">{computedKPIs.freightTrainDelay} min</span></div>
                           <div className="flex justify-between"><span>Volume Moved (hr):</span> <span className="font-semibold">{computedKPIs.goodsVolumeMoved} tons</span></div>
                           <div className="flex justify-between"><span>Freight Priority Decisions:</span> <span className="font-semibold">{computedKPIs.freightPriorityDecisions}%</span></div>
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}

export default function DssCorridorPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center">Loading Page...</div>}>
            <DssCorridorPageContent />
        </Suspense>
    )
}
