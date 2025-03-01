import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-utils";
import { trace, traceAsync } from "@/lib/tracing";
import { OBP_ENDPOINTS } from "@/lib/api-utils";

export async function POST(request: Request) {
    return traceAsync("Login API", async () => {
        try {
            const API_BASE_URL = OBP_ENDPOINTS.baseUrl;
            const CONSUMER_KEY = process.env.OBP_CONSUMER_KEY;

            if (!API_BASE_URL || !CONSUMER_KEY) {
                throw new ApiError("API_BASE_URL or OBP_CONSUMER_KEY environment variables are not set", 500);
            }

            const body = await request.json();
            const { username, password } = body;

            if (!username || !password) {
                throw new ApiError("Username and password are required", 400);
            }

            trace.info("Processing login request", { username });

            // Create the Direct Login authorization string
            const authString = `DirectLogin username="${username}",password="${password}",consumer_key="${CONSUMER_KEY}"`;

            // Make the request to the OBP API
            trace.debug("Making OBP login request");
            const response = await fetch(`${API_BASE_URL}/my/logins/direct`, {
                method: "POST",
                headers: {
                    Authorization: authString,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                trace.error("Authentication failed", new Error(errorText), { status: response.status });
                throw new ApiError(`Authentication failed: ${response.status}`, response.status, errorText);
            }

            const data = await response.json();
            if (!data.token) {
                throw new ApiError("No token received in response", 500);
            }

            trace.info("Login successful, setting cookie");

            // Set up cookie parameters
            const cookieMaxAge = 60 * 60 * 24 * 7; // 7 days in seconds
            const isProduction = process.env.NODE_ENV === 'production';
            const cookieString = `obp_token=${data.token}; Path=/; Max-Age=${cookieMaxAge}; SameSite=Strict; HttpOnly${isProduction ? '; Secure' : ''}`;

            return NextResponse.json(
                { success: true, token: data.token },
                {
                    headers: {
                        'Set-Cookie': cookieString,
                        // Adding cache headers to prevent caching of authenticated responses
                        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                    }
                }
            );
        } catch (error) {
            trace.error("Login error", error instanceof Error ? error : new Error(String(error)));

            // Determine error details
            let status = 500;
            let message = "Internal server error";
            let details = undefined;

            if (error instanceof ApiError) {
                status = error.status || 500;
                message = error.message;
                details = error.details;
            } else if (error instanceof Error) {
                message = error.message;
            }

            return NextResponse.json(
                { success: false, message, details },
                { status }
            );
        }
    });
}