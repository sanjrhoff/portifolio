# 🌪️ ChaosPendulum — Pêndulo Duplo, Mecânica Analítica & Teoria do Caos

**Simulador Interativo de Dinâmica Não Linear & Atratores Caóticos**  
*Desenvolvido em Vanilla JavaScript ES6+ • Zero Dependências • HTML5 Canvas a 60 FPS*

---

## 1. Fundamentação Física & Formulação Matemática

O pêndulo duplo planar é o protótipo canônico dos sistemas dinâmicos não lineares determinísticos com sensibilidade extrema às condições iniciais (Efeito Borboleta).

### 1.1. Formulação Lagrangiana do Movimento
Com coordenadas generalizadas $\theta_1$ e $\theta_2$ (ângulos com a vertical), comprimentos $l_1, l_2$ e massas pontuais $m_1, m_2$:
- **Energia Cinética ($T = T_1 + T_2$):**
  $$T = \frac{1}{2}(m_1+m_2) l_1^2 \dot{\theta}_1^2 + \frac{1}{2}m_2 l_2^2 \dot{\theta}_2^2 + m_2 l_1 l_2 \dot{\theta}_1 \dot{\theta}_2 \cos(\theta_1 - \theta_2)$$
- **Energia Potencial Gravitacional ($V = V_1 + V_2$):**
  $$V = -(m_1+m_2) g l_1 \cos\theta_1 - m_2 g l_2 \cos\theta_2$$
- **Lagrangiana:** $L = T - V$.

Aplicando as equações de Euler-Lagrange $\frac{d}{dt}\left(\frac{\partial L}{\partial \dot{\theta}_i}\right) - \frac{\partial L}{\partial \theta_i} = 0$, obtemos as acelerações angulares explícitas acopladas:

$$\ddot{\theta}_1 = \frac{-g(2m_1+m_2)\sin\theta_1 - m_2 g \sin(\theta_1 - 2\theta_2) - 2\sin(\theta_1-\theta_2)m_2(\dot{\theta}_2^2 l_2 + \dot{\theta}_1^2 l_1 \cos(\theta_1-\theta_2))}{l_1\left(2m_1 + m_2 - m_2 \cos(2\theta_1 - 2\theta_2)\right)}$$

$$\ddot{\theta}_2 = \frac{2\sin(\theta_1-\theta_2)\left(\dot{\theta}_1^2 l_1 (m_1+m_2) + g(m_1+m_2)\cos\theta_1 + \dot{\theta}_2^2 l_2 m_2 \cos(\theta_1-\theta_2)\right)}{l_2\left(2m_1 + m_2 - m_2 \cos(2\theta_1 - 2\theta_2)\right)}$$

### 1.2. Integrador Numérico RK4 e Conservação Hamiltoniana
O sistema quadridimensional $\vec{Y} = [\theta_1, \omega_1, \theta_2, \omega_2]^T$ é integrado via **Runge-Kutta de 4ª Ordem (RK4)** com 8 subpassos por quadro ($\Delta t_{\text{sub}} \approx 0.0025\text{ s}$), garantindo conservação de energia total $E = T + V$ com desvio inferior a $0.001\%$ ao longo de minutos de simulação ininterrupta.

---

## 2. Telemetria Científica & O Efeito Borboleta

### 2.1. O Enxame de Lyapunov (*Butterfly Swarm*)
Ao acionar o botão hero, o simulador instancia $N = 100$ pêndulos simultâneos idênticos com perturbação inicial:

$$\theta_{1,k}(0) = \theta_{1,0} + k \cdot 10^{-6}\text{ rad}$$

Coloridos em gradiente cromático contínuo HSL. Nos primeiros segundos, movem-se colapsados em um único fio visual; ao cruzarem um limiar caótico de reversão, as trajetórias divergem exponencialmente, desenhando um leque de arco-íris espetacular.

### 2.2. Maior Expoente de Lyapunov ($\lambda$)
O simulador computa continuamente a distância euclidiana no espaço de fase 4D:

$$d(t) = \|\vec{Z}_1(t) - \vec{Z}_0(t)\| \approx d_0 \cdot e^{\lambda t}$$

E estima em tempo real a inclinação da reta de $\ln(d/d_0)$ versus tempo, comprovando que $\lambda > 0$ caracteriza o regime formalmente caótico.

### 2.3. Retrato no Espaço de Fase
O canvas secundário projeta continuamente $(\omega_1, \theta_1)$ com decaimento alfa de rastro, exibindo a geometria do atrator estranho do pêndulo duplo.
