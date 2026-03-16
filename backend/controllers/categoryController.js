const Category = require('../models/Category');
const { connection: redis_client } = require('../database');
const io = require('../socket');

// 1. CREATE
exports.createCategory = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { name, description } = req.body;
        
        const result = await session.run(
            'CREATE (c:Category {name: $name, description: $description}) RETURN c, ID(c) as id',
            { name, description: description || "" }
        );

        const newCategory = {
            id: result.records[0].get('id').low,
            ...result.records[0].get('c').properties
        };

        // Brisemo kes jer lista vise nije ista
        await redis_client.del('categories:all');

        // Emit real-time update 
        io.getIO().emit('categories_updated', { action: 'created', category: newCategory });

        res.status(201).json({ message: "Kategorija kreirana!", category: newCategory });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. GET ALL CATEGORIES
exports.getAllCategories = async (req, res) => {
    const session = req.neo4jSession;
    if (!session) {
        console.error("Neo4j Session nedostaje u request-u!");
        return res.status(500).json({ error: "Session error" });
    }

    try {
        const result = await session.run('MATCH (c:Category) RETURN c, ID(c) as id');
        
        const categories = result.records.map(r => {
    const props = r.get('c').properties;
    return {
        id: r.get('id').toNumber(),
        name: props.name,
        label: props.name, 
        title: props.name,
        description: props.description || ""
    };
});

        console.log("Kategorije poslate frontendu:", categories.length);
        res.status(200).json(categories);
    } catch (error) {
        console.error("Greška u bazi:", error);
        res.status(500).json({ error: error.message });
    }
};

// 3. UPDATE
exports.updateCategory = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { oldName, newName, description } = req.body;
        
        await session.run(
            `MATCH (c:Category {name: $oldName}) 
             SET c.name = $newName, c.description = $description 
             RETURN c`, 
            { oldName, newName, description }
        );

        // Brisemo kes da bi sledeci GET povukao nove podatke sa opisom
        await redis_client.del('categories:all');

        res.status(200).json({ message: "Kategorija ažurirana sa opisom!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. DELETE
exports.deleteCategory = async (req, res) => {
    const session = req.neo4jSession;
    try {
        const { name } = req.params;
        await session.run('MATCH (c:Category {name: $name}) DETACH DELETE c', { name });

        // Brišemo kes i nakon brisanja
        await redis_client.del('categories:all');
        
        io.getIO().emit('categories_updated', { action: 'deleted', name });

        res.status(200).json({ message: "Kategorija obrisana!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};