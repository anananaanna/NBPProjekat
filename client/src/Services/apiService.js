import axios from '../Axios/Axios';

export const userService = {
    login: async (credentials) => {
        const response = await axios.post('/user/login', credentials);
        return response.data;
    },
    register: async (userData) => {
        const response = await axios.post('/user/register', userData);
        return response.data;
    },
updateUser: (data) => axios.put('/user/update-profile', data),
    getWishlist: (userId) => axios.get(`/user/wishlist/${userId}`),
    addToWishlist: (data) => axios.post('/user/wishlist/add', data),
    removeFromWishlist: (data) => axios.post('/user/wishlist/remove', data),
    followStore: (data) => axios.post('/user/follow-store', data)
};

export const productService = {
    getAllProducts: () => axios.get('/product/all'),
    getProductById: (id) => axios.get(`/product/${id}`),
    
    searchProducts: async (query, userId) => {
        if (userId && query) {
            await axios.post('/product/search-history', { userId, query });
        }
        return axios.get(`/product/search?query=${query}`);
    },

    getSearchHistory: (userId) => axios.get(`/product/search-history/${userId}`),

    getRecommendedProducts: (userId) => axios.get(`/product/recommended/${userId}`),
    
    getFollowedProducts: (userId) => axios.get(`/product/followed/${userId}`),

    getTopProducts: () => axios.get('/product/top'), 
    setDiscount: (data) => axios.post('/discount/add', data),
    removeDiscount: (data) => axios.post('/discount/remove', data),
    // U apiService.js
updateProduct: (formData) => {
        return axios.put('/product/update', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    
    deleteProduct: (id) => axios.delete(`/product/delete/${id}`),
    
    createProduct: (formData) => axios.post(`/product/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),

    getAllCategories: () => axios.get('category/all'),
    
    getProductsByStoreAndCategory: (storeId, categoryId) => 
        axios.get(`/product/store/${storeId}/category/${categoryId}`),
};

export const storeService = {
    getAllStores: () => axios.get('/store/all'),
    
    getStoreById: (id, userId) => {
    const url = userId ? `/store/${id}?userId=${userId}` : `/store/${id}`;
    return axios.get(url);},

    getTop3Stores: () => axios.get('/store/trending/top'),

    getSuggestedStores: (userId) => axios.get(`/store/suggested/${userId}`),

    getStoreCategories: (storeId) => axios.get(`/store/${storeId}/categories`),
    getStoreProducts: (storeId) => axios.get(`/store/${storeId}/products`),
    
    createStore: (formData) => axios.post(`/store/create`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    
    updateStore: (storeData) => axios.put('/store/update', storeData),
    deleteStore: (id) => axios.delete(`/store/delete/${id}`),


    addStoreRating: (data) => axios.post('/rating/add', data),
    addStoreComment: (data) => axios.post('/comment/add', data),
    getStoreComments: (storeId) => axios.get(`/comment/store/${storeId}`),

getUserRating: (userId, storeId) => api.get(`/rating/user/${userId}/store/${storeId}`),
};

export const ratingService = {
    addRating: (data) => axios.post('/rating/add', data),
    updateRating: (data) => axios.put('/rating/update', data),
    getStoreAverageRating: (storeId) => axios.get(`/rating/avg/${storeId}`),
    deleteRating: (userId, storeId) => 
        axios.delete(`/rating/delete?userId=${userId}&storeId=${storeId}`),
    getAllRatingsForStore: (storeId) => axios.get(`/rating/all/${storeId}`),
    getUserRating: (userId, storeId) => axios.get(`/rating/user/${userId}/store/${storeId}`),
};

export const commentService = {
    addComment: (data) => axios.post('/comment/add', data),
    updateComment: (data) => axios.put('/comment/update', data),
    deleteComment: (commentId) => axios.delete(`/comment/delete/${commentId}`),
    getStoreComments: (storeId) => axios.get(`/comment/store/${storeId}`),
};

export const notificationService = {
    getNotifications: (userId) => axios.get(`/notifications/${userId}`),
    clearNotifications: (userId) => axios.delete(`/notifications/${userId}`),
    markAsRead: (userId) => axios.put(`/notifications/${userId}/mark-as-read`),
};