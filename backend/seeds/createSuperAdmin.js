/**
 * Create the first Super Admin account.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const { connectDatabase, mongoose } = require('../../config/database');
const User = require('../../models/User');

async function createSuperAdmin() {
    const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';
    const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@cinema.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';

    if (!password || password.length < 8) {
        throw new Error('SUPER_ADMIN_PASSWORD must be at least 8 characters.');
    }

    await connectDatabase();

    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
        console.log(`Super Admin already exists: ${existingSuperAdmin.email}`);
        return;
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
        existingUser.role = 'super_admin';
        existingUser.name = existingUser.name || name;
        existingUser.status = 'active';
        if (!existingUser.password) existingUser.password = password;
        await existingUser.save();
        console.log(`Existing user promoted to Super Admin: ${existingUser.email}`);
        return;
    }

    await User.create({
        name,
        email,
        password,
        role: 'super_admin',
        status: 'active',
    });

    console.log(`Super Admin created: ${email}`);
    console.log('Password was read from SUPER_ADMIN_PASSWORD or development defaults and was not logged.');
}

createSuperAdmin()
    .catch((error) => {
        console.error('Failed to create Super Admin:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close().catch(() => {});
    });
