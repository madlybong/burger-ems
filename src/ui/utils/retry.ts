/**
 * Utility for making retryable fetch requests with exponential backoff.
 * 
 * @param url Request URL
 * @param options Fetch options
 * @param maxRetries Maximum number of retries (default: 3)
 * @param backoff Initial backoff delay in ms (default: 1000)
 * @returns Promise rendering the fetch response
 */
export async function retryableFetch(
    url: string,
    options: RequestInit = {},
    maxRetries = 3,
    backoff = 1000
): Promise<Response> {
    let lastError: any;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok && res.status >= 500) {
                // Only retry server errors, not client errors (4xx)
                throw new Error(`Server returned ${res.status}`);
            }
            return res;
        } catch (error) {
            lastError = error;
            if (i === maxRetries) break;

            // Wait before retrying (exponential backoff)
            const delay = backoff * Math.pow(2, i);
            console.warn(`Request failed, retrying in ${delay}ms...`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Format error messages for user display
 */
export function getErrorMessage(error: any): string {
    if (!error) return 'Unknown error occurred';
    if (typeof error === 'string') return error;
    if (error.message === 'Failed to fetch') return 'Network connection lost. Please check your internet.';
    return error.message || 'Something went wrong. Please try again.';
}
