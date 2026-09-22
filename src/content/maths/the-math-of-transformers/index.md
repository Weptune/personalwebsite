---
title: 'are transformers a dead end'
description: 'A plain-math look at what self-attention can and cannot compute in a single pass — and why pretraining scaling met its mathematical match.'
date: 2026-09-11
tags: ['linear algebra', 'deep learning', 'complexity theory', 'algorithms', 'maths']
image: './cover.jpg'
pinned: false
draft: false
---

"Are transformers a dead end?" is really two completely different questions wearing the same coat.

The first question is about the **architecture**: is there something inside the gears of self-attention that mathematically limits what a transformer can figure out in a single pass, no matter how huge we build it?

The second question is about the **training recipe**: has the strategy of the last decade—*"take the model, make it ten times bigger, and feed it ten times more text from the internet"*—run out of road?

Most arguments on the internet turn into shouting matches because people confuse the two. If you want a real answer, you have to separate the mechanics of how a transformer calculates from the economics of how it gets trained.

Let's start from absolute first principles—no buzzwords, no hand-waving—and build our way up from the basic intuition to the real mathematics.

---

## 1. The Core Mental Model: Words as Coordinates

Before touching any formulas, let's establish what a transformer is actually doing under the hood.

Computers don't understand words, grammar, or thoughts; they understand numbers. So the very first thing any language model does is turn every word (or piece of a word, called a **token**) into a list of numbers—a set of coordinates in space.

You might remember this idea from high school geometry: a point on a flat sheet of paper has two coordinates, $(x, y)$. A point in a room has three, $(x, y, z)$. 

A modern transformer does the exact same thing, but instead of three dimensions, it places each word into a space with several thousand dimensions (typically between $4,096$ and $12,288$ numbers for a single word). We call this list of coordinates a **vector**, denoted as $x \in \mathbb{R}^d$.

```
Word: "king"   --->  [ 0.25, -1.40,  0.88, ...,  0.12 ]  (thousands of coordinates)
Word: "queen"  --->  [ 0.23, -1.35,  0.91, ...,  0.14 ]
Word: "apple"  --->  [-0.82,  0.45, -0.12, ..., -0.65 ]
```

Because words with similar meanings end up near each other in this coordinate space, `"queen"` sits right next to `"king"`, while `"apple"` is far away.

When a sentence of $N$ words enters the model, we stack all their coordinate lists into a grid—a table of numbers called a matrix:

$$X = \begin{bmatrix} \text{— coordinates of word 1 —} \\ \text{— coordinates of word 2 —} \\ \vdots \\ \text{— coordinates of word } N \text{ —} \end{bmatrix}$$

### The Shared Whiteboard (The Residual Stream)

Older neural networks used to pass information like a baton in a relay race: Layer 1 read the input, mangled it, threw it away, and passed a brand new state to Layer 2. 

A transformer does something much smarter. It uses what is called a **residual stream**.

Think of the residual stream as a **shared whiteboard** running through an assembly line of layers:
1. At the start, each word writes its original meaning on its own section of the whiteboard.
2. When the representation passes through Layer 1, the layer doesn't erase the whiteboard. It simply calculates a small note—a correction or update—and **adds** it onto the board.
3. Layer 2 reads the whiteboard, calculates its own small note, and **adds** that on top.

```
Layer 0:  Start with original word meaning
Layer 1:  Add note from Layer 1  (+)
Layer 2:  Add note from Layer 2  (+)
...
Layer L:  Final result = Original Meaning + Sum of All Notes
```

In simple math:

$$x_{\text{final}} = x_{\text{initial}} + \Delta x_1 + \Delta x_2 + \dots + \Delta x_L$$

Because everything is just added together, earlier information is never lost or overwritten. Different parts of the network can write notes on independent topics without erasing what other parts wrote.

Now comes the big question: **how do words actually talk to each other to write those notes?** That is the job of Attention.

---

## 2. Attention: Queries, Keys, and Values

Imagine you are reading this sentence:

> *"The animal didn't cross the street because **it** was too tired."*

To understand what **"it"** refers to, your brain has to look back at the earlier words and connect **"it"** to **"animal"**, not to **"street"**. 

How does a computer do that? 

For every word in the sentence, the transformer creates three separate vectors by multiplying the word's coordinates by learned weight matrices:

1. **The Query ($Q$)**: *"What am I looking for?"*  
   The word `"it"` broadcasts a Query: *"I am a pronoun looking for the noun that describes me."*
2. **The Key ($K$)**: *"What do I offer?"*  
   The word `"animal"` broadcasts a Key: *"I am a living subject capable of being tired."* Meanwhile, `"street"` broadcasts: *"I am an inanimate surface."*
3. **The Value ($V$)**: *"Here is my actual content."*  
   If a Query matches a Key, this is the information that gets passed over.

### Measuring Similarity: The Dot Product

To see how well a Query matches a Key, the model takes their **dot product**: it multiplies their corresponding numbers together and sums them up:

$$\text{Score} = q \cdot k = \sum_{m=1}^{d_k} q_m k_m$$

- If two vectors point in the same direction (strong match), the dot product is a **large positive number**.
- If they are unrelated, the dot product is **near zero**.
- If they conflict, the dot product is a **negative number**.

In matrix notation, token $i$'s query and token $j$'s key interact through a mathematical structure called a **bilinear form**:

$$S_{ij} = q_i^T k_j = x_i^T (W_Q W_K^T) x_j$$

The matrix $W_{QK} = W_Q W_K^T$ acts as a learned correlation scanner. It reads the whiteboard, checks how relevant word $j$ is to word $i$, and gives that pair a score.

---

## 3. The Scaling Factor: Why We Divide by $\sqrt{d_k}$

Once the model computes raw similarity scores for all words, it needs to turn those scores into percentages—weights that are positive and add up to $100\%$ ($1.0$). 

It does this using the standard **softmax** function:

$$A_{ij} = \frac{e^{S_{ij}}}{\sum_m e^{S_{im}}}$$

If word $A$ gives word $B$ a high score, $e^{\text{Score}}$ becomes large, giving word $B$ a huge percentage of attention.

Now, look at the famous formula from the original 2017 paper:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{Q K^T}{\sqrt{d_k}}\right) V$$

Notice that $\sqrt{d_k}$ in the denominator. Introductory tutorials often breeze past it: *"We divide by the square root of the dimension to help gradients."* But why? What actually goes wrong without it?

Let's do the simple math:

Suppose the numbers inside our query $q$ and key $k$ are random variables with an average value of $0$ and a variance of $1$:

$$\mathbb{E}[q_m] = 0, \quad \text{Var}(q_m) = 1, \qquad \mathbb{E}[k_m] = 0, \quad \text{Var}(k_m) = 1$$

When we calculate the dot product, we add up $d_k$ of these pairs:

$$S = q \cdot k = q_1 k_1 + q_2 k_2 + \dots + q_{d_k} k_{d_k}$$

The expected average is still $0$. But what happens to the variance (how widely the scores spread out)? Because each component is independent:

$$\text{Var}(S) = \sum_{m=1}^{d_k} \text{Var}(q_m k_m) = d_k$$

The spread (standard deviation $\sigma$) of the raw dot product is:

$$\sigma_S = \sqrt{\text{Var}(S)} = \sqrt{d_k}$$

### The Softmax Gradient Flatline

In modern models, the dimension $d_k$ is typically $128$. The square root of $128$ is roughly **$11.3$**.

Without dividing by $\sqrt{d_k}$, our dot products don't stay near zero—they regularly swing out to $+30$ or $-30$.

Here is what happens when you feed numbers like $+30$ into a softmax: because $e^{30}$ is over $10,000,000,000,000$, one single word gets an attention weight of **$99.9999\%$**, while every other word gets **$0.0001\%$**. The attention collapses from a nuanced blend into a hard, rigid winner-take-all choice ($\text{argmax}$).

Now look at what happens to the derivatives during training. The derivative of the softmax output $s_i$ with respect to an input score $z_j$ is:

$$\frac{\partial s_i}{\partial z_j} = s_i (\delta_{ij} - s_j)$$

When $s_i$ is stuck at $1$ (or at $0$):

$$\frac{\partial s_i}{\partial z_i} = 1 \times (1 - 1) = \mathbf{0}$$

**The gradient flatlines to zero.** Backpropagation cannot update the model's weights because the mathematical slope is completely flat. Learning freezes.

By dividing by $\sqrt{d_k}$, we rescale the variance back to $1$:

$$\text{Var}\left(\frac{S}{\sqrt{d_k}}\right) = \frac{1}{d_k} \text{Var}(S) = \frac{d_k}{d_k} = \mathbf{1}$$

This single division keeps the similarity scores inside the gentle, curved region of the softmax where gradients can flow and words can blend information smoothly.

![Softmax Saturation and Gradient Flatline](./softmax_saturation_gradient.png)
*Figure 1: (Left) Unscaled dot products ($\sigma \approx \sqrt{d_k} = 11.3$) push the softmax into saturated extremes, forcing near-one-hot outputs. Scaling by $1/\sqrt{d_k}$ preserves a healthy, differentiable probability distribution. (Right) The softmax Jacobian diagonal $\partial s_i / \partial z_i = s_i(1 - s_i)$ plotted against the logit margin. Beyond a margin of $\pm 4$, the gradient flatlines to zero, paralyzing gradient descent.*

---

## 4. Attention as Mixing Paint: The Convex Hull

Now that we understand how attention weights are calculated, what do they actually do to the word representations?

Recall that the output for word $i$ is calculated by multiplying the attention weights by the value vectors $v$:

$$\tilde{x}_i = \sum_{j=1}^N A_{ij} v_j$$

Look closely at the weights $A_{ij}$:
1. They are all positive: $A_{ij} \ge 0$.
2. They sum to exactly one: $\sum_{j=1}^N A_{ij} = 1$.

In mathematics, any weighted average where the weights are positive and add up to $1$ is called a **convex combination**. The collection of all possible points you can make this way is called the **convex hull**.

### The Paint-Mixing Metaphor

Think of attention as **mixing paint**:
- The value vectors $v_1, v_2, \dots, v_N$ are the pigments currently on your palette (say, red, yellow, and blue).
- Attention chooses the recipe: $40\%$ red, $60\%$ blue.
- The output $\tilde{x}_i$ is the resulting mixture (purple).

```
[ Red Pigment ]  \
                  ---> [ 40% Red + 60% Blue ] = [ Purple Output ]
[ Blue Pigment ] /
```

This reveals a fundamental geometric constraint:

> **Self-attention can only interpolate between existing representations. It can never create a feature that lies outside the convex hull of what is already there.**

If you have red and blue on your palette, you can make purple, pink, or maroon. But no matter what attention weights you choose, **you cannot mix red and blue to make green**. Attention alone cannot invent new geometric dimensions.

This is why every transformer layer contains a second component right after attention: the **Feed-Forward Network (MLP)**. The MLP applies non-linear activation functions (like GELU or SwiGLU) that can warp space and push vectors *outside* the convex hull, adding new feature directions that pure blending could never produce.

![Attention as a Dynamic Convex Combination](./convex_hull_attention.png)
*Figure 2: The geometry of self-attention. The output representation $\tilde{x}_i$ for any token is strictly trapped inside the convex hull $\mathrm{Conv}(v_1, \dots, v_5)$ formed by the input vectors. Attention alone can only average and blend existing vectors; it cannot create new feature directions without the non-linear MLP.*

Now we arrive at our first real mystery: what happens if you take this paint-mixing machine and stack layer after layer of it?

---

## 5. The Collapse Nobody Designed For: Rank Collapse

Suppose you decided to build a deep neural network out of pure self-attention layers, stacking 30 or 50 layers in a row without any residual connections or MLPs.

You might assume that more layers mean deeper reasoning. In reality, something catastrophic happens: **the network completely destroys all information.**

Think about what happens if you repeatedly blur a photograph with an image editor:
- Filter 1 softens the edges.
- Filter 5 makes shapes fuzzy.
- Filter 20 turns the entire image into a **single, flat, uniform gray square**.

Because self-attention is a weighted average, repeatedly averaging points without adding anything new eventually pulls every single point toward the exact same center of gravity.

In 2021, researchers Yihe Dong, Jean-Baptiste Cordonnier, and Andreas Loukas proved this mathematically in a landmark paper (*["Attention is Not All You Need"](https://arxiv.org/abs/2103.03404)*):

### The Dong et al. Theorem

In a network of pure self-attention layers ($X^{(l+1)} = \text{Attn}(X^{(l)})$), the difference between the representation matrix and a matrix where every row is identical decays **doubly exponentially**:

$$\|X^{(l)} - \mathbf{1} v^T\| \le \mathcal{O}\left(c^{2^l}\right)$$

where $\mathbf{1} v^T$ is a matrix where **every row is the exact same vector $v$** (a matrix of rank 1), and $c \in (0, 1)$ is a constant.

Look at how fast $c^{2^l}$ plunges when $c = 0.5$:
- Layer 1: $0.5^2 = 0.25$
- Layer 2: $0.5^4 = 0.0625$
- Layer 3: $0.5^8 \approx 0.0039$
- Layer 6: $0.5^{64} \approx 5.4 \times 10^{-20}$

By layer 6 of pure attention, the representation for the word `"apple"`, the word `"quantum"`, and the punctuation mark `"."` become numerically identical down to the 19th decimal place. The matrix suffers **rank collapse**.

```
Pure Attention:
X  ---> [Attn] ---> [Attn] ---> [Attn] ---> Rank 1 (Every word becomes identical)

Real Transformer:
X  ---+-> [Attn] --+-> [MLP] ---+-> Token diversity preserved!
      |            ^   |        ^
      +------------+   +--------+  (Residual skip connections)
```

This theorem proves that the residual connections and MLPs are not optional tricks to make models train a little faster. **They are structural life rafts.** The residual connection keeps the original sharp photograph underneath the blur, and the MLP constantly injects new non-linear contrast so the representations never collapse into gray mush.

So, does the architecture have a hard limit? Yes: pure attention degenerates on its own. But this limit is completely neutralized by the standard residual design.

The limit that is **not** so easily fixed is about time and sequential steps.

![Rank Collapse: Doubly Exponential Decay](./rank_collapse_decay.png)
*Figure 3: Token diversity $\|X^{(l)} - \mathbf{1}v^T\|$ over depth $l$. Pure self-attention suffers from doubly exponential decay $\mathcal{O}(c^{2^l})$, wiping out token individuality by layer 6. Residual connections ($X + \mathrm{Attn}(X)$) and MLP sub-layers preserve representation rank across hundreds of layers.*

---

## 6. The Limit That's Harder to Patch: Sequential Depth and $\text{TC}^0$

Here is a simple question that stumps many people: 

> *Why does a 400-billion-parameter language model, trained on trillions of words, still fail at multiplying two 40-digit numbers together in its head?*

People often call this a "hallucination" or say the model "needs better data." But the real reason is a matter of **computational circuit depth**.

Consider how you multiply two large numbers by hand:
1. You multiply the first column.
2. You compute a carry digit.
3. You add that carry to the next column.
4. You carry again.

Notice that step 3 **strictly cannot start** until step 2 finishes. The problem has an inherently sequential chain of dependencies. You cannot skip ahead, no matter how many people or how much paper you have working in parallel.

A transformer with 96 layers does exactly 96 sequential operations in a single forward pass. That is true whether the input is three words or ten thousand words. When you ask a transformer to output the final answer to a 40-digit multiplication problem in a single step, you are asking a 96-step machine to solve a problem that inherently requires hundreds of sequential dependency steps.

### Circuit Complexity: The $\text{TC}^0$ Ceiling

In theoretical computer science, we classify computational problems by the kinds of circuits needed to solve them:

- $\text{AC}^0$: Circuits of constant depth with unbounded AND/OR gates. (Cannot even compute whether the number of 1s in an input is odd or even—the PARITY problem).
- $\text{TC}^0$: Circuits of constant depth that include **threshold (majority) gates**, which can count inputs. $\text{TC}^0$ can easily solve integer addition and simple sorting in constant depth.

In 2023, William Merrill and Ashish Sabharwal (*["The Expressive Power of Transformers with Chain of Thought"](https://arxiv.org/abs/2310.07923)*) proved a fundamental theorem:

> **Theorem:** A fixed-depth transformer with $L$ layers running in a single forward pass with standard numerical precision is computationally bounded within the circuit complexity class **uniform $\text{TC}^0$**.

Where does $\text{TC}^0$ fit into the bigger picture?

$$\text{TC}^0 \subseteq \text{NC}^1 \subseteq \text{L} \subseteq \text{P}$$

Complexity theorists widely conjecture that $\text{TC}^0$ is strictly weaker than $\text{NC}^1$ and polynomial time ($\text{P}$). Under these standard conjectures, problems that require tracking sequential state over time—like evaluating nested mathematical formulas or traversing dynamic graphs—**provably cannot be solved in constant circuit depth**.

Furthermore, as researcher Michael Hahn proved in 2020 (*TACL 2020*), because real transformers use continuous, smooth softmax rather than hard discrete gates, their ability to track subtle single-bit signals washes out as context length grows ($1/N$).

### Why Chain-of-Thought Works

This explains why **Chain-of-Thought (CoT)**—having the model write out its steps before giving the answer—is not just a clever prompting trick. It is a mathematical transformation of the circuit.

```
Single Pass (Trapped in constant depth TC⁰):
Input [X] ---> [ 96 Layers ] ---> Output [Y]   (Depth = 96)

Chain-of-Thought (Unrolled loop in P):
Input [X] ---> [ 96 Layers ] ---> Token 1
                     |
                     v
               [ 96 Layers ] ---> Token 2
                     |
                     v
               [ 96 Layers ] ---> Token 3 ... ---> Output [Y]  (Depth = 96 × T)
```

Every single token the model writes down gets fed back into its context window as input for the next cycle. If a model generates $1,000$ thinking tokens:
- Its effective computational depth is no longer $96$.
- It is now **$96 \times 1,000 = 96,000$ sequential layers**.

Chain-of-thought converts a shallow, constant-depth parallel circuit into an unrolled sequential computer capable of solving general polynomial-time problems ($\text{P}$).

![Circuit Complexity Hierarchy and Chain of Thought](./circuit_complexity_hierarchy.png)
*Figure 4: Computational expressivity hierarchy. A fixed-depth transformer in a single forward pass is confined to uniform $\mathrm{TC}^0$. Sequential state tracking and multi-step logic require circuit depth proportional to problem size. Chain-of-Thought unrolls the network across $T$ generated tokens, scaling effective depth to $T \times L$ and elevating its expressive power into polynomial time ($\mathrm{P}$).*

---

## 7. The Economics Caught Up: Diminishing Returns and the Data Wall

So far, we have looked at the **architecture**—what a transformer can compute in one breath versus across multiple tokens.

Now let's examine the **program**: the strategy of pretraining. Why did the simple recipe of *"make the model bigger and feed it more text"* start running into a wall around 2024–2025?

Because it ran into two separate laws of physics and information theory.

### Wall 1: The Chinchilla Power Law and Exponential Costs

In 2022, Jordan Hoffmann and the DeepMind team established the **Chinchilla Scaling Laws**. They modeled the cross-entropy loss $L$ (how well the model predicts the next token) as a function of parameter count $N$ and training tokens $D$:

$$L(N, D) = E + \frac{A}{N^\alpha} + \frac{B}{D^\beta}$$

where:
- $E$ is the irreducible entropy floor (the inherent unpredictability of human language).
- $\alpha \approx 0.34$ and $\beta \approx 0.28$ are empirical scaling exponents.

When you balance parameters and tokens to get the maximum possible loss reduction per dollar of compute ($C \approx 6ND$), the reducible error shrinks according to a single power law of compute:

$$L_{\text{reducible}}(C) \propto C^{-\gamma}, \quad \text{where } \gamma = \frac{\alpha \beta}{\alpha + \beta} \approx 0.154$$

Now take the derivative to see the marginal return of adding more compute:

$$\frac{\partial L}{\partial C} \propto -0.154 \cdot C^{-1.154}$$

Look at that exponent: **$-1.154$**.

Because $\gamma$ is small ($0.154$), the inverse power $1/\gamma$ is roughly **$6.5$**. 

This means that to cut the remaining error in half, the compute you have to burn does not double—it scales by:

$$2^{6.5} \approx \mathbf{90\times \text{ to } 100\times}$$

Going from a $\$10\text{M}$ cluster to a $\$1\text{B}$ cluster yields an incremental, razor-thin sliver of cross-entropy improvement. And lower cross-entropy on internet text just means the model is a slightly better predictor of what random people on the internet write; it does not automatically give the model complex reasoning or algorithmic reliability.

![Chinchilla Power-Law Asymptote and Marginal Return](./chinchilla_power_law.png)
*Figure 5: (Left) The Chinchilla cross-entropy loss curve $L(C) = E + A \cdot C^{-\gamma}$ flattening against the irreducible entropy floor $E \approx 1.65$. (Right) The derivative $|\partial L / \partial C|$ on a log-log scale, illustrating the brutal exponential collapse of marginal returns per FLOP.*

---

### Wall 2: The Finite Stock of Human Data

The Chinchilla laws also tell us that for every parameter you add to a model, you need roughly 20 tokens of data to train it optimally ($D \approx 20N$).

Let's do the arithmetic:
- Meta's Llama 3 (405B parameters) was trained on **15 trillion tokens**.
- To train a compute-optimal 2-trillion parameter model, you would need:

$$D \approx 20 \times (2 \times 10^{12}) = \mathbf{40 \text{ trillion tokens}}$$

Where does 40 trillion tokens of high-quality writing come from?

According to comprehensive research by **Epoch AI** (*["Will We Run Out of Data?"](https://epochai.org/blog/will-we-run-out-of-data-limits-of-llm-scaling-based-on-human-data)*), the total stock of high-quality, publicly accessible text on the entire internet—every book, research paper, encyclopedia, news archive, and open-source code repository ever created by humanity—totals roughly **$150$ to $300$ trillion tokens**.

Frontier AI labs have already vacuumed up a massive, double-digit percentage of the entire written record of our species. You cannot order 10 times more human history the way you order 10 times more GPUs from Nvidia. The reservoir is running dry.

![Training Tokens vs The Planetary Data Wall](./human_data_ceiling.png)
*Figure 6: Cumulative training tokens ingested by frontier models compared to Epoch AI's estimated global stock of high-quality human text (~150T tokens). Pretraining runs have already consumed a massive fraction of all accessible written human history.*

---

### The Failed Shortcut: Model Collapse (The Photocopy of a Photocopy)

The obvious Silicon Valley suggestion was: *"If we run out of human text, let's just have AI write synthetic text to train the next AI!"*

In July 2024, an international research team led by Ilia Shumailov published a paper in *Nature* demonstrating why ungrounded synthetic text fails (*["AI models collapse when trained on recursively generated data"](https://www.nature.com/articles/s41586-024-07566-y)*).

They modeled what happens when generation $n+1$ trains on the output distribution of generation $n$:

$$p_{n+1}(x) = \mathbb{E}_{x \sim p_n}[\mathcal{M}(x)]$$

When a model samples text, it naturally generates high-probability words (the center of the bell curve) and under-samples rare words, subtle edge cases, and unusual phrasings (the tails).

When you feed those outputs back into the next model:
1. **Variance Shrinks**: The distribution gets narrower with each round: $\text{Var}(p_{n+1}) < \text{Var}(p_n)$.
2. **Tails Disappear**: The rare, subtle ideas that make language rich are completely lost.
3. **Entropy Collapses**: The information entropy $H(p_n) \to 0$.

It is the exact mathematical equivalent of **taking a photocopy of a photocopy**. Do it once, and the image looks fine. Do it five times, and the fine details wash out. Do it twenty times, and you are left with a degraded sheet of blurry black and white smudge.

Without a source of real, grounded truth, synthetic text is an entropy trap.

![Model Collapse: Distribution Degeneration](./model_collapse_entropy.png)
*Figure 7: Probability density degeneration across recursive training generations $p_{n+1} = \mathbb{E}_{p_n}[\mathcal{M}]$. Without grounded verifiers, the distribution sheds its tails, contracts in variance, and suffers information entropy collapse ($H(p_n) \to 0$), reducing complex human nuance into a degenerate mode.*

---

## 8. So — Dead End or Not?

Now we can put both halves of the puzzle together and see the full picture:

1. **The single-pass architecture** is bounded by constant circuit depth ($\text{TC}^0$). You cannot fix this by feeding it more data; you fix it by giving it sequential runtime (Chain-of-Thought and tool loops).
2. **The pretraining program** is bounded by power-law diminishing returns ($\gamma \approx 0.154$) and the finite pool of human language. You cannot fix this by buying bigger clusters; ungrounded synthetic text only accelerates model collapse.

These are not one single wall. They are two distinct limits that arrived at the exact same moment in history.

And what we are seeing across the AI frontier in 2025 and 2026 is exactly the transition that these mathematics demand:

### 1. Externalizing Sequential Depth into Scaffolds
To bypass the single-pass $\text{TC}^0$ barrier, frontier systems (like Claude 3.7 Sonnet) don't try to solve complex coding tasks in one breath. They embed the transformer inside **interactive execution loops**:
- The model writes a tentative patch.
- An external compiler runs the code and runs test suites.
- The model observes the error output and refines its approach.

The sequential depth is moved out of the static weights and into an unrolled conversation with a real environment.

### 2. Verifiable Test-Time Compute (RLVR)
To bypass the pretraining data wall and model collapse, frontier systems (like OpenAI's o1/o3 and DeepSeek-R1) shift compute from pretraining to **inference-time search and Reinforcement Learning with Verifiable Rewards**:
- Rather than training on unverified model output, the model searches against deterministic truth: code that compiles, formal mathematical proofs checked by systems like Lean and Isabelle, and logic puzzles with exact solutions.
- Because reward is tied to external verification, entropy does not collapse. The photocopy problem disappears.
- Guided by Process Reward Models (PRMs), the system explores reasoning trees, catches its own mistakes, and backtracks.

![The Paradigm Shift: Pretraining vs Test-Time Search](./paradigm_shift_test_time.png)
*Figure 8: The architectural pivot of modern AI. Pure pretraining scaling (dashed) hits diminishing returns on complex reasoning tasks, while test-time search and verification (RLVR, Process Reward Models, MCTS) scale performance dramatically with compute allocated at inference.*

---

## Conclusion: The Demotion of the Oracle

So, back to our starting question: **are transformers a dead end?**

The answer depends entirely on what you thought the transformer was.

If your definition of a transformer was the 2020 Silicon Valley dream—a monolithic digital oracle that would swallow the internet, scale monotonically with compute, and output artificial general intelligence in a single forward pass—**then yes, the transformer is a dead end.**

The mathematics had that verdict written down from day one:
- In isolation, pure attention collapses doubly exponentially into **rank 1 uniformity**.
- In a single pass, attention is trapped inside constant circuit depth **$\text{TC}^0$**, incapable of arbitrary sequential state tracking.
- Pretraining returns decay as a power law ($C^{-1.154}$), colliding with the finite limits of human text and the entropy collapse of recursive synthetic data.

**What died was not the transformer. What died was pretraining maximalism.**

The transformer hasn't been discarded. It has been promoted to its proper, lasting role: the **Arithmetic Logic Unit (ALU) of modern computing**.

Just as a CPU does not solve complex algorithms in a single clock cycle, modern AI does not solve hard problems in a single forward pass. The transformer is a blindingly fast, intuitive heuristic engine, operating inside outer loops of tree search, verifiable execution, and autonomous tool harnesses.

Transformers are neither deities nor trivial autocomplete. They are geometric instruments. And understanding where their geometry ends is the only way to see where the real future of intelligence begins.
