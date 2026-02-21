class Category {
    constructor(id, name, description) {
        this.id = id;
        this.name = name;
        this.description = description;
    }

    format() {
        return {
            id: this.id,
            categoryName: this.name,
            info: this.description || "Nema opisa"
        };
    }
}

module.exports = Category;