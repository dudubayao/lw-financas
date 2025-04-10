const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// Middleware de limite de requisições para prevenção de ataques de força bruta
const loginLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // limitar a 5 tentativas por IP
    message: { success: false, message: 'Muitas tentativas de login. Tente novamente mais tarde.' }
});

const resetPasswordLimiter = rateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // limitar a 3 tentativas por IP
    message: { success: false, message: 'Muitas solicitações de redefinição de senha. Tente novamente mais tarde.' }
});

// Rota de login
router.post('/login', [
    loginLimiter,
    check('email', 'Por favor, forneça um e-mail válido').isEmail(),
    check('password', 'A senha é obrigatória').exists()
], authController.login);

// Rota de logout
router.post('/logout', authController.logout);

// Rota para solicitar redefinição de senha
router.post('/forgot-password', [
    resetPasswordLimiter,
    check('email', 'Por favor, forneça um e-mail válido').isEmail()
], authController.forgotPassword);

// Rota para redefinir senha com token
router.post('/reset-password/:token', [
    check('password', 'A senha deve ter no mínimo 6 caracteres').isLength({ min: 6 })
], authController.resetPassword);

// Rota para verificar autenticação do usuário
router.get('/check', authMiddleware, authController.checkAuth);

// Rota para alterar senha (requer autenticação)
router.post('/change-password', [
    authMiddleware,
    check('currentPassword', 'A senha atual é obrigatória').exists(),
    check('newPassword', 'A nova senha deve ter no mínimo 6 caracteres').isLength({ min: 6 })
], authController.changePassword);

// Rota para registrar novo usuário (apenas para admins)
router.post('/register', [
    authMiddleware,
    check('name', 'O nome é obrigatório').notEmpty(),
    check('lastName', 'O sobrenome é obrigatório').notEmpty(),
    check('email', 'Por favor, forneça um e-mail válido').isEmail(),
    check('phone', 'O telefone é obrigatório').notEmpty(),
    check('password', 'A senha deve ter no mínimo 6 caracteres').isLength({ min: 6 }),
    check('type', 'Tipo de usuário inválido').isIn(['admin', 'reseller'])
], authController.register);

module.exports = router;