const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema de Lista
const ListSchema = new Schema({
    name: {
        type: String,
        required: [true, 'O nome da lista é obrigatório'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    serviceType: {
        type: String,
        enum: [
            'consulta_completa',
            'limpar_nome',
            'rating_bancario',
            'combo_limpar_score',
            'combo_rating_limpar',
            'combo_rating_bacen',
            'combo_completo'
        ],
        required: [true, 'O tipo de serviço é obrigatório']
    },
    status: {
        type: String,
        enum: [
            'aguardando_pagamento',
            'pago',
            'processo_protocolado',
            'processo_baixado',
            'refazer'
        ],
        default: 'aguardando_pagamento'
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'O criador da lista é obrigatório']
    },
    orders: [{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }],
    processDetails: {
        serasa: {
            status: {
                type: Boolean,
                default: false
            },
            date: Date
        },
        spc: {
            status: {
                type: Boolean,
                default: false
            },
            date: Date
        },
        boaVista: {
            status: {
                type: Boolean,
                default: false
            },
            date: Date
        },
        cenprotSp: {
            status: {
                type: Boolean,
                default: false
            },
            date: Date
        },
        cenprotNacional: {
            status: {
                type: Boolean,
                default: false
            },
            date: Date
        },
        favorableDecision: {
            status: {
                type: Boolean,
                default: false
            },
            date: Date
        },
        protocoled: {
            status: {
                type: Boolean,
                default: false
            },
            date: Date
        }
    },
    noteForResellers: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    closedAt: Date
});

// Hooks pré-operação
ListSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Hook para fechar lista
ListSchema.pre('findOneAndUpdate', function(next) {
    if (this._update.status === 'processo_baixado' && !this._update.closedAt) {
        this._update.closedAt = Date.now();
    }
    this._update.updatedAt = Date.now();
    next();
});

// Método para calcular resumo da lista
ListSchema.methods.getSummary = function() {
    return {
        id: this._id,
        name: this.name,
        serviceType: this.serviceType,
        status: this.status,
        orderCount: this.orders.length,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        progress: this.calculateProgress()
    };
};

// Método para calcular progresso do processamento
ListSchema.methods.calculateProgress = function() {
    const processes = [
        'serasa', 
        'spc', 
        'boaVista', 
        'cenprotSp', 
        'cenprotNacional', 
        'favorableDecision', 
        'protocoled'
    ];
    
    const completed = processes.filter(process => 
        this.processDetails[process] && this.processDetails[process].status
    ).length;
    
    return {
        percentage: Math.round((completed / processes.length) * 100),
        completed,
        total: processes.length
    };
};

// Método para atualizar status do processo
ListSchema.methods.updateProcessStatus = function(process, status) {
    if (this.processDetails[process]) {
        this.processDetails[process].status = status;
        this.processDetails[process].date = status ? Date.now() : null;
        return this.save();
    }
    return Promise.reject(new Error(`Processo ${process} não encontrado`));
};

// Método para adicionar pedido à lista
ListSchema.methods.addOrder = async function(orderId) {
    if (!this.orders.includes(orderId)) {
        this.orders.push(orderId);
        await this.save();
        
        // Atualizar o pedido com o ID da lista
        const Order = mongoose.model('Order');
        await Order.findByIdAndUpdate(orderId, { list: this._id, status: this.status });
        
        return true;
    }
    return false;
};

// Método para remover pedido da lista
ListSchema.methods.removeOrder = async function(orderId) {
    const index = this.orders.indexOf(orderId);
    if (index > -1) {
        this.orders.splice(index, 1);
        await this.save();
        
        // Remover referência da lista no pedido
        const Order = mongoose.model('Order');
        await Order.findByIdAndUpdate(orderId, { list: null });
        
        return true;
    }
    return false;
};

// Método estático para obter estatísticas
ListSchema.statics.getStats = async function(creatorId, dateRange) {
    const query = creatorId ? { creator: creatorId } : {};
    
    if (dateRange && dateRange.start && dateRange.end) {
        query.createdAt = {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end)
        };
    }
    
    const stats = await this.aggregate([
        { $match: query },
        { $group: {
            _id: null,
            totalLists: { $sum: 1 },
            totalOrders: { $sum: { $size: '$orders' } },
            statusCounts: {
                $push: '$status'
            },
            serviceTypeCounts: {
                $push: '$serviceType'
            }
        }},
        { $project: {
            _id: 0,
            totalLists: 1,
            totalOrders: 1,
            statusCounts: 1,
            serviceTypeCounts: 1
        }}
    ]);
    
    if (stats.length === 0) {
        return {
            totalLists: 0,
            totalOrders: 0,
            statusCounts: {},
            serviceTypeCounts: {}
        };
    }
    
    // Processar contagens
    const result = stats[0];
    
    // Contar status
    result.statusCounts = result.statusCounts.reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    
    // Contar tipos de serviço
    result.serviceTypeCounts = result.serviceTypeCounts.reduce((acc, serviceType) => {
        acc[serviceType] = (acc[serviceType] || 0) + 1;
        return acc;
    }, {});
    
    return result;
};

// Criar e exportar o modelo
const List = mongoose.model('List', ListSchema);

module.exports = List;