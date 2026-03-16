require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path'); // DODAJ OVO
const { driver } = require('./database');
const http = require('http');
const socket = require('./socket');
const neo4jMiddleware = require('./middleware/neo4jMiddleware');

const app = express();
const server = http.createServer(app);

socket.init(server);

app.use(cors());
app.use(bodyParser.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(neo4jMiddleware);

// 4. Uvoz ruta
const userRoutes = require('./route/user');
const storeRoutes = require('./route/store'); 
const discountRoutes = require('./route/discount'); 
const productRoutes = require('./route/product');
const categoryRoutes = require('./route/category');
const commentRoutes = require('./route/comment');
const ratingRoutes = require('./route/rating');
const notificationRoutes = require('./route/notification');

// 5. Aktivacija ruta
app.use('/user', userRoutes);
app.use('/store', storeRoutes);
app.use('/discount', discountRoutes);
app.use('/product', productRoutes);
app.use('/category', categoryRoutes);
app.use('/comment', commentRoutes);
app.use('/rating', ratingRoutes);
app.use('/notifications', notificationRoutes);

process.on('SIGINT', shutdownHandler);
process.on('SIGUSR2', shutdownHandler); // Za nodemon restart

async function shutdownHandler() {
    console.log('Zatvaram server i sve konekcije...');
    
    // Zatvori HTTP server
    server.close(() => {
        console.log('HTTP server zatvoren.');
    });
    
    // Zatvori Socket.io
    const io = socket.getIO();
    io.close(() => {
        console.log('Socket.io zatvoren.');
    });
    
    // Zatvori Neo4j driver
    await driver.close();
    console.log('Neo4j driver zatvoren.');
    
    // Zatvori Redis konekcije
    const { connection, redis_client } = require('./database');
    if (connection.isOpen) {
        await connection.quit();
        console.log('Redis connection zatvoren.');
    }
    if (redis_client.isOpen()) {
        await redis_client.close();
        console.log('Redis-OM client zatvoren.');
    }
    
    process.exit(0);
}

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server je pokrenut na portu ${PORT}`);
});