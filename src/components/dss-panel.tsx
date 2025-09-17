
"use client";

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Zap, SkipForward, Ban, Play, AlertCircle, CheckCircle, Percent, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Progress } from './ui/progress';
import { type Suggestion } from '@/lib/dss-engine';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


const getActionIcon = (action: string) => {
  switch (action) {
    case 'Proceed':
      return <Play className="h-4 w-4 text-green-500" />;
    case 'Hold':
      return <Ban className="h-4 w-4 text-yellow-500" />;
    case 'Reroute':
      return <SkipForward className="h-4 w-4 text-purple-500" />;
    default:
      return <Bot className="h-4 w-4" />;
  }
};

const getActionBadgeVariant = (action: string) => {
    switch(action) {
        case 'Proceed': return 'default';
        case 'Hold': return 'secondary';
        case 'Reroute': return 'destructive';
        default: return 'outline';
    }
}


export function DssPanel({ suggestions, onAccept, onReject, isRefreshing }: { suggestions: Suggestion[], onAccept: (suggestionId: string) => void, onReject: (suggestionId: string) => void, isRefreshing: boolean }) {

  return (
    <>
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot /> AI Decision Feed
        </CardTitle>
        <CardDescription>Live operational recommendations from the AI engine.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-4 p-4">
            {isRefreshing && (
                 <div className="w-full flex items-center justify-center text-muted-foreground p-8 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Initializing DSS engine...</span>
                </div>
            )}
            {!isRefreshing && suggestions.length === 0 && (
                <div className="w-full text-center py-4 text-muted-foreground">
                    <p>No active AI recommendations.</p>
                </div>
            )}
            
            {!isRefreshing && suggestions.map((rec) => (
              <AlertDialog key={rec.suggestionId}>
                <Card className='shadow-md hover:shadow-lg transition-shadow w-96 shrink-0 flex flex-col'>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex flex-col justify-between items-start gap-2">
                             <div className="flex justify-between w-full items-start">
                                <span className="text-sm whitespace-normal">Conflict: {rec.trains.join(' vs ')}</span>
                                <Badge variant={getActionBadgeVariant(rec.action)} className="ml-2 shrink-0">
                                    {getActionIcon(rec.action)}
                                    <span className="ml-1">Precedence to {rec.suggestedFirst}</span>
                                </Badge>
                             </div>
                        </CardTitle>
                        <CardDescription>Conflict at {rec.stationCode} Platform {rec.platform}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-3 flex-grow">
                        <p className="whitespace-normal"><b>Reason:</b> <span className="text-muted-foreground">{rec.reason}</span></p>
                        <p><b>Impact:</b> <span className="font-semibold text-green-600">Save ~{rec.estimatedPassengerDelaySavedMin} min total delay</span></p>
                        <div className="flex items-center gap-2">
                           <b>Confidence:</b>
                           <Progress value={rec.confidencePercent} className="w-24 h-2" />
                           <span className='font-semibold'>{rec.confidencePercent}%</span>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 p-3">
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <AlertCircle className="mr-2 h-4 w-4"/>
                                Reject
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                             <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Rejection</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action will be logged. Are you sure you want to reject this AI recommendation?
                                </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onReject(rec.suggestionId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Confirm Reject
                                </AlertDialogAction>
                             </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                      <AlertDialog>
                           <AlertDialogTrigger asChild>
                            <Button size="sm">
                                <CheckCircle className="mr-2 h-4 w-4"/>
                                Accept
                            </Button>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Acceptance</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action will be logged and KPIs will be updated. Are you sure you want to accept this AI recommendation?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onAccept(rec.suggestionId)}>
                                    Confirm Accept
                                </AlertDialogAction>
                            </AlertDialogFooter>
                           </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                </Card>
              </AlertDialog>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
    </>
  );
}
