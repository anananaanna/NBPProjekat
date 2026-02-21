const rateLimiter = async (req, res, next) => {
    const ip = req.ip; // Ili userId ako je ulogovan
    const key = `rate-limit:${ip}`;
    
    try {
        const requests = await redis_client.incr(key);
        
        if (requests === 1) {
            // Prvi zahtev, postavljamo vreme isteka na 1 minut
            await redis_client.expire(key, 60);
        }
        
        if (requests > 20) { // Max 20 zahteva u minuti po korisniku
            return res.status(429).json({ 
                message: "Previše zahteva. Molimo pokušajte kasnije." 
            });
        }
        next();
    } catch (err) {
        next(); // Ako Redis padne, ne želimo da blokiramo aplikaciju
    }
};