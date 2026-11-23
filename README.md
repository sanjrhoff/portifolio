# Sandro // Dev — Portfólio de Engenharia de Software Frontend

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-06b6d4?style=for-the-badge&logo=github)](https://sanjrhoff.github.io/portifolio/)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20ES6+-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)](https://sanjrhoff.github.io/portifolio/)
[![Web Crypto](https://img.shields.io/badge/Web%20Crypto-AES--GCM%20256-10b981?style=for-the-badge&logo=shield)](https://sanjrhoff.github.io/portifolio/)
[![Web Platform](https://img.shields.io/badge/Web%20APIs-Zero%20Dependencies-f59e0b?style=for-the-badge)](https://sanjrhoff.github.io/portifolio/)

> **Acesse o portfólio online:** [https://sanjrhoff.github.io/portifolio/](https://sanjrhoff.github.io/portifolio/)

Plataforma de portfólio interativa com foco em **Engenharia de Software Frontend**, fundamentos sólidos de **JavaScript Puro (ES6+)**, física computacional em tempo real (**Mecânica Quântica TDSE Crank-Nicolson**, **Ray Tracing 2D**, **Dinâmica de N-Corpos & Buracos Negros**, **Ondas FDTD 2D**, **Eletromagnetismo de Lorentz** e **Teoria do Caos**), manipulação avançada de **DOM/SVG/Canvas**, integração de **Web APIs nativas do navegador** e **Criptografia Autenticada no Cliente**.

Todo o projeto foi concebido para rodar **100% no navegador (Client-Side)**, com zero dependências de runtime pesadas e compatibilidade nativa com o **GitHub Pages**.

---

## 🚀 Vitrine de Aplicações (16 Projetos Vivos)

O repositório reúne 16 aplicações funcionais completas, cobrindo diferentes desafios práticos de computação, simulação científica avançada e arquitetura web:

| # | Aplicação | Categoria | Destaques Técnicos & Desafios de Engenharia | Demonstração | Código-Fonte |
| :-: | :--- | :--- | :--- | :---: | :---: |
| **01** | **SQL-to-ERD Analyzer** | Bancos de Dados & Compiladores | Parser SQL DDL nativo no cliente (AST de tabelas, tipos e chaves). Traçado dinâmico de **Curvas de Bézier cúbicas SVG** recalculadas a 60 FPS com drag-and-drop livre e exportação em SVG e PNG. | [Demo](https://sanjrhoff.github.io/portifolio/p_sqlerd/index.html) | [`p_sqlerd/`](./p_sqlerd/) |
| **02** | **Zero-Knowledge Secret Vault** | Criptografia & Segurança | Cofre de credenciais offline com **Web Crypto API**: derivação **PBKDF2** (100k iterações + Salt 16B) e cifragem militar **AES-GCM (256 bits)**. Arquitetura *RAM-Only*, medidor de entropia em bits e purga automática da área de transferência. | [Demo](https://sanjrhoff.github.io/portifolio/p_vault/index.html) | [`p_vault/`](./p_vault/) |
| **03** | **Pomodoro Timer Pro** | Produtividade & Web APIs | Máquina de estados finita (Foco / Pausa Curta / Pausa Longa), prevenção de throttling de abas em segundo plano via **Document Picture-in-Picture API** e alarmes com **Web Audio API**. | [Demo](https://sanjrhoff.github.io/portifolio/p_pomodoro/index.html) | [`p_pomodoro/`](./p_pomodoro/) |
| **04** | **Tavern's Memory RPG** | Jogos & Máquina de Estados | Game Loop assíncrono com mutex anti-race-conditions, algoritmo de embaralhamento **Fisher-Yates**, cronômetro de alta precisão e rotação de cartas puramente em CSS 3D (`transform-style: preserve-3d`). | [Demo](https://sanjrhoff.github.io/portifolio/p_memory/index.html) | [`p_memory/`](./p_memory/) |
| **05** | **Markdown Previewer Suite** | Produtividade & Segurança | Pipeline de compilação em tempo real de GitHub Flavored Markdown (GFM), sanitização ativa contra ataques XSS via **DOMPurify** e exportação de arquivos `.md` via **Blob API**. | [Demo](https://sanjrhoff.github.io/portifolio/p_markdown/index.html) | [`p_markdown/`](./p_markdown/) |
| **06** | **Markdown Notes App** | Utilitários & Armazenamento | Aplicação CRUD de anotações com persistência no `LocalStorage`, formatação dinâmica, timestamps e busca em tempo real. | [Demo](https://sanjrhoff.github.io/portifolio/p_notes/index.html) | [`p_notes/`](./p_notes/) |
| **07** | **Flashcards 3D Study** | Produtividade & Interatividade | Sistema de repetição espaçada com baralhos dinâmicos locais e flip tridimensional de cartões 100% em CSS puro. | [Demo](https://sanjrhoff.github.io/portifolio/p_flashcards/index.html) | [`p_flashcards/`](./p_flashcards/) |
| **08** | **Quiz Master Pro** | SPA & Lógica de Avaliação | Single Page Application em Vanilla JS com fluxo dinâmico baseado em IDs, motor estatístico de acertos, cálculo de tempo e persistência de histórico. | [Demo](https://sanjrhoff.github.io/portifolio/p_quiz/index.html) | [`p_quiz/`](./p_quiz/) |
| **09** | **Glass Weather App** | Web APIs & Resiliência | Aplicação de clima com estética Glassmorphism, detecção defensiva de ambiente estático e suporte à arquitetura de backend proxy seguro com `.env`. | [Demo](https://sanjrhoff.github.io/portifolio/p_weather/index.html) | [`p_weather/`](./p_weather/) |
| **10** | **RayLens Lab** | Física Computacional & Ótica | Bancada interativa de ótica geométrica e traçado vetorial de raios 2D no Canvas. Implementa refração via **Lei de Snell-Descartes**, cálculo do ângulo crítico para **Reflexão Interna Total (TIR)**, **Dispersão Cromática com Equação de Cauchy** ($n(\lambda) = A + B/\lambda^2$) e feixes multiespectrais com aberração esférica. | [Demo](https://sanjrhoff.github.io/portifolio/p_optics/index.html) | [`p_optics/`](./p_optics/) |
| **11** | **OrbitN (Relativistic)** | Física Computacional & Gravitação | Simulador de mecânica celeste e gravitação universal com integrador simplético **Velocity Verlet de 2ª ordem** $O(\Delta t^2)$. **Upgrade Relativístico:** Módulo de Buracos Negros com Raio de Schwarzschild ($r_s = 2GM/c^2$), Esfera de Fótons ($1.5 r_s$), Limite de Roche com **Espaguetificação Estelar em tempo real** e Disco de Acreção com Beaming Doppler. | [Demo](https://sanjrhoff.github.io/portifolio/p_gravity/index.html) | [`p_gravity/`](./p_gravity/) |
| **12** | **WaveLab 2D** | Física Computacional & Ondas | Resolução da Equação de Onda 2D por diferenças finitas (**FDTD**), simulação do **Experimento da Dupla Fenda de Young** com gráfico de intensidade de franjas de interferência em tempo real, **Efeito Doppler** e cone de choque de Mach supersônico. | [Demo](https://sanjrhoff.github.io/portifolio/p_waves/index.html) | [`p_waves/`](./p_waves/) |
| **13** | **FieldLorentz** | Eletromagnetismo & Partículas | Traçado contínuo de linhas de campo elétrico via integração **Runge-Kutta 4 (RK4)**, superfícies equipotenciais, câmara de **Força de Lorentz** $\vec{F} = q(\vec{E} + \vec{v}\times\vec{B})$ com **Algoritmo de Boris**, Acelerador Ciclotron e Espectrômetro de Massa. | [Demo](https://sanjrhoff.github.io/portifolio/p_field/index.html) | [`p_field/`](./p_field/) |
| **14** | **ChaosPendulum** | Mecânica Não-Linear & Caos | Pêndulo Duplo acoplado com equações de **Euler-Lagrange** integradas via RK4 de alta precisão, demonstração do **Efeito Borboleta com Enxame de 100 Pêndulos** ($\Delta\theta = 10^{-6}\text{ rad}$) e cálculo em tempo real do **Espaço de Fase** $(\omega_1, \theta_1)$ e do **Expoente de Lyapunov**. | [Demo](https://sanjrhoff.github.io/portifolio/p_chaos/index.html) | [`p_chaos/`](./p_chaos/) |
| **15** | **QuantumLab 1D** | Física Computacional & Mecânica Quântica | Resolução da **Equação de Schrödinger Dependente do Tempo (1D TDSE)** via **Crank-Nicolson Cayley O(N)** estritamente unitário ($\int |\psi|^2 dx = 1.000000$). Algoritmo de **Thomas (TDMA) Complexo**, mapeamento de fase espectral HSL ($\arg\psi$), **Tunelamento Quântico**, Diodo RTD ressonante, oscilador harmônico coerente e pincel interativo de potencial $V(x)$. | [Demo](https://sanjrhoff.github.io/portifolio/p_quantum/index.html) | [`p_quantum/`](./p_quantum/) |
| **16** | **CyberSec Lab** | Segurança da Informação & Criptografia | Laboratório prático de AppSec executado com a **Web Crypto API nativa**. Simulações reais de **SQL Injection com AST Parser visual**, **Cross-Site Scripting (XSS)** com sandbox isolada e defesa CSP, **TLS 1.3 Handshake** em raias de sequência com **Diffie-Hellman Efêmero (ECDHE)**, **JWT Inspector tricolor** com HMAC-SHA256 e teste de resistência de hashes contra **Rainbow Tables** e força bruta. | [Demo](https://sanjrhoff.github.io/portifolio/p_cybersec/index.html) | [`p_cybersec/`](./p_cybersec/) |

---

## ⚙️ Características Técnicas do Portfólio

- **Design System Moderno (Dark / Zinc):** Paleta neutra e técnica (`#09090b` / `#121215`), eliminando templates genéricos de IA e priorizando tipografia editorial de alta legibilidade (`Inter` e `JetBrains Mono`).
- **Modal de Sandbox Interativo:** Permite inspecionar e testar qualquer uma das aplicações em um container isolado sem sair da página principal (com descarregamento de memória e encerramento de threads ao fechar).
- **Filtros Dinâmicos de Categoria:** Filtragem fluida no cliente por tags técnicas (*Física & Simulação*, *Bancos & Criptografia*, *Produtividade*, *Jogos*, *Utilitários*).
- **Desempenho Extremo:**
  - **0** dependências de build pesadas.
  - **100%** estático.
  - Carregamento inicial sub-segundo (First Contentful Paint < 200ms).

---

## 📂 Estrutura de Diretórios

```
portifolio/
├── index.html              # Landing page principal e vitrine de engenharia
├── styles.css              # Design system em Dark Zinc e mockups CSS
├── script.js               # Gerenciador da Sandbox Modal e filtros dinâmicos
├── p_sqlerd/               # Case Study 1: SQL-to-ERD Schema Analyzer
├── p_vault/                # Case Study 2: Zero-Knowledge Secret Vault
├── p_pomodoro/             # Case Study 3: Pomodoro Timer Pro (PiP API)
├── p_memory/               # Case Study 4: Tavern's Memory RPG (CSS 3D)
├── p_markdown/             # Case Study 5: Markdown Previewer Suite (Anti-XSS)
├── p_notes/                # Markdown Notes App (CRUD LocalStorage)
├── p_flashcards/           # Flashcards 3D Study
├── p_quiz/                 # Quiz Master Pro SPA
├── p_weather/              # Glass Weather App
├── p_optics/               # RayLens Lab — Simulador de Ótica Geométrica & Ray Tracing
├── p_gravity/              # OrbitN — Simulador Gravitacional de N-Corpos & Buracos Negros
├── p_waves/                # WaveLab 2D — Simulador de Ondas FDTD & Dupla Fenda de Young
├── p_field/                # FieldLorentz — Eletromagnetismo RK4 & Câmara de Lorentz
├── p_chaos/                # ChaosPendulum — Pêndulo Duplo Lagrangiano & Teoria do Caos
├── p_quantum/              # QuantumLab 1D — Simulador TDSE & Crank-Nicolson O(N)
├── p_cybersec/             # CyberSec Lab — OWASP Top 10, AST Parser, TLS 1.3 & Criptografia
└── docs/                   # Especificações, Design System e Relatórios de QA
```

---

## 💻 Como Rodar Localmente

Por ser um projeto puramente estático, nenhuma instalação ou compilação (`npm install` ou `npm run build`) é necessária:

1. Clone o repositório:
   ```bash
   git clone https://github.com/sanjrhoff/portifolio.git
   cd portifolio
   ```
2. Abra diretamente o arquivo `index.html` em qualquer navegador:
   - No Windows: `start index.html`
   - Ou utilize qualquer servidor local leve (ex: Live Server do VSCode, `npx serve .` ou `python -m http.server 8000`).

---

## 👤 Autor

**Sandro Hoffmann**  
Estudante de **Tecnologia em Sistemas para Internet no IFES** (Instituto Federal do Espírito Santo).  
- **GitHub:** [@sanjrhoff](https://github.com/sanjrhoff)  
- **Portfólio Online:** [https://sanjrhoff.github.io/portifolio/](https://sanjrhoff.github.io/portifolio/)

