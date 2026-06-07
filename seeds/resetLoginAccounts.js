/**
 * Reset all login accounts and create one account per login role.
 */

const { connectDatabase, mongoose } = require('../config/database');
const User = require('../models/User');

const LOGIN_ACCOUNTS = [
    {
        name: 'Cinema Customer',
        email: 'customer@thehallcinema.com',
        password: 'Customer2026!',
        phone: '+20 100 111 2222',
        role: 'customer',
        status: 'active',
    },
    {
        name: 'Cinema Admin',
        email: 'admin@thehallcinema.com',
        password: 'Admin2026!',
        phone: '+20 100 333 4444',
        role: 'admin',
        status: 'active',
    },
    {
        name: 'Cinema Super Admin',
        email: 'superadmin@thehallcinema.com',
        password: 'SuperAdmin2026!',
        phone: '+20 100 555 6666',
        role: 'super_admin',
        status: 'active',
    },
];

async function resetLoginAccounts() {
    await connectDatabase();

    const deleteResult = await User.deleteMany({
        role: { $in: ['customer', 'admin', 'super_admin', 'superadmin'] },
    });

    await Promise.all(LOGIN_ACCOUNTS.map((account) => User.create(account)));

    console.log(`Deleted ${deleteResult.deletedCount} login account(s).`);
    console.log('Created fresh login accounts:');
    LOGIN_ACCOUNTS.forEach((account) => {
        console.log(`- ${account.role}: ${account.email}`);
    });
}

resetLoginAccounts()
    .catch((error) => {
        console.error('Failed to reset login accounts:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close().catch(() => { });
    });
