const { connectDatabase } = require('./config/database');
const mongoose = require('mongoose');

connectDatabase().then(async () => {
    await mongoose.connection.collection('users').updateOne(
        { email: 'superadmin@cinema.com' },
        { $set: { role: 'superadmin' } }
    );
    console.log('Role updated to superadmin');
    process.exit();
});
