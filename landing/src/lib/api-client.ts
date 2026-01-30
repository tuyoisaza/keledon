/**
 * API Client for KELEDON local development
 * Handles communication with NestJS backend
 */

class ApiClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = this.getApiUrl();
        console.log('ApiClient initialized with URL:', this.baseUrl);
    }

    private getApiUrl(): string {
        // Check environment variable
        const envUrl = import.meta.env.VITE_API_URL;
        if (!envUrl || envUrl === '/') {
            return 'http://localhost:3001';
        }
        return envUrl;
    }

    async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        console.log('Making API request to:', url);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                body: JSON.stringify(options.body),
                ...options,
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(errorData.message || 'Request failed');
            }

            const data = await response.json();
            console.log('API Response:', data);
            return data;
        } catch (error) {
            console.error('Network Error:', error);
            throw error;
        }
    }

    // Authentication methods
    async login(email: string, password: string) {
        console.log('Attempting login for:', email);
        return this.request('/api/auth/login', {
            body: { email, password }
        });
    }

    async register(userData: any) {
        console.log('Attempting registration');
        return this.request('/api/auth/register', {
            body: userData
        });
    }

    async verifyToken(token: string) {
        console.log('Verifying token');
        return this.request('/api/auth/verify', {
            body: { token }
        });
    }

    async getCurrentUser() {
        console.log('Getting current user');
        return this.request('/api/auth/me');
    }

    async logout() {
        console.log('Logging out');
        return this.request('/api/auth/logout');
    }
}

export default ApiClient;