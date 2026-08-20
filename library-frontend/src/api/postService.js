import api from './axiosConfig';

const postService = {
  // =================================================
  // 0. GET ADMIN POSTS (Admin Only)
  // =================================================
  getAdminPosts: async (skip = 0, limit = 50) => {
    try {
      const response = await api.get(`/api/posts/?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching admin posts:", error);
      throw error;
    }
  },

  getPostById: async (postId) => {
    try {
      const response = await api.get(`/api/posts/${postId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching post details:", error);
      throw error;
    }
  },
  
  // =================================================
  // 1. GET ALL POSTS (For User & Home Page)
  // =================================================
  // Ye function "LatestPosts.jsx" aur "Home.jsx" mein use hoga
  getAllPosts: async () => {
    try {
      // Backend route: /api/posts/public (Jo sabke liye open hai)
      const response = await api.get('/api/posts/public');
      return response;
    } catch (error) {
      console.error("Error fetching all posts:", error);
      throw error;
    }
  },

  // =================================================
  // 2. GET PAGINATED POSTS (Optional - For Load More)
  // =================================================
  getPublicPosts: async (skip = 0, limit = 20) => {
    try {
      const response = await api.get(`/api/posts/public?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching public posts:", error);
      throw error;
    }
  },

  // =================================================
  // 3. CREATE POST (Admin Only)
  // =================================================
  createPost: async (formData) => {
    try {
      // Note: Hum 'formData' bhej rahe hain, isliye Content-Type automatic set hona chahiye
      // lekin hum explicitly bhi bata sakte hain.
      const response = await api.post('/api/posts/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data', 
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error creating post:", error);
      throw error;
    }
  },

  // =================================================
  // 4. UPDATE POST (Admin Only)
  // =================================================
  updatePost: async (postId, formData) => {
    try {
      const response = await api.put(`/api/posts/${postId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error updating post:", error);
      throw error;
    }
  },

  // =================================================
  // 5. DELETE POST (Admin Only)
  // =================================================
  deletePost: async (postId) => {
    try {
      const response = await api.delete(`/api/posts/${postId}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting post:", error);
      throw error;
    }
  }
};

export default postService;