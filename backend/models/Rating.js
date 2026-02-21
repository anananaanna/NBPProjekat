class Rating {
    constructor(user, storeId, score, updatedAt) {
        this.user = user;
        this.storeId = storeId; // Izmenjeno sa productId
        this.score = score;
        this.updatedAt = updatedAt;
    }

    getDisplayDetails() {
        const stars = "⭐".repeat(this.score);
        let label = "";
        
        if (this.score >= 4) label = "Odlično";
        else if (this.score === 3) label = "Prosečno";
        else label = "Loše";

        return {
            fromUser: this.user,
            rating: this.score,
            stars: stars,
            feedback: label,
            lastModified: new Date(this.updatedAt).toLocaleDateString()
        };
    }
}

module.exports = Rating;