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
    'axes.linewidth': 1.2
})

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13.0, 6.2), dpi=300)

for ax in (ax1, ax2):
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

# ==============================================================================
# Panel 1: Autoregressive Token Serialization (The Discrete Bottleneck)
# ==============================================================================
bg1 = patches.FancyBboxPatch((0.2, 0.2), 9.6, 9.6, boxstyle="round,pad=0.2",
                             fc="#fafafa", ec="#d0d0d0", lw=1.5)
ax1.add_patch(bg1)

# Header
ax1.text(5.0, 9.2, "Discrete Token Autoregression", ha='center', fontsize=13, fontweight='bold', color='#1d3557')
ax1.text(5.0, 8.65, "The Communication Protocol Fallacy (o1 / R1 / Autoregressive LLMs)", 
         ha='center', fontsize=8.5, fontstyle='italic', color='#666666')

# Step 1: Continuous State
rect_h1 = patches.FancyBboxPatch((0.8, 6.7), 2.2, 1.2, boxstyle="round,pad=0.15", fc="#e8f4f8", ec="#457b9d", lw=1.5)
ax1.add_patch(rect_h1)
ax1.text(1.9, 7.45, "Continuous State", ha='center', fontsize=9, fontweight='bold', color='#1d3557')
ax1.text(1.9, 6.95, r"$\mathbf{h}_t \in \mathbb{R}^d$", ha='center', fontsize=9.5, color='#457b9d')

# Arrow to Quantization
ax1.annotate("", xy=(3.8, 7.3), xytext=(3.1, 7.3), arrowprops=dict(arrowstyle="->", color="#e76f51", lw=2))
ax1.text(3.45, 7.55, "Vocab Proj", ha='center', fontsize=7.5, color='#e76f51', fontweight='bold')

# Step 2: Vocabulary Quantization
rect_tok = patches.FancyBboxPatch((3.9, 6.7), 2.3, 1.2, boxstyle="round,pad=0.15", fc="#fdf0ed", ec="#e76f51", lw=1.5)
ax1.add_patch(rect_tok)
ax1.text(5.05, 7.45, "Quantization Trap", ha='center', fontsize=8.5, fontweight='bold', color='#d62828')
ax1.text(5.05, 6.95, r"$\text{Softmax} \to w_t \in \mathcal{V}$", ha='center', fontsize=8.5, color='#d62828')

# Arrow to KV Cache
ax1.annotate("", xy=(7.0, 7.3), xytext=(6.3, 7.3), arrowprops=dict(arrowstyle="->", color="#1d3557", lw=2))

# Step 3: Immutable Context (KV Cache)
rect_kv = patches.FancyBboxPatch((7.1, 6.7), 2.3, 1.2, boxstyle="round,pad=0.15", fc="#f0f3f4", ec="#2b2d42", lw=1.5)
ax1.add_patch(rect_kv)
ax1.text(8.25, 7.45, "Immutable Context", ha='center', fontsize=8.5, fontweight='bold', color='#2b2d42')
ax1.text(8.25, 6.95, "Appended to KV Cache", ha='center', fontsize=7.5, color='#555555')

# The Cascade (Downward flow)
y_steps = [5.3, 3.9, 2.5]
words = ['"Step 1: Assume x > 0"', '"Step 2: Contradiction..."', '"Step 3: Justifying error..."']
styles = ['#2a9d8f', '#e76f51', '#d62828']

for i, (yst, word, col) in enumerate(zip(y_steps, words, styles)):
    box = patches.FancyBboxPatch((1.2, yst), 7.6, 0.95, boxstyle="round,pad=0.1", fc="#ffffff", ec=col, lw=1.3)
    ax1.add_patch(box)
    ax1.text(1.5, yst + 0.48, f"Token t+{i+1}:", fontsize=8.5, fontweight='bold', color=col)
    ax1.text(3.5, yst + 0.48, word, fontsize=8.5, color='#333333', fontfamily='monospace')
    
    # Draw arrow from previous
    if i == 0:
        ax1.annotate("", xy=(5.0, yst + 0.95), xytext=(5.0, 6.6), arrowprops=dict(arrowstyle="->", color="#888888", lw=1.2))
    else:
        ax1.annotate("", xy=(5.0, yst + 0.95), xytext=(5.0, y_steps[i-1]), arrowprops=dict(arrowstyle="->", color="#888888", lw=1.2))

# Red annotation: Irreversible error
ax1.annotate("Cannot Erase Context!\nMust spend tokens\nrationalizing past mistakes", 
             xy=(8.8, 3.0), xytext=(5.5, 1.1),
             fontsize=8.5, fontweight='bold', color='#d62828',
             arrowprops=dict(arrowstyle="->", color='#d62828', lw=1.5),
             bbox=dict(boxstyle="round,pad=0.3", fc="#fdf0ed", ec="#d62828", lw=1))

# Bottom Bottleneck summary
ax1.text(3.0, 0.65, r"$\bullet$ Quantization Loss: Collapsing $\mathbb{R}^d$ into 1-of-100,000 discrete tokens", fontsize=7.8, color='#333333')
ax1.text(3.0, 0.35, r"$\bullet$ Quadratic Memory Tax: $O(T^2)$ KV cache; no native execution stack", fontsize=7.8, color='#333333')


# ==============================================================================
# Panel 2: Continuous Latent Trajectory Optimization (Attractor Dynamics)
# ==============================================================================
bg2 = patches.FancyBboxPatch((0.2, 0.2), 9.6, 9.6, boxstyle="round,pad=0.2",
                             fc="#f4f9f9", ec="#2a9d8f", lw=1.5)
ax2.add_patch(bg2)

# Header
ax2.text(5.0, 9.2, "Continuous Latent Planning", ha='center', fontsize=13, fontweight='bold', color='#2a9d8f')
ax2.text(5.0, 8.65, "Attractor Dynamics, Diffusion in Thought, & JEPA", 
         ha='center', fontsize=8.5, fontstyle='italic', color='#457b9d')

# Contour / Energy landscape sketch
x_grid = np.linspace(1.0, 9.0, 100)
y_grid = np.linspace(2.5, 8.0, 100)
X, Y = np.meshgrid(x_grid, y_grid)
# Energy function with two basins
Z = np.sin(X/1.5)*np.cos(Y/1.5) + ((X-6.5)**2 + (Y-4.5)**2)/12.0

ax2.contour(X, Y, Z, levels=10, colors='#b0dcd5', alpha=0.6, linewidths=0.9)

# Continuous Trajectory in Latent Space
t_points = np.array([
    [1.8, 7.2],
    [3.0, 6.5],
    [3.8, 5.0],
    [5.0, 6.2],  # Speculative exploration
    [4.2, 4.2],  # Backtrack in continuous space!
    [5.8, 4.0],
    [7.0, 4.4]   # True Energy Minimum / Solution Basin
])

ax2.plot(t_points[:, 0], t_points[:, 1], color='#2a9d8f', lw=2.5, linestyle='-', marker='o', markersize=6, zorder=5)

# Label Start and End
ax2.scatter(t_points[0, 0], t_points[0, 1], color='#1d3557', s=90, zorder=6)
ax2.text(t_points[0, 0] - 0.2, t_points[0, 1] + 0.35, r"$\mathbf{z}_0$ (Problem State)", fontsize=8.5, fontweight='bold', color='#1d3557')

ax2.scatter(t_points[-1, 0], t_points[-1, 1], color='#e76f51', s=110, zorder=6)
ax2.text(t_points[-1, 0], t_points[-1, 1] - 0.45, r"$\mathbf{z}^*$ (Energy Minimum)", fontsize=8.5, fontweight='bold', color='#e76f51')

# Smooth relaxation arrows / backtracking
ax2.annotate("Continuous Backtracking\n(No tokens emitted,\nzero KV cache cost)", 
             xy=(4.2, 4.8), xytext=(1.8, 3.4),
             fontsize=8.2, fontweight='bold', color='#2a9d8f',
             arrowprops=dict(arrowstyle="->", color='#2a9d8f', lw=1.5),
             bbox=dict(boxstyle="round,pad=0.3", fc="#ffffff", ec="#2a9d8f", lw=1))

# Gradient arrows on landscape
ax2.annotate("", xy=(6.8, 4.5), xytext=(5.6, 4.1), arrowprops=dict(arrowstyle="->", color="#e76f51", lw=2))
ax2.text(6.0, 4.8, r"$\nabla_z \mathcal{E}(z) \to 0$", fontsize=9, fontweight='bold', color='#e76f51')

# Communication Interface at the very end
rect_comm = patches.FancyBboxPatch((5.8, 1.2), 3.6, 1.3, boxstyle="round,pad=0.15", fc="#ffffff", ec="#1d3557", lw=1.5)
ax2.add_patch(rect_comm)
ax2.annotate("", xy=(7.0, 2.5), xytext=(7.0, 3.8), arrowprops=dict(arrowstyle="->", color="#1d3557", lw=2.2))
ax2.text(7.6, 2.05, "Language Output Only At Boundary", ha='center', fontsize=8.5, fontweight='bold', color='#1d3557')
ax2.text(7.6, 1.55, r"$\mathbf{z}^* \to \text{Text Decoder} \to \text{Answer}$", ha='center', fontsize=8.2, color='#555555')

# Bottom Summary
ax2.text(0.6, 0.65, r"$\bullet$ Zero Discretization Loss: Search occurs directly in continuous manifold $\mathcal{Z}$", fontsize=7.8, color='#333333')
ax2.text(0.6, 0.35, r"$\bullet$ True Constraint Satisfaction: Bidirectional relaxation without forward bias", fontsize=7.8, color='#333333')

plt.tight_layout()
out_file = os.path.join(out_dir, "latent_planning_vs_token_serialization.png")
plt.savefig(out_file, dpi=300)
plt.close()
print(f"Successfully generated {out_file}")
