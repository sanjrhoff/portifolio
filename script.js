/**
 * SANDRO // DEV - JAVASCRIPT PRINCIPAL
 * Engenharia de Software & Frontend Craftsmanship
 * 100% Vanilla JS ES6+ | Zero Dependências Externas
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* ==========================================================================
     1. MODAL DE SANDBOX / QUICK VIEW INTERATIVO
     ========================================================================== */
  const modal = document.getElementById('preview-modal');
  const iframe = document.getElementById('preview-iframe');
  const modalTitle = document.getElementById('modal-app-title');
  const modalExternalBtn = document.getElementById('modal-external-btn');
  const modalReloadBtn = document.getElementById('modal-reload-btn');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCloseDot = document.getElementById('modal-close-dot');
  const modalLoader = document.getElementById('modal-loader');
  const previewTriggers = document.querySelectorAll('.preview-trigger-btn');

  let currentAppUrl = '';

  /**
   * Abre a Sandbox com o app selecionado
   * @param {string} url - Caminho relativo do app (ex: ./p_pomodoro/index.html)
   * @param {string} title - Nome amigável do app
   */
  function openSandbox(url, title) {
    if (!url || !modal || !iframe) return;

    currentAppUrl = url;
    
    // Atualiza metadados da janela simulada
    if (modalTitle) modalTitle.textContent = title || url;
    if (modalExternalBtn) modalExternalBtn.href = url;

    // Exibe o spinner de carregamento antes de injetar a URL
    if (modalLoader) modalLoader.classList.remove('hidden');

    // Remove atributo hidden e ativa visibilidade
    modal.removeAttribute('hidden');
    // Força reflow para transição CSS fluida
    void modal.offsetWidth;
    modal.classList.add('is-open');
    document.body.classList.add('no-scroll');

    // Define o source do iframe
    iframe.src = url;

    // Quando o iframe carregar, esconde o spinner
    iframe.onload = () => {
      if (modalLoader) {
        modalLoader.classList.add('hidden');
      }
    };
  }

  /**
   * Fecha a Sandbox e encerra processos do iframe (para áudio/temporizadores)
   */
  function closeSandbox() {
    if (!modal || !iframe) return;

    modal.classList.remove('is-open');
    document.body.classList.remove('no-scroll');

    // Desvincula listener de carregamento para evitar triggers com about:blank
    iframe.onload = null;

    // Aguarda término da animação CSS antes de resetar o iframe
    setTimeout(() => {
      modal.setAttribute('hidden', '');
      // Esvazia o src para parar execuções ativas de áudio ou timers em segundo plano
      iframe.src = 'about:blank';
      if (modalLoader) modalLoader.classList.remove('hidden');
    }, 250);
  }

  /**
   * Recarrega a aplicação em execução no iframe
   */
  function reloadSandbox() {
    if (!iframe || !currentAppUrl) return;
    if (modalLoader) modalLoader.classList.remove('hidden');
    iframe.src = currentAppUrl;
  }

  // Event Listeners dos Triggers de Preview
  previewTriggers.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const url = button.getAttribute('data-app-url');
      const title = button.getAttribute('data-app-title');
      openSandbox(url, title);
    });
  });

  // Ações de fechar
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeSandbox);
  if (modalCloseDot) modalCloseDot.addEventListener('click', closeSandbox);

  // Recarregar
  if (modalReloadBtn) modalReloadBtn.addEventListener('click', reloadSandbox);

  // Fechar ao clicar fora da janela (no backdrop)
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeSandbox();
      }
    });
  }

  // Fechar com a tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) {
      closeSandbox();
    }
  });


  /* ==========================================================================
     2. FILTROS POR CATEGORIA NO LABORATÓRIO / DIRETÓRIO TÉCNICO
     ========================================================================== */
  const filterButtons = document.querySelectorAll('.filter-btn, .filter-pill');
  const labCards = document.querySelectorAll('.lab-card');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedFilter = btn.getAttribute('data-filter') || btn.getAttribute('data-category');

      // Atualiza estado ativo dos botões e ARIA
      filterButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // Filtra os cards
      labCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');

        if (selectedFilter === 'all' || cardCategory === selectedFilter) {
          card.classList.remove('hidden-card');
          // Animação de entrada suave
          card.style.opacity = '0';
          card.style.transform = 'translateY(8px)';
          requestAnimationFrame(() => {
            card.style.transition = 'opacity 250ms ease, transform 250ms ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
            
            // Remove estilos inline após a transição para não conflitar com :hover do CSS
            setTimeout(() => {
              card.style.opacity = '';
              card.style.transform = '';
              card.style.transition = '';
            }, 260);
          });
        } else {
          card.classList.add('hidden-card');
          card.style.opacity = '';
          card.style.transform = '';
          card.style.transition = '';
        }
      });
    });
  });


  /* ==========================================================================
     3. OBSERVER DE SEÇÕES ATIVAS NA NAVEGAÇÃO
     ========================================================================== */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links .nav-link');

  if ('IntersectionObserver' in window && sections.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const currentId = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${currentId}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(section => sectionObserver.observe(section));
  }


  /* ==========================================================================
     4. TELEMETRIA TÉCNICA NO CONSOLE DO DESENVOLVEDOR
     ========================================================================== */
  console.info(
    '%c Sandro // Software Engineer & Physicist Portfolio %c 14 Live Apps • Zero Runtime Deps ',
    'background: #09090b; color: #06b6d4; font-weight: 700; padding: 4px 8px; border: 1px solid #27272a; border-radius: 4px;',
    'background: #10b981; color: #09090b; font-weight: 700; padding: 4px 8px; border-radius: 4px;'
  );
  console.info(
    'Inspecione os módulos em https://github.com/sanjrhoff/portifolio\nProjetos integrados (14):\n' +
    '1. SQL-to-ERD Schema Analyzer (AST Parser, Dynamic Bézier SVG)\n' +
    '2. Zero-Knowledge Secret Vault (Web Crypto API, AES-GCM 256, PBKDF2)\n' +
    '3. Pomodoro Timer Pro (Document PiP API, Web Audio API)\n' +
    '4. Tavern\'s Memory RPG (CSS 3D Engine, Fisher-Yates, Mutex Lock)\n' +
    '5. Markdown Previewer Suite (Marked.js, DOMPurify Anti-XSS, Blob URLs)\n' +
    '6. Markdown Notes App (CRUD LocalStorage, Sortable Drag-and-Drop)\n' +
    '7. Flashcards 3D Study (CSS 3D Flip, Deck Management)\n' +
    '8. Quiz Master Pro (SPA Flow, Timed Scored Engine)\n' +
    '9. Glass Weather App (Glassmorphism, PHP API Proxy Architecture)\n' +
    '10. RayLens Lab (Geometrical Optics, Snell-Descartes & Cauchy Ray Tracing 2D)\n' +
    '11. OrbitN (N-Body Symplectic Verlet Integrator & Relativistic Black Holes)\n' +
    '12. WaveLab 2D (2D Wave Equation FDTD, Young Double Slit & Mach Shockwaves)\n' +
    '13. FieldLorentz (RK4 Electric Streamlines, Boris Lorentz Integrator & Cyclotron)\n' +
    '14. ChaosPendulum (Euler-Lagrange Double Pendulum, 100-Swarm Chaos & Phase Space)'
  );

});
