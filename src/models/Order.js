const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema de Pedido
const OrderSchema = new Schema({
    reseller: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'O ID do revendedor é obrigatório']
    },
    client: {
        name: {
            type: String,
            required: [true, 'O nome do cliente é obrigatório'],
            trim: true
        },
        documentType: {
            type: String,
            enum: ['cpf', 'cnpj'],
            required: [true, 'O tipo de documento é obrigatório']
        },
        document: {
            type: String,
            required: [true, 'O número do documento é obrigatório'],
            trim: true
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, forneça um e-mail válido']
        },
        phone: {
            type: String,
            trim: true
        }
    },
    service: {
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
        required: [true, 'O serviço contratado é obrigatório']
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
    value: {
        type: Number,
        required: [true, 'O valor do pedido é obrigatório'],
        min: [0, 'O valor não pode ser negativo']
    },
    list: {
        type: Schema.Types.ObjectId,
        ref: 'List',
        default: null
    },
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
    notes: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Hooks pré-operação
OrderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Método para atualizar status do processo
OrderSchema.methods.updateProcessStatus = function(process, status) {
    if (this.processDetails[process]) {
        this.processDetails[process].status = status;
        this.processDetails[process].date = status ? Date.now() : null;
        return this.save();
    }
    return Promise.reject(new Error(`Processo ${process} não encontrado`));
};

// Método para calcular progresso do processo
OrderSchema.methods.calculateProgress = function() {
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

// Método estático para obter estatísticas
OrderSchema.statics.getStats = async function(resellerId, dateRange) {
    const query = resellerId ? { reseller: resellerId } : {};
    
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
            totalOrders: { $sum: 1 },
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
            },
            statusCounts: {
                $push: '$status'
            },
            serviceCounts: {
                $push: '$service'
            }
        }},
        { $project: {
            _id: 0,
            totalOrders: 1,
            totalValue: 1,
            paidValue: 1,
            pendingValue: 1,
            statusCounts: 1,
            serviceCounts: 1
        }}
    ]);
    
    if (stats.length === 0) {
        return {
            totalOrders: 0,
            totalValue: 0,
            paidValue: 0,
            pendingValue: 0,
            statusCounts: {},
            serviceCounts: {}
        };
    }
    
    // Processar contagens
    const result = stats[0];
    
    // Contar status
    result.statusCounts = result.statusCounts.reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    
    // Contar serviços
    result.serviceCounts = result.serviceCounts.reduce((acc, service) => {
        acc[service] = (acc[service] || 0) + 1;
        return acc;
    }, {});
    
    return result;
};

// Criar e exportar o modelo
const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;