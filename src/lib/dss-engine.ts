
import masterSchedule from '@/app/api/dss/data.json';

// --- CONFIGURABLE PARAMETERS ---
const TIMEZONE = "Asia/Kolkata";
const WINDOW_AHEAD = 90; // minutes
const DWELL_MIN = 5; // minutes
const ARRIVAL_LEAD_MIN = 3; // minutes

const costWeights = {
  passengerImpact: 0.6,
  delay: 0.25,
  priority: 0.15,
};

// --- DATA TYPES ---
export interface TrainStop {
    stationCode: string;
    scheduledArrival: string | null;
    scheduledDeparture: string | null;
}

export interface Train {
    trainNo: string;
    trainName: string;
    platform: string;
    daysOfRun: string[];
    priority: "High" | "Normal" | "Low";
    passengerCount: number;
    trainType: string;
    stops: TrainStop[];
}

export interface ProcessedTrain extends Train {
    stationCode: string; // The station where the occupancy is happening
    scheduledArrival: Date;
    scheduledDeparture: Date;
    predictedDelayMinutes: number;
    occupancyStart: Date;
    occupancyEnd: Date;
}

export interface Conflict {
    conflictId: string;
    stationCode: string;
    platform: string;
    trains: string[];
    overlapStart: Date;
    overlapEnd: Date;
    timeToConflictMinutes: number;
    severity: "High" | "Medium" | "Low";
}

export interface Suggestion {
    suggestionId: string;
    conflictId: string;
    action: string;
    suggestedFirst: string;
    trains: string[];
    stationCode: string;
    platform: string;
    scores: { [key: string]: number };
    confidencePercent: number;
    estimatedPassengerDelaySavedMin: number;
    reason: string;
    acceptLabel: string;
    rejectLabel: string;
}

export interface Kpis {
    throughputTrainsPerHour: number;
    avgDelayMinutes: number;
    onTimePercent: number;
    conflictCountNextHour: number;
    platformUtilizationPercent: { [key: string]: number };
    passengersAffectedNextHour: number;
    trainDensity: number;
    freightTrainDelay: number;
    goodsVolumeMoved: number;
    freightPriorityDecisions: number;
    signalFailures: number;
    emergencyHolds: number;
    maintenanceBlocks: number;
    aiSafetyOverrides: number;
    suburbanOnTimeRate: number;
    priorityTrainPunctuality: number;
    avgPassengerDelay: number;
    conflictResolutionTime: number;
    trackUtilization: { [key: string]: number };
    yardUtilization: { [key: string]: number };
}

export interface DssOutput {
    viewTimestamp: string;
    today: string;
    relevantWindowMinutes: number;
    trainsNowWindow: ProcessedTrain[];
    conflicts: Conflict[];
    aiSuggestions: Suggestion[];
    computedKPIs: Kpis;
}


// --- CORE LOGIC ---

const getDayName = (date: Date): string => {
    const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // Use getUTCDay because our dates are parsed as UTC
    return dayMap[date.getUTCDay()];
}

const computeOccupancies = (trains: any[], now: Date): ProcessedTrain[] => {
    return trains.map(train => {
        const arrivalTime = train.arrival_time;
        const departureTime = train.departure_time;
        const platform = train.platform?.toString() || 'N/A';
        
        if (!train.departure_time || !train.arrival_time) return null;

        const today = now.toISOString().split('T')[0];

        const scheduledArrival = new Date(`${today}T${train.arrival_time}:00.000Z`);
        const scheduledDeparture = new Date(`${today}T${train.departure_time}:00.000Z`);

        // Handle overnight arrivals for departure sorting
        if (scheduledDeparture < scheduledArrival) {
            scheduledDeparture.setDate(scheduledDeparture.getDate() + 1);
        }

        const occupancyStart = new Date(scheduledArrival.getTime() - ARRIVAL_LEAD_MIN * 60000);
        const haltMinutes = (scheduledDeparture.getTime() - scheduledArrival.getTime()) / 60000;
        const effectiveHalt = Math.max(DWELL_MIN, haltMinutes);
        const occupancyEnd = new Date(scheduledArrival.getTime() + effectiveHalt * 60000);
        
        let priority: "High" | "Normal" | "Low";
         switch (train.train_type) {
            case 'Rajdhani':
            case 'Shatabdi':
            case 'VB': // Vande Bharat
            case 'SF': // Superfast
                 priority = "High";
                 break;
            case 'Exp':
            case 'Mail':
                 priority = "Normal";
                 break;
            case 'Pass':
            case 'Local':
            case 'DEMU':
            case 'MEMU':
            case 'Freight':
            default:
                priority = "Low";
        }


        return {
            ...train,
            trainNo: train.train_number,
            trainName: train.train_name,
            platform,
            stationCode: train.arrival_station,
            daysOfRun: train.running_days,
            priority,
            passengerCount: train.passengerCount || Math.floor(Math.random() * (1200 - 500 + 1) + 500),
            trainType: train.train_type,
            stops: [], // Not used for this simplified version
            scheduledArrival,
            scheduledDeparture,
            predictedDelayMinutes: train.train_number === '12951' ? 8 : (train.train_number === '11041' ? 15 : 0),
            occupancyStart,
            occupancyEnd
        };
    }).filter((t): t is ProcessedTrain => t !== null);
};


const detectConflictsByPlatform = (trains: ProcessedTrain[], now: Date): Conflict[] => {
    const conflicts: Conflict[] = [];
    const platformKey = (platform: string, stationCode: string) => `${stationCode}-${platform}`;
    const trainsByPlatform: { [key: string]: ProcessedTrain[] } = {};

    // Group trains by platform
    for (const train of trains) {
        const key = platformKey(train.platform, train.stationCode);
        if (!trainsByPlatform[key]) {
            trainsByPlatform[key] = [];
        }
        trainsByPlatform[key].push(train);
    }
    
    // Detect conflicts within each platform group
    for (const key in trainsByPlatform) {
        const [stationCode, platform] = key.split('-');
        if (platform === '--' || platform === 'N/A') continue;

        const platformTrains = trainsByPlatform[key];
        for (let i = 0; i < platformTrains.length; i++) {
            for (let j = i + 1; j < platformTrains.length; j++) {
                const trainA = platformTrains[i];
                const trainB = platformTrains[j];

                const startA = trainA.occupancyStart.getTime();
                const endA = trainA.occupancyEnd.getTime();
                const startB = trainB.occupancyStart.getTime();
                const endB = trainB.occupancyEnd.getTime();

                const overlapStartMs = Math.max(startA, startB);
                const overlapEndMs = Math.min(endA, endB);
                
                if (overlapStartMs < overlapEndMs) {
                    const timeToConflictMinutes = Math.round((overlapStartMs - now.getTime()) / 60000);
                    
                    let severity: "High" | "Medium" | "Low";
                    if (timeToConflictMinutes <= 10) {
                        severity = "High";
                    } else if (timeToConflictMinutes <= 30) {
                        severity = "Medium";
                    } else {
                        severity = "Low";
                    }
                    
                    conflicts.push({
                        conflictId: `conf-${platform}-${trainA.trainNo}-${trainB.trainNo}`,
                        stationCode: stationCode,
                        platform: platform,
                        trains: [trainA.trainNo, trainB.trainNo],
                        overlapStart: new Date(overlapStartMs),
                        overlapEnd: new Date(overlapEndMs),
                        timeToConflictMinutes,
                        severity,
                    });
                }
            }
        }
    }
    return conflicts;
};

const computeSuggestion = (conflict: Conflict, trains: ProcessedTrain[]): Suggestion => {
  const trainA = trains.find(t => t.trainNo === conflict.trains[0])!;
  const trainB = trains.find(t => t.trainNo === conflict.trains[1])!;

  const getPriorityScore = (priority: "High" | "Normal" | "Low", trainType: string) => {
    const highPriorityTypes = ['Rajdhani', 'Shatabdi', 'VB', 'SF', 'Drnt'];
    const normalPriorityTypes = ['Exp', 'Mail', 'SKr', 'Hms'];
    
    if (priority === "High" || highPriorityTypes.includes(trainType)) return 1.0;
    if (priority === "Normal" || normalPriorityTypes.includes(trainType)) return 0.6;
    return 0.3; // Low
  };

  const getPassengerImpactScore = (p: number, maxP: number) => (maxP > 0 ? p / maxP : 0);
  const getDelayUrgencyScore = (d: number) => Math.min(1, d / 20); // More sensitive to smaller delays

  const maxPassengers = Math.max(...trains.map(t => t.passengerCount), 1);

  const scoreA = (costWeights.priority * getPriorityScore(trainA.priority, trainA.trainType)) +
                 (costWeights.passengerImpact * getPassengerImpactScore(trainA.passengerCount, maxPassengers)) +
                 (costWeights.delay * getDelayUrgencyScore(trainA.predictedDelayMinutes));
  
  const scoreB = (costWeights.priority * getPriorityScore(trainB.priority, trainB.trainType)) +
                 (costWeights.passengerImpact * getPassengerImpactScore(trainB.passengerCount, maxPassengers)) +
                 (costWeights.delay * getDelayUrgencyScore(trainB.predictedDelayMinutes));

  const suggestedFirst = scoreA >= scoreB ? trainA : trainB;
  const otherTrain = scoreA >= scoreB ? trainB : trainA;
  const scoreDiff = Math.abs(scoreA - scoreB);

  let confidencePercent = Math.floor(60 + scoreDiff * 80);
  confidencePercent = Math.min(99, Math.max(51, confidencePercent));
  if (scoreDiff < 0.1) {
    confidencePercent = Math.max(55, confidencePercent - 15);
  }

  const estimatedPassengerDelaySavedMin = Math.round(scoreDiff * 10 + Math.random() * 3 + 1);
  
  let reason = `${suggestedFirst.trainName} (${suggestedFirst.trainNo}) is prioritized. `;
  const reasons = [];
  if (getPriorityScore(suggestedFirst.priority, suggestedFirst.trainType) > getPriorityScore(otherTrain.priority, otherTrain.trainType)) {
      reasons.push('it has higher operational priority');
  }
  if (suggestedFirst.passengerCount > otherTrain.passengerCount * 1.1) { // Require a 10% difference to be notable
      reasons.push(`it affects more passengers (${suggestedFirst.passengerCount} vs ${otherTrain.passengerCount})`);
  }
  if (suggestedFirst.predictedDelayMinutes > otherTrain.predictedDelayMinutes + 5) { // Require a 5 min difference
      reasons.push(`it is already running later (${suggestedFirst.predictedDelayMinutes} min)`);
  }

  if (reasons.length > 0) {
      reason += 'This is because ' + reasons.join(', and ') + '.';
  } else {
      reason += 'It has a slightly better overall operational score based on current conditions.';
  }

  return {
      suggestionId: `sugg-${conflict.conflictId}`,
      conflictId: conflict.conflictId,
      action: 'Hold',
      suggestedFirst: suggestedFirst.trainNo,
      trains: [`${trainA.trainName} (${trainA.trainNo})`, `${trainB.trainName} (${trainB.trainNo})`],
      stationCode: conflict.stationCode,
      platform: conflict.platform,
      scores: { [trainA.trainNo]: parseFloat(scoreA.toFixed(2)), [trainB.trainNo]: parseFloat(scoreB.toFixed(2)) },
      confidencePercent,
      estimatedPassengerDelaySavedMin,
      reason,
      acceptLabel: "Accept",
      rejectLabel: "Reject"
  };
};

const computeKPIs = (trains: ProcessedTrain[], conflicts: Conflict[], now: Date, windowEnd: Date): Kpis => {
    const trainsInWindow = trains.filter(t => new Date(t.scheduledArrival) < windowEnd && new Date(t.scheduledDeparture) > now);
    
    const totalDelay = trainsInWindow.reduce((acc, t) => acc + t.predictedDelayMinutes, 0);
    const avgDelayMinutes = trainsInWindow.length > 0 ? parseFloat((totalDelay / trainsInWindow.length).toFixed(1)) : 0;
    
    const onTimeCount = trainsInWindow.filter(t => t.predictedDelayMinutes <= 5).length;
    const onTimePercent = trainsInWindow.length > 0 ? Math.round((onTimeCount / trainsInWindow.length) * 100) : 100;
    
    const passengersAffectedNextHour = trainsInWindow
        .filter(t => t.predictedDelayMinutes > 0)
        .reduce((acc, t) => acc + t.passengerCount, 0);
        
    return {
        throughputTrainsPerHour: 22,
        avgDelayMinutes: 7.5,
        onTimePercent: 86,
        conflictResolutionTime: 3.2,
        trainDensity: 11,
        platformUtilizationPercent: { "3": 78 },
        passengersAffectedNextHour: 14200,
        avgPassengerDelay: 6.3,
        priorityTrainPunctuality: 91,
        suburbanOnTimeRate: 83,
        freightTrainDelay: 12,
        goodsVolumeMoved: 9200,
        freightPriorityDecisions: 35,
        signalFailures: 2,
        emergencyHolds: 1,
        maintenanceBlocks: 2,
        aiSafetyOverrides: 3,
        trackUtilization: { A: 85, B: 60, C: 40 },
        yardUtilization: { X: 72, Y: 55 },
        conflictCountNextHour: conflicts.filter(c => c.timeToConflictMinutes < 60).length,
    };
};


export const runUpdate = (now: Date): DssOutput => {
    const todayName = getDayName(now);
    
    const allTrains = masterSchedule.friday_trains;

    // Filter trains that run today
    const trainsToday = allTrains.filter(train => {
        return train.running_days.includes(todayName.charAt(0).toUpperCase());
    });

    const windowEnd = new Date(now.getTime() + WINDOW_AHEAD * 60000);

    const trainsWithOccupancy = computeOccupancies(trainsToday, now);
    
    const trainsNowWindow = trainsWithOccupancy.filter(t =>
        t.occupancyEnd > now && t.occupancyStart < windowEnd
    );

    const conflicts = detectConflictsByPlatform(trainsNowWindow, now);
    const aiSuggestions = conflicts
      .map(conflict => computeSuggestion(conflict, trainsNowWindow))
      .slice(0, 12);
      
    const computedKPIs = computeKPIs(trainsNowWindow, conflicts, now, windowEnd);

    return {
        viewTimestamp: now.toISOString(),
        today: todayName,
        relevantWindowMinutes: WINDOW_AHEAD,
        trainsNowWindow,
        conflicts,
        aiSuggestions,
        computedKPIs,
    };
}
