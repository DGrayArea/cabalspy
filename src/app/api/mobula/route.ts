/**
 * Mobula API Proxy Route
 * 
 * Proxies requests to Mobula API to avoid CORS issues.
 * This route runs server-side, so CORS doesn't apply.
 */

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const MOBULA_GET_API = "https://api.mobula.io/api/2/pulse";
const MOBULA_POST_API = "https://pulse-v2-api.mobula.io/api/2/pulse"; // Use v2 API for POST
const API_KEY =
  process.env.NEXT_PUBLIC_MOBULA_API_KEY ||
  process.env.MOBULA_API_KEY ||
  "7b7ba456-f454-4a42-a80e-897319cb0ac1";

// Retry helper function
async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;
      // Don't retry on 4xx errors (client errors)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        throw error;
      }
      // Retry on 5xx errors (server errors) or network errors
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`Retrying Mobula API request (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get query parameters from the request
    const assetMode = searchParams.get("assetMode") || "true";
    const chainId = searchParams.get("chainId") || "solana:solana";
    const poolTypes = searchParams.get("poolTypes") || "pumpfun,meteora,moonshot,jupiter,raydium,moonit,letsbonk";
    const limit = searchParams.get("limit") || "100";
    const offset = searchParams.get("offset") || "0";

    // Build the Mobula API URL
    const params = new URLSearchParams({
      assetMode,
      chainId,
      poolTypes,
      limit,
      offset,
    });

    const url = `${MOBULA_GET_API}?${params.toString()}`;

    // Make the request to Mobula API with retry logic
    const response = await retryRequest(
      () => axios.get(url, {
        headers: {
          Authorization: API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }),
      3, // Max 3 retries
      1000 // Base delay 1 second
    );

    // Return the response with CORS headers
    return NextResponse.json(response.data, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error: any) {
    const statusCode = error?.response?.status || 500;
    const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
    
    console.error("Mobula API Proxy Error (GET):", {
      message: errorMessage,
      status: statusCode,
      url: error?.config?.url,
    });
    
    // Return a more informative error response
    return NextResponse.json(
      {
        error: errorMessage,
        status: statusCode,
        details: statusCode === 502 
          ? "Mobula API is temporarily unavailable. Please try again in a moment."
          : statusCode === 429
          ? "Rate limit exceeded. Please wait before making another request."
          : "Failed to fetch data from Mobula API",
      },
      {
        status: statusCode >= 500 ? 502 : statusCode, // Return 502 for server errors to indicate proxy issue
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();

    // Make the request to Mobula API with retry logic
    const response = await retryRequest(
      () => axios.post(MOBULA_POST_API, body, {
        headers: {
          Authorization: API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }),
      3, // Max 3 retries
      1000 // Base delay 1 second
    );

    // Return the response with CORS headers
    return NextResponse.json(response.data, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (error: any) {
    const statusCode = error?.response?.status || 500;
    const errorMessage = error?.response?.data?.message || error?.message || "Unknown error";
    
    console.error("Mobula API Proxy Error (POST):", {
      message: errorMessage,
      status: statusCode,
      url: error?.config?.url,
    });
    
    // Return a more informative error response
    return NextResponse.json(
      {
        error: errorMessage,
        status: statusCode,
        details: statusCode === 502 
          ? "Mobula API is temporarily unavailable. Please try again in a moment."
          : statusCode === 429
          ? "Rate limit exceeded. Please wait before making another request."
          : "Failed to fetch data from Mobula API",
      },
      {
        status: statusCode >= 500 ? 502 : statusCode, // Return 502 for server errors to indicate proxy issue
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
