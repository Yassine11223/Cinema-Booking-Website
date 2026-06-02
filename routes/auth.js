const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ status: 'auth route working' });
});

module.exports = router;
