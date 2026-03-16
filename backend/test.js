const axios = require('axios'); 

async function seed() {
    try {
        console.log("Slanje podataka...");
        
        const user = await axios.post('http://localhost:3000/api/register', {
            username: "marija123",
            email: "marija@test.com",
            password: "sifra",
            city: "Beograd",
            age: 23
        });
        console.log("✅ Korisnik kreiran:", user.data.user.username);

        console.log("Sve je spremno za dalji rad!");

    } catch (err) {
        console.error("❌ Greška pri testiranju:", err.response ? err.response.data : err.message);
    }
}

seed();