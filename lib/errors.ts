export class APIError extends Error {
    constructor(
        message: string,
        public status?: number,
        public responseText?: string,
    ) {
        super(message);
        this.name = "APIError";
    }
}

export class ConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConfigurationError";
    }
}
