---
title: 'spectral graphs are fun :D'
description: 'How turning a tangled network into a bunch of physical springs and computing Graph Laplacian eigenvectors magically solves 2D graph layout and bottleneck partitioning.'
date: 2026-08-31
tags: ['linear-algebra', 'graph-theory', 'algorithms', 'maths']
image: './cover.jpg'
pinned: false
---

graphs are weirdly annoying to visualize.

if someone gives you a list of 500 vertices and 2,000 edges, how do you actually draw that on a screen without it turning into a giant bowl of tangled noodles? if you place the dots randomly, you get a mess. if you try to drag them around by hand, you will be sitting there all night.

and what if you want to split that network into two roughly equal halves while cutting through as few edges as possible? checking every possible combination by hand or brute force is computationally impossible (np hard).

the reason spectral graph theory is so cool is that both problems get solved by the exact same piece of math. you treat every edge like a physical spring, write down a single matrix called the **Graph Laplacian**, compute its eigenvectors, and the geometry figures itself out.

---

## turning a graph into springs

say you have an undirected graph $G = (V, E)$ with $n$ vertices.

we turn it into math using two basic matrices:

1. **The Degree Matrix ($D$)**: an $n \times n$ diagonal matrix where each diagonal number $D_{uu}$ is just the number of connections vertex $u$ has.
2. **The Adjacency Matrix ($A$)**: where $A_{uv} = 1$ if vertices $u$ and $v$ share an edge, and $0$ if they do not.

the **Graph Laplacian** $L$ is just their difference:

$$L = D - A$$

now imagine assigning a 1D position $x_u$ on a number line to every vertex $u$, collected into a vector $x = (x_1, x_2, \dots, x_n)^T$.

watch what happens when you multiply out $x^T L x$:

$$x^T L x = x^T D x - x^T A x = \sum_{u \in V} \text{deg}(u) x_u^2 - 2 \sum_{(u, v) \in E} x_u x_v$$

since $\text{deg}(u)$ is just counting the edges touching vertex $u$, every edge $(u, v)$ adds $x_u^2$ once and $x_v^2$ once. if you regroup the terms by edges, the whole thing simplifies to:

$$x^T L x = \sum_{(u, v) \in E} (x_u - x_v)^2$$

this is literally Hooke's Law for springs.

if every edge is a spring, $x^T L x$ is the total energy stored in the stretched springs. if connected vertices are placed close together on the line, $(x_u - x_v)^2$ is tiny and energy is low. if connected vertices get yanked far apart, the energy spikes.

because $(x_u - x_v)^2 \ge 0$ for every single edge, $x^T L x \ge 0$ for every vector $x$. this means $L$ is always **positive semidefinite**, so its eigenvalues are all real and nonnegative:

$$0 = \lambda_1 \le \lambda_2 \le \lambda_3 \le \dots \le \lambda_n$$

---

## a concrete four node example

to see how this actually plays out with real numbers, take a simple 4 node line:

```
(1) === (2) === (3) === (4)
```

the degree matrix $D$ and adjacency matrix $A$ are:

$$D = \begin{pmatrix} 1 & 0 & 0 & 0 \\ 0 & 2 & 0 & 0 \\ 0 & 0 & 2 & 0 \\ 0 & 0 & 0 & 1 \end{pmatrix}, \quad A = \begin{pmatrix} 0 & 1 & 0 & 0 \\ 1 & 0 & 1 & 0 \\ 0 & 1 & 0 & 1 \\ 0 & 0 & 1 & 0 \end{pmatrix}$$

subtracting them gives $L$:

$$L = D - A = \begin{pmatrix} 1 & -1 & 0 & 0 \\ -1 & 2 & -1 & 0 \\ 0 & -1 & 2 & -1 \\ 0 & 0 & -1 & 1 \end{pmatrix}$$

notice that every row adds up to 0. if you multiply $L$ by a vector of all ones $\mathbf{1} = (1, 1, 1, 1)^T$, you get all zeros:

$$L \mathbf{1} = \mathbf{0}$$

so the smallest eigenvalue is always $\lambda_1 = 0$, with eigenvector $v_1 = \mathbf{1}$.

in physical terms, if you place every node on top of the exact same spot ($x_1 = x_2 = x_3 = x_4 = c$), no spring gets stretched at all, so the total energy is 0. it is a valid solution, but completely useless if we want to actually draw or split anything :p

---

## the fiedler vector

to get a useful layout, we have to prevent all the vertices from collapsing into a single dot. we add two rules:

1. **Center the layout at zero**: $\sum x_u = 0$ (so $x \perp \mathbf{1}$).
2. **Fix the scale**: $\sum x_u^2 = 1$ (so $\|x\|_2 = 1$).

now we ask: what vector $x$ minimizes spring energy under these two rules?

$$\min_{\substack{\|x\|_2 = 1 \\ x \perp \mathbf{1}}} x^T L x$$

the Courant Fischer theorem tells us the answer immediately: it is the **second smallest eigenvector** of $L$, known as the **Fiedler vector** $v_2$, and the minimum energy is the second eigenvalue $\lambda_2$.

if you run the numbers for our 4 node line:

$$\lambda_1 = 0, \quad \lambda_2 \approx 0.586, \quad \lambda_3 = 2.0, \quad \lambda_4 \approx 3.414$$

and the Fiedler vector $v_2$ comes out to:

$$v_2 \approx \begin{pmatrix} -0.653 \\ -0.271 \\ +0.271 \\ +0.653 \end{pmatrix}$$

look at what happened:
* node 1 lands at $-0.653$
* node 2 lands at $-0.271$
* node 3 lands at $+0.271$
* node 4 lands at $+0.653$

without telling the matrix anything about geometry, the eigenvectors sorted the vertices into an evenly spaced line from left to right.

---

## drawing graphs in 2D

if you want a 2D layout instead of a 1D line, you just grab two eigenvectors:
* use $v_2$ for the x coordinates
* use $v_3$ for the y coordinates (which is perpendicular to both $\mathbf{1}$ and $v_2$)

each vertex $u$ gets placed at the coordinate $(v_2(u), v_3(u))$.

here is what happens when you compare embedding using the smallest nontrivial eigenvectors versus the largest ones:

![Spectral Graph Embeddings: Cycle and Grid Graphs](./spectral_embeddings.png)

### why the shapes look like that:
* **Top Left (20 node cycle with $v_2, v_3$)**: the cycle embeds as a clean circle. the Laplacian of a cycle is a circulant matrix, so its eigenvectors are discrete sines and cosines $(\cos(2\pi k / n), \sin(2\pi k / n))$. minimizing spring energy naturally pulls the loop into an untangled round polygon.
* **Top Right (20 node cycle with largest eigenvectors)**: using the largest eigenvectors does the exact opposite. it maximizes spring stretch, forcing neighbors as far apart as possible into a spiky star.
* **Bottom Left ($20 \times 20$ grid with $v_2, v_3$)**: the grid unfolds into a planar mesh with zero crossed lines.
* **Bottom Right ($20 \times 20$ grid with largest eigenvectors)**: pinches the grid into a bowtie mess.

---

## finding bottlenecks

now for graph partitioning.

say you have a network and you want to slice it into two groups $S$ and $\bar{S}$ so that both groups are reasonably balanced and you cut through as few edges as possible.

we measure cut quality using **conductance** $\phi(S)$:

$$\phi(S) = \frac{|E(S, \bar{S})|}{\min(|S|, |\bar{S}|)}$$

conductance is just the ratio of cut edges over the size of the smaller piece. smaller conductance means a cleaner cut through a narrow bottleneck.

finding the best cut is np hard, but the Fiedler vector gives a super clean approximation with the **Sweep Cut algorithm**:

```
[Sort vertices by Fiedler value v₂(u)]
  u₁  ≤  u₂  ≤  u₃  ≤  ...  ≤  uₙ
   │      │      │
   ▼      ▼      ▼
 Sweep a line across the sorted list
 Check conductance φ(Sₖ) for each prefix
 Pick the split with the lowest score
```

in our 4 node example, $v_2 = (-0.653, -0.271, +0.271, +0.653)$.

the values split cleanly across zero between node 2 and node 3. putting $\{1, 2\}$ on one side and $\{3, 4\}$ on the other cuts only 1 edge, giving the exact optimal split.

### cheeger's inequality

why does sorting by $v_2$ work so well? **Cheeger's Inequality** proves that the discrete cut quality $\phi(G)$ is tightly trapped by the continuous eigenvalue $\lambda_2$:

$$\frac{\lambda_2}{2} \le \phi(G) \le \sqrt{2 d_{\max} \lambda_2}$$

where $d_{\max}$ is the maximum degree in the graph.

this tells you:
* if $\lambda_2 \approx 0$, the graph has an obvious bottleneck (like two dense clusters joined by a single weak link).
* if $\lambda_2$ is large, the graph is an **expander**, meaning it is so tightly connected that no easy bottleneck exists anywhere.

---

## python snippet

here is how to compute spectral coordinates and run the sweep cut in a few lines of python:

```python
import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as sla

def spectral_embedding(adj_matrix):
    """
    Takes an adjacency matrix and returns (x, y) coordinates
    for each vertex using eigenvectors v2 and v3.
    """
    degrees = np.array(adj_matrix.sum(axis=1)).flatten()
    n = len(degrees)
    
    # Laplacian L = D - A
    L = sp.diags(degrees) - adj_matrix
    
    # Compute 3 smallest eigenvalues & eigenvectors
    vals, vecs = sla.eigsh(L.astype(float), k=3, which='SM')
    
    # Sort in ascending eigenvalue order
    order = np.argsort(vals)
    v2 = vecs[:, order[1]]
    v3 = vecs[:, order[2]]
    
    return v2, v3

def sweep_cut(adj_matrix):
    """
    Finds the cleanest bottleneck cut by sweeping along v2.
    """
    v2, _ = spectral_embedding(adj_matrix)
    order = np.argsort(v2)
    n = len(order)
    
    best_cond = float('inf')
    best_split = None
    
    # Sweep through all prefix subsets
    for k in range(1, n):
        S = set(order[:k])
        cut_edges = sum(
            1 for u in S 
            for v in adj_matrix[u].indices 
            if v not in S
        )
        cond = cut_edges / min(len(S), n - len(S))
        
        if cond < best_cond:
            best_cond = cond
            best_split = S
            
    return best_split, best_cond
```

---

## quick summary

| Object | Matrix View | Spring View | What It Does |
| :--- | :--- | :--- | :--- |
| **$L = D - A$** | Laplacian matrix | Total potential energy operator | Encodes all connections and degrees |
| **$\lambda_1 = 0, v_1 = \mathbf{1}$** | Smallest eigenvalue | Zero energy rigid shift | Counts disconnected components |
| **$\lambda_2, v_2$** | Fiedler eigenvalue & vector | Lowest vibrational mode | Spreads vertices along bottlenecks |
| **$v_2, v_3$** | 2nd and 3rd eigenvectors | First two 2D harmonics | Automatic 2D graph layout |
| **Cheeger's Bound** | $\lambda_2 / 2 \le \phi(G) \le \sqrt{2 d_{\max} \lambda_2}$ | Slowest acoustic vibration | Bounds minimum cut conductance |

pretending a graph is made of little physical springs turns an impossible search into basic linear algebra, giving you a camera to draw networks and a clean way to slice them apart.
