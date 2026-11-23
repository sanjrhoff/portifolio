# 🌌 OrbitN — Simulador Gravitacional de N-Corpos & Módulo Relativístico de Buracos Negros

> **Observatório Astrofísico, Integrador Numérico Simplético & Relatividade Geral no Navegador**  
> Desenvolvido em **JavaScript Puro (ES6+)** com renderização via **HTML5 Canvas 2D**. Zero dependências externas. Compatível 100% com **GitHub Pages**.

---

## 1. Visão Geral do Projeto

O **OrbitN** é um simulador computacional de astrofísica e mecânica celeste que modela sistemas com $N$ massas sob atração gravitacional mútua combinada a um **Módulo Relativístico de Buracos Negros**. Utilizando o algoritmo de integração numérica simplética **Velocity Verlet** de 2ª ordem acoplado a soluções da métrica de Schwarzschild, a aplicação preserva estritamente a energia mecânica e o momento linear do sistema a longo prazo, impedindo a degradação e dispersão orbital típica de integradores amadores baseados no método de Euler.

A aplicação exemplifica a proficiência em **Cálculo Numérico, Álgebra Linear e Física Clássica e Moderna** adquirida durante a graduação em **Física na Universidade Federal do Espírito Santo (UFES)**, unida à engenharia de software contemporânea em aplicações web ultrarrápidas a **60 FPS**.

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
Quando a distância entre dois corpos clássicos satisfaz $r_{ij} < 0.85 \times (R_i + R_j)$, os corpos se fundem:
- **Conservação de Massa:** $M_{\text{novo}} = m_i + m_j$
- **Conservação de Momento Linear:** $\vec{v}_{\text{novo}} = \frac{m_i \vec{v}_i + m_j \vec{v}_j}{m_i + m_j}$
- **Centro de Massa do Impacto:** $\vec{r}_{\text{novo}} = \frac{m_i \vec{r}_i + m_j \vec{r}_j}{m_i + m_j}$
- **Raio Volumétrico:** $R_{\text{novo}} = \sqrt[3]{R_i^3 + R_j^3}$

### 2.5. Módulo Relativístico de Buracos Negros (Relatividade Geral)

#### A. Métrica de Schwarzschild & Raio do Horizonte de Eventos
Para uma singularidade estática e não-rotacionante de Schwarzschild com massa $M$, o elemento de linha no vácuo prevê um horizonte de eventos onde a velocidade de escape se iguala à velocidade da luz $c_{\text{sim}}$:
$$r_s = \frac{2GM}{c_{\text{sim}}^2}$$
No simulador, calibrado com $G = 1.0$ e $c_{\text{sim}}^2 = 200$, uma singularidade supermassiva ($M = 4000$) gera um horizonte de eventos de raio $r_s = 40.0\text{ px}$.

#### B. Esfera de Fótons (*Photon Sphere*)
Na distância radial $r_{ph}$, fótons e partículas ultra-relativísticas percorrem órbitas circulares fechadas instáveis:
$$r_{ph} = \frac{3GM}{c_{\text{sim}}^2} = 1.5 \, r_s$$
Visualmente, a esfera de fótons é representada por um anel luminescente ciano `#67e8f9` com modulação senoidal $\alpha(t) = 0.65 + 0.20 \sin(3.5 t)$ e halo radiante com blur radial.

#### C. Forças de Maré & Limite de Roche Relativístico
Quando um corpo celeste extenso de raio $R_*$ e massa $m_*$ aproxima-se do buraco negro a uma distância $r$, o gradiente de gravidade gera uma aceleração diferencial de maré:
$$\Delta a_{\text{maré}} \approx \frac{2 G M_{\text{BH}} R_*}{r^3}$$
A ruptura estrutural por colapso gravitacional ocorre ao cruzar o **Limite de Roche**:
$$d_{\text{Roche}} \approx R_* \left(2 \, \frac{M_{\text{BH}}}{m_*}\right)^{1/3}$$

#### D. Dinâmica de Espaguetificação (*Tidal Disruption Event* - TDE)
- **Fase Pré-Ruptura ($r \le 1.5 d_{\text{Roche}}$):** O corpo sofre alongamento elipsoidal progressivo orientado em direção à singularidade ($\frac{a}{b} \propto (d_{\text{Roche}}/r)^2$).
- **Fase de Ruptura ($r \le d_{\text{Roche}}$):** O corpo é fragmentado em um feixe de dezenas de partículas incandescentes (`AccretionDebris`). Cada partícula herda a velocidade do centro de massa mais a velocidade diferencial de maré tangencial e radial $\Delta v_{\text{tide}} \sim \sqrt{\frac{2 G M R_*}{r^2}}$, gerando uma longa fita filamentar em espiral.

#### E. Termodinâmica do Disco de Acreção & Beaming Doppler Relativístico
- **Gradiente Térmico:** Partículas de acreção exibem radiação de corpo negro proporcional ao decaimento radial:
  - Próximo a $r_{ph}$: Branco plasma incandescente ($>10^7\text{ K}$).
  - Zona intermediária: Ouro solar e amarelo plasma.
  - Borda externa: Âmbar e carmesim escuro.
- **Efeito Doppler Relativístico (Beaming Luminoso):** O semi-plano cujas partículas orbitam em direção ao observador/câmera tem seu brilho intensificado por aberração relativística ($1.55\times$), enquanto o lado que se afasta sofre redução de fluxo ($0.48\times$).

#### F. Absorção no Horizonte de Eventos & Conservação
Toda matéria que cruza $r \le r_s$ é consumida instantaneamente pela singularidade:
- **Massa:** $M_{\text{novo}} = M_{\text{BH}} + m_*$
- **Momento Linear:** $\vec{v}_{\text{novo}} = \frac{M_{\text{BH}}\vec{v}_{\text{BH}} + m_*\vec{v}_*}{M_{\text{novo}}}$
- **Expansão Dinâmica do Horizonte:** Recálculo imediato de $r_s$ e $r_{ph}$ com emissão de pulso óptico de absorção.

---

## 3. Presets Clássicos e Relativísticos da Astrofísica

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
6. **Buraco Negro Supermassivo & Disco de Acreção (Gargantua):**  
   Singularidade central com $M = 4000$, $r_s = 40\text{ px}$, $r_{ph} = 60\text{ px}$, cercada por um disco de 160 partículas keplerianas em alta velocidade com gradiente térmico e beaming Doppler, e dois planetas externos em órbitas estáveis (Miller e Mann).
7. **Espaguetificação Estelar (Tidal Disruption Event - TDE):**  
   Singularidade supermassiva e uma estrela companheira injetada em órbita parabólica rasante. Ao cruzar o Limite de Roche ($d_{\text{Roche}} \approx 96\text{ px}$), a estrela se deforma, rompe-se e se converte em um rastro espiral de espaguetificação com acreção em tempo real.

---

## 4. Controles e Atalhos de Teclado (Hotkeys)

- `Espaço`: Alternar Play / Pause na integração temporal.
- `S`: Passo Único (Step) para análise quadro a quadro.
- `T`: Alternar visibilidade dos rastros orbitais.
- `C`: Limpar todos os corpos celestes ativos.
- `R`: Restaurar o preset orbital atual para as condições iniciais.
- `1` a `7`: Alternar rapidamente entre os presets clássicos e relativísticos:
  - `1`: Sistema Solar Interno
  - `2`: Três Corpos Caótico
  - `3`: Figura de Oito (Moore-Chenciner)
  - `4`: Colisão Galáctica
  - `5`: Estrela Binária ("Tatooine")
  - `6`: Buraco Negro & Acreção (Gargantua)
  - `7`: Espaguetificação Estelar (TDE)
- `Clique e Arraste`: Injetar novo corpo celeste (incluindo Buraco Negro com $M = 4000$) com linha vetorial elástica de velocidade inicial $\vec{v}_0$.
- `Scroll do Mouse`: Zoom in / Zoom out contínuo em relação ao cursor.
- `Botão Direito / Botão Meio`: Pan livre da câmera astronômica.

---

## 5. Arquitetura de Software

```
p_gravity/
├── index.html     # Marcação semântica, console orbital, seletor de Buraco Negro e HUD de telemetria
├── styles.css     # Design System Dark Zinc com tokens relativísticos e badges ciano-violeta
├── script.js      # Velocity Verlet, física de Schwarzschild, Roche, TDE e renderização Canvas 2D
└── README.md      # Documentação técnica e modelagem teórica
```

---

## 6. Licença & Créditos

Desenvolvido por **Sandro** (Física UFES / Engenharia de Software) como demonstração de modelagem computacional avançada em física e engenharia frontend.  
Licença MIT. Livre para uso educacional e acadêmico.
