# 🌊 WaveLab 2D — Equação de Onda FDTD, Dupla Fenda & Efeito Doppler

**Simulador Interativo de Mecânica Ondulatória & Ótica Física**  
*Desenvolvido em Vanilla JavaScript ES6+ • Zero Dependências • HTML5 Canvas a 60 FPS*

---

## 1. Fundamentação Física & Formulação Matemática

O **WaveLab 2D** resolve numericamente a equação diferencial parcial hiperbólica da onda bidimensional com termo dissipativo de amortecimento viscoso:

$$\frac{\partial^2 u}{\partial t^2} = c^2 \nabla^2 u - \gamma \frac{\partial u}{\partial t}$$

Onde:
- $u(x, y, t)$ representa a amplitude da perturbação no ponto $(x, y)$ no instante $t$.
- $c$ é a velocidade de propagação de fase da onda no meio.
- $\gamma(x, y) \ge 0$ é o coeficiente de amortecimento espacial (PML perimetral).
- $\nabla^2 u = \frac{\partial^2 u}{\partial x^2} + \frac{\partial^2 u}{\partial y^2}$ é o operador laplaciano 2D.

### 1.1. Discretização FDTD (Finite-Difference Time-Domain)
Empregando aproximações de diferenças finitas centradas de 2ª ordem temporal e espacial em uma malha cartesiana com passo $\Delta x = \Delta y$:

$$u_{i,j}^{t+\Delta t} = \frac{1}{1 + \frac{\gamma \Delta t}{2}} \left[ 2 u_{i,j}^t - \left(1 - \frac{\gamma \Delta t}{2}\right) u_{i,j}^{t-\Delta t} + S^2 \Delta^2 u_{i,j}^t \right]$$

Onde o laplaciano discreto de 5 pontos é dado por:
$$\Delta^2 u_{i,j}^t = u_{i+1,j}^t + u_{i-1,j}^t + u_{i,j+1}^t + u_{i,j-1}^t - 4 u_{i,j}^t$$

### 1.2. Condição de Estabilidade de Courant-Friedrichs-Lewy (CFL)
Para prevenir divergência exponencial e oscilações numéricas não físicas, a condição CFL impõe:

$$S = c \frac{\Delta t}{\Delta x} \le \frac{1}{\sqrt{2}} \approx 0.7071$$

O motor opera com $S = 0.50$ ($S^2 = 0.25$), garantindo estabilidade estrita incondicional e mínima dispersão numérica de alta frequência.

### 1.3. Camada Absorvente Perimetral (PML - Perfectly Matched Layer)
Para evitar reflexões parasitas de borda que poluam o padrão de interferência, implementamos um amortecimento quadrático progressivo nas 18 células periféricas:

$$\gamma(d) = \gamma_{\text{base}} + \gamma_{\text{max}} \left( \frac{W_{\text{pml}} - d}{W_{\text{pml}}} \right)^2$$

---

## 2. Experimentos & Fenomenologia Física

### 2.1. Dupla Fenda de Young & Padrão de Franjas
Uma barreira opaca com duas aberturas de largura $a$ e espaçamento $d$ atua como duas fontes pontuais coerentes (Princípio de Huygens-Fresnel). No anteparo à direita, o sensor detecta a intensidade média instantânea $\langle u^2(y) \rangle$ correlacionando com a teoria:

$$I(\theta) = I_0 \left( \frac{\sin\beta}{\beta} \right)^2 \cos^2\alpha$$

Com $\beta = \frac{\pi a}{\lambda} \sin\theta$ e $\alpha = \frac{\pi d}{\lambda} \sin\theta$.

### 2.2. Efeito Doppler e Cone de Choque de Mach
Uma fonte oscilante transladando com velocidade $v_s$:
- **Regime Subsônico ($v_s < c$):** Compressão do comprimento de onda à frente e rarefação atrás.
- **Regime Sônico ($v_s = c$):** Acúmulo de frentes de onda na barreira do som ($M = 1$).
- **Regime Supersônico ($v_s > c$):** Formação do cone de choque de Mach com meio-ângulo:
  $$\sin\mu = \frac{c}{v_s} = \frac{1}{M}$$

---

## 3. Arquitetura de Software & Desempenho
- **Renderização por Software via ImageData:** Manipulação direta de buffers de 32 bits `Uint32Array` mapeados via Look-up Tables (LUT) de 512 níveis de cor para 60 FPS contínuos.
- **Zero Alocação de Memória no Loop:** Três arrays tipados `Float32Array` permutados por ponteiros a cada subpasso temporal.
- **Interface Dark Zinc:** Consistência estética e ergonômica com a suite científica do portfólio.
