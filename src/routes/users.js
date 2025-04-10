const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const { validate, validateMongoId } = require('../middleware/validator');

// Middleware para validação de dados do usuário
const userValidation = [
    check('name', 'Nome é obrigatório').notEmpty(),
    check('lastName', 'Sobrenome é obrigatório').notEmpty(),
    check('email', 'E-mail inválido').isEmail(),
    check('phone', 'Telefone é obrigatório').notEmpty(),
    validate
];

// Middleware para validação de status
const statusValidation = [
    check('status', 'Status é obrigatório').notEmpty(),
    check('status', 'Status inválido').isIn(['active', 'inactive']),
    validate
];

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Rotas para gerenciamento de usuários (apenas admin)
router.get('/', userController.getAllUsers);
router.get('/:id', validateMongoId(), userController.getUserById);
router.put('/:id', validateMongoId(), userValidation, userController.updateUser);
router.delete('/:id', validateMongoId(), userController.deleteUser);
router.patch('/:id/status', validateMongoId(), statusValidation, userController.changeUserStatus);

// Rotas para gerenciamento do próprio perfil
router.get('/me/profile', userController.getMyProfile);
router.put('/me/profile', userValidation, userController.updateMyProfile);

module.exports = router;