/**
 * Zero-Knowledge Secret Vault — Motor Criptográfico e Aplicação
 * Baseado estritamente na Web Crypto API nativa (window.crypto.subtle)
 * Desenvolvido em JavaScript puro (Zero Dependências).
 */

(function () {
  'use strict';

  const cryptoAPI = (typeof window !== 'undefined' && window.crypto) ? window.crypto : globalThis.crypto;

  /* ==========================================================================
     1. CAMADA CRIPTOGRÁFICA REAL (WEB CRYPTO API)
     ========================================================================== */
  class CryptoEngine {
    static PBKDF2_ITERATIONS = 100000;
    static KEY_ALGORITHM = 'AES-GCM';
    static KEY_LENGTH = 256;
    static SALT_LENGTH = 16; // 16 bytes (128 bits)
    static IV_LENGTH = 12;   // 12 bytes (96 bits para AES-GCM)

    /**
     * Gera bytes criptograficamente aleatórios.
     */
    static generateRandomBytes(length) {
      const array = new Uint8Array(length);
      cryptoAPI.getRandomValues(array);
      return array;
    }

    /**
     * Converte Uint8Array para string Base64.
     */
    static bufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return (typeof window !== 'undefined' && window.btoa) ? window.btoa(binary) : globalThis.btoa(binary);
    }

    /**
     * Converte string Base64 para Uint8Array.
     */
    static base64ToBuffer(base64) {
      const binary = (typeof window !== 'undefined' && window.atob) ? window.atob(base64) : globalThis.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    /**
     * Deriva uma CryptoKey AES-GCM de 256 bits a partir da Senha Mestra via PBKDF2.
     */
    static async deriveKeyFromPassword(password, salt) {
      const encoder = new TextEncoder();
      const passwordBytes = encoder.encode(password);

      // 1. Importa a senha em texto como material base
      const keyMaterial = await cryptoAPI.subtle.importKey(
        'raw',
        passwordBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      // 2. Deriva chave simétrica AES-GCM 256 bits com 100.000 iterações
      const derivedKey = await cryptoAPI.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: CryptoEngine.PBKDF2_ITERATIONS,
          hash: 'SHA-256'
        },
        keyMaterial,
        {
          name: CryptoEngine.KEY_ALGORITHM,
          length: CryptoEngine.KEY_LENGTH
        },
        false, // Chave não extraível da memória do motor
        ['encrypt', 'decrypt']
      );

      return derivedKey;
    }

    /**
     * Cifra texto em claro usando AES-GCM com IV único de 12 bytes.
     */
    static async encrypt(plainText, key) {
      const encoder = new TextEncoder();
      const data = encoder.encode(plainText);
      const iv = CryptoEngine.generateRandomBytes(CryptoEngine.IV_LENGTH);

      const cipherBuffer = await cryptoAPI.subtle.encrypt(
        {
          name: CryptoEngine.KEY_ALGORITHM,
          iv: iv
        },
        key,
        data
      );

      return {
        iv: CryptoEngine.bufferToBase64(iv),
        ciphertext: CryptoEngine.bufferToBase64(cipherBuffer)
      };
    }

    /**
     * Decifra ciphertext Base64 usando AES-GCM e IV.
     * Rejeita com erro se a chave ou os dados forem inválidos (falha de autenticação GCM).
     */
    static async decrypt(ciphertextBase64, ivBase64, key) {
      const cipherBuffer = CryptoEngine.base64ToBuffer(ciphertextBase64);
      const ivBuffer = CryptoEngine.base64ToBuffer(ivBase64);

      const decryptedBuffer = await cryptoAPI.subtle.decrypt(
        {
          name: CryptoEngine.KEY_ALGORITHM,
          iv: ivBuffer
        },
        key,
        cipherBuffer
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    }
  }

  /* ==========================================================================
     2. GERADOR CRIPTOGRÁFICO DE SENHAS & MEDIDOR DE ENTROPIA
     ========================================================================== */
  class PasswordEngine {
    static CHARSETS = {
      lower: 'abcdefghijklmnopqrstuvwxyz',
      upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      digits: '0123456789',
      symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };

    static AMBIGUOUS = /[0Ol1I]/;

    static generate(options = {}) {
      const {
        length = 24,
        upper = true,
        lower = true,
        digits = true,
        symbols = true,
        avoidAmbiguous = false
      } = options;

      let pool = '';
      if (lower) pool += PasswordEngine.CHARSETS.lower;
      if (upper) pool += PasswordEngine.CHARSETS.upper;
      if (digits) pool += PasswordEngine.CHARSETS.digits;
      if (symbols) pool += PasswordEngine.CHARSETS.symbols;

      if (!pool) pool = PasswordEngine.CHARSETS.lower + PasswordEngine.CHARSETS.digits;

      if (avoidAmbiguous) {
        pool = pool.split('').filter(c => !PasswordEngine.AMBIGUOUS.test(c)).join('');
      }

      // Geração com crypto.getRandomValues para evitar o determinismo do Math.random
      const randomValues = new Uint32Array(length);
      cryptoAPI.getRandomValues(randomValues);

      let result = '';
      const poolLen = pool.length;
      for (let i = 0; i < length; i++) {
        result += pool[randomValues[i] % poolLen];
      }

      return result;
    }

    /**
     * Calcula entropia matemática em bits: E = L * log2(R)
     */
    static calculateEntropy(password) {
      if (!password) return { bits: 0, poolSize: 0, verdict: 'Insuficiente', level: 0, timeEstimate: '0 segundos' };

      const length = password.length;
      let poolSize = 0;

      if (/[a-z]/.test(password)) poolSize += 26;
      if (/[A-Z]/.test(password)) poolSize += 26;
      if (/[0-9]/.test(password)) poolSize += 10;
      if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

      if (poolSize === 0) poolSize = 1;

      const bits = Math.round(length * (Math.log2(poolSize) * 10)) / 10;

      let verdict = 'Insuficiente';
      let level = 0;
      let timeEstimate = 'Poucos segundos';

      if (bits < 40) {
        verdict = 'Muito Fraca (Risco Crítico)';
        level = 0;
        timeEstimate = 'Instantes (< 1 segundo)';
      } else if (bits < 60) {
        verdict = 'Fraca';
        level = 1;
        timeEstimate = 'Alguns minutos a horas';
      } else if (bits < 80) {
        verdict = 'Boa / Moderada';
        level = 2;
        timeEstimate = 'Vários meses';
      } else if (bits < 120) {
        verdict = 'Muito Forte';
        level = 3;
        timeEstimate = 'Milhares de anos';
      } else {
        verdict = 'Nível Militar / Inquebrável';
        level = 4;
        timeEstimate = '> 14 trilhões de anos (Força Bruta GPU)';
      }

      return { bits, poolSize, verdict, level, timeEstimate };
    }

    /**
     * Formata string de senha com spans coloridos para sintaxe visual.
     */
    static formatColored(password) {
      return password.split('').map(char => {
        if (/[a-z]/.test(char)) return `<span class="char-lower">${char}</span>`;
        if (/[A-Z]/.test(char)) return `<span class="char-upper">${char}</span>`;
        if (/[0-9]/.test(char)) return `<span class="char-digit">${char}</span>`;
        return `<span class="char-symbol">${char}</span>`;
      }).join('');
    }
  }

  /* ==========================================================================
     3. GERENCIADOR PRINCIPAL DO COFRE (VAULT APPLICATION)
     ========================================================================== */
  class VaultApp {
    static STORAGE_KEY = 'zk_secret_vault_v1';
    static DEFAULT_LOCK_TIMEOUT_SEC = 300; // 5 minutos

    constructor() {
      // Estado em Memória Volátil (RAM-Only)
      this.state = {
        isUnlocked: false,
        activeKey: null,
        activeSaltBase64: null,
        credentials: [],
        filteredCredentials: [],
        activeCategory: 'all',
        searchQuery: '',
        autoLockRemainingSec: VaultApp.DEFAULT_LOCK_TIMEOUT_SEC,
        autoLockInterval: null,
        clipboardClearTimeout: null,
        generatorCallback: null
      };

      // Elementos do DOM
      this.dom = {
        headerStatusBar: document.getElementById('header-status-bar'),
        autolockText: document.getElementById('autolock-timer-text'),
        autolockIndicator: document.getElementById('autolock-indicator'),
        btnLockNow: document.getElementById('btn-lock-now'),
        btnBackupToggle: document.getElementById('btn-backup-toggle'),
        backupMenu: document.getElementById('backup-dropdown-menu'),
        btnExportVault: document.getElementById('btn-menu-export-vault'),
        inputImportVault: document.getElementById('input-import-vault'),
        inputImportVaultSetup: document.getElementById('input-import-vault-setup'),
        btnResetVault: document.getElementById('btn-menu-reset-vault'),
        screenSetup: document.getElementById('screen-setup'),
        screenLock: document.getElementById('screen-lock'),
        screenDashboard: document.getElementById('screen-dashboard'),
        formSetup: document.getElementById('form-setup-vault'),
        setupPassword: document.getElementById('setup-password'),
        setupPasswordConfirm: document.getElementById('setup-password-confirm'),
        setupEntropyBar: document.getElementById('setup-entropy-bar'),
        setupEntropyText: document.getElementById('setup-entropy-text'),
        formUnlock: document.getElementById('form-unlock-vault'),
        unlockPassword: document.getElementById('unlock-password'),
        unlockErrorMsg: document.getElementById('unlock-error-msg'),
        lockCardBox: document.getElementById('lock-card-box'),
        btnUnlockSubmit: document.getElementById('btn-unlock-submit'),
        btnUnlockText: document.getElementById('btn-unlock-text'),
        searchInput: document.getElementById('vault-search-input'),
        btnClearSearch: document.getElementById('btn-clear-vault-search'),
        categoryFilters: document.getElementById('category-filters'),
        btnAddCredential: document.getElementById('btn-add-credential'),
        btnEmptyAddCred: document.getElementById('btn-empty-add-cred'),
        credentialsGrid: document.getElementById('credentials-grid'),
        emptyState: document.getElementById('empty-credentials-state'),
        emptyStateText: document.getElementById('empty-state-text'),
        modalCredBackdrop: document.getElementById('modal-credential-backdrop'),
        modalCredTitle: document.getElementById('modal-cred-title'),
        formCred: document.getElementById('form-credential'),
        credId: document.getElementById('cred-id'),
        credName: document.getElementById('cred-name'),
        credCategory: document.getElementById('cred-category'),
        credUsername: document.getElementById('cred-username'),
        credUrl: document.getElementById('cred-url'),
        credSecret: document.getElementById('cred-secret'),
        credNotes: document.getElementById('cred-notes'),
        credEntropyBar: document.getElementById('cred-entropy-bar'),
        credEntropyText: document.getElementById('cred-entropy-text'),
        btnCloseCredModal: document.getElementById('btn-close-cred-modal'),
        btnCancelCred: document.getElementById('btn-cancel-cred'),
        btnInlineGenPwd: document.getElementById('btn-inline-generate-pwd'),
        modalGenBackdrop: document.getElementById('modal-generator-backdrop'),
        btnOpenGenModal: document.getElementById('btn-open-generator-modal'),
        btnCloseGenModal: document.getElementById('btn-close-gen-modal'),
        btnCloseGenBtn: document.getElementById('btn-close-gen-btn'),
        btnApplyGenPwd: document.getElementById('btn-apply-gen-pwd'),
        genPasswordDisplay: document.getElementById('gen-password-display'),
        btnRegenPwd: document.getElementById('btn-regen-pwd'),
        btnCopyGenPwd: document.getElementById('btn-copy-gen-pwd'),
        genBitsVal: document.getElementById('gen-bits-val'),
        genVerdictBadge: document.getElementById('gen-verdict-badge'),
        genTimeEstimate: document.getElementById('gen-time-estimate'),
        genEntropyFill: document.getElementById('gen-entropy-fill'),
        genLengthSlider: document.getElementById('gen-length-slider'),
        genLengthVal: document.getElementById('gen-length-val'),
        genOptUpper: document.getElementById('gen-opt-upper'),
        genOptLower: document.getElementById('gen-opt-lower'),
        genOptDigits: document.getElementById('gen-opt-digits'),
        genOptSymbols: document.getElementById('gen-opt-symbols'),
        genOptAvoidAmbiguous: document.getElementById('gen-opt-avoid-ambiguous'),
        toastContainer: document.getElementById('toast-container')
      };

      this.init();
    }

    init() {
      this.bindPasswordToggles();
      this.bindSetupEvents();
      this.bindLockEvents();
      this.bindDashboardEvents();
      this.bindCredentialModalEvents();
      this.bindGeneratorEvents();
      this.bindBackupEvents();
      this.bindActivityListeners();

      // Checa se já existe cofre persistido
      this.checkInitialVaultState();
    }

    /* ------------------------------------------------------------------------
       Ciclo de Vida e Inicialização do Cofre
       ------------------------------------------------------------------------ */
    checkInitialVaultState() {
      const stored = localStorage.getItem(VaultApp.STORAGE_KEY);
      if (!stored) {
        this.showScreen('setup');
      } else {
        this.showScreen('lock');
      }
    }

    showScreen(screenName) {
      this.dom.screenSetup.style.display = (screenName === 'setup') ? 'flex' : 'none';
      this.dom.screenLock.style.display = (screenName === 'lock') ? 'flex' : 'none';
      this.dom.screenDashboard.style.display = (screenName === 'dashboard') ? 'flex' : 'none';

      // Header visibility
      const isDashboard = (screenName === 'dashboard');
      this.dom.headerStatusBar.style.display = isDashboard ? 'flex' : 'none';
      this.dom.btnLockNow.style.display = isDashboard ? 'inline-flex' : 'none';

      if (screenName === 'lock') {
        this.dom.unlockPassword.value = '';
        this.dom.unlockErrorMsg.style.display = 'none';
        setTimeout(() => this.dom.unlockPassword.focus(), 100);
      } else if (screenName === 'setup') {
        this.dom.setupPassword.value = '';
        this.dom.setupPasswordConfirm.value = '';
        this.updateEntropyDisplay('', this.dom.setupEntropyBar, this.dom.setupEntropyText);
      }
    }

    bindPasswordToggles() {
      document.querySelectorAll('.btn-toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-target');
          const input = document.getElementById(targetId);
          if (!input) return;

          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          btn.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
        });
      });
    }

    /* ------------------------------------------------------------------------
       Estado 1: Criação do Cofre (Setup Wizard)
       ------------------------------------------------------------------------ */
    bindSetupEvents() {
      this.dom.setupPassword.addEventListener('input', () => {
        const pwd = this.dom.setupPassword.value;
        this.updateEntropyDisplay(pwd, this.dom.setupEntropyBar, this.dom.setupEntropyText);
      });

      this.dom.formSetup.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwd = this.dom.setupPassword.value;
        const confirm = this.dom.setupPasswordConfirm.value;

        if (pwd.length < 8) {
          this.showToast('A senha mestra deve ter no mínimo 8 caracteres.', 'error');
          return;
        }

        if (pwd !== confirm) {
          this.showToast('As senhas digitadas não coincidem.', 'error');
          return;
        }

        try {
          await this.createInitialVault(pwd);
          this.showToast('Cofre criptografado com sucesso!', 'success');
        } catch (err) {
          console.error(err);
          this.showToast('Falha ao inicializar Web Crypto API.', 'error');
        }
      });

      if (this.dom.inputImportVaultSetup) {
        this.dom.inputImportVaultSetup.addEventListener('change', (e) => {
          this.handleBackupFileUpload(e.target.files[0]);
        });
      }
    }

    updateEntropyDisplay(password, barEl, textEl) {
      const stats = PasswordEngine.calculateEntropy(password);
      barEl.className = `entropy-fill level-${stats.level}`;
      textEl.textContent = `${stats.bits} bits • ${stats.verdict}`;
    }

    async createInitialVault(masterPassword) {
      // 1. Gera salt criptográfico aleatório de 16 bytes
      const salt = CryptoEngine.generateRandomBytes(CryptoEngine.SALT_LENGTH);

      // 2. Deriva a CryptoKey simétrica via PBKDF2
      const key = await CryptoEngine.deriveKeyFromPassword(masterPassword, salt);

      // 3. Cria conjunto demonstrativo inicial realista
      const initialCreds = [
        {
          id: 'cred_' + Date.now() + '_1',
          name: 'AWS Cloud Production',
          category: 'api',
          username: 'arn:aws:iam::8942183921:user/sandro-prod',
          secret: 'AKIA' + PasswordEngine.generate({ length: 16, upper: true, lower: false, symbols: false }),
          url: 'https://aws.amazon.com/console',
          notes: 'Chave de deployment no bucket S3 e CloudFront.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'cred_' + Date.now() + '_2',
          name: 'GitHub CI/CD Automation Token',
          category: 'api',
          username: 'sanjrhoff',
          secret: 'ghp_' + PasswordEngine.generate({ length: 36, symbols: false }),
          url: 'https://github.com/settings/tokens',
          notes: 'Token com escopos repo, workflow e write:packages.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'cred_' + Date.now() + '_3',
          name: 'PostgreSQL Master Cluster (Internal)',
          category: 'server',
          username: 'postgres_admin',
          secret: PasswordEngine.generate({ length: 28, avoidAmbiguous: true }),
          url: '10.0.4.15:5432/production_db',
          notes: 'Cluster primário em zona isolada VPC.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      // 4. Cifra com AES-GCM
      const encrypted = await CryptoEngine.encrypt(JSON.stringify(initialCreds), key);

      // 5. Persiste blob estritamente criptografado
      const vaultPayload = {
        version: 1,
        algorithm: 'PBKDF2-100K-AES-GCM-256',
        salt: CryptoEngine.bufferToBase64(salt),
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(VaultApp.STORAGE_KEY, JSON.stringify(vaultPayload));

      // 6. Configura estado volátil em RAM
      this.state.activeKey = key;
      this.state.activeSaltBase64 = vaultPayload.salt;
      this.state.credentials = initialCreds;
      this.state.isUnlocked = true;

      this.startAutoLockTimer();
      this.showScreen('dashboard');
      this.renderCredentials();
    }

    /* ------------------------------------------------------------------------
       Estado 2: Desbloqueio (Lock Screen)
       ------------------------------------------------------------------------ */
    bindLockEvents() {
      this.dom.formUnlock.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwd = this.dom.unlockPassword.value;
        if (!pwd) return;

        this.dom.btnUnlockSubmit.disabled = true;
        this.dom.btnUnlockText.textContent = 'Decifrando (PBKDF2 100k)...';

        try {
          const success = await this.unlockVault(pwd);
          if (!success) {
            this.handleUnlockFailure();
          }
        } catch (err) {
          console.error(err);
          this.handleUnlockFailure();
        } finally {
          this.dom.btnUnlockSubmit.disabled = false;
          this.dom.btnUnlockText.textContent = 'Desbloquear Cofre';
        }
      });
    }

    async unlockVault(masterPassword) {
      const rawStored = localStorage.getItem(VaultApp.STORAGE_KEY);
      if (!rawStored) return false;

      const payload = JSON.parse(rawStored);
      const salt = CryptoEngine.base64ToBuffer(payload.salt);

      // 1. Deriva a chave usando PBKDF2 com o salt gravado
      const key = await CryptoEngine.deriveKeyFromPassword(masterPassword, salt);

      // 2. Tenta decifrar o ciphertext com AES-GCM
      try {
        const decryptedJson = await CryptoEngine.decrypt(payload.ciphertext, payload.iv, key);
        const credentials = JSON.parse(decryptedJson);

        // Sucesso: credenciais decodificadas em RAM
        this.state.activeKey = key;
        this.state.activeSaltBase64 = payload.salt;
        this.state.credentials = credentials;
        this.state.isUnlocked = true;

        this.startAutoLockTimer();
        this.showScreen('dashboard');
        this.renderCredentials();
        this.showToast('Cofre desbloqueado com sucesso.', 'success');
        return true;
      } catch (err) {
        // Falha no AES-GCM: senha incorreta ou tag de autenticação corrompida
        return false;
      }
    }

    handleUnlockFailure() {
      this.dom.unlockErrorMsg.style.display = 'flex';
      this.dom.lockCardBox.classList.remove('shake-animation');
      void this.dom.lockCardBox.offsetWidth; // Força reflow
      this.dom.lockCardBox.classList.add('shake-animation');
      this.dom.unlockPassword.select();
      this.dom.unlockPassword.focus();
    }

    lockVault() {
      // Isolamento estrito de memória: descarta credenciais e chave da RAM
      this.state.isUnlocked = false;
      this.state.activeKey = null;
      this.state.credentials = [];
      this.state.filteredCredentials = [];

      if (this.state.autoLockInterval) {
        clearInterval(this.state.autoLockInterval);
        this.state.autoLockInterval = null;
      }

      this.closeAllModals();
      this.showScreen('lock');
      this.showToast('Cofre trancado. Memória RAM descartada.', 'info');
    }

    /* ------------------------------------------------------------------------
       Temporizador de Inatividade (Auto-Lock)
       ------------------------------------------------------------------------ */
    bindActivityListeners() {
      const resetActivity = () => {
        if (this.state.isUnlocked) {
          this.state.autoLockRemainingSec = VaultApp.DEFAULT_LOCK_TIMEOUT_SEC;
          this.updateAutoLockDisplay();
        }
      };

      window.addEventListener('mousemove', resetActivity, { passive: true });
      window.addEventListener('mousedown', resetActivity, { passive: true });
      window.addEventListener('keydown', resetActivity, { passive: true });
      window.addEventListener('touchstart', resetActivity, { passive: true });
      window.addEventListener('scroll', resetActivity, { passive: true });

      if (this.dom.autolockIndicator) {
        this.dom.autolockIndicator.addEventListener('click', () => {
          resetActivity();
          this.showToast('Tempo de inatividade reiniciado para 5 minutos.', 'info');
        });
      }
    }

    startAutoLockTimer() {
      this.state.autoLockRemainingSec = VaultApp.DEFAULT_LOCK_TIMEOUT_SEC;
      this.updateAutoLockDisplay();

      if (this.state.autoLockInterval) clearInterval(this.state.autoLockInterval);

      this.state.autoLockInterval = setInterval(() => {
        if (!this.state.isUnlocked) return;

        this.state.autoLockRemainingSec--;
        this.updateAutoLockDisplay();

        if (this.state.autoLockRemainingSec <= 0) {
          this.lockVault();
        }
      }, 1000);
    }

    updateAutoLockDisplay() {
      const sec = Math.max(0, this.state.autoLockRemainingSec);
      const m = Math.floor(sec / 60).toString().padStart(2, '0');
      const s = (sec % 60).toString().padStart(2, '0');
      this.dom.autolockText.textContent = `${m}:${s}`;
    }

    /* ------------------------------------------------------------------------
       Dashboard & Gestão de Credenciais
       ------------------------------------------------------------------------ */
    bindDashboardEvents() {
      this.dom.btnLockNow.addEventListener('click', () => this.lockVault());

      // Busca em tempo real
      this.dom.searchInput.addEventListener('input', () => {
        this.state.searchQuery = this.dom.searchInput.value.trim().toLowerCase();
        this.dom.btnClearSearch.style.display = this.state.searchQuery ? 'block' : 'none';
        this.renderCredentials();
      });

      this.dom.btnClearSearch.addEventListener('click', () => {
        this.dom.searchInput.value = '';
        this.state.searchQuery = '';
        this.dom.btnClearSearch.style.display = 'none';
        this.renderCredentials();
        this.dom.searchInput.focus();
      });

      // Filtros por Categoria
      this.dom.categoryFilters.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.dom.categoryFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.state.activeCategory = btn.getAttribute('data-category');
          this.renderCredentials();
        });
      });

      this.dom.btnAddCredential.addEventListener('click', () => this.openCredentialModal());
      if (this.dom.btnEmptyAddCred) {
        this.dom.btnEmptyAddCred.addEventListener('click', () => this.openCredentialModal());
      }
    }

    renderCredentials() {
      const grid = this.dom.credentialsGrid;
      grid.innerHTML = '';

      // Atualizar contadores
      const counts = { all: this.state.credentials.length, login: 0, api: 0, server: 0, note: 0 };
      this.state.credentials.forEach(c => {
        if (counts[c.category] !== undefined) counts[c.category]++;
      });

      document.getElementById('count-all').textContent = counts.all;
      document.getElementById('count-login').textContent = counts.login;
      document.getElementById('count-api').textContent = counts.api;
      document.getElementById('count-server').textContent = counts.server;
      document.getElementById('count-note').textContent = counts.note;

      // Filtragem
      let filtered = this.state.credentials.filter(c => {
        const matchesCategory = (this.state.activeCategory === 'all') || (c.category === this.state.activeCategory);
        if (!matchesCategory) return false;

        if (this.state.searchQuery) {
          const q = this.state.searchQuery;
          const matchName = (c.name || '').toLowerCase().includes(q);
          const matchUser = (c.username || '').toLowerCase().includes(q);
          const matchUrl = (c.url || '').toLowerCase().includes(q);
          const matchNotes = (c.notes || '').toLowerCase().includes(q);
          return matchName || matchUser || matchUrl || matchNotes;
        }

        return true;
      });

      this.state.filteredCredentials = filtered;

      if (filtered.length === 0) {
        this.dom.emptyState.style.display = 'flex';
        this.dom.emptyStateText.textContent = this.state.credentials.length === 0
          ? 'Seu bunker está vazio. Cadastre uma nova credencial para proteger com AES-GCM 256.'
          : 'Nenhum resultado corresponde à busca ou categoria selecionada.';
        return;
      }

      this.dom.emptyState.style.display = 'none';

      filtered.forEach(cred => {
        const card = this.createCredentialCardElement(cred);
        grid.appendChild(card);
      });
    }

    createCredentialCardElement(cred) {
      const card = document.createElement('div');
      card.className = 'secret-card';
      card.setAttribute('data-id', cred.id);

      const catIcons = {
        login: 'fa-user-lock',
        api: 'fa-key',
        server: 'fa-server',
        note: 'fa-sticky-note'
      };

      const catLabels = {
        login: 'Login / Web',
        api: 'API Key / Token',
        server: 'Servidor / Cluster',
        note: 'Nota Confidencial'
      };

      const iconClass = catIcons[cred.category] || 'fa-lock';
      const labelText = catLabels[cred.category] || 'Segredo';

      let userRowHtml = '';
      if (cred.username) {
        userRowHtml = `
          <div class="card-data-field">
            <div class="field-label-value">
              <span class="field-label">Usuário / ID</span>
              <span class="field-value font-mono" title="${cred.username}">${cred.username}</span>
            </div>
            <div class="field-buttons">
              <button class="field-copy-btn btn-copy-user" title="Copiar Usuário">
                <i class="fas fa-copy"></i>
              </button>
            </div>
          </div>
        `;
      }

      let secretRowHtml = `
        <div class="card-data-field">
          <div class="field-label-value">
            <span class="field-label">Segredo Cifrado</span>
            <span class="field-value font-mono masked-secret" id="secret-val-${cred.id}">••••••••••••</span>
          </div>
          <div class="field-buttons">
            <button class="field-reveal-btn btn-toggle-secret" title="Revelar / Ocultar">
              <i class="fas fa-eye"></i>
            </button>
            <button class="field-copy-btn btn-copy-secret" title="Copiar Senha Segura">
              <i class="fas fa-copy"></i>
            </button>
          </div>
        </div>
      `;

      let urlRowHtml = '';
      if (cred.url) {
        const isHttp = cred.url.startsWith('http://') || cred.url.startsWith('https://');
        if (isHttp) {
          urlRowHtml = `
            <a href="${cred.url}" target="_blank" rel="noopener noreferrer" class="card-host-link font-mono">
              <i class="fas fa-external-link-alt"></i> ${cred.url}
            </a>
          `;
        } else {
          urlRowHtml = `
            <div class="card-host-link font-mono" title="Endpoint / Host do serviço">
              <i class="fas fa-network-wired"></i> ${cred.url}
            </div>
          `;
        }
      }

      let notesRowHtml = '';
      if (cred.notes) {
        notesRowHtml = `<div class="card-notes-preview font-mono">${cred.notes}</div>`;
      }

      card.innerHTML = `
        <div class="secret-card-header">
          <div class="card-title-group">
            <div class="cat-icon-badge cat-badge-${cred.category}">
              <i class="fas ${iconClass}"></i>
            </div>
            <div class="card-name-wrap">
              <h4 class="card-service-title" title="${cred.name}">${cred.name}</h4>
              <span class="card-cat-label">${labelText}</span>
            </div>
          </div>
          <div class="card-actions-menu">
            <button class="card-btn-action btn-edit-cred" title="Editar Credencial">
              <i class="fas fa-pen"></i>
            </button>
            <button class="card-btn-action btn-delete btn-delete-cred" title="Excluir Credencial">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>

        ${userRowHtml}
        ${secretRowHtml}
        ${urlRowHtml}
        ${notesRowHtml}
      `;

      // Eventos dos botões do card
      const secretValEl = card.querySelector(`#secret-val-${cred.id}`);
      let isRevealed = false;

      const toggleBtn = card.querySelector('.btn-toggle-secret');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
          isRevealed = !isRevealed;
          if (isRevealed) {
            secretValEl.textContent = cred.secret;
            secretValEl.classList.remove('masked-secret');
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
          } else {
            secretValEl.textContent = '••••••••••••';
            secretValEl.classList.add('masked-secret');
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
          }
        });
      }

      const copySecretBtn = card.querySelector('.btn-copy-secret');
      if (copySecretBtn) {
        copySecretBtn.addEventListener('click', () => {
          this.copyToClipboardWithAutoClear(cred.secret, 'Senha copiada com sucesso!');
        });
      }

      const copyUserBtn = card.querySelector('.btn-copy-user');
      if (copyUserBtn) {
        copyUserBtn.addEventListener('click', () => {
          this.copyToClipboard(cred.username, 'Usuário copiado!');
        });
      }

      const editBtn = card.querySelector('.btn-edit-cred');
      if (editBtn) {
        editBtn.addEventListener('click', () => this.openCredentialModal(cred));
      }

      const deleteBtn = card.querySelector('.btn-delete-cred');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => this.deleteCredential(cred.id));
      }

      return card;
    }

    /* ------------------------------------------------------------------------
       Área de Transferência com Auto-Clear de Segurança (15s)
       ------------------------------------------------------------------------ */
    copyToClipboard(text, message) {
      if (!text) return;
      navigator.clipboard.writeText(text)
        .then(() => this.showToast(message, 'info'))
        .catch(() => this.showToast('Falha ao acessar área de transferência.', 'error'));
    }

    copyToClipboardWithAutoClear(text, message) {
      if (!text) return;

      navigator.clipboard.writeText(text).then(() => {
        this.showToast(`${message} Limpando clipboard em 15 segundos.`, 'success');

        if (this.state.clipboardClearTimeout) {
          clearTimeout(this.state.clipboardClearTimeout);
        }

        this.state.clipboardClearTimeout = setTimeout(() => {
          navigator.clipboard.writeText('')
            .then(() => this.showToast('Área de transferência limpa por segurança.', 'info'))
            .catch(() => {});
        }, 15000);
      }).catch(() => {
        this.showToast('Falha ao copiar segredo.', 'error');
      });
    }

    /* ------------------------------------------------------------------------
       Modal de Credencial (Adicionar / Editar)
       ------------------------------------------------------------------------ */
    bindCredentialModalEvents() {
      this.dom.btnCloseCredModal.addEventListener('click', () => this.closeCredentialModal());
      this.dom.btnCancelCred.addEventListener('click', () => this.closeCredentialModal());

      this.dom.credSecret.addEventListener('input', () => {
        const val = this.dom.credSecret.value;
        this.updateEntropyDisplay(val, this.dom.credEntropyBar, this.dom.credEntropyText);
      });

      this.dom.btnInlineGenPwd.addEventListener('click', () => {
        this.openGeneratorModal((newPassword) => {
          this.dom.credSecret.value = newPassword;
          this.dom.credSecret.type = 'text';
          this.updateEntropyDisplay(newPassword, this.dom.credEntropyBar, this.dom.credEntropyText);
          this.showToast('Senha gerada aplicada no formulário.', 'success');
        });
      });

      this.dom.formCred.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.saveCredentialForm();
      });
    }

    openCredentialModal(cred = null) {
      if (cred) {
        this.dom.modalCredTitle.textContent = 'Editar Credencial Segura';
        this.dom.credId.value = cred.id;
        this.dom.credName.value = cred.name;
        this.dom.credCategory.value = cred.category;
        this.dom.credUsername.value = cred.username || '';
        this.dom.credUrl.value = cred.url || '';
        this.dom.credSecret.value = cred.secret;
        this.dom.credNotes.value = cred.notes || '';
      } else {
        this.dom.modalCredTitle.textContent = 'Nova Credencial Segura';
        this.dom.credId.value = '';
        this.dom.credName.value = '';
        this.dom.credCategory.value = 'login';
        this.dom.credUsername.value = '';
        this.dom.credUrl.value = '';
        this.dom.credSecret.value = '';
        this.dom.credNotes.value = '';
      }

      this.dom.credSecret.type = 'password';
      this.updateEntropyDisplay(this.dom.credSecret.value, this.dom.credEntropyBar, this.dom.credEntropyText);
      this.dom.modalCredBackdrop.style.display = 'flex';
      this.dom.credName.focus();
    }

    closeCredentialModal() {
      this.dom.modalCredBackdrop.style.display = 'none';
    }

    async saveCredentialForm() {
      const id = this.dom.credId.value;
      const name = this.dom.credName.value.trim();
      const category = this.dom.credCategory.value;
      const username = this.dom.credUsername.value.trim();
      const url = this.dom.credUrl.value.trim();
      const secret = this.dom.credSecret.value;
      const notes = this.dom.credNotes.value.trim();

      if (!name || !secret) {
        this.showToast('Título e Segredo são obrigatórios.', 'error');
        return;
      }

      if (id) {
        // Atualização
        const index = this.state.credentials.findIndex(c => c.id === id);
        if (index !== -1) {
          this.state.credentials[index] = {
            ...this.state.credentials[index],
            name,
            category,
            username,
            url,
            secret,
            notes,
            updatedAt: new Date().toISOString()
          };
        }
      } else {
        // Nova inserção
        const newCred = {
          id: 'cred_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          name,
          category,
          username,
          url,
          secret,
          notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.state.credentials.unshift(newCred);
      }

      await this.persistVault();
      this.closeCredentialModal();
      this.renderCredentials();
      this.showToast('Segredo salvo e criptografado com sucesso!', 'success');
    }

    async deleteCredential(id) {
      if (!confirm('Deseja realmente apagar esta credencial permanentemente?')) return;

      this.state.credentials = this.state.credentials.filter(c => c.id !== id);
      await this.persistVault();
      this.renderCredentials();
      this.showToast('Credencial excluída com sucesso.', 'info');
    }

    async persistVault() {
      if (!this.state.activeKey || !this.state.activeSaltBase64) return;

      // Cifra todo o repositório de credenciais atualizado com IV único
      const encrypted = await CryptoEngine.encrypt(
        JSON.stringify(this.state.credentials),
        this.state.activeKey
      );

      const payload = {
        version: 1,
        algorithm: 'PBKDF2-100K-AES-GCM-256',
        salt: this.state.activeSaltBase64,
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(VaultApp.STORAGE_KEY, JSON.stringify(payload));
    }

    /* ------------------------------------------------------------------------
       Modal do Gerador de Senhas
       ------------------------------------------------------------------------ */
    bindGeneratorEvents() {
      this.dom.btnOpenGenModal.addEventListener('click', () => {
        this.openGeneratorModal();
      });

      this.dom.btnCloseGenModal.addEventListener('click', () => this.closeGeneratorModal());
      this.dom.btnCloseGenBtn.addEventListener('click', () => this.closeGeneratorModal());

      this.dom.genLengthSlider.addEventListener('input', () => {
        this.dom.genLengthVal.textContent = this.dom.genLengthSlider.value;
        this.refreshGeneratedPassword();
      });

      [
        this.dom.genOptUpper,
        this.dom.genOptLower,
        this.dom.genOptDigits,
        this.dom.genOptSymbols,
        this.dom.genOptAvoidAmbiguous
      ].forEach(el => el.addEventListener('change', () => this.refreshGeneratedPassword()));

      this.dom.btnRegenPwd.addEventListener('click', () => this.refreshGeneratedPassword());

      this.dom.btnCopyGenPwd.addEventListener('click', () => {
        const pwd = this.currentGeneratedPassword;
        if (pwd) {
          this.copyToClipboardWithAutoClear(pwd, 'Senha segura copiada!');
        }
      });

      this.dom.btnApplyGenPwd.addEventListener('click', () => {
        if (this.state.generatorCallback && this.currentGeneratedPassword) {
          this.state.generatorCallback(this.currentGeneratedPassword);
          this.closeGeneratorModal();
        }
      });
    }

    openGeneratorModal(callback = null) {
      this.state.generatorCallback = callback;
      this.dom.btnApplyGenPwd.style.display = callback ? 'inline-flex' : 'none';
      this.refreshGeneratedPassword();
      this.dom.modalGenBackdrop.style.display = 'flex';
    }

    closeGeneratorModal() {
      this.dom.modalGenBackdrop.style.display = 'none';
      this.state.generatorCallback = null;
    }

    refreshGeneratedPassword() {
      const length = parseInt(this.dom.genLengthSlider.value, 10);
      const upper = this.dom.genOptUpper.checked;
      const lower = this.dom.genOptLower.checked;
      const digits = this.dom.genOptDigits.checked;
      const symbols = this.dom.genOptSymbols.checked;
      const avoidAmbiguous = this.dom.genOptAvoidAmbiguous.checked;

      const pwd = PasswordEngine.generate({ length, upper, lower, digits, symbols, avoidAmbiguous });
      this.currentGeneratedPassword = pwd;

      // Render com sintaxe colorida
      this.dom.genPasswordDisplay.innerHTML = PasswordEngine.formatColored(pwd);

      // Atualizar estatísticas de entropia
      const entropy = PasswordEngine.calculateEntropy(pwd);
      this.dom.genBitsVal.textContent = `${entropy.bits} bits`;
      this.dom.genVerdictBadge.textContent = entropy.verdict;
      this.dom.genVerdictBadge.className = `entropy-verdict-badge level-${entropy.level === 4 ? 'military' : (entropy.level === 3 ? 'strong' : (entropy.level === 2 ? 'good' : (entropy.level === 1 ? 'weak' : 'critical')))}`;
      this.dom.genTimeEstimate.innerHTML = `<i class="fas fa-bolt text-amber"></i> Tempo de quebra: ${entropy.timeEstimate}`;

      const fillPct = Math.min(100, Math.max(10, Math.round((entropy.bits / 128) * 100)));
      this.dom.genEntropyFill.style.width = `${fillPct}%`;
      this.dom.genEntropyFill.className = `entropy-fill level-${entropy.level === 4 ? 'military' : entropy.level}`;
    }

    /* ------------------------------------------------------------------------
       Backup & Restauração de Arquivos (.vault)
       ------------------------------------------------------------------------ */
    bindBackupEvents() {
      this.dom.btnBackupToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const container = this.dom.btnBackupToggle.closest('.dropdown-container');
        container.classList.toggle('is-open');
      });

      document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-container').forEach(c => c.classList.remove('is-open'));
      });

      this.dom.btnExportVault.addEventListener('click', () => this.exportVaultFile());

      this.dom.inputImportVault.addEventListener('change', (e) => {
        this.handleBackupFileUpload(e.target.files[0]);
      });

      this.dom.btnResetVault.addEventListener('click', () => this.resetVault());
    }

    exportVaultFile() {
      const stored = localStorage.getItem(VaultApp.STORAGE_KEY);
      if (!stored) {
        this.showToast('Nenhum cofre existente para exportar.', 'error');
        return;
      }

      const blob = new Blob([stored], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zk-vault-backup-${new Date().toISOString().slice(0, 10)}.vault`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast('Arquivo de backup (.vault) exportado com sucesso!', 'success');
      document.querySelectorAll('.dropdown-container').forEach(c => c.classList.remove('is-open'));
    }

    handleBackupFileUpload(file) {
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = JSON.parse(e.target.result);

          if (!content.salt || !content.iv || !content.ciphertext) {
            throw new Error('Formato de backup inválido.');
          }

          if (confirm('Deseja restaurar este arquivo de backup? Os dados locais serão substituídos.')) {
            localStorage.setItem(VaultApp.STORAGE_KEY, JSON.stringify(content));
            this.lockVault();
            this.showToast('Backup carregado! Digite a senha mestra correspondente para abrir.', 'info');
          }
        } catch (err) {
          console.error(err);
          this.showToast('Arquivo inválido ou corrompido.', 'error');
        }
      };

      reader.readAsText(file);
    }

    resetVault() {
      if (confirm('ATENÇÃO: Você tem certeza que deseja APAGAR este cofre deste navegador? Se não possuir um backup (.vault), todos os segredos serão perdidos.')) {
        if (confirm('Confirmação final: Deseja realmente zerar todos os dados?')) {
          localStorage.removeItem(VaultApp.STORAGE_KEY);
          this.state.isUnlocked = false;
          this.state.activeKey = null;
          this.state.credentials = [];
          this.showScreen('setup');
          this.showToast('Cofre resetado com sucesso.', 'info');
        }
      }
    }

    closeAllModals() {
      this.closeCredentialModal();
      this.closeGeneratorModal();
    }

    /* ------------------------------------------------------------------------
       Sistema de Toasts
       ------------------------------------------------------------------------ */
    showToast(message, type = 'info') {
      const container = this.dom.toastContainer;
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;

      let icon = 'info-circle';
      if (type === 'success') icon = 'check-circle';
      if (type === 'error') icon = 'exclamation-circle';
      if (type === 'warning') icon = 'exclamation-triangle';

      toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 250);
      }, 3500);
    }
  }

  // Inicializar quando o DOM estiver carregado
  document.addEventListener('DOMContentLoaded', () => {
    new VaultApp();
  });
})();
