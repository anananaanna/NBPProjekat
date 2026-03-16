const Product = require('../models/Product');
const productRepository = require('../models/redis/productRedis');
const { connection: redis_client } = require('../database'); 
const notificationService = require('./notificationController');
const io = require('../socket');

// 1. CREATE 
exports.createProduct = async (req, res) => {
    const session = req.neo4jSession;
    const notificationService = require('./notificationController'); 

    try {
        const { name, price, brand, type, storeId, categoryName } = req.body;
        const imageName = req.file ? `products/${req.file.filename}` : 'products/default.png';
        const sIdNum = parseInt(storeId);

        const result = await session.run(
            `MATCH (s:Store) WHERE ID(s) = $sId
             MERGE (c:Category {name: $categoryName})
             MERGE (s)-[:OFFERS_CATEGORY]->(c)
             MERGE (b:Brand {name: $brand})
             CREATE (p:Product {name: $name, price: $price, brand: $brand, type: $type, image: $image})
             CREATE (s)-[:HAS_PRODUCT]->(p)
             CREATE (p)-[:BELONGS_TO]->(c)
             CREATE (b)-[:HAS_PRODUCT]->(p)
             RETURN p, ID(p) as id, c.name as catName, s.name as storeName`,
            { name, price: parseFloat(price), brand, type: type || "General", image: imageName, sId: sIdNum, categoryName }
        );

        if (result.records.length === 0) {
            return res.status(404).json({ error: "Prodavnica nije pronađena." });
        }

        const storeName = result.records[0].get('storeName');
        const savedProduct = {
            ...result.records[0].get('p').properties,
            id: result.records[0].get('id').toNumber(),
            category: result.records[0].get('catName')
        };

        // Redis keširanje
        await productRepository.save({ ...savedProduct, neo4jId: savedProduct.id });
        try {
            const storeRepository = require('../models/redis/storeRedis');
            await productRepository.dropIndex().catch(() => {}); 
            await storeRepository.dropIndex().catch(() => {}); 
        } catch (e) { console.log("Greška pri brisanju keša"); }

        // DEO ZA NOTIFIKACIJE 
        const followers = await session.run(
            `MATCH (u:User)-[:FOLLOWS]->(s:Store) WHERE ID(s) = $sId RETURN ID(u) as uId`,
            { sId: sIdNum }
        );

        followers.records.forEach(rec => {
            notificationService.sendNotification(
                rec.get('uId').toNumber(), 
                `Nova roba u ${storeName}! Stigao je ${name}.`, 
                'new_product'
            );
        });

        io.getIO().emit('store_updated', { storeId: sIdNum, action: 'product_added', product: savedProduct });

        res.status(201).json({ message: "Proizvod dodat!", product: savedProduct });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. READ ALL - Sa Redisom
exports.getAllProducts = async (req, res) => {
    try {
        await productRepository.createIndex().catch(() => {
            console.log("Indeks već postoji.");
        });

        let cachedProducts = [];
        try {
            cachedProducts = await productRepository.search().return.all();
        } catch (e) {
            console.log("Keš nije spreman.");
        }

        if (cachedProducts.length > 0) {
            console.log(`[REDIS] Vraćeno iz keša.`);
            return res.status(200).json(cachedProducts);
        }

        const session = req.neo4jSession;
        
        const result = await session.run(`
            MATCH (p:Product)-[:BELONGS_TO]->(c:Category) 
            RETURN p, ID(p) as id, c.name as catName
        `);

        const products = result.records.map(record => {
            const props = record.get('p').properties;
            return {
                ...props,
                id: record.get('id').toNumber(),
                price: props.price ? Number(props.price) : 0,
                categoryName: record.get('catName') 
            };
        });

        if (products.length > 0) {
            for (const p of products) {
                await productRepository.save({
                    name: p.name,
                    brand: p.brand,
                    price: Number(p.price),
                    type: p.type,
                    image: p.image,
                    neo4jId: p.id,
                    categoryName: p.categoryName 
                });
            }
            console.log(">>> [REDIS] Svi proizvodi osveženi sa kategorijama.");
        }

        res.status(200).json(products);
    } catch (error) {
        console.error("DETALJNA GREŠKA:", error);
        res.status(500).json({ error: "Greška...", detail: error.message });
    }
};

// 3. UPDATE
exports.updateProduct = async (req, res) => {
    const session = req.neo4jSession;
    
    try {
        console.log("Stiglo u body:", req.body);
        console.log("Fajl:", req.file);

        const { id, name, price, brand } = req.body;
        
        const numericId = parseInt(id);
        if (isNaN(numericId)) {
            throw new Error("ID proizvoda nije validan broj!");
        }

        // 2. Dinamički upit
        let query = `MATCH (p:Product) WHERE ID(p) = $id 
                     SET p.name = $name, p.price = $price, p.brand = $brand`;
        
        let params = { 
            id: numericId, 
            name, 
            price: parseFloat(price), 
            brand 
        };

        if (req.file) {
            params.image = `products/${req.file.filename}`;
            query += `, p.image = $image`;
        }

        query += ` RETURN p`;

        const result = await session.run(query, params);

        if (result.records.length === 0) {
            return res.status(404).json({ error: "Proizvod nije pronađen u bazi!" });
        }

        try {
            const productRepository = require('../models/redis/productRedis');
            const existingInRedis = await productRepository.search().where('name').equals(name).return.first();
            if (existingInRedis) {
                await productRepository.remove(existingInRedis.entityId);
            }
        } catch (redisError) {
            console.log("Redis nije mogao da se očisti, ali baza je ažurirana.");
        }

        const storeResult = await session.run(
            'MATCH (s:Store)-[:HAS_PRODUCT]->(p:Product) WHERE ID(p) = $id RETURN ID(s) as storeId',
            { id: numericId }
        );
        const storeId = storeResult.records[0]?.get('storeId').toNumber();

        if (storeId) {
            io.getIO().emit('store_updated', { storeId, action: 'product_updated', productId: numericId });
        }

        res.status(200).json({ 
            message: "Proizvod uspešno ažuriran!", 
            product: result.records[0].get('p').properties 
        });

    } catch (error) {
        console.error("DETALJNA GREŠKA NA SERVERU:", error); 
        res.status(500).json({ error: "Greška na serveru", detail: error.message });
    }
};
// 4. DELETE
exports.deleteProduct = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { id } = req.params;
        const numericId = parseInt(id);

        const info = await session.run('MATCH (p:Product) WHERE ID(p) = $id RETURN p.name as name', { id: numericId });
        
        if (info.records.length === 0) {
            return res.status(404).json({ error: "Proizvod ne postoji!" });
        }
        const productName = info.records[0].get('name');

        await session.run('MATCH (p:Product) WHERE ID(p) = $id DETACH DELETE p', { id: numericId });

        try {
            const redisProduct = await productRepository.search().where('name').equals(productName).return.first();
            if (redisProduct) {
                await productRepository.remove(redisProduct.entityId);
            }
        } catch (redisError) {
            console.log("Redis index nije bio spreman, ali proizvod je obrisan iz Neo4j.");
        }

        const storeResult = await session.run(
            'MATCH (s:Store)-[:HAS_PRODUCT]->(p:Product) WHERE ID(p) = $id RETURN ID(s) as storeId',
            { id: numericId }
        );
        const storeId = storeResult.records[0]?.get('storeId').toNumber();

        if (storeId) {
            io.getIO().emit('store_updated', { storeId, action: 'product_deleted', productId: numericId });
        }

        res.status(200).json({ message: `Proizvod "${productName}" obrisan.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. LINK TO STORE
exports.linkProductToStore = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { productId, storeId, price } = req.body;
        const result = await session.run(
            `MATCH (p:Product), (s:Store) 
             WHERE ID(p) = $productId AND ID(s) = $storeId
             CREATE (s)-[r:HAS_PRODUCT {price: $price}]->(p)
             RETURN r`,
            { productId: parseInt(productId), storeId: parseInt(storeId), price: parseFloat(price) }
        );

        // PROVERA: Ako result.records.length == 0, znači da Product ili Store ne postoje
        if (result.records.length === 0) {
            return res.status(404).json({ error: "Nije moguće povezati: Proizvod ili Prodavnica ne postoje!" });
        }

        res.status(200).json({ message: "Uspešno povezano!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. SEARCH (Samo Redis)
exports.searchProducts = async (req, res) => {
    const { query } = req.query;
    const session = req.neo4jSession;

    try {
        // Ako je query prazan ili prekratak, ne radi ništa
        if (!query || query.length < 2) return res.json([]);

        const result = await session.run(
            `MATCH (p:Product)
             WHERE p.name =~ $regex
             RETURN p { id: ID(p), .name, .price, .image, .brand } as product`,
            { regex: '(?i).*' + query + '.*' } // (?i) omogućava case-insensitive pretragu
        );

        const products = result.records.map(r => r.get('product'));
        res.json(products);
    } catch (error) {
        console.error("Search DB Error:", error);
        res.status(500).json([]); 
    }
};

exports.getRecommendedProducts = async (req, res) => {
    const { userId } = req.params;
    const session = req.neo4jSession;

    try {
        // KORAK 1: Provera wishlist-e
        const checkWishlist = await session.run(
            `MATCH (u:User)-[:INTERESTED_IN]->(p:Product) WHERE ID(u) = $userId RETURN count(p) as count`,
            { userId: parseInt(userId) }
        );

        const hasWishlist = checkWishlist.records[0].get('count').toNumber() > 0;
        let recommendations = [];

        if (hasWishlist) {
            // KORAK 2: Personalizovano
            const personalQuery = `
                MATCH (me:User)-[:INTERESTED_IN]->(common:Product)<-[:INTERESTED_IN]-(other:User)
                WHERE ID(me) = $userId AND me <> other
                MATCH (other)-[:INTERESTED_IN]->(rec:Product)
                WHERE NOT (me)-[:INTERESTED_IN]->(rec)
                // Ovde vraćamo ID odvojeno da ga lakše obradimo
                RETURN rec, ID(rec) as recId, count(other) as strength
                ORDER BY strength DESC LIMIT 6
            `;
            const result = await session.run(personalQuery, { userId: parseInt(userId) });
            
            recommendations = result.records.map(r => {
                const product = r.get('rec').properties;
                const id = r.get('recId');
                return {
                    ...product,
                    // Konvertujemo Neo4j Integer u običan JS broj
                    id: id.toNumber ? id.toNumber() : id,
                    strength: r.get('strength').toNumber()
                };
            });
        }

        // KORAK 3: Fallback (Najpopularnije)
        if (recommendations.length === 0) {
            const popularQuery = `
                MATCH (p:Product)<-[w:INTERESTED_IN]-()
                RETURN p, ID(p) as prodId, count(w) as popularity
                ORDER BY popularity DESC LIMIT 6
            `;
            const result = await session.run(popularQuery);
            
            recommendations = result.records.map(r => {
                const product = r.get('p').properties;
                const id = r.get('prodId');
                return {
                    ...product,
                    id: id.toNumber ? id.toNumber() : id,
                    popularity: r.get('popularity').toNumber()
                };
            });
        }

        res.json(recommendations);
    } catch (error) {
        console.error("Greška u preporukama:", error);
        res.status(500).json({ error: error.message });
    }
};

// 7. SEARCH HISTORY (Redis) - trebalo je da bude za cuvanje istorije pretrazivanja pomocu tagova

exports.getSearchHistory = async (req, res) => {
    const { userId } = req.params;
    const { connection } = require('../database'); // Koristimo osnovni klijent

    try {
        const key = `search_history:${userId}`;
        
        // lRange vraća niz stringova. 0 do -1 znači "uzmi sve"
        const history = await connection.lRange(key, 0, -1);
        
        console.log(`>>> REDIS: Istorija za ${userId}:`, history);
        res.status(200).json(history || []);
    } catch (error) {
        console.error("REDIS FETCH ERROR:", error);
        // Čak i ako pukne Redis, vrati prazan niz da Frontend ne bi bacao Error
        res.status(200).json([]); 
    }
};

exports.saveSearchHistory = async (req, res) => {
    const { userId, query } = req.body;
    const { connection } = require('../database');

    if (!userId || !query) return res.status(400).send();

    try {
        const key = `search_history:${userId}`;
        
        // Uzmi prvi (poslednji traženi) element iz liste
        const lastSearch = await connection.lIndex(key, 0);

        // Ako je trenutna pretraga ista kao prošla, nemoj je dodavati opet
        if (lastSearch !== query) {
            // Prvo obriši ako već postoji negde u listi (da bi je pomerili na vrh)
            await connection.lRem(key, 1, query);
            // Dodaj na početak
            await connection.lPush(key, query);
            // Skrati na 5
            await connection.lTrim(key, 0, 4);
            // Produži rok trajanja
            await connection.expire(key, 86400);
        }

        res.status(200).json({ message: "OK" });
    } catch (error) {
        console.error("REDIS SAVE ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};