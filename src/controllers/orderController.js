const Order = require('../models/Order');
const Client = require('../models/Client');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Função para tratamento de erros
const handleError = (res, error, defaultMessage = 'Erro ao processar pedido') => {
    console.error('Order Controller Error:', error);
    
    if (error.name === 'ValidationError') {
        return res.status(400).json({ 
            success: false, 
            message: 'Erro de validação', 
            errors: Object.values(error.errors).map(err => err.message) 
        });
    }
    
    return res.status(500).json({ 
        success: false, 
        message: defaultMessage 
    });
};

// Obter tabela de preços
const getPriceTable = () => {
    return {
        'consulta_completa': 350,
        'limpar_nome': 300,
        'rating_bancario': 450,
        'combo_limpar_score': 650,
        'combo_rating_limpar': 650,
        'combo_rating_bacen': 850,
        'combo_completo': 950
    };
};

// Criar novo pedido
exports.createOrder = async (req, res) => {
    try {
        // Validar entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Dados de entrada inválidos', 
                errors: errors.array() 
            });
        }
        
        // Verificar se o cliente já existe
        let client;
        let clientId;
        
        // Limpar documento (remover caracteres não numéricos)
        const cleanDocument = req.body.client.document.replace(/\D/g, '');
        
        // Verificar se o cliente já existe pelo documento
        client = await Client.findOne({
            document: cleanDocument,
            documentType: req.body.client.documentType
        });
        
        if (client) {
            clientId = client._id;
        } else {
            // Criar novo cliente
            client = new Client({
                name: req.body.client.name,
                documentType: req.body.client.documentType,
                document: cleanDocument,
                email: req.body.client.email || null,
                phone: req.body.client.phone || null,
                createdBy: req.user.id
            });
            
            await client.save();
            clientId = client._id;
        }
        
        // Obter valor do serviço da tabela de preços
        const priceTable = getPriceTable();
        const service = req.body.service;
        const value = req.body.value || priceTable[service] || 0;
        
        // Criar o pedido
        const order = new Order({
            reseller: req.user.id,
            client: {
                name: req.body.client.name,
                documentType: req.body.client.documentType,
                document: cleanDocument,
                email: req.body.client.email || null,
                phone: req.body.client.phone || null
            },
            service,
            status: req.body.status || 'aguardando_pagamento',
            value,
            notes: req.body.notes || null
        });
        
        await order.save();
        
        // Adicionar o pedido à lista de pedidos do cliente
        await Client.findByIdAndUpdate(
            clientId,
            { $push: { orders: order._id } }
        );
        
        return res.status(201).json({
            success: true,
            message: 'Pedido criado com sucesso',
            data: order
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao criar pedido');
    }
};

// Obter todos os pedidos
exports.getAllOrders = async (req, res) => {
    try {
        // Configurar paginação
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Configurar filtros
        const filter = {};
        
        // Revendedores só podem ver seus próprios pedidos
        if (req.user.type === 'reseller') {
            filter.reseller = req.user.id;
        } else if (req.query.reseller) {
            // Admin pode filtrar por revendedor
            filter.reseller = req.query.reseller;
        }
        
        // Filtrar por cliente
        if (req.query.client) {
            filter['client.name'] = { $regex: req.query.client, $options: 'i' };
        }
        
        // Filtrar por documento
        if (req.query.document) {
            filter['client.document'] = req.query.document.replace(/\D/g, '');
        }
        
        // Filtrar por serviço
        if (req.query.service) {
            filter.service = req.query.service;
        }
        
        // Filtrar por status
        if (req.query.status) {
            filter.status = req.query.status;
        }
        
        // Filtrar por lista
        if (req.query.list) {
            filter.list = req.query.list;
        }
        
        // Filtrar por data de criação
        if (req.query.startDate && req.query.endDate) {
            filter.createdAt = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }
        
        // Buscar pedidos com paginação
        const orders = await Order.find(filter)
            .populate('reseller', 'name lastName')
            .populate('list', 'name')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        
        // Contar total para paginação
        const total = await Order.countDocuments(filter);
        
        return res.status(200).json({
            success: true,
            data: {
                orders,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao buscar pedidos');
    }
};

// Obter pedido por ID
exports.getOrderById = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        const order = await Order.findById(orderId)
            .populate('reseller', 'name lastName email phone')
            .populate('list', 'name status');
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Verificar permissões (revendedor só pode ver seus próprios pedidos)
        if (req.user.type === 'reseller' && order.reseller._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para acessar este pedido'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: order
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao buscar pedido');
    }
};

// Atualizar pedido
exports.updateOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        // Buscar pedido
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Verificar permissões (revendedor só pode atualizar seus próprios pedidos)
        if (req.user.type === 'reseller' && order.reseller.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para atualizar este pedido'
            });
        }
        
        // Se revendedor, permitir atualizar apenas algumas informações
        const allowedFields = {
            'admin': ['client', 'service', 'status', 'value', 'notes', 'list'],
            'reseller': ['notes'] // Revendedor só pode atualizar observações
        };
        
        // Se o pedido já estiver em uma lista e for status "processo_baixado", não permitir alterações
        if (order.list && order.status === 'processo_baixado' && req.user.type !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Não é possível alterar um pedido finalizado'
            });
        }
        
        // Atualizar campos permitidos
        const fields = allowedFields[req.user.type];
        const updates = {};
        
        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'client') {
                    // Para o campo client, atualizar apenas campos específicos
                    ['name', 'email', 'phone'].forEach(clientField => {
                        if (req.body.client && req.body.client[clientField] !== undefined) {
                            updates[`client.${clientField}`] = req.body.client[clientField];
                        }
                    });
                } else {
                    updates[field] = req.body[field];
                }
            }
        });
        
        // Atualizar pedido
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { $set: updates },
            { new: true, runValidators: true }
        );
        
        return res.status(200).json({
            success: true,
            message: 'Pedido atualizado com sucesso',
            data: updatedOrder
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao atualizar pedido');
    }
};

// Excluir pedido
exports.deleteOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        // Buscar pedido
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Verificar permissões
        if (req.user.type === 'reseller') {
            // Revendedor só pode excluir seus próprios pedidos
            if (order.reseller.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Você não tem permissão para excluir este pedido'
                });
            }
            
            // Revendedor só pode excluir pedidos que não estejam em uma lista
            if (order.list) {
                return res.status(400).json({
                    success: false,
                    message: 'Não é possível excluir um pedido que está em uma lista'
                });
            }
            
            // Revendedor só pode excluir pedidos com status 'aguardando_pagamento'
            if (order.status !== 'aguardando_pagamento') {
                return res.status(400).json({
                    success: false,
                    message: 'Só é possível excluir pedidos com status "Aguardando Pagamento"'
                });
            }
        }
        
        // Se o pedido estiver em uma lista, remover da lista
        if (order.list) {
            const List = require('../models/List');
            await List.findByIdAndUpdate(
                order.list,
                { $pull: { orders: orderId } }
            );
        }
        
        // Remover pedido da lista de pedidos do cliente
        await Client.findOneAndUpdate(
            { document: order.client.document, documentType: order.client.documentType },
            { $pull: { orders: orderId } }
        );
        
        // Excluir pedido
        await Order.findByIdAndDelete(orderId);
        
        return res.status(200).json({
            success: true,
            message: 'Pedido excluído com sucesso'
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao excluir pedido');
    }
};

// Atualizar status do pedido
exports.updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status é obrigatório'
            });
        }
        
        // Verificar se o status é válido
        const validStatus = ['aguardando_pagamento', 'pago', 'processo_protocolado', 'processo_baixado', 'refazer'];
        
        if (!validStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido'
            });
        }
        
        // Buscar pedido
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Verificar permissões (revendedor só pode atualizar para 'pago' pedidos próprios)
        if (req.user.type === 'reseller') {
            if (order.reseller.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Você não tem permissão para atualizar este pedido'
                });
            }
            
            // Revendedor só pode atualizar para 'pago'
            if (status !== 'pago') {
                return res.status(403).json({
                    success: false,
                    message: 'Você só pode atualizar para o status "Pago"'
                });
            }
            
            // Só pode atualizar se o status atual for 'aguardando_pagamento'
            if (order.status !== 'aguardando_pagamento') {
                return res.status(400).json({
                    success: false,
                    message: 'Só é possível confirmar pagamento para pedidos com status "Aguardando Pagamento"'
                });
            }
        }
        
        // Atualizar status
        order.status = status;
        await order.save();
        
        // Se o pedido estiver em uma lista, atualizar status da lista
        if (order.list) {
            // Verificar se todos os pedidos da lista têm o mesmo status
            const List = require('../models/List');
            const list = await List.findById(order.list);
            
            if (list) {
                const orders = await Order.find({ list: list._id });
                const allOrdersHaveSameStatus = orders.every(o => o.status === status);
                
                if (allOrdersHaveSameStatus) {
                    list.status = status;
                    await list.save();
                }
            }
        }
        
        return res.status(200).json({
            success: true,
            message: 'Status do pedido atualizado com sucesso',
            data: {
                id: order._id,
                status: order.status
            }
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao atualizar status do pedido');
    }
};

// Atualizar status do processo no pedido
exports.updateProcessStatus = async (req, res) => {
    try {
        const { id: orderId, process } = req.params;
        const { status } = req.body;
        
        if (status === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Status é obrigatório'
            });
        }
        
        // Verificar se o usuário é admin (apenas admin pode atualizar status do processo)
        if (req.user.type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Apenas administradores podem atualizar o status do processo'
            });
        }
        
        // Buscar pedido
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Atualizar status do processo
        await order.updateProcessStatus(process, status);
        
        // Se todos os processos estiverem concluídos, atualizar status do pedido
        const progress = order.calculateProgress();
        
        if (progress.percentage === 100 && order.status !== 'processo_baixado') {
            order.status = 'processo_baixado';
            await order.save();
        }
        
        return res.status(200).json({
            success: true,
            message: 'Status do processo atualizado com sucesso',
            data: {
                process,
                status: order.processDetails[process].status,
                date: order.processDetails[process].date,
                orderStatus: order.status,
                progress: order.calculateProgress()
            }
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao atualizar status do processo');
    }
};

// Obter progresso do pedido
exports.getOrderProgress = async (req, res) => {
    try {
        const orderId = req.params.id;
        
        // Buscar pedido
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Verificar permissões (revendedor só pode ver seus próprios pedidos)
        if (req.user.type === 'reseller' && order.reseller.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para acessar este pedido'
            });
        }
        
        // Calcular progresso
        const progress = order.calculateProgress();
        
        return res.status(200).json({
            success: true,
            data: {
                orderId,
                client: order.client.name,
                service: order.service,
                status: order.status,
                progress,
                processDetails: order.processDetails
            }
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao obter progresso do pedido');
    }
};

// Obter estatísticas de pedidos
exports.getOrderStats = async (req, res) => {
    try {
        // Definir período (últimos 30 dias por padrão)
        let startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        
        let endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        
        if (req.query.startDate) {
            startDate = new Date(req.query.startDate);
            startDate.setHours(0, 0, 0, 0);
        }
        
        if (req.query.endDate) {
            endDate = new Date(req.query.endDate);
            endDate.setHours(23, 59, 59, 999);
        }
        
        // Definir filtro para revendedor
        const resellerFilter = req.user.type === 'reseller' 
            ? { reseller: req.user.id } 
            : req.query.resellerId 
                ? { reseller: req.query.resellerId } 
                : {};
        
        // Obter estatísticas
        const stats = await Order.getStats(
            resellerFilter.reseller,
            { start: startDate, end: endDate }
        );
        
        return res.status(200).json({
            success: true,
            data: {
                ...stats,
                period: {
                    startDate,
                    endDate
                }
            }
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao obter estatísticas de pedidos');
    }
};