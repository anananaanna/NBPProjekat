const Rating = require('../models/Rating');

const { connection, create_session } = require('../database'); 
const storeController = require('./storeController');
const io = require('../socket');

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
            if (connection && connection.isOpen) {
                // Brišemo keširane podatke o rejtingu jer su se upravo promenili
                await connection.del(`store:${storeId}:rating_data`);
                
                const sCtrl = require('./storeController'); 
                console.log(">>> Rejting sačuvan. Pokrećem updatePopularity za prodavnicu:", storeId);
                await sCtrl.updateStorePopularity(storeId, session);
            } else {
                console.log(">>> Redis klijent nije povezan, preskačem osvežavanje.");
            }
        } catch (redisErr) {
            console.error(">>> Greška pri radu sa Redisom:", redisErr.message);
        }

        io.getIO().emit('store_updated', { storeId: parseInt(storeId), action: 'rating_added', userId: parseInt(userId) });

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

        if (connection && connection.isOpen) {
            await connection.del(`store:${storeId}:rating_data`);
            await storeController.updateStorePopularity(storeId, session);
        }

        io.getIO().emit('store_updated', { storeId: parseInt(storeId), action: 'rating_updated', userId: parseInt(userId) });

        res.status(200).json({ message: "Recenzija izmenjena!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. READ: Prosečna ocena prodavnice (Cache-Aside)
exports.getStoreRating = async (req, res) => {
    const { storeId } = req.params;
    const cacheKey = `store:${storeId}:rating_data`; 
    
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
            count: brojOcena,
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
                
                console.log("Brisanje rejtinga, osvežavam listu...");
                await storeController.updateStorePopularity(storeId, session);
            }
        } catch (redisErr) {
            console.log("Redis error:", redisErr.message);
        }

        io.getIO().emit('store_updated', { storeId: parseInt(storeId), action: 'rating_deleted', userId: parseInt(userId) });

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

exports.getUserRatingForStore = async (req, res) => {
    const session = req.neo4jSession; 
    const { userId, storeId } = req.params;

    console.log("--- DEBUG NEO4J POZIV ---");
    console.log("Tražim rejting za User ID:", userId, "i Store ID:", storeId);

    try {
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
};