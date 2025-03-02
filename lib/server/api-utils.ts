import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { trace, traceAsync } from "../tracing";

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export const getCookie = async (name: string): Promise<string | undefined> => {
    const cookieStore = await cookies();
    return cookieStore.get(name)?.value;
};

export const setCookie = async (name: string, value: string, options?: any): Promise<void> => {
    const cookieStore = await cookies();
    cookieStore.set(name, value, options);
};

export const clearCookie = async (name: string): Promise<void> => {
    const cookieStore = await cookies();
    cookieStore.delete(name);
};

export const handleApiResponse = <T>(response: Response): Promise<ApiResponse<T>> => {
    return response.json().then((data) => {
        if (!response.ok) {
            trace.error("API response error", { status: response.status, data });
            return {
                success: false,
                message: data.message || `API error: ${response.status}`,
                error: data.error,
            };
        }
        return {
            success: true,
            data,
        };
    });
};
