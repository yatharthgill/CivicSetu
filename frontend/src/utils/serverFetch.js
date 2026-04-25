import { cookies } from 'next/headers';

/**
 * Utility for making fetch requests from Next.js Server Components
 * to the internal Express backend. It automatically attaches cookies.
 */
export async function serverFetch(endpoint, options = {}) {
    // Determine the base URL for internal server-to-server requests
    const baseUrl = process.env.NEXT_INTERNAL_API_URL || 'http://localhost:5000/api';
    const url = `${baseUrl}${endpoint}`;

    // Get cookies from the incoming request to forward them
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    // Default configuration
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            ...options.headers,
        },
    };

    const response = await fetch(url, config);

    // Provide a standard way to catch errors
    if (!response.ok) {
        // Try to parse the error message from the backend if it exists
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            // Ignore JSON parse errors for non-JSON responses
        }
        
        throw new Error(errorMessage);
    }

    // Try parsing as JSON unless explicitly requested otherwise
    if (options.parseJson !== false) {
        try {
            return await response.json();
        } catch (e) {
            return null;
        }
    }

    return response;
}
