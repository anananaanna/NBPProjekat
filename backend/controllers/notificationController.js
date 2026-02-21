const { connection } = require('../database');
const socketIO = require('../socket'); // tvoj socket.js

// notificationController.js
exports.sendNotification = async (userId, message, type) => {
    const notification = {
        message: message,
        type,
        timestamp: new Date().toISOString(),
        id: Date.now(),
        isRead: false
    };

    try {
        // 1. Redis čuvanje i limit na 10
        await connection.lPush(`notifications:${userId}`, JSON.stringify(notification));
        await connection.lTrim(`notifications:${userId}`, 0, 9);

        const io = socketIO.getIO();
        const roomName = `user:${userId}`;

        // 2. OSTAVI SAMO OVU JEDNU LINIJU ZA EMIT:
        io.to(roomName).emit("getNotification", notification);
        
        // OBRISAO SAM: io.to(roomName).emit("discount_notification", notification); 
        // To je bio krivac za duple poruke!

        console.log(`Notifikacija poslata u sobu ${roomName}`);
    } catch (err) {
        console.error("Greška pri slanju notifikacije:", err);
    }
};

// Dobavljanje svih notifikacija
exports.getNotifications = async (req, res) => {
    const { userId } = req.params;
    try {
        // PAGINACIJA: Uzimamo samo poslednjih 20
        const data = await connection.lRange(`notifications:${userId}`, 0, 19);
        const notifications = data.map(item => JSON.parse(item));
        res.status(200).json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Brisanje na logout (ovo pozovi u login/logout kontroleru)
exports.clearNotifications = async (userId) => {
    try {
        await connection.del(`notifications:${userId}`);
    } catch (err) {
        console.error("Greška pri brisanju:", err);
    }
};

exports.markAsRead = async (req, res) => {
    const { userId } = req.params;
    try {
        const data = await connection.lRange(`notifications:${userId}`, 0, -1);
        const updatedData = data.map(item => {
            const parsed = JSON.parse(item);
            parsed.isRead = true; // Samo označavamo kao pročitano [cite: 459]
            return JSON.stringify(parsed);
        });

        if (updatedData.length > 0) {
            await connection.del(`notifications:${userId}`);
            // Vraćamo ih nazad ali kao pročitane
            await connection.rPush(`notifications:${userId}`, ...updatedData);
        }
        res.status(200).json({ message: "Sve označeno kao pročitano" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};