/**
 * Open Banking API
 * 
 * This file is the main entry point for the Open Banking API.
 * It re-exports everything from the banking module to maintain 
 * backward compatibility.
 */

// Re-export all types
export type {
  OBPBank,
  OBPAccount,
  OBPTransaction,
  Account,
  Transaction,
  FinancialGoal
} from './types/obp-types';

// Re-export errors
export {
  APIError,
  ConfigurationError
} from './banking';

// Re-export API client and utilities
export {
  obpApi,
  testApiConnection as testConnection,
  transformAccounts,
  transformTransactions
} from './banking';

// Re-export the API client as default export for backward compatibility
import { obpApi } from './banking';
export default obpApi;
