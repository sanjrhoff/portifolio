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
 * Em ambientes puramente estáticos (ex: GitHub Pages), inclui fallback de demonstração.
 */
async function fetchWeather(city) {
    try {
        weatherDisplay.classList.add('hidden');
        errorMessageEl.classList.add('hidden');
        loadingEl.classList.remove('hidden');

        // CHAMA O BACKEND LOCAL 
        const response = await fetch(`weather-proxy.php?city=${encodeURI(city)}`);
        const text = await response.text();
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (jsonErr) {
            // Em servidores estáticos (como GitHub Pages), o PHP não é interpretado
            console.warn("Ambiente estático detectado (GitHub Pages). Exibindo dados de demonstração na UI Glassmorphism.");
            data = generateMockWeatherData(city);
        }

        // O PHP repassa o código 404 se a cidade não existir
        if (data && data.cod && (data.cod === '404' || data.cod === 404)) {
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

function generateMockWeatherData(city) {
    const formatted = city.charAt(0).toUpperCase() + city.slice(1);
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 18;
    return {
        name: `${formatted} (Demo)`,
        main: { temp: 24 },
        weather: [
            {
                description: isNight ? 'Céu estrelado e brisa noturna' : 'Parcialmente ensolarado e agradável',
                icon: isNight ? '01n' : '02d'
            }
        ]
    };
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