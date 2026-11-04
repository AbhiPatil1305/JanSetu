/**
 * JanSetu API Client Configuration
 * Allows clean switching between local simulated mock services and future real REST/GraphQL backend.
 */

export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'; // defaults to true
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Simulated delay helper for realistic network feel
export const delay = (ms: number = 80): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export class ApiError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}
