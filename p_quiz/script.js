const quizzesDB = {
    webdev: {
        title: "Fundamentos da Web",
        questions: [
            { q: "Qual linguagem roda primariamente no navegador do usuário?", options: ["PHP", "Python", "JavaScript", "C++"], answer: 2 },
            { q: "O que significa a sigla CSS?", options: ["Cascading Style Sheets", "Computer Style Symbols", "Creative Style System", "Coded Simple Styles"], answer: 0 },
            { q: "Para que serve a tag HTML <a>?", options: ["Criar uma tabela", "Inserir uma imagem", "Definir um artigo", "Criar um link (âncora)"], answer: 3 },
            { q: "Qual destas tecnologias atua no backend (servidor)?", options: ["HTML5", "PHP", "CSS3", "Vanilla JS"], answer: 1 }
        ]
    },
    rpg: {
        title: "Mestre de RPG (D&D 5e)",
        questions: [
            { q: "Qual dado é rolado para determinar o acerto de um ataque?", options: ["d6", "d12", "d20", "d100"], answer: 2 },
            { q: "Qual classe possui a habilidade 'Ataque Furtivo'?", options: ["Bárbaro", "Ladino", "Paladino", "Mago"], answer: 1 },
            { q: "Qual é a habilidade chave para conjurar magias de um Bruxo (Warlock)?", options: ["Inteligência", "Sabedoria", "Carisma", "Constituição"], answer: 2 }
        ]
    },
    library: {
        title: "Biblioteconomia Geral",
        questions: [
            { q: "O que significa a sigla ISBN?", options: ["International Standard Book Number", "Index System for Books National", "Internal Storage of Book Names", "International System of Bibliographic Notation"], answer: 0 },
            { q: "Qual é o principal sistema de classificação usado em bibliotecas públicas?", options: ["Cutter-Sanborn", "AACR2", "CDD (Dewey)", "MARC 21"], answer: 2 },
            { q: "O que é um catálogo OPAC?", options: ["Online Public Access Catalog", "Official Private Archive Center", "Organização Pública de Acervos Científicos", "Only Print Available Copies"], answer: 0 }
        ]
    }
};

// --- ESTADO DA APLICAÇÃO ---
let currentUser = null;
let currentQuizId = null;
let currentQuestionIndex = 0;
let score = 0;
let startTime = 0;
let timerInterval = null;

// --- ELEMENTOS DO DOM ---
const screens = {
    auth: document.getElementById('auth-screen'),
    dash: document.getElementById('dashboard-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen')
};

// --- FUNÇÕES DE NAVEGAÇÃO ---
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

// --- SISTEMA DE USUÁRIOS ---
document.getElementById('login-btn').addEventListener('click', () => {
    const username = document.getElementById('username-input').value.trim();
    if (!username) return alert('Por favor, insira um nome.');
    
    currentUser = username;
    // Cria o registro do usuário se não existir
    if (!localStorage.getItem(`user_${currentUser}`)) {
        localStorage.setItem(`user_${currentUser}`, JSON.stringify([]));
    }
    
    document.getElementById('user-display-name').textContent = currentUser;
    loadDashboard();
    showScreen('dash');
});

document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    document.getElementById('username-input').value = '';
    showScreen('auth');
});

function loadDashboard() {
    // Carrega Quizzes
    const quizList = document.getElementById('quiz-list');
    quizList.innerHTML = '';
    Object.keys(quizzesDB).forEach(id => {
        const div = document.createElement('div');
        div.className = 'quiz-card';
        div.innerHTML = `<span class="title">${quizzesDB[id].title}</span> <button class="btn primary" onclick="startQuiz('${id}')">Jogar</button>`;
        quizList.appendChild(div);
    });

    // Carrega Histórico do Usuário
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    const history = JSON.parse(localStorage.getItem(`user_${currentUser}`)) || [];
    
    if (history.length === 0) {
        historyList.innerHTML = '<li>Nenhum quiz concluído ainda.</li>';
    } else {
        // Mostra os últimos 5
        history.slice(-5).reverse().forEach(record => {
            const li = document.createElement('li');
            li.innerHTML = `<span><b>${record.quizName}</b></span> <span>${record.score}/${record.total} (${record.time}s)</span>`;
            historyList.appendChild(li);
        });
    }
}

// --- LÓGICA DO QUIZ ---
window.startQuiz = function(quizId) {
    currentQuizId = quizId;
    currentQuestionIndex = 0;
    score = 0;
    
    document.getElementById('quiz-title-display').textContent = quizzesDB[quizId].title;
    startTime = Date.now();
    startTimer();
    
    renderQuestion();
    showScreen('quiz');
}

function startTimer() {
    const timeDisplay = document.getElementById('time-display');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const s = String(elapsed % 60).padStart(2, '0');
        timeDisplay.textContent = `${m}:${s}`;
    }, 1000);
}

function renderQuestion() {
    const quiz = quizzesDB[currentQuizId];
    const questionData = quiz.questions[currentQuestionIndex];
    
    // Atualiza Barra de Progresso
    const progress = (currentQuestionIndex / quiz.questions.length) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;

    document.getElementById('question-text').textContent = questionData.q;
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    questionData.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => selectOption(btn, index, questionData.answer);
        optionsContainer.appendChild(btn);
    });
}

function selectOption(selectedBtn, selectedIndex, correctIndex) {
    // Bloqueia todos os botões após o clique
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach(btn => btn.disabled = true);

    if (selectedIndex === correctIndex) {
        selectedBtn.classList.add('correct');
        score++;
    } else {
        selectedBtn.classList.add('wrong');
        buttons[correctIndex].classList.add('correct'); // Mostra qual era a certa
    }

    // Aguarda 1.5s e vai para a próxima 
    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < quizzesDB[currentQuizId].questions.length) {
            renderQuestion();
        } else {
            endQuiz();
        }
    }, 1500);
}

function endQuiz() {
    clearInterval(timerInterval);
    const totalTimeSec = Math.floor((Date.now() - startTime) / 1000);
    const quiz = quizzesDB[currentQuizId];
    const totalQuestions = quiz.questions.length;
    const passRate = score / totalQuestions;

    // Salva no Histórico do LocalStorage
    const history = JSON.parse(localStorage.getItem(`user_${currentUser}`)) || [];
    history.push({
        quizName: quiz.title,
        score: score,
        total: totalQuestions,
        time: totalTimeSec
    });
    localStorage.setItem(`user_${currentUser}`, JSON.stringify(history));

    // Prepara Tela de Resultado
    document.getElementById('score-display').textContent = `${score}/${totalQuestions}`;
    document.getElementById('total-time-display').textContent = `${totalTimeSec}s`;
    
    const icon = document.getElementById('result-icon');
    const title = document.getElementById('result-title');
    const msg = document.getElementById('result-message');

    if (passRate >= 0.6) {
        icon.className = 'result-icon pass fas fa-check-circle';
        title.textContent = 'Parabéns, você passou!';
        msg.textContent = 'Excelente desempenho!';
    } else {
        icon.className = 'result-icon fail fas fa-times-circle';
        title.textContent = 'Você reprovou!';
        msg.textContent = 'Precisa estudar mais um pouco.';
    }

    // Configura botão de compartilhamento
    document.getElementById('share-btn').onclick = () => {
        const text = `Acabei de acertar ${score}/${totalQuestions} no quiz "${quiz.title}" em ${totalTimeSec} segundos!`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    };

    showScreen('result');
}

document.getElementById('back-dash-btn').addEventListener('click', () => {
    loadDashboard();
    showScreen('dash');
});