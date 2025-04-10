const jwt = require('jsonwebtoken');

// Configuração padrão de autenticação
const config = {
    jwtSecret: process.env.JWT_SECRET || '8deace8cfe6e7859a76b9f5d7e6e4a92b9a7f8a3c4e2d1b5a9c8d7f6e5d4c3',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    cookieExpiresIn: 24 * 60 * 60 * 1000, // 24 horas em milissegundos
    passwordResetExpires: 60 * 60 * 1000, // 1 hora em milissegundos
};

/**
 * Gera um token JWT para o usuário
 * @param {Object} user - Objeto do usuário 
 * @returns {String} Token JWT
 */
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user._id || user.id, 
            email: user.email, 
            type: user.type 
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
};

/**
 * Verifica e decodifica um token JWT
 * @param {String} token - Token JWT a ser verificado
 * @returns {Object|null} Objeto decodificado ou null em caso de erro
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, config.jwtSecret);
    } catch (error) {
        return null;
    }
};

module.exports = {
    config,
    generateToken,
    verifyToken
};