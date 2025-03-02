// Re-export types from types directory
export type {
    OBPBank,
    OBPAccount,
    OBPTransaction,
    Account,
    Transaction,
    FinancialGoal
} from '../types/obp-types';

// Re-export errors
export { OBPApiError as APIError, ConfigurationError } from './errors';

// Re-export configuration
export {
    API_BASE_URL,
    API_VERSION,
    getConsumerKey,
    OBP_ENDPOINTS
} from './config';

// Re-export transformers
export {
    transformAccounts,
    transformTransactions
} from './transformers';

// Re-export client
export { DirectLoginClient, createDirectLoginClient } from './direct-login-client';

// Re-export API
export { obpApi, testApiConnection } from './api-client';

// Import for default export
import { obpApi, testApiConnection } from './api-client';
import { transformAccounts, transformTransactions } from './transformers';

// Default export for backward compatibility
export default {
    obpApi,
    testApiConnection,
    transformAccounts,
    transformTransactions
};