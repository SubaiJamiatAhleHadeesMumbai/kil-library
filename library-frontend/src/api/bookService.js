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
        async getBookStats() {
        try {
            const response = await apiClient.get('/api/books/stats');
            return response.data;
        } catch (error) {
            console.error("Error fetching book stats:", error);
            return null;
        }
    },

    async getAllBooks(queryParams = {}, limit = 2000, extraParams = {}) {
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
            const response = await apiClient.get(`/api/books/${bookId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching book ${bookId}:`, error);
            throw error;
        }
    },

    /**
     * ✅ UPDATED: Supports Text File Upload & Live Upload Progress
     * formData must contain 'txt_file' if uploaded
     */
    async createBook(formData, onUploadProgress = null) {
        try {
            const config = {
                headers: { 'Content-Type': 'multipart/form-data' },
            };
            if (onUploadProgress) {
                config.onUploadProgress = onUploadProgress;
            }
            const response = await apiClient.post('/api/books/', formData, config);
            return response.data;
        } catch (error) {
            console.error("Error creating book:", error.response?.data);
            throw error;
        }
    },

    /**
     * ✅ UPDATED: Supports Text File Update & Live Upload Progress
     */
    async updateBook(bookId, formData, onUploadProgress = null) {
        try {
            const config = {
                headers: { 'Content-Type': 'multipart/form-data' },
            };
            if (onUploadProgress) {
                config.onUploadProgress = onUploadProgress;
            }
            const response = await apiClient.put(`/api/books/${bookId}`, formData, config);
            return response.data;
        } catch (error) {
            console.error(`Error updating book ${bookId}:`, error.response?.data);
            throw error;
        }
    },

    async deleteBook(bookId) {
        try {
            const response = await apiClient.delete(`/api/books/${bookId}`);
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

    async createSubcategory(data) {
        try {
            const response = await apiClient.post('/api/subcategories/', data);
            return response.data;
        } catch (error) {
            console.error("Error creating subcategory:", error);
            throw error;
        }
    },

    async getFatawaCategories() {
        try {
            const response = await apiClient.get('/api/fatawa/categories');
            return response.data;
        } catch (error) {
            console.error("Error fetching fatawa categories:", error);
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
    },

    // ============================================================
    // 4. STAGED & BULK EXCEL IMPORTED BOOKS (Persistent Database Storage)
    // ============================================================

    async bulkImportBooks(booksArray, replaceExisting = false) {
        try {
            const response = await apiClient.post(`/api/books/bulk-import?replace_existing=${replaceExisting}`, booksArray);
            return response.data;
        } catch (error) {
            console.error("Error bulk importing books into database:", error);
            throw error;
        }
    },

    async clearAllBooks() {
        try {
            await apiClient.delete('/api/books/bulk-clear');
            return true;
        } catch (error) {
            console.error("Error clearing all books from database:", error);
            throw error;
        }
    },

    async saveBulkStagedBooks(payload) {
        try {
            const response = await apiClient.post('/api/books/staged/bulk', payload);
            return response.data;
        } catch (error) {
            console.error("Error saving staged books to database:", error);
            throw error;
        }
    },

    async getStagedBooks() {
        try {
            const response = await apiClient.get('/api/books/staged');
            return response.data || [];
        } catch (error) {
            console.error("Error fetching staged books from database:", error);
            return [];
        }
    },

    async deleteStagedBook(stagedId) {
        try {
            await apiClient.delete(`/api/books/staged/${stagedId}`);
            return true;
        } catch (error) {
            console.error(`Error deleting staged book ${stagedId}:`, error);
            return false;
        }
    },

    async clearAllStagedBooks() {
        try {
            await apiClient.delete('/api/books/staged');
            return true;
        } catch (error) {
            console.error("Error clearing staged books:", error);
            return false;
        }
    }
};