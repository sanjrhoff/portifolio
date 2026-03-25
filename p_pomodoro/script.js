// --- ESTADO DA APLICAÇÃO ---
const MODES = { WORK: 'work', BREAK: 'break', LONG_BREAK: 'long-break' };
let currentMode = MODES.WORK;
let timeLeft = 25 * 60; 
let timerInterval = null;
let isRunning = false;
let sessionsCompleted = 0;
let pipWindow = null; // Guarda a referência da janela flutuante

// --- ELEMENTOS DO DOM ---
const appContainer = document.getElementById('app-container');
const timeDisplay = document.getElementById('time-display');
const modeLabel = document.getElementById('mode-label');
const sessionCount = document.getElementById('session-count');
const body = document.body;
const alarmSound = document.getElementById('alarm-sound');
const pipGroup = document.getElementById('pip-group');
const pipBtn = document.getElementById('pip-btn');

// Inputs e Botões
const inputs = {
    work: document.getElementById('work-time'),
    break: document.getElementById('break-time'),
    longBreak: document.getElementById('long-break-time')
};
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');

// --- LÓGICA DO PIP ---

// 1. Detectar Suporte e Mostrar o Botão
if ('documentPictureInPicture' in window) {
    pipGroup.classList.remove('hidden');
}

// 2. Função para alternar o modo PiP
async function togglePip() {
    // Se já estiver aberto, fecha
    if (pipWindow) {
        pipWindow.close();
        return;
    }

    try {
        // Abre a janela flutuante 
        pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 400,
            height: 400,
        });

        // Copia os estilos CSS da janela principal para a flutuante
        // Sem isso, o app fica sem formatação dentro do PiP
        const styleSheet = document.createElement("style");
        styleSheet.textContent = Array.from(document.styleSheets)
            .filter((styleSheet) => {
                try {
                    return styleSheet.cssRules;
                } catch (e) {
                    return false;
                }
            })
            .map((styleSheet) => Array.from(styleSheet.cssRules).map((rule) => rule.cssText).join(" "))
            .join(" ");
        pipWindow.document.head.appendChild(styleSheet);
        
        // Copia a fonte do FontAwesome
        const fontLink = document.createElement("link");
        fontLink.rel = "stylesheet";
        fontLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
        pipWindow.document.head.appendChild(fontLink);

        // Adiciona classe 'pip-mode' no HTML da janela flutuante
        pipWindow.document.documentElement.classList.add('pip-mode');

        // MOVE o elemento inteiro do app para dentro da janela flutuante
        pipWindow.document.body.appendChild(appContainer);
        
        // Muda o ícone do botão
        pipBtn.innerHTML = '<i class="fas fa-compress-alt"></i>';

        // Lógica para quando a janela PiP for fechada
        pipWindow.addEventListener("pagehide", (event) => {
            pipWindow = null;
            // Move o elemento do app de volta para a janela principal
            body.appendChild(appContainer);
            // Restaura o ícone
            pipBtn.innerHTML = '<i class="fas fa-external-link-alt"></i>';
        });

    } catch (error) {
        console.error("Erro ao abrir PiP:", error);
    }
}

pipBtn.addEventListener('click', togglePip);


// --- LÓGICA DO CRONÔMETRO ---

function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    timeDisplay.textContent = formattedTime;
    document.title = `${formattedTime} - Pomodoro`;
}

function switchMode(newMode) {
    currentMode = newMode;
    body.className = `mode-${newMode}`;
    appContainer.className = `app-container mode-${newMode}`;
    
    if (newMode === MODES.WORK) {
        modeLabel.textContent = 'Foco';
        timeLeft = parseInt(inputs.work.value) * 60;
    } else if (newMode === MODES.BREAK) {
        modeLabel.textContent = 'Pausa Curta';
        timeLeft = parseInt(inputs.break.value) * 60;
    } else if (newMode === MODES.LONG_BREAK) {
        modeLabel.textContent = 'Pausa Longa';
        timeLeft = parseInt(inputs.longBreak.value) * 60;
    }
    updateDisplay();
}

function handleTimerComplete() {
    alarmSound.play();
    
    if (currentMode === MODES.WORK) {
        sessionsCompleted++;
        sessionCount.textContent = sessionsCompleted;
        if (sessionsCompleted % 4 === 0) {
            switchMode(MODES.LONG_BREAK);
        } else {
            switchMode(MODES.BREAK);
        }
    } else {
        switchMode(MODES.WORK);
    }
    startTimer();
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    startBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
    Object.values(inputs).forEach(input => input.disabled = true);
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            isRunning = false;
            handleTimerComplete();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    startBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
}

function resetTimer() {
    pauseTimer();
    Object.values(inputs).forEach(input => input.disabled = false);
    sessionsCompleted = 0;
    sessionCount.textContent = sessionsCompleted;
    switchMode(MODES.WORK);
}

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

Object.values(inputs).forEach(input => {
    input.addEventListener('change', () => {
        if (!isRunning) switchMode(currentMode);
    });
});

switchMode(MODES.WORK);