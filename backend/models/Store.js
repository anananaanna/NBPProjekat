class Store {
    constructor(id, name, location, workingHours) {
        this.id = id;
        this.name = name;
        this.location = location;
        this.workingHours = workingHours;
    }

    getSummary() {
        return {
            storeId: this.id,
            name: this.name.toUpperCase(),
            fullAddress: `Lokacija: ${this.location}`,
            status: "Otvoreno" // Ovde može ići prava logika za radno vreme
        };
    }
}

module.exports = Store;