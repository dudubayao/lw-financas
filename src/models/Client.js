const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema de Cliente
const ClientSchema = new Schema({
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
        trim: true,
        unique: true
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
    },
    address: {
        street: String,
        number: String,
        complement: String,
        neighborhood: String,
        city: String,
        state: String,
        zipCode: String
    },
    orders: [{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'O criador do cliente é obrigatório']
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

// Validar documento único por tipo (CPF ou CNPJ)
ClientSchema.index({ document: 1, documentType: 1 }, { unique: true });

// Hooks pré-operação
ClientSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Método para formatar documento (CPF/CNPJ)
ClientSchema.methods.formatDocument = function() {
    if (this.documentType === 'cpf') {
        return this.document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (this.documentType === 'cnpj') {
        return this.document.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return this.document;
};

// Método para obter resumo de cliente
ClientSchema.methods.getSummary = function() {
    return {
        id: this._id,
        name: this.name,
        document: this.formatDocument(),
        documentType: this.documentType,
        email: this.email,
        phone: this.phone,
        ordersCount: this.orders.length,
        createdAt: this.createdAt
    };
};

// Método estático para buscar cliente por documento
ClientSchema.statics.findByDocument = function(document, type) {
    // Remover caracteres não numéricos
    const cleanDocument = document.replace(/\D/g, '');
    return this.findOne({ document: cleanDocument, documentType: type });
};

// Criar e exportar o modelo
const Client = mongoose.model('Client', ClientSchema);

module.exports = Client;