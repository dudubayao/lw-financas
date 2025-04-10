const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const orderController = require('../controllers/orderController');
const { auth, adminOnly } = require('../middleware/auth');
const { validate, validateMongoId } = require('../middleware/validator');

// Middleware para validação de pedido
const orderValidation = [
    check('client.name', 'Nome do cliente é obrigatório').notEmpty(),
    check('client.documentType', 'Tipo de documento é obrigatório').isIn(['cpf', 'cnpj']),
    check('client.document', 'Documento é obrigatório').notEmpty(),
    check('service', 'Serviço é obrigatório').isIn([
        'consulta_completa',
        'limpar_nome',
        'rating_bancario',
        'combo_limpar_score',
        'combo_rating_limpar',
        'combo_rating_bacen',
        'combo_completo'
    ]),
    validate
];

// Middleware para validação de status
const statusValidation = [
    check('status', 'Status é obrigatório').notEmpty(),
    check('status', 'Status inválido').isIn([
        'aguardando_pagamento',
        'pago',
        'processo_protocolado',
        'processo_baixado',
        'refazer'
    ]),
    validate
];

// Middleware para validação de status de processo
const processStatusValidation = [
    check('status', 'Status é obrigatório').notEmpty(),
    check('status', 'Status inválido').isBoolean(),
    validate
];

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// Rotas para gerenciamento de pedidos
router.post('/', orderValidation, orderController.createOrder);
router.get('/', orderController.getAllOrders);
router.get('/stats', orderController.getOrderStats);
router.get('/:id', validateMongoId(), orderController.getOrderById);
router.put('/:id', validateMongoId(), orderController.updateOrder);
router.delete('/:id', validateMongoId(), orderController.deleteOrder);

// Rotas para atualizações de status
router.patch('/:id/status', validateMongoId(), statusValidation, orderController.updateOrderStatus);
router.patch('/:id/process/:process', validateMongoId(), processStatusValidation, orderController.updateProcessStatus);
router.get('/:id/progress', validateMongoId(), orderController.getOrderProgress);

module.exports = router;