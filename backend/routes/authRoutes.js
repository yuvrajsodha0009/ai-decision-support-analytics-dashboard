const express = require('express');
const { register, login, me, getUsers, deleteUser, updateUser } = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, me);
router.get('/users', auth, getUsers);
router.delete('/users/:id', auth, deleteUser);
router.put('/users/:id', auth, updateUser);

module.exports = router;
