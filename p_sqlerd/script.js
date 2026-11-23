/**
 * SQL-to-ERD Schema Analyzer — Motor de Parsing e Visualização Vetorial
 * Desenvolvido em JavaScript puro (Zero Dependências).
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. PRESETS DE ESQUEMAS SQL RELACIONAIS
     ========================================================================== */
  const PRESETS = {
    ecommerce: `-- Esquema E-Commerce & Pagamentos
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE products (
  id BIGINT PRIMARY KEY,
  category_id INT REFERENCES categories(id),
  title VARCHAR(180) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INT DEFAULT 0
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  status VARCHAR(40) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id BIGINT PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id),
  product_id BIGINT REFERENCES products(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE payments (
  id BIGINT PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id),
  provider VARCHAR(60) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(40) NOT NULL
);`,

    streaming: `-- Esquema Plataforma de Streaming
CREATE TABLE plans (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  monthly_price DECIMAL(8, 2) NOT NULL,
  max_screens INT DEFAULT 1
);

CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  plan_id INT REFERENCES plans(id),
  username VARCHAR(60) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE genres (
  id INT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(60) UNIQUE NOT NULL
);

CREATE TABLE content (
  id BIGINT PRIMARY KEY,
  genre_id INT REFERENCES genres(id),
  title VARCHAR(200) NOT NULL,
  release_year INT NOT NULL,
  duration_minutes INT
);

CREATE TABLE watch_history (
  id BIGINT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  content_id BIGINT REFERENCES content(id),
  progress_seconds INT DEFAULT 0,
  completed BOOLEAN DEFAULT false
);

CREATE TABLE reviews (
  id BIGINT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  content_id BIGINT REFERENCES content(id),
  rating INT NOT NULL,
  comment TEXT
);`,

    biblioteca: `-- Esquema Biblioteca & Empréstimos
CREATE TABLE authors (
  id INT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  nationality VARCHAR(60)
);

CREATE TABLE categories (
  id INT PRIMARY KEY,
  name VARCHAR(80) NOT NULL
);

CREATE TABLE books (
  id BIGINT PRIMARY KEY,
  author_id INT REFERENCES authors(id),
  category_id INT REFERENCES categories(id),
  title VARCHAR(200) NOT NULL,
  isbn VARCHAR(30) UNIQUE NOT NULL,
  published_year INT,
  available_copies INT DEFAULT 1
);

CREATE TABLE members (
  id BIGINT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  phone VARCHAR(30),
  joined_date DATE
);

CREATE TABLE loans (
  id BIGINT PRIMARY KEY,
  book_id BIGINT REFERENCES books(id),
  member_id BIGINT REFERENCES members(id),
  loan_date DATE NOT NULL,
  return_due_date DATE NOT NULL,
  returned_at DATE
);`,

    lms: `-- Esquema Portal Educacional / LMS
CREATE TABLE instructors (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  bio TEXT
);

CREATE TABLE courses (
  id INT PRIMARY KEY,
  instructor_id INT REFERENCES instructors(id),
  title VARCHAR(150) NOT NULL,
  difficulty_level VARCHAR(30),
  total_hours INT
);

CREATE TABLE students (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE enrollments (
  id BIGINT PRIMARY KEY,
  student_id BIGINT REFERENCES students(id),
  course_id INT REFERENCES courses(id),
  progress_pct INT DEFAULT 0
);

CREATE TABLE lessons (
  id BIGINT PRIMARY KEY,
  course_id INT REFERENCES courses(id),
  title VARCHAR(150) NOT NULL,
  order_index INT NOT NULL,
  video_url VARCHAR(255)
);`,

    tasks: `-- Esquema Gestão Ágil de Tarefas
CREATE TABLE workspaces (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL
);

CREATE TABLE projects (
  id INT PRIMARY KEY,
  workspace_id INT REFERENCES workspaces(id),
  title VARCHAR(120) NOT NULL,
  deadline DATE
);

CREATE TABLE sprints (
  id INT PRIMARY KEY,
  project_id INT REFERENCES projects(id),
  name VARCHAR(80) NOT NULL,
  start_date DATE,
  end_date DATE
);

CREATE TABLE issues (
  id BIGINT PRIMARY KEY,
  project_id INT REFERENCES projects(id),
  sprint_id INT REFERENCES sprints(id),
  title VARCHAR(200) NOT NULL,
  priority VARCHAR(30) DEFAULT 'MEDIUM'
);

CREATE TABLE comments (
  id BIGINT PRIMARY KEY,
  issue_id BIGINT REFERENCES issues(id),
  author_email VARCHAR(180) NOT NULL,
  body TEXT NOT NULL
);`
  };

  /* ==========================================================================
     2. PARSER SQL DDL NATIVO
     ========================================================================== */
  class SqlParser {
    static parse(sqlText) {
      const result = {
        tables: [],
        relationships: [],
        errors: [],
        warnings: []
      };

      if (!sqlText || !sqlText.trim()) {
        return result;
      }

      // 1. Limpeza de comentários
      let cleaned = sqlText
        .replace(/\/\*[\s\S]*?\*\//g, ' ') // Comentários de bloco /* ... */
        .replace(/--.*$/gm, ' ');          // Comentários de linha -- ...

      // 2. Extração de blocos CREATE TABLE
      const createTableRegex = new RegExp('CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+([^\\s(]+)\\s*\\(', 'gi');
      let match;

      while ((match = createTableRegex.exec(cleaned)) !== null) {
        const fullTableName = match[1];
        const tableName = SqlParser.cleanIdentifier(fullTableName);
        const startIndex = createTableRegex.lastIndex;

        // Localizar parênteses de fechamento balanceado
        let depth = 1;
        let endIndex = -1;
        for (let i = startIndex; i < cleaned.length; i++) {
          const char = cleaned[i];
          if (char === '(') depth++;
          else if (char === ')') {
            depth--;
            if (depth === 0) {
              endIndex = i;
              break;
            }
          }
        }

        if (endIndex === -1) {
          result.errors.push(`Parêntese não fechado na tabela '${tableName}'`);
          continue;
        }

        const body = cleaned.substring(startIndex, endIndex);

        // Processar definições internas
        const parsedTable = SqlParser.parseTableBody(tableName, body);
        result.tables.push(parsedTable.table);

        if (parsedTable.relationships.length > 0) {
          result.relationships.push(...parsedTable.relationships);
        }

        // Avançar regex
        createTableRegex.lastIndex = endIndex + 1;
      }

      // Validação de integridade referencial cruzada
      const tableMap = new Map();
      result.tables.forEach(t => tableMap.set(t.name.toLowerCase(), t));

      result.relationships.forEach(rel => {
        const target = tableMap.get(rel.toTable.toLowerCase());
        if (!target) {
          result.warnings.push(`Tabela de destino '${rel.toTable}' referenciada por '${rel.fromTable}.${rel.fromColumn}' não foi encontrada.`);
        } else {
          // Garantir nome exato da tabela no relacionamento
          rel.toTable = target.name;
        }
      });

      return result;
    }

    static cleanIdentifier(raw) {
      if (!raw) return '';
      // Tratar schemas como "public"."users"
      const parts = raw.split('.');
      const last = parts[parts.length - 1];
      return last.replace(/[`"'\[\]]/g, '').trim();
    }

    static splitBodyStatements(body) {
      const statements = [];
      let current = '';
      let depth = 0;

      for (let i = 0; i < body.length; i++) {
        const char = body[i];
        if (char === '(') depth++;
        else if (char === ')') depth--;

        if (char === ',' && depth === 0) {
          if (current.trim()) statements.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      if (current.trim()) statements.push(current.trim());
      return statements;
    }

    static parseTableBody(tableName, body) {
      const table = {
        name: tableName,
        columns: []
      };
      const relationships = [];
      const statements = SqlParser.splitBodyStatements(body);

      const tableLevelPKs = new Set();

      // Primeiro passe: capturar restrições de nível de tabela
      statements.forEach(stmt => {
        const s = stmt.trim();

        // PRIMARY KEY (col1, col2)
        const pkMatch = s.match(new RegExp('(?:CONSTRAINT\\s+[^\\s]+\\s+)?PRIMARY\\s+KEY\\s*\\(([^)]+)\\)', 'i'));
        if (pkMatch) {
          pkMatch[1].split(',').forEach(c => tableLevelPKs.add(SqlParser.cleanIdentifier(c).toLowerCase()));
          return;
        }

        // FOREIGN KEY (col) REFERENCES other_table(other_col)
        const fkMatch = s.match(new RegExp('(?:CONSTRAINT\\s+[^\\s]+\\s+)?FOREIGN\\s+KEY\\s*\\(([^)]+)\\)\\s*REFERENCES\\s+([^\\s(]+)(?:\\s*\\(([^)]+)\\))?', 'i'));
        if (fkMatch) {
          const fromCol = SqlParser.cleanIdentifier(fkMatch[1]);
          const toTbl = SqlParser.cleanIdentifier(fkMatch[2]);
          const toCol = fkMatch[3] ? SqlParser.cleanIdentifier(fkMatch[3]) : 'id';

          relationships.push({
            id: `rel_${tableName}_${fromCol}_${toTbl}`,
            fromTable: tableName,
            fromColumn: fromCol,
            toTable: toTbl,
            toColumn: toCol,
            cardinality: '1:N'
          });
        }
      });

      // Segundo passe: capturar colunas
      statements.forEach(stmt => {
        const s = stmt.trim();
        const upper = s.toUpperCase();

        // Pular constraints de nível de tabela já processadas
        if (upper.startsWith('PRIMARY KEY') ||
            upper.startsWith('CONSTRAINT') ||
            upper.startsWith('FOREIGN KEY') ||
            upper.startsWith('UNIQUE') ||
            upper.startsWith('CHECK')) {
          return;
        }

        // Ex: id BIGINT PRIMARY KEY
        // Ex: category_id INT REFERENCES categories(id)
        const parts = s.split(/\s+/);
        if (parts.length < 2) return;

        const colName = SqlParser.cleanIdentifier(parts[0]);
        if (!colName) return;

        let colType = parts[1].toUpperCase();
        // Se o tipo tiver parênteses como DECIMAL(10, 2)
        if (colType.includes('(') && !colType.includes(')')) {
          for (let p = 2; p < parts.length; p++) {
            colType += ' ' + parts[p].toUpperCase();
            if (parts[p].includes(')')) break;
          }
        }

        let isPk = tableLevelPKs.has(colName.toLowerCase()) || /PRIMARY\s+KEY/i.test(s);
        let isFk = false;
        let refTable = null;
        let refCol = null;

        // Verificar FK inline: col TYPE REFERENCES ref_tbl(ref_col)
        const inlineFkMatch = s.match(new RegExp('REFERENCES\\s+([^\\s(]+)(?:\\s*\\(([^)]+)\\))?', 'i'));
        if (inlineFkMatch) {
          isFk = true;
          refTable = SqlParser.cleanIdentifier(inlineFkMatch[1]);
          refCol = inlineFkMatch[2] ? SqlParser.cleanIdentifier(inlineFkMatch[2]) : 'id';

          // Evitar duplicidade caso haja constraint equivalente
          const exists = relationships.some(r => r.fromTable === tableName && r.fromColumn === colName);
          if (!exists) {
            relationships.push({
              id: `rel_${tableName}_${colName}_${refTable}`,
              fromTable: tableName,
              fromColumn: colName,
              toTable: refTable,
              toColumn: refCol,
              cardinality: '1:N'
            });
          }
        }

        table.columns.push({
          name: colName,
          type: colType,
          isPk,
          isFk,
          refTable,
          refCol
        });
      });

      // Atualizar isFk nas colunas marcadas via constraints de tabela
      relationships.forEach(rel => {
        if (rel.fromTable === tableName) {
          const col = table.columns.find(c => c.name.toLowerCase() === rel.fromColumn.toLowerCase());
          if (col) {
            col.isFk = true;
            col.refTable = rel.toTable;
            col.refCol = rel.toColumn;
          }
        }
      });

      return { table, relationships };
    }
  }

  /* ==========================================================================
     3. GERENCIADOR DO VIEWPORT, CANVAS E NÓS VETORIAIS
     ========================================================================== */
  class ErdCanvasApp {
    constructor() {
      // Elementos do DOM
      this.dom = {
        textarea: document.getElementById('sql-textarea'),
        lineNumbers: document.getElementById('line-numbers'),
        btnGenerate: document.getElementById('btn-generate-diagram'),
        btnClearSql: document.getElementById('btn-clear-sql'),
        btnFormatSql: document.getElementById('btn-format-sql'),
        diagnosticBanner: document.getElementById('diagnostic-banner'),
        diagnosticIcon: document.getElementById('diagnostic-icon'),
        diagnosticText: document.getElementById('diagnostic-text'),
        statTables: document.getElementById('stat-tables-count'),
        statRelations: document.getElementById('stat-relations-count'),
        parserBadge: document.getElementById('parser-status-badge'),
        viewport: document.getElementById('canvas-viewport'),
        world: document.getElementById('canvas-world'),
        svg: document.getElementById('erd-connections-svg'),
        svgGroup: document.getElementById('svg-paths-group'),
        nodesLayer: document.getElementById('erd-nodes-layer'),
        emptyState: document.getElementById('canvas-empty-state'),
        btnQuickPreset: document.getElementById('btn-load-quick-preset'),
        presetsToggle: document.getElementById('btn-presets-toggle'),
        presetsMenu: document.getElementById('presets-dropdown-menu'),
        exportToggle: document.getElementById('btn-export-toggle'),
        exportMenu: document.getElementById('export-dropdown-menu'),
        btnExportSvg: document.getElementById('btn-export-svg'),
        btnExportPng: document.getElementById('btn-export-png'),
        btnCopyJson: document.getElementById('btn-copy-json'),
        btnZoomIn: document.getElementById('btn-zoom-in'),
        btnZoomOut: document.getElementById('btn-zoom-out'),
        btnZoomReset: document.getElementById('btn-zoom-reset'),
        btnFitScreen: document.getElementById('btn-fit-screen'),
        btnAutoLayout: document.getElementById('btn-auto-layout'),
        zoomLabel: document.getElementById('zoom-percentage-text'),
        searchInput: document.getElementById('hud-search-input'),
        btnClearSearch: document.getElementById('btn-clear-search'),
        toastContainer: document.getElementById('toast-container'),
        resizer: document.getElementById('workspace-resizer'),
        sidebar: document.getElementById('sidebar-editor')
      };

      // Estado do Viewport (Pan & Zoom)
      this.state = {
        panX: 40,
        panY: 40,
        zoom: 1.0,
        minZoom: 0.25,
        maxZoom: 2.2,
        isPanning: false,
        panStartX: 0,
        panStartY: 0,
        activeDragNode: null,
        dragOffsetX: 0,
        dragOffsetY: 0,
        tables: [],
        relationships: [],
        nodePositions: new Map(), // tableName -> { x, y, width, height }
        hoveredTable: null
      };

      this.init();
    }

    init() {
      this.bindEditorEvents();
      this.bindViewportEvents();
      this.bindDropdowns();
      this.bindExportEvents();
      this.bindResizer();
      this.bindSearch();

      // Carregar preset inicial de demonstração
      this.loadPreset('ecommerce');
    }

    /* ------------------------------------------------------------------------
       Gerenciamento de Presets e Editor
       ------------------------------------------------------------------------ */
    bindEditorEvents() {
      // Atualizar contagem de linhas
      this.dom.textarea.addEventListener('input', () => this.updateLineNumbers());
      this.dom.textarea.addEventListener('scroll', () => {
        this.dom.lineNumbers.scrollTop = this.dom.textarea.scrollTop;
      });

      // Atalho global Ctrl+Enter / Cmd+Enter
      this.dom.textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          this.parseAndRender();
        }
      });

      this.dom.btnGenerate.addEventListener('click', () => this.parseAndRender());

      this.dom.btnClearSql.addEventListener('click', () => {
        this.dom.textarea.value = '';
        this.updateLineNumbers();
        this.parseAndRender();
        this.showToast('Editor limpo com sucesso.', 'info');
      });

      this.dom.btnFormatSql.addEventListener('click', () => this.formatSql());

      if (this.dom.btnQuickPreset) {
        this.dom.btnQuickPreset.addEventListener('click', () => this.loadPreset('ecommerce'));
      }
    }

    updateLineNumbers() {
      const lines = this.dom.textarea.value.split('\n').length;
      let numbersHtml = '';
      for (let i = 1; i <= Math.max(lines, 1); i++) {
        numbersHtml += `${i}\n`;
      }
      this.dom.lineNumbers.textContent = numbersHtml;
    }

    formatSql() {
      const val = this.dom.textarea.value;
      if (!val.trim()) return;

      // Formatação básica elegante de palavras-chave
      const formatted = val
        .replace(/\b(create table|primary key|foreign key|references|not null|unique|default|check)\b/gi, (m) => m.toUpperCase())
        .replace(/\b(bigint|int|varchar|text|boolean|timestamp|decimal|serial|uuid|date)\b/gi, (m) => m.toUpperCase());

      this.dom.textarea.value = formatted;
      this.showToast('SQL padronizado com sucesso.', 'success');
    }

    loadPreset(name) {
      if (PRESETS[name]) {
        this.dom.textarea.value = PRESETS[name];
        this.updateLineNumbers();
        this.parseAndRender(true);
        this.closeAllDropdowns();
        this.showToast(`Exemplo carregado: ${name.toUpperCase()}`, 'success');
      }
    }

    /* ------------------------------------------------------------------------
       Dropdowns de Ações
       ------------------------------------------------------------------------ */
    bindDropdowns() {
      const toggleDropdown = (btn, menu) => {
        const container = btn.closest('.dropdown-container');
        const isOpen = container.classList.contains('is-open');
        this.closeAllDropdowns();
        if (!isOpen) {
          container.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      };

      this.dom.presetsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(this.dom.presetsToggle, this.dom.presetsMenu);
      });

      this.dom.exportToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(this.dom.exportToggle, this.dom.exportMenu);
      });

      document.querySelectorAll('#presets-dropdown-menu .dropdown-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const preset = btn.getAttribute('data-preset');
          this.loadPreset(preset);
        });
      });

      document.addEventListener('click', () => this.closeAllDropdowns());
    }

    closeAllDropdowns() {
      document.querySelectorAll('.dropdown-container').forEach(c => {
        c.classList.remove('is-open');
        const btn = c.querySelector('.dropdown-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }

    /* ------------------------------------------------------------------------
       Resizer Horizontal (Splitter)
       ------------------------------------------------------------------------ */
    bindResizer() {
      let isDragging = false;
      const resizer = this.dom.resizer;
      const sidebar = this.dom.sidebar;

      resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        resizer.classList.add('is-dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const newWidth = Math.min(Math.max(e.clientX, 300), 750);
        sidebar.style.width = `${newWidth}px`;
      });

      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          resizer.classList.remove('is-dragging');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }

    /* ------------------------------------------------------------------------
       Busca Rápida
       ------------------------------------------------------------------------ */
    bindSearch() {
      const input = this.dom.searchInput;
      const clearBtn = this.dom.btnClearSearch;

      const performSearch = () => {
        const query = input.value.trim().toLowerCase();
        if (!query) {
          clearBtn.style.display = 'none';
          this.clearHighlights();
          return;
        }

        clearBtn.style.display = 'inline-block';
        let foundNode = null;

        document.querySelectorAll('.erd-node').forEach(node => {
          const tableName = node.getAttribute('data-table').toLowerCase();
          const cols = Array.from(node.querySelectorAll('.col-name')).map(c => c.textContent.toLowerCase());
          const matches = tableName.includes(query) || cols.some(c => c.includes(query));

          if (matches) {
            node.classList.add('is-highlighted');
            node.classList.remove('is-dimmed');
            if (!foundNode) foundNode = node;
          } else {
            node.classList.remove('is-highlighted');
            node.classList.add('is-dimmed');
          }
        });

        // Focar e centralizar no primeiro nó encontrado
        if (foundNode) {
          const tblName = foundNode.getAttribute('data-table');
          const pos = this.state.nodePositions.get(tblName);
          if (pos) {
            const viewportRect = this.dom.viewport.getBoundingClientRect();
            this.state.panX = (viewportRect.width / 2) - ((pos.x + 125) * this.state.zoom);
            this.state.panY = (viewportRect.height / 2) - ((pos.y + 100) * this.state.zoom);
            this.applyTransform();
          }
        }
      };

      input.addEventListener('input', performSearch);
      clearBtn.addEventListener('click', () => {
        input.value = '';
        performSearch();
        input.focus();
      });
    }

    clearHighlights() {
      document.querySelectorAll('.erd-node').forEach(node => {
        node.classList.remove('is-highlighted', 'is-dimmed');
      });
      document.querySelectorAll('.erd-connections-svg path').forEach(path => {
        path.classList.remove('is-highlighted', 'is-dimmed');
      });
    }

    /* ------------------------------------------------------------------------
       Execução do Parser e Renderização Geral
       ------------------------------------------------------------------------ */
    parseAndRender(autoLayout = false) {
      const sql = this.dom.textarea.value;
      const parsed = SqlParser.parse(sql);

      this.state.tables = parsed.tables;
      this.state.relationships = parsed.relationships;

      // Atualizar métricas do header
      this.dom.statTables.textContent = `${parsed.tables.length} Tabela${parsed.tables.length !== 1 ? 's' : ''}`;
      this.dom.statRelations.textContent = `${parsed.relationships.length} Relaç${parsed.relationships.length === 1 ? 'ão' : 'ões'}`;

      // Diagnóstico Banner
      if (parsed.errors.length > 0) {
        this.dom.diagnosticBanner.className = 'diagnostic-banner status-error';
        this.dom.diagnosticIcon.className = 'fas fa-exclamation-triangle diagnostic-icon';
        this.dom.diagnosticText.textContent = parsed.errors[0];
        this.dom.parserBadge.className = 'telemetry-status-badge';
        this.dom.parserBadge.innerHTML = `<i class="fas fa-times-circle text-rose"></i> <span class="status-text">Erro</span>`;
      } else if (parsed.warnings.length > 0) {
        this.dom.diagnosticBanner.className = 'diagnostic-banner status-error';
        this.dom.diagnosticIcon.className = 'fas fa-exclamation-circle diagnostic-icon';
        this.dom.diagnosticText.textContent = parsed.warnings[0];
        this.dom.parserBadge.className = 'telemetry-status-badge live';
        this.dom.parserBadge.innerHTML = `<span class="pulse-dot"></span> <span class="status-text">Aviso</span>`;
      } else if (parsed.tables.length > 0) {
        this.dom.diagnosticBanner.className = 'diagnostic-banner status-success';
        this.dom.diagnosticIcon.className = 'fas fa-check-circle diagnostic-icon';
        this.dom.diagnosticText.textContent = `Esquema validado com sucesso: ${parsed.tables.length} tabelas e ${parsed.relationships.length} conexões detectadas.`;
        this.dom.parserBadge.className = 'telemetry-status-badge live';
        this.dom.parserBadge.innerHTML = `<span class="pulse-dot"></span> <span class="status-text">Válido</span>`;
      } else {
        this.dom.diagnosticBanner.className = 'diagnostic-banner';
        this.dom.diagnosticIcon.className = 'fas fa-info-circle diagnostic-icon';
        this.dom.diagnosticText.textContent = 'Aguardando definições CREATE TABLE...';
      }

      // Renderizar nós HTML e conexões
      if (parsed.tables.length === 0) {
        this.dom.emptyState.style.display = 'flex';
        this.dom.nodesLayer.innerHTML = '';
        this.dom.svgGroup.innerHTML = '';
        return;
      }

      this.dom.emptyState.style.display = 'none';
      this.renderTableNodes(autoLayout);
      this.updateConnections();

      if (autoLayout) {
        this.fitToScreen();
      }
    }

    /* ------------------------------------------------------------------------
       Renderização dos Cards de Tabelas (Nós HTML)
       ------------------------------------------------------------------------ */
    renderTableNodes(resetLayout = false) {
      const container = this.dom.nodesLayer;
      container.innerHTML = '';

      const nodeWidth = 250;
      const spacingX = 330;
      const spacingY = 240;
      const colsPerRow = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(this.state.tables.length * 1.5))));

      this.state.tables.forEach((table, index) => {
        let pos = this.state.nodePositions.get(table.name);

        if (!pos || resetLayout) {
          const col = index % colsPerRow;
          const row = Math.floor(index / colsPerRow);
          pos = {
            x: 80 + (col * spacingX),
            y: 70 + (row * spacingY),
            width: nodeWidth,
            height: 0 // será medido pós inserção
          };
          this.state.nodePositions.set(table.name, pos);
        }

        const node = document.createElement('div');
        node.className = 'erd-node';
        node.setAttribute('data-table', table.name);
        node.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;

        // Montar cabeçalho
        let colsHtml = '';
        table.columns.forEach(col => {
          let indicatorIcon = '';
          let colClass = 'erd-column';

          if (col.isPk) {
            colClass += ' is-pk';
            indicatorIcon = '<i class="fas fa-key pk-icon" title="Chave Primária (PK)"></i>';
          } else if (col.isFk) {
            colClass += ' is-fk';
            indicatorIcon = `<i class="fas fa-link fk-icon" title="Chave Estrangeira &rarr; ${col.refTable || ''}"></i>`;
          }

          colsHtml += `
            <div class="${colClass}" data-col="${col.name}">
              <div class="col-left-info">
                <span class="col-indicator">${indicatorIcon}</span>
                <span class="col-name" title="${col.name}">${col.name}</span>
              </div>
              <span class="col-type">${col.type}</span>
            </div>
          `;
        });

        node.innerHTML = `
          <div class="erd-node-header">
            <div class="erd-node-title">
              <i class="fas fa-table node-table-icon"></i>
              <span class="table-name" title="${table.name}">${table.name}</span>
            </div>
            <span class="column-count-badge">${table.columns.length} cols</span>
          </div>
          <div class="erd-columns-list">
            ${colsHtml}
          </div>
        `;

        // Eventos de Drag & Drop no nó
        this.bindNodeDrag(node, table.name);
        this.bindNodeHover(node, table.name);

        container.appendChild(node);

        // Medir altura real do card
        pos.height = node.offsetHeight || (40 + (table.columns.length * 28));
      });
    }

    bindNodeHover(node, tableName) {
      node.addEventListener('mouseenter', () => {
        this.state.hoveredTable = tableName;
        this.highlightTableRelations(tableName);
      });

      node.addEventListener('mouseleave', () => {
        this.state.hoveredTable = null;
        this.clearHighlights();
      });
    }

    highlightTableRelations(tableName) {
      const connectedTables = new Set([tableName]);
      const activeRelIds = new Set();

      this.state.relationships.forEach(rel => {
        if (rel.fromTable.toLowerCase() === tableName.toLowerCase() ||
            rel.toTable.toLowerCase() === tableName.toLowerCase()) {
          connectedTables.add(rel.fromTable);
          connectedTables.add(rel.toTable);
          activeRelIds.add(rel.id);
        }
      });

      document.querySelectorAll('.erd-node').forEach(node => {
        const name = node.getAttribute('data-table');
        if (connectedTables.has(name)) {
          node.classList.add('is-highlighted');
          node.classList.remove('is-dimmed');
        } else {
          node.classList.remove('is-highlighted');
          node.classList.add('is-dimmed');
        }
      });

      document.querySelectorAll('.erd-connections-svg path').forEach(path => {
        const relId = path.getAttribute('data-rel-id');
        if (activeRelIds.has(relId)) {
          path.classList.add('is-highlighted');
          path.classList.remove('is-dimmed');
        } else {
          path.classList.remove('is-highlighted');
          path.classList.add('is-dimmed');
        }
      });
    }

    bindNodeDrag(node, tableName) {
      const header = node.querySelector('.erd-node-header');

      const onMouseDown = (e) => {
        if (e.button !== 0) return; // Apenas botão esquerdo
        e.stopPropagation();

        const pos = this.state.nodePositions.get(tableName);
        if (!pos) return;

        this.state.activeDragNode = {
          node,
          tableName,
          startX: e.clientX,
          startY: e.clientY,
          initialX: pos.x,
          initialY: pos.y
        };

        node.classList.add('is-dragging');
      };

      header.addEventListener('mousedown', onMouseDown);
    }

    /* ------------------------------------------------------------------------
       Recálculo de Conexões Bézier Cúbicas SVG (60 FPS)
       ------------------------------------------------------------------------ */
    updateConnections() {
      const group = this.dom.svgGroup;
      group.innerHTML = '';

      if (this.state.relationships.length === 0) return;

      this.state.relationships.forEach(rel => {
        const fromPos = this.state.nodePositions.get(rel.fromTable);
        const toPos = this.state.nodePositions.get(rel.toTable);

        if (!fromPos || !toPos) return;

        // Calcular altura específica da linha da coluna no nó
        const fromColY = this.getColumnCenterY(rel.fromTable, rel.fromColumn, fromPos);
        const toColY = this.getColumnCenterY(rel.toTable, rel.toColumn, toPos);

        const nodeWidth = fromPos.width || 250;
        const toNodeWidth = toPos.width || 250;

        // Determinação inteligente de âncoras (saída e entrada)
        let x1, y1, x2, y2;
        let isVertical = false;

        if (toPos.x > fromPos.x + nodeWidth - 20) {
          // Destino está à direita
          x1 = fromPos.x + nodeWidth;
          y1 = fromColY;
          x2 = toPos.x;
          y2 = toColY;
        } else if (toPos.x + toNodeWidth - 20 < fromPos.x) {
          // Destino está à esquerda
          x1 = fromPos.x;
          y1 = fromColY;
          x2 = toPos.x + toNodeWidth;
          y2 = toColY;
        } else {
          // Sobrepostos ou no mesmo eixo vertical
          isVertical = true;
          const fromIsAbove = fromPos.y < toPos.y;
          x1 = fromPos.x + (nodeWidth / 2);
          y1 = fromIsAbove ? (fromPos.y + fromPos.height) : fromPos.y;
          x2 = toPos.x + (toNodeWidth / 2);
          y2 = fromIsAbove ? toPos.y : (toPos.y + toPos.height);
        }

        // Curvatura de Bézier cúbica
        let cx1, cy1, cx2, cy2;
        if (isVertical) {
          const dy = Math.abs(y2 - y1);
          const vCurvature = Math.max(30, Math.min(dy * 0.5, 120));
          const sign = y2 >= y1 ? 1 : -1;
          cx1 = x1;
          cy1 = y1 + (vCurvature * sign);
          cx2 = x2;
          cy2 = y2 - (vCurvature * sign);
        } else {
          const dx = Math.abs(x2 - x1);
          const curvature = Math.max(50, Math.min(dx * 0.5, 160));
          if (x2 >= x1) {
            cx1 = x1 + curvature;
            cy1 = y1;
            cx2 = x2 - curvature;
            cy2 = y2;
          } else {
            cx1 = x1 - curvature;
            cy1 = y1;
            cx2 = x2 + curvature;
            cy2 = y2;
          }
        }

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
        path.setAttribute('d', d);
        path.setAttribute('class', 'erd-link');
        path.setAttribute('data-rel-id', rel.id);
        path.setAttribute('marker-end', 'url(#arrow-fk)');
        path.setAttribute('marker-start', 'url(#dot-pk)');

        // Interação hover na linha
        path.addEventListener('mouseenter', () => {
          path.classList.add('is-highlighted');
          this.highlightTableRelations(rel.fromTable);
        });
        path.addEventListener('mouseleave', () => {
          path.classList.remove('is-highlighted');
          this.clearHighlights();
        });

        group.appendChild(path);
      });
    }

    getColumnCenterY(tableName, columnName, tablePos) {
      const table = this.state.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());
      if (!table) return tablePos.y + 40;

      const colIndex = table.columns.findIndex(c => c.name.toLowerCase() === columnName.toLowerCase());
      if (colIndex === -1) return tablePos.y + 40;

      // Header = ~38px, cada linha de coluna = ~28px
      const headerHeight = 38;
      const rowHeight = 28;
      return tablePos.y + headerHeight + (colIndex * rowHeight) + (rowHeight / 2);
    }

    /* ------------------------------------------------------------------------
       Eventos de Viewport: Pan, Zoom e Drag Global
       ------------------------------------------------------------------------ */
    bindViewportEvents() {
      const viewport = this.dom.viewport;

      // Pan do Canvas com botão do mouse
      viewport.addEventListener('mousedown', (e) => {
        if (e.target.closest('.erd-node') || e.target.closest('.canvas-hud-toolbar')) {
          return;
        }

        this.state.isPanning = true;
        this.state.panStartX = e.clientX - this.state.panX;
        this.state.panStartY = e.clientY - this.state.panY;
        viewport.classList.add('is-panning');
      });

      window.addEventListener('mousemove', (e) => {
        // Arraste do Pan do canvas
        if (this.state.isPanning) {
          this.state.panX = e.clientX - this.state.panStartX;
          this.state.panY = e.clientY - this.state.panStartY;
          this.applyTransform();
          return;
        }

        // Arraste de Nó de Tabela
        if (this.state.activeDragNode) {
          const drag = this.state.activeDragNode;
          const deltaX = (e.clientX - drag.startX) / this.state.zoom;
          const deltaY = (e.clientY - drag.startY) / this.state.zoom;

          const newX = Math.round(drag.initialX + deltaX);
          const newY = Math.round(drag.initialY + deltaY);

          const pos = this.state.nodePositions.get(drag.tableName);
          if (pos) {
            pos.x = newX;
            pos.y = newY;
            drag.node.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
            
            // Recálculo suave das conexões em tempo real
            requestAnimationFrame(() => this.updateConnections());
          }
        }
      });

      window.addEventListener('mouseup', () => {
        if (this.state.isPanning) {
          this.state.isPanning = false;
          viewport.classList.remove('is-panning');
        }

        if (this.state.activeDragNode) {
          this.state.activeDragNode.node.classList.remove('is-dragging');
          this.state.activeDragNode = null;
        }
      });

      // Zoom com a roda do mouse (centrado no ponteiro)
      viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
        const newZoom = Math.min(Math.max(this.state.zoom * zoomFactor, this.state.minZoom), this.state.maxZoom);

        if (newZoom !== this.state.zoom) {
          // Ajuste de pan para zoom centrado no mouse
          this.state.panX = mouseX - (mouseX - this.state.panX) * (newZoom / this.state.zoom);
          this.state.panY = mouseY - (mouseY - this.state.panY) * (newZoom / this.state.zoom);
          this.state.zoom = newZoom;
          this.applyTransform();
        }
      }, { passive: false });

      // Botões do HUD de Zoom
      this.dom.btnZoomIn.addEventListener('click', () => this.adjustZoom(1.2));
      this.dom.btnZoomOut.addEventListener('click', () => this.adjustZoom(0.83));
      this.dom.btnZoomReset.addEventListener('click', () => {
        this.state.zoom = 1.0;
        this.applyTransform();
      });
      this.dom.btnFitScreen.addEventListener('click', () => this.fitToScreen());
      this.dom.btnAutoLayout.addEventListener('click', () => {
        this.renderTableNodes(true);
        this.updateConnections();
        this.fitToScreen();
        this.showToast('Layout reorganizado automaticamente.', 'info');
      });
    }

    adjustZoom(multiplier) {
      const rect = this.dom.viewport.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const newZoom = Math.min(Math.max(this.state.zoom * multiplier, this.state.minZoom), this.state.maxZoom);
      this.state.panX = centerX - (centerX - this.state.panX) * (newZoom / this.state.zoom);
      this.state.panY = centerY - (centerY - this.state.panY) * (newZoom / this.state.zoom);
      this.state.zoom = newZoom;
      this.applyTransform();
    }

    applyTransform() {
      this.dom.world.style.transform = `translate(${this.state.panX}px, ${this.state.panY}px) scale(${this.state.zoom})`;
      this.dom.zoomLabel.textContent = `${Math.round(this.state.zoom * 100)}%`;
    }

    fitToScreen() {
      if (this.state.tables.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      this.state.nodePositions.forEach(pos => {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + (pos.width || 250));
        maxY = Math.max(maxY, pos.y + (pos.height || 200));
      });

      const padding = 60;
      const contentWidth = maxX - minX + (padding * 2);
      const contentHeight = maxY - minY + (padding * 2);

      const viewportRect = this.dom.viewport.getBoundingClientRect();
      const scaleX = viewportRect.width / contentWidth;
      const scaleY = viewportRect.height / contentHeight;

      const idealZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.1);

      this.state.zoom = idealZoom;
      this.state.panX = (viewportRect.width / 2) - ((minX + (maxX - minX) / 2) * idealZoom);
      this.state.panY = (viewportRect.height / 2) - ((minY + (maxY - minY) / 2) * idealZoom);

      this.applyTransform();
    }

    /* ------------------------------------------------------------------------
       Exportações: SVG, PNG e JSON Schema
       ------------------------------------------------------------------------ */
    bindExportEvents() {
      this.dom.btnExportSvg.addEventListener('click', () => this.exportSvg());
      this.dom.btnExportPng.addEventListener('click', () => this.exportPng());
      this.dom.btnCopyJson.addEventListener('click', () => this.copyJsonSchema());
    }

    exportSvg() {
      if (this.state.tables.length === 0) {
        this.showToast('Nenhuma tabela para exportar.', 'error');
        return;
      }

      // Calcular limites do diagrama
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      this.state.nodePositions.forEach(pos => {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + (pos.width || 250));
        maxY = Math.max(maxY, pos.y + (pos.height || 200));
      });

      const padding = 40;
      const width = maxX - minX + (padding * 2);
      const height = maxY - minY + (padding * 2);
      const offsetX = minX - padding;
      const offsetY = minY - padding;

      // Montar SVG stand-alone com estilos embutidos
      let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .bg { fill: #09090b; }
    .table-box { fill: #121216; stroke: #23232a; rx: 8px; }
    .table-hdr { fill: #18181e; }
    .table-title { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700; fill: #ffffff; }
    .col-row { font-family: 'JetBrains Mono', monospace; font-size: 11px; fill: #a1a1aa; }
    .col-pk { fill: #fbbf24; font-weight: 600; }
    .col-fk { fill: #22d3ee; }
    .col-type { font-size: 10px; fill: #71717a; text-anchor: end; }
    .link-path { fill: none; stroke: #06b6d4; stroke-width: 2.2px; }
  </style>
  <defs>
    <marker id="m-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 9 5 L 0 9 z" fill="#06b6d4" />
    </marker>
  </defs>
  <rect width="100%" height="100%" class="bg" />
`;

      // Adicionar Conexões com coordenadas ajustadas ao offset
      this.state.relationships.forEach(rel => {
        const fromPos = this.state.nodePositions.get(rel.fromTable);
        const toPos = this.state.nodePositions.get(rel.toTable);
        if (!fromPos || !toPos) return;

        const fromColY = this.getColumnCenterY(rel.fromTable, rel.fromColumn, fromPos) - offsetY;
        const toColY = this.getColumnCenterY(rel.toTable, rel.toColumn, toPos) - offsetY;
        const nodeW = fromPos.width || 250;
        const toNodeW = toPos.width || 250;

        const fx = fromPos.x - offsetX;
        const fy = fromPos.y - offsetY;
        const tx = toPos.x - offsetX;
        const ty = toPos.y - offsetY;

        let x1, y1, x2, y2;
        let isVertical = false;

        if (tx > fx + nodeW - 20) {
          x1 = fx + nodeW; y1 = fromColY; x2 = tx; y2 = toColY;
        } else if (tx + toNodeW - 20 < fx) {
          x1 = fx; y1 = fromColY; x2 = tx + toNodeW; y2 = toColY;
        } else {
          isVertical = true;
          const fromIsAbove = fy < ty;
          x1 = fx + (nodeW / 2);
          y1 = fromIsAbove ? (fy + (fromPos.height || 180)) : fy;
          x2 = tx + (toNodeW / 2);
          y2 = fromIsAbove ? ty : (ty + (toPos.height || 180));
        }

        let cx1, cy1, cx2, cy2;
        if (isVertical) {
          const dy = Math.abs(y2 - y1);
          const vCurv = Math.max(30, Math.min(dy * 0.5, 120));
          const sign = y2 >= y1 ? 1 : -1;
          cx1 = x1; cy1 = y1 + (vCurv * sign); cx2 = x2; cy2 = y2 - (vCurv * sign);
        } else {
          const dx = Math.abs(x2 - x1);
          const cur = Math.max(50, Math.min(dx * 0.5, 160));
          cx1 = x2 >= x1 ? (x1 + cur) : (x1 - cur); cy1 = y1;
          cx2 = x2 >= x1 ? (x2 - cur) : (x2 + cur); cy2 = y2;
        }

        svgContent += `  <path d="M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}" class="link-path" marker-end="url(#m-arrow)" />\n`;
      });

      // Adicionar Tabelas (Cards desenhados em SVG puro)
      this.state.tables.forEach(table => {
        const pos = this.state.nodePositions.get(table.name);
        if (!pos) return;

        const x = pos.x - offsetX;
        const y = pos.y - offsetY;
        const w = pos.width || 250;
        const h = pos.height || (40 + (table.columns.length * 28));

        svgContent += `  <g transform="translate(${x}, ${y})">\n`;
        svgContent += `    <rect width="${w}" height="${h}" class="table-box" />\n`;
        svgContent += `    <rect width="${w}" height="36" class="table-hdr" rx="8" />\n`;
        svgContent += `    <text x="14" y="23" class="table-title">${table.name}</text>\n`;

        table.columns.forEach((col, i) => {
          const cy = 56 + (i * 24);
          let colClass = 'col-row';
          let prefix = '  ';
          if (col.isPk) { colClass += ' col-pk'; prefix = 'PK '; }
          else if (col.isFk) { colClass += ' col-fk'; prefix = 'FK '; }

          svgContent += `    <text x="14" y="${cy}" class="${colClass}">${prefix}${col.name}</text>\n`;
          svgContent += `    <text x="${w - 14}" y="${cy}" class="col-type">${col.type}</text>\n`;
        });

        svgContent += `  </g>\n`;
      });

      svgContent += `</svg>`;

      this.downloadBlob(svgContent, 'schema-erd.svg', 'image/svg+xml');
      this.showToast('Diagrama SVG exportado com sucesso!', 'success');
      this.closeAllDropdowns();
    }

    exportPng() {
      if (this.state.tables.length === 0) {
        this.showToast('Nenhuma tabela para exportar.', 'error');
        return;
      }

      // Bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      this.state.nodePositions.forEach(pos => {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + (pos.width || 250));
        maxY = Math.max(maxY, pos.y + (pos.height || 200));
      });

      const padding = 50;
      const width = maxX - minX + (padding * 2);
      const height = maxY - minY + (padding * 2);
      const offsetX = minX - padding;
      const offsetY = minY - padding;

      // Resolução 2x para nitidez Retina
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // Fundo escuro
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      // Dot matrix pattern sutil
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let x = 12; x < width; x += 24) {
        for (let y = 12; y < height; y += 24) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Conexões Bézier
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#06b6d4';

      this.state.relationships.forEach(rel => {
        const fromPos = this.state.nodePositions.get(rel.fromTable);
        const toPos = this.state.nodePositions.get(rel.toTable);
        if (!fromPos || !toPos) return;

        const fromColY = this.getColumnCenterY(rel.fromTable, rel.fromColumn, fromPos) - offsetY;
        const toColY = this.getColumnCenterY(rel.toTable, rel.toColumn, toPos) - offsetY;
        const nodeW = fromPos.width || 250;
        const toNodeW = toPos.width || 250;

        const fx = fromPos.x - offsetX;
        const fy = fromPos.y - offsetY;
        const tx = toPos.x - offsetX;
        const ty = toPos.y - offsetY;

        let x1, y1, x2, y2;
        let isVertical = false;

        if (tx > fx + nodeW - 20) {
          x1 = fx + nodeW; y1 = fromColY; x2 = tx; y2 = toColY;
        } else if (tx + toNodeW - 20 < fx) {
          x1 = fx; y1 = fromColY; x2 = tx + toNodeW; y2 = toColY;
        } else {
          isVertical = true;
          const fromIsAbove = fy < ty;
          x1 = fx + (nodeW / 2);
          y1 = fromIsAbove ? (fy + (fromPos.height || 180)) : fy;
          x2 = tx + (toNodeW / 2);
          y2 = fromIsAbove ? ty : (ty + (toPos.height || 180));
        }

        let cx1, cy1, cx2, cy2;
        if (isVertical) {
          const dy = Math.abs(y2 - y1);
          const vCurv = Math.max(30, Math.min(dy * 0.5, 120));
          const sign = y2 >= y1 ? 1 : -1;
          cx1 = x1; cy1 = y1 + (vCurv * sign); cx2 = x2; cy2 = y2 - (vCurv * sign);
        } else {
          const dx = Math.abs(x2 - x1);
          const cur = Math.max(50, Math.min(dx * 0.5, 160));
          cx1 = x2 >= x1 ? (x1 + cur) : (x1 - cur); cy1 = y1;
          cx2 = x2 >= x1 ? (x2 - cur) : (x2 + cur); cy2 = y2;
        }

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
        ctx.stroke();

        // Círculo terminal
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(x2, y2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Desenhar Cards das Tabelas
      this.state.tables.forEach(table => {
        const pos = this.state.nodePositions.get(table.name);
        if (!pos) return;

        const x = pos.x - offsetX;
        const y = pos.y - offsetY;
        const w = pos.width || 250;
        const h = pos.height || (40 + (table.columns.length * 28));

        // Card Container
        ctx.fillStyle = '#121216';
        ctx.strokeStyle = '#282833';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();

        // Header
        ctx.fillStyle = '#18181e';
        ctx.beginPath();
        ctx.roundRect(x, y, w, 36, [8, 8, 0, 0]);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12.5px monospace';
        ctx.fillText(table.name, x + 12, y + 23);

        // Colunas
        table.columns.forEach((col, i) => {
          const cy = y + 56 + (i * 24);

          ctx.font = '11px monospace';
          if (col.isPk) {
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(`PK ${col.name}`, x + 12, cy);
          } else if (col.isFk) {
            ctx.fillStyle = '#22d3ee';
            ctx.fillText(`FK ${col.name}`, x + 12, cy);
          } else {
            ctx.fillStyle = '#a1a1aa';
            ctx.fillText(col.name, x + 12, cy);
          }

          ctx.fillStyle = '#71717a';
          ctx.font = '10px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(col.type, x + w - 12, cy);
          ctx.textAlign = 'left';
        });
      });

      // Disparar download de imagem PNG
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'schema-erd.png';
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Imagem PNG (2x Retina) gerada com sucesso!', 'success');
        this.closeAllDropdowns();
      });
    }

    copyJsonSchema() {
      if (this.state.tables.length === 0) {
        this.showToast('Nenhum dado estruturado para copiar.', 'error');
        return;
      }

      const schema = {
        meta: {
          app: 'SQL-to-ERD Schema Analyzer',
          author: 'Sandro Engenharia',
          generatedAt: new Date().toISOString()
        },
        tables: this.state.tables,
        relationships: this.state.relationships
      };

      navigator.clipboard.writeText(JSON.stringify(schema, null, 2))
        .then(() => {
          this.showToast('Schema JSON copiado para a área de transferência!', 'success');
          this.closeAllDropdowns();
        })
        .catch(() => {
          this.showToast('Falha ao copiar JSON.', 'error');
        });
    }

    downloadBlob(content, filename, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    /* ------------------------------------------------------------------------
       Toasts Informativos
       ------------------------------------------------------------------------ */
    showToast(message, type = 'info') {
      const container = this.dom.toastContainer;
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;

      let icon = 'info-circle';
      if (type === 'success') icon = 'check-circle';
      if (type === 'error') icon = 'exclamation-circle';

      toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 250);
      }, 3500);
    }
  }

  // Inicializar quando o DOM estiver pronto
  document.addEventListener('DOMContentLoaded', () => {
    new ErdCanvasApp();
  });
})();
