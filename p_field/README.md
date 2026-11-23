# ⚡ FieldLorentz — Eletromagnetismo, Linhas de Campo RK4 & Força de Lorentz

**Simulador Interativo de Campos Eletrostáticos & Dinâmica de Lorentz**  
*Desenvolvido em Vanilla JavaScript ES6+ • Zero Dependências • HTML5 Canvas a 60 FPS*

---

## 1. Fundamentação Física & Formulação Matemática

O **FieldLorentz** simula a interação fundamental entre cargas elétricas pontuais, campos elétricos estáticos e indução magnética transversal sobre partículas subatômicas no espaço bidimensional.

### 1.1. Lei de Coulomb e Princípio de Superposição
Para um conjunto de $N$ cargas pontuais $q_i$ posicionadas em $\vec{r}_i = (x_i, y_i)$, o campo elétrico resultante $\vec{E}(x, y)$ em qualquer ponto do vácuo é:

$$\vec{E}(\vec{r}) = k_e \sum_{i=1}^N q_i \frac{\vec{r} - \vec{r}_i}{\left(\|\vec{r} - \vec{r}_i\|^2 + \epsilon^2\right)^{3/2}}$$

Onde $\epsilon$ é o parâmetro de suavização (*softening*) que elimina singularidades assintóticas quando partículas ou linhas passam próximo ao núcleo de carga.

O potencial elétrico escalar correspondente é:

$$V(\vec{r}) = k_e \sum_{i=1}^N \frac{q_i}{\sqrt{\|\vec{r} - \vec{r}_i\|^2 + \epsilon^2}}$$

### 1.2. Traçado Contínuo de Linhas de Faraday via RK4
Diferente de matrizes discretas de setas estáticas, as linhas de campo são curvas integrais contínuas tangentes ao vetor campo:

$$\frac{d\vec{r}}{ds} = \frac{\vec{E}(\vec{r})}{\|\vec{E}(\vec{r})\|}$$

Integradas numericamente pelo método de **Runge-Kutta de 4ª Ordem (RK4)** com $M \in [8, 32]$ sementes angulares ao redor de cada carga:

$$\vec{k}_1 = \hat{E}(\vec{r}_n)$$
$$\vec{k}_2 = \hat{E}\left(\vec{r}_n + \frac{\Delta s}{2} \vec{k}_1\right)$$
$$\vec{k}_3 = \hat{E}\left(\vec{r}_n + \frac{\Delta s}{2} \vec{k}_2\right)$$
$$\vec{k}_4 = \hat{E}(\vec{r}_n + \Delta s \, \vec{k}_3)$$
$$\vec{r}_{n+1} = \vec{r}_n + \frac{\Delta s}{6} \left(\vec{k}_1 + 2\vec{k}_2 + 2\vec{k}_3 + \vec{k}_4\right)$$

### 1.3. Dinâmica de Lorentz & Integrador de Boris
A força eletromagnética total atuando sobre uma partícula livre com massa $m$, carga $q$ e velocidade $\vec{v}$ imersa em campos $\vec{E}$ e $\vec{B} = B_z \hat{k}$ é descrita pela **Força de Lorentz**:

$$\vec{F} = q \left( \vec{E} + \vec{v} \times \vec{B} \right)$$

No plano cartesiano 2D:
$$F_x = q(E_x + v_y B_z), \quad F_y = q(E_y - v_x B_z)$$

Para preservar estritamente a energia mecânica e o raio de Larmor $r_L = \frac{m v_\perp}{|q| B}$ sem divergências espúrias de integradores ingênuos de Euler, utilizamos o **Algoritmo de Boris**:
1. Meio avanço elétrico: $\vec{v}^- = \vec{v}^t + \frac{q \vec{E}}{m} \frac{\Delta t}{2}$
2. Rotação puramente magnética: $\vec{v}^+ = \mathcal{R}(\vec{v}^-, \vec{B}, \Delta t)$ conservando $\|\vec{v}\|$
3. Segundo meio avanço elétrico: $\vec{v}^{t+\Delta t} = \vec{v}^+ + \frac{q \vec{E}}{m} \frac{\Delta t}{2}$
4. Atualização de posição: $\vec{r}^{t+\Delta t} = \vec{r}^t + \vec{v}^{t+\Delta t} \Delta t$

---

## 2. Experimentos & Presets Históricos

1. **Dipolo Eletrostático:** O par clássico $+q$ e $-q$ de Faraday com linhas de força contínuas e superfícies equipotenciais ortogonais.
2. **Gaiola de Faraday:** Cilindro circular de 10 condutores carregados com cargas idênticas; anulação exata do campo no interior ($\vec{E} \approx 0$).
3. **Acelerador Ciclotron de Lawrence:** Cavidades magnéticas semicirculares (Dees) com campo alternado $E_x(t) = E_0 \cos(\omega_c t)$ acelerando prótons em espiral até a ejeção.
4. **Espectrômetro de Massa de Bainbridge:** Estágio 1 seletor de velocidades cruzadas $v = E/B$ seguido de câmara de deflexão pura demonstrando a separação isotópica.
5. **Deriva $E \times B$:** Movimento cicloidal em campos perpendiculares, reproduzindo a velocidade guia de deriva de partículas em física de plasmas.

---

## 3. Arquitetura de Software
- **Zero Dependências:** 100% Vanilla JavaScript ES6+ compatível com GitHub Pages.
- **Sub-Stepping Numérico:** 8 subpassos temporais por quadro para estabilidade orbital rigorosa.
- **Interação Tátil:** Mira vetorial com estilingue elástico, leitura HUD de velocidade e ângulo.
