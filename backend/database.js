// database.js
const neo4j = require('neo4j-driver');
const { createClient } = require('redis');
const { Client } = require('redis-om');

const driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));


const connection = createClient({ url: process.env.REDIS_URL });
connection.connect()
    .then(() => console.log('>>> REDIS: Povezan i spreman!'))
    .catch(err => console.error('>>> REDIS: Greška pri povezivanju:', err)); 

const redis_client = new Client();

const startRedis = async () => {
    if (!redis_client.isOpen()) {
        await redis_client.open(process.env.REDIS_URL);
        console.log('>>> REDIS-OM: Povezan i spreman!');
    }
};

startRedis().catch(console.error);

const create_session = async () => driver.session();

module.exports = { 
    driver, 
    create_session, 
    redis_client, 
    connection: connection 
};