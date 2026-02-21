class User {
    constructor(username, email, password, role = 'customer') {
        this.username = username;
        this.email = email;
        this.password = password;
        this.role = role;
    }

    // Ovo je ono što sestra ima - olakšava pisanje CREATE upita
    toJson() {
        return `{
            username: '${this.username}',
            email: '${this.email}',
            password: '${this.password}',
            role: '${this.role}'
        }`;
    }

    static fromNeo4j(record) {
        const props = record.get('u').properties;
        const id = record.get('u').identity.low;
        const u = new User(props.username, props.email, props.password, props.role);
        u.id = id;
        return u;
    }
}
module.exports = User;