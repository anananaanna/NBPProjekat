// database.js
const neo4j = require('neo4j-driver');
const { createClient } = require('redis');
const { Client } = require('redis-om');

const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'password123'));

const connection = createClient({ url: 'redis://localhost:6379' });
connection.connect()
    .then(() => console.log('>>> REDIS: Povezan i spreman!'))
    .catch(err => console.error('>>> REDIS: Greška pri povezivanju:', err)); // Pokrećemo, ali ne čekamo ovde zbog CommonJS

const redis_client = new Client();

const startRedis = async () => {
    if (!redis_client.isOpen()) {
        await redis_client.open('redis://localhost:6379');
        console.log('>>> REDIS-OM: Povezan i spreman!');
    }
};

startRedis().catch(console.error);

const create_session = async () => driver.session();

// U database.js, promeni export na dnu:
module.exports = { 
    driver, 
    create_session, 
    redis_client, 
    connection: connection // <--- koristi direktno ovaj klijent sa vrha fajla
};