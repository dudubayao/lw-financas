const Order = require('../models/Order');
const User = require('../models/User');
const List = require('../models/List');

// Função auxiliar para tratar datas
const getDateRange = (req) => {
    let startDate, endDate;
    
    if (req.query.startDate) {
        startDate = new Date(req.query.startDate);
        startDate.setHours(0, 0, 0, 0);
    } else {
        // Padrão: 30 dias atrás
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
    }
    
    if (req.query.endDate) {
        endDate = new Date(req.query.endDate);
        endDate.setHours(23, 59, 59, 999);
    } else {
        // Padrão: hoje
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
    }
    
    return { startDate, endDate };
};

// Obter estatísticas gerais do dashboard
exports.getStats = async (req, res) => {
    try {
        const { startDate, endDate } = getDateRange(req);
        
        // Filtro por data
        const dateFilter = {
            createdAt: { $gte: startDate, $lte: endDate }
        };
        
        // Filtro por revendedor (apenas para admin)
        if (req.query.resellerId && req.user.type === 'admin') {
            dateFilter.reseller = req.query.resellerId;
        }
        
        // Se for revendedor, filtrar apenas seus dados
        if (req.user.type === 'reseller') {
            dateFilter.reseller = req.user.id;
        }
        
        // Contar total de pedidos
        const totalOrders = await Order.countDocuments(dateFilter);
        
        // Contar total de clientes únicos
        const totalClients = await Order.distinct('client.document', dateFilter).countDocuments();
        
        // Calcular valor total, pago e pendente
        const [financialStats] = await Order.aggregate([
            { $match: dateFilter },
            { $group: {
                _id: null,
                totalValue: { $sum: '$value' },
                paidValue: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'pago'] }, '$value', 0]
                    }
                },
                pendingValue: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'aguardando_pagamento'] }, '$value', 0]
                    }
                }
            }}
        ]);
        
        // Contar pedidos por status
        const statusCounts = await Order.aggregate([
            { $match: dateFilter },
            { $group: {
                _id: '$status',
                count: { $sum: 1 }
            }},
            { $project: {
                _id: 0,
                status: '$_id',
                count: 1
            }}
        ]);
        
        // Contar pedidos por serviço
        const serviceCounts = await Order.aggregate([
            { $match: dateFilter },
            { $group: {
                _id: '$service',
                count: { $sum: 1 }
            }},
            { $project: {
                _id: 0,
                service: '$_id',
                count: 1
            }}
        ]);
        
        // Formatar dados financeiros
        const financial = financialStats ? {
            totalValue: financialStats.totalValue || 0,
            paidValue: financialStats.paidValue || 0,
            pendingValue: financialStats.pendingValue || 0
        } : {
            totalValue: 0,
            paidValue: 0,
            pendingValue: 0
        };
        
        // Dados adicionais apenas para admin
        let adminStats = {};
        
        if (req.user.type === 'admin') {
            // Contar total de revendedores
            const totalResellers = await User.countDocuments({ 
                type: 'reseller',
                createdAt: { $gte: startDate, $lte: endDate }
            });
            
            // Top revendedores
            const topResellers = await Order.aggregate([
                { $match: dateFilter },
                { $group: {
                    _id: '$reseller',
                    totalOrders: { $sum: 1 },
                    totalValue: { $sum: '$value' }
                }},
                { $sort: { totalValue: -1 } },
                { $limit: 5 },
                { $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'resellerInfo'
                }},
                { $unwind: '$resellerInfo' },
                { $project: {
                    _id: 0,
                    resellerId: '$_id',
                    name: { $concat: ['$resellerInfo.name', ' ', '$resellerInfo.lastName'] },
                    totalOrders: 1,
                    totalValue: 1
                }}
            ]);
            
            adminStats = {
                totalResellers,
                topResellers
            };
        }
        
        return res.status(200).json({
            success: true,
            data: {
                totalOrders,
                totalClients,
                financial,
                statusCounts,
                serviceCounts,
                ...adminStats,
                dateRange: {
                    startDate,
                    endDate
                }
            }
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar estatísticas do dashboard'
        });
    }
};

// Obter dados para gráfico de receita por período
exports.getRevenueChart = async (req, res) => {
    try {
        const { startDate, endDate } = getDateRange(req);
        
        // Determinar agrupamento com base no intervalo de dias
        const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        let groupBy, format;
        
        if (diffDays <= 31) {
            // Agrupar por dia
            groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };
            format = '%Y-%m-%d';
        } else if (diffDays <= 365) {
            // Agrupar por mês
            groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
            format = '%Y-%m';
        } else {
            // Agrupar por ano
            groupBy = { year: { $year: '$createdAt' } };
            format = '%Y';
        }
        
        // Filtro base
        const matchFilter = {
            createdAt: { $gte: startDate, $lte: endDate }
        };
        
        // Filtrar por revendedor (admin pode filtrar específico, revendedor vê apenas seus dados)
        if (req.user.type === 'reseller') {
            matchFilter.reseller = req.user.id;
        } else if (req.query.resellerId) {
            matchFilter.reseller = req.query.resellerId;
        }
        
        // Consulta agregada para dados de receita
        const revenueData = await Order.aggregate([
            { $match: matchFilter },
            { $group: {
                _id: groupBy,
                date: { $first: { $dateToString: { format, date: '$createdAt' } } },
                totalValue: { $sum: '$value' },
                paidValue: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'pago'] }, '$value', 0]
                    }
                },
                count: { $sum: 1 }
            }},
            { $sort: { date: 1 } },
            { $project: {
                _id: 0,
                date: 1,
                totalValue: 1,
                paidValue: 1,
                count: 1
            }}
        ]);
        
        return res.status(200).json({
            success: true,
            data: {
                revenueData,
                dateRange: {
                    startDate,
                    endDate,
                    diffDays
                }
            }
        });
    } catch (error) {
        console.error('Revenue Chart Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar dados de receita'
        });
    }
};

// Obter dados para gráfico de status de processos
exports.getProcessStatusChart = async (req, res) => {
    try {
        // Filtro base
        const matchFilter = {};
        
        // Filtrar por revendedor (admin pode filtrar específico, revendedor vê apenas seus dados)
        if (req.user.type === 'reseller') {
            matchFilter.reseller = req.user.id;
        } else if (req.query.resellerId) {
            matchFilter.reseller = req.query.resellerId;
        }
        
        // Consulta agregada para progresso dos processos
        const processData = await Order.aggregate([
            { $match: matchFilter },
            { $project: {
                service: 1,
                status: 1,
                hasSerasa: { $cond: [{ $eq: ['$processDetails.serasa.status', true] }, 1, 0] },
                hasSpc: { $cond: [{ $eq: ['$processDetails.spc.status', true] }, 1, 0] },
                hasBoaVista: { $cond: [{ $eq: ['$processDetails.boaVista.status', true] }, 1, 0] },
                hasCenprotSp: { $cond: [{ $eq: ['$processDetails.cenprotSp.status', true] }, 1, 0] },
                hasCenprotNacional: { $cond: [{ $eq: ['$processDetails.cenprotNacional.status', true] }, 1, 0] },
                hasFavorableDecision: { $cond: [{ $eq: ['$processDetails.favorableDecision.status', true] }, 1, 0] },
                hasProtocoled: { $cond: [{ $eq: ['$processDetails.protocoled.status', true] }, 1, 0] }
            }},
            { $group: {
                _id: '$status',
                count: { $sum: 1 },
                serasa: { $sum: '$hasSerasa' },
                spc: { $sum: '$hasSpc' },
                boaVista: { $sum: '$hasBoaVista' },
                cenprotSp: { $sum: '$hasCenprotSp' },
                cenprotNacional: { $sum: '$hasCenprotNacional' },
                favorableDecision: { $sum: '$hasFavorableDecision' },
                protocoled: { $sum: '$hasProtocoled' }
            }},
            { $project: {
                _id: 0,
                status: '$_id',
                count: 1,
                processes: {
                    serasa: '$serasa',
                    spc: '$spc',
                    boaVista: '$boaVista',
                    cenprotSp: '$cenprotSp',
                    cenprotNacional: '$cenprotNacional',
                    favorableDecision: '$favorableDecision',
                    protocoled: '$protocoled'
                }
            }}
        ]);
        
        return res.status(200).json({
            success: true,
            data: processData
        });
    } catch (error) {
        console.error('Process Status Chart Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar dados de status de processos'
        });
    }
};

// Obter atividades recentes
exports.getRecentActivity = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        // Filtro base
        const matchFilter = {};
        
        // Filtrar por revendedor (admin pode ver tudo, revendedor vê apenas seus dados)
        if (req.user.type === 'reseller') {
            matchFilter.reseller = req.user.id;
        }
        
        // Buscar pedidos recentes
        const recentOrders = await Order.find(matchFilter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('reseller', 'name lastName')
            .lean();
        
        // Buscar listas recentes
        const recentLists = await List.find(matchFilter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('creator', 'name lastName')
            .lean();
        
        // Combinar e ordenar atividades
        const activities = [
            ...recentOrders.map(order => ({
                type: 'order',
                id: order._id,
                title: `Novo pedido: ${order.client.name}`,
                description: `Serviço: ${order.service}, Status: ${order.status}`,
                value: order.value,
                user: order.reseller ? `${order.reseller.name} ${order.reseller.lastName}` : 'Sistema',
                timestamp: order.createdAt
            })),
            ...recentLists.map(list => ({
                type: 'list',
                id: list._id,
                title: `Nova lista: ${list.name}`,
                description: `Serviço: ${list.serviceType}, Status: ${list.status}, Pedidos: ${list.orders.length}`,
                user: list.creator ? `${list.creator.name} ${list.creator.lastName}` : 'Sistema',
                timestamp: list.createdAt
            }))
        ];
        
        // Ordenar por data (mais recente primeiro)
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return res.status(200).json({
            success: true,
            data: activities.slice(0, limit)
        });
    } catch (error) {
        console.error('Recent Activity Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar atividades recentes'
        });
    }
};