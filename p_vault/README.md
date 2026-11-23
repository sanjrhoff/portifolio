# 🛡️ Zero-Knowledge Secret Vault

Bunker de credenciais e segredos de conhecimento zero (*Zero-Knowledge*) construído sobre as primitivas criptográficas da **Web Crypto API** nativa (`window.crypto.subtle`).

---

## 🔒 Arquitetura Criptográfica Militar

- **Derivação de Chave (KDF):** `PBKDF2` com **100.000 iterações**, `SHA-256` e salt aleatório criptográfico de 16 bytes (`crypto.getRandomValues`).
- **Cifragem Autenticada:** `AES-GCM (256 bits)` com vetor de inicialização (IV) único de 12 bytes gerado para cada operação de gravação e tag de autenticação intrínseca de 128 bits.
- **Isolamento de Memória (RAM-Only):** Nenhuma credencial decifrada ou chave em texto claro é persistida em storage ou disco. Ao trancar o cofre ou fechar a aba, a variável de estado volátil é descartada.
- **Auto-Lock de Inatividade:** Temporizador regressivo de 5 minutos que monitora interações do usuário e bloqueia o cofre automaticamente caso o terminal fique ocioso.
- **Clipboard Guard:** Limpeza automática da área de transferência após 15 segundos da cópia de um segredo.
- **Gerador de Senhas com Medidor de Entropia:** Cálculo exato de entropia em bits ($E = L \times \log_2(R)$) e estimativa de tempo para quebra por força bruta GPU.
- **Backup e Restauração Criptografada:** Exportação e importação de backups seguros com extensão `.vault`.

---

## 🚀 Como Executar

Por ser uma aplicação 100% estática compatível com GitHub Pages, não requer backend:
Basta abrir o arquivo `index.html` em qualquer navegador moderno.
