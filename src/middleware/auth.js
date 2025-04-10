const jwt = require('jsonwebtoken');
const { config } = require('../config/auth');
const User = require('../models/User');

/**
 * Middleware para verificar autenticação
 * Extrai e valida o token JWT do cabeçalho Authorization
 */
const auth = async (req, res, next) => {
    try {
        // Obter token do cabeçalho Authorization ou cookie
        let token;
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            // Token do cabeçalho Authorization
            token = authHeader.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            // Token de cookie
            token = req.cookies.token;
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Acesso não autorizado. Token não fornecido'
            });
        }
        
        // Verificar token
        const decoded = jwt.verify(token, config.jwtSecret);
        
        // Verificar se o usuário ainda existe
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'O usuário deste token não existe mais'
            });
        }
        
        // Verificar se o usuário está ativo
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Conta desativada. Entre em contato com o administrador.'
            });
        }
        
        // Adicionar o usuário à requisição
        req.user = user;
        
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Erro ao autenticar usuário'
        });
    }
};

/**
 * Middleware para restringir acesso apenas a administradores
 */
const adminOnly = (req, res, next) => {
    if (req.user && req.user.type === 'admin') {
        return next();
    }
    
    return res.status(403).json({
        success: false,
        message: 'Acesso restrito a administradores'
    });
};

module.exports = {
    auth,
    adminOnly
};