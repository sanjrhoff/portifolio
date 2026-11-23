# ⚛️ QuantumLab 1D — Simulador da Equação de Schrödinger TDSE & Tunelamento Quântico

**Laboratório Interativo de Mecânica Quântica & Física Computacional**  
*Desenvolvido em Vanilla JavaScript ES6+ • Zero Dependências • Crank-Nicolson O(N) Unitário a 60 FPS*

---

## 1. Fundamentação Física & Formulação Matemática

O **QuantumLab 1D** resolve numericamente a **Equação de Schrödinger Dependente do Tempo (1D TDSE)** para uma partícula sob a influência de um potencial arbitrário $V(x)$:

$$i \hbar \frac{\partial \psi(x,t)}{\partial t} = \hat{H} \psi(x,t) = \left( -\frac{\hbar^2}{2m} \frac{\partial^2}{\partial x^2} + V(x) \right) \psi(x,t)$$

Adotando o sistema de unidades atômicas naturais no simulador ($\hbar = 1, m = 1$):

$$i \frac{\partial \psi}{\partial t} = -\frac{1}{2} \frac{\partial^2 \psi}{\partial x^2} + V(x)\psi$$

### 1.1. O Esquema Implícito Crank-Nicolson & Operador de Cayley
Para contornar a instabilidade incondicional do método explícito de Euler (que viola a unitariedade e causa dispersão exponencial imediata), empregamos a aproximação unitária de Cayley para o operador de evolução quântico $e^{-i \hat{H} \Delta t}$:

$$\left( I + \frac{i \Delta t}{2} \hat{H} \right) \psi^{n+1} = \left( I - \frac{i \Delta t}{2} \hat{H} \right) \psi^n$$

Como $\hat{H}$ é um operador hermitiano ($\hat{H}^\dagger = \hat{H}$), o operador de evolução é **estritamente unitário**:

$$U^\dagger U = I \implies \int_0^L |\psi(x,t)|^2 \, dx = 1.000000 \quad (\forall t \ge 0)$$

### 1.2. Discretização Espacial em Grade Tridiagonal
Com espaçamento espacial $\Delta x$ e derivada segunda por diferenças finitas centradas de 2ª ordem, definimos a constante adimensional de acoplamento:

$$\alpha = \frac{\Delta t}{4 \Delta x^2}$$

Para cada nó interior $j \in [1, N-2]$, o sistema linear complexo assume a estrutura tridiagonal:

$$a_j \psi_{j-1}^{n+1} + d_j \psi_j^{n+1} + c_j \psi_{j+1}^{n+1} = b_j^n$$

Onde:
- Subdiagonal: $a_j = -i \alpha$
- Diagonal principal: $d_j = 1 + \frac{\Delta t}{2} W_j + i \left(2\alpha + \frac{\Delta t}{2} V_j\right)$
- Superdiagonal: $c_j = -i \alpha$
- Lado direito: $b_j = i\alpha (\psi_{j-1}^n + \psi_{j+1}^n) + \left(1 - \frac{\Delta t}{2} W_j - i\left(2\alpha + \frac{\Delta t}{2} V_j\right)\right) \psi_j^n$

### 1.3. Algoritmo de Thomas (TDMA) Tridiagonal Complexo em $O(N)$
A inversão matricial do sistema tridiagonal é calculada analiticamente em tempo estritamente linear $O(N)$, utilizando arrays paralelos tipados `Float64Array` para as componentes real e imaginária, sem nenhuma alocação de memória no loop de animação (zero garbage collection).

### 1.4. Camada Absorvedora Óptica (PML / CAP)
Para experimentos de tunelamento e espalhamento sem reflexões espúrias nas paredes da caixa, adiciona-se nas extremidades do domínio ($x < 40\Delta x$ e $x > L - 40\Delta x$) um potencial óptico negativo com perfil parabólico suave:

$$V_{\text{eff}}(x) = V(x) - i W(x), \quad W(x) \ge 0$$

---

## 2. Telemetria Quântica & Diagnóstico ao Vivo

A cada ciclo de renderização a 60 FPS, o QuantumLab 1D calcula e exibe:
- **Conservação de Probabilidade:** $\int_0^L |\psi|^2 dx = 1.000000$.
- **Coeficientes de Fluxo Quântico:**
  - Reflexão: $R(t) = \int_0^{x_a} |\psi|^2 dx$
  - Transmissão: $T(t) = \int_{x_b}^L |\psi|^2 dx$
  - Intrabarreira: $P_{\text{bar}} = \int_{x_a}^{x_b} |\psi|^2 dx$
  - Confirmação de unitariedade: $T + R + P_{\text{bar}} = 1.000$.
- **Teorema de Ehrenfest & Incerteza:**
  - Posição Média: $\langle x \rangle = \int x |\psi|^2 dx$ e incerteza $\Delta x$.
  - Momento Médio: $\langle p \rangle = \int (\psi_R \frac{\partial \psi_I}{\partial x} - \psi_I \frac{\partial \psi_R}{\partial x}) dx$ e incerteza $\Delta p$.
  - **Princípio de Incerteza de Heisenberg:** $\Delta x \cdot \Delta p \ge \frac{\hbar}{2} = 0.500$.
  - Energia Total Média: $\langle E \rangle = \langle \hat{H} \rangle$.

---

## 3. Experimentos Fundamentais (5 Presets Didáticos)

1. **Tunelamento Quântico em Barreira Retangular ($E < V_0$):**  
   Penetração quântica da onda evanescente na barreira classicamente proibida e divisão do pacote em onda refletida e transmitida.
2. **Poço Infinito de Potencial (Partícula na Caixa):**  
   Autoestados estacionários com rotação de fase $\arg(\psi)$ e batimento de probabilidade em superposição coerente ($\psi_1 + \psi_2$).
3. **Oscilador Harmônico Quântico ($V = \frac{1}{2} \omega^2 x^2$):**  
   Pacote coerente de Glauber oscilando periodicamente sem deformar e preservando mínima incerteza $\Delta x \Delta p = \hbar/2$.
4. **Tunelamento Ressonante em Dupla Barreira (Diodo RTD):**  
   Interferência construtiva intrabarreira em modos quase-ligados com transmissão $T \to 100\%$.
5. **Degrau de Potencial ($E > V_0$):**  
   Reflexão quântica não-clássica causada por descontinuidade de impedância de onda ($k_1 \ne k_2$).

---

## 4. Teclas de Atalho & Controles Rápidos

| Tecla | Ação |
| :---: | :--- |
| <kbd>Espaço</kbd> | Play / Pause da evolução temporal |
| <kbd>S</kbd> | Avançar passo único no tempo $\Delta t$ |
| <kbd>R</kbd> | Recriar e reinicializar o pacote gaussiano em $x_0$ |
| <kbd>C</kbd> | Zerar o potencial $V(x)$ (espaço livre) |
| <kbd>1</kbd> a <kbd>5</kbd> | Carregar presets quânticos correspondentes |
| Mouse / Touch | Esculpir e desenhar potenciais $V(x)$ diretamente no canvas |

---

## 5. Autor

**Sandro Junior Hoffmann de Oliveira**  
- Bacharel em Física — Universidade Federal do Espírito Santo (UFES)  
- Graduando em Tecnologia em Sistemas para Internet — Instituto Federal do Espírito Santo (IFES)  
- GitHub: [@sanjrhoff](https://github.com/sanjrhoff)
