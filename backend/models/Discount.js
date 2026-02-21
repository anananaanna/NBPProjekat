const { driver } = require('../database');

const Discount = {
    // Kreiranje popusta i njegovo povezivanje sa prodavnicom
    create: async (discountData) => {
        const session = driver.session();
        try {
            const result = await session.run(
                `MATCH (s:Store {name: $storeName})
                 CREATE (d:Discount {
                     title: $title, 
                     description: $description, 
                     amount: $amount, 
                     validUntil: $validUntil,
                     createdAt: timestamp()
                 })
                 CREATE (s)-[:OFFERS]->(d)
                 RETURN d`,
                {
                    storeName: discountData.storeName,
                    title: discountData.title,
                    description: discountData.description,
                    amount: discountData.amount, // npr. "20%" ili "500 rsd"
                    validUntil: discountData.validUntil
                }
            );
            return result.records[0].get('d').properties;
        } finally {
            await session.close();
        }
    },

    // Pronalaženje svih aktivnih popusta u određenoj prodavnici
    getByStore: async (storeName) => {
        const session = driver.session();
        try {
            const result = await session.run(
                'MATCH (s:Store {name: $storeName})-[:OFFERS]->(d:Discount) RETURN d',
                { storeName }
            );
            return result.records.map(record => record.get('d').properties);
        } finally {
            await session.close();
        }
    }
};

module.exports = Discount;