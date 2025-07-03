/**
 * API Service Module - Centralized API handling
 */

export class ApiService {
    static async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                let errorMessage = `Server error: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (jsonError) {
                    console.warn('Failed to parse error response as JSON:', jsonError);
                }
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    static async get(url) {
        return this.request(url, { method: 'GET' });
    }

    static async post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async put(url, data) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    static async delete(url) {
        return this.request(url, { method: 'DELETE' });
    }
}

// Organization-specific API methods
export class OrganizationApi {
    static async getAll() {
        return ApiService.get('/api/organizations');
    }

    static async create(data) {
        return ApiService.post('/api/organizations', data);
    }

    static async update(id, data) {
        return ApiService.put(`/api/organizations/${id}`, data);
    }

    static async delete(id) {
        return ApiService.delete(`/api/organizations/${id}`);
    }
} 