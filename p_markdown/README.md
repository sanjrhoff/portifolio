# Markdown Previewer

Um editor Markdown em tempo real construído com JavaScript puro, focado no padrão GitHub Flavored Markdown (GFM).

## Funcionalidades Principais
- **Live Preview:** O código renderiza instantaneamente conforme o usuário digita.
- **Segurança (Sanitização):** Utiliza `DOMPurify` para garantir que o HTML gerado seja seguro contra ataques XSS.
- **Persistência de Dados:** O conteúdo digitado é salvo automaticamente no `localStorage` do navegador.
- **Download do Arquivo:** Permite exportar o texto atual como um arquivo `.md`.

## Tecnologias Utilizadas
- HTML5 & CSS3 (Layout Flexbox Side-by-Side)
- JavaScript Vanilla
- [Marked.js](https://marked.js.org/) (Conversor de Markdown para HTML)
- [DOMPurify](https://github.com/cure53/DOMPurify) (Sanitização de HTML)

