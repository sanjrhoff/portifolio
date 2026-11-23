# 📊 SQL-to-ERD Schema Analyzer

Visualizador e analisador interativo de esquemas de banco de dados SQL DDL para diagramas entidade-relacionamento (ERD) vetoriais interativos com parsing nativo em JavaScript puro (Zero Dependências).

---

## ⚡ Destaques de Engenharia

- **Parser SQL DDL Nativo (JS Puro):** Extrai instruções `CREATE TABLE`, colunas, tipos de dados, chaves primárias inline/tabela (`PRIMARY KEY`) e chaves estrangeiras inline/tabela (`FOREIGN KEY ... REFERENCES`).
- **Canvas Vetorial SVG Interativo:** Curvas de Bézier cúbicas SVG calculadas dinamicamente entre as colunas FK e as PKs referenciadas.
- **Drag & Drop a 60 FPS:** Arraste fluido de cartões de tabela com recálculo em tempo real via `requestAnimationFrame`.
- **Viewport Controller:** Zoom gradual centrado no cursor (0.25x a 2.2x), Pan livre no canvas, Fit to Viewport e Reorganização automática em grade.
- **Exportação Multiformato:** Download direto de diagrama em `.svg` vetorial, imagem `.png` em resolução 2x Retina e exportação estruturada em JSON Schema.
- **Presets Integrados:** Esquemas relacionais prontos para E-Commerce, Streaming, Biblioteca & Empréstimos, LMS e Gestão Ágil de Tarefas.
- **Design System Dark Tech:** Paleta com base em Zinc `#09090b`, Ciano `#06b6d4`, Âmbar `#f59e0b` e Esmeralda `#10b981`.

---

## 🚀 Como Executar

Por ser uma aplicação 100% estática em Vanilla JavaScript, não necessita de servidor nem build:
Basta abrir o arquivo `index.html` em qualquer navegador moderno ou acessar via GitHub Pages.
