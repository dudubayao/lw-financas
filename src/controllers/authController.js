const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

// Configurações
const JWT_SECRET = process.env.JWT_SECRET || 'seu_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const TOKEN_COOKIE_EXPIRES = 24 * 60 * 60 * 1000; // 24 horas

// Configuração do mailer (para produção, usar serviço real como SendGrid ou Mailgun)
let transporter;
if (process.env.NODE_ENV === 'production') {
    // Configuração para ambiente de produção
    transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
} else {
    // Configuração para ambiente de desenvolvimento
    transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'ethereal-email-user', // Substitua por credenciais Ethereal (https://ethereal.email/)
            pass: 'ethereal-email-pass'
        }
    });
}

// Gerar token JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, type: user.type },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

// Função para tratamento de erros
const handleError = (res, error, defaultMessage = 'Ocorreu um erro no servidor') => {
    console.error('Auth Error:', error);
    
    if (error.name === 'ValidationError') {
        return res.status(400).json({ 
            success: false, 
            message: 'Erro de validação', 
            errors: Object.values(error.errors).map(err => err.message) 
        });
    }
    
    if (error.code === 11000) {
        return res.status(400).json({ 
            success: false, 
            message: 'Este e-mail já está em uso' 
        });
    }
    
    return res.status(500).json({ 
        success: false, 
        message: defaultMessage 
    });
};

// Controller para login
exports.login = async (req, res) => {
    const { email, password } = req.body;
    
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
        
        // Verificar se o usuário existe
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'E-mail ou senha incorretos' 
            });
        }
        
        // Verificar se o usuário está ativo
        if (user.status !== 'active') {
            return res.status(401).json({ 
                success: false, 
                message: 'Conta desativada. Entre em contato com o administrador.' 
            });
        }
        
        // Verificar senha
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'E-mail ou senha incorretos' 
            });
        }
        
        // Gerar token JWT
        const token = generateToken(user);
        
        // Atualizar último login
        user.lastLogin = Date.now();
        await user.save();
        
        // Definir cookie (opcional, pode ser usado como redundância ao localStorage)
        res.cookie('token', token, {
            expires: new Date(Date.now() + TOKEN_COOKIE_EXPIRES),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Apenas HTTPS em produção
            sameSite: 'strict'
        });
        
        return res.status(200).json({
            success: true,
            message: 'Login realizado com sucesso',
            token,
            user: {
                id: user._id,
                name: user.name,
                lastName: user.lastName,
                fullName: user.fullName,
                email: user.email,
                type: user.type
            }
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao realizar login');
    }
};

// Controller para logout
exports.logout = (req, res) => {
    res.clearCookie('token');
    
    return res.status(200).json({
        success: true,
        message: 'Logout realizado com sucesso'
    });
};

// Controller para registro (apenas para admins criarem novos usuários)
exports.register = async (req, res) => {
    // Este endpoint só deve ser acessível para admins
    if (req.user.type !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Acesso não autorizado' 
        });
    }
    
    const { name, lastName, email, phone, password, type } = req.body;
    
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
        
        // Verificar se o e-mail já está em uso
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Este e-mail já está em uso' 
            });
        }
        
        // Criar novo usuário
        const user = new User({
            name,
            lastName,
            email,
            phone,
            password,
            type: type || 'reseller' // Padrão é revendedor
        });
        
        await user.save();
        
        return res.status(201).json({
            success: true,
            message: 'Usuário cadastrado com sucesso',
            user: {
                id: user._id,
                name: user.name,
                lastName: user.lastName,
                email: user.email,
                type: user.type
            }
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao cadastrar usuário');
    }
};

// Controller para solicitar redefinição de senha
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    
    try {
        // Validar entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'E-mail inválido', 
                errors: errors.array() 
            });
        }
        
        // Verificar se o usuário existe
        const user = await User.findOne({ email });
        
        if (!user) {
            // Por segurança, não informamos que o e-mail não existe
            return res.status(200).json({ 
                success: true, 
                message: 'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha' 
            });
        }
        
        // Gerar token de redefinição
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Hash do token antes de armazenar
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
            
        // Definir expiração (1 hora)
        user.resetPasswordExpires = Date.now() + 3600000;
        
        await user.save();
        
        // URL de redefinição de senha
        const resetUrl = `${req.protocol}://${req.get('host')}/login/reset-password/${resetToken}`;
        
        // Enviar e-mail
        const message = {
            from: process.env.EMAIL_FROM || 'noreply@lwsolucoes.com.br',
            to: user.email,
            subject: 'Redefinição de Senha - LW Soluções Financeiras',
            html: `
                <h1>Redefinição de Senha</h1>
                <p>Olá ${user.name},</p>
                <p>Você solicitou a redefinição de sua senha. Clique no link abaixo para criar uma nova senha:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #0a2f5c; color: white; text-decoration: none; border-radius: 5px;">Redefinir Senha</a>
                <p>Este link expira em 1 hora.</p>
                <p>Se você não solicitou a redefinição de senha, ignore este e-mail.</p>
                <p>Atenciosamente,<br>Equipe LW Soluções Financeiras</p>
            `
        };
        
        await transporter.sendMail(message);
        
        return res.status(200).json({
            success: true,
            message: 'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha'
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao processar solicitação de redefinição de senha');
    }
};

// Controller para redefinir senha
exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    
    try {
        // Validar entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Senha inválida', 
                errors: errors.array() 
            });
        }
        
        // Hash do token para comparação
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
        
        // Procurar usuário com token válido
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'Token inválido ou expirado' 
            });
        }
        
        // Atualizar senha
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: 'Senha redefinida com sucesso. Você já pode fazer login com sua nova senha.'
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao redefinir senha');
    }
};

// Controller para verificar token
exports.checkAuth = async (req, res) => {
    // O middleware de autenticação já verificou o token
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuário não encontrado' 
            });
        }
        
        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                lastName: user.lastName,
                fullName: user.fullName,
                email: user.email,
                type: user.type
            }
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao verificar autenticação');
    }
};

// Controller para alterar senha
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
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
        
        // Buscar usuário com senha
        const user = await User.findById(req.user.id).select('+password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuário não encontrado' 
            });
        }
        
        // Verificar senha atual
        const isMatch = await user.comparePassword(currentPassword);
        
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Senha atual incorreta' 
            });
        }
        
        // Atualizar senha
        user.password = newPassword;
        await user.save();
        
        return res.status(200).json({
            success: true,
            message: 'Senha alterada com sucesso'
        });
        
    } catch (error) {
        return handleError(res, error, 'Erro ao alterar senha');
    }
};