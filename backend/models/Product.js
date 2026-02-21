class Product {
    constructor(id, name, price, brand) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.brand = brand;
    }

    // Metoda koja priprema podatak za slanje klijentu (baš kao njeno toJson)
    formatForClient() {
        return {
            productId: this.id,
            displayName: `${this.brand} - ${this.name}`,
            priceTag: `${this.price} RSD`,
            available: true
        };
    }
}

module.exports = Product;