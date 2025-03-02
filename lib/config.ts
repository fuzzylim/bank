export const getConsumerKey = () => {
    if (typeof window === "undefined") {
        return process.env.OBP_CONSUMER_KEY;
    } else {
        return null;
    }
};

export const API_BASE_URL = (typeof window === "undefined"
    ? process.env.API_BASE_URL
    : process.env.NEXT_PUBLIC_API_BASE_URL) as string | undefined;

export const API_VERSION = (typeof window === "undefined"
    ? process.env.OBP_API_VERSION
    : "v5.1.0") as string | undefined;

if (!API_BASE_URL) {
    throw new Error("API_BASE_URL is not configured");
}
