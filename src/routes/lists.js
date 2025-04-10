const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const listController = require('../controllers/listController');
const { auth, adminOnly } = require('../middleware/auth');
const { validate, validateMongoId } = require('../middleware/validator');

// Middleware para validação de dados da lista
const listValidation = [
    check('name', 'Nome da lista é obrigatório').notEmpty(),
    check('serviceType', 'Tipo de serviço é obrigatório').isIn([
        'consulta_completa',
        'limpar_nome',
        'rating_bancario',
        'combo_limpar_score',
        'combo_rating_limpar',
        'combo_rating_bacen',
        'combo_completo'
    ]),
    check('status').optional().isIn([
        'aguardando_pagamento',
        'pago',
        'processo_protocolado',
        'processo_baixado',
        'refazer'
    ]),
    validate
];

// Middleware para validação de status
const statusValidation = [
    check('status', 'Status é obrigatório').notEmpty(),
    check('status', 'Status inválido').isBoolean(),
    validate
];

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// Rotas para gerenciamento de listas
router.post('/', listValidation, listController.createList);
router.get('/', listController.getAllLists);
router.get('/:id', validateMongoId(), listController.getListById);
router.put('/:id', validateMongoId(), listValidation, listController.updateList);
router.delete('/:id', validateMongoId(), listController.deleteList);

// Rotas para gerenciamento de pedidos na lista
router.post('/:id/orders', validateMongoId(), listController.addOrderToList);
router.delete('/:id/orders/:orderId', validateMongoId('id'), validateMongoId('orderId'), listController.removeOrderFromList);

// Rotas para progresso da lista
router.get('/:id/progress', validateMongoId(), listController.getListProgress);
router.patch('/:id/process/:process', validateMongoId(), statusValidation, listController.updateProcessStatus);

module.exports = router;