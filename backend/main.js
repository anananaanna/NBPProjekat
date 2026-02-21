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

// 3. Neo4j Middleware (mora biti pre ruta!)
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

// 6. Graceful shutdown - Zatvaranje Neo4j drivera kada se ugasi server
// Ovo sprema "leak" konekcija ka bazi
process.on('SIGINT', async () => {
    await driver.close();
    console.log('Neo4j driver zatvoren.');
    process.exit(0);
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server je pokrenut na portu ${PORT}`);
});