/**
 * Tracing utility for logging API calls and other events
 */

// Tracing levels
export enum TraceLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error'
}

interface TraceEvent {
    timestamp: string;
    level: TraceLevel;
    message: string;
    context?: Record<string, any>;
    error?: Error | unknown;
}

// Determine if we're in server or client context
const isServer = typeof window === 'undefined';

/**
 * Create a formatted trace event with timestamp and additional context
 */
const createTraceEvent = (
    level: TraceLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error | unknown
): TraceEvent => {
    return {
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
        error
    };
};

/**
 * Log a trace event to the appropriate console method based on level
 */
const logTraceEvent = (event: TraceEvent): void => {
    // Create a formatted prefix for easy identification of trace logs
    const prefix = isServer ? '🔷 [OBP-SERVER]' : '🔶 [OBP-CLIENT]';
    const contextStr = event.context ? ` ${JSON.stringify(event.context)}` : '';

    switch (event.level) {
        case TraceLevel.DEBUG:
            console.debug(`${prefix} ${event.message}${contextStr}`);
            break;
        case TraceLevel.INFO:
            console.log(`${prefix} ${event.message}${contextStr}`);
            break;
        case TraceLevel.WARN:
            console.warn(`${prefix} ${event.message}${contextStr}`);
            break;
        case TraceLevel.ERROR:
            console.error(`${prefix} ${event.message}${contextStr}`);
            if (event.error) {
                if (event.error instanceof Error) {
                    console.error(`${prefix} Error details:`, event.error.message);
                    console.error(`${prefix} Stack trace:`, event.error.stack);
                } else {
                    console.error(`${prefix} Error details:`, event.error);
                }
            }
            break;
    }
};

/**
 * Trace a function call with timing information
 */
export const traceAsync = async <T>(
    name: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
): Promise<T> => {
    const startTime = Date.now();
    logTraceEvent(createTraceEvent(TraceLevel.INFO, `Starting: ${name}`, context));

    try {
        const result = await fn();
        const duration = Date.now() - startTime;
        logTraceEvent(createTraceEvent(
            TraceLevel.INFO,
            `Completed: ${name} in ${duration}ms`,
            context
        ));
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        logTraceEvent(createTraceEvent(
            TraceLevel.ERROR,
            `Failed: ${name} after ${duration}ms`,
            context,
            error
        ));
        throw error;
    }
};

/**
 * Trace utility for logging events
 */
export const trace = {
    debug: (message: string, context?: Record<string, any>) => {
        logTraceEvent(createTraceEvent(TraceLevel.DEBUG, message, context));
    },

    info: (message: string, context?: Record<string, any>) => {
        logTraceEvent(createTraceEvent(TraceLevel.INFO, message, context));
    },

    warn: (message: string, context?: Record<string, any>) => {
        logTraceEvent(createTraceEvent(TraceLevel.WARN, message, context));
    },

    error: (message: string, error?: unknown, context?: Record<string, any>) => {
        logTraceEvent(createTraceEvent(TraceLevel.ERROR, message, context, error));
    }
};