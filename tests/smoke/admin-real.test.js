const { ROLES } = require('../../config/constants');
const User = require('../../models/User');
const Movie = require('../../models/Movie');
const Show = require('../../models/Show');
const Booking = require('../../models/Booking');
const { adminOnly, superAdminOnly } = require('../../middleware/auth');

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

    test('backend blocks non-admin users from admin APIs', () => {
        const req = { user: { role: ROLES.CUSTOMER } };
        const res = mockResponse();
        const next = jest.fn();

        adminOnly(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('backend blocks normal admins from super-admin APIs', () => {
        const req = { user: { role: ROLES.ADMIN } };
        const res = mockResponse();
        const next = jest.fn();

        superAdminOnly(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('backend allows super admins through super-admin APIs', () => {
        const req = { user: { role: ROLES.SUPERADMIN } };
        const res = mockResponse();
        const next = jest.fn();

        superAdminOnly(req, res, next);

        expect(res.status).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(1);
    });
});

function mockResponse() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}
