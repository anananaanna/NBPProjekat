class Comment {
    constructor(id, user, storeId, text, date) {
        this.id = id;
        this.user = user;
        this.storeId = storeId; // Dodato/Izmenjeno
        this.text = text;
        this.date = date;
    }

    format() {
        return {
            commentId: this.id,
            author: this.user,
            content: this.text,
            // Formatiranje datuma (ako je u milisekundama iz Neo4j)
            postedAt: new Date(this.date).toLocaleString('sr-RS'),
            isLong: this.text.length > 100
        };
    }
}

module.exports = Comment;