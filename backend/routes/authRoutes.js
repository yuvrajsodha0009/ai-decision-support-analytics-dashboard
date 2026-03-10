const express = require('express');
const {
  register,
  login,
  me,
  getUsers,
  deleteUser,
  updateUser,
  updateUserStatus,
  resetPassword,
} = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/checkRole');
const { ROLES } = require('../utils/roles');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.get('/me', auth, me);
// User management endpoints: Admin only
router.get('/users', auth, checkRole([ROLES.ADMIN]), getUsers);
router.delete('/users/:id', auth, checkRole([ROLES.ADMIN]), deleteUser);
router.put('/users/:id', auth, checkRole([ROLES.ADMIN]), updateUser);
router.patch('/users/:id/status', auth, checkRole([ROLES.ADMIN]), updateUserStatus);

module.exports = router;
