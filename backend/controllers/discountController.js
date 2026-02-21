const discountRepository = require('../models/redis/discountRedis');
const io = require('../socket'); // Putanja mora biti tačna

exports.addDiscount = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { amount, discountPercentage, storeName, productName } = req.body;
        
        // 1. Provera proizvoda i cene
        const productCheck = await session.run(
            `MATCH (p:Product) 
             WHERE p.name = $productName OR p.name = trim($productName)
             RETURN p.price as regPrice, p.name as exactName`,
            { productName }
        );

        if (productCheck.records.length === 0) {
            return res.status(404).json({ error: `Proizvod "${productName}" nije pronađen.` });
        }

        const regularPrice = productCheck.records[0].get('regPrice');
        const exactProductName = productCheck.records[0].get('exactName');
        let finalDiscountPrice;

        if (discountPercentage) {
            finalDiscountPrice = regularPrice * (1 - parseFloat(discountPercentage) / 100);
        } else {
            finalDiscountPrice = parseFloat(amount);
        }

        if (finalDiscountPrice >= regularPrice) {
    return res.status(400).json({ 
        error: `Akcijska cena (${finalDiscountPrice} RSD) mora biti manja od regularne cene (${regularPrice} RSD).` 
    });
}

        // 2. Upis u Neo4j (Popust i Relacije)
        await session.run(
            `MATCH (p:Product {name: $productName})
             SET p.discountPrice = $finalPrice
             WITH p
             OPTIONAL MATCH (s:Store) WHERE s.name = $storeName OR s.name = trim($storeName)
             CREATE (d:Discount {
                amount: $finalPrice, 
                percentage: $perc,
                createdAt: timestamp()
             })
             MERGE (p)<-[:APPLIES_TO]-(d)
             WITH d, s
             WHERE s IS NOT NULL
             MERGE (s)-[:OFFERS]->(d)
             RETURN ID(d)`,
            { 
                finalPrice: parseFloat(finalDiscountPrice), 
                perc: parseInt(discountPercentage || Math.round((1 - finalDiscountPrice/regularPrice)*100)),
                storeName, 
                productName: exactProductName 
            }
        );

        // --- DEO ZA NOTIFIKACIJE ---
        console.log("--- DIJAGNOSTIKA NOTIFIKACIJA ---");
        
        const wishlistUsers = await session.run(
            `MATCH (u:User)-[:INTERESTED_IN]->(p:Product {name: $productName})
             RETURN u, ID(u) as internalId`, // Uzimamo ceo čvor i njegov interni ID za svaki slučaj
            { productName: exactProductName }
        );

        console.log(`Pronađeno korisnika u Wishlisti: ${wishlistUsers.records.length}`);

        const ioInstance = io.getIO();
        wishlistUsers.records.forEach(record => {
            const userNode = record.get('u').properties;
            const internalId = record.get('internalId').toString();
            
            // PROVJERA: Koji ID tvoj sistem koristi? 
            // Ako je u terminalu pisalo "Korisnik 27", onda je to verovatno internalId ili userNode.id
            const targetUserId = userNode.id || userNode.userId || internalId;
            
            console.log(`Šaljem socket poruku korisniku: ${userNode.username} (ID: ${targetUserId})`);
            
            ioInstance.to(`user:${targetUserId}`).emit('discount_notification', {
                text: `Proizvod "${exactProductName}" iz vaše liste želja je sada na popustu! ✨`,
                discountPrice: finalDiscountPrice,
                productName: exactProductName
            });
        });

        // 3. Slanje odgovora klijentu (tek na kraju)
        res.status(201).json({ 
            message: "Popust aktiviran i notifikacije poslate!", 
            discountPrice: finalDiscountPrice 
        });

    } catch (error) {
        console.error("NEO4J GREŠKA:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
};

// 2. READ - Cache-Aside logika
exports.getStoreDiscounts = async (req, res) => {
    const { storeName } = req.params;
    try {
        await discountRepository.createIndex();
        
        // 1. POKUŠAJ REDIS
        const redisDiscounts = await discountRepository.search()
            .where('storeName').equals(storeName)
            .return.all();

        if (redisDiscounts.length > 0) {
            return res.status(200).json(redisDiscounts);
        }

        // 2. AKO REDIS NEMA, IDI NA NEO4J
        const session = req.neo4jSession;
        const result = await session.run(
            `MATCH (s:Store {name: $storeName})-[:OFFERS]->(d:Discount)-[:APPLIES_TO]->(p:Product)
             RETURN d.amount as amount, s.name as storeName, p.name as productName, ID(d) as neoId`,
            { storeName }
        );

        const response = result.records.map(record => ({
            amount: record.get('amount'),
            storeName: record.get('storeName'),
            productName: record.get('productName'),
            neo4jId: record.get('neoId').low
        }));

        // 3. KEŠIRAJ U REDIS
        if (response.length > 0) {
            for (const item of response) {
                const entity = await discountRepository.createEntity(item);
                await discountRepository.save(entity);
                await discountRepository.expire(entity.entityId, 300);
            }
        }

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. UPDATE - Ažuriranje i brisanje starog keša
exports.updateDiscount = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { id, newAmount } = req.body;
        
        await session.run(
            'MATCH (d:Discount) WHERE ID(d) = $id SET d.amount = $newAmount',
            { id: parseInt(id), newAmount: parseFloat(newAmount) }
        );

        // Brisanje iz Redisa po neo4jId-u
        const redisItems = await discountRepository.search()
            .where('neo4jId').equals(parseInt(id))
            .return.all();

        for (const item of redisItems) {
            await discountRepository.remove(item.entityId);
        }

        res.status(200).json({ message: "Popust ažuriran i keš očišćen!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. DELETE - Brisanje svuda
exports.deleteDiscount = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { id } = req.params;
        
        await session.run('MATCH (d:Discount) WHERE ID(d) = $id DETACH DELETE d', { id: parseInt(id) });
        
        // Očisti Redis
        const redisItems = await discountRepository.search()
            .where('neo4jId').equals(parseInt(id))
            .return.all();

        for (const item of redisItems) {
            await discountRepository.remove(item.entityId);
        }

        res.status(200).json({ message: "Popust obrisan svuda." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.removeDiscount = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { productName } = req.body;

        console.log(`Uklanjanje popusta za: ${productName}`);

        // 1. Upis u Neo4j: Brišemo polje discountPrice i kidamo veze sa Discount čvorom
        const result = await session.run(
            `MATCH (p:Product {name: $productName})
             OPTIONAL MATCH (p)<-[:APPLIES_TO]-(d:Discount)
             SET p.discountPrice = null
             DETACH DELETE d
             RETURN p.name as name`,
            { productName }
        );

        if (result.records.length === 0) {
            return res.status(404).json({ error: "Proizvod nije pronađen." });
        }

        // 2. Očisti Redis (ako koristiš redisRepository)
        // Najsigurnije je obrisati sve vezano za popuste u toj prodavnici 
        // ili po neo4jId-u ako ga imaš, ali za početak možeš obrisati ključ proizvoda
        // await discountRepository.removeByProductName(productName); 

        console.log(`USPEH: Popust uklonjen za ${productName}`);

        res.status(200).json({ message: "Popust uspešno uklonjen!" });
    } catch (error) {
        console.error("GREŠKA PRI UKLANJANJU:", error);
        res.status(500).json({ error: error.message });
    }
};