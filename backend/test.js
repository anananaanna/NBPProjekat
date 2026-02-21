const axios = require('axios'); // Prvo moramo instalirati axios

async function seed() {
    try {
        console.log("Slanje podataka...");
        
        // 1. Test registracije korisnika
        const user = await axios.post('http://localhost:3000/api/register', {
            username: "marija123",
            email: "marija@test.com",
            password: "sifra",
            city: "Beograd",
            age: 23
        });
        console.log("✅ Korisnik kreiran:", user.data.user.username);

        // 2. Test kreiranja prodavnice
        // Napomena: Prvo moramo imati kategoriju u bazi jer Store model radi MATCH na nju
        // Zato ćemo za ovaj test prvo napraviti prodavnicu bez kategorije ili dodati kategoriju
        console.log("Sve je spremno za dalji rad!");

    } catch (err) {
        console.error("❌ Greška pri testiranju:", err.response ? err.response.data : err.message);
    }
}

seed();