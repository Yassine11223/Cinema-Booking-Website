const { formatPrice, generateBookingRef, paginate } = require('../../utils/helpers');

describe('booking helpers', () => {
    test('formats booking totals consistently', () => {
        expect(formatPrice(125)).toBe('$125.00');
        expect(formatPrice('99.5')).toBe('$99.50');
    });

    test('generates booking references with the expected prefix and length', () => {
        expect(generateBookingRef()).toMatch(/^SC-[A-Z0-9]{6}$/);
    });

    test('returns bounded pagination values', () => {
        expect(paginate(3, 25)).toEqual({ limit: 25, offset: 50 });
        expect(paginate(1, 250)).toEqual({ limit: 100, offset: 0 });
    });
});
