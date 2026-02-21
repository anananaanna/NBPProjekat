const Store = require('../models/Store');
const storeRepository = require('../models/redis/storeRedis');
const io = require('../socket'); // Dodato za real-time notifikacije
const { redis_client } = require('../database'); // Proveri da li se odavde uvozi klijent
//const socketIO = require('../socket'); // tvoj socket.js


// 1. CREATE
exports.createStore = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { name, address, city, vendorId } = req.body;
        const logoName = req.file ? `stores/${req.file.filename}` : 'stores/default-store.png';
        const vIdNum = parseInt(vendorId);

        const result = await session.run(
            `MATCH (u:User) 
             WHERE ID(u) = $vId OR u.id = $vId 
             CREATE (s:Store {
                name: $name, 
                address: $address, 
                city: $city, 
                logo: $logo,
                vendorId: $vId
             })
             CREATE (u)-[:OWNS_STORE]->(s)
             RETURN s, ID(s) as id`,
            { name, address, city, vId: vIdNum, logo: logoName }
        );

        if (result.records.length === 0) {
            return res.status(404).json({ error: "Korisnik (Vendor) nije pronađen." });
        }

        // --- OVO JE KLJUČNO: Brišemo Redis keš da bi Dashboard video novu prodavnicu ---
        try {
            await storeRepository.dropIndex();
        } catch (e) {
            console.log("Redis keš je već prazan.");
        }

        res.status(201).json({ message: "Prodavnica uspešno kreirana!" });
    } catch (error) {
        console.error("Greška pri kreiranju prodavnice:", error);
        res.status(500).json({ error: error.message });
    }
};

// 2. UPDATE
exports.updateStore = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { id, name, city, address } = req.body; // Dodata adresa
        const numericId = parseInt(id);

        let query = `MATCH (s:Store) WHERE ID(s) = $id 
                     SET s.name = $name, s.city = $city, s.address = $address`;
        let params = { id: numericId, name, city, address };

        if (req.file) {
            query += `, s.logo = $logo`;
            params.logo = `stores/${req.file.filename}`;
        }

        const result = await session.run(
            `MATCH (s:Store) WHERE ID(s) = $id 
             SET s.name = $name, s.city = $city, s.address = $address 
             RETURN s`,
            { id: numericId, name, city, address }
        );

        if (result.records.length === 0) {
            return res.status(404).json({ error: "Prodavnica nije pronađena!" });
        }

        // --- ČIŠĆENJE REDIS KEŠA ---
        try {
            await storeRepository.dropIndex().catch(() => {});
            console.log("Redis keš očišćen nakon ažuriranja prodavnice.");
        } catch (e) { console.log("Redis error ignored"); }

        res.status(200).json({ message: "Prodavnica uspešno ažurirana!" });
    } catch (error) {
        console.error("Update Store Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// 4. GET BY ID
// BACKEND: storeController.js
// 4. GET BY ID (Popravljena verzija)
exports.getStoreById = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { id } = req.params;
        const { userId } = req.query;

        // IZMENJEN UPIT: Dodat "allFollowers" koji broji sve veze ka prodavnici
        const result = await session.run(
            `MATCH (s:Store) WHERE ID(s) = $id
             OPTIONAL MATCH (anyUser:User)-[r:RATED]->(s)
             OPTIONAL MATCH (f_all:User)-[:FOLLOWS]->(s)
             OPTIONAL MATCH (u:User)-[f:FOLLOWS]->(s) WHERE ID(u) = $uId OR u.id = $uId
             RETURN s, 
                    ID(s) as id, 
                    avg(r.score) as averageRating, 
                    count(DISTINCT r) as ratingCount,
                    count(DISTINCT f_all) as followersCount,
                    count(f) > 0 as isFollowing`,
            { id: parseInt(id), uId: userId ? parseInt(userId) : -1 }
        );

        if (result.records.length === 0) {
            return res.status(404).json({ message: "Prodavnica nije pronađena" });
        }

        const record = result.records[0];
        const storeProps = record.get('s').properties;
        const avgRating = record.get('averageRating');

        const store = {
            id: record.get('id').toNumber(),
            ...storeProps,
            averageRating: avgRating !== null ? parseFloat(avgRating.toFixed(1)) : 0,
            ratingCount: record.get('ratingCount').toNumber(),
            followers: record.get('followersCount').toNumber(), // OVO ŠALJEMO FRONTENDU
            isFollowing: record.get('isFollowing')
        };

        // --- SIGURAN REDIS POZIV ---
        try {
            if (global.redis_client && global.redis_client.isOpen) {
                // await redis_client.zIncrBy('trending_stores', 1, `Store:${store.id}:${store.name}`);
            }
        } catch (redisErr) {
            console.warn("Redis Trending Error (Ignored):", redisErr.message);
        }
        // ---------------------------

        res.json(store);
    } catch (error) {
        console.error("Greška u getStoreById:", error);
        res.status(500).json({ error: error.message });
    }
};

// 5. GET ALL STORES (Sa Redis kešom)
exports.getAllStores = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const result = await session.run(
            `MATCH (u:User)-[:OWNS_STORE]->(s:Store) 
             OPTIONAL MATCH (s)-[:HAS_PRODUCT]->(p:Product)
             OPTIONAL MATCH (anyUser:User)-[r:RATED]->(s)
             RETURN s, 
                    ID(s) as id, 
                    ID(u) as ownerId, 
                    count(DISTINCT p) as productCount,
                    avg(r.score) as averageRating,
                    count(DISTINCT r) as ratingCount`
        );

        const stores = result.records.map(r => {
            const props = r.get('s').properties;
            const sId = r.get('id').toNumber();
            const vId = r.get('ownerId').toNumber();
            
            // Izvlačimo prosek i broj ocena, pazimo na null vrednosti
            const avgRating = r.get('averageRating');
            const rCount = r.get('ratingCount').toNumber();

            return {
                id: sId,
                storeId: sId,
                ...props,
                vendorId: vId,
                productCount: r.get('productCount').toNumber(),
                // Ako nema ocena, stavi 0, inače zaokruži na jednu decimalu
                averageRating: avgRating !== null ? parseFloat(avgRating.toFixed(1)) : 0,
                ratingCount: rCount
            };
        });

        // Osvežavamo Redis
        try {
            await storeRepository.dropIndex().catch(() => {});
            for (const s of stores) {
                await storeRepository.save(s);
            }
        } catch (e) { console.log("Redis error ignored"); }

        res.status(200).json(stores);
    } catch (error) { 
        res.status(500).json({ error: error.message }); 
    }
};

// 6. ADD PRODUCT TO DISCOUNT + SOCKET NOTIFICATIONS
exports.addProductToDiscount = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { storeId, productId, discountPrice } = req.body;

        // 1. Prvo proveravamo da li ta prodavnica uopšte prodaje taj proizvod
        const checkRelation = await session.run(
            'MATCH (s:Store)-[r:HAS_PRODUCT]->(p:Product) WHERE ID(s) = $storeId AND ID(p) = $productId RETURN r',
            { storeId: parseInt(storeId), productId: parseInt(productId) }
        );

        if (checkRelation.records.length === 0) {
            return res.status(400).json({ 
                error: "Greška: Ne možete dati popust na proizvod koji prodavnica nema u asortimanu!" 
            });
        }

        // 2. Ako postoji, onda pravimo/ažuriramo popust
        const result = await session.run(
            `MATCH (s:Store), (p:Product)
             WHERE ID(s) = $storeId AND ID(p) = $productId
             MERGE (s)-[r:HAS_DISCOUNT]->(p)
             SET r.price = $discountPrice, r.active = true
             WITH s, p
             OPTIONAL MATCH (u:User)-[:INTERESTED_IN]->(p)
             RETURN u.username AS username, ID(u) as userId, p.name AS productName, s.name AS storeName`,
            { storeId: parseInt(storeId), productId: parseInt(productId), discountPrice: parseFloat(discountPrice) }
        );

        // 3. Socket notifikacije (samo ako ima zainteresovanih korisnika)
        const records = result.records.filter(reg => reg.get('username') !== null);
        
        records.forEach(reg => {
            const userId = reg.get('userId').toNumber();
            const username = reg.get('username');
            const pName = reg.get('productName');
            const sName = reg.get('storeName');

            io.getIO().to(`user:${userId}`).emit('notification', {
                message: `Akcija! ${pName} u radnji ${sName} je sada ${discountPrice} RSD!`
            });
        });

        res.status(200).json({ 
            message: "Popust aktiviran!", 
            notificationsSent: records.length 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getStoreCategories = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { id } = req.params;
        const result = await session.run(
            `MATCH (s:Store)-[:OFFERS_CATEGORY]->(c:Category)
             WHERE ID(s) = $id
             RETURN c, ID(c) as id`,
            { id: parseInt(id) }
        );

        const categories = result.records.map(r => ({
            ...r.get('c').properties,
            id: r.get('id').toNumber()
        }));

        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// DODAJ OVO U storeController.js
exports.getStoreProducts = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { id } = req.params;
        const result = await session.run(
            `MATCH (s:Store)-[:HAS_PRODUCT]->(p:Product)
             WHERE ID(s) = $id
             OPTIONAL MATCH (p)-[:BELONGS_TO]->(c:Category)
             RETURN p, ID(p) as id, c.name as categoryName`, // Dodato categoryName
            { id: parseInt(id) }
        );

        const products = result.records.map(record => ({
            ...record.get('p').properties,
            id: record.get('id').toNumber(),
            category: record.get('categoryName') || "Ostalo" // Da imamo polje za filtriranje
        }));

        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteStore = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { id } = req.params;
        const numericId = parseInt(id);

        // Cypher upit koji briše:
        // 1. Sve proizvode (p) koji su povezani sa prodavnicom (s)
        // 2. Sve njihove relacije (DETACH)
        // 3. Na kraju samu prodavnicu (s)
        await session.run(
            `MATCH (s:Store) WHERE ID(s) = $id
             OPTIONAL MATCH (s)-[:HAS_PRODUCT]->(p:Product)
             DETACH DELETE p, s`,
            { id: numericId }
        );

        // --- ČIŠĆENJE REDIS KEŠA ---
        try {
            await storeRepository.dropIndex().catch(() => {});
            // Ovde bi idealno bilo obrisati i keš za proizvode jer su i oni obrisani
            // await productRepository.dropIndex().catch(() => {}); 
        } catch (e) { console.log("Redis error ignored"); }

        res.status(200).json({ message: "Prodavnica i svi njeni proizvodi su obrisani!" });
    } catch (error) {
        console.error("Delete Store Error:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getTop3Stores = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const query = `
    MATCH (s:Store)
    OPTIONAL MATCH (u:User)-[:FOLLOWS]->(s)
    OPTIONAL MATCH (:User)-[r:RATED]->(s)
    WITH s, 
         count(DISTINCT u) as followersCount, 
         count(DISTINCT r) as ratingCount, 
         avg(r.score) as avgRating
    
    // Poboljšana formula:
    // Rejting na kvadrat daje snagu kvalitetu
    // followersCount se dodaje na kraju da razbije "nerešene" rezultate
    WITH s, followersCount, ratingCount, coalesce(avgRating, 0.0) as averageRating,
         (ratingCount * (coalesce(avgRating, 0.0) * coalesce(avgRating, 0.0))) + (followersCount * 2.0) as popularityScore
    
    RETURN ID(s) as storeId, 
           s.name as name, 
           popularityScore as score, 
           averageRating as avgRating, 
           followersCount as followers
    // Prvo po skoru, a ako je skor isti, onaj sa više pratilaca ide gore
    ORDER BY score DESC, followers DESC
    LIMIT 3
`;

        const result = await session.run(query);
        
        const topStores = result.records.map(record => {
            // Bezbedno izvlačenje ID-ja bez obzira da li je Integer ili Number
            const rawId = record.get('storeId');
            const id = (rawId && rawId.toNumber) ? rawId.toNumber() : rawId;

            return {
                id: id,
                name: record.get('name'),
                score: parseFloat(record.get('score')).toFixed(1),
                avgRating: parseFloat(record.get('avgRating')).toFixed(1),
                followers: (record.get('followers').toNumber) ? record.get('followers').toNumber() : record.get('followers')
            };
        });

        res.json(topStores);
    } catch (error) {
        console.error("DETALJNA GREŠKA NA BACKENDU:", error);
        res.status(500).json({ error: "Greška pri proračunu trending prodavnica: " + error.message });
    }
};

// Funkcija koja sračunava popularnost i osvežava Redis Top 3
// storeController.js

// storeController.js

exports.updateStorePopularity = async (storeId, session) => {
    const { connection } = require('../database');
    const socketModule = require('../socket');
    const io = socketModule.getIO();

    try {
        console.log("Sistem: Pokrećem TOTALNI RE-RANK svih prodavnica...");

        // 1. GADJAMO SVE PRODAVNICE IZ BAZE (ne samo jednu!)
        // Ovo garantuje da će Maxi (koji "ćuti") ostati na svom mestu
        const result = await session.run(
            `MATCH (s:Store)
             OPTIONAL MATCH ()-[f:FOLLOWS]->(s)
             OPTIONAL MATCH ()-[r:RATED]->(s)
             WITH s, count(DISTINCT f) as followers, avg(r.score) as rating
             RETURN ID(s) as id, s.name as name, followers, rating, 
                    (followers + (coalesce(rating, 0) * 5)) as score
             ORDER BY score DESC LIMIT 10`
        );

        const stores = result.records.map(r => ({
            id: r.get('id').toNumber(),
            name: r.get('name'),
            followers: r.get('followers').toNumber(),
            avgRating: parseFloat((r.get('rating') || 0).toFixed(1)),
            score: parseFloat(r.get('score'))
        }));

        if (connection && connection.isOpen) {
            // 2. KLJUČ: Brišemo ceo stari set jer je on izvor greške
            await connection.del('top_stores');

            // 3. Punimo Redis sa top 10 najsvežijih rezultata
            for (const s of stores) {
                const storeData = { 
                    id: s.id, 
                    name: s.name, 
                    followers: s.followers, 
                    avgRating: s.avgRating 
                };
                await connection.zAdd('top_stores', { 
                    score: s.score, 
                    value: JSON.stringify(storeData) 
                });
            }

            // 4. Uzimamo finalnih TOP 3
            const topRaw = await connection.zRange('top_stores', 0, 2, { REV: true });
            const top3 = topRaw.map(item => JSON.parse(item));

            console.log("REAL-TIME RE-RANK USPEŠAN. Šaljem top 3:", top3.map(t => t.name));
            
            // Emitujemo SVE tri prodavnice
            io.emit("update_top_3", top3);
        }
    } catch (err) {
        console.error("Kritična greška u re-rankingu:", err);
    }
};

exports.getSuggestedStores = async (req, res) => {
    const session = req.neo4jSession;
    const { userId } = req.params;

    try {
        // Cypher logika: Pronađi ljude koji prate iste kategorije/proizvode kao ti,
        // i vidi koje prodavnice oni prate, a ti još uvek ne.
        const query = `
            MATCH (u:User)-[:WISHES]->(p:Product)<-[:WISHES]-(other:User)
            WHERE ID(u) = $userId AND u <> other
            MATCH (other)-[:FOLLOWS]->(suggestedStore:Store)
            WHERE NOT (u)-[:FOLLOWS]->(suggestedStore)
            RETURN DISTINCT suggestedStore, ID(suggestedStore) as id LIMIT 3
        `;
        const result = await session.run(query, { userId: parseInt(userId) });
        const stores = result.records.map(r => ({
            id: r.get('id').low,
            ...r.get('suggestedStore').properties
        }));
        res.json(stores);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};