// Elementos do DOM
const cityInput = document.getElementById('city-input');
const weatherDisplay = document.getElementById('weather-display');
const cityNameEl = document.getElementById('city-name');
const temperatureEl = document.getElementById('temperature');
const conditionEl = document.getElementById('condition');
const weatherIconEl = document.getElementById('weather-icon');
const dayNightIndicator = document.getElementById('day-night-indicator');
const loadingEl = document.getElementById('loading');
const errorMessageEl = document.getElementById('error-message');

// Inicialização: Verifica se há cidade salva no localStorage
document.addEventListener('DOMContentLoaded', () => {
    const lastCity = localStorage.getItem('lastCity');
    if (lastCity) {
        fetchWeather(lastCity);
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            fetchWeather(city);
            cityInput.blur();
        }
    }
});

/**
 * Função principal: Faz a chamada para o NOSSO arquivo PHP
 */
async function fetchWeather(city) {
    try {
        weatherDisplay.classList.add('hidden');
        errorMessageEl.classList.add('hidden');
        loadingEl.classList.remove('hidden');

        // CHAMA O BACKEND LOCAL 
        const response = await fetch(`weather-proxy.php?city=${encodeURI(city)}`);
        const data = await response.json();

        // O PHP repassa o código 404 se a cidade não existir
        if (!response.ok) {
            throw new Error(data.message || 'Cidade não encontrada.');
        }

        // Salva a pesquisa bem-sucedida
        localStorage.setItem('lastCity', data.name);
        cityInput.value = '';

        updateUI(data);

    } catch (error) {
        console.error("Erro:", error);
        showError(error.message);
    } finally {
        loadingEl.classList.add('hidden');
    }
}

function updateUI(data) {
    cityNameEl.textContent = data.name;
    temperatureEl.textContent = Math.round(data.main.temp);
    conditionEl.textContent = data.weather[0].description;
    
    const iconCode = data.weather[0].icon;
    // Pega o ícone oficial em alta resolução da OpenWeatherMap
    weatherIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

    // O OpenWeatherMap usa 'd' (day) ou 'n' (night) no final do código do ícone
    const isDay = iconCode.includes('d');
    
    if (isDay) {
        document.body.className = 'day-theme';
        dayNightIndicator.innerHTML = '<i class="fas fa-sun" style="color: #FFD700;"></i> É Dia';
        dayNightIndicator.style.color = "#fff";
    } else {
        document.body.className = 'night-theme';
        dayNightIndicator.innerHTML = '<i class="fas fa-moon" style="color: #82b1ff;"></i> É Noite';
        dayNightIndicator.style.color = "#fff";
    }

    weatherDisplay.classList.remove('hidden');
}

function showError(msg) {
    errorMessageEl.textContent = "Erro: " + msg;
    errorMessageEl.classList.remove('hidden');
}