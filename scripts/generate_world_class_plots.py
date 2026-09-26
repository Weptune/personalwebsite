import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from scipy.stats import norm

out_dir = r"c:\Users\abhin\personalwebsite\src\content\maths\the-math-of-transformers"
os.makedirs(out_dir, exist_ok=True)

# -----------------------------------------------------------------------------
# World-Class Academic / Research Publication Styling
# -----------------------------------------------------------------------------
plt.rcParams.update({
    'font.sans-serif': ['Segoe UI', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
    'font.family': 'sans-serif',
    'figure.facecolor': '#ffffff',
    'axes.facecolor': '#ffffff',
    'axes.edgecolor': '#94a3b8',
    'axes.linewidth': 1.0,
    'axes.labelcolor': '#0f172a',
    'axes.labelsize': 10.5,
    'axes.titlesize': 12.0,
    'axes.titleweight': 'bold',
    'xtick.color': '#475569',
    'ytick.color': '#475569',
    'xtick.labelsize': 9.5,
    'ytick.labelsize': 9.5,
    'grid.color': '#f1f5f9',
    'grid.linestyle': '-',
    'grid.linewidth': 0.8,
    'legend.frameon': True,
    'legend.facecolor': '#ffffff',
    'legend.edgecolor': '#e2e8f0',
    'legend.fontsize': 9.0,
    'text.color': '#0f172a'
})

def despine(ax):
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

# ==============================================================================
# Plot 1: KV Cache Memory Wall & Quadratic Context Tax
# ==============================================================================
def generate_kv_cache_plot():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.0, 5.0), dpi=300)
    
    # ---------------- Panel 1: KV Cache Memory Wall ----------------
    tokens_k = np.linspace(1, 72, 300)
    batch_size = 4
    
    # GQA bytes per token: 4 * layers * kv_heads * head_dim
    # 8B: 32 layers * 8 heads * 128 dim * 4 bytes = 131,072 bytes (128 KB)
    # 70B: 80 layers * 8 heads * 128 dim * 4 bytes = 327,680 bytes (320 KB)
    # 405B: 126 layers * 8 heads * 128 dim * 4 bytes = 516,096 bytes (504 KB)
    bytes_8b = 32 * 8 * 128 * 4 * batch_size
    bytes_70b = 80 * 8 * 128 * 4 * batch_size
    bytes_405b = 126 * 8 * 128 * 4 * batch_size
    
    gb_8b = (tokens_k * 1024 * bytes_8b) / (1024**3)
    gb_70b = (tokens_k * 1024 * bytes_70b) / (1024**3)
    gb_405b = (tokens_k * 1024 * bytes_405b) / (1024**3)
    
    ax1.plot(tokens_k, gb_405b, color='#dc2626', lw=2.4, label='Llama 3 405B (126 Layers)')
    ax1.plot(tokens_k, gb_70b, color='#1e3a8a', lw=2.4, label='Llama 3 70B (80 Layers)')
    ax1.plot(tokens_k, gb_8b, color='#059669', lw=2.0, label='Llama 3 8B (32 Layers)')
    
    # 80 GB ceiling
    ax1.axhline(80, color='#dc2626', linestyle='--', lw=1.5, alpha=0.9, label='NVIDIA H100 VRAM Ceiling (80 GB)')
    ax1.fill_between(tokens_k, 80, 150, color='#fef2f2', alpha=0.6, zorder=0)
    ax1.text(42, 134, 'OOM Zone (Single H100 GPU)', fontsize=8.5, fontweight='bold', color='#991b1b')
    
    # Exact intersections with the 80 GB dotted line
    # 405B reaches 80 GB at: (80 * 1024^3) / bytes_405b / 1024 = 41.61k
    t_405b_sat = (80 * 1024**3) / bytes_405b / 1024
    # 70B reaches 80 GB at: (80 * 1024^3) / bytes_70b / 1024 = 65.536k
    t_70b_sat = (80 * 1024**3) / bytes_70b / 1024
    
    # Plot exact intersection points ON the dotted line
    ax1.scatter([t_405b_sat], [80.0], color='#dc2626', s=60, zorder=6)
    ax1.scatter([t_70b_sat], [80.0], color='#1e3a8a', s=60, zorder=6)
    
    # Drop-lines to x-axis
    ax1.plot([t_405b_sat, t_405b_sat], [0, 80], color='#dc2626', linestyle=':', lw=1.2, alpha=0.7)
    ax1.plot([t_70b_sat, t_70b_sat], [0, 80], color='#1e3a8a', linestyle=':', lw=1.2, alpha=0.7)
    
    # Callout annotations pointing directly to the intersection points ON the 80 GB line
    ax1.annotate(f'405B saturates 80GB VRAM\nat {t_405b_sat:.1f}k tokens',
                 xy=(t_405b_sat, 80.0), xytext=(t_405b_sat - 28, 106.0),
                 fontsize=8.5, fontweight='bold', color='#b91c1c',
                 arrowprops=dict(arrowstyle="->", color='#b91c1c', lw=1.2),
                 bbox=dict(boxstyle="round,pad=0.35", fc="#ffffff", ec="#fca5a5", lw=0.9))
                 
    ax1.annotate(f'70B saturates 80GB VRAM\nat {t_70b_sat:.1f}k tokens',
                 xy=(t_70b_sat, 80.0), xytext=(45.0, 38.0),
                 fontsize=8.5, fontweight='bold', color='#1e3a8a',
                 arrowprops=dict(arrowstyle="->", color='#1e3a8a', lw=1.2),
                 bbox=dict(boxstyle="round,pad=0.35", fc="#ffffff", ec="#bfdbfe", lw=0.9))

    ax1.set_title('KV Cache Memory Footprint (Batch Size = 4)', pad=12)
    ax1.set_xlabel('Reasoning Context Length ($T$ in Thousands of Tokens)')
    ax1.set_ylabel('KV Cache Memory Footprint (GB)')
    ax1.set_xlim(0, 72)
    ax1.set_ylim(0, 145)
    ax1.grid(True, linestyle='--', alpha=0.6)
    ax1.legend(loc='upper left', framealpha=0.95)
    despine(ax1)
    
    # ---------------- Panel 2: Quadratic Attention Compute ----------------
    t_k = np.linspace(1, 32, 200)
    t_raw = t_k * 1000
    # Cumulative FLOPs for 70B model: 2 * L * d_model * T^2
    attn_flops = (2 * 80 * 8192 * (t_raw ** 2)) / 1e12 # TFLOPs
    linear_flops = (2 * 80 * 8192 * 1024 * t_raw) / 1e12 # TFLOPs
    
    ax2.plot(t_k, attn_flops, color='#dc2626', lw=2.4, label='Transformer Autoregression: $O(T^2)$ Attention Tax')
    ax2.plot(t_k, linear_flops, color='#059669', lw=2.2, linestyle='--', label='Latent / Recurrent Planning: $O(T)$ Linear')
    ax2.fill_between(t_k, linear_flops, attn_flops, color='#fef2f2', alpha=0.5)
    
    # Annotation at 26k tokens
    idx_26 = np.argmin(np.abs(t_k - 26))
    ax2.scatter([26.0], [attn_flops[idx_26]], color='#dc2626', s=55, zorder=6)
    ax2.annotate('Quadratic Attention Penalty:\nEvery token attends across all\nprior reasoning history',
                 xy=(26.0, attn_flops[idx_26]), xytext=(7.0, 680.0),
                 fontsize=8.5, fontweight='bold', color='#991b1b',
                 arrowprops=dict(arrowstyle="->", color='#b91c1c', lw=1.2),
                 bbox=dict(boxstyle="round,pad=0.35", fc="#ffffff", ec="#fca5a5", lw=0.9))
                 
    ax2.set_title('Cumulative Attention Compute Cost vs. Reasoning Length', pad=12)
    ax2.set_xlabel('Chain-of-Thought Reasoning Length ($T$ in Thousands)')
    ax2.set_ylabel('Cumulative Attention Compute (TFLOPs)')
    ax2.set_xlim(0, 32)
    ax2.set_ylim(0, 1400)
    ax2.grid(True, linestyle='--', alpha=0.6)
    ax2.legend(loc='upper left', framealpha=0.95)
    despine(ax2)
    
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'kv_cache_memory_wall.png'), bbox_inches='tight')
    plt.close()
    print("Generated publication-grade kv_cache_memory_wall.png")

# ==============================================================================
# Plot 2: Autoregressive Error Compounding & Attention Mass Dilution
# ==============================================================================
def generate_autoregressive_compounding_plot():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.0, 5.0), dpi=300)
    
    # ---------------- Panel 1: The Gambler's Walk ----------------
    steps = np.arange(1, 201)
    p_configs = [
        (0.999, '#059669', r'$p = 99.9\%$ (Superhuman per step)'),
        (0.990, '#1e3a8a', r'$p = 99.0\%$ (Near-flawless reasoning)'),
        (0.980, '#d97706', r'$p = 98.0\%$ (Strong human baseline)'),
        (0.950, '#dc2626', r'$p = 95.0\%$ (Typical unguided LLM step)')
    ]
    
    for p, col, lab in p_configs:
        prob = (p ** steps) * 100
        ax1.plot(steps, prob, color=col, lw=2.2, label=lab)
        
    ax1.axhline(50, color='#64748b', linestyle=':', lw=1.3, label='50% Threshold (Coin Flip Odds)')
    
    # Exact point at K = 100 on p = 0.99
    p_100 = (0.99 ** 100) * 100
    ax1.scatter([100], [p_100], color='#1e3a8a', s=60, zorder=6)
    ax1.plot([100, 100], [0, p_100], color='#1e3a8a', linestyle=':', lw=1.2, alpha=0.7)
    ax1.plot([0, 100], [p_100, p_100], color='#1e3a8a', linestyle=':', lw=1.2, alpha=0.7)
    
    ax1.annotate(f'Step 100: {p_100:.1f}%\nCompound Accuracy',
                 xy=(100, p_100), xytext=(122, 52),
                 fontsize=8.5, fontweight='bold', color='#1e3a8a',
                 arrowprops=dict(arrowstyle="->", color='#1e3a8a', lw=1.2),
                 bbox=dict(boxstyle="round,pad=0.35", fc="#ffffff", ec="#bfdbfe", lw=0.9))
                 
    ax1.set_title('The Gambler\'s Walk: Cumulative Reasoning Survival', pad=12)
    ax1.set_xlabel('Deductive Reasoning Steps ($K$)')
    ax1.set_ylabel('Probability of Sound Reasoning Chain (%)')
    ax1.set_xlim(0, 200)
    ax1.set_ylim(0, 105)
    ax1.grid(True, linestyle='--', alpha=0.6)
    ax1.legend(loc='upper right', framealpha=0.95)
    despine(ax1)
    
    # ---------------- Panel 2: Attention Mass Dilution Across Context ----------------
    # Replaces child-like sine wave with rigorous Attention Entropy Dilution
    seq_tokens = np.linspace(1, 30, 200) # thousands of tokens
    
    # As speculative tokens accumulate, attention mass on active ground truth decays
    # and attention mass on discarded branches/padding grows
    active_mass = 15 + 75 / (1 + (seq_tokens / 6.0)**1.4)
    discarded_mass = 100 - active_mass
    
    ax2.plot(seq_tokens, active_mass, color='#059669', lw=2.4, label='Attention on Valid Problem Invariants & Lemmas')
    ax2.plot(seq_tokens, discarded_mass, color='#dc2626', lw=2.4, linestyle='--', label='Attention Diluted on Discarded Branches & Padding')
    ax2.fill_between(seq_tokens, 0, discarded_mass, color='#fef2f2', alpha=0.45)
    ax2.fill_between(seq_tokens, 0, active_mass, color='#ecfdf5', alpha=0.3)
    
    ax2.axhline(50, color='#64748b', linestyle=':', lw=1.2)
    
    cross_idx = np.argmin(np.abs(active_mass - discarded_mass))
    cross_t = seq_tokens[cross_idx]
    ax2.scatter([cross_t], [50.0], color='#d97706', s=60, zorder=6)
    
    ax2.annotate('Entropy Inversion Point:\nAttention mass on discarded tokens\nexceeds active reasoning focus',
                 xy=(cross_t, 50.0), xytext=(cross_t + 1.5, 84.0),
                 fontsize=8.5, fontweight='bold', color='#b45309',
                 arrowprops=dict(arrowstyle="->", color='#b45309', lw=1.2),
                 bbox=dict(boxstyle="round,pad=0.35", fc="#ffffff", ec="#fde68a", lw=0.9))
                 
    ax2.set_title('Attention Probability Mass Dilution in Extended Reasoning', pad=12)
    ax2.set_xlabel('Reasoning Sequence Length ($T$ in Thousands of Tokens)')
    ax2.set_ylabel('Attention Probability Mass Allocation (%)')
    ax2.set_xlim(1, 30)
    ax2.set_ylim(0, 105)
    ax2.grid(True, linestyle='--', alpha=0.6)
    ax2.legend(loc='center right', framealpha=0.95)
    despine(ax2)
    
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'autoregressive_error_compounding.png'), bbox_inches='tight')
    plt.close()
    print("Generated publication-grade autoregressive_error_compounding.png")

# ==============================================================================
# Plot 3: The Verification Landscape (Formal vs Open-Ended)
# ==============================================================================
def generate_verification_landscape_plot():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.0, 5.0), dpi=300)
    
    search_compute = np.linspace(1, 100, 250)
    
    # ---------------- Panel 1: Verifiable Domains (Cv << Cg) ----------------
    # Monotonic scaling with external compiler
    perf_formal = 25 + 70 * (1 - np.exp(-search_compute / 16.0))
    ax1.plot(search_compute, perf_formal, color='#059669', lw=2.6, label='Formal Systems (Lean 4, Compilers, Unit Tests)')
    ax1.axhline(95, color='#059669', linestyle='--', lw=1.3, alpha=0.7)
    
    ax1.annotate(r'Deterministic Verification ($C_v \ll C_g$):' + '\nExternal compiler deterministically prunes\ninvalid candidate trajectories',
                 xy=(55, perf_formal[137]), xytext=(20, 50),
                 fontsize=8.5, fontweight='bold', color='#047857',
                 arrowprops=dict(arrowstyle="->", color='#059669', lw=1.2),
                 bbox=dict(boxstyle="round,pad=0.35", fc="#ffffff", ec="#86efac", lw=0.9))
                 
    ax1.set_title(r'Closed-Loop Verifiable Domains ($C_v \ll C_g$)', pad=12)
    ax1.set_xlabel('Inference Search Compute (Candidate Rollouts / Tokens)')
    ax1.set_ylabel('Verified Task Success Rate (%)')
    ax1.set_xlim(0, 100)
    ax1.set_ylim(0, 105)
    ax1.grid(True, linestyle='--', alpha=0.6)
    ax1.legend(loc='lower right', framealpha=0.95)
    despine(ax1)
    
    # ---------------- Panel 2: Open-Ended Cognition (Cv >= Cg) ----------------
    # Goodhart Divergence
    apparent_score = 25 + 68 * (1 - np.exp(-search_compute / 14.0))
    # True veracity rises then collapses due to reward hacking
    true_grounded = 25 + 24 * (1 - np.exp(-search_compute / 18.0)) - 0.22 * (search_compute - 28) * (search_compute > 28)
    
    ax2.plot(search_compute, apparent_score, color='#d97706', lw=2.2, linestyle='--', label='Apparent Score (Graded by Neural Process Reward Model)')
    ax2.plot(search_compute, true_grounded, color='#dc2626', lw=2.6, label='Grounded Veracity (Evaluated by Independent Experts)')
    ax2.fill_between(search_compute, true_grounded, apparent_score, color='#fef2f2', alpha=0.55)
    
    idx_goodhart = 175 # around step 70
    ax2.annotate(r'The Goodhart Divergence ($C_v \geq C_g$):' + '\nSearch exploits neural reward heuristics,\nmaximizing persuasive style over truth',
                 xy=(search_compute[idx_goodhart], true_grounded[idx_goodhart]),
                 xytext=(28, 62),
                 fontsize=8.5, fontweight='bold', color='#991b1b',
                 arrowprops=dict(arrowstyle="->", color='#dc2626', lw=1.2),
                 bbox=dict(boxstyle="round,pad=0.35", fc="#ffffff", ec="#fca5a5", lw=0.9))
                 
    ax2.set_title(r'Open-Ended Analytical Domains ($C_v \geq C_g$)', pad=12)
    ax2.set_xlabel('Inference Search Compute (Candidate Rollouts / Tokens)')
    ax2.set_ylabel('Evaluated Quality / Veracity (%)')
    ax2.set_xlim(0, 100)
    ax2.set_ylim(0, 105)
    ax2.grid(True, linestyle='--', alpha=0.6)
    ax2.legend(loc='lower left', framealpha=0.95)
    despine(ax2)
    
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'verification_landscape.png'), bbox_inches='tight')
    plt.close()
    print("Generated publication-grade verification_landscape.png")

# ==============================================================================
# Plot 4: Chinchilla Power-Law & Marginal Return Collapse
# ==============================================================================
def generate_chinchilla_plot():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.0, 5.0), dpi=300)
    
    log_c = np.linspace(21, 27, 300)
    c_flops = 10**log_c
    
    gamma = 0.154
    E = 1.65
    A_c = 1.35
    
    loss = E + A_c * (c_flops / 1e21)**(-gamma)
    marginal_return = gamma * A_c * (c_flops / 1e21)**(-(gamma + 1)) / (1e21)
    
    # Landmark models
    models = [
        ('GPT-3 175B', 23.49, E + A_c * (10**23.49 / 1e21)**(-gamma)),
        ('Chinchilla 70B', 23.70, E + A_c * (10**23.70 / 1e21)**(-gamma)),
        ('Llama 2 70B', 24.23, E + A_c * (10**24.23 / 1e21)**(-gamma)),
        ('Llama 3 405B', 25.58, E + A_c * (10**25.58 / 1e21)**(-gamma)),
    ]
    
    ax1.plot(log_c, loss, color='#1e3a8a', lw=2.6, label=r'Cross-Entropy Loss $L(C) = E + A \cdot C^{-\gamma}$')
    ax1.axhline(E, color='#dc2626', linestyle='--', lw=1.5, alpha=0.85, label=r'Irreducible Entropy Floor ($E \approx 1.65$)')
    
    for name, lx, ly in models:
        ax1.scatter([lx], [ly], color='#1e3a8a', s=45, zorder=6)
        ax1.text(lx + 0.15, ly + 0.04, name, fontsize=8.0, color='#1e3a8a', fontweight='semibold')
        
    ax1.set_title('The Chinchilla Scaling Asymptote', pad=12)
    ax1.set_xlabel(r'Pretraining Compute $\log_{10}(\mathrm{FLOPs})$')
    ax1.set_ylabel('Cross-Entropy Loss $L$')
    ax1.set_xlim(21, 27)
    ax1.set_ylim(1.5, 3.1)
    ax1.grid(True, linestyle='--', alpha=0.6)
    ax1.legend(loc='upper right', framealpha=0.95)
    despine(ax1)
    
    # ---------------- Panel 2: Marginal Return Collapse ----------------
    ax2.semilogy(log_c, marginal_return, color='#d97706', lw=2.4, label=r'Marginal Efficiency $|\partial L / \partial C|$')
    
    # Annotate 90x to 100x multiplier
    target_idx = 175 # around log_c = 24.5
    ax2.scatter([log_c[target_idx]], [marginal_return[target_idx]], color='#d97706', s=55, zorder=6)
    ax2.annotate('The $90\\times$ to $100\\times$ Compute Tax:\nHalving remaining reducible error\nrequires $2^{1/0.154} \\approx 90\\times$ to $100\\times$ compute',
                 xy=(log_c[target_idx], marginal_return[target_idx]),
                 xytext=(21.3, 2e-27),
                 fontsize=8.5, fontweight='bold', color='#92400e',
                 arrowprops=dict(arrowstyle="->", color='#d97706', lw=1.2),
                 bbox=dict(boxstyle="round,pad=0.35", fc="#ffffff", ec="#fde68a", lw=0.9))
                 
    ax2.set_title(r'Marginal Loss Reduction Collapse ($|\partial L / \partial C|$)', pad=12)
    ax2.set_xlabel(r'Pretraining Compute $\log_{10}(\mathrm{FLOPs})$')
    ax2.set_ylabel('Marginal Loss Drop per Compute FLOP (Log Scale)')
    ax2.set_xlim(21, 27)
    ax2.grid(True, which='both', linestyle='--', alpha=0.5)
    ax2.legend(loc='upper right', framealpha=0.95)
    despine(ax2)
    
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'chinchilla_power_law.png'), bbox_inches='tight')
    plt.close()
    print("Generated publication-grade chinchilla_power_law.png")

# ==============================================================================
# Plot 5: Model Collapse Under Recursive Synthetic Data
# ==============================================================================
def generate_model_collapse_plot():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.0, 5.0), dpi=300, gridspec_kw={'width_ratios': [1.4, 1.0]})
    
    x = np.linspace(-4.5, 4.5, 600)
    generations = [
        (0, 1.00, '#0f172a', 'Gen 0: Ground Truth Human Text (Rich tails, full diversity)'),
        (2, 0.75, '#1e3a8a', 'Gen 2: Variance contraction begins'),
        (5, 0.45, '#059669', 'Gen 5: Tails vanish; rare reasoning patterns lost'),
        (10, 0.22, '#d97706', 'Gen 10: Mode collapse; severe degradation'),
        (20, 0.08, '#dc2626', 'Gen 20: Information Entropy Collapse $H(p_n) \\to 0$')
    ]
    
    for gen, sigma, col, lab in generations:
        y = norm.pdf(x, loc=0, scale=sigma)
        ax1.plot(x, y, color=col, lw=2.2, label=lab)
        ax1.fill_between(x, y, color=col, alpha=0.05)
        
    ax1.set_title('Model Collapse: Probability Density Degeneration', pad=12)
    ax1.set_xlabel('Latent Representation Space $x$')
    ax1.set_ylabel('Probability Density $p_n(x)$')
    ax1.set_xlim(-4.5, 4.5)
    ax1.set_ylim(0, 5.5)
    ax1.grid(True, linestyle='--', alpha=0.6)
    ax1.legend(loc='upper left', framealpha=0.95)
    despine(ax1)
    
    # Right panel: Information Entropy Decay H(p_n)
    gens = np.array([0, 1, 2, 3, 5, 7, 10, 15, 20])
    # H for Gaussian = 0.5 * ln(2 * pi * e * sigma^2)
    sigmas = np.array([1.0, 0.88, 0.75, 0.62, 0.45, 0.33, 0.22, 0.14, 0.08])
    entropy = 0.5 * np.log(2 * np.pi * np.e * (sigmas**2))
    
    ax2.plot(gens, entropy, color='#dc2626', marker='o', lw=2.2, markersize=5.5, label='Shannon Entropy $H(p_n)$')
    ax2.axhline(0, color='#64748b', linestyle=':', lw=1.2)
    
    ax2.annotate('Information Singularity:\nEntropy drops as distribution\ncollapses to a point mass',
                 xy=(gens[-1], entropy[-1]), xytext=(3.0, -1.05),
                 fontsize=8.5, fontweight='bold', color='#991b1b',
                 arrowprops=dict(arrowstyle="->", color='#dc2626', lw=1.2),
                 bbox=dict(boxstyle="round,pad=0.35", fc="#ffffff", ec="#fca5a5", lw=0.9))
                 
    ax2.set_title('Information Entropy Collapse Over Iterations', pad=12)
    ax2.set_xlabel('Recursive Synthetic Training Generation ($n$)')
    ax2.set_ylabel('Information Entropy $H(p_n)$')
    ax2.set_xlim(0, 21)
    ax2.set_ylim(-1.6, 1.8)
    ax2.grid(True, linestyle='--', alpha=0.6)
    ax2.legend(loc='upper right', framealpha=0.95)
    despine(ax2)
    
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'model_collapse_entropy.png'), bbox_inches='tight')
    plt.close()
    print("Generated publication-grade model_collapse_entropy.png")

# ==============================================================================
# Plot 6: Hardware Roofline Model
# ==============================================================================
def generate_roofline_plot():
    fig, ax = plt.subplots(figsize=(10.0, 5.4), dpi=300)
    
    intensities = np.logspace(-1, 3.5, 500)
    peak_compute = 989.0 # TFLOP/s FP16 on NVIDIA H100 SXM5
    peak_bandwidth = 3.35 # TB/s HBM3
    
    # Roofline boundary: min(Peak Compute, Intensity * Bandwidth)
    attainable_perf = np.minimum(peak_compute, intensities * peak_bandwidth)
    
    ridge_intensity = peak_compute / peak_bandwidth # ~295.2 FLOPs/Byte
    
    # Background shaded regions for regimes
    ax.axvspan(0.1, ridge_intensity, color='#f8fafc', alpha=0.8, zorder=0)
    ax.axvspan(ridge_intensity, 3000, color='#f0fdf4', alpha=0.45, zorder=0)
    
    ax.loglog(intensities, attainable_perf, color='#0f172a', lw=2.8, label='NVIDIA H100 SXM5 Roofline Ceiling')
    ax.axhline(peak_compute, color='#64748b', linestyle=':', lw=1.2)
    ax.axvline(ridge_intensity, color='#047857', linestyle='--', lw=1.3, alpha=0.8)
    
    ax.text(ridge_intensity * 0.92, 1.8, f'Ridge Point: {ridge_intensity:.1f} FLOPs/Byte',
            ha='right', fontsize=8.5, fontweight='bold', color='#047857')
            
    ax.text(0.15, 300, 'MEMORY-BOUND REGION\n(Bottlenecked by HBM Bandwidth)',
            fontsize=8.5, fontweight='bold', color='#b91c1c')
    ax.text(450, 1150, 'COMPUTE-BOUND REGION\n(Saturates Systolic Tensor Cores)',
            fontsize=8.5, fontweight='bold', color='#047857')
            
    # Point 1: Autoregressive Rollout (Batch 1) - EXACTLY on the sloped line
    gen_intensity = 1.0
    gen_perf = gen_intensity * peak_bandwidth # 3.35 TFLOP/s
    ax.scatter([gen_intensity], [gen_perf], color='#dc2626', s=80, zorder=6)
    ax.annotate('Autoregressive Rollout (Batch 1)\nIntensity ~ 1.0 FLOP/Byte\nAttains 3.35 TFLOP/s (0.34% Peak Compute)',
                xy=(gen_intensity, gen_perf), xytext=(0.14, 22.0),
                fontsize=8.2, fontweight='bold', color='#991b1b',
                arrowprops=dict(arrowstyle="->", color='#dc2626', lw=1.2),
                bbox=dict(boxstyle="round,pad=0.35", fc="#ffffff", ec="#fca5a5", lw=0.9))
                
    # Point 2: Associative Scans (Mamba / SSMs) - EXACTLY on the sloped line
    ssm_intensity = 16.0
    ssm_perf = ssm_intensity * peak_bandwidth # 53.6 TFLOP/s
    ax.scatter([ssm_intensity], [ssm_perf], color='#d97706', s=80, zorder=6)
    ax.annotate('Associative Scans (Mamba / SSMs)\nIntensity ~ 16 FLOPs/Byte\nAttains 53.6 TFLOP/s (5.4% Peak Compute)',
                xy=(ssm_intensity, ssm_perf), xytext=(1.8, 180.0),
                fontsize=8.2, fontweight='bold', color='#92400e',
                arrowprops=dict(arrowstyle="->", color='#d97706', lw=1.2),
                bbox=dict(boxstyle="round,pad=0.35", fc="#ffffff", ec="#fde68a", lw=0.9))
                
    # Point 3: Dense GEMMs (Transformer Pretraining) - Deep in compute-bound plateau
    gemm_intensity = 950.0
    gemm_perf = 680.0 # 68% of peak
    ax.scatter([gemm_intensity], [gemm_perf], color='#059669', s=90, zorder=6)
    
    # Drop line to x-axis for GEMM point
    ax.plot([gemm_intensity, gemm_intensity], [1.0, gemm_perf], color='#059669', linestyle=':', lw=1.2, alpha=0.7)
    
    ax.annotate('Dense GEMM (Transformer Pretraining)\nIntensity > 600 FLOPs/Byte\nAttains 680 TFLOP/s (68% Peak Hardware FLOPs)',
                xy=(gemm_intensity, gemm_perf), xytext=(120, 220.0),
                fontsize=8.2, fontweight='bold', color='#047857',
                arrowprops=dict(arrowstyle="->", color='#059669', lw=1.2),
                bbox=dict(boxstyle="round,pad=0.35", fc="#ffffff", ec="#86efac", lw=0.9))
                
    ax.set_title('The Hardware Lottery: NVIDIA H100 Roofline Analysis', pad=12)
    ax.set_xlabel('Operational Arithmetic Intensity (FLOPs / Byte of HBM Traffic)')
    ax.set_ylabel('Attainable Performance (TFLOP/s, FP16 Tensor Cores)')
    ax.set_xlim(0.1, 2500)
    ax.set_ylim(1, 1500)
    ax.grid(True, which='both', linestyle='--', alpha=0.5)
    ax.legend(loc='lower right', framealpha=0.95)
    despine(ax)
    
    plt.tight_layout()
    plt.savefig(os.path.join(out_dir, 'hardware_roofline_model.png'), bbox_inches='tight')
    plt.close()
    print("Generated publication-grade hardware_roofline_model.png")

if __name__ == '__main__':
    generate_kv_cache_plot()
    generate_autoregressive_compounding_plot()
    generate_verification_landscape_plot()
    generate_chinchilla_plot()
    generate_model_collapse_plot()
    generate_roofline_plot()
    print("All 6 publication-grade figures successfully generated!")
