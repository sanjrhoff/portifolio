# Glass Weather App (Secure Architecture)

Um aplicativo de previsão do tempo com design Glassmorphism.

## Arquitetura de Segurança (Backend Proxy)
Para proteger a chave da API e evitar exposição no lado do cliente, este projeto utiliza o padrão de **Proxy Reverso**. O Front-end (JavaScript) faz requisições apenas para um arquivo interno (`weather-proxy.php`), que por sua vez se comunica com a API externa (OpenWeatherMap) através de servidor (cURL).

## Como configurar a API (100% Gratuita)
1. Acesse [openweathermap.org](https://openweathermap.org/) e crie uma conta gratuita.
2. Vá no seu perfil -> **My API Keys**.
3. Copie a chave padrão (ou gere uma nova).
4. Abra o arquivo `weather-proxy.php` e cole sua chave na variável `$apiKey`.

## Como Executar
Como este projeto utiliza PHP para segurança, ele **não pode** ser aberto com duplo-clique no HTML.
1. Coloque a pasta do projeto dentro do `htdocs` do seu **XAMPP**.
2. Inicie o servidor Apache.
3. Acesse `http://localhost/portfolio-weather-app/`