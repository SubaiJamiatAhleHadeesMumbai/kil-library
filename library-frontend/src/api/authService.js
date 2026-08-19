import api from './axiosConfig';

// ✅ Standard Keys (Must be consistent)
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';  // ✅ NEW
const USER_KEY = 'user_details';

export const authService = {
    /**
     * 🟢 CHECK AUTHENTICATION STATUS
     * Use this in Modals or protected routes to see if user is logged in.
     */
    isAuthenticated() {
        const token = this.getAccessToken();
        return !!token; // Returns true if token is not null/empty
    },

    /**
     * 🟢 LOGIN FLOW (Updated with refresh tokens)
     */
    async login(username, password, rememberMe = true) {
        try {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            const tokenResponse = await api.post('/api/token', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            const { access_token, refresh_token } = tokenResponse.data;  // ✅ Get both tokens

            if (!access_token) {
                throw new Error("Server did not return access_token");
            }

            // ✅ Save BOTH tokens
            this.setAccessToken(access_token, rememberMe);
            this.setRefreshToken(refresh_token, rememberMe);

            // ✅ Fetch and save profile
            const userResponse = await api.get('/api/profile/');
            const user = userResponse.data;

            this.setUser(user, rememberMe);

            return {
                success: true,
                access_token,
                refresh_token,
                user,
            };
        } catch (error) {
            this.logout();
            console.error("Login Flow Failed:", error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * 🟢 REGISTRATION
     */
    async register(userData) {
        try {
            const response = await api.post('/api/public/register', userData);
            return response.data;
        } catch (error) {
            console.error("Registration Error:", error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * 🟢 LOGOUT (NEW - Calls backend to revoke token, Issue #2 Fix)
     */
    async logout() {
        try {
            // ✅ Check if token exists before logging out
            const token = localStorage.getItem(ACCESS_TOKEN_KEY) || 
                         sessionStorage.getItem(ACCESS_TOKEN_KEY);
            
            if (!token) {
                console.warn("⚠️ Logout: No token found in storage, just clearing locally");
            } else {
                console.log("✅ Logout: Token found, calling backend...");
                // ✅ Call backend to revoke/blacklist token
                await api.post('/api/logout', {});
                console.log("✅ Logout: Backend logout successful");
            }
        } catch (error) {
            console.warn("⚠️ Logout API call failed (continuing anyway):", error);
        } finally {
            // ✅ Clear frontend storage regardless
            this.clearTokens();
            console.log("✅ Logout: Tokens cleared from storage");
        }
    },

    /**
     * 🟢 CLEAR TOKENS (Helper)
     */
    clearTokens() {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
    },

    /**
     * 🟢 REFRESH ACCESS TOKEN (NEW, Issue #1 Fix)
     */
    async refreshAccessToken() {
        try {
            const refreshToken = this.getRefreshToken();
            
            if (!refreshToken) {
                console.warn("⚠️ No refresh token available");
                this.logout();
                return null;
            }

            const response = await api.post('/api/refresh', {
                refresh_token: refreshToken
            });

            const { access_token, refresh_token } = response.data;

            if (!access_token) {
                throw new Error("Server did not return new access_token");
            }

            // ✅ Save new tokens
            const rememberMe = !!localStorage.getItem(ACCESS_TOKEN_KEY);
            this.setAccessToken(access_token, rememberMe);
            this.setRefreshToken(refresh_token, rememberMe);

            return access_token;
        } catch (error) {
            console.error("Token refresh failed:", error);
            this.logout();
            return null;
        }
    },

    /**
     * 🟢 ACCESS TOKEN MANAGEMENT (Renamed for clarity)
     */
    setAccessToken(token, rememberMe = true) {
        if (!token) return;
        if (rememberMe) {
            localStorage.setItem(ACCESS_TOKEN_KEY, token);
            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        } else {
            sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
            localStorage.removeItem(ACCESS_TOKEN_KEY);
        }
    },

    getAccessToken() {
        return (
            localStorage.getItem(ACCESS_TOKEN_KEY) ||
            sessionStorage.getItem(ACCESS_TOKEN_KEY)
        );
    },

    // ✅ ALIAS for backward compatibility
    getToken() {
        return this.getAccessToken();
    },

    /**
     * 🟢 REFRESH TOKEN MANAGEMENT (NEW)
     */
    setRefreshToken(token, rememberMe = true) {
        if (!token) return;
        if (rememberMe) {
            localStorage.setItem(REFRESH_TOKEN_KEY, token);
            sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        } else {
            sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
    },

    getRefreshToken() {
        return (
            localStorage.getItem(REFRESH_TOKEN_KEY) ||
            sessionStorage.getItem(REFRESH_TOKEN_KEY)
        );
    },

    /**
     * 🟢 USER DATA MANAGEMENT
     */
    setUser(user, rememberMe = true) {
        if (!user) return;
        const userStr = JSON.stringify(user);
        if (rememberMe) {
            localStorage.setItem(USER_KEY, userStr);
            sessionStorage.removeItem(USER_KEY);
        } else {
            sessionStorage.setItem(USER_KEY, userStr);
            localStorage.removeItem(USER_KEY);
        }
    },

    getUser() {
        const userStr = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
        if (!userStr || userStr === "undefined") return null;

        try {
            return JSON.parse(userStr);
        } catch (e) {
            console.error("Error parsing user data", e);
            return null;
        }
    },

    /**
     * 🟢 PERMISSION CHECKING
     */
    hasPermission(permissionCode) {
        const user = this.getUser();
        if (!user) return false;

        const roleName = user.role?.name?.toLowerCase() || user.role?.toLowerCase() || '';

        // Super Admin bypass
        if (roleName === 'admin' || roleName === 'superadmin') return true;

        return user.permissions?.includes(permissionCode) || false;
    },

    // 🟢 HELPER: Is Admin Check
    isAdmin() {
        const user = this.getUser();
        if (!user) return false;
        const roleName = user.role?.name?.toLowerCase() || user.role?.toLowerCase() || '';
        return roleName === 'admin' || roleName === 'superadmin';
    }
};

// ✅ Default export added to prevent import errors
export default authService;