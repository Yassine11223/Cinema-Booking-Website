const { ROLES } = require('../../config/constants');
const User = require('../../models/User');
const Movie = require('../../models/Movie');
const Show = require('../../models/Show');
const Booking = require('../../models/Booking');

describe('admin real dashboard wiring', () => {
    test('uses canonical admin role names', () => {
        expect(ROLES.ADMIN).toBe('admin');
        expect(ROLES.SUPERADMIN).toBe('super_admin');
    });

    test('Mongoose models expose admin-required static methods', () => {
        expect(typeof User.findAll).toBe('function');
        expect(typeof User.findByEmail).toBe('function');
        expect(typeof User.setOTP).toBe('function');
        expect(typeof Movie.findAll).toBe('function');
        expect(typeof Show.findAll).toBe('function');
        expect(typeof Show.findDetailedById).toBe('function');
        expect(typeof Booking.findAll).toBe('function');
        expect(typeof Booking.createBooking).toBe('function');
    });
});
