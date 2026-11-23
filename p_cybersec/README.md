# 🛡️ CyberSec Lab — Laboratório Visual de Segurança da Informação & Criptografia Interativa

**Laboratório Forense Client-Side de AppSec, OWASP Top 10 & Criptografia Aplicada**  
*Desenvolvido em Vanilla JavaScript ES6+ • Zero Dependências Externas • Web Crypto API Nativa (`window.crypto.subtle`)*

---

## 1. Visão Executiva & Fundamentação Teórica

O **CyberSec Lab** é uma bancada forense interativa executada 100% no navegador, projetada para desmistificar as principais vulnerabilidades do catálogo **OWASP Top 10** e os fundamentos matemáticos da **criptografia moderna de chave pública e simétrica**.

A convergência entre a formação em **Física (UFES)**, os estudos em **Sistemas para Internet (IFES)** e a experiência prática em **Infraestrutura e Suporte de TI na Silvato** pelo autor **Sandro** possibilita uma abordagem única:
- **Teoria dos Números & Álgebra Abstrata:** O problema do logaritmo discreto na troca de chaves Diffie-Hellman ($K = g^{ab} \pmod p$) e entropia estatística em geradores pseudoaleatórios criptograficamente seguros (CSPRNG).
- **Engenharia de Software Defensiva:** Separação estrita entre gramática de comandos e dados literais (Prepared Statements), codificação contextual de saída (Output Encoding) e mitigação em camadas via cabeçalhos HTTP Content Security Policy (CSP).
- **Padrões Abertos da Internet:** Padrões RFC 7519 (JSON Web Tokens), RFC 8446 (TLS 1.3), RFC 1321 (MD5) e FIPS 180-4 (Secure Hash Standards).

---

## 2. Os 5 Módulos Interativos

```
+-------------------------------------------------------------------------------------------------------------------------+
|                                              CYBERSEC LAB (ARQUITETURA CLIENT-SIDE)                                     |
+-------------------------------------------------------------------------------------------------------------------------+
| [1. SQLi & AST Parser]    [2. XSS & CSP Defense]    [3. TLS 1.3 Handshake]    [4. JWT Inspector]    [5. Hash & Salt Lab]|
|   • Lexer Léxico            • Reflected/Stored/DOM    • Raias Cliente/Sniffer   • Header/Payload/Sig  • MD5/SHA-1/SHA-256 |
|   • Árvore Lógica           • Sanitização HTML        • Troca Diffie-Hellman    • HMAC-SHA256 Nativo  • Salt de 16 Bytes  |
|   • Tautologias OR          • Violações CSP           • Derivação HKDF          • Exploit alg:none    • Benchmark Local   |
|   • Prepared Statements     • Exfiltração C2          • Sniffer HTTP vs HTTPS   • Brute-force Chave   • Projeção Cluster  |
+-------------------------------------------------------------------------------------------------------------------------+
|                                          CONSOLE SIEM AUDIT HUD (BASE FIXA)                                             |
|                     [ALL] [EXPLOIT] [BLOCKED] [CRYPTO] [WARN] [INFO] • Exportação JSON / TXT                            |
+-------------------------------------------------------------------------------------------------------------------------+
```

### 2.1. Módulo 1: SQL Injection (SQLi) & Visual AST Parser
- **Vulnerabilidade:** OWASP A03:2021 – Injection.
- **Mecanismo:** Interpolação insegura de strings de entrada do usuário diretamente no texto da consulta SQL (`SELECT * FROM users WHERE username = '${input}'`).
- **Parser AST Visual:** Converte o comando gerado em uma Árvore Sintática Abstrata. Demonstra graficamente como a inserção de `' OR '1'='1' --` bifurca o nó `WHERE` criando uma tautologia booleana que avalia como `TRUE`, enquanto o operador `--` trunca o restante da query, usurpando a checagem de senha e vazando todas as tuplas do banco de dados em memória.
- **Blindagem Defensiva:** Demonstração do modo *Prepared Statement*, onde os parâmetros são vinculados estritamente como literais de dados pelo driver (`LITERAL_STRING`), impedindo qualquer reestruturação na árvore gramatical.

### 2.2. Módulo 2: XSS (Cross-Site Scripting) & Defesa com CSP
- **Vulnerabilidade:** OWASP A03:2021 – Injection (Cross-Site Scripting).
- **Vetores Simulados:**
  - *Reflected XSS:* Parâmetro de busca refletido diretamente no DOM sem tratamento.
  - *Stored XSS:* Payload persistente injetado em mural colaborativo corporativo.
  - *DOM-based XSS:* Manipulação perigosa através de APIs cliente.
- **Sandbox da Vítima:** Visualização do armazenamento sensível da vítima (`session_auth` em cookie com `HttpOnly: false` e token JWT em `localStorage`).
- **Simulador de Exfiltração C2:** Notificação em tempo real simulando o disparo de requisições `fetch()` enviando as credenciais capturadas para um servidor Command & Control (`https://attacker-c2.evil/drop`).
- **Defesas em Profundidade:**
  - *Contextual HTML Entity Encoding:* Converte `<`, `>`, `"`, `'`, `&` em entidades inofensivas.
  - *Content Security Policy (CSP):* Cabeçalho HTTP `default-src 'self'; script-src 'self'; object-src 'none'` com console de captura de violações (Reporting API).

### 2.3. Módulo 3: TLS 1.3 / HTTPS Handshake & Diffie-Hellman (ECDHE)
- **Vulnerabilidade:** OWASP A02:2021 – Cryptographic Failures & Tráfego em Texto Claro.
- **Raias de Transmissão (Swimlanes):**
  1. *Fase 1 (ClientHello):* Versão TLS 1.3, suítes de cifra e chave pública efêmera $A = g^a \pmod p$.
  2. *Fase 2 (ServerHello & X.509):* Seleção de `TLS_AES_256_GCM_SHA384`, chave pública $B = g^b \pmod p$ e certificado digital assinado por CA.
  3. *Fase 3 (Diffie-Hellman):* Cliente e Servidor calculam o mesmo segredo compartilhado:
     $$K = B^a \pmod p = A^b \pmod p = g^{ab} \pmod p$$
  4. *Fase 4 (HKDF Expand):* Derivação da chave simétrica de sessão de 256 bits com Forward Secrecy.
  5. *Fase 5 (Finished):* Estabelecimento do túnel criptografado com cadeado verde.
- **Packet Sniffer Wi-Fi:** Alternância imediata entre tráfego desprotegido (HTTP revelando credenciais e cookies em texto claro) e tráfego HTTPS (fluxo ininteligível de bytes cifrados).

### 2.4. Módulo 4: JWT Inspector & Signature Forgery
- **Vulnerabilidade:** OWASP A01:2021 – Broken Access Control & RFC 7519.
- **Visualizador Tricolor Sincronizado:** Header em rosa/crimson, Payload/Claims em violeta e Assinatura em ciano.
- **Motor Web Crypto HMAC-SHA256 Real:** Gera e valida assinaturas de 256 bits nativamente via `window.crypto.subtle.sign`. Ao alterar uma única letra nas claims (ex: alterar `role: "user"` para `role: "admin"`), o sistema diagnostica instantaneamente `INVALID SIGNATURE / TOKEN TAMPERED`.
- **Laboratório de Exploits:**
  - *Bypass `alg: none` (CVE-2015-9235):* Remoção da assinatura forçando cabeçalho nulo, simulando aceitação em servidores mal configurados.
  - *Quebrador de Chaves por Dicionário Local:* Ataque de força bruta executado via Web Crypto API medindo tempo de quebra em milissegundos contra senhas fracas comuns.

### 2.5. Módulo 5: Hashing, Salt & Resistência a Força Bruta
- **Vulnerabilidade:** OWASP A02:2021 – Cryptographic Failures & Armazenamento Inseguro de Senhas.
- **Multi-Digest em Tempo Real:** Geração paralela assíncrona de MD5 (RFC 1321 puro), SHA-1 (Web Crypto), SHA-256 (Web Crypto) e Bcrypt KDF ($2^{12}$ rounds).
- **Demonstração Visual de Salting:**
  - *Sem Salt:* Dois usuários com a mesma senha possuem hashes SHA-256 idênticos, revelando padrão e vulnerabilidade a tabelas arco-íris (Rainbow Tables).
  - *Com Salt de 16 Bytes CSPRNG:* Geração de 128 bits de entropia aleatória via `crypto.getRandomValues()`. Hashes tornam-se completamente distintos e imunes a ataques pré-computados.
- **Benchmark Local de Throughput:** Medição ao vivo de 10.000 iterações SHA-256 na CPU do navegador e confronto contra projeções em clusters GPU (RTX 4090: 20 bilhões de hashes/s vs ~3.000 Bcrypt/s).

---

## 3. Console SIEM HUD & Relatório de Auditoria

Todos os eventos gerados pelos cinco módulos são centralizados no **Security Information and Event Management (SIEM) HUD**:
- **Categorias:** `EXPLOIT`, `BLOCKED`, `CRYPTO`, `WARN`, `INFO`.
- **Filtros Rápidos e Contador Global de Telemetria:** Atualização de métricas em tempo real no header e na barra de ferramentas.
- **Exportação Forense:** Download direto de relatórios estruturados nos formatos `.json` e `.txt` com carimbo de data/hora ISO para comprovação e estudo.

---

## 4. Teclas de Atalho & Controles Rápidos

| Tecla / Atalho | Ação Executada |
| :--- | :--- |
| <kbd>1</kbd> ou <kbd>Alt + 1</kbd> | Alternar para Módulo 1 (SQLi & AST Parser) |
| <kbd>2</kbd> ou <kbd>Alt + 2</kbd> | Alternar para Módulo 2 (XSS & CSP Defense) |
| <kbd>3</kbd> ou <kbd>Alt + 3</kbd> | Alternar para Módulo 3 (TLS 1.3 Handshake) |
| <kbd>4</kbd> ou <kbd>Alt + 4</kbd> | Alternar para Módulo 4 (JWT Inspector) |
| <kbd>5</kbd> ou <kbd>Alt + 5</kbd> | Alternar para Módulo 5 (Hash & Salt Lab) |
| <kbd>Alt + L</kbd> | Expandir / Recolher Console SIEM HUD |
| <kbd>Alt + R</kbd> | Resetar parâmetros do módulo ativo |
| <kbd>Alt + E</kbd> | Abrir modal de exportação de relatório forense |
| <kbd>Esc</kbd> | Fechar modal de auditoria |

---

## 5. Autor

**Sandro Junior Hoffmann de Oliveira**  
- **Bacharel em Física** — Universidade Federal do Espírito Santo (UFES)  
- **Graduando em Sistemas para Internet (TSI)** — Instituto Federal do Espírito Santo (IFES)  
- **Assistente de TI** — Silvato  
- **GitHub:** [@sanjrhoff](https://github.com/sanjrhoff)  
- **Portfólio:** [sanjrhoff.github.io/portifolio](https://sanjrhoff.github.io/portifolio/)
