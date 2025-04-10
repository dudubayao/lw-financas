document.addEventListener('DOMContentLoaded', function() {
    // Sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const body = document.body;
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            body.classList.toggle('sidebar-collapsed');
        });
    }
    
    // Mobile sidebar toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (mobileMenuToggle && sidebar) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-active');
            document.querySelector('.overlay').classList.toggle('active');
        });
    }
    
    // User dropdown
    const userBtn = document.querySelector('.user-btn');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    if (userBtn && dropdownMenu) {
        userBtn.addEventListener('click', function() {
            dropdownMenu.classList.toggle('active');
        });
        
        // Fechar dropdown ao clicar fora
        document.addEventListener('click', function(e) {
            if (!userBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('active');
            }
        });
    }
    
    // Logout modal
    const logoutBtns = document.querySelectorAll('#logout-btn, #logout-dropdown');
    const logoutModal = document.getElementById('logoutModal');
    const closeModal = document.querySelector('.close-modal');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');
    const overlay = document.querySelector('.overlay');
    
    function openLogoutModal() {
        logoutModal.classList.add('active');
        overlay.classList.add('active');
    }
    
    function closeLogoutModal() {
        logoutModal.classList.remove('active');
        overlay.classList.remove('active');
    }
    
    if (logoutBtns.length > 0 && logoutModal) {
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', openLogoutModal);
        });
        
        if (closeModal) closeModal.addEventListener('click', closeLogoutModal);
        if (cancelLogout) cancelLogout.addEventListener('click', closeLogoutModal);
        if (overlay) overlay.addEventListener('click', closeLogoutModal);
        
        if (confirmLogout) {
            confirmLogout.addEventListener('click', function() {
                // Lógica para logout (remover token e redirecionar)
                localStorage.removeItem('auth_token');
                sessionStorage.removeItem('auth_token');
                
                // Redirecionar para a página de login
                window.location.href = '/login';
            });
        }
    }
    
    // Chart.js - Gráfico de Receita Mensal
    const revenueChartEl = document.getElementById('revenueChart');
    
    if (revenueChartEl) {
        const revenueChart = new Chart(revenueChartEl, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: [{
                    label: 'Receita (R$)',
                    data: [12500, 17800, 18300, 21450, 19800, 23500, 25200, 26800, 24300, 28100, 29500, 31200],
                    backgroundColor: 'rgba(22, 71, 133, 0.1)',
                    borderColor: '#164785',
                    borderWidth: 3,
                    pointBackgroundColor: '#164785',
                    pointRadius: 4,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        padding: 10,
                        cornerRadius: 5,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    }
                }
            }
        });
        
        // Atualizar gráfico quando mudar o período
        const revenuePeriod = document.getElementById('revenue-period');
        if (revenuePeriod) {
            revenuePeriod.addEventListener('change', function() {
                const period = this.value;
                let data;
                
                switch (period) {
                    case 'month':
                        data = [24300, 25100, 27800, 28500, 26900, 29100, 26500, 28300, 30100, 29700, 31200, 32500];
                        break;
                    case 'quarter':
                        data = [21000, 19800, 22500, 23700, 25800, 28300, 30100, 28900, 32500, 33700, 35200, 38100];
                        break;
                    case 'year':
                        data = [12500, 17800, 18300, 21450, 19800, 23500, 25200, 26800, 24300, 28100, 29500, 31200];
                        break;
                    default:
                        data = [24300, 25100, 27800, 28500, 26900, 29100, 26500, 28300, 30100, 29700, 31200, 32500];
                }
                
                revenueChart.data.datasets[0].data = data;
                revenueChart.update();
            });
        }
    }
    
    // Chart.js - Gráfico de Distribuição de Serviços
    const servicesChartEl = document.getElementById('servicesChart');
    
    if (servicesChartEl) {
        const servicesChart = new Chart(servicesChartEl, {
            type: 'doughnut',
            data: {
                labels: [
                    'Consulta Completa',
                    'Limpar Nome',
                    'Rating Bancário',
                    'Combo (Limpar Nome + Score)',
                    'Combo (Rating + Limpa Nome)',
                    'Combo (Rating + Bacen)',
                    'Combo Completo'
                ],
                datasets: [{
                    data: [15, 25, 20, 18, 12, 5, 5],
                    backgroundColor: [
                        '#0a2f5c',
                        '#164785',
                        '#2d7dd2',
                        '#f2d675',
                        '#D4AF37',
                        '#ba9121',
                        '#97731a'
                    ],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 15,
                            padding: 15,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        padding: 10,
                        cornerRadius: 5,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.formattedValue;
                                return `${label}: ${value}%`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Chart.js - Gráfico de Progresso por Status
    const statusChartEl = document.getElementById('statusChart');
    
    if (statusChartEl) {
        const statusChart = new Chart(statusChartEl, {
            type: 'bar',
            data: {
                labels: [
                    'Aguardando Pagamento',
                    'Pago',
                    'Processo Protocolado',
                    'Processo Baixado',
                    'Refazer'
                ],
                datasets: [{
                    label: 'Quantidade',
                    data: [45, 120, 85, 65, 15],
                    backgroundColor: [
                        '#ffc107',
                        '#28a745',
                        '#17a2b8',
                        '#6f42c1',
                        '#dc3545'
                    ],
                    borderWidth: 0,
                    borderRadius: 5,
                    maxBarThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        padding: 10,
                        cornerRadius: 5
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    }
                }
            }
        });
    }
    
    // Chart.js - Gráfico de Desempenho de Revendedores
    const resellersChartEl = document.getElementById('resellersChart');
    
    if (resellersChartEl) {
        const resellersChart = new Chart(resellersChartEl, {
            type: 'bar',
            data: {
                labels: ['Carlos Silva', 'Maria Santos', 'João Oliveira', 'Ana Souza', 'Pedro Lima'],
                datasets: [{
                    label: 'Vendas (R$)',
                    data: [28500, 21300, 18700, 15400, 12800],
                    backgroundColor: '#164785',
                    borderWidth: 0,
                    borderRadius: 5,
                    maxBarThickness: 35
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        padding: 10,
                        cornerRadius: 5,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.x !== null) {
                                    label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.x);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        }
                    },
                    y: {
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    }
                }
            }
        });
        
        // Atualizar gráfico quando mudar o período
        const resellersPeriod = document.getElementById('resellers-period');
        if (resellersPeriod) {
            resellersPeriod.addEventListener('change', function() {
                const period = this.value;
                let data;
                
                switch (period) {
                    case 'month':
                        data = [28500, 21300, 18700, 15400, 12800];
                        break;
                    case 'quarter':
                        data = [78500, 65300, 59700, 48400, 42800];
                        break;
                    case 'year':
                        data = [320500, 280300, 245700, 210400, 198800];
                        break;
                    default:
                        data = [28500, 21300, 18700, 15400, 12800];
                }
                
                resellersChart.data.datasets[0].data = data;
                resellersChart.update();
            });
        }
    }
    
    // Ações dos botões de download e expansão dos gráficos
    const chartActionBtns = document.querySelectorAll('.chart-actions .btn-icon');
    
    if (chartActionBtns.length > 0) {
        chartActionBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const action = this.getAttribute('data-action');
                const chartContainer = this.closest('.chart-container');
                const chartId = chartContainer.querySelector('canvas').id;
                
                if (action === 'download') {
                    // Obter o gráfico e converter para imagem
                    const canvas = document.getElementById(chartId);
                    const image = canvas.toDataURL('image/png', 1.0);
                    
                    // Criar link para download
                    const link = document.createElement('a');
                    link.download = `${chartId}-${new Date().toISOString().split('T')[0]}.png`;
                    link.href = image;
                    link.click();
                } else if (action === 'expand') {
                    // Lógica para expandir o gráfico em modal (a ser implementada)
                    console.log('Expandir gráfico:', chartId);
                    // Aqui você pode implementar um modal para mostrar o gráfico expandido
                }
            });
        });
    }
    
    // Data inicial e final com valores padrão
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    if (startDateInput && endDateInput) {
        // Definir data inicial como primeiro dia do mês atual
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        startDateInput.valueAsDate = firstDay;
        
        // Definir data final como hoje
        endDateInput.valueAsDate = today;
    }
});