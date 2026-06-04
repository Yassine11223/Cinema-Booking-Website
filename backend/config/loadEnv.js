/**
 * Load environment variables for both root and backend startup paths.
 */

const path = require('path');
const dotenv = require('dotenv');

function loadEnv() {
    dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env'), quiet: true });
    dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: false, quiet: true });

    if (!process.env.MONGO_URI && process.env.MONGODB_URI) {
        process.env.MONGO_URI = process.env.MONGODB_URI;
    }
}

module.exports = loadEnv;
