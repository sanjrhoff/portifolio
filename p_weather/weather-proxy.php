<?php
// Define que a resposta será em formato JSON
header('Content-Type: application/json');

// Crie uma conta em openweathermap.org para pegar a sua.
$apiKey = '1085b3ae861bcff8e498c4cfa76815b9';

// Verifica se o JavaScript enviou o nome da cidade
if (!isset($_GET['city']) || empty($_GET['city'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Nome da cidade não fornecido.']);
    exit;
}

$city = urlencode($_GET['city']);

// Monta a URL da API do OpenWeatherMap (units=metric traz em Celsius, lang=pt_br traduz)
$url = "https://api.openweathermap.org/data/2.5/weather?q={$city}&appid={$apiKey}&units=metric&lang=pt_br";

// Inicia o cURL 
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Evita erros de SSL no XAMPP local

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Repassa o código de status HTTP (ex: 200 OK, 404 Not Found) e o JSON para o nosso Front-end
http_response_code($httpCode);
echo $response;
?>