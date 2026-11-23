# 🌌 OrbitN — Simulador Gravitacional de N-Corpos & Dinâmica Orbital

> **Observatório Astrofísico e Integrador Numérico Simplético no Navegador**  
> Desenvolvido em **JavaScript Puro (ES6+)** com renderização via **HTML5 Canvas 2D**. Zero dependências externas. Compatível 100% com **GitHub Pages**.

---

## 1. Visão Geral do Projeto

O **OrbitN** é um simulador computacional de astrofísica e mecânica celeste que modela sistemas com $N$ massas pontuais sob atração gravitacional mútua. Utilizando o algoritmo de integração numérica simplética **Velocity Verlet** de 2ª ordem, a aplicação preserva estritamente a energia mecânica e o momento linear do sistema a longo prazo, impedindo a degradação e dispersão orbital típica de integradores amadores baseados no método de Euler.

A aplicação exemplifica a proficiência em **Cálculo Numérico, Álgebra Linear e Física Clássica** adquirida durante a graduação em **Física na Universidade Federal do Espírito Santo (UFES)**, unida à engenharia de software contemporânea em aplicações web ultrarrápidas a **60 FPS**.

---

## 2. Fundamentação Física & Formulação Matemática

### 2.1. Lei da Gravitação Universal com Suavização de Plummer
Para um sistema com $N$ partículas pontuais, a aceleração sobre a $i$-ésima massa exercida por todos os outros corpos $j \ne i$ é:
$$\vec{a}_i = G \sum_{j \ne i}^N \frac{m_j}{(r_{ij}^2 + \epsilon^2)^{3/2}} (\vec{r}_j - \vec{r}_i)$$
Onde:
- $G$ é a constante gravitacional do simulador.
- $\vec{r}_{ij} = \vec{r}_j - \vec{r}_i$ é o vetor deslocamento.
- $\epsilon > 0$ é o parâmetro de suavização gravitacional (*Plummer softening factor*), essencial para prevenir singularidades e ejeções infinitas espúrias em aproximações quase-colineares.

### 2.2. Por que o Integrador Velocity Verlet? (Superioridade Numérica)
Simuladores comuns empregam o método de Euler:
$$\vec{x}_{t + \Delta t} = \vec{x}_t + \vec{v}_t \Delta t$$
$$\vec{v}_{t + \Delta t} = \vec{v}_t + \vec{a}_t \Delta t$$
O método de Euler **não é simplético**: a energia mecânica do sistema não se conserva, sofrendo drift cumulativo de erro $O(\Delta t)$, fazendo com que planetas espiralem para fora ou colidam com o sol em poucos ciclos.

O **Velocity Verlet** é um integrador simplético de 2ª ordem $O(\Delta t^2)$, reversível no tempo e com conservação estrita de energia mecânica média e momento angular:
1. **Passo de Posição:**
   $$\vec{r}_i(t + \Delta t) = \vec{r}_i(t) + \vec{v}_i(t)\Delta t + \frac{1}{2}\vec{a}_i(t)\Delta t^2$$
2. **Avaliação das Novas Forças:**
   Calcula $\vec{a}_i(t + \Delta t)$ recalculando todas as interações par-a-par nas novas coordenadas $\vec{r}_i(t + \Delta t)$.
3. **Passo de Velocidade:**
   $$\vec{v}_i(t + \Delta t) = \vec{v}_i(t) + \frac{1}{2} \left[\vec{a}_i(t) + \vec{a}_i(t + \Delta t)\right]\Delta t$$

### 2.3. Conservação de Energia Mecânica ($E = K + U$)
- Energia Cinética:
  $$K = \sum_{i=1}^N \frac{1}{2} m_i \|\vec{v}_i\|^2$$
- Energia Potencial Gravitacional:
  $$U = - \sum_{i < j} \frac{G m_i m_j}{\sqrt{r_{ij}^2 + \epsilon^2}}$$
- Desvio de Conservação exibido no HUD:
  $$\frac{\Delta E}{E_0} = \frac{E(t) - E_0}{|E_0|} \times 100\% \quad (\le 0.005\%)$$

### 2.4. Colisão Perfeitamente Inelástica & Fusão de Massas
Quando a distância entre dois corpos satisfaz $r_{ij} < 0.85 \times (R_i + R_j)$, os corpos se fundem:
- **Conservação de Massa:** $M_{\text{novo}} = m_i + m_j$
- **Conservação de Momento Linear:** $\vec{v}_{\text{novo}} = \frac{m_i \vec{v}_i + m_j \vec{v}_j}{m_i + m_j}$
- **Centro de Massa do Impacto:** $\vec{r}_{\text{novo}} = \frac{m_i \vec{r}_i + m_j \vec{r}_j}{m_i + m_j}$
- **Raio Volumétrico:** $R_{\text{novo}} = \sqrt[3]{R_i^3 + R_j^3}$

---

## 3. Presets Clássicos da Astrofísica

1. **Sistema Solar Interno Estável:**  
   Sol massivo no centro, Mercúrio, Terra com a Lua em órbita estável concomitante, e Marte em trajetórias fechadas de Kepler.
2. **O Problema dos Três Corpos Caótico:**  
   Três massas idênticas em posições quase-equiláteras com pequenas perturbações, exibindo caos determinístico contínuo e o Efeito Borboleta.
3. **Coreografia Estável da Figura de Oito (Moore-Chenciner):**  
   Solução periódica exata em que três massas iguais perseguem-se perpetuamente ao longo de uma lemniscata plana em loop contínuo.
4. **Colisão de Duas Galáxias (Forças de Maré Gravitacional):**  
   Dois núcleos supermassivos circundados por discos estelares em colisão frontal, demonstrando a ejeção e formação de braços de maré (*tidal tails*).
5. **Estrela Binária com Planeta Circumbinário ("Tatooine"):**  
   Duas estrelas girando ao redor de seu baricentro mútuo e um planeta orbitando ambas a uma distância estável.

---

## 4. Controles e Atalhos de Teclado (Hotkeys)

- `Espaço`: Alternar Play / Pause na integração temporal.
- `S`: Passo Único (Step) para análise quadro a quadro.
- `T`: Alternar visibilidade dos rastros orbitais.
- `C`: Limpar todos os corpos celestes ativos.
- `R`: Restaurar o preset orbital atual para as condições iniciais.
- `1` a `5`: Alternar rapidamente entre os presets clássicos.
- `Clique e Arraste`: Injetar novo corpo celeste com linha vetorial elástica de velocidade inicial $\vec{v}_0$.
- `Scroll do Mouse`: Zoom in / Zoom out contínuo em relação ao cursor.
- `Botão Direito / Botão Meio`: Pan livre da câmera astronômica.

---

## 5. Arquitetura de Software

```
p_gravity/
├── index.html     # Marcação semântica, console orbital e HUD de telemetria
├── styles.css     # Design System Dark Zinc com estética astrofísica
├── script.js      # Integrador Velocity Verlet e física de N-Corpos (ES6+)
└── README.md      # Documentação técnica e modelagem teórica
```

---

## 6. Licença & Créditos

Desenvolvido por **Sandro** (Física UFES / Engenharia de Software) como demonstração de modelagem computacional avançada em física e engenharia frontend.  
Licença MIT. Livre para uso educacional e acadêmico.
