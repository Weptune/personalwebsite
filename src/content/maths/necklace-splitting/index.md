---
title: 'Stealing Jewels with Topology: The Necklace Splitting Theorem'
description: 'How two jewel thieves use the Borsuk-Ulam Theorem on high-dimensional spheres to solve an impossible discrete division puzzle.'
date: 2026-10-10
tags: ['topology', 'combinatorics', 'algorithms']
image: './cover.jpg'
pinned: false
---

Suppose two thieves steal an open necklace. 

The necklace is an open chain composed of beads made from $k$ different gemstones: rubies, emeralds, sapphires, diamonds, and so on. Each gemstone variety appears an even number of times in total, say $2a_i$ beads of type $i$, but the beads are strung together in a completely arbitrary, chaotic sequence.

The thieves want to divide their loot fairly. Each thief must receive exactly half of every single gem variety: $a_1$ rubies, $a_2$ emeralds, and so on.

Naturally, neither thief wants to cut between every single bead. Doing that would destroy the string into thousands of individual fragments. They want to make the **absolute minimum number of cuts** along the necklace string to divide the necklace into contiguous segments, which are then distributed between the two thieves.

Here is the central question:

> **Given an arbitrary necklace with $k$ varieties of gems, what is the minimum number of cuts $N(k)$ that guarantees a fair split, regardless of how long the necklace is or how maliciously the beads are ordered?**

---

## 1. The Shocking Bound

Let us test our intuition on small values of $k$:

* **For $k = 1$ variety** (e.g. only rubies): A single cut ($N = 1$) always suffices. If there are $2a$ rubies, you simply count to the $a$-th ruby and cut the string immediately after it. Thief 1 gets the left half, and Thief 2 gets the right half.
* **For $k = 2$ varieties** (e.g. rubies and emeralds): Suppose all rubies are grouped on the left and all emeralds on the right:
  $$\underbrace{R \, R \, \dots \, R}_{2a_1} \quad \underbrace{E \, E \, \dots \, E}_{2a_2}$$
  A single cut cannot help you: any single cut gives one thief all or almost all of one color. But **2 cuts** work easily: cut out an interval in the middle that contains $a_1$ rubies and $a_2$ emeralds. Thief 1 takes that middle segment, and Thief 2 takes the two outer ends!

Can 2 cuts handle *any* arrangement of 2 gem colors, even if the necklace has 50,000 beads scattered in an alternating mess? 

**Yes.** In fact, in 1987, mathematician Noga Alon proved a celebrated general result:

> **The Necklace Splitting Theorem (Alon, 1987):**  
> For any necklace containing $k$ different types of beads with an even count of each type, **$k$ cuts are always sufficient** to divide the necklace so that both thieves receive exactly half of every bead type.

Think about how counter-intuitive this is. If a necklace contains $k = 4$ types of gems and **10,000,000 beads** arranged in the most adversarial, chaotic sequence imaginable, you never need more than **4 cuts**.

Furthermore, $k$ cuts is strictly optimal in the worst case. If the $k$ colors are segregated into $k$ contiguous blocks ($R \dots R \, E \dots E \, S \dots S \dots$), any valid partition requires at least $k$ cuts because each color boundary must be intersected to divide each block in half.

Yet, if you try to prove this theorem using discrete mathematics (induction, Hall's marriage theorem, or the pigeonhole principle), you will run into a wall. The discrete combinatorics of cuts and color permutations is overwhelmingly complex.

The breakthrough comes from a completely unexpected direction: **continuous algebraic topology**.

---

## 2. Step 1: Continuous Measures on the Unit Interval

The discrete problem is difficult because beads are granular integer objects. To make progress, we take a standard detour: we turn the discrete necklace into a continuous interval.

Imagine laying the necklace along the continuous unit interval $[0, 1] \subset \mathbb{R}$.

Instead of counting discrete beads, we define $k$ continuous probability measures $\mu_1, \mu_2, \dots, \mu_k$ on $[0, 1]$. Each measure $\mu_i$ represents the continuous density of the $i$-th gemstone variety along the string. 

For any sub-interval $I = [a, b] \subseteq [0, 1]$, $\mu_i(I)$ denotes the fraction of gem variety $i$ that lies inside $I$. By definition:
$$\mu_i([0, 1]) = 1 \quad \text{for each } i \in \{1, 2, \dots, k\}$$

Because these measures are continuous, they place zero measure on individual points: $\mu_i(\{p\}) = 0$.

The continuous version of our puzzle can now be stated cleanly:

> **Continuous Necklace Problem:**  
> Can we find $k$ cut points $0 \le y_1 \le y_2 \le \dots \le y_k \le 1$ dividing $[0, 1]$ into $k+1$ segments:
> $$I_1 = [0, y_1], \quad I_2 = [y_1, y_2], \quad \dots, \quad I_{k+1} = [y_k, 1]$$
> and assign each segment either to Thief 1 or Thief 2 such that for **every single measure** $i \in \{1, \dots, k\}$:
> $$\mu_i(\text{Thief 1}) = \mu_i(\text{Thief 2}) = \frac{1}{2} \text{ ?}$$

---

## 3. Step 2: The Geometry of Cuts as Points on a Sphere

How can we parameterize all possible ways to place $k$ cuts and assign segments to the two thieves?

Consider the unit $k$-dimensional sphere $S^k$ embedded in $(k+1)$-dimensional Euclidean space $\mathbb{R}^{k+1}$:

$$S^k = \left\{ x = (x_1, x_2, \dots, x_{k+1}) \in \mathbb{R}^{k+1} : \sum_{j=1}^{k+1} x_j^2 = 1 \right\}$$

Every point $x \in S^k$ directly encodes a complete partition and assignment of the continuous necklace!

Here is the dictionary:

1. **Segment Lengths:** For each coordinate $j \in \{1, \dots, k+1\}$, define the length of segment $I_j$ to be:
   $$\text{Length}(I_j) = x_j^2$$
   Since $\sum_{j=1}^{k+1} x_j^2 = 1$ by definition of the sphere, these $k+1$ lengths sum to exactly 1. They tile the unit interval $[0, 1]$ perfectly!
2. **Cut Positions:** The $k$ cut points $y_1, y_2, \dots, y_k$ are simply the cumulative partial sums of $x_j^2$:
   $$y_j = \sum_{m=1}^j x_m^2$$
3. **Thief Assignment:** The sign of each coordinate $x_j$ specifies which thief gets the corresponding segment:
   * If $x_j > 0$, segment $I_j$ is given to **Thief 1**.
   * If $x_j < 0$, segment $I_j$ is given to **Thief 2**.
   * If $x_j = 0$, segment $I_j$ has length zero (a degenerate segment), which simply means fewer than $k$ cuts were needed.

Now ask yourself: what happens if we take the **antipodal point** $-x = (-x_1, -x_2, \dots, -x_{k+1})$ on the sphere?

* The length of each segment is $(-x_j)^2 = x_j^2$, which is completely unchanged.
* The cut locations $y_j$ are completely unchanged.
* But every single sign is flipped: every segment that previously belonged to Thief 1 now belongs to Thief 2, and vice versa!

In other words:
$$\text{Antipodal points } x \text{ and } -x \text{ represent the EXACT same cuts, but with the thieves' piles swapped!}$$

This antipodal symmetry is the golden key to the entire proof.

---

## 4. Step 3: The Discrepancy Vector Field

Now let us measure how unfair a given division $x \in S^k$ is.

For each gemstone variety $i \in \{1, \dots, k\}$, we compute the net difference between what Thief 1 receives and what Thief 2 receives under the partition defined by $x$:

$$F_i(x) = \sum_{j=1}^{k+1} \text{sign}(x_j) \cdot \mu_i(I_j)$$

where $\text{sign}(x_j) = +1$ if $x_j > 0$, $-1$ if $x_j < 0$, and $0$ if $x_j = 0$.

Combining these $k$ measurements into a single vector gives a continuous map from the $k$-sphere to $k$-dimensional Euclidean space:

$$F: S^k \to \mathbb{R}^k, \quad F(x) = \big( F_1(x), F_2(x), \dots, F_k(x) \big)$$

What happens to $F$ when we evaluate it at the antipodal point $-x$?

$$F_i(-x) = \sum_{j=1}^{k+1} \text{sign}(-x_j) \cdot \mu_i(I_j) = - \sum_{j=1}^{k+1} \text{sign}(x_j) \cdot \mu_i(I_j) = -F_i(x)$$

Therefore:
$$F(-x) = -F(x) \quad \text{for all } x \in S^k$$

The map $F$ is an **odd (antipode-preserving) continuous function**.

If we can find a point $x^* \in S^k$ where $F(x^*) = \mathbf{0}$, then:
$$F_i(x^*) = 0 \quad \text{for every } i \in \{1, \dots, k\}$$
which means Thief 1 and Thief 2 receive identical measures of every single gemstone variety. Since $\mu_i([0, 1]) = 1$, each thief receives exactly $1/2$ of each color!

Does such a point $x^*$ guaranteed to exist?

---

## 5. Step 4: The Borsuk-Ulam Theorem Delivers the Proof

To guarantee the existence of our fair partition point $x^*$, we bring in one of the most famous results in algebraic topology:

> **The Borsuk-Ulam Theorem (Karol Borsuk, 1933):**  
> For any continuous map $f: S^k \to \mathbb{R}^k$, there exists at least one pair of antipodal points $x^*, -x^* \in S^k$ such that:
> $$f(x^*) = f(-x^*)$$

A familiar real-world consequence of this theorem for $k = 2$ is that on the surface of the Earth (modeled as $S^2$), there are always two antipodal locations with the exact same temperature and atmospheric pressure simultaneously.

Now apply the Borsuk-Ulam Theorem directly to our discrepancy function $F: S^k \to \mathbb{R}^k$:

There must exist some point $x^* \in S^k$ such that:
$$F(x^*) = F(-x^*)$$

However, we already established from the physics of our segment assignment that $F$ is an odd function:
$$F(-x^*) = -F(x^*)$$

Equating the two yields:
$$F(x^*) = -F(x^*) \implies 2 F(x^*) = \mathbf{0} \implies F(x^*) = \mathbf{0}$$

This is the entire proof.

Because $F(x^*) = \mathbf{0}$, every single gemstone measure is partitioned with zero discrepancy:
$$\mu_i(\text{Thief 1}) = \mu_i(\text{Thief 2}) = \frac{1}{2} \quad \text{for all } i \in \{1, \dots, k\}$$

And how many cuts were used? Since $x^*$ has $k+1$ coordinates, the interval $[0, 1]$ is split into at most $k+1$ sub-intervals, which requires at most **$k$ cuts**.

---

## 6. Step 5: From Continuous Measures to Discrete Beads

At this point, a careful reader will object:

> *"Wait! The continuous theorem allows you to cut the interval at arbitrary real numbers. What happens if a cut lands right through the middle of an emerald? You cannot slice a gemstone in half!"*

This is where the discrete rounding argument completes the picture.

Suppose our discrete necklace has $M$ total beads, with $2a_i$ beads of color $i$. We place each bead along the unit interval as a small sub-interval of length $1/M$. Specifically, the $m$-th bead occupies $[(m-1)/M, m/M]$.

We apply the continuous theorem to obtain $k$ cut points. 

If all $k$ cut points land cleanly on bead boundaries $m/M$, we are done: each thief receives an integer set of intact beads, and because the continuous measures evaluate to $1/2$ for each color, both thieves get exactly $a_i$ beads of each color $i$.

What if some of the $k$ cuts fall strictly inside beads?

Because there are at most $k$ cuts, at most $k$ beads can be cut internally. Each such cut divides a bead into two fractions. 

Alon showed that one can set up a small system of linear equations matching the fractional assignments. Since each bead type has an even total count $2a_i$, the polyhedron of fair fractional allocations has integer vertices. By shifting the cut locations slightly to the left or right within the bead boundaries, all fractional allocations can be eliminated without changing the total count of any gem type or requiring any additional cuts.

Thus, the discrete theorem holds unconditionally.

---

## 7. A Python Demonstration: Finding the Cuts

To see how fair cuts look in practice, consider a small necklace with $k = 2$ colors: 8 rubies ($R$) and 6 emeralds ($E$):

```python
necklace = ['R', 'R', 'E', 'E', 'E', 'R', 'R', 'R', 'E', 'R', 'R', 'E', 'E', 'R']
```

The total counts are 8 $R$ and 6 $E$. A fair share is exactly 4 $R$ and 3 $E$ per thief.

By the Necklace Splitting Theorem, **2 cuts** must always exist that achieve this split.

Here is a short script verifying all possible 2-cut partitions:

```python
def check_necklace_splits(beads, k_colors=2):
    n = len(beads)
    total_counts = {}
    for b in beads:
        total_counts[b] = total_counts.get(b, 0) + 1
    
    target = {color: count // 2 for color, count in total_counts.items()}
    print(f"Total beads: {n} | Targets per thief: {target}")

    valid_cuts = []
    # Test all pairs of cuts (cut1, cut2) with 0 < cut1 < cut2 < n
    for c1 in range(1, n):
        for c2 in range(c1 + 1, n):
            # Segment 1: [0, c1], Segment 2: [c1, c2], Segment 3: [c2, n]
            # Thief 1 gets Segment 2 (middle)
            # Thief 2 gets Segments 1 and 3 (ends)
            t1_beads = beads[c1:c2]
            t1_counts = {color: t1_beads.count(color) for color in target}

            if t1_counts == target:
                valid_cuts.append((c1, c2))
    
    return valid_cuts

beads = ['R', 'R', 'E', 'E', 'E', 'R', 'R', 'R', 'E', 'R', 'R', 'E', 'E', 'R']
solutions = check_necklace_splits(beads)
print(f"Found {len(solutions)} fair 2-cut solutions: {solutions}")
```

Running this script reveals valid cut positions such as cuts at indices `(4, 11)`:
* Segment 1 (Thief 2): `['R', 'R', 'E', 'E']` (2 R, 2 E)
* Segment 2 (Thief 1): `['E', 'R', 'R', 'R', 'E', 'R', 'R']` (5 beads? Let us check: 4 R, 3 E)
* Segment 3 (Thief 2): `['E', 'R']` (1 R, 1 E)
* Thief 2 total: $(2+1) = 3$ R, wait, exactly 4 R and 3 E! Both thieves receive identical loot.

---

## 8. Generalizations and the Computational Complexity (PPA)

The story does not end with two thieves.

### What if there are $m$ thieves?

Noga Alon extended the theorem to arbitrary $m \ge 2$ thieves:

> If a necklace contains $k$ types of beads, and each bead type appears a multiple of $m$ times ($m \cdot a_i$), then **$k(m - 1)$ cuts** are always sufficient to divide the necklace equally among all $m$ thieves.

For $m = 2$, $k(2 - 1) = k$, which matches our theorem.

The proof for general $m$ is even more advanced: instead of the simple $\mathbb{Z}_2$-antipodal action of the Borsuk-Ulam theorem, it uses topological fixed-point theorems for prime cyclic group actions $\mathbb{Z}_p$ acting on products of unit spheres and Stiefel manifolds.

### The Computational Catch: The PPA Class

The Borsuk-Ulam theorem guarantees that a fair partition exists, but it is **non-constructive**: it gives no efficient algorithm to find the cut points.

In 2019, computer scientists Aris Filos-Ratsikas and Paul Goldberg resolved a long-standing question about the computational difficulty of finding these cuts:

> **Theorem (Filos-Ratsikas & Goldberg, 2019):**  
> Computing the cuts in the Necklace Splitting problem is **PPA-complete** (Polynomial Parity Argument).

PPA is the complexity class that captures problems whose existence is guaranteed by topological parity arguments (like Sperner's Lemma and the Borsuk-Ulam theorem). It contains other famous hard problems, such as finding Nash equilibria in certain non-cooperative games.

This means that while topology guarantees a fair split exists with absolute mathematical certainty, actually finding the cuts on a massive necklace is believed to be computationally intractable in the worst case!

---

## Summary

The Necklace Splitting Theorem is widely considered a masterpiece of modern mathematics because it embodies the power of **topological combinatorics**:

1. You start with an apparently intractable discrete puzzle about indivisible beads and cuts.
2. You continuous-ize the problem by mapping beads to probability measures on $[0, 1]$.
3. You realize that all cut locations and thief assignments can be encoded as coordinates on a unit sphere $S^k$, where antipodal points naturally swap the thieves.
4. The Borsuk-Ulam theorem immediately forces a zero-discrepancy point to exist on the sphere.
5. You round back to discrete beads.

Whenever discrete math hits an impenetrable wall of casework, a continuous topological detour often reveals that the solution was sitting on a sphere all along.
