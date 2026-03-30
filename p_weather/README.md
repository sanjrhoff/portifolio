# Glass Weather App (Secure Architecture)

Um aplicativo de previsão do tempo com design Glassmorphism.

## Como configurar a API (100% Gratuita)
1. Acesse [openweathermap.org](https://openweathermap.org/) e crie uma conta gratuita.
2. Vá no seu perfil -> **My API Keys**.
3. Copie a chave padrão (ou gere uma nova).
4. Na raiz do projeto, faça uma cópia do arquivo `.env.example` e renomeie para `.env`.
5. Abra o novo arquivo `.env` e substitua o valor da variável com a sua chave da API.

## Como Executar
Como este projeto utiliza PHP para segurança, ele **não pode** ser aberto com duplo-clique no arquivo HTML.
1. Coloque a pasta do projeto dentro do `htdocs` do seu **XAMPP**.
2. Inicie o servidor Apache.
3. Acesse `http://localhost/portfolio-weather-app/`