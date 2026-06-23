import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout, refreshToken, forgotPassword, resetPassword, getMe, changePassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
];

const passwordValidation = [
  body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).+$/),
];

const newPasswordValidation = [
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).+$/)
    .withMessage(
      'Password must contain uppercase, number and special character'
    ),
];

router.post('/login', loginValidation, login);
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', body('email').isEmail(), forgotPassword);
router.post('/reset-password', [...passwordValidation, body('token').notEmpty()], resetPassword);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  ...passwordValidation,
], changePassword);
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    ...newPasswordValidation,
  ],
  changePassword
);

export default router;
