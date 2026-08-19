// src/api/bookService.js
import apiClient from './apiClient';

export const bookService = {

    // ============================================================
    // 1. BOOK MANAGEMENT
    // ============================================================

    /**
     * Fetches all books.
     * Supports both Public (isApproved=true) and Admin (queryParams object).
     */
    async getAllBooks(queryParams = {}, limit = 100, extraParams = {}) {
        try {
            let params = {};

            if (typeof queryParams === 'boolean') {
                // Legacy support: getAllBooks(true) => approved only
                params = { approved_only: queryParams, limit };
            } else if (typeof queryParams === 'number') {
                // Legacy support: getAllBooks(0, 200)
                params = { skip: queryParams, limit, ...extraParams };
            } else {
                params = { ...queryParams };
                if (typeof limit === 'number') params.limit = limit;
                if (extraParams && Object.keys(extraParams).length) {
                    params = { ...params, ...extraParams };
                }
            }

            const response = await apiClient.get('/api/books/', {
                params,
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching books:", error);
            throw error;
        }
    },

    async getBookById(bookId) {
        try {
            const response = await apiClient.get(`/api/books/${bookId}/`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching book ${bookId}:`, error);
            throw error;
        }
    },

    /**
     * ✅ UPDATED: Supports Text File Upload
     * formData must contain 'txt_file' if uploaded
     */
    async createBook(formData) {
        try {
            const response = await apiClient.post('/api/books/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        } catch (error) {
            console.error("Error creating book:", error.response?.data);
            throw error;
        }
    },

    /**
     * ✅ UPDATED: Supports Text File Update
     */
    async updateBook(bookId, formData) {
        try {
            const response = await apiClient.put(`/api/books/${bookId}/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        } catch (error) {
            console.error(`Error updating book ${bookId}:`, error.response?.data);
            throw error;
        }
    },

    async deleteBook(bookId) {
        try {
            const response = await apiClient.delete(`/api/books/${bookId}/`);
            return response.data;
        } catch (error) {
            console.error(`Error deleting book ${bookId}:`, error);
            throw error;
        }
    },

    // ============================================================
    // 2. METADATA & LISTS (Renamed to match BookForm.jsx)
    // ============================================================

    // ✅ Renamed from getAllLanguages to getLanguages
    async getLanguages() {
        try {
            const response = await apiClient.get('/api/languages/');
            return response.data;
        } catch (error) {
            console.error("Error fetching languages:", error);
            return [];
        }
    },

    // ✅ Renamed from getAllSubcategories to getSubcategories
    async getSubcategories() {
        try {
            const response = await apiClient.get('/api/subcategories/');
            return response.data;
        } catch (error) {
            console.error("Error fetching subcategories:", error);
            return [];
        }
    },

    // ============================================================
    // 3. REQUESTS & AUTHENTICATION SAFEGUARDS
    // ============================================================

    async createApprovalRequest(bookId) {
        try {
            const response = await apiClient.post('/api/requests/upload/', { book_id: bookId });
            return response.data;
        } catch (error) {
            console.error("Error creating approval request:", error.response?.data);
            return null; 
        }
    },

    async sendBookRequest(requestData) {
        try {
            const response = await apiClient.post('/api/requests/access/', requestData);
            return response.data;
        } catch (error) {
            console.error("Book Request Failed:", error.response?.data);
            throw error;
        }
    },

    async getMyRequests() {
        try {
            // Check if token exists before calling API
            const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
            
            if (!token) {
                return [];
            }

            const response = await apiClient.get('/api/requests/access/my-requests/');
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 401) {
                return [];
            }
            console.error("Error fetching my requests:", error);
            return [];
        }
    }
};