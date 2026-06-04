const fs = require('fs');
const path = require('path');

describe('booking flow artifacts', () => {
    test('includes backend booking and show models used for seat reservation', () => {
        const bookingModel = path.resolve(__dirname, '../../backend/models/Booking.js');
        const showModel = path.resolve(__dirname, '../../backend/models/Show.js');

        expect(fs.existsSync(bookingModel)).toBe(true);
        expect(fs.existsSync(showModel)).toBe(true);
        expect(fs.readFileSync(bookingModel, 'utf8')).toContain('mongoose.model');
    });

    test('public booking page and script are present', () => {
        expect(fs.existsSync(path.resolve(__dirname, '../../frontend/booking.html'))).toBe(true);
        expect(fs.existsSync(path.resolve(__dirname, '../../frontend/js/booking.js'))).toBe(true);
    });
});
