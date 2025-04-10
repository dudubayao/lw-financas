document.addEventListener('DOMContentLoaded', function() {
    // Menu mobile
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            const isExpanded = mainNav.classList.contains('active');
            mobileMenuBtn.setAttribute('aria-expanded', isExpanded);
            
            if (isExpanded) {
                mobileMenuBtn.innerHTML = '<i class="fas fa-times"></i>';
            } else {
                mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    }
    
    // Header scroll
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Carrossel de depoimentos
    const testimonialSlider = document.querySelector('.testimonials-slider');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const cards = document.querySelectorAll('.testimonial-card');
    
    if (testimonialSlider && prevBtn && nextBtn) {
        let cardIndex = 0;
        const cardWidth = cards[0].offsetWidth + 30; // Card width + margin
        
        // Função para mover o slider
        function moveSlider(direction) {
            if (direction === 'next') {
                cardIndex = Math.min(cardIndex + 1, cards.length - 1);
            } else {
                cardIndex = Math.max(cardIndex - 1, 0);
            }
            
            testimonialSlider.scrollTo({
                left: cardIndex * cardWidth,
                behavior: 'smooth'
            });
            
            // Atualizar estado dos botões
            updateButtonState();
        }
        
        // Atualizar estado dos botões (desabilitado quando chegar ao limite)
        function updateButtonState() {
            prevBtn.disabled = cardIndex === 0;
            nextBtn.disabled = cardIndex === cards.length - 1;
            
            prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
            nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
        }
        
        // Adicionar eventos aos botões
        prevBtn.addEventListener('click', () => moveSlider('prev'));
        nextBtn.addEventListener('click', () => moveSlider('next'));
        
        // Inicializar estado dos botões
        updateButtonState();
    }
    
    // Animação de scroll suave para links internos
    const scrollLinks = document.querySelectorAll('a[href^="#"]');
    
    scrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 100;
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                
                // Fechar menu mobile se estiver aberto
                if (mainNav.classList.contains('active')) {
                    mainNav.classList.remove('active');
                    mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
                    mobileMenuBtn.setAttribute('aria-expanded', false);
                }
            }
        });
    });
    
    // Formulário de contato
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Coletar dados do formulário
            const formData = new FormData(contactForm);
            const formValues = Object.fromEntries(formData.entries());
            
            // Aqui seria a lógica para enviar os dados para o backend
            console.log('Dados do formulário:', formValues);
            
            // Feedback visual ao usuário
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            
            // Simulação de envio (remover em produção)
            setTimeout(() => {
                // Resetar formulário
                contactForm.reset();
                
                // Mostrar mensagem de sucesso
                const successMessage = document.createElement('div');
                successMessage.className = 'alert-success';
                successMessage.innerHTML = '<i class="fas fa-check-circle"></i> Mensagem enviada com sucesso! Entraremos em contato em breve.';
                
                contactForm.parentNode.insertBefore(successMessage, contactForm);
                
                // Restaurar botão
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
                
                // Remover mensagem após alguns segundos
                setTimeout(() => {
                    successMessage.remove();
                }, 5000);
            }, 1500);
        });
    }
    
    // Adicionar classe de animação aos elementos quando ficarem visíveis
    const animatedElements = document.querySelectorAll('.service-card, .benefit-item, .about-content, .testimonial-card');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    animatedElements.forEach(element => {
        observer.observe(element);
    });
    
    // Inicialização do telefone com máscara
    const phoneInput = document.getElementById('phone');
    
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length > 0) {
                // Formato: (00) 00000-0000
                if (value.length <= 2) {
                    value = `(${value}`;
                } else if (value.length <= 7) {
                    value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
                } else if (value.length <= 11) {
                    value = `(${value.substring(0, 2)}) ${value.substring(2, 7)}-${value.substring(7)}`;
                } else {
                    value = `(${value.substring(0, 2)}) ${value.substring(2, 7)}-${value.substring(7, 11)}`;
                }
            }
            
            e.target.value = value;
        });
    }
});