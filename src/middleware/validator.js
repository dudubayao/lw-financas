const { validationResult } = require('express-validator');

/**
 * Middleware para validação de dados de entrada
 * Utiliza express-validator para verificar os dados enviados nas requisições
 * 
 * @returns {Function} Middleware de validação
 */
exports.validate = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dados de entrada inválidos',
            errors: errors.array().map(error => ({
                field: error.param,
                message: error.msg
            }))
        });
    }
    
    next();
};

/**
 * Middleware para validação de IDs MongoDB
 * Verifica se o ID fornecido é um ID MongoDB válido
 * 
 * @param {string} paramName - Nome do parâmetro que contém o ID (default: 'id')
 * @returns {Function} Middleware de validação de ID
 */
exports.validateMongoId = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];
        
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: `${paramName} inválido`
            });
        }
        
        next();
    };
};