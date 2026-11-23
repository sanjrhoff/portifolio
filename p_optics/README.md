# 🔬 RayLens Lab — Simulador de Ótica Geométrica & Traçado de Raios 2D

> **Bancada Ótica Experimental e Motor Determinístico de Ray Tracing no Navegador**  
> Desenvolvido em **JavaScript Puro (ES6+)** com renderização via **HTML5 Canvas 2D**. Zero dependências externas. Compatível 100% com **GitHub Pages**.

---

## 1. Visão Geral do Projeto

O **RayLens Lab** é um laboratório virtual interativo de física ótica que modela o comportamento da luz de acordo com os princípios da ótica geométrica e eletromagnetismo clássico. A aplicação executa um motor determinístico de ray tracing vetorial recursivo a **60 FPS**, proporcionando uma experiência imersiva de bancada experimental com fidelidade aos fenômenos físicos reais.

A aplicação reflete a intersecção única entre **Física (formação acadêmica UFES)** e **Engenharia de Software Frontend de Alta Performance**, traduzindo equações diferenciais e leis de conservação em simulações visuais responsivas e intuitivas.

---

## 2. Fundamentação Física & Equações Matemáticas

### 2.1. Propagação Retilínea (Princípio de Fermat)
A luz propaga-se no meio homogêneo ao longo de raios vetoriais parametrizados:
$$\vec{R}(t) = \vec{P}_0 + t \cdot \hat{d}, \quad t > 0$$
Onde $\vec{P}_0$ é o ponto de origem e $\hat{d}$ é o vetor unitário de propagação ($\|\hat{d}\| = 1$).

### 2.2. Lei da Reflexão Especular
Em interfaces reflexivas com vetor unitário normal $\hat{n}$:
$$\hat{r} = \hat{d} - 2(\hat{d} \cdot \hat{n})\hat{n}$$
Onde o ângulo de reflexão é rigorosamente igual ao ângulo de incidência ($\theta_r = \theta_i$).

### 2.3. Lei de Snell-Descartes da Refração
Para a interface entre meios com índices de refração $n_1$ e $n_2$:
$$n_1 \sin\theta_1 = n_2 \sin\theta_2$$
Em formulação vetorial direta:
$$\cos\theta_1 = -(\hat{d} \cdot \hat{n})$$
$$r = \frac{n_1}{n_2}$$
$$\Delta = 1 - r^2 (1 - \cos^2\theta_1)$$

- **Se $\Delta < 0$:** Ocorre **Reflexão Interna Total (TIR)**. A luz é integralmente confinada no meio de maior densidade ótica sem transmissão para o exterior. Ângulo crítico:
  $$\theta_c = \arcsin\left(\frac{n_2}{n_1}\right) \quad (n_1 > n_2)$$
- **Se $\Delta \ge 0$:** Ocorre refração transmitida:
  $$\hat{t} = r\hat{d} + (r \cos\theta_1 - \sqrt{\Delta})\hat{n}$$

### 2.4. Dispersão Cromática (Fórmula de Cauchy)
A dependência do índice de refração com o comprimento de onda $\lambda$ no prisma triangular:
$$n(\lambda) = n_0 + \frac{B}{\lambda^2}$$
Separando feixes de luz branca no espectro contínuo visível de $380\text{ nm}$ (violeta) a $750\text{ nm}$ (vermelho).

---

## 3. Catálogo de Instrumentos Óticos

| Elemento | Categoria | Comportamento Físico Modelado |
|---|---|---|
| **Laser Pontual** | Emissor | Feixe único colimado com orientador vetorial e $\lambda$ customizável |
| **Feixe Colimado** | Emissor | Barra com $N$ raios paralelos equidistantes simulando feixes de laboratório |
| **Fonte Radial 360°** | Emissor | Lâmpada pontual com propagação isotrópica em todas as direções |
| **Espelho Plano** | Espelho | Reflexão especular pura com revestimento traseiro hachurado |
| **Espelho Curvo** | Espelho | Superfície esférica côncava/convexa com foco focal paraxial $f = R/2$ |
| **Bloco de Vidro** | Refrator | Dioptro plano duplo com deslocamento lateral sem desvio angular final |
| **Lente Biconvexa** | Refrator | Duas calotas esféricas convergentes focando raios paralelos no ponto focal |
| **Lente Bicôncava** | Refrator | Superfícies curvas divergentes com dispersão angular |
| **Prisma Triangular** | Refrator | Triângulo equilátero com dispersão espectral de Cauchy ativa |

---

## 4. Presets Didáticos Inclusos

1. **Prisma de Newton (Dispersão Espectral):**  
   Feixe de luz branca colidindo com um prisma triangular de vidro Flint ($n = 1.66$), decompondo a luz nas 7 cores do arco-íris visível.
2. **Foco em Lente Biconvexa:**  
   Feixe colimado com 15 raios convergindo precisamente no ponto focal real com demonstração de aberração esférica marginal.
3. **Fibra Ótica (Guia de Onda):**  
   Laser vermelho inserido em duto dielétrico de alto índice ($n = 1.62$) conduzindo o sinal por sucessivas Reflexões Internas Totais (TIR).
4. **Telescópio Newtoniano:**  
   Espelho primário côncavo concentrando raios paralelos e espelho plano secundário inclinado a $45^\circ$ direcionando o feixe para a ocular.

---

## 5. Atalhos de Teclado (Hotkeys)

- `Espaço`: Pausar / Retomar traçado computacional de raios.
- `G`: Alternar visibilidade da grade milimétrica técnica.
- `N`: Alternar vetores normais unitários $\hat{n}$ nas superfícies.
- `R`: Resetar e centralizar o emissor na bancada.
- `Shift` (ao rotacionar): Snapping angular automático a cada $15^\circ$.
- `Delete` / `Backspace`: Excluir o elemento selecionado.
- `1` a `4`: Carregar presets clássicos instantaneamente.

---

## 6. Arquitetura de Software

```
p_optics/
├── index.html     # Marcação semântica, bancada e instrumentação HUD
├── styles.css     # Design System Dark Zinc com efeito glassmorphism
├── script.js      # Motor vetorial de Ray Tracing determinístico (ES6+)
└── README.md      # Documentação técnica e fundamentação teórica
```

---

## 7. Licença & Créditos

Desenvolvido por **Sandro** (Física UFES / Engenharia de Software) como parte do ecossistema de demonstração de excelência técnica em física computacional no navegador.
Licença MIT. Livre para uso educacional e científico.
