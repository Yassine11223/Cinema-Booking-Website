const fs = require('fs');
const path = require('path');

describe('API project wiring', () => {
    test('declares the core backend route modules', () => {
        const routeDir = path.resolve(__dirname, '../../routes');
        ['movies.js', 'bookings.js', 'users.js', 'shows.js', 'theaters.js'].forEach(file => {
            expect(fs.existsSync(path.join(routeDir, file))).toBe(true);
        });
    });

    test('keeps the PostgreSQL schema file available for setup', () => {
        const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
        expect(fs.existsSync(schemaPath)).toBe(true);
        expect(fs.readFileSync(schemaPath, 'utf8')).toContain('CREATE TABLE');
    });
});
