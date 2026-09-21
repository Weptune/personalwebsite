---
title: 'are transformers a dead end'
description: 'A plain-math look at what self-attention can and cannot compute in a single pass — and why pretraining scaling met its mathematical match.'
date: 2026-09-11
tags: ['linear algebra', 'deep learning', 'complexity theory', 'algorithms', 'maths']
image: './cover.jpg'
pinned: false
draft: true
---

"Are transformers a dead end?" is really two different questions wearing one costume. 

One is about the **architecture**: is there something in the mechanics of self-attention that mathematically caps what it can compute in a single forward pass, no matter how many parameters you add or how well you train it? 

The other is about the **program**: has the empirical recipe of the last decade—*"make the model bigger, feed it more of the internet"*—run out of room?

These questions have completely different answers, and most of the confusion around this topic comes from conflating them. To answer whether the transformer is at a dead end, we have to separate the computational geometry of the architecture from the thermodynamic economics of pretraining. 

So let's take them one at a time, look at the actual mathematics, and see where that leaves us.

---

## 1. What a Transformer Is Doing, Mechanically

Strip away the language, anthropomorphic analogies, and public relations hype: a transformer is a geometric engine designed to manipulate clouds of points in high-dimensional Euclidean space $\mathbb{R}^d$, where $d$ (often called $d_{\text{model}}$) typically ranges from $4,096$ to $12,288$ in modern frontier architectures.

When a sequence of $N$ discrete tokens enters the model, each token is mapped via a learned embedding matrix $W_E \in \mathbb{R}^{|V| \times d}$ to an initial vector $x_i^{(0)} \in \mathbb{R}^d$. Arranging these vectors as rows yields an initial sequence representation matrix:

$$X^{(0)} = \begin{bmatrix} (x_1^{(0)})^T \\ (x_2^{(0)})^T \\ \vdots \\ (x_N^{(0)})^T \end{bmatrix} \in \mathbb{R}^{N \times d}$$

The central spine of the architecture is the **residual stream**. As representations flow through $L$ sequential layers, tokens are never replaced outright. Instead, each layer computes a perturbation and adds it back to the existing state:

$$X^{(l+1)} = X^{(l)} + \Delta X_{\text{attn}}^{(l)} + \Delta X_{\text{mlp}}^{(l)}$$

Because addition is linear, the final state of token $i$ at layer $L$ is simply the initial embedding plus the running sum of every update contributed by every attention head and MLP:

$$x_i^{(L)} = x_i^{(0)} + \sum_{l=0}^{L-1} \left( \Delta x_{i, \text{attn}}^{(l)} + \Delta x_{i, \text{mlp}}^{(l)} \right)$$

The residual stream functions as a linear communication bus. Different attention heads and feed-forward sub-networks can read from and write to independent linear subspaces of $\mathbb{R}^d$ without destructively interfering with one another.

Now, how does information actually move *between* different tokens along this bus? That is the job of self-attention.

---

## 2. Queries, Keys, and Values as a Bilinear Form

For a sequence matrix $X \in \mathbb{R}^{N \times d}$, self-attention begins by applying three learned linear transformations to project tokens into Queries ($Q$), Keys ($K$), and Values ($V$):

$$Q = X W_Q, \quad K = X W_K, \quad V = X W_V$$

where $W_Q, W_K \in \mathbb{R}^{d \times d_k}$ and $W_V \in \mathbb{R}^{d \times d_v}$. In multi-head attention with $h$ heads, we typically set $d_k = d_v = d / h$ so that the total compute across heads remains constant.

What are Queries and Keys doing geometrically? 

$W_Q$ and $W_K$ parameterize a **bilinear form** on $\mathbb{R}^d$. The raw compatibility score $S_{ij}$ between token $i$ and token $j$ is the inner product of their projected query and key vectors:

$$S_{ij} = q_i^T k_j = (x_i^T W_Q)(x_j^T W_K)^T = x_i^T (W_Q W_K^T) x_j$$

The matrix $W_{QK} = W_Q W_K^T \in \mathbb{R}^{d \times d}$ is a low-rank operator (rank at most $d_k \ll d$) that scans the residual stream, isolates specific features in tokens $i$ and $j$, and measures how strongly they correlate. Meanwhile, $W_V$ isolates the linear feature subspace of token $j$ that should actually be retrieved.

Once compatibility scores are computed, the canonical attention equation calculates:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{Q K^T}{\sqrt{d_k}}\right) V$$

Why is that $\sqrt{d_k}$ in the denominator? It is often dismissed with a vague remark about preventing vanishing gradients. The actual derivation takes thirty seconds and explains a foundational fragility of softmax attention.

---

## 3. The Softmax Gradient Flatline

Suppose the components of the query vector $q \in \mathbb{R}^{d_k}$ and key vector $k \in \mathbb{R}^{d_k}$ are independent, zero-mean random variables with unit variance:

$$\mathbb{E}[q_m] = 0, \quad \text{Var}(q_m) = 1, \qquad \mathbb{E}[k_m] = 0, \quad \text{Var}(k_m) = 1$$

The raw dot product between them is the sum of $d_k$ pairwise products:

$$S = q \cdot k = \sum_{m=1}^{d_k} q_m k_m$$

By linearity of expectation, $\mathbb{E}[S] = 0$. For the variance, because the components are independent:

$$\text{Var}(S) = \sum_{m=1}^{d_k} \text{Var}(q_m k_m)$$

Using the identity $\text{Var}(XY) = \text{Var}(X)\text{Var}(Y) + \text{Var}(X)(\mathbb{E}[Y])^2 + \text{Var}(Y)(\mathbb{E}[X])^2$, each individual term evaluates to:

$$\text{Var}(q_m k_m) = (1)(1) + (1)(0)^2 + (1)(0)^2 = 1$$

Therefore:

$$\text{Var}(S) = \sum_{m=1}^{d_k} 1 = d_k \implies \sigma_S = \sqrt{\text{Var}(S)} = \sqrt{d_k}$$

In modern models, $d_k = 128$, meaning $\sqrt{d_k} \approx 11.3$. Without scaling, the dot products fed into softmax have standard deviations exceeding $11$.

Now consider the Jacobian of the softmax function $s_i = e^{z_i} / \sum_j e^{z_j}$. Differentiating with respect to the input logits $z_j$ yields:

$$\frac{\partial s_i}{\partial z_j} = s_i (\delta_{ij} - s_j)$$

When input logits swing by $\pm 20$ or $\pm 40$, the largest logit exponentially dominates the denominator. The distribution collapses into a near-one-hot argmax: $s_m \approx 1$ and $s_{j \neq m} \approx 0$.

Evaluating the gradients at these values reveals the catastrophe:

$$\frac{\partial s_m}{\partial z_m} = s_m(1 - s_m) \approx 1(1 - 1) = 0$$
$$\frac{\partial s_j}{\partial z_k} \approx -(0)(0) = 0$$

The Jacobian identically flatlines to zero. Backpropagation freezes completely because gradients cannot penetrate the saturated softmax. 

Dividing by $\sqrt{d_k}$ normalizes the variance of the logits back to unity ($\text{Var}(S / \sqrt{d_k}) = d_k / d_k = 1$), ensuring the softmax operates in its active, differentiable regime where multi-token blending and gradient flow can both occur.

![Softmax Saturation and Gradient Flatline](./softmax_saturation_gradient.png)
*Figure 1: (Left) Unscaled dot products ($\sigma \approx \sqrt{d_k} = 11.3$) collapse the softmax into a discrete argmax, extinguishing multi-token blending. Scaling by $1/\sqrt{d_k}$ restores an active, differentiable probability distribution. (Right) The softmax Jacobian diagonal $\partial s_i / \partial z_i = s_i(1 - s_i)$ plotted against the logit margin $(z_i - z_j)$. Beyond a margin of $\pm 4$, gradients flatline into the dead zone, freezing parameter updates.*

---

## 4. Attention as Mixing Paint: The Convex Hull

Once the attention matrix $A = \text{softmax}(QK^T / \sqrt{d_k}) \in \mathbb{R}^{N \times N}$ is computed, what does it actually do to the tokens?

Because softmax normalizes each row independently, every row $A_{i,:}$ satisfies two properties:
1. **Non-negativity**: $A_{ij} \ge 0$ for all $j$.
2. **Unit sum**: $\sum_{j=1}^N A_{ij} = 1$.

In geometric terms, each row of $A$ is a point on the standard $(N-1)$-dimensional probability simplex $\Delta^{N-1}$. Multiplying $A$ by the value matrix $V = [v_1, \dots, v_N]^T$ produces an updated token representation:

$$\tilde{x}_i = \sum_{j=1}^N A_{ij} v_j$$

A linear combination of vectors whose weights are non-negative and sum to 1 is the exact definition of a **convex combination**. 

This yields a central geometric constraint:

> **The output of an attention layer for any token is strictly confined to lie within the convex hull of the input value vectors:**
>
> $$\tilde{x}_i \in \text{Conv}(v_1, v_2, \dots, v_N)$$

Attention is fundamentally a **paint-mixing machine**.

The value projections $v_j$ place $N$ pigments on the palette. The query-key inner products decide the mixing proportions. But no matter what values you pick for $Q$ and $K$, self-attention **cannot manufacture a color that is not reachable by blending the existing palette**. It can only interpolate, weight, and average points within representation space.

New geometric directions can only be created by the other half of each layer: the non-linear feed-forward network (MLP), which applies non-linear activations (like SwiGLU or GELU) to push representations *outside* the convex hull.

![Attention as a Dynamic Convex Combination](./convex_hull_attention.png)
*Figure 2: Geometric illustration of self-attention. The output representation $\tilde{x}_i$ for any token is strictly confined within the convex hull $\mathrm{Conv}(v_1, \dots, v_5)$ formed by the input value vectors. Attention alone cannot synthesize new feature dimensions outside this bounded simplex without non-linear MLP projections.*

And this brings us directly to the first provable failure mode of self-attention in isolation: what happens when you repeat this mixing process over and over?

---

## 5. The Collapse Nobody Designed For: Rank Collapse

What would happen if you constructed a deep neural network entirely out of pure self-attention layers, stacking fifty of them sequentially without skip connections or MLPs?

Intuitively, you might imagine that fifty layers of attention would produce rich, complex contextual understanding. Mathematically, the exact opposite occurs: **it destroys every distinction in the sequence, collapsing all representations into identical noise.**

In 2021, Yihe Dong, Jean-Baptiste Cordonnier, and Andreas Loukas proved this behavior in their landmark paper, *["Attention is Not All You Need: Pure Attention Loses Rank Doubly Exponentially with Depth"](https://arxiv.org/abs/2103.03404)*.

### The Dong et al. Theorem

Let $X^{(l)} \in \mathbb{R}^{N \times d}$ be the representation matrix at layer $l$. In a pure self-attention network where $X^{(l+1)} = \text{Attn}(X^{(l)})$, under mild Lipschitz and regularity conditions on the weight matrices, there exists a fixed vector $v \in \mathbb{R}^d$ and a constant $c \in (0, 1)$ such that:

$$\|X^{(l)} - \mathbf{1} v^T\| \le \mathcal{O}\left(c^{2^l}\right)$$

where $\mathbf{1} = (1, 1, \dots, 1)^T \in \mathbb{R}^N$.

### What this means

The matrix $\mathbf{1} v^T$ is a matrix where **every single row is identical to the vector $v$**. Its rank is exactly **1**.

The theorem states that as depth $l$ increases, the distance between the sequence representations and this rank-1 matrix shrinks **doubly exponentially** ($c^{2^l}$). 

For a typical constant like $c = 0.5$:
- Layer $l=1$: $0.5^2 = 0.25$
- Layer $l=2$: $0.5^4 = 0.0625$
- Layer $l=3$: $0.5^8 \approx 0.0039$
- Layer $l=5$: $0.5^{32} \approx 2.3 \times 10^{-10}$

By layer 5 or 6 of pure attention, the representations of `"apple"`, `"quantum"`, and a punctuation mark `"."` become numerically indistinguishable. 

This is the paint-mixing problem pushed to its extreme: if all you ever do is average points together, repeating the average enough times inevitably reduces every pixel to a flat, uniform gray rectangle.

```
Pure Attention Flow:
X  ---> [Attn 1] ---> [Attn 2] ---> [Attn 3] ---> Converges to Rank 1 (Identical Tokens)

Actual Transformer Flow:
X  ---+-> [Attn] --+-> [MLP] ---+-> Rank Preserved via Residual Stream
      |            ^   |        ^
      +------------+   +--------+
```

This explains why real transformer layers look the way they do:
1. **The Residual Stream ($X + \text{Attn}(X)$)** is not an optimization trick for faster training. It is a **topological necessity**. Adding the identity shortcut preserves the full rank of the input and prevents attention from averaging token diversity into oblivion.
2. **MLP Sub-layers** inject non-linear transformations, projecting representations out of the convex hull and refreshing feature variance.

So, does the architecture have a hard mathematical limit? Yes: in isolation, unmodified attention rapidly collapses. But this is also the most thoroughly understood and solved limit in deep learning—the residual stream and MLP neutralize it so cleanly that it is a non-issue in every model deployed today.

The limit that is far harder to patch shows up when we ask not *"does information survive?"*, but **"how much sequential computation can happen in a single forward pass?"**

![Rank Collapse: Doubly Exponential Decay](./rank_collapse_decay.png)
*Figure 3: Token diversity $\|X^{(l)} - \mathbf{1}v^T\|$ over layer depth $l$. Pure self-attention suffers from doubly exponential decay $\mathcal{O}(c^{2^l})$, plunging to machine-epsilon numerical collapse by layer 6. The residual stream ($X + \mathrm{Attn}(X)$) and MLP sub-layers act as topological stabilizers, preserving representation rank indefinitely.*

---

## 6. The Limit That's Harder to Patch: Sequential Depth and $\text{TC}^0$

A transformer with a fixed number of layers $L$ performs a fixed number of sequential computation steps, regardless of how long the input sequence is. That remains true whether the prompt is a three-word greeting or a 500-page textbook.

Some computational problems genuinely require a number of sequential steps that grows with the size of the input. 

The canonical example is **multi-digit arithmetic and carry chains**. 

Multiplying two 40-digit numbers by hand requires calculating intermediate products and propagating carry digits one by one down a chain. Each carry depends strictly on the outcome of the carry before it. You cannot bypass that dependency chain, no matter how much scratch paper you place in parallel, because step $k$ fundamentally requires the result of step $k-1$. 

When you ask a transformer to output the final answer to a complex arithmetic problem or multi-step logic puzzle in a single forward pass, with no intermediate tokens, you are asking a fixed-depth circuit to compress an inherently sequential process into $O(1)$ sequential operations. 

It is not that the model "was not trained on enough examples." There is a structural mismatch between the shape of the problem and the shape of a single forward pass.

### The Merrill & Sabharwal Theorem (2023)

This intuition was formalized into rigorous circuit complexity theory by William Merrill and Ashish Sabharwal (*["The Expressive Power of Transformers with Chain of Thought"](https://arxiv.org/abs/2310.07923)*):

> **Theorem:** A fixed-depth transformer with $L$ layers running in a single forward pass with log-precision activations is computationally bounded within the circuit complexity class **uniform $\text{TC}^0$**.

$\text{TC}^0$ is the class of problems solvable by boolean circuits of **constant depth $O(1)$**, polynomial size, and unbounded fan-in majority (threshold) gates. 

Where does $\text{TC}^0$ sit in the broader landscape of computation?

$$\text{AC}^0 \subsetneq \text{TC}^0 \subseteq \text{NC}^1 \subseteq \text{L} \subseteq \text{NL} \subseteq \text{P}$$

While the separation between $\text{TC}^0$ and $\text{NC}^1$ remains one of the famous open problems in complexity theory, complexity theorists widely conjecture that these inclusions are strict. Under these standard conjectures:
1. **Balanced Boolean Formula Evaluation ($\text{NC}^1$)**: Evaluating arbitrary nested trees of boolean expressions cannot be solved in constant depth.
2. **Graph Reachability and Connectivity ($\text{L}$ / $\text{NL}$)**: Determining whether a path connects two nodes in an arbitrary graph requires logarithmic space and sequential steps.
3. **Sequential State Tracking**: Simulating an arbitrary $K$-step automaton requires circuit depth $\Omega(K)$.

### The Softmax Nuance: Why Transformers Fail on Parity

In fact, standard transformers are often even more constrained than idealized $\text{TC}^0$ circuits. 

An idealized $\text{TC}^0$ circuit with hard, discontinuous majority gates can solve the PARITY problem (determining whether the sum of $N$ bits is odd or even) in constant depth. Yet real-world transformers consistently struggle with unbounded parity. 

Why? Because transformers do not use hard majority gates; they use **continuous, softmax-normalized attention**.

In 2020, Michael Hahn published *["Theoretical Limitations of Self-Attention in Model Performance"](https://arxiv.org/abs/2004.13781)* (TACL 2020), proving that soft self-attention over sequence length $N$ distributes attention weights smoothly. To detect a single bit flip in an $N$-bit sequence, the attention mechanism must distinguish between sums differing by a single token ($1/N$). As sequence length $N \to \infty$, the output sensitivity vanishes unless logits scale toward infinity—which is impossible under finite numerical precision.

In a single forward pass, a transformer cannot escape its constant-depth bounds.

### Chain-of-Thought as Circuit Unrolling

And this is where **Chain-of-Thought (CoT)** ceases to be an empirical prompting trick and reveals itself as a structural mathematical fix.

```
Single Forward Pass (Trapped in TC⁰):
Input [X] ---> [Fixed Depth L] ---> Output [Y]  (O(1) sequential depth)

Autoregressive Chain-of-Thought (Unrolled Circuit):
Input [X] ---> [Layer L] ---> Token t₁
                     |
                     v
             [Layer L] ---> Token t₂
                     |
                     v
             [Layer L] ---> Token t₃ ... ---> Output [Y]  (O(T × L) sequential depth)
```

When an autoregressive transformer outputs intermediate reasoning tokens before delivering its final answer:
1. Every generated token is appended to the context window and fed back through all $L$ layers.
2. If the model generates $T$ thinking tokens, the total sequential computational depth is no longer $L$—it is **$T \times L$**.
3. The computational class of the system expands from constant-depth $\text{TC}^0$ to the class of **polynomial-time algorithms ($\text{P}$)** (bounded only by context length and generation limits).

Chain-of-thought is not the model "pondering like a human." It is an unrolled temporal clock cycle that converts a shallow parallel circuit into a recurrent, sequential computer.

![Circuit Complexity Hierarchy and Chain of Thought](./circuit_complexity_hierarchy.png)
*Figure 4: Computational expressivity hierarchy. A fixed-depth transformer in a single forward pass is bounded within uniform $\mathrm{TC}^0$. Under standard complexity conjectures ($\mathrm{TC}^0 \subsetneq \mathrm{NC}^1 \subseteq \mathrm{L}$), constant-depth circuits cannot solve problems requiring sequential state tracking (formula evaluation, graph reachability). Autoregressive Chain-of-Thought unrolls the circuit into depth $T \times L$, elevating its expressive power into sequential polynomial time ($\mathrm{P}$).*

---

## 7. The Economics Caught Up Before the Math Did

Separately from what attention can compute in a single pass, the *scaling program*—the empirical strategy of training ever-larger models on ever-larger dumps of scraped internet text—ran into a much more mundane problem: **diminishing returns compound brutally.**

### Wall 1: The Chinchilla Compute Asymptote

In 2022, Jordan Hoffmann and the DeepMind team published the **Chinchilla Scaling Laws**, modeling pretraining cross-entropy loss $L$ as a function of parameter count $N$ and dataset tokens $D$:

$$L(N, D) = E + \frac{A}{N^\alpha} + \frac{B}{D^\beta}$$

where:
- $E$ is the irreducible entropy of natural human language.
- $A, B$ are scaling constants.
- $\alpha \approx 0.34, \beta \approx 0.28$ are empirical power-law exponents.

Total training compute in FLOPs is approximately $C \approx 6ND$. Under compute-optimal allocation (balancing parameters and tokens via Lagrange multipliers):

$$N \propto C^a, \quad D \propto C^b \quad \text{where } a = \frac{\beta}{\alpha + \beta} \approx 0.45, \; b = \frac{\alpha}{\alpha + \beta} \approx 0.55$$

Substituting these optimal allocations back into the reducible loss $L_{\text{reducible}} = \frac{A}{N^\alpha} + \frac{B}{D^\beta}$ reveals that both terms scale with compute by the exact same exponent $\gamma$:

$$\gamma = \frac{\alpha \beta}{\alpha + \beta} = \frac{(0.34)(0.28)}{0.34 + 0.28} \approx 0.154$$

Along the optimal frontier, the reducible loss collapses into a single power law of compute:

$$L_{\text{reducible}}(C) \propto C^{-\gamma} \approx C^{-0.154}$$

Differentiating with respect to compute $C$ yields the marginal return:

$$\frac{\partial L}{\partial C} \propto - \gamma C^{-(\gamma + 1)} \approx -0.154 C^{-1.154}$$

Diminishing returns are baked directly into the mathematics of the power law. 

To achieve each subsequent linear improvement in cross-entropy error $\Delta L$, the compute required does not scale linearly—it escalates exponentially:

$$C \propto \left(\frac{1}{\Delta L}\right)^{1/\gamma} \approx (\Delta L)^{-6.5}$$

Halving the reducible error requires multiplying compute by $2^{6.5} \approx 90\times$ to $100\times$. Going from a $\$100\text{M}$ pretraining cluster to a $\$10\text{B}$ cluster buys an incremental, razor-thin sliver of next-token predictability. And next-token predictability on general text does not automatically translate into multi-step reasoning.

![Chinchilla Power-Law Asymptote and Marginal Return](./chinchilla_power_law.png)
*Figure 5: (Left) The Chinchilla cross-entropy loss curve $L(C) = E + A \cdot C^{-\gamma}$ flattening against the irreducible entropy floor $E \approx 1.65$. (Right) The derivative $|\partial L / \partial C|$ on a logarithmic scale, illustrating the exponential decay of marginal return per FLOP.*

---

### Wall 2: The Finite Token Ceiling

The Chinchilla law also dictates that for every parameter you add to a dense model, you must train on roughly 20 tokens to remain compute-optimal ($D \approx 20N$).

For a 400-billion-parameter model (like Meta's Llama 3 405B), that required **15 trillion tokens**.

To train a compute-optimal 2-trillion-parameter dense model, you would need:

$$D \approx 20 \times (2 \times 10^{12}) = \mathbf{40 \text{ trillion tokens}}$$

Where does that data come from?

According to comprehensive research by **Epoch AI** (*["Will We Run Out of Data? Limits of LLM Scaling Based on Human-Generated Data"](https://epochai.org/blog/will-we-run-out-of-data-limits-of-llm-scaling-based-on-human-data)*), the total global stock of high-quality, publicly accessible human language text on the entire internet—every book, research paper, forum discussion, encyclopedia, and open-source repository ever written—totals roughly **150 to 300 trillion tokens**.

Frontier labs have already vacuumed up a double-digit fraction of the entire written record of human civilization. You cannot simply 10x your training data the way you can 10x an order of GPUs. The data stock is essentially fixed.

![Training Tokens vs The Planetary Data Wall](./human_data_ceiling.png)
*Figure 6: Cumulative training tokens ingested by frontier models compared to Epoch AI's estimated global stock of high-quality human text (~150T tokens). Frontier training runs have already consumed a massive fraction of all accessible written human history.*

---

### The Failed Shortcut: Model Collapse (The Photocopy of a Photocopy)

The intuitive industry response was obvious: *"If we run out of human text, let's have models generate synthetic text to train the next generation."*

In July 2024, a team led by Ilia Shumailov proved why ungrounded synthetic data fails in a landmark *Nature* paper, *["AI models collapse when trained on recursively generated data"](https://www.nature.com/articles/s41586-024-07566-y)*.

They formalized what happens when a model at generation $n+1$ trains on the output distribution of generation $n$:

$$p_{n+1}(x) = \mathbb{E}_{x \sim p_n}[\mathcal{M}(x)]$$

When a model samples from its learned distribution $\hat{p}_0$, it samples primarily from high-probability central mass (the modes) while under-sampling low-probability tails (edge cases, subtle linguistic nuance, rare facts).

When subsequent generations train recursively on these samples:
1. **Variance Decay**: Distribution variance contracts with each generation: $\text{Var}(p_{n+1}) < \text{Var}(p_n)$.
2. **Support Shrinkage**: Low-probability tails disappear completely.
3. **Entropy Collapse**: Information entropy $H(p_n) = -\int p_n(x) \log p_n(x) dx$ degrades toward zero.

Trained on its own unverified generations, the model drifts toward an averaged, homogenized mean and quietly forgets the rare, unusual examples that make language expressive and reasoning robust. Repeat this for several generations, and the model collapses into degenerate, repetitive output.

Ungrounded synthetic data is an entropy pump. It acts like taking a photocopy of a photocopy: each pass washes out fine detail until only a degraded blur remains.

![Model Collapse: Distribution Degeneration](./model_collapse_entropy.png)
*Figure 7: Probability density degeneration across recursive training generations $p_{n+1} = \mathbb{E}_{p_n}[\mathcal{M}]$. Without grounded verification, the distribution sheds its tails, contracts in variance, and suffers information entropy collapse ($H(p_n) \to 0$), reducing complex human nuance into a degenerate mode.*

---

## 8. So — Dead End or Not?

Put these two diagnoses side by side and the picture becomes clear:

1. **The Architecture** has a provable failure mode in isolation (**rank collapse**), which the residual stream and MLPs cleanly stabilize. It also has a genuine computational ceiling (**constant circuit depth $\text{TC}^0$**), which prevents it from solving sequential state tracking in a single forward pass—a limit directly bypassed by unrolling reasoning across multiple tokens (Chain-of-Thought).
2. **The Scaling Program** has collided with power-law diminishing returns ($\gamma \approx 0.154$), a finite planetary stock of human text (~150T tokens), and the mathematical reality of model collapse under ungrounded synthetic generation.

These are not one single wall. They are two distinct limits that arrived at the same historical moment, and they demand two entirely different responses.

You do not fix a single-pass circuit-depth ceiling by training on more data. And you do not fix a pretraining data ceiling by making a model generate more unverified tokens in a vacuum.

What we are witnessing across frontier AI in 2025 and 2026 is exactly the response that these mathematics predict:

### 1. Externalizing Sequential Depth into Scaffolds
To overcome the $\text{TC}^0$ circuit depth wall, modern frontier systems surround the transformer with **persistent state tracking, multi-step tool execution, and interactive feedback loops** (as seen in models like Claude 3.7 Sonnet). 

When a task requires diagnosing a complex software bug or navigating an unfamiliar codebase, no single forward pass can track that sequential state internally. The model interacts with an environment, reads test failures, and refines its trajectory. The computational depth is externalized from the static weights into an unrolled execution loop.

### 2. Evading Model Collapse with Verifiable Test-Time Compute
To overcome the pretraining data ceiling, modern labs have pivoted compute away from passive pretraining toward **test-time search and Reinforcement Learning with Verifiable Rewards (RLVR)** (pioneered by OpenAI's o1/o3 and DeepSeek-R1).

Rather than burning millions of dollars to shave 0.01 off cross-entropy loss on scraped text:
- **Verifiable Ground Truth**: Models train and search against environments with deterministic correctness—code compilers, Lean and Isabelle theorem provers, and symbolic math engines. Because reward is anchored to external mathematical truth rather than model self-sampling, the system avoids the entropy collapse predicted by the Shumailov theorem.
- **Process Search**: Test-time compute unrolls search trees guided by Process Reward Models (PRMs), exploring branches, catching errors, and backtracking before committing to an answer.

![The Paradigm Shift: Pretraining vs Test-Time Search](./paradigm_shift_test_time.png)
*Figure 8: The architectural pivot of modern AI. Pure pretraining scaling (dashed) hits diminishing returns on complex reasoning tasks, while test-time search and verification (RLVR, Process Reward Models, MCTS) scale performance dramatically with compute allocated at inference.*

---

## Conclusion: The Demotion of the Oracle

So, are transformers a dead end?

The answer depends entirely on what you thought the transformer was supposed to be.

If your definition was the 2020 Silicon Valley fantasy—an all-knowing, monolithic digital oracle that would ingest the internet, scale monotonically with compute, and output artificial general intelligence in a single forward pass—**then yes, the transformer is a dead end.**

The mathematics had that verdict written down from the beginning:
- Pure self-attention without residual topological stabilizers degenerates into doubly exponential **rank collapse**.
- A single forward pass is computationally trapped inside constant-depth **$\text{TC}^0$**, incapable of arbitrary sequential state tracking in one shot.
- Pretraining compute efficiency collapses as a power law with exponent $\gamma \approx 0.154$, while colliding with the finite limits of human language and the entropy death spiral of model collapse.

**What died was not the transformer. What died was pretraining maximalism.**

The transformer didn't fail. It got promoted to its true, proper role. 

In frontier systems today, the transformer is no longer asked to be the entire machine. It has become the **Arithmetic Logic Unit of modern computing**—a blindingly fast, intuitive heuristic policy engine wrapped inside outer loops of tree search, verifiable execution, and autonomous tool harnesses.

Transformers are neither deities nor trivial autocomplete. They are geometric instruments. And understanding where their geometry ends is the only way to see where the real future of intelligence begins.
