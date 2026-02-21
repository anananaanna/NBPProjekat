const { Schema, Repository } = require('redis-om');
const { redis_client } = require('../../database');

const storeSchema = new Schema('Store', {
    name: { type: 'text' },
    location: { type: 'text' },
    address: { type: 'text' },
    storeId: { type: 'number' }
}, {
    dataStructure: 'JSON'
});

const storeRepository = new Repository(storeSchema, redis_client);
module.exports = storeRepository;