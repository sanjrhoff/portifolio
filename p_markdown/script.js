marked.use({
    breaks: true,
    gfm: true
});

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const btnClear = document.getElementById('btn-clear');
const btnDownload = document.getElementById('btn-download');

const defaultMarkdown = `
# Bem-vindo ao Markdown Previewer!
## Um projeto focado em tempo real

Este é um subtítulo. Você pode escrever textos normais ou adicionar **negrito** e *itálico*.

### Funcionalidades suportadas:
1. Renderização em tempo real (Two-way data binding conceitual).
2. Sanitização de HTML com DOMPurify (Segurança).
3. Persistência de dados com \`localStorage\`.

Aqui está um exemplo de código:
\`\`\`javascript
function saudacao(nome) {
  console.log("Olá, " + nome + "!");
}
saudacao("Recrutador");
\`\`\`

> "A simplicidade é a sofisticação máxima." - Leonardo da Vinci

Você pode até criar tabelas:

| Funcionalidade | Status |
| ------------- |:-------------:|
| HTML5 | Concluído |
| CSS3 | Concluído |
| JavaScript | Concluído |
`;


// Função que lê o markdown, sanitiza e renderiza na tela
function renderMarkdown(markdownText) {
    // 1. Converte Markdown para HTML
    const rawHtml = marked.parse(markdownText);
    
    // 2. Sanitiza o HTML para evitar XSS (Cross-Site Scripting)
    const safeHtml = DOMPurify.sanitize(rawHtml);
    
    // 3. Injeta o HTML seguro no DOM
    preview.innerHTML = safeHtml;
}

function updatePreviewAndSave() {
    const text = editor.value;
    renderMarkdown(text);
    localStorage.setItem('savedMarkdown', text);
}


editor.addEventListener('input', updatePreviewAndSave);

btnClear.addEventListener('click', () => {
    if(confirm('Tem certeza que deseja limpar todo o texto?')) {
        editor.value = '';
        updatePreviewAndSave();
    }
});

btnDownload.addEventListener('click', () => {
    const text = editor.value;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meu-documento.md';
    document.body.appendChild(a);
    a.click();
    
    // Limpeza da URL criada
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.addEventListener('DOMContentLoaded', () => {
    const savedText = localStorage.getItem('savedMarkdown');
    
    if (savedText !== null) {
        editor.value = savedText;
    } else {
        editor.value = defaultMarkdown.trim();
    }
    
    renderMarkdown(editor.value);
});