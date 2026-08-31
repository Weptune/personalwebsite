---
title: 'Spectral Graph Theory: Drawing Networks and Finding Bottlenecks with Eigenvalues'
description: 'How the eigenvalues and eigenvectors of the Graph Laplacian solve two fundamental problems: drawing graphs cleanly in 2D and finding optimal network bottlenecks.'
date: 2026-08-31
tags: ['linear-algebra', 'graph-theory', 'algorithms', 'spectral-theory', 'maths']
image: './spectral_embeddings.png'
pinned: false
---

If you have a graph with hundreds of nodes and thousands of edges, two questions show up almost immediately:

1. **How do you draw it in 2D so it actually looks like what it is, without lines tangling into a ball of yarn?**
2. **How do you split the graph into two balanced pieces while cutting through as few edges as possible?**

Both problems sound like messy, combinatorial search puzzles. Finding the absolute minimum cut of balanced size (graph partitioning) is NP-hard. But it turns out you can solve both almost effortlessly by turning the graph into a physical system of springs, writing down a single matrix called the **Graph Laplacian**, and finding its eigenvectors :3

---

## The Graph as a Matrix

Take an undirected graph $G = (V, E)$ with $n$ vertices. 

We can describe it with two basic matrices:
- The **Degree Matrix** $D$, an $n \times n$ diagonal matrix where $D_{uu} = \text{deg}(u)$ is the number of edges touching vertex $u$.
- The **Adjacency Matrix** $A$, where $A_{uv} = 1$ if $(u, v) \in E$ and $0$ otherwise.

The **Graph Laplacian** $L$ is defined as their difference:

$$L = D - A$$

For example, on a simple triangle graph $K_3$, the Laplacian looks like:

$$L = \begin{pmatrix} 2 & -1 & -1 \\ -1 & 2 & -1 \\ -1 & -1 & 2 \end{pmatrix}$$

At first glance $L$ just looks like standard matrix bookkeeping, but it has a magic property when you evaluate its quadratic form.

---

## The Spring Energy Form

Let $x = (x_1, x_2, \dots, x_n)^T \in \mathbb{R}^n$ be an assignment of a 1D real coordinate to every single vertex. If you compute $x^T L x$, something neat happens:

$$x^T L x = x^T D x - x^T A x = \sum_{u \in V} \text{deg}(u) x_u^2 - \sum_{(u, v) \in E} 2 x_u x_v$$

Because $\text{deg}(u) = \sum_{v : (u, v) \in E} 1$, you can group the terms by edges:

$$x^T L x = \sum_{(u, v) \in E} (x_u - x_v)^2$$

This is identical to the potential energy of a network of physical springs! 

If every edge is a spring of unit stiffness, $x^T L x$ measures the total tension across all springs when vertex $u$ is placed at position $x_u$. If connected vertices are close together, $x^T L x$ is small. If connected vertices are pulled far apart, $x^T L x$ explodes.

Because $(x_u - x_v)^2 \ge 0$ for all edges, $x^T L x \ge 0$ for any vector $x$. This proves $L$ is always **positive semidefinite** ($L \succeq 0$), meaning all its eigenvalues are non-negative real numbers:

$$0 = \lambda_1 \le \lambda_2 \le \lambda_3 \le \dots \le \lambda_n$$

---

## The Trivial Solution and the Fiedler Vector

Suppose we want to find coordinates $x$ that minimize the spring energy $\sum_{(u, v) \in E} (x_u - x_v)^2$.

The absolute minimum is obviously $0$: just set $x_1 = x_2 = \dots = x_n = c$. Placing every single node on top of the exact same point eliminates all stretch.

This corresponds to the first eigenvector $\mathbf{1} = (1, 1, \dots, 1)^T$, giving eigenvalue $\lambda_1 = 0$:

$$L \mathbf{1} = (D - A)\mathbf{1} = \mathbf{0}$$

To get a non-trivial drawing, we need two constraints:
1. **Center of mass at origin**: $\sum_{u \in V} x_u = 0 \iff x \perp \mathbf{1}$.
2. **Fixed scale / variance**: $\sum_{u \in V} x_u^2 = 1 \iff \|x\|_2 = 1$.

Now, we want to minimize:

$$\min_{\substack{\|x\|_2 = 1 \\ x \perp \mathbf{1}}} x^T L x$$

By the Courant-Fischer Min-Max theorem (Rayleigh quotient), the exact vector $x$ that minimizes this constrained energy is the **second smallest eigenvector** of $L$, denoted $v_2$, and the minimum energy value is the second eigenvalue $\lambda_2$!

This eigenvector $v_2$ is called the **Fiedler vector** (or algebraic connectivity).

---

## Spectral Graph Drawing in 2D

To draw a graph in 2D plane $\mathbb{R}^2$, we need two coordinates for each vertex $u$: $(x_u, y_u)$.

We pick:
- X-coordinates from the 2nd smallest eigenvector: $x = v_2$
- Y-coordinates from the 3rd smallest eigenvector: $y = v_3$ (which is orthogonal to both $\mathbf{1}$ and $v_2$)

Each vertex $u \in V$ is plotted at $(v_2(u), v_3(u))$.

Look at what happens when you compare this against embedding using the *largest* eigenvectors:

![Spectral Graph Embeddings: Cycle and Grid Graphs](./spectral_embeddings.png)

### What the plots show:
- **Top-Left (20-Cycle Graph with $v_2, v_3$)**: The 20-cycle graph embeds as a clean, geometrically round circle. Because the eigenvectors are discrete sines and cosines $(\cos(2\pi k / n), \sin(2\pi k / n))$, the algebraic minimization of spring stretch reconstructs the circle polygon.
- **Top-Right (20-Cycle Graph with largest eigenvectors $v_n, v_{n-1}$)**: Using the largest eigenvectors does the exact opposite—it *maximizes* $(x_u - x_v)^2$, forcing adjacent nodes to opposite sides and creating a criss-crossed star.
- **Bottom-Left ($20 \times 20$ Grid Graph with $v_2, v_3$)**: Reconstructs the 2D square grid in planar orientation without any vertex overlap.
- **Bottom-Right ($20 \times 20$ Grid Graph with largest eigenvectors)**: Pinches into a butterfly bowtie mess.

---

## Spectral Graph Partitioning

The same Fiedler vector $v_2$ solves the **graph cut** problem.

Suppose we want to partition $V$ into two sets $S$ and $\bar{S} = V \setminus S$. The quality of the partition is measured by its **conductance** $\phi(S)$:

$$\phi(S) = \frac{|E(S, \bar{S})|}{\min(|S|, |\bar{S}|)}$$

Conductance measures the ratio of cut edges to the size of the smaller cluster. Low conductance means a clean cut through a narrow bottleneck.

Finding the exact minimum conductance $\phi(G) = \min_S \phi(S)$ is NP-hard. But spectral partitioning gives an efficient approximation:

### The Sweep-Cut Algorithm:
1. Compute the Fiedler vector $v_2$ of $L$.
2. Sort all vertices according to their values in $v_2$:
   $$v_2(u_1) \le v_2(u_2) \le \dots \le v_2(u_n)$$
3. Test all $n-1$ prefix cuts:
   $$S_k = \{u_1, u_2, \dots, u_k\} \quad \text{for } k = 1, 2, \dots, n-1$$
4. Output the set $S_k$ that achieves the smallest conductance $\phi(S_k)$.

### Cheeger's Inequality
Why does sorting by $v_2$ work so well? **Cheeger's Inequality** proves that the discrete geometric cut $\phi(G)$ is tightly bounded by the continuous eigenvalue $\lambda_2$:

$$\frac{\lambda_2}{2} \le \phi(G) \le \sqrt{2 d_{\max} \lambda_2}$$

- If $\lambda_2$ is tiny, the graph has an obvious bottleneck (like two dense clusters joined by a single bridge).
- If $\lambda_2$ is large, the graph is an **expander graph** with no bottlenecks anywhere.

---

## Python Implementation

You can compute spectral embeddings and sweep cuts in just a few lines of `numpy` and `scipy`:

```python
import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as sla

def spectral_embedding(adj_matrix):
    """Computes 2D spectral embedding coordinates (v2, v3)."""
    degrees = np.array(adj_matrix.sum(axis=1)).flatten()
    n = len(degrees)
    
    # Construct Laplacian L = D - A
    L = sp.diags(degrees) - adj_matrix
    
    # Compute 3 smallest eigenvalues & eigenvectors
    vals, vecs = sla.eigsh(L.astype(float), k=3, which='SM')
    
    # Sort eigenvalues in ascending order
    idx = np.argsort(vals)
    v2, v3 = vecs[:, idx[1]], vecs[:, idx[2]]
    
    return v2, v3

def sweep_cut(adj_matrix):
    """Finds best bottleneck cut by sweeping along Fiedler vector v2."""
    v2, _ = spectral_embedding(adj_matrix)
    order = np.argsort(v2)
    
    n = len(order)
    best_cond = float('inf')
    best_split = None
    
    # Sweep through prefix subsets
    for k in range(1, n):
        S = set(order[:k])
        cut_edges = sum(1 for u in S for v in adj_matrix[u].indices if v not in S)
        cond = cut_edges / min(len(S), n - len(S))
        
        if cond < best_cond:
            best_cond = cond
            best_split = S
            
    return best_split, best_cond
```

---

## Summary

Spectral graph theory bridges continuous linear algebra and discrete graph topology:

| Concept | Linear Algebra / Physics | Graph Topology |
| :--- | :--- | :--- |
| **$L = D - A$** | Spring potential energy operator | Vertex adjacency and degree structure |
| **$\lambda_1 = 0$** | Zero-energy translation mode | Connected components ($k$ zero eigenvalues $= k$ components) |
| **$v_2$ (Fiedler Vector)** | Lowest non-trivial vibrational mode | 1D coordinate spreading nodes along bottleneck |
| **$v_2, v_3$** | Lowest 2D vibrational eigenmodes | Optimal 2D graph drawing |
| **Cheeger's Bound** | $\frac{\lambda_2}{2} \le \phi(G) \le \sqrt{2 d_{\max} \lambda_2}$ | Guaranteed bounds on network conductance |

By converting combinatorial edges into quadratic spring stretch, the spectrum of the Laplacian gives us both a camera to visualize networks and a scalpel to dissect them.
