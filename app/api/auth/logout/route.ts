import { NextResponse } from "next/server";
import { trace, traceAsync } from "@/lib/tracing";

export async function POST() {
    return traceAsync("Logout API", async () => {
        try {
            // Clear the HttpOnly cookie with Path=/
            const mainCookie = `obp_token=; Path=/; Max-Age=0; SameSite=Strict; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

            trace.info("Clearing HttpOnly cookies on logout");

            // Create a robust cache-busting set of headers
            const headers = {
                'Set-Cookie': mainCookie,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Surrogate-Control': 'no-store'
            };

            // Create a cache key to invalidate the user's session
            const timestamp = new Date().toISOString();
            trace.debug("Logout successful", { timestamp });

            return NextResponse.json(
                {
                    success: true,
                    message: "Logged out successfully",
                    timestamp // Include timestamp to prevent response caching
                },
                { headers }
            );
        } catch (error) {
            trace.error("Logout error", error instanceof Error ? error : new Error(String(error)));

            return NextResponse.json(
                {
                    success: false,
                    message: `Logout error: ${error instanceof Error ? error.message : String(error)}`
                },
                { status: 500 }
            );
        }
    });
}