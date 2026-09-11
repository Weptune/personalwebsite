import os
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import norm
from scipy.spatial import ConvexHull

out_dir = r"c:\Users\abhin\personalwebsite\src\content\maths\the-math-of-transformers"
os.makedirs(out_dir, exist_ok=True)

# Set consistent publication style
plt.rcParams.update({
    'font.sans-serif': 'Helvetica, Arial, sans-serif',
    'font.family': 'sans-serif',
    'figure.autolayout': True,
    'axes.edgecolor': '#333333',
    'axes.linewidth': 1.2,
    'grid.color': '#e0e0e0',
    'grid.linestyle': '--',
    'grid.alpha': 0.7
})

# -------------------------------------------------------------
# Plot 1: Softmax Saturation and the Gradient Flatline
# -------------------------------------------------------------
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5), dpi=300)

np.random.seed(42)
d_k = 128
num_tokens = 8
q = np.random.randn(d_k)
K = np.random.randn(num_tokens, d_k)

raw_scores = np.dot(K, q)
scaled_scores = raw_scores / np.sqrt(d_k)

def softmax(z):
    exp_z = np.exp(z - np.max(z))
    return exp_z / np.sum(exp_z)

s_unscaled = softmax(raw_scores)
s_scaled = softmax(scaled_scores)

x = np.arange(num_tokens)
width = 0.35

ax1.bar(x - width/2, s_unscaled, width, label=r'Unscaled ($\sigma \approx \sqrt{d_k} = 11.3$)', color='#e63946', alpha=0.85)
ax1.bar(x + width/2, s_scaled, width, label=r'Scaled by $1/\sqrt{d_k}$ ($\sigma = 1.0$)', color='#1d3557', alpha=0.85)
ax1.set_title('Attention Weight Distribution Over 8 Tokens', fontsize=12, fontweight='bold', pad=10)
ax1.set_xlabel('Token Index', fontsize=10)
ax1.set_ylabel('Softmax Probability $s_i$', fontsize=10)
ax1.set_xticks(x)
ax1.legend(frameon=True, facecolor='#ffffff', edgecolor='#cccccc', fontsize=9)
ax1.grid(True, axis='y')

margin = np.linspace(-15, 15, 500)
p_i = 1 / (1 + np.exp(-margin))
grad_i = p_i * (1 - p_i)

ax2.plot(margin, grad_i, color='#457b9d', lw=2.5, label=r'$\partial s_i / \partial z_i = s_i (1 - s_i)$')
ax2.axvspan(-15, -4, color='#e63946', alpha=0.15, label='Gradient Flatline (Dead Zone)')
ax2.axvspan(4, 15, color='#e63946', alpha=0.15)
ax2.axvspan(-2, 2, color='#2a9d8f', alpha=0.15, label='Healthy Gradient Zone')
ax2.set_title('Softmax Gradient vs Logit Margin ($z_i - z_j$)', fontsize=12, fontweight='bold', pad=10)
ax2.set_xlabel('Logit Margin ($z_i - z_j$)', fontsize=10)
ax2.set_ylabel(r'Jacobian Gradient $\partial s_i / \partial z_i$', fontsize=10)
ax2.set_ylim(0, 0.28)
ax2.legend(frameon=True, facecolor='#ffffff', edgecolor='#cccccc', fontsize=9)
ax2.grid(True)

plt.savefig(os.path.join(out_dir, 'softmax_saturation_gradient.png'))
plt.close()
print("Saved softmax_saturation_gradient.png")

# -------------------------------------------------------------
# Plot 2: Dynamic Convex Hull in Representation Space (Refined labels)
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(7.5, 6), dpi=300)

points = np.array([
    [1.5, 5.0],
    [5.0, 6.0],
    [7.0, 2.5],
    [4.0, 0.8],
    [1.0, 2.0]
])

hull = ConvexHull(points)

# Plot convex hull polygon
ax.fill(points[hull.vertices, 0], points[hull.vertices, 1], color='#457b9d', alpha=0.25, label=r'Convex Hull $\mathrm{Conv}(v_1, \dots, v_5)$')
for simplex in hull.simplices:
    ax.plot(points[simplex, 0], points[simplex, 1], 'k--', lw=1.5)

# Plot input value vectors
colors = ['#e63946', '#f4a261', '#2a9d8f', '#264653', '#9b5de5']
labels = [r'$v_1$ ("quantum")', r'$v_2$ ("mechanics")', r'$v_3$ ("wave")', r'$v_4$ ("function")', r'$v_5$ ("collapse")']
offsets = [(-35, 12), (10, 8), (12, 0), (10, -15), (10, 8)]

for pt, col, lab, off in zip(points, colors, labels, offsets):
    ax.scatter(pt[0], pt[1], color=col, s=120, zorder=5)
    ax.annotate(lab, (pt[0], pt[1]), textcoords="offset points", xytext=off, fontsize=9.5, fontweight='bold')

# Plot attention output mixtures (convex combinations)
alphas = [
    [0.4, 0.4, 0.1, 0.05, 0.05],
    [0.1, 0.2, 0.5, 0.1, 0.1],
    [0.05, 0.05, 0.1, 0.7, 0.1]
]
mix_names = [r'$\tilde{x}_1$ (Attn blend)', r'$\tilde{x}_2$ (Attn blend)', r'$\tilde{x}_3$ (Attn blend)']
mix_offsets = [(-20, -18), (-25, -20), (-25, 12)]

for a, name, moff in zip(alphas, mix_names, mix_offsets):
    comb = np.dot(a, points)
    ax.scatter(comb[0], comb[1], color='#e76f51', marker='*', s=220, zorder=6)
    ax.annotate(name, (comb[0], comb[1]), textcoords="offset points", xytext=moff, fontsize=9, color='#d62828', fontweight='bold')

# Plot an unreachable point outside the hull
unreach = np.array([8.2, 5.5])
ax.scatter(unreach[0], unreach[1], color='#000000', marker='x', s=150, lw=3, zorder=6)
ax.annotate('Unreachable without MLP\n(Outside Convex Hull)', (unreach[0], unreach[1]),
            textcoords="offset points", xytext=(-65, 12), fontsize=9, color='#000000', fontweight='bold')

ax.set_title(r'Attention as a Convex Combination: $\tilde{x}_i \in \mathrm{Conv}(v_1, \dots, v_N)$', fontsize=12, fontweight='bold', pad=12)
ax.set_xlabel(r'Feature Coordinate 1 in $\mathbb{R}^d$', fontsize=10)
ax.set_ylabel(r'Feature Coordinate 2 in $\mathbb{R}^d$', fontsize=10)
ax.set_xlim(0, 10.0)
ax.set_ylim(0, 7.5)
ax.legend(loc='lower left', frameon=True, facecolor='#ffffff', edgecolor='#cccccc', fontsize=9)
ax.grid(True)

plt.savefig(os.path.join(out_dir, 'convex_hull_attention.png'))
plt.close()
print("Saved refined convex_hull_attention.png")

# -------------------------------------------------------------
# Plot 3: Rank Collapse Doubly Exponential Decay
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(8, 4.8), dpi=300)

layers = np.arange(1, 11)
c = 0.55

diff_doubly_exp = np.array([c**(2**l) for l in layers])
diff_single_exp = np.array([c**l for l in layers])
res_stable = np.full(len(layers), 0.85) + np.random.uniform(-0.03, 0.03, len(layers))

ax.semilogy(layers, diff_doubly_exp, 'o-', color='#d62828', lw=2.5, label=r'Pure Attention: Doubly Exponential $\|X^{(l)} - \mathbf{1}v^T\| \leq \mathcal{O}(c^{2^l})$')
ax.semilogy(layers, diff_single_exp, '--', color='#f4a261', lw=2, label=r'Standard Exponential Decay $\mathcal{O}(c^l)$ (for reference)')
ax.plot(layers, res_stable, 's-', color='#2a9d8f', lw=2.5, label=r'Transformer with Residual Stream $X + \mathrm{Attn}(X)$ + MLP')

ax.set_title('Rank Collapse: Token Diversity Destruction Over Depth', fontsize=12, fontweight='bold', pad=12)
ax.set_xlabel('Network Depth (Layer $l$)', fontsize=10)
ax.set_ylabel(r'Token Diversity / Distance to Rank 1 (Log Scale)', fontsize=10)
ax.set_ylim(1e-15, 2)
ax.axhline(1e-12, color='#999999', linestyle=':', label='Machine Epsilon / Numerical Collapse')
ax.legend(loc='upper right', frameon=True, facecolor='#ffffff', edgecolor='#cccccc', fontsize=8.5)
ax.grid(True, which='both', linestyle='--', alpha=0.5)

plt.savefig(os.path.join(out_dir, 'rank_collapse_decay.png'))
plt.close()
print("Saved rank_collapse_decay.png")

# -------------------------------------------------------------
# Plot 4: Chinchilla Power-Law (Fixed y-scale and calibrated A_c)
# -------------------------------------------------------------
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5), dpi=300)

log_c = np.linspace(21, 27, 200)
c_flops = 10**log_c

gamma = 0.15
E = 1.65
A_c = 1.35  # At 10^21 FLOPs, loss = 1.65 + 1.35 = 3.0

loss = E + A_c * (c_flops / 1e21)**(-gamma)
marginal_return = gamma * A_c * (c_flops / 1e21)**(-(gamma + 1)) / (1e21)

ax1.plot(log_c, loss, color='#1d3557', lw=2.8, label=r'Cross-Entropy Loss $L(C) = E + A \cdot C^{-\gamma}$')
ax1.axhline(E, color='#e63946', linestyle='--', lw=1.8, label=r'Irreducible Loss Floor ($E \approx 1.65$)')
ax1.set_title('The Chinchilla Loss Asymptote', fontsize=12, fontweight='bold', pad=10)
ax1.set_xlabel(r'Compute $\log_{10}(\mathrm{FLOPs})$', fontsize=10)
ax1.set_ylabel('Cross-Entropy Loss $L$', fontsize=10)
ax1.set_ylim(1.5, 3.2)
ax1.grid(True)
ax1.legend(frameon=True, facecolor='#ffffff', edgecolor='#cccccc', fontsize=9)

# Marginal drop in loss
ax2.semilogy(log_c, marginal_return, color='#e76f51', lw=2.5)
ax2.set_title(r'Marginal Loss Drop per Compute unit ($|\partial L / \partial C|$)', fontsize=12, fontweight='bold', pad=10)
ax2.set_xlabel(r'Compute $\log_{10}(\mathrm{FLOPs})$', fontsize=10)
ax2.set_ylabel(r'Marginal Efficiency $|\partial L / \partial C|$ (Log Scale)', fontsize=10)
ax2.grid(True, which='both', linestyle='--', alpha=0.5)

plt.savefig(os.path.join(out_dir, 'chinchilla_power_law.png'))
plt.close()
print("Saved calibrated chinchilla_power_law.png")

# -------------------------------------------------------------
# Plot 5: The Earth's Token Ceiling
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(9, 5), dpi=300)

models = [
    'GPT-3\n(2020)',
    'Chinchilla\n(2022)',
    'LLaMA 1\n(2023)',
    'LLaMA 2\n(2023)',
    'LLaMA 3\n(2024)',
    'Frontier Model\n(2025/2026)',
    'Total High-Quality\nHuman Text (Epoch AI)'
]

tokens_trillions = [0.3, 1.4, 1.4, 2.0, 15.0, 45.0, 150.0]
colors = ['#a8dadc', '#a8dadc', '#457b9d', '#457b9d', '#1d3557', '#e76f51', '#d62828']

bars = ax.bar(models, tokens_trillions, color=colors, width=0.6, edgecolor='#333333', lw=1.2)

for bar, val in zip(bars, tokens_trillions):
    yval = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2.0, yval + 3.0, f'{val}T', ha='center', va='bottom', fontsize=9.5, fontweight='bold')

ax.axhline(150.0, color='#d62828', linestyle='--', lw=2, label='Estimated High-Quality Human Text Ceiling (~150T Tokens)')
ax.set_title('Training Tokens Ingested vs. The Planetary Data Wall', fontsize=12, fontweight='bold', pad=12)
ax.set_ylabel('Training Tokens (Trillions)', fontsize=10)
ax.set_ylim(0, 185)
ax.grid(True, axis='y')
ax.legend(loc='upper left', frameon=True, facecolor='#ffffff', edgecolor='#cccccc', fontsize=9)

plt.savefig(os.path.join(out_dir, 'human_data_ceiling.png'))
plt.close()
print("Saved human_data_ceiling.png")

# -------------------------------------------------------------
# Plot 6: Model Collapse Under Recursive Synthetic Data
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(8, 4.8), dpi=300)

x = np.linspace(-4.5, 4.5, 600)
generations = [
    (0, 1.0, '#1d3557', 'Gen 0: Ground Truth $p_0(x)$ (Rich tails, full diversity)'),
    (2, 0.75, '#457b9d', 'Gen 2: Variance shrinking'),
    (5, 0.45, '#f4a261', 'Gen 5: Tails vanish, mode collapse begins'),
    (10, 0.20, '#e76f51', 'Gen 10: Heavy degeneration'),
    (20, 0.08, '#d62828', 'Gen 20: Information Entropy Collapse $H(p_n) \\to 0$')
]

for gen, sigma, col, lab in generations:
    y = norm.pdf(x, loc=0, scale=sigma)
    ax.plot(x, y, color=col, lw=2.2, label=lab)
    ax.fill_between(x, y, color=col, alpha=0.08)

ax.set_title('Model Collapse: Distribution Degeneration Under Recursive Synthetic Training', fontsize=12, fontweight='bold', pad=12)
ax.set_xlabel('Latent Representation Space $x$', fontsize=10)
ax.set_ylabel('Probability Density $p_n(x)$', fontsize=10)
ax.set_ylim(0, 5.2)
ax.legend(loc='upper right', frameon=True, facecolor='#ffffff', edgecolor='#cccccc', fontsize=8.5)
ax.grid(True)

plt.savefig(os.path.join(out_dir, 'model_collapse_entropy.png'))
plt.close()
print("Saved model_collapse_entropy.png")

# -------------------------------------------------------------
# Plot 7: The Shift from Pretraining to Test-Time Scaling (Refined)
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(8.5, 4.8), dpi=300)

comp = np.linspace(1, 100, 200)

# Pretraining scaling: logs out and plateaus around 68%
pretrain_perf = 45 + 11.5 * np.log10(comp)
# Test-time search scaling: RLVR + MCTS / verifiers scales much steeper and overtakes
test_time_perf = 45 + 43 * (1 - np.exp(-comp/22))

ax.plot(comp, pretrain_perf, '--', color='#1d3557', lw=2.5, label='Pretraining Scaling Alone (Diminishing Return Plateau)')
ax.plot(comp, test_time_perf, '-', color='#2a9d8f', lw=3.0, label='Inference Test-Time Search & Verification (RLVR / MCTS)')

ax.set_title('The Modern Frontier: Pretraining Compute vs. Test-Time Compute', fontsize=12, fontweight='bold', pad=12)
ax.set_xlabel('Relative Compute Allocation (Multiplier)', fontsize=10)
ax.set_ylabel('Task Reasoning Accuracy (%)', fontsize=10)
ax.set_ylim(40, 95)
ax.legend(loc='lower right', frameon=True, facecolor='#ffffff', edgecolor='#cccccc', fontsize=9.5)
ax.grid(True)

plt.savefig(os.path.join(out_dir, 'paradigm_shift_test_time.png'))
plt.close()
print("Saved refined paradigm_shift_test_time.png")

# -------------------------------------------------------------
# Plot 8: Circuit Complexity & Chain of Thought Unrolling
# -------------------------------------------------------------
fig, ax = plt.subplots(figsize=(9, 4.5), dpi=300)

# Complexity hierarchy bars
classes = [r'$\mathrm{AC}^0$', r'$\mathrm{TC}^0$' + '\n(Single Forward Pass)', r'$\mathrm{NC}^1$', r'$\mathrm{L}$ (LogSpace)', r'$\mathrm{P}$' + '\n(Chain-of-Thought)']
depths = [1, 2, 3, 4, 5]
colors_c = ['#a8dadc', '#e63946', '#457b9d', '#1d3557', '#2a9d8f']

bars_c = ax.barh(classes, depths, color=colors_c, height=0.55, edgecolor='#333333', lw=1.2)

ax.text(2.1, 1, 'TRAPPED: Fixed L layers\nCannot solve parity, reachability', fontsize=9, color='#d62828', fontweight='bold', va='center')
ax.text(5.1, 4, 'UNROLLED: Depth T x L\nSimulates sequential automaton', fontsize=9, color='#2a9d8f', fontweight='bold', va='center')

ax.set_title(r'Circuit Complexity: The $\mathrm{TC}^0$ Wall vs. Chain-of-Thought Unrolling', fontsize=12, fontweight='bold', pad=12)
ax.set_xlabel('Computational Expressivity Class (Inclusion Hierarchy)', fontsize=10)
ax.set_xlim(0, 7.8)
ax.set_xticks([])
ax.grid(True, axis='x')

plt.savefig(os.path.join(out_dir, 'circuit_complexity_hierarchy.png'))
plt.close()
print("Saved circuit_complexity_hierarchy.png")
