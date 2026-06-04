/**
 * Database Seeder - Cinema Booking System
 * Seeds MongoDB with initial data using Mongoose models
 *
 * Usage: npm run seed
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { connectDB, mongoose } = require('../config/database');

// Import models
const User = require('../models/User');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Seat = require('../models/Seat');
const Show = require('../models/Show');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const bcrypt = require('bcryptjs');

async function seed() {
    console.log('🎬 Cinema Database Seeder (MongoDB)\n');

    try {
        await connectDB();

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await Promise.all([
            User.deleteMany({}),
            Movie.deleteMany({}),
            Theater.deleteMany({}),
            Seat.deleteMany({}),
            Show.deleteMany({}),
            Booking.deleteMany({}),
            Payment.deleteMany({}),
        ]);
        console.log('✅ Existing data cleared\n');

        // --- 1. Users ---
        console.log('👤 Creating users...');
        const adminHash = await bcrypt.hash('Admin123!', 10);
        const passwordHash = await bcrypt.hash('Password1', 10);
        const superAdminHash = await bcrypt.hash('superadmin112', 12);

        const users = await User.insertMany([
            { name: 'Admin User', email: 'admin@scene.com', password: adminHash, phone: '+20 100 000 0000', role: 'admin' },
            { name: 'Super Admin', email: 'superadmin@scene.com', password: superAdminHash, phone: '+20 100 000 0001', role: 'superadmin' },
            { name: 'Ahmed Hassan', email: 'ahmed@scene.com', password: passwordHash, phone: '+20 100 123 4567', role: 'customer' },
            { name: 'Sara Mohamed', email: 'sara@scene.com', password: passwordHash, phone: '+20 101 234 5678', role: 'customer' },
            { name: 'Omar Ali', email: 'omar@scene.com', password: passwordHash, phone: '+20 102 345 6789', role: 'customer' },
            { name: 'Nour Ibrahim', email: 'nour@scene.com', password: passwordHash, phone: '+20 103 456 7890', role: 'customer' },
        ]);
        console.log(`✅ ${users.length} users created\n`);

        // --- 2. Theaters ---
        console.log('🎭 Creating theaters...');
        const theaters = await Theater.insertMany([
            { name: 'IMAX Theatre', capacity: 310, screen_type: 'imax' },
            { name: 'Dolby Atmos', capacity: 256, screen_type: 'standard' },
            { name: 'Hall 1', capacity: 200, screen_type: 'standard' },
            { name: 'Deluxe Suite', capacity: 116, screen_type: 'vip' },
        ]);
        const [imax, dolby, hall1, deluxe] = theaters;
        console.log(`✅ ${theaters.length} theaters created\n`);

        // --- 3. Seats ---
        console.log('💺 Creating seats...');
        const allSeats = [];

        // IMAX Theatre: rows A-K (27 seats), L-M (23), N (19), P (15)
        const imaxRows = { A: 27, B: 27, C: 27, D: 27, E: 27, F: 27, G: 27, H: 27, J: 27, K: 27, L: 23, M: 23, N: 19, P: 15 };
        for (const [row, count] of Object.entries(imaxRows)) {
            for (let n = 1; n <= count; n++) {
                allSeats.push({
                    theater_id: imax._id,
                    row_label: row,
                    seat_number: n,
                    seat_type: ['A', 'B'].includes(row) ? 'premium' : 'standard',
                });
            }
        }

        // Dolby Atmos: rows A-J (24), K-L (19), M (16)
        const dolbyRows = { A: 24, B: 24, C: 24, D: 24, E: 24, F: 24, G: 24, H: 24, J: 24, K: 19, L: 19, M: 16 };
        for (const [row, count] of Object.entries(dolbyRows)) {
            for (let n = 1; n <= count; n++) {
                allSeats.push({
                    theater_id: dolby._id,
                    row_label: row,
                    seat_number: n,
                    seat_type: row === 'A' ? 'premium' : 'standard',
                });
            }
        }

        // Hall 1: rows A-H (21), J-K (16), L (13)
        const hall1Rows = { A: 21, B: 21, C: 21, D: 21, E: 21, F: 21, G: 21, H: 21, J: 16, K: 16, L: 13 };
        for (const [row, count] of Object.entries(hall1Rows)) {
            for (let n = 1; n <= count; n++) {
                allSeats.push({
                    theater_id: hall1._id,
                    row_label: row,
                    seat_number: n,
                    seat_type: 'standard',
                });
            }
        }

        // Deluxe Suite: A (14), B-F (17), G-H (13)
        const deluxeRows = { A: 14, B: 17, C: 17, D: 17, E: 17, F: 17, G: 13, H: 13 };
        for (const [row, count] of Object.entries(deluxeRows)) {
            for (let n = 1; n <= count; n++) {
                allSeats.push({
                    theater_id: deluxe._id,
                    row_label: row,
                    seat_number: n,
                    seat_type: 'vip',
                });
            }
        }

        const seats = await Seat.insertMany(allSeats);
        console.log(`✅ ${seats.length} seats created\n`);

        // --- 4. Movies ---
        console.log('🎬 Creating movies...');
        const movies = await Movie.insertMany([
            {
                title: 'Thunderbolts*',
                description: 'A ragtag group of antiheroes are recruited by the government for dangerous missions.',
                genre: 'Action', duration: 127, rating: 'PG-13',
                release_date: new Date('2025-05-02'),
                poster_url: 'https://image.tmdb.org/t/p/w500/qbkAqmmEIZfrCO8ZQAuIuVMlWoV.jpg',
                status: 'now_showing',
            },
            {
                title: 'Mission: Impossible - The Final Reckoning',
                description: 'Ethan Hunt faces his most dangerous mission yet in the thrilling conclusion.',
                genre: 'Action', duration: 169, rating: 'PG-13',
                release_date: new Date('2025-05-23'),
                poster_url: 'https://image.tmdb.org/t/p/w500/z4lYMBkMB9sG9bCPLEBSNDJaNaF.jpg',
                status: 'now_showing',
            },
            {
                title: 'Lilo & Stitch',
                description: 'A lonely Hawaiian girl adopts an unusual pet who is actually a genetic experiment.',
                genre: 'Family', duration: 108, rating: 'PG',
                release_date: new Date('2025-05-23'),
                poster_url: 'https://image.tmdb.org/t/p/w500/2GHacm1sYDUXp6YuAuXxfmMgLJi.jpg',
                status: 'now_showing',
            },
            {
                title: 'The Amateur',
                description: 'A CIA cryptographer uncovers a conspiracy after a personal tragedy.',
                genre: 'Thriller', duration: 126, rating: 'R',
                release_date: new Date('2025-04-11'),
                poster_url: 'https://image.tmdb.org/t/p/w500/vJk5JLBbLWRb7vQN4Ur1LKmZaQA.jpg',
                status: 'now_showing',
            },
            {
                title: 'Sinners',
                description: 'Two brothers return to their hometown seeking a fresh start but find evil lurking.',
                genre: 'Horror', duration: 137, rating: 'R',
                release_date: new Date('2025-04-18'),
                poster_url: 'https://image.tmdb.org/t/p/w500/sARLVl4rIhi06FxvaFOqKaBr18p.jpg',
                status: 'now_showing',
            },
            {
                title: 'Superman',
                description: "James Gunn's reimagining of the Man of Steel. Clark Kent protects Metropolis.",
                genre: 'Action', duration: 143, rating: 'PG-13',
                release_date: new Date('2025-07-11'),
                poster_url: null,
                status: 'coming_soon',
            },
            {
                title: 'Avatar: Fire & Ash',
                description: 'Jake Sully and Neytiri confront a new threat to Pandora.',
                genre: 'Sci-Fi', duration: 160, rating: 'PG-13',
                release_date: new Date('2025-12-19'),
                poster_url: null,
                status: 'coming_soon',
            },
        ]);
        console.log(`✅ ${movies.length} movies created\n`);

        // --- 5. Shows ---
        console.log('📅 Creating shows for next 7 days...');
        const nowShowingMovies = movies.filter((m) => m.status === 'now_showing');
        const showDocs = [];

        for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
            const d = new Date();
            d.setDate(d.getDate() + dayOffset);
            d.setHours(0, 0, 0, 0);

            for (const movie of nowShowingMovies) {
                // IMAX shows
                for (const time of ['12:00', '15:30', '19:00', '22:15']) {
                    const [h, m] = time.split(':');
                    const showTime = new Date(d);
                    showTime.setHours(parseInt(h), parseInt(m), 0, 0);
                    showDocs.push({ movie_id: movie._id, theater_id: imax._id, show_time: showTime, price: 320 });
                }

                // Dolby shows
                for (const time of ['11:00', '14:00', '17:30', '21:00']) {
                    const [h, m] = time.split(':');
                    const showTime = new Date(d);
                    showTime.setHours(parseInt(h), parseInt(m), 0, 0);
                    showDocs.push({ movie_id: movie._id, theater_id: dolby._id, show_time: showTime, price: 280 });
                }

                // Hall 1 shows
                for (const time of ['11:30', '14:15', '17:00', '20:30', '23:00']) {
                    const [h, m] = time.split(':');
                    const showTime = new Date(d);
                    showTime.setHours(parseInt(h), parseInt(m), 0, 0);
                    showDocs.push({ movie_id: movie._id, theater_id: hall1._id, show_time: showTime, price: 180 });
                }

                // Deluxe shows
                for (const time of ['13:00', '16:30', '19:45']) {
                    const [h, m] = time.split(':');
                    const showTime = new Date(d);
                    showTime.setHours(parseInt(h), parseInt(m), 0, 0);
                    showDocs.push({ movie_id: movie._id, theater_id: deluxe._id, show_time: showTime, price: 250 });
                }
            }
        }

        const shows = await Show.insertMany(showDocs);
        console.log(`✅ ${shows.length} shows created\n`);

        // --- Summary ---
        console.log('📊 Database summary:');
        const collections = [
            { name: 'users', model: User },
            { name: 'movies', model: Movie },
            { name: 'theaters', model: Theater },
            { name: 'seats', model: Seat },
            { name: 'shows', model: Show },
            { name: 'bookings', model: Booking },
            { name: 'payments', model: Payment },
        ];
        for (const { name, model } of collections) {
            const count = await model.countDocuments();
            console.log(`   ${name}: ${count} documents`);
        }

        console.log('\n🎉 Seeding complete!');
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

seed();
