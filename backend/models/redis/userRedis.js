const { Schema, Repository } = require('redis-om');
const { redis_client } = require('../../database');

const userSchema = new Schema('User', {
    username: { type: 'string' },
    email: { type: 'string' },
    role: { type: 'string' }
}, {
    dataStructure: 'JSON'
});

const userRepository = new Repository(userSchema, redis_client);

module.exports = userRepository;