const { Schema, Repository } = require('redis-om');
const { redis_client } = require('../../database'); // Koristimo redis_client direktno

const productSchema = new Schema('Product', {
    name: { type: 'text' },
    brand: { type: 'text' },
    type: { type: 'string' }, // Ovo možeš ostaviti, ali ćemo 'category' koristiti za Neo4j vezu
    category: { type: 'string' }, // DODATO
    price: { type: 'number' },
    image: { type: 'string' },
    neo4jId: { type: 'number' }
}, {
    dataStructure: 'JSON'
});

// Koristimo redis_client koji si definisala u database.js
const productRepository = new Repository(productSchema, redis_client);

module.exports = productRepository;