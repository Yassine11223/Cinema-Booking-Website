const fs = require('fs');
const path = require('path');

describe('browser journey prerequisites', () => {
    test('public and admin entry pages exist', () => {
        [
            '../../frontend/index.html',
            '../../frontend/movie-detail.html',
            '../../frontend/booking.html',
            '../../admin/login.html',
            '../../admin/index.html',
        ].forEach(relativePath => {
            expect(fs.existsSync(path.resolve(__dirname, relativePath))).toBe(true);
        });
    });
});
