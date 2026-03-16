const { Schema, Repository } = require('redis-om');
const { redis_client } = require('../../database');

// Definišemo kako popust izgleda u Redisu
const discountSchema = new Schema('Discount', {
    amount: { type: 'number' },
    storeName: { type: 'string' },
    productName: { type: 'string' },
    neo4jId: { type: 'number' } // OBAVEZNO DODAJ OVO
}, {
    dataStructure: 'JSON'
});

// Pravimo repozitorijum (alat za rad sa podacima)
const discountRepository = new Repository(discountSchema, redis_client);


module.exports = discountRepository;