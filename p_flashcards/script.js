let flashcards = [];

const btnToggleForm = document.getElementById('btn-toggle-form');
const btnCancel = document.getElementById('btn-cancel');
const formSection = document.getElementById('form-section');
const flashcardForm = document.getElementById('flashcard-form');
const questionInput = document.getElementById('question');
const answerInput = document.getElementById('answer');
const cardsGrid = document.getElementById('cards-grid');

document.addEventListener('DOMContentLoaded', () => {
    loadCards();
    if (flashcards.length === 0) {
        addInitialCards();
    } else {
        renderCards();
    }
});

btnToggleForm.addEventListener('click', () => {
    formSection.classList.toggle('hidden');
});

btnCancel.addEventListener('click', () => {
    formSection.classList.add('hidden');
    flashcardForm.reset();
});

flashcardForm.addEventListener('submit', (e) => {
    e.preventDefault(); 
    
    const newCard = {
        id: Date.now().toString(), 
        question: questionInput.value.trim(),
        answer: answerInput.value.trim()
    };

    flashcards.push(newCard);
    saveCards();
    renderCards();
    
    flashcardForm.reset();
    formSection.classList.add('hidden');
});


function renderCards() {
    cardsGrid.innerHTML = ''; // Limpa o grid atual

    flashcards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        
        cardElement.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <h3>${card.question}</h3>
                    <p style="margin-top: 10px; font-size: 0.8rem; color: #666;">(Clique para ver a resposta)</p>
                </div>
                <div class="card-back">
                    <p>${card.answer}</p>
                    <button class="btn-delete" onclick="deleteCard(event, '${card.id}')">Excluir</button>
                </div>
            </div>
        `;

        // Adiciona o evento de virar o cartão
        cardElement.addEventListener('click', () => {
            cardElement.classList.toggle('flipped');
        });

        cardsGrid.appendChild(cardElement);
    });
}

// Remove um cartão (Delete)
function deleteCard(event, id) {
    event.stopPropagation(); // Evita que o clique acione o flip do cartão
    
    flashcards = flashcards.filter(card => card.id !== id);
    saveCards();
    renderCards();
}

function saveCards() {
    localStorage.setItem('flashcardsData', JSON.stringify(flashcards));
}

function loadCards() {
    const data = localStorage.getItem('flashcardsData');
    if (data) {
        flashcards = JSON.parse(data);
    }
}

function addInitialCards() {
    flashcards = [
        { id: '1', question: 'O que é um Teste de Resistência (Saving Throw)?', answer: 'Uma rolagem de dado para determinar se um personagem evita ou resiste a uma ameaça.' },
        { id: '2', question: 'O que significa a sigla CRUD?', answer: 'Create, Read, Update, Delete. São as 4 operações básicas de armazenamento persistente.' }
    ];
    saveCards();
    renderCards();
}