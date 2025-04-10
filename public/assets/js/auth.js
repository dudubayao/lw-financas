document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const loginForm = document.getElementById('loginForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const loginFormContainer = document.querySelector('.login-form-container');
    const resetFormContainer = document.querySelector('.reset-form-container');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToLoginBtn = document.getElementById('backToLogin');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    const loginErrorAlert = document.getElementById('loginError');
    const resetSuccessAlert = document.getElementById('resetSuccess');
    
    // Toggle entre formulários (login e recuperação de senha)
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginFormContainer.style.display = 'none';
            resetFormContainer.style.display = 'block';
        });
    }
    
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', function() {
            resetFormContainer.style.display = 'none';
            loginFormContainer.style.display = 'block';
            resetSuccessAlert.style.display = 'none';
        });
    }
    
    // Mostrar/ocultar senha
    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Alternar ícone
            const icon = this.querySelector('i');
            if (type === 'password') {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        });
    }
    
    // Processamento do formulário de login
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Esconder mensagem de erro caso esteja visível
            loginErrorAlert.style.display = 'none';
            
            // Obter dados do formulário
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember').checked;
            
            // Obter botão de submit para feedback visual
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            
            // Desabilitar botão durante processamento
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
            
            // Simular requisição de login (substituir por fetch real em produção)
            setTimeout(() => {
                // Exemplo de verificação de credenciais (substituir por chamada de API real)
                if (email === 'teste@exemplo.com' && password === 'senha123') {
                    // Sucesso: salvar token e redirecionar
                    if (remember) {
                        localStorage.setItem('auth_token', 'exemplo_token_jwt');
                    } else {
                        sessionStorage.setItem('auth_token', 'exemplo_token_jwt');
                    }
                    
                    // Redirecionar para o dashboard
                    window.location.href = '/login/dashboard.html';
                } else {
                    // Falha: mostrar erro
                    loginErrorAlert.style.display = 'flex';
                    
                    // Restaurar botão
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            }, 1500);
        });
    }
    
    // Processamento do formulário de recuperação de senha
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Obter e-mail
            const email = document.getElementById('resetEmail').value.trim();
            
            // Obter botão de submit para feedback visual
            const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            
            // Desabilitar botão durante processamento
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            
            // Simular requisição (substituir por fetch real em produção)
            setTimeout(() => {
                // Mostrar mensagem de sucesso
                resetSuccessAlert.style.display = 'flex';
                resetSuccessAlert.querySelector('span').textContent = `E-mail de recuperação enviado para ${email}`;
                
                // Limpar formulário
                resetPasswordForm.reset();
                
                // Restaurar botão
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }, 1500);
        });
    }
    
    // Verificar se já existe sessão ativa
    function checkAuthentication() {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        
        if (token) {
            // Se já estiver autenticado, redirecionar para o dashboard
            window.location.href = '/login/dashboard.html';
        }
    }
    
    // Verificar autenticação ao carregar a página
    checkAuthentication();
});