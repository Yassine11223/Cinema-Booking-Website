const COMING_SOON_BOOKING_MESSAGE = 'This movie is coming soon and cannot be booked yet.';

function toDateKey(value) {
    if (!value) return null;

    if (typeof value === 'string') {
        const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function todayKey() {
    return toDateKey(new Date());
}

function startOfLocalDay(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfTomorrow() {
    const tomorrow = startOfLocalDay();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
}

function isComingSoonRelease(releaseDate) {
    const releaseKey = toDateKey(releaseDate);
    return Boolean(releaseKey && releaseKey > todayKey());
}

function statusFromReleaseDate(releaseDate) {
    return isComingSoonRelease(releaseDate) ? 'coming_soon' : 'now_showing';
}

module.exports = {
    COMING_SOON_BOOKING_MESSAGE,
    isComingSoonRelease,
    startOfLocalDay,
    startOfTomorrow,
    statusFromReleaseDate,
    toDateKey,
    todayKey,
};
