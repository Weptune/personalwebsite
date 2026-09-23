import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

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

# =============================================================
# Plot 1: Autoregressive Error Compounding (The Gambler's Walk)
# =============================================================
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11.5, 5.0), dpi=300)

steps = np.arange(1, 201)
p_vals = [0.999, 0.99, 0.98, 0.95]
colors = ['#2a9d8f', '#1d3557', '#e76f51', '#d62828']
labels = [r'$p = 99.9\%$ (Superhuman per step)', 
          r'$p = 99.0\%$ (Near-flawless reasoning)', 
          r'$p = 98.0\%$ (Strong human)', 
          r'$p = 95.0\%$ (Typical LLM step)']

for p, col, lab in zip(p_vals, colors, labels):
    prob = p**steps
    ax1.plot(steps, prob * 100, color=col, lw=2.4, label=lab)

# Highlight critical thresholds
ax1.axhline(50, color='#666666', linestyle=':', lw=1.5, label='50% Accuracy (Coin Flip Threshold)')
ax1.scatter([100], [(0.99**100)*100], color='#d62828', s=80, zorder=6)
ax1.annotate(f'Step 100:\n{0.99**100*100:.1f}% accuracy', (100, (0.99**100)*100),
             textcoords="offset points", xytext=(15, 12), fontsize=8.5, fontweight='bold', color='#d62828')

ax1.set_title('The Gambler\'s Walk: Cumulative Reasoning Survival', fontsize=11.5, fontweight='bold', pad=10)
ax1.set_xlabel('Reasoning Steps ($K$ Tokens / Deduction Chain)', fontsize=10)
ax1.set_ylabel('Probability of Entire Chain Being Sound (%)', fontsize=10)
ax1.set_ylim(-2, 105)
ax1.set_xlim(1, 200)
ax1.legend(loc='upper right', frameon=True, facecolor='#ffffff', edgecolor='#cccccc', fontsize=8.5)
ax1.grid(True)

# Panel 2: Manifold Divergence Diagram
t = np.linspace(0, 10, 100)
truth_x = t
truth_y = np.sin(t / 1.5) * 2

# Divergent hallucination trajectory
diverge_idx = 35
halluc_x = np.copy(truth_x)
halluc_y = np.copy(truth_y)
halluc_y[diverge_idx:] = truth_y[diverge_idx] + 0.15 * (t[diverge_idx:] - t[diverge_idx])**2

ax2.plot(truth_x, truth_y, color='#2a9d8f', lw=3.0, label='Ground Truth Reasoning Manifold')
ax2.plot(halluc_x[diverge_idx:], halluc_y[diverge_idx:], '--', color='#d62828', lw=2.5, label='Hallucinatory Trajectory (Irreversible)')

# Mark mistake
ax2.scatter(truth_x[diverge_idx], truth_y[diverge_idx], color='#d62828', s=100, zorder=7)
ax2.annotate('Uncaught Error at Step 35\n(Attended as Ground Truth)', 
             (truth_x[diverge_idx], truth_y[diverge_idx]),
             textcoords="offset points", xytext=(-85, 20), fontsize=8.5, fontweight='bold', color='#d62828',
             arrowprops=dict(arrowstyle="->", color='#d62828', lw=1.5))

# Self-reinforcing attention arrows
for i in [55, 75, 90]:
    ax2.annotate('', xy=(halluc_x[i], halluc_y[i]), xytext=(halluc_x[diverge_idx], halluc_y[diverge_idx]),
                 arrowprops=dict(arrowstyle="->", color='#e76f51', lw=1.2, linestyle=':'))

ax2.text(7.5, 4.5, 'Attention reinforces\ninitial mistake', color='#e76f51', fontsize=8.5, fontweight='bold')

ax2.set_title('Trajectory Divergence Under Autoregression', fontsize=11.5, fontweight='bold', pad=10)
ax2.set_xlabel('Sequence Progress (Tokens Generated)', fontsize=10)
ax2.set_ylabel('Representation State Space', fontsize=10)
ax2.legend(loc='lower left', frameon=True, facecolor='#ffffff', edgecolor='#cccccc', fontsize=8.5)
ax2.grid(True)
ax2.set_xticks([])
ax2.set_yticks([])

plt.savefig(os.path.join(out_dir, 'autoregressive_error_compounding.png'))
plt.close()
print("Saved autoregressive_error_compounding.png")


# =============================================================
# Plot 2: The Verification Landscape (Where Test-Time Search Works vs Fails)
# =============================================================
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11.5, 4.8), dpi=300)

search_steps = np.linspace(1, 100, 200)

# Verifiable domain: exponential search efficiency
comp_perf = 20 + 75 * (1 - np.exp(-search_steps / 20))
ax1.plot(search_steps, comp_perf, color='#2a9d8f', lw=3.0, label='Math / Code (Formal Verifiers)')
ax1.axhline(95, color='#2a9d8f', linestyle='--', lw=1.5, alpha=0.7)
ax1.set_title('Verifiable Domains (Compilers & Proof Checkers)', fontsize=11.5, fontweight='bold', pad=10)
ax1.set_xlabel('Inference Search Compute (Tokens / Candidates Explored)', fontsize=10)
ax1.set_ylabel('Success Rate on Task (%)', fontsize=10)
ax1.set_ylim(0, 105)
ax1.grid(True)
ax1.annotate('External Oracle (Compiler / Lean 4)\nPrunes Bad Branches Deterministically', 
             xy=(50, 85), xytext=(20, 50),
             fontsize=8.5, fontweight='bold', color='#1d3557',
             arrowprops=dict(arrowstyle="->", color='#1d3557', lw=1.5),
             bbox=dict(boxstyle="round,pad=0.4", fc="#e8f4f8", ec="#457b9d", lw=1))
ax1.legend(loc='lower right', frameon=True, facecolor='#ffffff', edgecolor='#cccccc', fontsize=8.5)

# Open domain: Goodhart divergence
goodhart_prm = 30 + 65 * (1 - np.exp(-search_steps / 15))  # Scored by PRM
true_ground_truth = 30 + 20 * (1 - np.exp(-search_steps / 25)) - 0.15 * (search_steps - 30) * (search_steps > 30)

ax2.plot(search_steps, goodhart_prm, '--', color='#e76f51', lw=2.2, label='Apparent Score (Graded by Reward Model)')
ax2.plot(search_steps, true_ground_truth, color='#d62828', lw=3.0, label='Actual Truth / Robustness (Human Experts)')

ax2.set_title('Open-Ended Domains (Law, Medicine, Strategy)', fontsize=11.5, fontweight='bold', pad=10)
ax2.set_xlabel('Inference Search Compute (Tokens / Candidates Explored)', fontsize=10)
ax2.set_ylabel('Quality / Veracity (%)', fontsize=10)
ax2.set_ylim(0, 105)
ax2.grid(True)

ax2.annotate('Goodhart Divergence:\nModel hacks reward model with\npseudo-intellectual flattery', 
             xy=(75, 40), xytext=(35, 65),
             fontsize=8.5, fontweight='bold', color='#d62828',
             arrowprops=dict(arrowstyle="->", color='#d62828', lw=1.5),
             bbox=dict(boxstyle="round,pad=0.4", fc="#fdf0ed", ec="#e76f51", lw=1))
ax2.legend(loc='upper left', frameon=True, facecolor='#ffffff', edgecolor='#cccccc', fontsize=8.5)

plt.savefig(os.path.join(out_dir, 'verification_landscape.png'))
plt.close()
print("Saved verification_landscape.png")


# =============================================================
# Plot 3: The Reversal Curse Visualized
# =============================================================
fig, ax = plt.subplots(figsize=(8.5, 4.6), dpi=300)

ax.axis('off')

# Box 1: Causal World Model (Symmetric)
rect1 = patches.FancyBboxPatch((0.05, 0.55), 0.40, 0.38, boxstyle="round,pad=0.03", fc="#e8f4f8", ec="#457b9d", lw=1.5)
ax.add_patch(rect1)
ax.text(0.25, 0.87, "Causal World Model (Human)", ha='center', fontsize=10.5, fontweight='bold', color='#1d3557')
ax.text(0.12, 0.72, "Daphne", ha='center', va='center', fontsize=9, fontweight='bold', bbox=dict(boxstyle='circle,pad=0.3', fc='#ffffff', ec='#1d3557'))
ax.text(0.38, 0.72, "Mary", ha='center', va='center', fontsize=9, fontweight='bold', bbox=dict(boxstyle='circle,pad=0.3', fc='#ffffff', ec='#1d3557'))
ax.annotate("", xy=(0.34, 0.72), xytext=(0.16, 0.72), arrowprops=dict(arrowstyle="<->", color="#2a9d8f", lw=2.5))
ax.text(0.25, 0.76, "Mother / Daughter", ha='center', fontsize=8, color="#2a9d8f", fontweight='bold')
ax.text(0.25, 0.60, "Symmetric Relational Edge\nEqually queryable in both directions", ha='center', fontsize=8, color="#555555")

# Box 2: Transformer Autoregressive Token Manifold (Directional)
rect2 = patches.FancyBboxPatch((0.55, 0.55), 0.40, 0.38, boxstyle="round,pad=0.03", fc="#fdf0ed", ec="#e76f51", lw=1.5)
ax.add_patch(rect2)
ax.text(0.75, 0.87, "Autoregressive LLM (Reversal Curse)", ha='center', fontsize=10.5, fontweight='bold', color='#d62828')
ax.text(0.62, 0.72, "Daphne", ha='center', va='center', fontsize=9, fontweight='bold', bbox=dict(boxstyle='circle,pad=0.3', fc='#ffffff', ec='#d62828'))
ax.text(0.88, 0.72, "Mary", ha='center', va='center', fontsize=9, fontweight='bold', bbox=dict(boxstyle='circle,pad=0.3', fc='#ffffff', ec='#d62828'))
ax.annotate("", xy=(0.84, 0.74), xytext=(0.66, 0.74), arrowprops=dict(arrowstyle="->", color="#2a9d8f", lw=2.5))
ax.text(0.75, 0.78, "P(Mary | Daphne) = 99.4%", ha='center', fontsize=7.5, color="#2a9d8f", fontweight='bold')

ax.annotate("", xy=(0.66, 0.68), xytext=(0.84, 0.68), arrowprops=dict(arrowstyle="->", color="#d62828", lw=1.5, linestyle="--"))
ax.text(0.75, 0.62, "P(Daphne | Mary) = 0.8% (Fail)", ha='center', fontsize=7.5, color="#d62828", fontweight='bold')

# Comparison text at the bottom
rect3 = patches.FancyBboxPatch((0.05, 0.08), 0.90, 0.38, boxstyle="round,pad=0.03", fc="#f7f7f7", ec="#cccccc", lw=1.2)
ax.add_patch(rect3)
ax.text(0.50, 0.38, "Why the Reversal Curse Exists (Berglund et al., 2023)", ha='center', fontsize=10, fontweight='bold', color='#333333')
ax.text(0.50, 0.22, 
        "A transformer stores directional statistical transition probabilities across text sequences, not a causal model of reality.\n"
        "Even when trained on 'A is B', the reverse transition 'B is A' receives zero gradient updates unless explicitly present in the corpus.\n"
        "The model possesses surface statistical fluency without underlying relational comprehension.",
        ha='center', va='center', fontsize=8.5, color='#444444', linespacing=1.4)

ax.set_xlim(0, 1)
ax.set_ylim(0, 1)

plt.savefig(os.path.join(out_dir, 'reversal_curse_graph.png'))
plt.close()
print("Saved reversal_curse_graph.png")


# =============================================================
# Plot 4: The Hardware Lottery (Why Transformers Won Silicon)
# =============================================================
fig, ax = plt.subplots(figsize=(8.5, 4.8), dpi=300)

architectures = [
    'Transformers\n(Dense GEMM)',
    'State Space Models\n(Mamba / Linear Attn)',
    'Recurrent Networks\n(LSTMs / RWKV)',
    'Graph Neural Nets\n(Dynamic Topology)',
    'Energy-Based Models\n(Iterative Sampling)'
]

mfu = [62.5, 34.0, 18.5, 9.2, 12.0]
colors_hw = ['#1d3557', '#457b9d', '#f4a261', '#e76f51', '#d62828']

bars = ax.bar(architectures, mfu, color=colors_hw, width=0.55, edgecolor='#333333', lw=1.2)

for bar, val in zip(bars, mfu):
    yval = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2.0, yval + 1.5, f'{val:.1f}% MFU', ha='center', va='bottom', fontsize=9, fontweight='bold')

ax.set_title('The Hardware Lottery: Model FLOPs Utilization (MFU) on Modern GPUs', fontsize=11.5, fontweight='bold', pad=12)
ax.set_ylabel('Hardware Utilization / MFU (%)', fontsize=10)
ax.set_ylim(0, 75)
ax.axhline(60, color='#1d3557', linestyle='--', lw=1.2, label='Ideal Peak Systolic Utilization (>60%)')
ax.grid(True, axis='y')
ax.legend(loc='upper right', frameon=True, facecolor='#ffffff', edgecolor='#cccccc', fontsize=8.5)

ax.text(0, 12, 'Tensor Core Native:\nMatrix Multiply (GEMM)\nSaturates Silicon', ha='center', fontsize=7.5, color='#ffffff', fontweight='bold')
ax.text(1, 8, 'Memory Bandwidth\nBottlenecked', ha='center', fontsize=7.5, color='#ffffff', fontweight='bold')

plt.savefig(os.path.join(out_dir, 'hardware_lottery_comparison.png'))
plt.close()
print("Saved hardware_lottery_comparison.png")
