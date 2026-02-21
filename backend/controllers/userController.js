const User = require('../models/User');
const userRepository = require('../models/redis/userRedis');
const { connection } = require('../database'); 
const bcrypt = require('bcrypt');
 const storeController = require('./storeController');

// 1. REGISTRACIJA
exports.register = async (req, res) => {
    const session = req.neo4jSession; 
    try {
        const { username, email, password, role } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await session.run(
            `CREATE (u:User {username: $username, email: $email, password: $password, role: $role}) RETURN u`,
            { username, email, password: hashedPassword, role: role || 'customer' }
        );

        // Izmeni kraj registra u userController.js
        const savedUserNode = result.records[0].get('u');
        const savedUser = savedUserNode.properties;
        const userId = savedUserNode.identity.toNumber();

        res.status(201).json({ 
            message: "Korisnik registrovan!", 
            user: { 
                id: userId,
                username: savedUser.username, 
                email: savedUser.email,
                role: savedUser.role 
            } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. LOGIN
exports.login = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { username, password } = req.body;

        const result = await session.run(
            'MATCH (u:User {username: $username}) RETURN u',
            { username }
        );

        if (result.records.length === 0) {
            return res.status(401).json({ message: "Korisnik ne postoji!" });
        }

        const userProps = result.records[0].get('u').properties;
        const isMatch = await bcrypt.compare(password, userProps.password);
        
        if (!isMatch) {
            return res.status(401).json({ message: "Pogrešna lozinka!" });
        }

        const userId = result.records[0].get('u').identity.toNumber(); 
        delete userProps.password;

        res.status(200).json({ 
            message: "Uspešan login!", 
            user: { ...userProps, id: userId } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. UPDATE USER
// 3. UPDATE USER - Pojednostavljena verzija bez provere trenutne lozinke
exports.updateUser = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { userId, newUsername, newEmail, newPassword } = req.body;

        // Proveravamo da li korisnik postoji
        const userResult = await session.run(
            'MATCH (u:User) WHERE ID(u) = $userId RETURN u',
            { userId: parseInt(userId) }
        );

        if (userResult.records.length === 0) {
            return res.status(404).json({ message: "Korisnik nije pronađen" });
        }

        let query = 'MATCH (u:User) WHERE ID(u) = $userId ';
        let params = { userId: parseInt(userId) };

        // Dinamički gradimo SET upit
        if (newUsername) { 
            query += 'SET u.username = $newUsername '; 
            params.newUsername = newUsername; 
        }
        if (newEmail) { 
            query += 'SET u.email = $newEmail '; 
            params.newEmail = newEmail; 
        }
        if (newPassword) {
            // Hešujemo novu lozinku pre čuvanja
            const salt = await bcrypt.genSalt(10);
            params.hashedPassword = await bcrypt.hash(newPassword, salt);
            query += 'SET u.password = $hashedPassword ';
        }

        query += 'RETURN u';
        await session.run(query, params);

        res.status(200).json({ message: "Profil uspešno ažuriran!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. DELETE USER
exports.deleteUser = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { id } = req.params;
        await session.run('MATCH (u:User) WHERE ID(u) = $id DETACH DELETE u', { id: parseInt(id) });
        res.status(200).json({ message: "Korisnički nalog obrisan." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. FOLLOW CATEGORY
exports.followCategory = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { userId, categoryId } = req.body;
        await session.run(
            `MATCH (u:User), (c:Category)
             WHERE ID(u) = $userId AND ID(c) = $categoryId
             MERGE (u)-[:INTERESTED_IN]->(c)`,
            { userId: parseInt(userId), categoryId: parseInt(categoryId) }
        );
        res.status(200).json({ message: "Kategorija zapraćena!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. FOLLOW STORE - Grafovska veza (:User)-[:FOLLOWS]->(:Store)

// Na backendu u userController.js (ili gde ti je follow logika)
exports.followStore = async (req, res) => {
    const { userId, storeId } = req.body;
    const session = req.neo4jSession;
    const notificationService = require('./notificationController');
    // Uvozimo kontroler da bismo pozvali update funkciju
    const storeController = require('./storeController'); 

    try {
        // 1. Provera da li veza već postoji (Toggle logika)
        const checkRes = await session.run(
            `MATCH (u:User)-[r:FOLLOWS]->(s:Store) 
             WHERE ID(u) = $uId AND ID(s) = $sId 
             RETURN r`,
            { uId: parseInt(userId), sId: parseInt(storeId) }
        );

        if (checkRes.records.length > 0) {
            // --- SEKCIJA: UNFOLLOW ---
            await session.run(
                `MATCH (u:User)-[r:FOLLOWS]->(s:Store) 
                 WHERE ID(u) = $uId AND ID(s) = $sId 
                 DELETE r`,
                { uId: parseInt(userId), sId: parseInt(storeId) }
            );

            // OSVEŽI POPULARNOST: Smanjio se broj pratilaca, rang lista se menja
            await storeController.updateStorePopularity(storeId, session)
                .catch(e => console.log("Greška pri ažuriranju popularnosti nakon unfollow:", e));

            return res.status(200).json({ isFollowing: false });

        } else {
            // --- SEKCIJA: FOLLOW ---
            const result = await session.run(
                `MATCH (u:User) WHERE ID(u) = $uId
                 MATCH (s:Store) WHERE ID(s) = $sId
                 MERGE (u)-[:FOLLOWS]->(s)
                 WITH u, s
                 OPTIONAL MATCH (v:User)-[:OWNS_STORE|OWNED_BY|OWNER]-(s)
                 RETURN u.username as followerName, ID(v) as vendorId, s.name as storeName`,
                { uId: parseInt(userId), sId: parseInt(storeId) }
            );

            if (result.records.length > 0) {
                const row = result.records[0];
                const vendorId = row.get('vendorId')?.toNumber();
                const followerName = row.get('followerName');
                const storeName = row.get('storeName');

                console.log(`Kupac ${followerName} prati prodavnicu ${storeName}`);

                // Šaljemo notifikaciju prodavcu ako postoji
                if (vendorId) {
                    notificationService.sendNotification(
                        vendorId, 
                        `Korisnik ${followerName} je zapratio tvoju prodavnicu ${storeName}!`,
                        'new_follower'
                    );
                }

                // KLJUČNI DEO: Osveži Redis i pošalji Socket signal SVIMA na Home stranici
                await storeController.updateStorePopularity(storeId, session)
                    .catch(e => console.log("Greška pri ažuriranju popularnosti nakon follow:", e));

            } else {
                console.log("GRESKA: Nisam uspeo da nađem vlasnika prodavnice u Neo4j bazi!");
            }

            return res.status(200).json({ isFollowing: true });
        }
    } catch (err) {
        console.error("Kritična greška u followStore:", err);
        res.status(500).json({ error: err.message });
    }
};

// 7. ADD TO WISHLIST
// 7. ADD TO WISHLIST
exports.addToWishlist = async (req, res) => {
    const session = req.neo4jSession;
    const { connection } = require('../database'); 
    const notificationService = require('./notificationController');

    try {
        // Osiguravamo da su ID-jevi brojevi
        const userId = parseInt(req.body.userId);
        const productId = parseInt(req.body.productId);

        if (isNaN(userId) || isNaN(productId)) {
            return res.status(400).json({ error: "Invalid User or Product ID" });
        }

        console.log("Dodajem u Wishlist:", { userId, productId });

        // FIKSIRAN UPIT: Dodat alias za v u OPTIONAL MATCH-u da ne puca
        const result = await session.run(
            `MATCH (u:User) WHERE ID(u) = $userId
             MATCH (p:Product) WHERE ID(p) = $productId
             MERGE (u)-[:INTERESTED_IN]->(p)
             WITH u, p
             OPTIONAL MATCH (v:User)-[:OWNS_STORE|OWNED_BY|OWNER]-(s:Store)-[:HAS_PRODUCT]-(p)
             RETURN u.username as fan, p.name as pName, ID(v) as vendorId`,
            { userId, productId }
        );

        // KLJUČ: Čišćenje Redisa - OVO JE REŠENJE TVOG PROBLEMA
        if (connection) {
            await connection.del(`wishlist:${userId}`);
            console.log("Redis keš obrisan.");
        }

        // Provera notifikacija - bezbedno izvlačenje vendorId
        if (result.records.length > 0) {
            const row = result.records[0];
            const vendorIdRaw = row.get('vendorId');
            
            if (vendorIdRaw !== null) {
                const vId = vendorIdRaw.toNumber();
                notificationService.sendNotification(
                    vId,
                    `Kupac ${row.get('fan')} je dodao ${row.get('pName')} u wishlistu!`,
                    'wishlist_alert'
                );
            }
        }
        
        res.status(200).json({ message: "Dodato u listu želja!" });
    } catch (error) {
        console.error("KRITIČNA GREŠKA U WISHLISTI:", error);
        res.status(500).json({ error: error.message });
    }
};

// 8. REMOVE FROM WISHLIST
exports.removeFromWishlist = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const userId = parseInt(req.body.userId);
        const productId = parseInt(req.body.productId);
        const { connection } = require('../database');

        await session.run(
            `MATCH (u:User)-[r:INTERESTED_IN]->(p:Product)
             WHERE ID(u) = $userId AND ID(p) = $productId
             DELETE r`,
            { userId, productId }
        );

        if (connection) await connection.del(`wishlist:${userId}`);

        res.status(200).json({ message: "Obrisano!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 9. GET WISHLIST
exports.getWishlist = async (req, res) => {
    const userId = parseInt(req.params.userId); // MORA BITI BROJ
    const cacheKey = `wishlist:${userId}`;
    const { connection } = require('../database');
    const session = req.neo4jSession;

    try {
        // 1. Provera Redisa
        if (connection) {
            const cachedData = await connection.get(cacheKey);
            if (cachedData) {
                console.log(">>> IZ REDISA");
                return res.status(200).json(JSON.parse(cachedData));
            }
        }

        // 2. Neo4j - PAZI NA QUERIES
        console.log(">>> IZ NEO4J");
        const result = await session.run(
            `MATCH (u:User)-[:INTERESTED_IN]->(p:Product)
             WHERE ID(u) = $userId
             RETURN p, ID(p) as prodId`,
            { userId }
        );

        const wishlist = result.records.map(record => ({
            ...record.get('p').properties,
            id: record.get('prodId').toNumber()
        }));

        // 3. Upis u Redis samo ako ima nešto
        if (wishlist.length > 0 && connection) {
            await connection.set(cacheKey, JSON.stringify(wishlist), { EX: 300 });
        }

        res.status(200).json(wishlist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

