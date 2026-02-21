const Comment = require('../models/Comment');

// 1. ADD COMMENT
exports.addComment = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { userId, storeId, text } = req.body;
        const date = new Date().toISOString(); 

        const result = await session.run(
            `MATCH (u:User) WHERE ID(u) = $userId
             MATCH (s:Store) WHERE ID(s) = $storeId
             MERGE (u)-[c:COMMENTED]->(s)
             SET c.text = $text, c.date = $date
             RETURN c, ID(c) as commentId, u.username as author`,
            { userId: parseInt(userId), storeId: parseInt(storeId), text, date }
        );

        if (result.records.length === 0) return res.status(404).json({ error: "Korisnik ili prodavnica nisu pronađeni." });

        const newComment = {
            id: result.records[0].get('commentId').toNumber ? result.records[0].get('commentId').toNumber() : result.records[0].get('commentId'),
            text: result.records[0].get('c').properties.text,
            author: result.records[0].get('author'),
            date: result.records[0].get('c').properties.date
        };
        res.status(201).json({ message: "Recenzija sačuvana!", comment: newComment });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 2. DELETE COMMENT (Ostaje skoro isti, ali čisto da bude kompletan CRUD)
exports.deleteComment = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { id } = req.params;
        await session.run('MATCH ()-[c:COMMENTED]->() WHERE ID(c) = $id DELETE c', { id: parseInt(id) });
        res.status(200).json({ message: "Komentar obrisan." });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 3. UPDATE COMMENT
exports.updateComment = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { id, newText } = req.body;
        await session.run('MATCH ()-[c:COMMENTED]->() WHERE ID(c) = $id SET c.text = $newText RETURN c', { id: parseInt(id), newText });
        res.status(200).json({ message: "Komentar izmenjen!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
};

// 4. GET STORE COMMENTS
exports.getStoreComments = async (req, res) => {
    const { storeId } = req.params;
    const session = req.neo4jSession;

    try {
        const result = await session.run(
            `MATCH (u:User)-[c:COMMENTED]->(s:Store)
             WHERE ID(s) = $id
             RETURN u.username AS username, 
                    c.text AS text, 
                    c.date AS date, 
                    ID(c) AS commentId,
                    ID(u) AS userId
             ORDER BY c.date DESC`,
            { id: parseInt(storeId) }
        );

        const comments = result.records.map(record => ({
            username: record.get('username'),
            text: record.get('text'),
            date: record.get('date'),
            commentId: record.get('commentId').toNumber(),
            userId: record.get('userId').toNumber()
        }));

        res.status(200).json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};