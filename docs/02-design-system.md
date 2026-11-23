# 🎨 Especificação de UI/UX & Design System: Dark / Tech Craftsmanship
**Projeto:** Redesign do Portfólio de Engenharia de Software — Sandro  
**Documento:** `docs/02-design-system.md`  
**Autor:** Senior UI/UX Architect  
**Status:** Aprovado para Implementação Frontend  
**Referência:** `docs/01-plano.md`

---

## 1. Manifesto de Design & Erradicação da "Cara de IA"

A vasta maioria dos portfólios gerados por prompts rápidos sofre de uma síndrome visual padronizada:
- **Roxo e degradê saturado (`#490cf0`, roxo neon genérico)** espalhado em todos os cantos.
- **Bento grids vazios** que colocam cards sem hierarquia visual, com bordas exageradas e textos sem substância.
- **Cards clones:** 6 a 8 retângulos com os mesmos ícones de FontAwesome genéricos e nenhum preview visual tangível do que o software realmente faz.
- **Linguagem corporativa artificial:** Textos que dizem "construindo o futuro da web" sem provar nenhuma competência técnica real.

### Nossa Abordagem: Dark / Tech Craftsmanship
Inspirado na linguagem visual de ferramentas de alta densidade técnica (como **Linear**, **Raycast**, **GitHub**, **Vercel** e **Stripe Developer Documentation**):
1. **Paleta Base Sóbria e Cirúrgica:** Subtons de zinco profundo (`#09090b`), grafite escuro (`#121215`) e cinzas neutros para superfícies e bordas milimétricas (`#27272a`).
2. **Acentos Funcionais com Significado:** 
   - **Ciano (`#06b6d4` / `#22d3ee`):** Destaque de interatividade, comandos e links.
   - **Esmeralda (`#10b981`):** Status de tempo real, integridade de build, uptime e disponibilidade.
   - **Âmbar (`#f59e0b`):** Métricas de performance, testes e experimentalismo.
3. **Mockups de Engenharia em Vez de Cards Abstratos:** Os projetos principais (Case Studies) são apresentados em janelas de terminal/navegador simuladas, revelando a interface real e destacando o problema de engenharia resolvido.
4. **Tipografia Híbrida Editorial + Monospace:** `Inter` para clareza tipográfica imediata e `JetBrains Mono` para atributos técnicos, badges, caminhos de arquivo e métricas.

---

## 2. Design Tokens Oficiais (CSS Variables)

A implementação no `styles.css` deve declarar rigorosamente as seguintes variáveis no `:root`:

```css
:root {
  /* ==========================================================================
     1. Superfícies & Cores de Fundo (Zinc Scale)
     ========================================================================== */
  --bg-canvas: #09090b;             /* Fundo mestre da página */
  --bg-canvas-subtle: #0d0d10;      /* Seções com leve contraste */
  --bg-surface: #121215;            /* Superfície padrão de cards e containers */
  --bg-surface-elevated: #18181b;   /* Modais, popups e elementos sobrepostos */
  --bg-surface-hover: #1f1f23;      /* Estado hover de cards e linhas */
  --bg-surface-active: #27272a;     /* Estado pressionado/ativo */
  --bg-glass: rgba(18, 18, 21, 0.75); /* Header e toolbars com backdrop-blur */

  /* ==========================================================================
     2. Linhas & Bordas Geométricas
     ========================================================================== */
  --border-subtle: #27272a;         /* Delimitação padrão (1px solid) */
  --border-muted: #1e1e22;          /* Linhas internas de separação */
  --border-focus: #3f3f46;          /* Foco de hover e inputs */
  --border-accent: rgba(6, 182, 212, 0.4); /* Destaque sutil ciano em foco */

  /* ==========================================================================
     3. Tipografia & Cores de Texto
     ========================================================================== */
  --text-primary: #f4f4f5;          /* Títulos e leitura primária (alta legibilidade) */
  --text-secondary: #a1a1aa;        /* Parágrafos, labels e descrições */
  --text-muted: #71717a;            /* Metadados, carimbos, atalhos */
  --text-inverse: #09090b;          /* Texto sobre fundos de destaque sólidos */

  /* ==========================================================================
     4. Cores de Destaque Técnico (Accent Colors - Sem Roxo Genérico!)
     ========================================================================== */
  --accent-cyan: #06b6d4;           /* Ciano primário */
  --accent-cyan-hover: #22d3ee;     /* Ciano hover */
  --accent-cyan-bg: rgba(6, 182, 212, 0.08); /* Fundo de tags/badges ciano */
  --accent-cyan-border: rgba(6, 182, 212, 0.25);

  --accent-emerald: #10b981;        /* Status Ativo / Online */
  --accent-emerald-hover: #34d399;
  --accent-emerald-bg: rgba(16, 185, 129, 0.1);
  --accent-emerald-border: rgba(16, 185, 129, 0.25);

  --accent-amber: #f59e0b;          /* Métricas e Alertas */
  --accent-amber-hover: #fbbf24;
  --accent-amber-bg: rgba(245, 158, 11, 0.1);
  --accent-amber-border: rgba(245, 158, 11, 0.25);

  --accent-rose: #f43f5e;           /* Window close button / Erros */
  --accent-indigo: #6366f1;         /* Acento complementar discreto se necessário */

  /* ==========================================================================
     5. Tipografia (Famílias e Escala)
     ========================================================================== */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;

  --text-xs: 0.75rem;     /* 12px - Badges, breadcrumbs, keys */
  --text-sm: 0.875rem;    /* 14px - Metadados, botões secundários */
  --text-base: 1rem;      /* 16px - Texto corrido base */
  --text-lg: 1.125rem;    /* 18px - Subtítulos e leadings */
  --text-xl: 1.25rem;     /* 20px - Títulos de cards médios */
  --text-2xl: 1.5rem;     /* 24px - Títulos de seção */
  --text-3xl: 2rem;       /* 32px - Títulos de destaque */
  --text-4xl: 2.75rem;    /* 44px - Hero Title */
  --text-5xl: 3.5rem;     /* 56px - Display numérico */

  /* ==========================================================================
     6. Espaçamento Modular (Base 4px / 8px)
     ========================================================================== */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */

  /* ==========================================================================
     7. Raios de Borda (Border Radius)
     ========================================================================== */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* ==========================================================================
     8. Elevações, Sombras & Glows
     ========================================================================== */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 12px 32px -4px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(0, 0, 0, 0.5);
  --shadow-modal: 0 24px 64px -8px rgba(0, 0, 0, 0.9), 0 0 0 1px var(--border-subtle);
  --glow-cyan: 0 0 30px -8px rgba(6, 182, 212, 0.25);
  --glow-subtle: 0 0 40px -12px rgba(255, 255, 255, 0.05);

  /* ==========================================================================
     9. Transições & Animações
     ========================================================================== */
  --transition-fast: 150ms cubic-bezier(0.16, 1, 0.3, 1);
  --transition-normal: 250ms cubic-bezier(0.16, 1, 0.3, 1);
  --transition-slow: 400ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## 3. Tipografia & Hierarquia de Leitura

### Font Imports
Inclusão via Google Fonts otimizada:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### Regras de Aplicação Tipográfica
| Papel | Família | Peso | Tamanho | Espaçamento de Linha / Tracking |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | `Inter` | 700 (Bold) | `clamp(2rem, 5vw, 3rem)` | `line-height: 1.15; letter-spacing: -0.03em;` |
| **Section Title** | `Inter` | 600 (SemiBold) | `clamp(1.5rem, 3vw, 2rem)` | `line-height: 1.25; letter-spacing: -0.02em;` |
| **Card Heading** | `Inter` | 600 (SemiBold) | `1.25rem (20px)` | `line-height: 1.35; letter-spacing: -0.01em;` |
| **Body / Parágrafos** | `Inter` | 400 (Regular) | `1rem (16px)` | `line-height: 1.6; letter-spacing: -0.005em;` |
| **Badges de Stack** | `JetBrains Mono`| 500 (Medium) | `0.75rem (12px)` | `letter-spacing: 0.02em; text-transform: uppercase;` |
| **Comandos / Métricas**| `JetBrains Mono`| 600 (SemiBold) | `0.875rem (14px)` | `letter-spacing: -0.01em;` |
| **Status Uptime** | `JetBrains Mono`| 500 (Medium) | `0.8125rem (13px)`| `letter-spacing: 0.01em;` |

---

## 4. Arquitetura Detalhada dos Componentes

### 4.1. Header de Navegação (`.site-header`)
Barra fixa superior com sensação de console limpo.

- **Comportamento:** `position: sticky; top: 0; z-index: 100;`
- **Fundo:** `var(--bg-glass)` com `backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);`
- **Borda Inferior:** `1px solid var(--border-subtle)`
- **Elementos Integrados:**
  1. **Brand Identity:** Monograma ou tag de terminal `sandro.dev` com acento ciano no ponto.
  2. **Status Operacional Pill:**
     - Container oval com fundo esmeralda translúcido (`--accent-emerald-bg`), borda esmeralda sutil.
     - Indicador com animação *pulse* (`@keyframes pulse-dot`): bolinha verde de 8px com anel de onda suave.
     - Texto: `"🟢 Disponível para projetos & estágio"`.
  3. **Nav Links:** Links discretos com hover suave para `#destaques`, `#diretorio`, `#sobre`.
  4. **GitHub Fast Link:** Botão com ícone GitHub e handle `@sanjrhoff` com borda sutil e hover brilhante.

```html
<!-- Exemplo estrutural do Header -->
<header class="site-header">
  <div class="header-container">
    <a href="#" class="brand-logo">
      <span class="brand-bracket">&lt;</span>sandro<span class="brand-dot">.</span>dev<span class="brand-bracket">/&gt;</span>
    </a>
    
    <div class="status-pill">
      <span class="status-dot"></span>
      <span class="status-text">Disponível para projetos &amp; estágio</span>
    </div>

    <nav class="nav-links">
      <a href="#destaques" class="nav-link">Destaques</a>
      <a href="#diretorio" class="nav-link">Laboratório</a>
      <a href="#sobre" class="nav-link">Sobre</a>
      <a href="https://github.com/sanjrhoff" target="_blank" rel="noopener" class="btn btn-sm btn-ghost">
        <i class="fab fa-github"></i> GitHub
      </a>
    </nav>
  </div>
</header>
```

---

### 4.2. Hero Section com Console de Métricas Reais (`.hero-section`)
Eliminação total de frases clichês. O visitante descobre imediatamente que Sandro é um desenvolvedor com foco em execução, código limpo e arquitetura cliente de alto desempenho.

- **Background:** Efeito sutil de gradiente radial (`radial-gradient(circle at 50% 20%, rgba(6, 182, 212, 0.07) 0%, transparent 60%)`).
- **Headline Técnica:**
  - Label pré-título: `// ENGENHARIA DE SOFTWARE FRONTEND` (em `JetBrains Mono`, ciano).
  - Título Principal: **"Aplicações interativas com JavaScript Puro, Web APIs modernas e zero dependências pesadas."**
  - Subtexto: *"Estudante e construtor focado em fundamentos sólidos da web: manipulação avançada de DOM, máquinas de estado sem frameworks e interfaces pensadas no usuário."*
- **Engineering Stats Console (`.hero-console`):**
  Uma barra horizontal dividida ou mini-painel simulando telemetria:
  - **7** `Aplicações Funcionais no Repositório`
  - **0** `Dependências Pesadas de Build`
  - **100%** `Compatível com GitHub Pages`
  - **< 200ms** `Carregamento Instantâneo`
- **Call-To-Actions (CTAs):**
  - **Primário:** `[Explorar Projetos em Destaque ↓]` (fundo ciano, texto escuro, elevação com glow).
  - **Secundário:** `[Ver Repositório no GitHub ↗]` (outline com borda `--border-subtle`, hover com borda branca e ícone).

---

### 4.3. Componente "Case Study em Destaque" (`.case-study-card`)
A jóia visual do portfólio. Em vez de um card abstrato com um ícone no meio, cada um dos 3 projetos de destaque ganha uma vitrine editorial com **janela de sistema operacional simulada**.

#### Os 3 Case Studies Principais:
1. **Pomodoro Timer Pro** (`p_pomodoro`) — Destaque: Document Picture-in-Picture API & Finite State Machine.
2. **Tavern's Memory RPG** (`p_memory`) — Destaque: Game Loop assíncrono, CSS 3D Transforms e algoritmo Fisher-Yates.
3. **Markdown Notes & Previewer Suite** (`p_markdown` & `p_notes`) — Destaque: Compilação de Markdown cliente, sanitização XSS com DOMPurify e persistência LocalStorage.

#### Anatomia da Janela Simulada (`.window-frame`):
- **Barra de Janela Superior (`.window-header`):**
  - Três círculos de controle estilo macOS/Unix: Fechar (vermelho `--accent-rose`), Minimizar (âmbar `--accent-amber`), Expandir (verde `--accent-emerald`).
  - Título da janela centralizado em `JetBrains Mono`: ex: `pomodoro-timer-pro.app` ou `memory-game.engine.js`.
  - Indicador de status: `● RUNNING` em verde suave.
- **Área de Mockup Visual Interativo (`.window-preview`):**
  - Renderização visual estilizada e fiel à aplicação (usando HTML/CSS rico, sem depender de imagens externas pesadas que poderiam quebrar).
  - Exemplo para o Pomodoro: Display digital circular com tempo `25:00`, barra de progresso em anel SVG, botões de ação e badge *"PiP Enabled"*.
  - Exemplo para o Memory RPG: Cartas 3D viradas revelando runas/poções medievais e contador de turnos.
  - Exemplo para o Markdown: Divisão split-screen entre código markdown à esquerda e renderização HTML estilizada à direita.
- **Painel Editorial Lateral/Inferior (`.case-study-details`):**
  - **Título do Projeto:** Nome forte e objetivo.
  - **O Desafio de Engenharia (`.challenge-block`):** O problema real que este projeto se propôs a resolver (ex: evitar desvios no cronômetro quando a aba está em background).
  - **A Solução Técnica (`.solution-block`):** Como foi resolvido (ex: Picture-in-Picture API e Web Audio API).
  - **Badges de Tecnologias (`.tech-pills`):** `Vanilla JS ES6+`, `Document PiP API`, `Web Audio API`, `CSS Grid/Flexbox`.
  - **Barra de Ações Tripla Obrigatória:**
    1. **Botão 'Ver Aplicação' (`.btn-primary`):** Abre a aplicação diretamente (`./p_<nome>/index.html`) em nova aba.
    2. **Botão 'Ver Código' (`.btn-secondary`):** Abre o código-fonte no GitHub (`https://github.com/sanjrhoff/portifolio/blob/main/p_<nome>/index.html`).
    3. **Botão 'Preview Interativo' (`.btn-outline` com ícone de raio/terminal):** Abre o **Modal de Sandbox** integrado diretamente na página, sem que o recrutador saia do portfólio.

---

### 4.4. Diretório Técnico & Laboratório de Código (`.lab-section`)
Para os projetos restantes e visualização global de todo o inventário do desenvolvedor:
- **Barra de Filtros Dinâmica (`.filter-bar`):**
  - Filtros: `[Todos (7)]`, `[Produtividade & Web APIs]`, `[Jogos & Estado]`, `[Utilitários]`.
  - Interação: Botão ativo com borda ciano e fundo destacado. Filtragem via JavaScript puro com transição de opacidade/transform.
- **Estrutura dos Cards de Laboratório (`.lab-card`):**
  - Linha superior: Tag da categoria e status operacional.
  - Título do Projeto + ícone de pasta/módulo.
  - Descrição técnica concisa com ênfase no diferencial de implementação (ex: `Quiz Master Pro` com motor estatístico e threshold de aprovação; `Glass Weather App` com arquitetura API proxy segura).
  - Badges de stack técnica em monospace.
  - Ações diretas e acessíveis: Botão **"Ver Aplicação"**, botão **"Código"** e link para preview.

---

### 4.5. Modal de Sandbox / Quick View Previewer (`#preview-modal`)
Um modal de alta tecnologia para visualização de qualquer projeto sem sair da landing page:
- **Backdrop:** `rgba(0, 0, 0, 0.85)` com `backdrop-filter: blur(8px);`
- **Container do Modal:**
  - Janela com borda `1px solid var(--border-subtle)`, sombra de alta profundidade (`var(--shadow-modal)`), `max-width: 1000px; width: 92vw; height: 82vh; border-radius: var(--radius-lg);`.
- **Barra de Controle Superior (`.modal-toolbar`):**
  - Controles de janela (Fechar, Minimizar).
  - Título do projeto ativo com URL simulada (ex: `localhost:8080/p_pomodoro/index.html`).
  - Botão de Atualizar / Recarregar iframe (`<i class="fas fa-redo"></i>`).
  - Botão de Abrir em Nova Aba (`<i class="fas fa-external-link-alt"></i>`).
  - Botão de Fechar com atalho visual `[ESC]`.
- **Iframe Responsivo Seguro (`.modal-iframe-container`):**
  - `<iframe src="" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" loading="lazy"></iframe>`
  - Feedback visual de carregamento com spinner em ciano enquanto o iframe carrega.

---

### 4.6. Seção Sobre Mim & Stack Técnica Categorizada (`#sobre`)
- **Posicionamento Profissional:**
  - Breve histórico do Sandro: paixão por desmistificar tecnologias, entendimento profundo de como a web funciona por baixo dos panos (sem pular os fundamentos essenciais antes de usar bibliotecas).
  - Compromisso com código sustentável, acessibilidade semântica e boas práticas de versionamento no Git.
- **Matriz de Competências Técnicas (Grid de 3 Colunas):**
  1. **Core & Linguagens:**
     - HTML5 Semântico & Acessibilidade (ARIA)
     - CSS3 Moderno (Custom Properties, Grid, Flexbox, 3D Transforms)
     - JavaScript Moderno (ES6+, DOM API, Fetch, Event Loop, Async/Await)
  2. **Web APIs & Recursos do Navegador:**
     - LocalStorage & State Persistence
     - Document Picture-in-Picture API
     - Web Audio API (Síntese e triggers sonoros)
     - DOMPurify & Sanitização de Dados
  3. **Engenharia, Ferramentas & Práticas:**
     - Git & GitHub (Fluxo de branches, pull requests e GitHub Pages)
     - VS Code & Ferramentas de Profiling do Navegador (DevTools)
     - Arquitetura de Software Modular (Separação de Preocupações)
     - Filosofia Zero-Bloat (Alta performance sem overhead desnecessário)

---

### 4.7. Footer Técnico Humanizado (`.site-footer`)
- Linha divisória sutil.
- Mensagem de autoria: *"Projetado e codificado com foco em fundamentos de software por Sandro."*
- Telemetria de repositório: Link direto para `github.com/sanjrhoff/portifolio`.
- Indicador estático de Uptime: `🟢 100% Static & Hosted on GitHub Pages`.

---

## 5. Microinterações, Animações & Estados de Hover

Para garantir que a interface pareça polida e artesanal:
1. **Cards e Janelas:**
   - Estado repouso: `border: 1px solid var(--border-subtle); background: var(--bg-surface); transform: translateY(0); transition: var(--transition-normal);`
   - Estado hover: `border-color: var(--border-focus); background: var(--bg-surface-hover); transform: translateY(-3px); box-shadow: var(--shadow-md);`
2. **Botões de Ação:**
   - Efeito de escala tátil: `transform: scale(0.98)` em `:active`.
   - Botão Primário (`.btn-primary`): Fundo ciano `#06b6d4`, texto `#09090b`, hover `#22d3ee` com `box-shadow: var(--glow-cyan);`.
   - Botão Secundário (`.btn-secondary`): Borda cinza zinc, hover com fundo `#27272a` e texto branco.
3. **Pulsar do Status:**
   ```css
   @keyframes pulse-dot {
     0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
     70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
     100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
   }
   ```
4. **Fechamento de Modal por Teclado:**
   - O modal deve fechar ao pressionar a tecla `Escape` e ao clicar fora da janela no backdrop.

---

## 6. Especificação de Responsividade & Breakpoints

A página adota a abordagem **Mobile-Friendly First**, com três patamares bem definidos:

### 6.1. Mobile (< 768px)
- **Header:** Oculta links de navegação secundários em telas menores que 640px, priorizando o Logo, o indicador de status compacto e o botão rápido para o GitHub.
- **Hero:**
  - Título reduz para `2rem` (32px).
  - Console de métricas empilha em grade 2x2 compacta.
  - Botões de CTA ocupam largura total (`width: 100%`).
- **Case Studies:**
  - Mockup visual e painel de texto ficam em coluna única (`grid-template-columns: 1fr`).
  - O mockup de janela mantém os controles decorativos, mas otimiza a altura (`min-height: 220px`).
  - Os botões "Ver Aplicação", "Ver Código" e "Preview" se adaptam para empilhamento ou grid 2 colunas.
- **Laboratório / Filtros:**
  - Barra de filtros com rolagem horizontal suave (`overflow-x: auto; flex-wrap: nowrap; padding-bottom: 8px;`).
  - Grid de laboratório em 1 coluna.

### 6.2. Tablet (768px - 1024px)
- **Container Máximo:** `720px` a `940px`.
- **Case Studies:** Grid com 1 coluna ampla ou layout de 2 colunas proporcionais (50%/50%).
- **Laboratório:** Grid de 2 colunas (`repeat(2, 1fr)`).
- **Stack:** 2 colunas.

### 6.3. Desktop & Ultrawide (> 1024px)
- **Container Central:** `max-width: 1200px; margin: 0 auto; padding: 0 24px;`
- **Case Studies:**
  - Layout assimétrico de revista de engenharia: coluna do mockup visual (55%) e coluna descritiva com desafios e botões (45%), alternando a orientação visual (zigzag) para ritmo dinâmico.
- **Laboratório:** Grid balanceada de 3 colunas (`repeat(auto-fill, minmax(340px, 1fr))`).
- **Modal de Preview:** Largura generosa de 1000px, altura de 80vh para navegação confortável na aplicação embutida.

---

## 7. Acessibilidade (WCAG 2.1 AA) & Boas Práticas

1. **Relação de Contraste:**
   - Texto principal (`#f4f4f5`) sobre fundo escuro (`#09090b`): taxa de contraste **17.8:1** (Supera os 4.5:1 exigidos pela norma AAA).
   - Texto secundário (`#a1a1aa`): taxa de contraste **7.2:1** (Aprovado AA e AAA).
   - Ciano (`#06b6d4`) para fundos ou bordas selecionadas com texto escuro garantem legibilidade total.
2. **Tags Semânticas Rigorosas:**
   - `<header class="site-header">`
   - `<main class="main-content">`
   - `<section id="hero" aria-label="Apresentação">`
   - `<section id="destaques" aria-label="Projetos em Destaque">`
   - `<section id="diretorio" aria-label="Diretório de Laboratório">`
   - `<section id="sobre" aria-label="Sobre o Desenvolvedor">`
   - `<footer class="site-footer">`
3. **Links e Ações com Metadados:**
   - Todos os links externos contêm `target="_blank" rel="noopener noreferrer"`.
   - Todos os botões com ícones possuem texto descritivo ou atributos `aria-label`.
   - Modais com `role="dialog"` e `aria-modal="true"`.

---

## 8. Guia de Implementação para o Desenvolvedor Frontend

Ao iniciar a Fase 3 (`index.html`, `styles.css`, `script.js`):
1. **Estrutura de Arquivos Mantida:** Não criar diretórios extras desnecessários. Manter o ponto de entrada na raiz (`index.html`, `styles.css`, `script.js`).
2. **Ícones:** Manter suporte a FontAwesome CDN (já referenciado) ou SVG inline para máxima velocidade.
3. **Scripts Puros:**
   - Filtragem do laboratório sem dependências (`data-category` em cada `.lab-card`).
   - Gerenciamento de abertura/fechamento do `#preview-modal` com atualização do `iframe.src`.
   - Ativação do link ativo no scroll (IntersectionObserver).
4. **Links Relativos Fixos dos Projetos:**
   - `./p_pomodoro/index.html`
   - `./p_memory/index.html`
   - `./p_markdown/index.html`
   - `./p_notes/index.html`
   - `./p_flashcards/index.html`
   - `./p_quiz/index.html`
   - `./p_weather/index.html`
5. **Links Oficiais do Repositório GitHub:**
   - `https://github.com/sanjrhoff/portifolio/blob/main/p_<nome>/index.html` (ou diretório correspondente).

---
*Documento aprovado pela Arquitetura de UI/UX. Pronto para desenvolvimento de frontend de ponta.*