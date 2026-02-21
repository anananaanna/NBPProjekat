const { create_session } = require('../database');

const neo4jSession = async (req, res, next) => {
    const session = await create_session();
    // Kačimo sesiju na req objekat tako da joj svi kontroleri mogu pristupiti
    req.neo4jSession = session;

    // Funkcija koja će se izvršiti nakon što kontroler završi posao
    const cleanup = async () => {
        await session.close();
    };

    // Pratimo kada se odgovor pošalje klijentu da bismo zatvorili sesiju
    res.on('finish', cleanup);
    res.on('close', cleanup);

    next();
};

module.exports = neo4jSession;