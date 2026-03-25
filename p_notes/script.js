// Captura os elementos principais
const addBtn = document.getElementById('add');
const notesContainer = document.getElementById('notes-container');

// Força o Markdown a respeitar quebras de linha simples
marked.use({ breaks: true });

const savedNotes = JSON.parse(localStorage.getItem('notes'));

if (savedNotes && savedNotes.length > 0) {
    savedNotes.forEach(note => addNewNote(note.text, note.date));
}

addBtn.addEventListener('click', () => {
    const creationDate = new Date().toLocaleDateString('pt-BR');
    addNewNote('', creationDate);
});

function addNewNote(text = '', date = '') {
    const note = document.createElement('div');
    note.classList.add('note');

    // div .drag-handle com o ícone de mover
    note.innerHTML = `
    <div class="tools">
        <div class="drag-handle" title="Arraste para mover"><i class="fas fa-grip-lines"></i></div>
        <span class="date-label"><i class="far fa-calendar-alt"></i> ${date}</span>
        <div class="actions">
            <button class="edit" title="Editar/Visualizar"><i class="fas fa-edit"></i></button>
            <button class="delete" title="Deletar"><i class="fas fa-trash-alt"></i></button>
        </div>
    </div>
    <div class="main ${text ? '' : 'hidden'}"></div>
    <textarea class="${text ? 'hidden' : ''}" placeholder="Digite seu texto usando Markdown..."></textarea>
    `;

    const editBtn = note.querySelector('.edit');
    const deleteBtn = note.querySelector('.delete');
    const main = note.querySelector('.main');
    const textArea = note.querySelector('textarea');

    textArea.value = text;
    main.innerHTML = marked.parse(text);

    deleteBtn.addEventListener('click', () => {
        note.remove();
        updateLocalStorage();
    });

    editBtn.addEventListener('click', () => {
        main.classList.toggle('hidden');
        textArea.classList.toggle('hidden');

        if (!textArea.classList.contains('hidden')) {
            textArea.focus();
        }
    });

    textArea.addEventListener('input', (e) => {
        const { value } = e.target;
        main.innerHTML = marked.parse(value);
        updateLocalStorage();
    });

    notesContainer.appendChild(note);
    if (!text) textArea.focus();
}

function updateLocalStorage() {
    const notesText = document.querySelectorAll('textarea');
    const notesDates = document.querySelectorAll('.date-label');
    const notesData = [];

    notesText.forEach((note, index) => {
        const dateText = notesDates[index].innerText.trim();
        notesData.push({
            text: note.value,
            date: dateText
        });
    });

    localStorage.setItem('notes', JSON.stringify(notesData));
}

// Inicializa o Drag and Drop
new Sortable(notesContainer, {
    animation: 150, // Suavidade na animação ao arrastar
    handle: '.drag-handle', // Define que só pode arrastar clicando no ícone (evita bugar o texto)
    ghostClass: 'sortable-ghost', // Classe CSS aplicada ao placeholder
    onEnd: function () {
        // Quando soltar a nota no novo lugar, atualiza o LocalStorage com a nova ordem!
        updateLocalStorage();
    }
});