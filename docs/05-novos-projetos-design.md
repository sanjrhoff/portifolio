# 🎨 Especificação de UI/UX & Design System: Novos Projetos de Alto Impacto
**Projetos:** `p_sqlerd` (SQL-to-ERD Schema Analyzer) & `p_vault` (Zero-Knowledge Secret Vault)  
**Integração:** Portfólio Principal (`index.html` & `styles.css`)  
**Documento:** `docs/05-novos-projetos-design.md`  
**Autor:** Senior UI/UX Architect (Agência Autônoma)  
**Status:** Aprovado para Implementação Frontend  
**Referência Estratégica:** `docs/04-novos-projetos-plano.md` e `docs/02-design-system.md`

---

## 1. Manifesto de Design: Erradicação da "Cara de IA"

Ferramentas modernas de desenvolvimento de software e segurança não toleram o design preguiçoso gerado por IA:
- **Banido:** O roxo degradê neon (`#490cf0` / `#8b5cf6`) clichê que virou sinônimo de template gerado por prompt.
- **Banido:** Bento grids caóticos sem propósito semântico, onde cards vazios preenchem espaço apenas para "parecer moderno".
- **Banido:** Simulações estáticas sem interatividade real.
- **Banido:** Textos robóticos e corporativos que não dizem nada sobre a engenharia de software subjacente.

### A Estética Dark / Tech Craftsmanship
Nossa linguagem visual é inspirada em ferramentas profissionais de alto calibre técnico — como **Linear**, **Raycast**, **pgAdmin Modern**, **Prisma Studio**, **1Password** e **Vercel**:
1. **Densidade de Informação Inteligente:** Aproveitamento consciente do espaço, com controles ergonômicos, tipografia cirúrgica e hierarquia rígida.
2. **Contraste e Profundidade Tátil:** Superfícies em escala de zinco escuro profundo (`#09090b` até `#1e1e24`), bordas milimétricas semitransparentes de 1px e elevações por sombra que criam planos visuais sem poluição.
3. **Cromática Funcional & Semântica:** Cores são reservadas estritamente para transmitir estado, tipo e criticidade técnica:
   - **Ciano (`#06b6d4` / `#22d3ee`):** Relações de dados, foreign keys, comandos ativos e fluxos primários.
   - **Âmbar / Ouro (`#f59e0b` / `#fbbf24`):** Chaves primárias (PK), avisos e métricas de atenção.
   - **Esmeralda (`#10b981` / `#34d399`):** Cifragem ativa, integridade criptográfica, status de tempo real e entropia máxima.
   - **Carmesim (`#f43f5e`):** Erros de sintaxe SQL, perda de sessão e risco de senha fraca.
4. **Tipografia de Engenharia:** Fonte sans-serif neutra de alta legibilidade (`Inter`) em simbiose com fonte monospace tabular (`JetBrains Mono`) para instruções SQL, hashes, chaves criptográficas e métricas.

---

## 2. Design Tokens CSS Compartilhados

As duas novas aplicações herdam e estendem o núcleo de design tokens do portfólio. As variáveis abaixo devem ser declaradas na raiz dos arquivos `styles.css` de cada aplicação:

```css
:root {
  /* ==========================================================================
     Superfícies & Fundos (Deep Zinc & Slate Tone)
     ========================================================================== */
  --bg-canvas: #09090b;             /* Fundo do viewport / canvas */
  --bg-canvas-subtle: #0d0d11;      /* Painéis laterais e barras de apoio */
  --bg-surface: #121216;            /* Cards, janelas e painéis primários */
  --bg-surface-elevated: #18181e;   /* Modais, menus flutuantes e tooltips */
  --bg-surface-hover: #1e1e26;      /* Hover em itens e botões */
  --bg-surface-active: #262630;     /* Estado pressionado/ativo */
  --bg-glass: rgba(18, 18, 22, 0.82); /* Toolbars flutuantes com backdrop-blur */

  /* ==========================================================================
     Bordas & Delimitações Estruturais
     ========================================================================== */
  --border-subtle: #23232a;         /* Borda padrão de 1px */
  --border-muted: #1c1c22;          /* Divisórias internas e linhas secundárias */
  --border-focus: #3f3f4e;          /* Foco de inputs e botões */
  --border-cyan: rgba(6, 182, 212, 0.35);  /* Foco e destaque relacional */
  --border-amber: rgba(245, 158, 11, 0.35);/* Destaque de chave primária */
  --border-emerald: rgba(16, 185, 129, 0.35); /* Destaque de segurança */

  /* ==========================================================================
     Tipografia & Cores de Texto
     ========================================================================== */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace;

  --text-primary: #f4f4f6;          /* Títulos e dados em foco */
  --text-secondary: #a1a1aa;        /* Textos explicativos e labels */
  --text-muted: #71717a;            /* Placeholders e metadados */
  --text-inverse: #09090b;          /* Texto sobre fundos coloridos */

  /* ==========================================================================
     Acentos Funcionais Técnicos
     ========================================================================== */
  --accent-cyan: #06b6d4;           /* Ciano para conexões e interatividades */
  --accent-cyan-hover: #22d3ee;
  --accent-cyan-bg: rgba(6, 182, 212, 0.1);
  --accent-cyan-glow: 0 0 20px -4px rgba(6, 182, 212, 0.35);

  --accent-amber: #f59e0b;          /* Dourado/Âmbar para Primary Keys */
  --accent-amber-hover: #fbbf24;
  --accent-amber-bg: rgba(245, 158, 11, 0.1);

  --accent-emerald: #10b981;        /* Esmeralda para Cofre / Criptografia Ativa */
  --accent-emerald-hover: #34d399;
  --accent-emerald-bg: rgba(16, 185, 129, 0.1);
  --accent-emerald-glow: 0 0 24px -4px rgba(16, 185, 129, 0.35);

  --accent-rose: #f43f5e;           /* Carmesim para erros de sintaxe e risco */
  --accent-rose-bg: rgba(244, 63, 94, 0.1);

  /* ==========================================================================
     Geometria, Raios & Sombras
     ========================================================================== */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 14px rgba(0, 0, 0, 0.6);
  --shadow-lg: 0 14px 34px -4px rgba(0, 0, 0, 0.75);
  --shadow-node: 0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 0 1px var(--border-subtle);
  --shadow-node-drag: 0 20px 40px -5px rgba(0, 0, 0, 0.9), 0 0 0 1px var(--accent-cyan);

  --transition-fast: 140ms cubic-bezier(0.16, 1, 0.3, 1);
  --transition-smooth: 240ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## 3. Especificação de UI/UX de `p_sqlerd` (SQL-to-ERD Schema Analyzer)

### 3.1. Visão Geral da Arquitetura de Interface
`p_sqlerd` opera no formato **Dual-Pane IDE Workspace**, otimizado para visualização imediata da transmutação de código relacional em grafos vetoriais.

```
+------------------------------------------------------------------------------------------------+
|  HEADER: [Logo p_sqlerd] [Status: Schema Valid] [Presets: E-Commerce v] [Export v] [GitHub]     |
+---------------------------------+--------------------------------------------------------------+
|  SIDEBAR: SQL DDL EDITOR        |  CANVAS: INTERACTIVE ERD GRAPH                               |
|  - Toolbar (Presets rápidos,    |  - Dot Matrix Background                                     |
|    Limpar, Contagem linhas)     |  - Draggable Table Nodes                                     |
|  - Code Editor Monospace        |  - Dynamic SVG Bézier Connectors                             |
|  - Erro / Diagnóstico Inline    |  - Hover Highlighter (Tabela e Relações)                     |
|  - CTA "Gerar Diagrama"         |  - Floating Controls HUD (Zoom, Fit, Reset, Search)          |
|    (Ctrl+Enter)                 |                                                              |
+---------------------------------+--------------------------------------------------------------+
```

### 3.2. Sidebar do Editor SQL (Painel Esquerdo - Largura 400px / Responsivo)
- **Cabeçalho do Editor:**
  - Título com badge de linguagem: `SQL DDL (PostgreSQL / MySQL / SQLite)`.
  - Botão de ação rápida `Carregar Preset` (dropdown com 4 esquemas prontos: E-Commerce, Streaming, LMS, Task Manager).
  - Botão `Limpar Código` (ícone de lixeira com confirmação suave).
- **Área do Editor de Código (`.sql-editor-container`):**
  - Textarea com tipografia `font-mono`, tamanho de fonte `13px`, altura de linha de `1.5`, sem redimensionamento manual e com rolagem suave customizada.
  - Barra lateral com contagem de linhas (`.line-numbers`) sincronizada com o scroll do textarea.
  - Suporte ao atalho global **`Ctrl + Enter`** (ou `Cmd + Enter`) para disparar a renderização do diagrama.
- **Painel de Diagnóstico Sintático (`.syntax-diagnostic-banner`):**
  - **Estado Válido:** Fita sutil esmeralda: `<i class="fas fa-check-circle"></i> Esquema analisado com sucesso (X tabelas, Y relacionamentos)`.
  - **Estado com Erro:** Banner carmesim pulsante: `<i class="fas fa-exclamation-triangle"></i> Linha 14: Referência inválida na tabela 'orders' para 'users(non_existent)'`.
- **Botão de Ação Primária:**
  - Botão largo de destaque: `Gerar Diagrama [Ctrl+Enter]`, fundo `--accent-cyan`, texto escuro em negrito, transformando-se em spinner de parsing instantâneo.

### 3.3. Canvas Interativo & Grafo Relacional (Painel Direito - Flex-1)
- **Fundo com Grid de Pontos (Dot Matrix Background):**
  - Padrão vetorial de pontos sutis em grade de 24px:
    ```css
    background-color: var(--bg-canvas);
    background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1.2px, transparent 1.2px);
    background-size: 24px 24px;
    ```
- **Camada Vetorial de Conexões (`svg.erd-connections-layer`):**
  - Ocupa `100%` da largura e altura do canvas com `pointer-events: none` (exceto nas linhas clicáveis/hoverable).
  - **Cálculo de Curvas Bézier Cúbicas:**
    As curvas saem da borda direita da tabela de origem e entram na borda esquerda da tabela de destino (ou vice-versa com base na posição relativa X dos nós).
    ```
    M (x1, y1) C (x1 + deltaX * 0.45, y1) (x2 - deltaX * 0.45, y2) (x2, y2)
    ```
  - **Estilização das Linhas:**
    - *Default:* `stroke: rgba(6, 182, 212, 0.45); stroke-width: 2px; stroke-dasharray: none; fill: none;`
    - *Hover / Tabela Selecionada:* `stroke: #22d3ee; stroke-width: 3.5px; filter: drop-shadow(0 0 6px rgba(6, 182, 212, 0.7));`
    - *Marcador de Cardinalidade:* Marcador SVG no destino exibindo uma seta ou círculo estilizado ("Crow's Foot" geométrico para cardinalidade 1:N).

- **Nós de Tabela Interativos (`.erd-node`):**
  - Estrutura HTML semântica:
    ```html
    <div class="erd-node" data-table="orders" style="transform: translate3d(420px, 180px, 0);">
      <div class="erd-node-header">
        <div class="erd-node-title">
          <i class="fas fa-table node-icon"></i>
          <span class="table-name">orders</span>
        </div>
        <span class="column-count-badge">5 cols</span>
      </div>
      <div class="erd-columns-list">
        <div class="erd-column is-pk">
          <span class="col-indicator"><i class="fas fa-key pk-icon"></i></span>
          <span class="col-name">id</span>
          <span class="col-type">BIGINT</span>
        </div>
        <div class="erd-column is-fk">
          <span class="col-indicator"><i class="fas fa-link fk-icon"></i></span>
          <span class="col-name">user_id</span>
          <span class="col-type">BIGINT</span>
        </div>
        <div class="erd-column">
          <span class="col-indicator"></span>
          <span class="col-name">total_amount</span>
          <span class="col-type">DECIMAL(10,2)</span>
        </div>
      </div>
    </div>
    ```
  - **Estados e Interações dos Nós:**
    - *Header Draggable:* Cursor `grab` no cabeçalho; ao clicar e arrastar, torna-se `grabbing`, aplicando `var(--shadow-node-drag)`.
    - *Realce Relacional (Hover Focus):* Ao passar o mouse sobre uma tabela, todas as tabelas não conectadas recebem `opacity: 0.35`, enquanto as tabelas ligadas e seus conectores brilham em ciano.
    - *Destaque de Chaves:*
      - Chave Primária (`.is-pk`): Ícone de chave em `--accent-amber` (`#f59e0b`), texto da coluna em negrito.
      - Chave Estrangeira (`.is-fk`): Ícone de link em `--accent-cyan` (`#06b6d4`), com tooltip indicando a tabela referenciada.

### 3.4. Floating Viewport Toolbar (HUD Flutuante)
Localizada no canto inferior direito do canvas (`position: absolute; bottom: 24px; right: 24px;`):
- Componentes do HUD:
  - **Zoom Controls:** Botões `+` (Zoom In), `-` (Zoom Out), `100%` (Reset Zoom).
  - **Fit to Viewport:** Botão com ícone `<i class="fas fa-expand"></i>` que calcula a bounding-box de todos os nós e ajusta pan/zoom automaticamente.
  - **Busca Rápida de Entidade:** Campo retrátil que filtra tabelas por nome e centraliza o nó correspondente.
  - **Menu de Exportação:**
    - `Exportar SVG` (Download instantâneo de diagrama vetorial escalável).
    - `Exportar PNG` (Renderização em alta densidade 2x via canvas offscreen).
    - `Copiar JSON Schema` (Para interoperabilidade de dados).

---

## 4. Especificação de UI/UX de `p_vault` (Zero-Knowledge Secret Vault)

### 4.1. Filosofia de UX: Cibersegurança Cirúrgica & Confiança Absoluta
O design de `p_vault` deve comunicar imediatamente sofisticação criptográfica e proteção inviolável. Não é um gerenciador de senhas casual — é um **bunker de dados volátil (RAM-Only)** operando sob o rigor da **Web Crypto API**.

### 4.2. Estado 1: Tela de Boas-Vindas & Criação do Cofre (Setup Wizard)
Aparece quando nenhum cofre criptografado existe no armazenamento local:
- **Hero de Segurança:**
  - Ícone de Escudo Criptográfico com glow verde esmeralda suave (`0 0 35px -6px rgba(16, 185, 129, 0.4)`).
  - Título: `Bunker Criptográfico de Conhecimento Zero`.
  - Subtítulo: `Cifragem de padrão militar AES-GCM 256 bits com derivação PBKDF2 (100.000 iterações). Nenhuma credencial toca servidores ou discos descriptografada.`
- **Formulário de Inicialização:**
  - Campo `Criar Senha Mestre` com Medidor Dinâmico de Entropia integrado.
  - Campo `Confirmar Senha Mestre`.
  - **Callout de Segurança Inegociável:**
    > [!IMPORTANT]
    > **Aviso Zero-Knowledge:** Nós não temos servidores, não temos chaves de recuperação e não temos acesso aos seus dados. Se você esquecer sua Senha Mestre, seus dados serão permanentemente irrecuperáveis.
  - Botão Primário: `Inicializar Cofre Seguro`.
  - Botão Secundário: `Restaurar Backup Existente (.vault)`.

### 4.3. Estado 2: Tela de Bloqueio (Lock Screen)
Aparece quando existe um cofre persistido, ou após timeout de inatividade:
- Card central compacto e ultra focado (`max-width: 440px`), com efeito de vidro escuro (`--bg-surface-elevated` com `border: 1px solid var(--border-subtle)`).
- Badge de Algoritmo Ativo: `<span class="crypto-badge"><i class="fas fa-lock"></i> AES-GCM 256-BIT ATIVO</span>`.
- Campo de Senha Mestre com botão de revelar temporário (olho) e atalho `Enter`.
- Animação de `shake` tátil horizontal no card em caso de senha incorreta.
- Botão "Desbloquear Cofre" com feedback de processamento de PBKDF2 (derivação de 100k hashes leva ~150-250ms).

### 4.4. Estado 3: Workspace Seguro do Cofre Desbloqueado
Uma vez autenticado, a interface desbloqueia o painel de gerenciamento em RAM:

```
+------------------------------------------------------------------------------------------------+
|  HEADER: [Shield p_vault] [Status: AES-256 RAM ONLY]  [Auto-Lock: 04:32 (Renovar)]  [Lock Now] |
+------------------------------------------------------------------------------------------------+
|  SUB-BAR: [Search secrets /]  [Filtros: Todos(8) Logins(4) API Keys(2) Servidores(1) Notas(1)]|
|           [+ Novo Segredo] [Backup & Export v]                                                 |
+------------------------------------------------------------------------------------------------+
|  GRID DE CREDENCIAIS (Cards estilizados com cópia rápida e máscaras de proteção)               |
|                                                                                                |
|  [ CARD: AWS Prod Key ]         [ CARD: GitHub Token ]          [ CARD: Banco Central DB ]     |
|  - Categoria: API Key           - Categoria: Developer          - Categoria: Servidor          |
|  - Usuário: arn:aws:iam:...     - Usuário: sanjrhoff            - Host: 10.0.4.12:5432         |
|  - Segredo: ************ [Copy] - Segredo: ************ [Copy]  - Senha: ************ [Copy]   |
|  - Auto-Clear: 15s Timer        - Auto-Clear: 15s Timer         - Auto-Clear: 15s Timer        |
+------------------------------------------------------------------------------------------------+
```

#### Anatomia do Card de Credencial (`.secret-card`):
- **Cabeçalho do Card:**
  - Ícone de Categoria com cor temática (Azul para Logins, Ciano para API Keys, Roxo para Servidores, Âmbar para Notas).
  - Nome do Serviço/Aplicação em negrito.
  - Tag de Categoria e botão de ações contextuais (Editar, Deletar).
- **Corpo da Credencial:**
  - Linha de Usuário / Identificador com botão de cópia de 1 clique.
  - Linha de Senha / Chave Cifrada:
    - Renderizada por padrão como pontos de segurança (`••••••••••••`).
    - Botão de Visualização Rápida (revela o texto em `font-mono` sob clique contínuo ou toggle).
    - Botão de Cópia Segura com ativação imediata do **Temporizador de Auto-Clear**.
- **Indicador de Proteção do Clipboard:**
  - Ao copiar, exibe um chip animado: `<i class="fas fa-clipboard-check"></i> Copiado! Limpando área de transferência em 15s`.

### 4.5. Gerador de Senhas Integrado & Medidor Dinâmico de Entropia
Disponível tanto no modal de criação quanto como ferramenta utilitária rápida:
- **Display da Senha Gerada:**
  - Caixa de texto ampla com tipografia `JetBrains Mono` em tamanho `18px`.
  - **Sintaxe Colorida dos Caracteres:**
    - Letras Minúsculas: `--text-primary` (`#f4f4f6`)
    - Letras Maiúsculas: `--accent-cyan` (`#06b6d4`)
    - Números: `--accent-amber` (`#f59e0b`)
    - Símbolos Especiais: `--accent-emerald` (`#10b981`)
- **Controles de Parâmetros:**
  - Slider ergonômico de comprimento: `8` a `64` caracteres (valor numérico atualizado em tempo real).
  - Toggles técnicos com visual estilo interruptor:
    - `[x] Letras Maiúsculas (A-Z)`
    - `[x] Letras Minúsculas (a-z)`
    - `[x] Números (0-9)`
    - `[x] Símbolos Especiais (!@#$%^&*)`
    - `[x] Evitar Caracteres Ambíguos (0, O, l, 1, I)`
- **Medidor Dinâmico de Entropia:**
  - Barra de progresso contínua com gradiente de 5 estados:
    - **< 40 bits:** Vermelho Carmesim (`#f43f5e`) — *Risco Crítico / Vulnerável*
    - **40 - 59 bits:** Laranja Alerta (`#fb923c`) — *Fraca*
    - **60 - 79 bits:** Âmbar (`#f59e0b`) — *Boa / Uso Padrão*
    - **80 - 119 bits:** Verde-limão (`#84cc16`) — *Forte*
    - **≥ 120 bits:** Esmeralda Vibrante (`#10b981`) — *Nível Criptográfico Militar*
  - Exibição de Métricas Matemáticas: `Entropia: 128.4 bits • Tempo de quebra estimado: 14.8 trilhões de anos (Força Bruta GPU)`.

### 4.6. Temporizador de Inatividade & Auto-Lock
- Contador regressivo no header (padrão de 5 minutos, configurável).
- Ao atingir os últimos 30 segundos, o contador pulsa em âmbar.
- Se o tempo expirar sem movimento do mouse ou teclado, o cofre dispara `lockVault()`:
  - Limpa todas as credenciais em RAM.
  - Sobrescreve as variáveis com arrays nulos.
  - Redireciona imediatamente para a tela de bloqueio.

---

## 5. Especificação dos Novos Mockups para o Portfólio Principal (`index.html`)

A landing page principal receberá os 2 novos projetos no topo absoluto da seção **Case Studies Arquiteturais**, demonstrando domínio em engenharia de dados e criptografia.

### 5.1. Atualização da Telemetria (Hero Section)
- O card `APLICAÇÕES VIVAS` é atualizado:
  - Valor: **`9`**
  - Legenda: `100% funcionais no cliente (Zero Server)`

### 5.2. Mockup do Case Study #1: `p_sqlerd` (SQL-to-ERD Schema Analyzer)
- **Cabeçalho da Janela Simulada:**
  - Controles de janela (bolinhas vermelha, amarela, verde).
  - Título do arquivo: `sql-to-erd.visualizer.app`.
  - Status Pill: `<span class="status-pulse-dot"></span> LIVE PARSER`.
- **Estrutura Visual Interna do Mockup:**
  Uma divisão visual em duas colunas demonstrando o editor e o grafo relacional gerado:

```html
<div class="window-preview mockup-sqlerd">
  <div class="mock-erd-layout">
    <!-- Painel Esquerdo: Código SQL DDL -->
    <div class="mock-erd-code-col">
      <div class="mock-code-header">
        <span class="mock-code-tag"><i class="fas fa-code"></i> schema.sql</span>
        <span class="mock-code-badge">DDL Parser</span>
      </div>
      <pre class="mock-sql-pre"><code><span class="sql-kw">CREATE TABLE</span> <span class="sql-tbl">users</span> (
  <span class="sql-col">id</span> <span class="sql-type">BIGINT</span> <span class="sql-pk">PRIMARY KEY</span>,
  <span class="sql-col">email</span> <span class="sql-type">VARCHAR</span> <span class="sql-kw">UNIQUE</span>,
  <span class="sql-col">created_at</span> <span class="sql-type">TIMESTAMP</span>
);

<span class="sql-kw">CREATE TABLE</span> <span class="sql-tbl">orders</span> (
  <span class="sql-col">id</span> <span class="sql-type">BIGINT</span> <span class="sql-pk">PRIMARY KEY</span>,
  <span class="sql-col">user_id</span> <span class="sql-type">BIGINT</span> <span class="sql-fk">REFERENCES</span> <span class="sql-tbl">users</span>(id),
  <span class="sql-col">total</span> <span class="sql-type">DECIMAL</span>
);</code></pre>
    </div>

    <!-- Painel Direito: Grafo Relacional Interativo -->
    <div class="mock-erd-canvas-col">
      <div class="mock-canvas-badge">
        <i class="fas fa-project-diagram"></i> AST &rarr; Dynamic SVG
      </div>

      <!-- Tabela 1: users -->
      <div class="mock-table-card table-users">
        <div class="mock-tbl-hdr">
          <i class="fas fa-table"></i> users
        </div>
        <div class="mock-tbl-row pk-row">
          <span><i class="fas fa-key"></i> id</span> <span class="type-tag">BIGINT</span>
        </div>
        <div class="mock-tbl-row">
          <span>email</span> <span class="type-tag">VARCHAR</span>
        </div>
      </div>

      <!-- SVG Bézier Connector -->
      <svg class="mock-erd-svg" viewBox="0 0 200 120">
        <path d="M 95 45 C 130 45, 120 85, 155 85" stroke="#06b6d4" stroke-width="2.5" fill="none" stroke-dasharray="3 3"/>
        <circle cx="155" cy="85" r="3.5" fill="#06b6d4" />
      </svg>

      <!-- Tabela 2: orders -->
      <div class="mock-table-card table-orders">
        <div class="mock-tbl-hdr">
          <i class="fas fa-table"></i> orders
        </div>
        <div class="mock-tbl-row pk-row">
          <span><i class="fas fa-key"></i> id</span> <span class="type-tag">BIGINT</span>
        </div>
        <div class="mock-tbl-row fk-row">
          <span><i class="fas fa-link"></i> user_id</span> <span class="type-tag">BIGINT</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

- **Ações Obrigatórias do Case Study:**
  - Botão Primário: `<a href="./p_sqlerd/index.html" target="_blank" class="btn btn-primary"><i class="fas fa-play"></i> Ver Aplicação</a>`
  - Botão Secundário: `<a href="https://github.com/sanjrhoff/portifolio/blob/main/p_sqlerd/index.html" target="_blank" class="btn btn-secondary"><i class="fab fa-github"></i> Ver Código</a>`
  - Botão Preview: `<button class="btn btn-outline preview-trigger-btn" data-app-url="./p_sqlerd/index.html" data-app-title="SQL-to-ERD Schema Analyzer"><i class="fas fa-terminal"></i> Preview Interativo</button>`

### 5.3. Mockup do Case Study #2: `p_vault` (Zero-Knowledge Secret Vault)
- **Cabeçalho da Janela Simulada:**
  - Controles de janela.
  - Título do arquivo: `zero-knowledge-vault.shield.app`.
  - Status Pill: `<span class="status-pulse-dot emerald"></span> ENCRYPTED RAM`.
- **Estrutura Visual Interna do Mockup:**
  Demonstração da barra de segurança e das credenciais cifradas com indicador de entropia:

```html
<div class="window-preview mockup-vault">
  <div class="mock-vault-ui">
    <div class="mock-vault-top-bar">
      <div class="mock-vault-status">
        <i class="fas fa-shield-alt text-emerald"></i>
        <span>PBKDF2 100k + AES-GCM 256-bit</span>
      </div>
      <div class="mock-autolock-tag">
        <i class="fas fa-stopwatch"></i> Auto-Lock: 04:58
      </div>
    </div>

    <div class="mock-vault-grid">
      <!-- Card Credencial 1 -->
      <div class="mock-secret-item">
        <div class="secret-item-header">
          <span class="secret-name"><i class="fas fa-key text-cyan"></i> AWS Production Key</span>
          <span class="badge-cat">API Key</span>
        </div>
        <div class="secret-mask-row">
          <span class="masked-dots">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span>
          <span class="mock-copy-btn"><i class="fas fa-copy"></i></span>
        </div>
      </div>

      <!-- Card Credencial 2 -->
      <div class="mock-secret-item">
        <div class="secret-item-header">
          <span class="secret-name"><i class="fas fa-server text-amber"></i> Database Cluster Master</span>
          <span class="badge-cat">Servidor</span>
        </div>
        <div class="secret-mask-row">
          <span class="masked-dots">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span>
          <span class="mock-copy-btn"><i class="fas fa-copy"></i></span>
        </div>
      </div>
    </div>

    <!-- Entropy Bar Preview -->
    <div class="mock-entropy-container">
      <div class="mock-entropy-labels">
        <span>Entropia da Chave Mestre</span>
        <span class="text-emerald font-mono">128 bits &bull; Inquebrável</span>
      </div>
      <div class="mock-entropy-track">
        <div class="mock-entropy-fill" style="width: 100%;"></div>
      </div>
    </div>
  </div>
</div>
```

- **Ações Obrigatórias do Case Study:**
  - Botão Primário: `<a href="./p_vault/index.html" target="_blank" class="btn btn-primary"><i class="fas fa-shield-alt"></i> Ver Aplicação</a>`
  - Botão Secundário: `<a href="https://github.com/sanjrhoff/portifolio/blob/main/p_vault/index.html" target="_blank" class="btn btn-secondary"><i class="fab fa-github"></i> Ver Código</a>`
  - Botão Preview: `<button class="btn btn-outline preview-trigger-btn" data-app-url="./p_vault/index.html" data-app-title="Zero-Knowledge Secret Vault"><i class="fas fa-terminal"></i> Preview Interativo</button>`

### 5.4. Atualização dos Filtros do Diretório Técnico / Laboratório
A barra de categorias do catálogo (`#laboratorio`) recebe a nova taxonomia técnica especializada:
- `Todos (9)`
- `Bancos de Dados & Criptografia (2)` *(Novo filtro especialista)*
- `Produtividade & Web APIs (4)`
- `Jogos & Estado (2)`
- `Utilitários & APIs (1)`

---

## 6. Folha de Estilos de Suporte para Mockups (`styles.css` do Portfólio)

Para suportar perfeitamente a renderização dos novos mockups visuais em `index.html`, os seguintes blocos CSS devem ser anexados ao `styles.css` principal do portfólio:

```css
/* ==========================================================================
   MOCKUP ESPECÍFICO: SQL-to-ERD Analyzer (p_sqlerd)
   ========================================================================== */
.mockup-sqlerd {
  background: #09090c;
  padding: 18px;
  min-height: 280px;
  display: flex;
  align-items: stretch;
}

.mock-erd-layout {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 16px;
  width: 100%;
}

.mock-erd-code-col {
  background: #111115;
  border: 1px solid #23232a;
  border-radius: var(--radius-sm);
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.mock-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--text-muted);
}

.mock-code-badge {
  background: var(--accent-cyan-bg);
  color: var(--accent-cyan);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  font-weight: 600;
}

.mock-sql-pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 11.5px;
  line-height: 1.5;
  color: #c9d1d9;
  overflow: hidden;
}

.sql-kw { color: #ff7b72; font-weight: 600; }
.sql-tbl { color: #79c0ff; font-weight: 600; }
.sql-col { color: #d2a8ff; }
.sql-type { color: #ffa657; }
.sql-pk { color: #f59e0b; font-weight: 600; }
.sql-fk { color: #06b6d4; font-weight: 600; }

.mock-erd-canvas-col {
  position: relative;
  background: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 14px 14px;
  background-color: #0c0c10;
  border: 1px solid #23232a;
  border-radius: var(--radius-sm);
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.mock-canvas-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  font-family: var(--font-mono);
  color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid rgba(6, 182, 212, 0.25);
  padding: 2px 6px;
  border-radius: var(--radius-xs);
}

.mock-table-card {
  width: 140px;
  background: #141419;
  border: 1px solid #2d2d38;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  z-index: 2;
}

.table-users { align-self: flex-start; }
.table-orders { align-self: flex-end; }

.mock-tbl-hdr {
  background: #1c1c24;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  padding: 5px 8px;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  border-bottom: 1px solid #2d2d38;
}

.mock-tbl-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-secondary);
}

.mock-tbl-row.pk-row { color: #fbbf24; font-weight: 500; }
.mock-tbl-row.fk-row { color: #22d3ee; }
.type-tag { font-size: 9px; color: var(--text-muted); }

.mock-erd-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

/* ==========================================================================
   MOCKUP ESPECÍFICO: Zero-Knowledge Secret Vault (p_vault)
   ========================================================================== */
.mockup-vault {
  background: #0a0a0d;
  padding: 20px;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mock-vault-ui {
  width: 100%;
  max-width: 480px;
  background: #121217;
  border: 1px solid #23232b;
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}

.mock-vault-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #1f1f26;
  font-size: 11px;
  font-family: var(--font-mono);
}

.mock-vault-status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #34d399;
  font-weight: 500;
}

.mock-autolock-tag {
  color: var(--text-muted);
}

.mock-vault-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.mock-secret-item {
  background: #17171f;
  border: 1px solid #282833;
  border-radius: var(--radius-sm);
  padding: 10px 12px;
}

.secret-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.secret-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-cat {
  font-size: 10px;
  font-family: var(--font-mono);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  padding: 2px 6px;
  border-radius: 4px;
}

.secret-mask-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.masked-dots {
  font-family: var(--font-mono);
  font-size: 14px;
  letter-spacing: 2px;
  color: var(--text-muted);
}

.mock-copy-btn {
  font-size: 11px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.04);
}

.mock-entropy-container {
  background: #0d0d12;
  border-radius: var(--radius-sm);
  padding: 10px;
  border: 1px solid #1a1a22;
}

.mock-entropy-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 6px;
  color: var(--text-secondary);
}

.mock-entropy-track {
  height: 5px;
  background: #1f1f28;
  border-radius: 99px;
  overflow: hidden;
}

.mock-entropy-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: 99px;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

@media (max-width: 768px) {
  .mock-erd-layout {
    grid-template-columns: 1fr;
  }
}
```

---

## 7. Critérios de Avaliação de UI/UX & Validação

| Critério | Validação Obrigatória |
| :--- | :--- |
| **Erradicação do Roxo Genérico** | Nenhuma aplicação nova usará degradês roxos neon. Paleta estritamente focada em Zinco (`#09090b`), Ciano (`#06b6d4`), Âmbar (`#f59e0b`) e Esmeralda (`#10b981`). |
| **Taxa de Quadros a 60 FPS** | O arraste dos nós no `p_sqlerd` recalcula as linhas Bézier via `requestAnimationFrame` sem engasgos ou layout thrashing. |
| **Contraste de Acessibilidade (WCAG AA)** | Todos os textos sobre fundo escuro possuem razão de contraste mínima de 4.5:1. Ícones e badges possuem rótulos semânticos (`aria-label` ou `title`). |
| **Interatividade Tangível** | Em `p_sqlerd`, os nós respondem a drag-and-drop, zoom por scroll e clique em conexões. Em `p_vault`, o gerador recalcula entropia instantaneamente a cada tecla ou clique no slider. |
| **Integração Visual com o Portfólio** | Os mockups em `index.html` possuem a mesma linguagem visual das janelas de software de `p_pomodoro` e `p_memory`, elevando a percepção de excelência de Sandro. |

---

*Documento homologado pelo Senior UI/UX Architect. Pronto para execução e montagem de código pelos Engenheiros Frontend.*
