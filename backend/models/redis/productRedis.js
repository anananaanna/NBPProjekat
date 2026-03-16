const { Schema, Repository } = require('redis-om');
const { redis_client } = require('../../database'); 

const productSchema = new Schema('Product', {
    name: { type: 'text' },
    brand: { type: 'text' },
    type: { type: 'string' }, 
    category: { type: 'string' }, 
    price: { type: 'number' },
    image: { type: 'string' },
    neo4jId: { type: 'number' }
}, {
    dataStructure: 'JSON'
});

const productRepository = new Repository(productSchema, redis_client);

module.exports = productRepository;