// Simple script to test environment variables
require('dotenv').config({ path: '.env.local' });
console.log("Testing environment variables...");

// Check if environment variables are set
console.log("API_BASE_URL:", process.env.API_BASE_URL || "Not set");
console.log("OBP_API_VERSION:", process.env.OBP_API_VERSION || "Not set");
console.log("OBP_CONSUMER_KEY:", process.env.OBP_CONSUMER_KEY || "Not set");
console.log("NEXT_PUBLIC_API_BASE_URL:", process.env.NEXT_PUBLIC_API_BASE_URL || "Not set");

// Check if we can access the environment variables in a way that simulates client-side code
console.log("\nSimulating client-side access:");
const getConsumerKey = () => {
    if (typeof window === "undefined") {
        // Server-side
        return process.env.OBP_CONSUMER_KEY;
    } else {
        // Client-side
        return null; // Don't expose the consumer key on the client
    }
};

// Force client-side simulation
global.window = {}; // This makes typeof window !== "undefined"
console.log("OBP_CONSUMER_KEY (client-side simulation):", getConsumerKey() || "Not available on client");

// Clean up
delete global.window;
console.log("OBP_CONSUMER_KEY (server-side):", getConsumerKey() || "Not set");

console.log("\nTest completed.");