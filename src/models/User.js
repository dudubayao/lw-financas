const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

// Schema de Usuário
const UserSchema = new Schema({
    name: {
        type: String,
        required: [true, 'O nome é obrigatório'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'O sobrenome é obrigatório'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'O e-mail é obrigatório'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, forneça um e-mail válido']
    },
    phone: {
        type: String,
        required: [true, 'O telefone é obrigatório'],
        trim: true
    },
    password: {
        type: String,
        required: [true, 'A senha é obrigatória'],
        minlength: [6, 'A senha deve ter no mínimo 6 caracteres']
    },
    type: {
        type: String,
        enum: ['admin', 'reseller'],
        default: 'reseller'
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLogin: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Métodos virtuais
UserSchema.virtual('fullName').get(function() {
    return `${this.name} ${this.lastName}`;
});

// Hooks pré-operação
UserSchema.pre('save', async function(next) {
    // Atualizar o campo updatedAt
    this.updatedAt = Date.now();
    
    // Hash da senha apenas se foi modificada ou é nova
    if (!this.isModified('password')) return next();
    
    try {
        // Gerar salt
        const salt = await bcrypt.genSalt(10);
        
        // Hash da senha
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar senhas
UserSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error(error);
    }
};

// Método para gerar token de redefinição de senha
UserSchema.methods.generatePasswordResetToken = function() {
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
        
    // Token expira em 1 hora
    this.resetPasswordExpires = Date.now() + 3600000;
    
    return resetToken;
};

// Registrar último login
UserSchema.methods.recordLogin = function() {
    this.lastLogin = Date.now();
    return this.save();
};

// Criar e exportar o modelo
const User = mongoose.model('User', UserSchema);

module.exports = User;