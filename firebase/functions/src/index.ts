
/**
 * @fileoverview Firebase Functions for RailPulse DSS integration.
 *
 * This file contains the backend logic for handling DSS (Decision Support System)
 * operations. It includes functions to trigger optimization calculations and
 * a webhook to receive recommendations from an external DSS engine.
 */

import { logger, https } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fetch from "node-fetch";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

// DSS Engine Configuration
const DSS_ENGINE_API = process.env.DSS_ENGINE_URL || "http://localhost:5000/optimize"; // Default to local for dev
const RAILRADAR_API_KEY = process.env.RAILRADAR_API_KEY;
const RAILRADAR_BASE_URL = "https://railradar.in/api/v1";

/**
 * HTTP-triggered function to initiate a DSS optimization cycle.
 *
 * This function is called by the RailPulse frontend via a Next.js API route.
 * It fetches the current state of trains for a given corridor from RailRadar,
 * formats the data, and sends it to the external DSS engine.
 *
 * @param {https.Request} req - The HTTP request object. Expects a POST
 *   request with a body containing `corridorId`.
 * @param {https.Response} res - The HTTP response object.
 */
export const triggerDssOptimization = https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const { corridorId } = req.body; // e.g., "NDLS-AGC"

  if (!corridorId) {
    res.status(400).send("Bad Request: Missing corridorId.");
    return;
  }

  if (!RAILRADAR_API_KEY) {
    logger.error("RAILRADAR_API_KEY is not set.");
    res.status(500).send("Internal Server Error: API key is not configured.");
    return;
  }

  try {
    // 1. Fetch all live trains
    const liveTrainsResponse = await fetch(`${RAILRADAR_BASE_URL}/trains/live/all`, {
        headers: { 'x-api-key': RAILRADAR_API_KEY },
    });

    if (!liveTrainsResponse.ok) {
        throw new Error(`RailRadar API failed with status: ${liveTrainsResponse.status}`);
    }

    const allTrains = await liveTrainsResponse.json() as any[];

    // 2. Filter trains for the specified corridor (This is a simplified example)
    // A real implementation would likely involve checking if a train's route
    // includes the corridor's stations. For now, we'll assume a field exists.
    const corridorTrains = allTrains.filter(train => train.corridor === corridorId);
    
    if (corridorTrains.length === 0) {
      logger.info(`No live trains found for corridor: ${corridorId}`);
      res.status(200).json({ message: "No live trains to optimize for the specified corridor." });
      return;
    }


    // 3. Format data for the DSS Engine
    const dssInput = {
      corridorId: corridorId,
      timestamp: new Date().toISOString(),
      trains: corridorTrains.map((train: any) => ({
          trainId: train.train_number,
          currentLatitude: train.latitude,
          currentLongitude: train.longitude,
          speedKmph: train.speed,
          priority: train.priority || 1, // Assuming a default priority
          delayMinutes: train.delay,
      })),
      // In a real scenario, you'd also include section constraints, timetable info, etc.
    };

    logger.info(`Sending ${dssInput.trains.length} trains to DSS Engine for corridor ${corridorId}.`);

    // 4. Call the external DSS Engine
    // Note: This is an async call. The DSS engine will process and call our webhook.
    fetch(DSS_ENGINE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dssInput),
    }).catch(err => {
      // Log errors but don't block the response to the client.
      // The client is only concerned with the trigger, not the result.
      logger.error("Error calling DSS Engine:", err);
    });

    // 5. Respond to the client immediately
    res.status(202).json({
      message: "DSS optimization triggered successfully. Waiting for recommendations.",
      trainCount: dssInput.trains.length,
    });

  } catch (error) {
    logger.error("Error in triggerDssOptimization:", error);
    res.status(500).send("Internal Server Error");
  }
});


/**
 * HTTP webhook to receive recommendations from the external DSS engine.
 *
 * The DSS engine calls this function after completing its optimization.
 * The function validates the recommendations and stores them in Firestore,
 * which then get streamed to the frontend.
 *
 * @param {https.Request} req - The HTTP request object. Expects a POST
 *   request with a body containing an array of `recommendations`.
 * @param {https.Response} res - The HTTP response object.
 */
export const dssEngineWebhook = https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    const { recommendations } = req.body;

    if (!recommendations || !Array.isArray(recommendations)) {
        res.status(400).send("Bad Request: Missing or invalid recommendations array.");
        return;
    }

    logger.info(`Received ${recommendations.length} recommendations from DSS engine.`);

    const batch = db.batch();

    for (const rec of recommendations) {
        if (!rec.trainId) {
            logger.warn("Skipping recommendation with missing trainId:", rec);
            continue;
        }
        
        // Document ID is the train number string for easy lookup.
        const recommendationRef = db.collection("dssRecommendations").doc(String(rec.trainId));
        
        const recommendationData = {
            ...rec,
            timestamp: new Date().toISOString(), // Add a server timestamp
        };
        
        batch.set(recommendationRef, recommendationData, { merge: true });
    }

    try {
        await batch.commit();
        logger.info("Successfully stored all recommendations in Firestore.");
        res.status(200).json({ message: "Recommendations processed successfully." });
    } catch (error) {
        logger.error("Error committing recommendations to Firestore:", error);
        res.status(500).send("Internal Server Error: Could not store recommendations.");
    }
});


/**
 * HTTP-triggered function to log a controller's override action.
 *
 * @param {https.Request} req - The HTTP request object. Expects a POST
 *   request with a body containing override details.
 * @param {https.Response} res - The HTTP response object.
 */
export const logDssOverride = https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    // TODO: Add authentication check to ensure only authorized controllers can log overrides.

    const { trainId, overriddenAction, newAction, reason, controllerId } = req.body;

    if (!trainId || !overriddenAction || !newAction || !controllerId) {
        res.status(400).send("Bad Request: Missing required override fields.");
        return;
    }

    try {
        const overrideRef = db.collection("dssOverrides").doc(); // Auto-generate ID
        await overrideRef.set({
            trainId,
            overriddenAction,
            newAction,
            reason: reason || "No reason provided.",
            controllerId,
            timestamp: new Date().toISOString(),
        });

        logger.info(`Override logged for train ${trainId} by controller ${controllerId}`);
        res.status(201).json({ message: "Override logged successfully." });

    } catch (error) {
        logger.error("Error logging override to Firestore:", error);
        res.status(500).send("Internal Server Error: Could not log override.");
    }
});
