const { Server } = require("socket.io");

let io;

module.exports = {
    init: (httpServer) => {
        io = new Server(httpServer, {
            cors: {
                origin: "*", // U produkciji ovde ide URL tvog frontenda
                methods: ["GET", "POST"]
            }
        });

        io.on("connection", (socket) => {
            console.log("Korisnik povezan:", socket.id);

            // Korisnik se pridružuje svojoj ličnoj "sobi" preko ID-ja
            socket.on("join", (userId) => {
                socket.join(`user:${userId}`);
                console.log(`Korisnik ${userId} se pridružio svojoj sobi.`);
            });

            socket.on("disconnect", () => {
                console.log("Korisnik se odjavio.");
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error("Socket.io nije inicijalizovan!");
        }
        return io;
    }
};