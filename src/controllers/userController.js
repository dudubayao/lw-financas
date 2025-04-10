const User = require('../models/User');

// Listar todos os usuários (apenas para admin)
exports.getAllUsers = async (req, res) => {
    try {
        // Verificar se o usuário é admin
        if (req.user.type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso não autorizado'
            });
        }
        
        // Parâmetros de paginação
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Parâmetros de filtro
        const filter = {};
        
        if (req.query.name) {
            filter.name = { $regex: req.query.name, $options: 'i' };
        }
        
        if (req.query.email) {
            filter.email = { $regex: req.query.email, $options: 'i' };
        }
        
        if (req.query.type) {
            filter.type = req.query.type;
        }
        
        if (req.query.status) {
            filter.status = req.query.status;
        }
        
        // Buscar usuários
        const users = await User.find(filter)
            .select('-password -resetPasswordToken -resetPasswordExpires')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
        
        // Contar total de usuários (para paginação)
        const total = await User.countDocuments(filter);
        
        return res.status(200).json({
            success: true,
            data: {
                users,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get All Users Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar usuários'
        });
    }
};

// Obter usuário por ID
exports.getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Verificar permissões (admin pode ver qualquer usuário, revendedor só pode ver a si mesmo)
        if (req.user.type !== 'admin' && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Acesso não autorizado'
            });
        }
        
        const user = await User.findById(userId)
            .select('-password -resetPasswordToken -resetPasswordExpires');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get User By ID Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar usuário'
        });
    }
};

// Atualizar usuário
exports.updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Verificar permissões (admin pode atualizar qualquer usuário, revendedor só pode atualizar a si mesmo)
        if (req.user.type !== 'admin' && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Acesso não autorizado'
            });
        }
        
        // Se for revendedor, não permitir alterar tipo ou status
        if (req.user.type !== 'admin') {
            delete req.body.type;
            delete req.body.status;
        }
        
        // Não permitir atualizar senha por esta rota
        delete req.body.password;
        
        // Atualizar usuário
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: req.body },
            { new: true, runValidators: true }
        ).select('-password -resetPasswordToken -resetPasswordExpires');
        
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'Usuário atualizado com sucesso',
            data: updatedUser
        });
    } catch (error) {
        console.error('Update User Error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'E-mail já está em uso'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Erro ao atualizar usuário'
        });
    }
};

// Excluir usuário (apenas admin)
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Apenas admin pode excluir usuários
        if (req.user.type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso não autorizado'
            });
        }
        
        // Não permitir excluir o próprio usuário
        if (req.user.id === userId) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível excluir seu próprio usuário'
            });
        }
        
        const deletedUser = await User.findByIdAndDelete(userId);
        
        if (!deletedUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: 'Usuário excluído com sucesso'
        });
    } catch (error) {
        console.error('Delete User Error:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Erro ao excluir usuário'
        });
    }
};

// Alterar status do usuário (ativar/desativar)
exports.changeUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const { status } = req.body;
        
        // Apenas admin pode alterar status
        if (req.user.type !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso não autorizado'
            });
        }
        
        // Validar status
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido. Valores aceitos: active, inactive'
            });
        }
        
        // Não permitir desativar o próprio usuário
        if (req.user.id === userId && status === 'inactive') {
            return res.status(400).json({
                success: false,
                message: 'Não é possível desativar seu próprio usuário'
            });
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { status },
            { new: true }
        ).select('-password -resetPasswordToken -resetPasswordExpires');
        
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: `Usuário ${status === 'active' ? 'ativado' : 'desativado'} com sucesso`,
            data: updatedUser
        });
    } catch (error) {
        console.error('Change User Status Error:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Erro ao alterar status do usuário'
        });
    }
};

// Obter meu perfil (usuário logado)
exports.getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password -resetPasswordToken -resetPasswordExpires');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Get My Profile Error:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar perfil'
        });
    }
};

// Atualizar meu perfil (usuário logado)
exports.updateMyProfile = async (req, res) => {
    try {
        // Não permitir alterar tipo, status ou senha por esta rota
        delete req.body.type;
        delete req.body.status;
        delete req.body.password;
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).select('-password -resetPasswordToken -resetPasswordExpires');
        
        return res.status(200).json({
            success: true,
            message: 'Perfil atualizado com sucesso',
            data: updatedUser
        });
    } catch (error) {
        console.error('Update My Profile Error:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'E-mail já está em uso'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Erro ao atualizar perfil'
        });
    }
};