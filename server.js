/**
 * Root entry point.
 *
 * The active backend for this project lives in ./backend and uses
 * MongoDB/Mongoose. Keep this thin wrapper so `npm start` from the repo root
 * starts the same backend as `cd backend && npm start`.
 */

module.exports = require('./backend/server');
