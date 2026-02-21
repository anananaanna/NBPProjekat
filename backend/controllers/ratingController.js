const Rating = require('../models/Rating');

// Na vrh fajla OBAVEZNO dodaj uvoz (proveri putanju do baze)
const { connection, create_session } = require('../database'); 
const storeController = require('./storeController');

exports.addRating = async (req, res) => {
    const session = req.neo4jSession;
    const { userId, storeId, score } = req.body;

    try {
        // 1. Upis u Neo4j bazu
        await session.run(
            `MATCH (u:User), (s:Store) 
             WHERE ID(u) = $uId AND ID(s) = $sId
             MERGE (u)-[r:RATED]->(s)
             SET r.score = $score, r.timestamp = timestamp()`,
            { uId: parseInt(userId), sId: parseInt(storeId), score: parseInt(score) }
        );

        // 2. Rad sa Redisom i osvežavanje Top 3 liste
        try {
            // Koristimo 'connection' (onaj iz database.js koji ima .connect())
            if (connection && connection.isOpen) {
                // Brišemo keširane podatke o rejtingu jer su se upravo promenili
                await connection.del(`store:${storeId}:rating_data`);
                
                // POZIV POPULARNOSTI: Ovo će izračunati novi rang i poslati SOCKET signal
                const sCtrl = require('./storeController'); 
                console.log(">>> Rejting sačuvan. Pokrećem updatePopularity za prodavnicu:", storeId);
                await sCtrl.updateStorePopularity(storeId, session);
            } else {
                console.log(">>> Redis klijent nije povezan, preskačem osvežavanje.");
            }
        } catch (redisErr) {
            console.error(">>> Greška pri radu sa Redisom:", redisErr.message);
            // Ne šaljemo 500 grešku korisniku jer je baza (Neo4j) uspešno odradila posao
        }

        return res.status(201).json({ message: "Ocena sačuvana!" });

    } catch (error) {
        console.error(">>> KRITIČNA GREŠKA U addRating:", error);
        return res.status(500).json({ error: "Greška u bazi: " + error.message });
    }
};

exports.updateRating = async (req, res) => {
    const session = req.neo4jSession;
    const { userId, storeId, score } = req.body;
    try {
        await session.run(
            `MATCH (u:User)-[r:RATED]->(s:Store)
             WHERE ID(u) = $userId AND ID(s) = $storeId
             SET r.score = $score, r.updatedAt = timestamp()`,
            { userId: parseInt(userId), storeId: parseInt(storeId), score: parseInt(score) }
        );

        // OSVEŽAVANJE NAKON IZMENE
        if (connection && connection.isOpen) {
            await connection.del(`store:${storeId}:rating_data`);
            await storeController.updateStorePopularity(storeId, session);
        }

        res.status(200).json({ message: "Recenzija izmenjena!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. READ: Prosečna ocena prodavnice (Cache-Aside)
exports.getStoreRating = async (req, res) => {
    const { storeId } = req.params;
    const cacheKey = `store:${storeId}:rating_data`; // Promenjen ključ jer čuvamo i count
    
    try {
        let cachedData = await redis_client?.get(cacheKey);
        if (cachedData) return res.status(200).json(JSON.parse(cachedData));

        const session = req.neo4jSession;
        const result = await session.run(
            `MATCH (:User)-[r:RATED]->(s:Store) 
             WHERE ID(s) = $storeId 
             RETURN avg(r.score) as prosek, count(r) as brojOcena`,
            { storeId: parseInt(storeId) }
        );

        const prosek = result.records[0].get('prosek') || 0;
        const brojOcena = result.records[0].get('brojOcena').low || 0;

        const responseData = { 
            storeId, 
            averageRating: prosek, 
            count: brojOcena, // Ovo je bitno za StoreDetails
            source: 'db' 
        };

        if (redis_client) await redis_client.set(cacheKey, JSON.stringify(responseData), { EX: 600 });

        res.status(200).json(responseData);
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 3. DELETE: Brisanje ocene
exports.deleteRating = async (req, res) => {
    const session = req.neo4jSession;
    const { userId, storeId } = req.query;

    try {
        // 1. Brisanje iz Neo4j
        await session.run(
            `MATCH (u:User)-[r:RATED]->(s:Store) 
             WHERE ID(u) = $uId AND ID(s) = $sId
             DELETE r`,
            { uId: parseInt(userId), sId: parseInt(storeId) }
        );

        // 2. Čišćenje Redisa i REAL-TIME update
        try {
            if (connection && connection.isOpen) {
                await connection.del(`store:${storeId}:rating_data`);
                
                // OVO SI ZABORAVILA - bez ovoga se Top 3 ne menja na ekranu
                console.log("Brisanje rejtinga, osvežavam listu...");
                await storeController.updateStorePopularity(storeId, session);
            }
        } catch (redisErr) {
            console.log("Redis error:", redisErr.message);
        }

        res.status(200).json({ message: "Uspešno obrisano!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. READ ALL: Sve ocene za prodavnicu
exports.getAllRatingsForStore = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { storeId } = req.params;
        const result = await session.run(
            'MATCH (u:User)-[r:RATED]->(s:Store) WHERE ID(s) = $storeId RETURN u.username AS user, r.score AS score',
            { storeId: parseInt(storeId) }
        );
        res.status(200).json(result.records.map(reg => ({ user: reg.get('user'), score: reg.get('score') })));
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// POMOĆNA FUNKCIJA (unutar istog fajla na vrhu ili dnu)
exports.getUserRatingForStore = async (req, res) => {
    // Koristimo isti session kao i u ostalim funkcijama
    const session = req.neo4jSession; 
    const { userId, storeId } = req.params;

    console.log("--- DEBUG NEO4J POZIV ---");
    console.log("Tražim rejting za User ID:", userId, "i Store ID:", storeId);

    try {
        // Koristimo ID(u) jer tako radiš u addRating i deleteRating
        const result = await session.run(
            `MATCH (u:User)-[r:RATED]->(s:Store)
             WHERE ID(u) = $uId AND ID(s) = $sId
             RETURN r.score AS score`,
            { 
                uId: parseInt(userId), 
                sId: parseInt(storeId) 
            }
        );

        if (result.records.length > 0) {
            // Neo4j brojevi su objekti, .toNumber() ili Number() osigurava čist broj
            const score = result.records[0].get('score');
            const finalScore = typeof score.toNumber === 'function' ? score.toNumber() : score;
            
            console.log("Pronađen score u bazi:", finalScore);
            return res.status(200).json({ score: finalScore });
        } else {
            console.log("Rejting nije pronađen, vraćam default 5");
            return res.status(200).json({ score: 5 });
        }
    } catch (error) {
        console.error(">>> GREŠKA U getUserRatingForStore:", error);
        res.status(500).json({ error: "Greška u Neo4j: " + error.message });
    }
    // NE ZATVARAJ SESIJU OVDE (session.close()) jer je verovatno 
    // zatvara middleware koji ti je i dao req.neo4jSession
};