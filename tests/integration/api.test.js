const fs = require('fs');
const path = require('path');

describe('API project wiring', () => {
    test('declares the core backend route modules', () => {
        const routeDir = path.resolve(__dirname, '../../backend/routes');
        ['movies.js', 'bookings.js', 'users.js', 'shows.js', 'theaters.js'].forEach(file => {
            expect(fs.existsSync(path.join(routeDir, file))).toBe(true);
        });
    });

    test('uses the MongoDB/Mongoose database configuration', () => {
        const databasePath = path.resolve(__dirname, '../../backend/config/database.js');
        const source = fs.readFileSync(databasePath, 'utf8');

        expect(source).toContain('mongoose');
        expect(source).toContain('MONGO_URI');
    });
});
