/**
 * Update Password Utility - MongoDB version
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, mongoose } = require('./config/database');
const User = require('./models/User');

async function updatePassword() {
    try {
        await connectDB();

        const hash = bcrypt.hashSync('Admin123!', 10);
        const result = await User.findOneAndUpdate(
            { email: 'admin@thehallcinemas.com' },
            { password: hash },
            { new: true }
        );

        if (result) {
            console.log('Password updated successfully');
        } else {
            console.log('User not found');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

updatePassword();
