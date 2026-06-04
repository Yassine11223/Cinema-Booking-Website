const { isValidEmail, isValidPhone } = require('../../utils/validators');

describe('user validators', () => {
    test('accepts valid email addresses', () => {
        expect(isValidEmail('customer@example.com')).toBe(true);
        expect(isValidEmail('admin.user+test@thehall.local')).toBe(true);
    });

    test('rejects malformed email addresses', () => {
        expect(isValidEmail('missing-at-symbol')).toBe(false);
        expect(isValidEmail('broken@example')).toBe(false);
    });

    test('validates phone-like numbers used by user forms', () => {
        expect(isValidPhone('+20 100 123 4567')).toBe(true);
        expect(isValidPhone('123')).toBe(false);
    });
});
