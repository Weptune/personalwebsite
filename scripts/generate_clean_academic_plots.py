import os
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import norm

out_dir = r"c:\Users\abhin\personalwebsite\src\content\maths\the-math-of-transformers"
os.makedirs(out_dir, exist_ok=True)

# Academic / Professional Publication Styling (Light / Clean Paper Aesthetic)
plt.rcParams.update({
    'font.sans-serif': ['Segoe UI', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
    'font.family': 'sans-serif',
    'figure.autolayout': True,
    'figure.facecolor': '#ffffff',
    'axes.facecolor': '#ffffff',
    'axes.edgecolor': '#334155',
    'axes.linewidth': 1.2,
    'axes.labelcolor': '#0f172a',
    'axes.labelsize': 10.5,
    'axes.titlesize': 12,
    'axes.titleweight': 'bold',
    'xtick.color': '#334155',
    'ytick.color': '#334155',
    'xtick.labelsize': 9.5,
    'ytick.labelsize': 9.5,
    'grid.color': '#e2e8f0',
    'grid.linestyle': '--',
    'grid.linewidth': 0.8,
    'grid.alpha': 0.8,
    'legend.frameon': True,
    'legend.facecolor': '#ffffff',
    'legend.edgecolor': '#cbd5e1',
    'legend.fontsize': 9,
    'text.color': '#0f172a'
})

# ==============================================================================
# Plot 1: Autoregressive Error Compounding (The Gambler's Walk)
# ==============================================================================
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11.5, 4.8), dpi=300)

steps = np.arange(1, 201)
p_vals = [0.999, 0.990, 0.980, 0.950]
colors = ['#059669', '#1d3557', '#d97706', '#dc2626']
labels = [
    r'$p = 99.9\%$ (Superhuman per step)',
    r'$p = 99.0\%$ (Near-flawless reasoning)',
    r'$p = 98.0\%$ (Strong human)',
    r'$p = 95.0\%$ (Typical LLM step)'
]

for p, col, lab in zip(p_vals, colors, labels):
    prob = (p ** steps) * 100
    ax1.plot(steps, prob, color=col, lw=2.4, label=lab)

# Highlight critical thresholds
ax1.axhline(50, color='#64748b', linestyle=':', lw=1.5, label='50% Threshold (Coin Flip)')
ax1.scatter([100], [(0.99**100)*100], color='#dc2626', s=70, zorder=6)
ax1.annotate(f'Step 100: {0.99**100*100:.1f}%\nCompound Accuracy', 
             xy=(100, (0.99**100)*100), xytext=(120, 48),
             fontsize=9, fontweight='bold', color='#dc2626',
             arrowprops=dict(arrowstyle="->", color='#dc2626', lw=1.4),
             bbox=dict(boxstyle="round,pad=0.35", fc="#fef2f2", ec="#fca5a5", lw=1))

ax1.set_title('The Gambler\'s Walk: Cumulative Reasoning Survival', pad=12)
ax1.set_xlabel('Reasoning Steps ($K$ Tokens / Deduction Chain)')
ax1.set_ylabel('Probability of Sound Reasoning Chain (%)')
ax1.set_ylim(-2, 105)
ax1.set_xlim(1, 200)
ax1.legend(loc='upper right')
ax1.grid(True)

# Panel 2: Manifold Divergence Diagram
t = np.linspace(0, 10, 150)
truth_x = t
truth_y = np.sin(t / 1.5) * 1.8

diverge_idx = 45
halluc_x = np.copy(truth_x)
halluc_y = np.copy(truth_y)
t_div = t[diverge_idx:] - t[diverge_idx]
halluc_y[diverge_idx:] = truth_y[diverge_idx] + 0.18 * (t_div ** 1.8)

ax2.plot(truth_x, truth_y, color='#059669', lw=2.8, label='Ground Truth Reasoning Manifold')
ax2.plot(halluc_x[diverge_idx:], halluc_y[diverge_idx:], '--', color='#dc2626', lw=2.4, label='Hallucinatory Trajectory (Irreversible)')

# Mark mistake
ax2.scatter(truth_x[diverge_idx], truth_y[diverge_idx], color='#dc2626', s=90, zorder=7)
ax2.annotate('Uncorrected Error at Step 35\n(Committed to KV Cache)', 
             xy=(truth_x[diverge_idx], truth_y[diverge_idx]), xytext=(0.4, 2.5),
             fontsize=8.8, fontweight='bold', color='#dc2626',
             arrowprops=dict(arrowstyle="->", color='#dc2626', lw=1.4),
             bbox=dict(boxstyle="round,pad=0.35", fc="#fef2f2", ec="#fca5a5", lw=1))

# Self-reinforcing attention arrows
for idx in [80, 110, 138]:
    ax2.annotate('', xy=(halluc_x[idx], halluc_y[idx]), 
                 xytext=(halluc_x[diverge_idx], halluc_y[diverge_idx]),
                 arrowprops=dict(arrowstyle="->", color='#d97706', lw=1.2, linestyle=':'))

ax2.text(4.8, 3.6, 'Self-Attention attends to error\nas established fact $\\to$ Rationalization', 
         fontsize=8.5, fontweight='bold', color='#b45309',
         bbox=dict(boxstyle="round,pad=0.35", fc="#fffbeb", ec="#fde68a", lw=1))

ax2.set_title('Trajectory Divergence Under Autoregression', pad=12)
ax2.set_xlabel('Deduction Sequence Progress')
ax2.set_ylabel('Latent Representation State')
ax2.set_ylim(-2.2, 4.6)
ax2.legend(loc='lower left')
ax2.grid(True)
ax2.set_xticks([])
ax2.set_yticks([])

plt.savefig(os.path.join(out_dir, 'autoregressive_error_compounding.png'), bbox_inches='tight')
plt.close()
print("Saved clean autoregressive_error_compounding.png")


# ==============================================================================
# Plot 2: The Verification Landscape (Where Test-Time Search Scales vs Collapses)
# ==============================================================================
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11.5, 4.8), dpi=300)

search_steps = np.linspace(1, 100, 200)

# Verifiable domain: exponential search efficiency
comp_perf = 20 + 75 * (1 - np.exp(-search_steps / 18))
ax1.plot(search_steps, comp_perf, color='#059669', lw=2.8, label='Math / Code (Formal Verifiers)')
ax1.axhline(95, color='#059669', linestyle='--', lw=1.5, alpha=0.6)
ax1.set_title('Verifiable Domains (Compilers & Lean 4)', pad=12)
ax1.set_xlabel('Inference Search Compute (Tokens / Candidates Explored)')
ax1.set_ylabel('Task Success Rate (%)')
ax1.set_ylim(0, 105)
ax1.grid(True)
ax1.annotate('External Compiler / Lean Verifier\nPrunes invalid trajectories deterministically', 
             xy=(55, 88), xytext=(22, 52),
             fontsize=8.8, fontweight='bold', color='#1e3a8a',
             arrowprops=dict(arrowstyle="->", color='#1e3a8a', lw=1.4),
             bbox=dict(boxstyle="round,pad=0.4", fc="#eff6ff", ec="#bfdbfe", lw=1))
ax1.legend(loc='lower right')

# Open domain: Goodhart divergence
goodhart_prm = 25 + 70 * (1 - np.exp(-search_steps / 14))  # Scored by PRM
true_ground_truth = 25 + 22 * (1 - np.exp(-search_steps / 22)) - 0.18 * (search_steps - 28) * (search_steps > 28)

ax2.plot(search_steps, goodhart_prm, '--', color='#d97706', lw=2.2, label='Apparent Score (Graded by Reward Model)')
ax2.plot(search_steps, true_ground_truth, color='#dc2626', lw=2.8, label='Actual Truth / Robustness (Human Experts)')

ax2.set_title('Open-Ended Domains (Law, Medicine, Strategy)', pad=12)
ax2.set_xlabel('Inference Search Compute (Tokens / Candidates Explored)')
ax2.set_ylabel('Quality / Grounded Veracity (%)')
ax2.set_ylim(0, 105)
ax2.grid(True)

ax2.annotate('Goodhart Divergence:\nModel exploits PRM reward heuristics\nwith articulate pseudo-reasoning', 
             xy=(72, 38), xytext=(32, 65),
             fontsize=8.8, fontweight='bold', color='#dc2626',
             arrowprops=dict(arrowstyle="->", color='#dc2626', lw=1.4),
             bbox=dict(boxstyle="round,pad=0.4", fc="#fef2f2", ec="#fca5a5", lw=1))
ax2.legend(loc='upper left')

plt.savefig(os.path.join(out_dir, 'verification_landscape.png'), bbox_inches='tight')
plt.close()
print("Saved clean verification_landscape.png")


# ==============================================================================
# Plot 3: Chinchilla Power-Law & Marginal Returns
# ==============================================================================
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11.5, 4.8), dpi=300)

log_c = np.linspace(21, 27, 200)
c_flops = 10**log_c

gamma = 0.154
E = 1.65
A_c = 1.35  # At 10^21 FLOPs, L = 1.65 + 1.35 = 3.00

loss = E + A_c * (c_flops / 1e21)**(-gamma)
# Marginal efficiency: |dL/dC|
marginal_return = gamma * A_c * (c_flops / 1e21)**(-(gamma + 1)) / (1e21)

ax1.plot(log_c, loss, color='#1d3557', lw=2.8, label=r'Cross-Entropy Loss $L(C) = E + A \cdot C^{-\gamma}$')
ax1.axhline(E, color='#dc2626', linestyle='--', lw=1.8, label=r'Irreducible Entropy Floor ($E \approx 1.65$)')
ax1.set_title('The Chinchilla Loss Asymptote', pad=12)
ax1.set_xlabel(r'Pretraining Compute $\log_{10}(\mathrm{FLOPs})$')
ax1.set_ylabel('Cross-Entropy Loss $L$')
ax1.set_ylim(1.5, 3.2)
ax1.grid(True)
ax1.legend(loc='upper right')

# Marginal drop in loss
ax2.semilogy(log_c, marginal_return, color='#d97706', lw=2.6, label=r'Marginal Efficiency $|\partial L / \partial C|$')
ax2.set_title(r'Marginal Return Collapse ($|\partial L / \partial C|$)', pad=12)
ax2.set_xlabel(r'Pretraining Compute $\log_{10}(\mathrm{FLOPs})$')
ax2.set_ylabel(r'Marginal Loss Drop per Compute FLOP (Log Scale)')
ax2.grid(True, which='both', linestyle='--', alpha=0.6)

ax2.annotate('90× to 100× Compute Multiplier\nRequired to Halve Remaining Error', 
             xy=(24.5, marginal_return[116]), xytext=(21.5, 1e-25),
             fontsize=8.8, fontweight='bold', color='#b45309',
             arrowprops=dict(arrowstyle="->", color='#b45309', lw=1.4),
             bbox=dict(boxstyle="round,pad=0.35", fc="#fffbeb", ec="#fde68a", lw=1))
ax2.legend(loc='upper right')

plt.savefig(os.path.join(out_dir, 'chinchilla_power_law.png'), bbox_inches='tight')
plt.close()
print("Saved clean chinchilla_power_law.png")


# ==============================================================================
# Plot 4: Model Collapse Under Recursive Synthetic Data
# ==============================================================================
fig, ax = plt.subplots(figsize=(8.8, 5.0), dpi=300)

x = np.linspace(-4.5, 4.5, 600)
generations = [
    (0, 1.00, '#1d3557', 'Gen 0: Ground Truth $p_0(x)$ (Rich tails, full diversity)'),
    (2, 0.75, '#457b9d', 'Gen 2: Variance shrinking'),
    (5, 0.45, '#059669', 'Gen 5: Tails vanish, mode collapse begins'),
    (10, 0.22, '#d97706', 'Gen 10: Heavy distribution degeneration'),
    (20, 0.08, '#dc2626', 'Gen 20: Information Entropy Collapse $H(p_n) \\to 0$')
]

for gen, sigma, col, lab in generations:
    y = norm.pdf(x, loc=0, scale=sigma)
    ax.plot(x, y, color=col, lw=2.4, label=lab)
    ax.fill_between(x, y, color=col, alpha=0.07)

ax.set_title('Model Collapse: Distribution Degeneration Under Recursive Training', pad=12)
ax.set_xlabel('Latent Representation Space $x$')
ax.set_ylabel('Probability Density $p_n(x)$')
ax.set_ylim(0, 5.3)
ax.legend(loc='upper right')
ax.grid(True)

plt.savefig(os.path.join(out_dir, 'model_collapse_entropy.png'), bbox_inches='tight')
plt.close()
print("Saved clean model_collapse_entropy.png")
