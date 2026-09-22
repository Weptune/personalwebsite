---
title: 'are transformers a dead end'
description: 'A mathematical investigation into the limits of self-attention, the collapse of pretraining scaling laws, and what actually replaces the monolithic oracle.'
date: 2026-09-11
tags: ['deep learning', 'complexity theory', 'scaling laws', 'linear algebra', 'algorithms']
image: './cover.jpg'
pinned: false
draft: false
---

Every few months, the machine learning discourse oscillates between two extremes.

On one side, proponents claim that scaling transformers is an infinite escalator to artificial general intelligence: just build a bigger cluster, scrape more tokens, and emergent reasoning will naturally crystallize. On the other side, skeptics claim the architecture has hit a brick wall: reasoning benchmarks are plateauing, pretraining costs are exploding, and the transformer is fundamentally just "autocomplete on steroids."

Both narratives miss the point, because both treat "the transformer" as a monolithic concept.

To answer whether transformers are a dead end, you have to dissect the question into the three specific claims that fuel the debate:

1. **The Architectural Claim:** Is there a mathematical ceiling on what the self-attention mechanism can compute in a single forward pass?
2. **The Scaling Claim:** Has the empirical recipe of pretraining—feeding ever-larger models ever-larger datasets—hit an insurmountable thermodynamic and economic wall?
3. **The Practical Verdict:** If pretraining is hitting diminishing returns and single-pass attention has hard limits, does that mean the transformer itself is obsolete?

Let's examine the mathematics behind each claim.

---

## 1. The Architectural Limit: What a Single Forward Pass Provably Cannot Do

The most common critique of transformers is that they "cannot truly reason"—that they merely memorize patterns and stumble when asked to perform multi-step logic.

From the perspective of theoretical computer science, this critique is not just an empirical observation. **In a single forward pass, it is mathematically provable.**

### The $\text{TC}^0$ Circuit Ceiling

When a transformer generates an answer without intermediate tokens, it runs a fixed number of layers $L$ over an input of length $N$. Regardless of how many billions of parameters those layers contain, the sequential depth of computation is fixed: it is $O(1)$ with respect to the problem size.

In 2023, William Merrill and Ashish Sabharwal (*["The Expressive Power of Transformers with Chain of Thought"](https://arxiv.org/abs/2310.07923)*) formalized the computational boundary of this process:

> **Theorem:** A fixed-depth transformer running in a single forward pass with standard numerical precision is computationally bounded within the circuit complexity class **uniform $\text{TC}^0$**.

$\text{TC}^0$ is the class of problems solvable by boolean circuits of **constant depth**, polynomial size, and threshold (majority) gates. 

Where does $\text{TC}^0$ sit in the computational universe?

$$\text{TC}^0 \subseteq \text{NC}^1 \subseteq \text{L} \subseteq \text{NL} \subseteq \text{P}$$

While separating $\text{TC}^0$ from $\text{NC}^1$ is a celebrated open problem in complexity theory, complexity theorists almost universally conjecture that these inclusions are strict ($\text{TC}^0 \subsetneq \text{NC}^1$). Under standard conjectures, a constant-depth circuit **provably cannot solve**:
- **Balanced Boolean Formula Evaluation ($\text{NC}^1$)**: Evaluating nested formulas like `(A AND (B OR (NOT C)))`.
- **Graph Reachability ($\text{L}$ / $\text{NL}$)**: Determining whether a valid path connects two nodes in an arbitrary graph.
- **Sequential State Tracking**: Simulating any computational process that requires updating an internal state across an arbitrary number of sequential steps.

### Why Multi-Digit Multiplication Fails in One Breath

Consider why a 400-billion-parameter model will confidently hallucinate when asked to multiply two 40-digit numbers in a single shot without scratchpad tokens:

```
Multiplication Carry Chain:
Step 1: Multiply units column  ---> Compute Carry 1
                                           |
Step 2: Multiply tens column   +  Carry 1  v  ---> Compute Carry 2
                                                         |
Step 3: Multiply hundreds      +  Carry 2  v  ---> Compute Carry 3 ...
```

Each carry digit strictly depends on the previous carry digit. The dependency graph is inherently sequential: you cannot compute Carry 38 in parallel without having evaluated Carry 37.

A 96-layer transformer has a maximum sequential circuit depth of 96. Asking it to solve a 200-step carry chain in a single forward pass is asking an $O(1)$-depth circuit to collapse an inherently $\Omega(N)$ sequential problem into one breath. 

It is not that the model "needs more training data." **There is an irreconcilable topological mismatch between the depth of the circuit and the depth of the algorithm.**

### The Softmax Dilution Problem

Real transformers are often even more constrained than idealized $\text{TC}^0$ circuits. 

An idealized $\text{TC}^0$ circuit uses hard, discontinuous threshold gates that can cleanly count bits. But transformers compute attention weights using a continuous, normalized **softmax**:

$$A_{ij} = \frac{\exp(q_i^T k_j / \sqrt{d_k})}{\sum_m \exp(q_i^T k_m / \sqrt{d_k})}$$

In 2020, Michael Hahn (*["Theoretical Limitations of Self-Attention in Model Performance"](https://arxiv.org/abs/2004.13781)*) proved that soft attention acts as a continuous averager. Across an input sequence of length $N$, uniform attention distributes weights as $1/N$. To detect a single-token change (such as flipping a single bit in a PARITY problem), the model must distinguish between sums differing by only $O(1/N)$.

As sequence length $N$ grows, this difference vanishes. Under finite floating-point precision, the gradient signal and output sensitivity decay to zero unless logit scale approaches infinity—which is impossible without triggering numerical overflow or gradient flatlining.

![Softmax Saturation and Gradient Flatline](./softmax_saturation_gradient.png)
*Figure 1: (Left) Unscaled attention logits force the softmax into a saturated, near-one-hot regime. (Right) The softmax Jacobian diagonal $\partial s_i / \partial z_i = s_i(1 - s_i)$ plotted against logit margin. Beyond a margin of $\pm 4$, gradients flatline to zero, freezing learning and destroying sensitivity to subtle contextual shifts.*

### Pure Attention Naturally Destroys Information: Rank Collapse

Could we simply solve the depth limit by stacking hundreds of attention layers one after another?

Mathematically, stacking pure attention layers without skip connections causes catastrophic degeneration.

Because attention is a convex combination ($\sum A_{ij} = 1, A_{ij} \ge 0$), the output representation for any token is strictly confined to the **convex hull** of its inputs:

$$\tilde{x}_i = \sum_{j=1}^N A_{ij} v_j \in \text{Conv}(v_1, \dots, v_N)$$

Attention is fundamentally a blending operation. And as Yihe Dong, Jean-Baptiste Cordonnier, and Andreas Loukas proved in 2021 (*["Attention is Not All You Need"](https://arxiv.org/abs/2103.03404)*), repeated blending without non-linear rescue collapses all token representations into the exact same point:

$$\|X^{(l)} - \mathbf{1} v^T\| \le \mathcal{O}\left(c^{2^l}\right)$$

The distance to a degenerate rank-1 matrix (where every word has the exact same representation) shrinks **doubly exponentially**. By layer 6, without residual skip connections ($X + \text{Attn}(X)$) and non-linear MLPs, token diversity is entirely erased.

![Attention as a Dynamic Convex Combination](./convex_hull_attention.png)
*Figure 2: Geometric confinement of self-attention. The output $\tilde{x}_i$ is strictly trapped within the convex hull formed by the value vectors. Attention alone can only interpolate existing features; it requires non-linear MLPs to push representations into new geometric subspaces.*

![Rank Collapse: Doubly Exponential Decay](./rank_collapse_decay.png)
*Figure 3: Token diversity $\|X^{(l)} - \mathbf{1}v^T\|$ over layer depth $l$. Pure self-attention suffers from doubly exponential decay $\mathcal{O}(c^{2^l})$, plunging to complete numerical collapse by layer 6. The residual stream and MLP sub-layers act as topological stabilizers, preventing rank degeneration.*

### The Architectural Verdict: Is the Single-Pass Transformer a Dead End?

**Yes.** 

If the goal is to execute unbounded multi-step algorithms, verify complex codebases, or perform formal mathematical reasoning in a single static forward pass, the transformer is provably incapable of doing so. 

**However, the single-pass constraint is an artificial self-imposed restriction.**

When an autoregressive transformer outputs intermediate reasoning tokens—popularly called **Chain-of-Thought (CoT)**—the computational model fundamentally changes:

```
Single Forward Pass (O(1) Depth in TC⁰):
Input [X] ---> [ L Layers ] ---> Output [Y]

Autoregressive Chain-of-Thought (O(T × L) Depth in P):
Input [X] ---> [ L Layers ] ---> Token 1
                     |
                     v
               [ L Layers ] ---> Token 2
                     |
                     v
               [ L Layers ] ---> Token 3 ... ---> Output [Y]
```

Every generated token is appended to the context window and passed back through all $L$ layers. If the model generates $T$ reasoning tokens, the sequential computational depth is no longer $L$; it is **$T \times L$**.

Chain-of-thought is not psychological "pondering." It is **circuit unrolling**. It converts a shallow parallel circuit bounded in $\text{TC}^0$ into an unrolled sequential automaton operating in **polynomial time ($\text{P}$)**.

The architecture was never a dead end; asking it to do sequential computation in a single cycle was.

![Circuit Complexity Hierarchy and Chain of Thought](./circuit_complexity_hierarchy.png)
*Figure 4: Computational expressivity hierarchy. In a single forward pass, a fixed-depth transformer is trapped in uniform $\mathrm{TC}^0$. Autoregressive Chain-of-Thought unrolls the circuit across $T$ tokens into depth $T \times L$, elevating its expressive power into polynomial time ($\mathrm{P}$).*

---

## 2. The Scaling Limit: Why Pretraining Maximalism Met Its Match

Even if the architecture can unroll its circuit depth across tokens, what about the empirical program of AI? 

For six years, the governing thesis of the industry was **Pretraining Maximalism**: if you scale model parameters $N$ and dataset tokens $D$, the loss drops monotonically, and general intelligence will naturally emerge as a byproduct of next-token prediction.

That program has run into two hard physical walls and one mathematical trap.

---

### Wall 1: The Chinchilla Power Law and Marginal Return Collapse

In 2022, Jordan Hoffmann and the DeepMind team published the **Chinchilla Scaling Laws**, formalizing cross-entropy loss $L$ as a function of parameters $N$ and tokens $D$:

$$L(N, D) = E + \frac{A}{N^\alpha} + \frac{B}{D^\beta}$$

where $E$ is the irreducible entropy of human language, and $\alpha \approx 0.34, \beta \approx 0.28$ are empirical exponents.

When you solve for compute-optimal allocation under budget $C \approx 6ND$, parameters and tokens scale roughly equally ($N \propto C^{0.45}, D \propto C^{0.55}$). Substituting these optimal values back into the reducible loss yields a single unified power law of compute:

$$L_{\text{reducible}}(C) = L(C) - E \propto C^{-\gamma}$$

where the combined scaling exponent is:

$$\gamma = \frac{\alpha \beta}{\alpha + \beta} = \frac{(0.34)(0.28)}{0.34 + 0.28} \approx \mathbf{0.154}$$

Now look at the marginal return of compute on loss. Differentiating with respect to $C$:

$$\frac{\partial L}{\partial C} \propto -0.154 \cdot C^{-1.154}$$

This is the mathematical anatomy of diminishing returns:

```
Reducible Loss
 ^
 | *
 |   *
 |     *
 |       *
 |          *
 |             * * * * * * * * * * * * *  <--- Irreducible Floor E
 +----------------------------------------->
 10²⁰      10²²      10²⁴      10²⁶   Compute (FLOPs)
```

Because $\gamma \approx 0.154$, the inverse power is $1/\gamma \approx 6.5$. 

To cut the remaining reducible error in half, the compute you must burn scales by:

$$2^{1/\gamma} = 2^{6.5} \approx \mathbf{90\times \text{ to } 100\times}$$

Going from a $\$10\text{M}$ pretraining run to a $\$1\text{B}$ run does not buy a categorical leap in understanding; it buys an incremental, razor-thin sliver of cross-entropy improvement. 

Worse, cross-entropy measures average-case predictability across internet text. It rewards knowing what random internet users usually write, not whether an algorithmic execution trace is mathematically correct.

![Chinchilla Power-Law Asymptote and Marginal Return](./chinchilla_power_law.png)
*Figure 5: (Left) The Chinchilla cross-entropy loss curve $L(C) = E + A \cdot C^{-\gamma}$ flattening against the irreducible entropy floor $E \approx 1.65$. (Right) The derivative $|\partial L / \partial C|$ on a log-log scale, illustrating the exponential collapse of marginal returns per FLOP.*

---

### Wall 2: The Planetary Data Ceiling

Even if labs had the capital to fund $100\times$ larger training runs, Chinchilla demands that tokens scale with parameters: for every parameter you add, you need roughly 20 tokens of data ($D \approx 20N$).

- A 400-billion parameter model (like Meta's Llama 3 405B) consumed **15 trillion tokens**.
- A compute-optimal 2-trillion parameter dense model would require **40 trillion tokens**.

Where does that text come from?

According to comprehensive research by **Epoch AI** (*["Will We Run Out of Data?"](https://epochai.org/blog/will-we-run-out-of-data-limits-of-llm-scaling-based-on-human-data)*), the total global stock of high-quality, publicly accessible human language data on the entire internet—every book, research paper, forum discussion, encyclopedia, and open-source code repository ever written—totals approximately **150 to 300 trillion tokens**.

Frontier AI labs have already vacuumed up a double-digit fraction of all accessible written human history. You cannot order 10 times more human civilization the way you order 10 times more GPUs. The raw pretraining reservoir is finite.

![Training Tokens vs The Planetary Data Wall](./human_data_ceiling.png)
*Figure 6: Cumulative training tokens ingested by frontier models compared to Epoch AI's estimated global stock of high-quality human text (~150T tokens). Pretraining runs have already consumed a massive fraction of all accessible written human history.*

---

### The Failed Workaround: Model Collapse (The Photocopy of a Photocopy)

The intuitive industry response was: *"If human text is running out, let's use models to generate synthetic text to train future models."*

In July 2024, a team led by Ilia Shumailov proved why ungrounded synthetic text fails in a landmark *Nature* paper (*["AI models collapse when trained on recursively generated data"](https://www.nature.com/articles/s41586-024-07566-y)*).

They modeled recursive generation, where generation $n+1$ is trained on the output distribution of generation $n$:

$$p_{n+1}(x) = \mathbb{E}_{x \sim p_n}[\mathcal{M}(x)]$$

When a model samples text, it samples primarily from high-probability central modes and under-samples the low-probability tails (rare facts, edge cases, subtle reasoning exceptions).

When you train the next model on those samples without external ground truth:
1. **Variance Shrinks**: Distribution variance contracts with each generation: $\text{Var}(p_{n+1}) < \text{Var}(p_n)$.
2. **Tails Disappear**: The rich, rare edge cases are permanently lost.
3. **Entropy Collapses**: The information entropy $H(p_n) \to 0$.

Ungrounded synthetic data is an entropy pump. It is the mathematical equivalent of **taking a photocopy of a photocopy**. With each iteration, subtle details wash out until the model collapses into a degenerate, repetitive state.

![Model Collapse: Distribution Degeneration](./model_collapse_entropy.png)
*Figure 7: Probability density degeneration across recursive training generations $p_{n+1} = \mathbb{E}_{p_n}[\mathcal{M}]$. Without grounded verifiers, the distribution sheds its tails, contracts in variance, and suffers information entropy collapse ($H(p_n) \to 0$), reducing complex human nuance into a degenerate mode.*

---

### The Scaling Verdict: Is Pretraining Maximalism a Dead End?

**Yes, unequivocally.**

The belief that you can simply continue the 2018–2023 playbook—doubling parameter counts, scraping noisier web text, and hoping next-token prediction spontaneously produces robust reasoning—is mathematically exhausted. 

The compute returns are too flat ($\gamma \approx 0.154$), the human data pool is too small (~150T tokens), and unverified synthetic text leads to distribution collapse.

---

## 3. The 2026 Shift: The Demotion of the Oracle

Put the two conclusions side by side:

1. A **single forward pass** is trapped in constant-depth $\text{TC}^0$.
2. **Pretraining scaling** has hit a power-law asymptote and a data ceiling.

If you believe that AI progress requires a single, monolithic model that ingests all text and answers every question in one forward pass, then you must conclude that AI has hit a dead end.

**But the industry did not stop. It pivoted.**

What we are witnessing across the frontier in 2025 and 2026—in systems like OpenAI's o1/o3, DeepSeek-R1, and Claude 3.7 Sonnet—is not the abandonment of the transformer, but its **demotion from an all-knowing Oracle to an Arithmetic Logic Unit (ALU).**

```
The 2020 Fantasy (The Oracle):
All Knowledge + All Reasoning  ---> [ Giant Transformer ] ---> Answer in One Pass
(Pretraining Maximalism: Dead)

The 2026 Reality (The System):
                          +-------------------------+
                          |   External Verifier     |
                          | (Lean / Compilers / Env)|
                          +------------+------------+
                                       ^
                                       | Feedback / Checks
                                       v
Problem ---> [ Search Controller ] <---> [ Transformer ALU ] ---> Verified Solution
             (MCTS / PRM Guidance)      (Proposes Candidates)
```

The new paradigm solves both limits by surrounding the transformer with external computational structures:

### 1. Evading Model Collapse with Verifiable Test-Time Compute (RLVR)
Instead of spending $\$100\text{M}$ to shave 0.005 off perplexity on scraped internet text, compute has shifted to **inference-time search and Reinforcement Learning with Verifiable Rewards (RLVR)**:
- Models generate reasoning paths and check them against **deterministic environments with absolute ground truth**: code execution compilers, formal math proof assistants (Lean 4, Isabelle), and symbolic solvers.
- Because reward is anchored to mathematical verification rather than model self-sampling, **entropy does not collapse**. The photocopy problem disappears because incorrect reasoning paths receive zero reward.
- Test-time compute unrolls search trees guided by Process Reward Models (PRMs), allowing the system to explore alternative branches, catch mistakes, and backtrack before committing to an output.

### 2. Externalizing Sequential Depth into Scaffolds
Instead of trying to force a 96-layer transformer to solve a 500-step refactor internally, modern agentic harnesses (such as Claude 3.7 Sonnet's hybrid reasoning modes) externalize state tracking:
- The model interacts with an execution environment: running bash commands, inspecting file diffs, and reading test logs.
- When an error occurs, the feedback becomes the next prompt.
- The sequential computational depth is externalized from the static model weights into an interactive feedback loop.

![The Paradigm Shift: Pretraining vs Test-Time Search](./paradigm_shift_test_time.png)
*Figure 8: The architectural pivot of modern AI. Pure pretraining scaling (dashed) hits diminishing returns on complex reasoning tasks, while test-time search and verification (RLVR, Process Reward Models, MCTS) scale performance dramatically with compute allocated at inference.*

---

## Conclusion: Are Transformers a Dead End?

So, back to the titular question: **are transformers a dead end?**

The answer depends entirely on what you thought you were building:

1. **If your definition of a transformer was the 2020 Silicon Valley fantasy**—a single monolithic neural network that would swallow the internet, scale monotonically with pretraining FLOPs, and output general intelligence in a single forward pass—**then yes, the transformer is a dead end.** The Chinchilla exponent, the planetary data ceiling, the $\text{TC}^0$ circuit depth wall, and the model collapse theorem proved that conclusively.

2. **If your definition of a transformer is an architectural primitive**—a high-dimensional bilinear similarity engine and heuristic policy network—**then no, it is nowhere near a dead end.** 

Just as the invention of the CPU did not eliminate the need for memory hierarchies, operating systems, compilers, and algorithmic loops, the transformer was never meant to be the entire computer.

What died between 2024 and 2026 was not the transformer. **What died was pretraining maximalism.**

The transformer has been demoted from an all-knowing oracle to a lightning-fast heuristic engine—the ALU of modern artificial intelligence. It proposes thoughts; search trees explore them; formal verifiers check them; and agentic loops execute them.

Transformers are neither digital deities nor trivial autocomplete. They are geometric instruments. And understanding where their geometry stops is the only way to build the systems that actually go beyond them.
