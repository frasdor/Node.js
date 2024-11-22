const express = require('express');
const { signup, login, logout, currentUser } = require('../../controllers/auth');
const auth = require('../../middleware/auth');

const router = express.Router();

router.post('/signup', signup);

router.post('/login', login);

router.get('/logout', auth, logout);

router.get('/current', auth, currentUser);

module.exports = router;
