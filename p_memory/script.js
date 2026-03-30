const cardItems = ['🗡️', '🛡️', '🧪', '📜', '💍', '👑', '🏹', '🔮'];
let cardsArray = [...cardItems, ...cardItems]; // Duplica os itens para formar pares

let hasFlippedCard = false;
let lockBoard = false;
let firstCard, secondCard;
let moves = 0;
let matchedPairs = 0;

let time = 0;
let timerInterval;
let timerStarted = false;

const boardElement = document.getElementById('memory-board');
const movesElement = document.getElementById('moves');
const timerElement = document.getElementById('timer');
const btnRestart = document.getElementById('btn-restart');
const winModal = document.getElementById('win-modal');
const btnPlayAgain = document.getElementById('btn-play-again');
const finalTimeElement = document.getElementById('final-time');
const finalMovesElement = document.getElementById('final-moves');

const historyList = document.getElementById('history-list');
const btnClearHistory = document.getElementById('btn-clear-history');
let matchHistory = JSON.parse(localStorage.getItem('tavernMemoryHistory')) || [];

function initGame() {
    hasFlippedCard = false;
    lockBoard = false;
    firstCard = null;
    secondCard = null;
    moves = 0;
    matchedPairs = 0;
    movesElement.textContent = moves;
    
    resetTimer();
    winModal.classList.add('hidden');
    
    shuffle(cardsArray);
    createBoard();
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function createBoard() {
    boardElement.innerHTML = '';
    
    cardsArray.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('memory-card');
        card.dataset.item = item; 
        
        card.innerHTML = `
            <div class="front-face">${item}</div>
            <div class="back-face"></div>
        `;
        
        card.addEventListener('click', flipCard);
        boardElement.appendChild(card);
    });
}

function flipCard() {
    if (lockBoard) return; // Evita clicar enquanto cartas estão desvirando
    if (this === firstCard) return; // Evita duplo clique na mesma carta

    if (!timerStarted) startTimer();

    this.classList.add('flip');

    if (!hasFlippedCard) {
        hasFlippedCard = true;
        firstCard = this;
        return;
    }

    secondCard = this;
    updateMoves();
    checkForMatch();
}

function checkForMatch() {
    const isMatch = firstCard.dataset.item === secondCard.dataset.item;
    isMatch ? disableCards() : unflipCards();
}

function disableCards() {
    firstCard.removeEventListener('click', flipCard);
    secondCard.removeEventListener('click', flipCard);
    
    matchedPairs++;
    resetBoardState();

    if (matchedPairs === cardItems.length) {
        endGame();
    }
}

function unflipCards() {
    lockBoard = true; // Trava o tabuleiro

    setTimeout(() => {
        firstCard.classList.remove('flip');
        secondCard.classList.remove('flip');
        resetBoardState();
    }, 1000);
}

function resetBoardState() {
    [hasFlippedCard, lockBoard] = [false, false];
    [firstCard, secondCard] = [null, null];
}

function updateMoves() {
    moves++;
    movesElement.textContent = moves;
}

function startTimer() {
    timerStarted = true;
    timerInterval = setInterval(() => {
        time++;
        const minutes = Math.floor(time / 60).toString().padStart(2, '0');
        const seconds = (time % 60).toString().padStart(2, '0');
        timerElement.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    time = 0;
    timerStarted = false;
    timerElement.textContent = '00:00';
}

function endGame() {
    clearInterval(timerInterval);
    setTimeout(() => {
        finalTimeElement.textContent = timerElement.textContent;
        finalMovesElement.textContent = moves;
        
        saveMatchResult(timerElement.textContent, moves);
        
        winModal.classList.remove('hidden');
    }, 500); 
}

function saveMatchResult(finalTime, finalMoves) {
    const match = {
        id: Date.now(),
        date: new Date().toLocaleDateString('pt-BR'),
        time: finalTime,
        moves: finalMoves
    };
    
    matchHistory.unshift(match); 
    if (matchHistory.length > 10) matchHistory.pop(); 
    
    localStorage.setItem('tavernMemoryHistory', JSON.stringify(matchHistory));
    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = '';
    
    if (matchHistory.length === 0) {
        historyList.innerHTML = '<li class="history-item">Nenhum registro encontrado nas crônicas da taverna.</li>';
        return;
    }
    
    matchHistory.forEach((match) => {
        const li = document.createElement('li');
        li.classList.add('history-item');
        li.innerHTML = `
            <span>⚔️ Missão em ${match.date}</span> 
            <span>⏳ ${match.time} | 🔄 ${match.moves} movs</span>
        `;
        historyList.appendChild(li);
    });
}

btnRestart.addEventListener('click', initGame);
btnPlayAgain.addEventListener('click', initGame);

btnClearHistory.addEventListener('click', () => {
    if (confirm('Deseja realmente queimar este pergaminho e apagar todo o histórico?')) {
        matchHistory = [];
        localStorage.removeItem('tavernMemoryHistory');
        renderHistory();
    }
});

renderHistory();
initGame();