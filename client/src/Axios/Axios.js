import axios from 'axios';

const instance = axios.create({
    baseURL: 'http://localhost:3001', // Tvoj backend port
});

export default instance;