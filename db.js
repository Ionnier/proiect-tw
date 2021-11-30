const { Client } = require('pg');
if (process.env.DATABASE_URL.includes("localhost")) {
    my_ssl = false;
} else {
    my_ssl = {
        rejectUnauthorized: false
    }
}
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: my_ssl
})
client.connect()
module.exports.db = client