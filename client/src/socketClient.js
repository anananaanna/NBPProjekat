import { io } from "socket.io-client";

// Ovde ide URL tvog backenda (isti onaj koji koristi Axios)
const URL = "http://localhost:3001"; 

export const socket = io(URL, {
    autoConnect: true 
});