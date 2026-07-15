require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const now = new Date();
    console.log('Current time:', now.toString());
    console.log('Current time ISO:', now.toISOString());

    // Get sample future shows
    const futureShows = await db.collection('shows').find({
        show_time: { $gt: now }
    }).sort({ show_time: 1 }).limit(10).toArray();

    console.log(`\n=== First 10 Future Shows ===`);
    futureShows.forEach(s => {
        const st = new Date(s.show_time);
        console.log(`  show_time: ${st.toString()} (ISO: ${st.toISOString()}) | movie_id: ${s.movie_id}`);
    });

    // Now test the date query that booking.js would do for today
    const todayKey = '2026-06-13'; // Tomorrow in local time (user sees Jun 13)
    const [year, month, day] = todayKey.split('-').map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    console.log(`\nQuery for date ${todayKey}:`);
    console.log(`  start: ${start.toString()} (ISO: ${start.toISOString()})`);
    console.log(`  end:   ${end.toString()} (ISO: ${end.toISOString()})`);

    const movie = await db.collection('movies').findOne({ title: /Backrooms/ });
    if (movie) {
        const shows = await db.collection('shows').find({
            movie_id: movie._id,
            show_time: { $gte: start, $lt: end }
        }).toArray();
        console.log(`\nShows for "${movie.title}" on ${todayKey}: ${shows.length}`);
        shows.forEach(s => console.log(`  ${new Date(s.show_time).toString()}`));
    }

    await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
