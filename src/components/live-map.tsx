
'use client';

import * as React from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TrainFront, Bot } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface LiveTrainData {
    latitude: number;
    longitude: number;
    train_number: string;
    train_name: string;
    speed: number;
    delay: number;
    status_summary: string;
    next_station_name: string;
    next_arrival_minutes: number;
    distance_to_next_station_km: number;
}

interface DssRecommendation {
  trainId: string;
  action: 'Hold' | 'Proceed' | 'Reroute' | string;
  delayMinutes?: number;
  rerouteTrack?: string;
  priorityLevel?: number;
  reason: string;
  timestamp: string;
}

const trainColorMap = {
  blue: 'text-blue-600', // Moving
  red: 'text-red-600',   // Stopped
  green: 'text-green-500', // Proceed action or Searched
  yellow: 'text-yellow-500', // Hold action
  purple: 'text-purple-600', // Reroute/Conflict action
};

const createTrainIcon = (color: keyof typeof trainColorMap) => new L.DivIcon({
  html: ReactDOMServer.renderToString(
    <TrainFront className={`h-6 w-6 ${trainColorMap[color]} bg-white rounded-full p-1 shadow-lg`} />
  ),
  className: 'bg-transparent border-0',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const iconMapping = {
    defaultMoving: createTrainIcon('blue'),
    defaultStopped: createTrainIcon('red'),
    Proceed: createTrainIcon('green'),
    Hold: createTrainIcon('yellow'),
    Reroute: createTrainIcon('purple'),
    Conflict: createTrainIcon('purple'), // Alias for Reroute
    searched: createTrainIcon('green'),
};

const getIconForTrain = (train: LiveTrainData, recommendation: DssRecommendation | null, isSearched: boolean) => {
    if (isSearched) {
        return iconMapping.searched;
    }
    if (recommendation && recommendation.action in iconMapping) {
        return iconMapping[recommendation.action as keyof typeof iconMapping];
    }
    return train.speed > 5 ? iconMapping.defaultMoving : iconMapping.defaultStopped;
}

const formatTimeFromMinutes = (minutes: number) => {
    if (minutes < 0) return "N/A";
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const LiveMap: React.FC<{ trainNo: string | null }> = ({ trainNo }) => {
  const router = useRouter();
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);
  const markersRef = React.useRef<{ [key: string]: L.Marker }>({});
  const routeLayerRef = React.useRef<L.GeoJSON | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [recommendations, setRecommendations] = React.useState<{ [key: string]: DssRecommendation }>({});
  const showAll = !trainNo;

  // Effect for initializing the map
  React.useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
        const map = L.map(mapRef.current, {
            center: [27.1767, 78.0081], // Agra
            zoom: 8,
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '| Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Map style: &copy; <a href="https://www.OpenRailwayMap.org">OpenRailwayMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
        }).addTo(map);

        mapInstanceRef.current = map;
    }
  }, []);

  // Effect for listening to DSS recommendations
  React.useEffect(() => {
    const q = collection(db, "dssRecommendations");
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const newRecommendations: { [key: string]: DssRecommendation } = {};
        querySnapshot.forEach((doc) => {
            newRecommendations[doc.id] = doc.data() as DssRecommendation;
        });
        setRecommendations(newRecommendations);
    }, (err) => {
        console.error("Error fetching DSS recommendations:", err);
        setError("Could not connect to the DSS recommendation service.");
    });

    return () => unsubscribe();
  }, []);

  const createPopupContent = React.useCallback((train: LiveTrainData, recommendation: DssRecommendation | null): HTMLDivElement => {
    const container = document.createElement('div');
    container.className = 'w-64';
    
    let recommendationHtml = '';
    if (recommendation) {
        recommendationHtml = `
            <div class="mt-2 pt-2 border-t border-gray-200">
                <p class="font-bold text-primary flex items-center"><span class="mr-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg></span>DSS Action</p>
                <p><b>Action:</b> ${recommendation.action}</p>
                ${recommendation.delayMinutes ? `<p><b>Delay:</b> ${recommendation.delayMinutes} min</p>` : ''}
                ${recommendation.rerouteTrack ? `<p><b>Reroute:</b> ${recommendation.rerouteTrack}</p>` : ''}
                <p><b>Reason:</b> ${recommendation.reason}</p>
            </div>
        `;
    }

    const delayText = train.delay > 0 ? `${train.delay} mins late` : 'On Time';
    const nextArrival = formatTimeFromMinutes(train.next_arrival_minutes);

    container.innerHTML = `
        <div class="font-bold text-base">${train.train_name}</div>
        <div class="text-sm text-gray-500 mb-1">${train.train_number}</div>
        <p><b>Status:</b> ${train.status_summary || 'Running'}</p>
        <p><b>Speed:</b> ${train.speed} km/h</p>
        <p><b>Delay:</b> ${delayText}</p>
        <p><b>Next Stop:</b> ${train.next_station_name} (${nextArrival})</p>
        <p><b>Distance to Next:</b> ${train.distance_to_next_station_km?.toFixed(1) ?? 'N/A'} km</p>
        ${recommendationHtml}
    `;

    const statusButton = document.createElement('button');
    statusButton.innerHTML = 'View Live Status';
    statusButton.className = 'mt-2 w-full text-white bg-primary hover:bg-primary/90 focus:ring-4 focus:outline-none focus:ring-primary/50 font-medium rounded-lg text-sm px-4 py-2 text-center';
    statusButton.onclick = () => {
        const today = new Date().toISOString().split('T')[0];
        router.push(`/live-status?trainNo=${train.train_number}&date=${today}`);
    };
    container.appendChild(statusButton);
    
    return container;
  }, [router]);
  
  const updateMarkers = React.useCallback((trains: LiveTrainData[]) => {
    if (!mapInstanceRef.current) return;
    
    const currentMarkers = markersRef.current;
    const newTrainNumbers = new Set(trains.map(t => t.train_number));

    // Remove old markers for trains that are no longer in the live feed,
    // but don't remove the currently searched train.
    Object.keys(currentMarkers).forEach(trainNumber => {
      if (!newTrainNumbers.has(trainNumber) && trainNumber !== trainNo) {
        mapInstanceRef.current?.removeLayer(currentMarkers[trainNumber]);
        delete currentMarkers[trainNumber];
      }
    });

    // Add or update markers
    trains.forEach(train => {
      const lat = train.latitude;
      const lng = train.longitude;
      
      if (lat && lng) {
        const isSearchedTrain = trainNo === train.train_number;
        const rec = recommendations[train.train_number];
        const icon = getIconForTrain(train, rec || null, isSearchedTrain);
        const popupContent = createPopupContent(train, rec || null);

        if (currentMarkers[train.train_number]) {
          currentMarkers[train.train_number].setLatLng([lat, lng]).setIcon(icon).setPopupContent(popupContent);
        } else {
          const marker = L.marker([lat, lng], { icon })
            .bindPopup(popupContent)
            .addTo(mapInstanceRef.current!);
          currentMarkers[train.train_number] = marker;
        }
      }
    });
  }, [createPopupContent, recommendations, trainNo]);

  // Effect for fetching ALL live trains
  React.useEffect(() => {
    if (!showAll) {
      // If showAll is false, remove all non-searched train markers
      if (mapInstanceRef.current) {
        Object.keys(markersRef.current).forEach(key => {
          if (key !== trainNo) {
            mapInstanceRef.current!.removeLayer(markersRef.current[key]);
            delete markersRef.current[key];
          }
        });
      }
      return;
    }

    const fetchAllTrains = async () => {
        setError(null);
        try {
            const response = await fetch('/api/all-live-trains');
            if (!response.ok) throw new Error('Failed to fetch data for all live trains.');
            const data = await response.json();
            
            if (Array.isArray(data)) {
                 const trains: LiveTrainData[] = data.map((train: any) => ({
                    train_number: train.train_number,
                    train_name: train.train_name,
                    latitude: train.latitude,
                    longitude: train.longitude,
                    speed: train.speed,
                    delay: train.delay,
                    status_summary: train.status_summary,
                    next_station_name: train.next_station_name,
                    next_arrival_minutes: train.next_arrival_minutes,
                    distance_to_next_station_km: train.distance_to_next_station_km
                }))
                updateMarkers(trains);
            } else {
                console.warn("Unexpected data structure from /api/all-live-trains", data)
            }
        } catch (err: any) {
            console.error("All trains fetch error:", err);
            setError(err.message);
        }
    };

    fetchAllTrains();
    const interval = setInterval(fetchAllTrains, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval);
  }, [showAll, trainNo, updateMarkers]);


  // Effect for fetching a SINGLE searched train and its route
  React.useEffect(() => {
    if (!trainNo || !mapInstanceRef.current) {
        // If trainNo is cleared, remove the route layer
        if (!trainNo && routeLayerRef.current && mapInstanceRef.current) {
             mapInstanceRef.current.removeLayer(routeLayerRef.current);
             routeLayerRef.current = null;
        }
        return;
    }

    const fetchSearchedTrain = async () => {
        setError(null);
        try {
            const date = new Date().toISOString().split('T')[0];
            const response = await fetch(`/api/live-status?trainNo=${trainNo}&date=${date}`);
            if (!response.ok) throw new Error(`Could not fetch live status for train ${trainNo}.`);
            const statusData = await response.json();
            const trainData = statusData.data;

            if (trainData && trainData.latitude && trainData.longitude) {
                const singleTrain: LiveTrainData = { 
                    latitude: trainData.latitude,
                    longitude: trainData.longitude,
                    speed: trainData.speed ?? 0,
                    train_number: trainData.train.train_number,
                    train_name: trainData.train.train_name,
                    delay: trainData.delay,
                    status_summary: trainData.status_summary,
                    next_station_name: trainData.next_station_name,
                    next_arrival_minutes: 0, // Placeholder, main data comes from all-live-trains
                    distance_to_next_station_km: 0, // Placeholder
                };
                
                updateMarkers([singleTrain]);
                
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([singleTrain.latitude, singleTrain.longitude], 12);
                    setTimeout(() => {
                        if (markersRef.current[trainNo]) {
                            markersRef.current[trainNo].openPopup();
                        }
                    }, 500);
                }

            } else {
                 throw new Error(`Live data not currently available for train ${trainNo}.`);
            }
            
            // Fetch route geometry after successfully finding the train
            const routeResponse = await fetch(`/api/route-geometry?trainNo=${trainNo}`);
             if (routeResponse.ok) {
                const routeData = await routeResponse.json();
                if (routeLayerRef.current) routeLayerRef.current.remove();
                if(mapInstanceRef.current) {
                    routeLayerRef.current = L.geoJSON(routeData.data, { style: { color: '#4F46E5', weight: 5, opacity: 0.7 } }).addTo(mapInstanceRef.current);
                }
            } else {
                console.warn(`Could not fetch route geometry for train ${trainNo}.`)
            }
        } catch(err: any) {
            console.error("Searched train fetch error:", err);
            setError(err.message);
        }
    };
    
    fetchSearchedTrain(); // Fetch immediately when trainNo changes
    const interval = setInterval(fetchSearchedTrain, 15000); // And refresh every 15s

    return () => clearInterval(interval); // Cleanup on unmount/re-run
  }, [trainNo, updateMarkers]);

  return (
    <>
        {error && (
            <div className="absolute top-24 sm:top-48 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md p-4">
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        )}
        <div ref={mapRef} className="absolute inset-0 z-0 h-full w-full" />
    </>
  );
};

export default LiveMap;
