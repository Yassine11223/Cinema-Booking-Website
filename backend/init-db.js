const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function init() {
    // 1. Connect to default 'postgres' db to create 'cinema_db'
    const defaultPool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'postgres'
    });

    try {
        console.log("Creating database...");
        await defaultPool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
        console.log("Database created successfully.");
    } catch (e) {
        if (e.code === '42P04') {
            console.log("Database already exists.");
        } else {
            console.error("Error creating database. Is PostgreSQL running?", e);
            process.exit(1);
        }
    }
    await defaultPool.end();

    // 2. Connect to the new 'cinema_db'
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const runSqlFile = async (filepath) => {
        console.log("Running", path.basename(filepath));
        const sql = fs.readFileSync(filepath, 'utf8');
        try {
            await pool.query(sql);
        } catch(err) {
            console.error(`Error in ${path.basename(filepath)}:`, err.message);
        }
    };

    const dbDir = path.join(__dirname, '../database');
    
    // 3. Run schema
    await runSqlFile(path.join(dbDir, 'schema.sql'));

    // 4. Run migrations
    const migrationsDir = path.join(dbDir, 'migrations');
    if (fs.existsSync(migrationsDir)) {
        const files = fs.readdirSync(migrationsDir).sort();
        for (const file of files) {
            if (file.endsWith('.sql')) {
                await runSqlFile(path.join(migrationsDir, file));
            }
        }
    }

    // 5. Run sample data
    await runSqlFile(path.join(dbDir, 'sample-data.sql'));

    // 6. Create admin and staff accounts
    const bcrypt = require('bcryptjs');
    const adminPass = await bcrypt.hash('admin112', 12);
    const staffPass = await bcrypt.hash('Password1', 12);
    
    try {
        await pool.query(`INSERT INTO users (name, email, password, role) VALUES ('Admin', 'admin@scene.com', $1, 'admin') ON CONFLICT (email) DO NOTHING`, [adminPass]);
        await pool.query(`INSERT INTO users (name, email, password, role) VALUES ('Demo Staff', 'staff@scene.com', $1, 'staff') ON CONFLICT (email) DO NOTHING`, [staffPass]);
        console.log("Admin and Staff accounts created.");
    } catch(err) {
         console.error("Error creating accounts", err.message);
    }

    await pool.end();
    console.log("✅ Database initialized completely!");
}

init();
