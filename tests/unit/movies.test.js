const { isPositiveNumber, isValidDate } = require('../../utils/validators');

describe('movie validators', () => {
    test('requires positive numeric duration and price values', () => {
        expect(isPositiveNumber(120)).toBe(true);
        expect(isPositiveNumber(0)).toBe(false);
        expect(isPositiveNumber('120')).toBe(false);
    });

    test('accepts valid release date strings', () => {
        expect(isValidDate('2026-06-02')).toBe(true);
        expect(isValidDate('not-a-date')).toBe(false);
    });
});
