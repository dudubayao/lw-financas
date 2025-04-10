const List = require('../models/List');
const Order = require('../models/Order');
const { validationResult } = require('express-validator');

// Função para tratamento de erros
const handleError = (res, error, defaultMessage = 'Erro ao processar listas') => {
    console.error('List Controller Error:', error);
    
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

// Criar nova lista
exports.createList = async (req, res) => {
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
        
        // Criar lista
        const list = new List({
            name: req.body.name,
            description: req.body.description,
            serviceType: req.body.serviceType,
            status: req.body.status || 'aguardando_pagamento',
            creator: req.user.id,
            noteForResellers: req.body.noteForResellers
        });
        
        // Adicionar pedidos à lista, se fornecidos
        if (req.body.orders && Array.isArray(req.body.orders) && req.body.orders.length > 0) {
            list.orders = req.body.orders;
            
            // Atualizar os pedidos com o ID da lista
            await Order.updateMany(
                { _id: { $in: req.body.orders } },
                { list: list._id, status: list.status }
            );
        }
        
        await list.save();
        
        return res.status(201).json({
            success: true,
            message: 'Lista criada com sucesso',
            data: list
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao criar lista');
    }
};

// Obter todas as listas
exports.getAllLists = async (req, res) => {
    try {
        // Configurar paginação
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Configurar filtros
        const filter = {};
        
        // Revendedores só podem ver listas do seu criador
        if (req.user.type === 'reseller') {
            filter.creator = req.user.id;
        } else if (req.query.creator) {
            // Admin pode filtrar por criador
            filter.creator = req.query.creator;
        }
        
        // Filtrar por tipo de serviço
        if (req.query.serviceType) {
            filter.serviceType = req.query.serviceType;
        }
        
        // Filtrar por status
        if (req.query.status) {
            filter.status = req.query.status;
        }
        
        // Filtrar por nome
        if (req.query.name) {
            filter.name = { $regex: req.query.name, $options: 'i' };
        }
        
        // Filtrar por data de criação
        if (req.query.startDate && req.query.endDate) {
            filter.createdAt = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }
        
        // Buscar listas com paginação
        const lists = await List.find(filter)
            .populate('creator', 'name lastName')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        
        // Contar total para paginação
        const total = await List.countDocuments(filter);
        
        return res.status(200).json({
            success: true,
            data: {
                lists,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao buscar listas');
    }
};

// Obter lista por ID
exports.getListById = async (req, res) => {
    try {
        const listId = req.params.id;
        
        const list = await List.findById(listId)
            .populate('creator', 'name lastName')
            .populate('orders');
        
        if (!list) {
            return res.status(404).json({
                success: false,
                message: 'Lista não encontrada'
            });
        }
        
        // Verificar permissões (revendedor só pode ver suas próprias listas)
        if (req.user.type === 'reseller' && list.creator._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para acessar esta lista'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: list
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao buscar lista');
    }
};

// Atualizar lista
exports.updateList = async (req, res) => {
    try {
        const listId = req.params.id;
        
        // Buscar lista
        const list = await List.findById(listId);
        
        if (!list) {
            return res.status(404).json({
                success: false,
                message: 'Lista não encontrada'
            });
        }
        
        // Verificar permissões (revendedor só pode atualizar suas próprias listas)
        if (req.user.type === 'reseller' && list.creator.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para atualizar esta lista'
            });
        }
        
        // Atualizar campos
        if (req.body.name) list.name = req.body.name;
        if (req.body.description) list.description = req.body.description;
        if (req.body.serviceType) list.serviceType = req.body.serviceType;
        if (req.body.status) list.status = req.body.status;
        if (req.body.noteForResellers) list.noteForResellers = req.body.noteForResellers;
        
        // Atualizar detalhes do processo
        if (req.body.processDetails) {
            const processes = [
                'serasa',
                'spc',
                'boaVista',
                'cenprotSp',
                'cenprotNacional',
                'favorableDecision',
                'protocoled'
            ];
            
            processes.forEach(process => {
                if (req.body.processDetails[process] !== undefined) {
                    const status = req.body.processDetails[process] === true;
                    list.processDetails[process].status = status;
                    list.processDetails[process].date = status ? Date.now() : null;
                }
            });
        }
        
        // Se houver alteração no status, atualizar também os pedidos
        if (req.body.status && req.body.status !== list.status) {
            await Order.updateMany(
                { list: listId },
                { status: req.body.status }
            );
        }
        
        // Salvar alterações
        await list.save();
        
        return res.status(200).json({
            success: true,
            message: 'Lista atualizada com sucesso',
            data: list
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao atualizar lista');
    }
};

// Excluir lista
exports.deleteList = async (req, res) => {
    try {
        const listId = req.params.id;
        
        // Buscar lista
        const list = await List.findById(listId);
        
        if (!list) {
            return res.status(404).json({
                success: false,
                message: 'Lista não encontrada'
            });
        }
        
        // Verificar permissões (revendedor só pode excluir suas próprias listas vazias, admin pode excluir qualquer uma)
        if (req.user.type === 'reseller') {
            if (list.creator.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Você não tem permissão para excluir esta lista'
                });
            }
            
            // Verificar se a lista tem pedidos (revendedor só pode excluir listas vazias)
            if (list.orders && list.orders.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Não é possível excluir uma lista que contém pedidos'
                });
            }
        }
        
        // Remover referências da lista nos pedidos
        if (list.orders && list.orders.length > 0) {
            await Order.updateMany(
                { list: listId },
                { list: null }
            );
        }
        
        // Excluir lista
        await List.findByIdAndDelete(listId);
        
        return res.status(200).json({
            success: true,
            message: 'Lista excluída com sucesso'
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao excluir lista');
    }
};

// Adicionar pedido à lista
exports.addOrderToList = async (req, res) => {
    try {
        const { id: listId } = req.params;
        const { orderId } = req.body;
        
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'ID do pedido é obrigatório'
            });
        }
        
        // Buscar lista
        const list = await List.findById(listId);
        
        if (!list) {
            return res.status(404).json({
                success: false,
                message: 'Lista não encontrada'
            });
        }
        
        // Verificar permissões
        if (req.user.type === 'reseller' && list.creator.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para modificar esta lista'
            });
        }
        
        // Verificar se o pedido existe
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        
        // Verificar se o pedido já está em outra lista
        if (order.list && order.list.toString() !== listId) {
            return res.status(400).json({
                success: false,
                message: 'Este pedido já está em outra lista'
            });
        }
        
        // Adicionar pedido à lista
        const added = await list.addOrder(orderId);
        
        if (!added) {
            return res.status(400).json({
                success: false,
                message: 'Este pedido já está na lista'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'Pedido adicionado à lista com sucesso'
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao adicionar pedido à lista');
    }
};

// Remover pedido da lista
exports.removeOrderFromList = async (req, res) => {
    try {
        const { id: listId, orderId } = req.params;
        
        // Buscar lista
        const list = await List.findById(listId);
        
        if (!list) {
            return res.status(404).json({
                success: false,
                message: 'Lista não encontrada'
            });
        }
        
        // Verificar permissões
        if (req.user.type === 'reseller' && list.creator.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para modificar esta lista'
            });
        }
        
        // Remover pedido da lista
        const removed = await list.removeOrder(orderId);
        
        if (!removed) {
            return res.status(400).json({
                success: false,
                message: 'Este pedido não está na lista'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'Pedido removido da lista com sucesso'
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao remover pedido da lista');
    }
};

// Obter progresso da lista
exports.getListProgress = async (req, res) => {
    try {
        const { id: listId } = req.params;
        
        // Buscar lista
        const list = await List.findById(listId);
        
        if (!list) {
            return res.status(404).json({
                success: false,
                message: 'Lista não encontrada'
            });
        }
        
        // Verificar permissões
        if (req.user.type === 'reseller' && list.creator.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para acessar esta lista'
            });
        }
        
        // Calcular progresso
        const progress = list.calculateProgress();
        
        return res.status(200).json({
            success: true,
            data: {
                listId,
                name: list.name,
                status: list.status,
                progress,
                processDetails: list.processDetails
            }
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao obter progresso da lista');
    }
};

// Atualizar status do processo na lista
exports.updateProcessStatus = async (req, res) => {
    try {
        const { id: listId, process } = req.params;
        const { status } = req.body;
        
        if (status === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Status é obrigatório'
            });
        }
        
        // Buscar lista
        const list = await List.findById(listId);
        
        if (!list) {
            return res.status(404).json({
                success: false,
                message: 'Lista não encontrada'
            });
        }
        
        // Verificar permissões (apenas admin pode atualizar status)
        if (req.user.type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Apenas administradores podem atualizar o status do processo'
            });
        }
        
        // Verificar se o processo existe
        if (!list.processDetails[process]) {
            return res.status(404).json({
                success: false,
                message: 'Processo não encontrado'
            });
        }
        
        // Atualizar status do processo
        await list.updateProcessStatus(process, status);
        
        // Se todos os processos estiverem concluídos, atualizar status da lista
        const progress = list.calculateProgress();
        
        if (progress.percentage === 100 && list.status !== 'processo_baixado') {
            list.status = 'processo_baixado';
            list.closedAt = Date.now();
            await list.save();
            
            // Atualizar status dos pedidos na lista
            await Order.updateMany(
                { list: listId },
                { status: 'processo_baixado' }
            );
        }
        
        return res.status(200).json({
            success: true,
            message: 'Status do processo atualizado com sucesso',
            data: {
                process,
                status: list.processDetails[process].status,
                date: list.processDetails[process].date,
                listStatus: list.status,
                progress: list.calculateProgress()
            }
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao atualizar status do processo');
    }
};