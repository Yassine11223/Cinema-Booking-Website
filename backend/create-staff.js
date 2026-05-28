/**
 * Staff Account Creator Script
 * Run this script to easily create new staff accounts in the database.
 * 
 * Usage:
 * node create-staff.js "John Doe" "john.staff@scene.com" "SecurePass123"
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Helper to find .env file
function loadEnv() {
    try {
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const match = line.match(/^([^#=]+)=(.*)$/);
                if (match) {
                    process.env[match[1].trim()] = match[2].trim();
                }
            });
        }
    } catch (e) {
        console.error('Could not load .env file:', e.message);
    }
}

async function createStaffAccount() {
    loadEnv();
    
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.log('\n❌ Missing arguments.');
        console.log('Usage: node create-staff.js <Name> <Email> <Password>\n');
        console.log('Example: node create-staff.js "Alice Smith" "alice@scene.com" "AlicePass123"\n');
        process.exit(1);
    }

    const [name, email, password] = args;

    if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
        console.log('\n❌ Database credentials not found. Make sure your .env file is in the backend folder.');
        process.exit(1);
    }

    const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT || 5432,
    });

    try {
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert into database
        const result = await pool.query(
            `INSERT INTO users (name, email, password, role) 
             VALUES ($1, $2, $3, 'staff') 
             RETURNING id, name, email, role`,
            [name, email, hashedPassword]
        );

        console.log('\n✅ Staff account created successfully!');
        console.log('-----------------------------------');
        console.log(`ID:       ${result.rows[0].id}`);
        console.log(`Name:     ${result.rows[0].name}`);
        console.log(`Email:    ${result.rows[0].email}`);
        console.log(`Role:     ${result.rows[0].role}`);
        console.log('-----------------------------------\n');

    } catch (err) {
        if (err.code === '23505') { // Unique violation
            console.log(`\n❌ Error: The email '${email}' is already registered.\n`);
        } else {
            console.error('\n❌ Database Error:', err.message, '\n');
        }
    } finally {
        await pool.end();
    }
}

createStaffAccount();
