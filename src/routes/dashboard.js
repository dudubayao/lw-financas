const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Rotas para dados do dashboard
router.get('/stats', dashboardController.getStats);
router.get('/revenue-chart', dashboardController.getRevenueChart);
router.get('/process-status-chart', dashboardController.getProcessStatusChart);
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router;