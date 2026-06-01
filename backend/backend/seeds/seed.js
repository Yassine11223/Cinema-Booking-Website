/**
 * Database Seeder - Cinema Booking System
 * Runs the SQL schema and sample data against PostgreSQL
 *
 * Usage: npm run seed
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function seed() {
    console.log('🎬 Cinema Database Seeder\n');

    try {
        // Run schema
        console.log('📋 Creating tables...');
        const schema = fs.readFileSync(
            path.join(__dirname, '../../database/schema.sql'),
            'utf-8'
        );
        await pool.query(schema);
        console.log('✅ Tables created successfully\n');

        // Run sample data
        console.log('🌱 Inserting sample data...');
        const sampleData = fs.readFileSync(
            path.join(__dirname, '../../database/sample-data.sql'),
            'utf-8'
        );
        await pool.query(sampleData);
        console.log('✅ Sample data inserted successfully\n');

        // Show summary
        const tables = ['users', 'movies', 'theaters', 'seats', 'shows', 'bookings', 'payments'];
        console.log('📊 Database summary:');
        for (const table of tables) {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`   ${table}: ${result.rows[0].count} rows`);
        }

        console.log('\n🎉 Seeding complete!');
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
    } finally {
        await pool.end();
    }
}

seed();
