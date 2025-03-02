import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { trace, traceAsync } from "../tracing";

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export const getCookie = (name: string): string | undefined => {
    const cookieStore = cookies();
    return cookieStore.get(name)?.value;
};

export const setCookie = (name: string, value: string, options?: any): void => {
    const cookieStore = cookies();
    cookieStore.set(name, value, options);
};

export const clearCookie = (name: string): void => {
    const cookieStore = cookies();
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
