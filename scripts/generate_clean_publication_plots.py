import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches

out_dir = r"c:\Users\abhin\personalwebsite\src\content\maths\the-math-of-transformers"
os.makedirs(out_dir, exist_ok=True)

# Publication styling
plt.rcParams.update({
    'font.sans-serif': 'Segoe UI, Helvetica, Arial, sans-serif',
    'font.family': 'sans-serif',
    'figure.autolayout': True
})

# ==============================================================================
# 1. The Biological Reality (Language as Communication Channel)
# ==============================================================================
def create_language_protocol_plot():
    fig, ax = plt.subplots(figsize=(11.5, 4.8), dpi=300)
    ax.set_xlim(0, 11.5)
    ax.set_ylim(0, 4.8)
    ax.axis('off')

    # Card background
    card_bg = patches.FancyBboxPatch((0.2, 0.2), 11.1, 4.4, boxstyle="round,pad=0.15",
                                     fc="#f8fafc", ec="#cbd5e1", lw=1.2)
    ax.add_patch(card_bg)

    # Title
    ax.text(5.75, 4.35, "The Communication Protocol Fallacy", ha='center', fontsize=12.5, fontweight='bold', color='#0f172a')
    ax.text(5.75, 4.05, "Language is an Acoustic Compression Interface Between Brains, Not the Substrate of Thought",
            ha='center', fontsize=8.5, color='#64748b')

    # Brain A Box (Left)
    b_a = patches.FancyBboxPatch((0.5, 1.2), 3.0, 2.5, boxstyle="round,pad=0.12",
                                 fc="#ffffff", ec="#3b82f6", lw=1.5)
    ax.add_patch(b_a)
    ax.text(2.0, 3.35, "Brain A (Continuous Dynamics)", ha='center', fontsize=8.8, fontweight='bold', color='#1e3a8a')
    ax.text(2.0, 3.05, r"Latent State $\mathbf{z}_A \in \mathbb{R}^d$", ha='center', fontsize=8.2, color='#2563eb')
    
    # Internal brain bullet points
    ax.text(0.75, 2.5, "• High-dimensional neural attractors", fontsize=7.2, color='#334155')
    ax.text(0.75, 2.1, "• Continuous constraint relaxation", fontsize=7.2, color='#334155')
    ax.text(0.75, 1.7, "• Parallel counterfactual simulation", fontsize=7.2, color='#334155')
    ax.text(2.0, 1.35, "[ Reaches Internal Equilibrium ]", ha='center', fontsize=7.2, fontweight='bold', color='#059669')

    # Brain B Box (Right)
    b_b = patches.FancyBboxPatch((8.0, 1.2), 3.0, 2.5, boxstyle="round,pad=0.12",
                                 fc="#ffffff", ec="#3b82f6", lw=1.5)
    ax.add_patch(b_b)
    ax.text(9.5, 3.35, "Brain B (Continuous Dynamics)", ha='center', fontsize=8.8, fontweight='bold', color='#1e3a8a')
    ax.text(9.5, 3.05, r"Latent State $\mathbf{z}_B \in \mathbb{R}^d$", ha='center', fontsize=8.2, color='#2563eb')
    
    ax.text(8.25, 2.5, "• Decodes acoustic/text stream", fontsize=7.2, color='#334155')
    ax.text(8.25, 2.1, "• Reconstructs attractor in latent space", fontsize=7.2, color='#334155')
    ax.text(8.25, 1.7, "• Resolves ambiguity via internal priors", fontsize=7.2, color='#334155')
    ax.text(9.5, 1.35, "[ Reconstructs Mental Model ]", ha='center', fontsize=7.2, fontweight='bold', color='#059669')

    # Arrow from Brain A to Channel
    ax.annotate("", xy=(4.5, 2.45), xytext=(3.6, 2.45),
                arrowprops=dict(arrowstyle="->", color="#ef4444", lw=2.0))
    ax.text(4.05, 2.75, "Lossy\nSerialize", ha='center', fontsize=7.0, color='#b91c1c', fontweight='bold')

    # Narrow Channel (Center)
    chan = patches.FancyBboxPatch((4.6, 1.5), 2.3, 1.9, boxstyle="round,pad=0.1",
                                  fc="#fef2f2", ec="#ef4444", lw=1.4, linestyle="--")
    ax.add_patch(chan)
    ax.text(5.75, 3.05, "Narrow Channel", ha='center', fontsize=7.8, fontweight='bold', color='#991b1b')
    ax.text(5.75, 2.55, '"The apple is red"', ha='center', fontsize=8.5, fontfamily='monospace', fontweight='bold', color='#0f172a')
    ax.text(5.75, 2.05, "Bandwidth ~ 40 bits/s", ha='center', fontsize=7.2, color='#b91c1c')
    ax.text(5.75, 1.75, "(Severe Quantization)", ha='center', fontsize=6.8, fontstyle='italic', color='#7f1d1d')

    # Arrow from Channel to Brain B
    ax.annotate("", xy=(7.9, 2.45), xytext=(7.0, 2.45),
                arrowprops=dict(arrowstyle="->", color="#059669", lw=2.0))
    ax.text(7.45, 2.75, "Decode &\nIntegrate", ha='center', fontsize=7.0, color='#059669', fontweight='bold')

    # Footer banner
    footer = patches.FancyBboxPatch((0.5, 0.4), 10.5, 0.6, boxstyle="round,pad=0.08",
                                    fc="#f1f5f9", ec="#94a3b8", lw=1.0)
    ax.add_patch(footer)
    ax.text(5.75, 0.7,
            "The Category Error: LLMs treat this 40-bit/s inter-brain communication protocol as if it were the engine of thought itself.",
            ha='center', va='center', fontsize=8.0, fontweight='bold', color='#0f172a')

    plt.tight_layout()
    out_file = os.path.join(out_dir, "language_communication_protocol.png")
    plt.savefig(out_file, dpi=300)
    plt.close()
    print("Saved pixel-perfect language_communication_protocol.png")


# ==============================================================================
# 2. Latent Planning vs Token Serialization (Pixel-Perfect)
# ==============================================================================
def create_clean_latent_planning_plot():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.0, 5.8), dpi=300)

    for ax in (ax1, ax2):
        ax.set_xlim(0, 10)
        ax.set_ylim(0, 10)
        ax.axis('off')

    # ---------------- PANEL 1: Token Serialization ----------------
    p1_bg = patches.FancyBboxPatch((0.2, 0.2), 9.6, 9.6, boxstyle="round,pad=0.18",
                                   fc="#f8fafc", ec="#fca5a5", lw=1.5)
    ax1.add_patch(p1_bg)

    ax1.text(5.0, 9.3, "Discrete Token Autoregression", ha='center', fontsize=11.5, fontweight='bold', color='#991b1b')
    ax1.text(5.0, 8.9, "The Serial Quantization Trap (o1 / R1 / Autoregressive LLMs)", ha='center', fontsize=7.8, color='#64748b')

    # Step 0: Continuous to Discrete Quantization
    q_box = patches.FancyBboxPatch((0.8, 7.4), 8.4, 1.2, boxstyle="round,pad=0.12",
                                   fc="#ffffff", ec="#ef4444", lw=1.2)
    ax1.add_patch(q_box)
    ax1.text(2.2, 8.15, "Continuous Vector", ha='center', fontsize=8.0, fontweight='bold', color='#1e293b')
    ax1.text(2.2, 7.65, r"$\mathbf{h}_t \in \mathbb{R}^d$", ha='center', fontsize=8.5, color='#2563eb')

    ax1.annotate("", xy=(4.6, 7.95), xytext=(3.6, 7.95), arrowprops=dict(arrowstyle="->", color="#ef4444", lw=1.8))
    ax1.text(4.1, 8.2, "Softmax", ha='center', fontsize=7.0, color='#b91c1c', fontweight='bold')

    ax1.text(6.8, 8.15, "Discrete Token ID (Quantized)", ha='center', fontsize=8.0, fontweight='bold', color='#991b1b')
    ax1.text(6.8, 7.65, r"$w_t \in \{1, \dots, 100\text{k}\}$", ha='center', fontsize=8.5, color='#991b1b')

    # Downward arrow to sequence rollout
    ax1.annotate("", xy=(5.0, 7.08), xytext=(5.0, 7.35), arrowprops=dict(arrowstyle="->", color="#475569", lw=1.8))

    # Sequential rollout cards
    steps = [
        ('Token t+1', '"Assume x > 0"', '#059669', '#ecfdf5', 'Deduction step 1'),
        ('Token t+2', '"Contradiction at step 2..."', '#d97706', '#fffbeb', 'Uncaught error generated'),
        ('Token t+3', '"Therefore, x must be..."', '#dc2626', '#fef2f2', 'Attends to error as ground truth'),
        ('Token t+4', '"Hence proven by theorem..."', '#dc2626', '#fef2f2', 'Confident, articulate hallucination')
    ]

    y_pos = [6.0, 4.75, 3.5, 2.25]
    for i, ((label, text, stroke, fill, desc), y) in enumerate(zip(steps, y_pos)):
        card = patches.FancyBboxPatch((0.8, y), 8.4, 0.95, boxstyle="round,pad=0.1",
                                      fc=fill, ec=stroke, lw=1.2)
        ax1.add_patch(card)
        ax1.text(1.2, y + 0.48, label, fontsize=7.8, fontweight='bold', color=stroke)
        ax1.text(3.1, y + 0.48, text, fontsize=7.8, fontfamily='monospace', color='#0f172a')
        ax1.text(8.8, y + 0.48, desc, fontsize=6.8, fontstyle='italic', ha='right', color='#64748b')

        if i < len(steps) - 1:
            ax1.annotate("", xy=(5.0, y - 0.25), xytext=(5.0, y - 0.02),
                         arrowprops=dict(arrowstyle="->", color="#475569", lw=1.8))

    # Bottom takeaway box
    b_bot1 = patches.FancyBboxPatch((0.8, 0.45), 8.4, 1.45, boxstyle="round,pad=0.1",
                                    fc="#ffffff", ec="#fca5a5", lw=1.0)
    ax1.add_patch(b_bot1)
    ax1.text(5.0, 1.5, "The Architectural Penalties:", ha='center', fontsize=7.5, fontweight='bold', color='#991b1b')
    ax1.text(5.0, 1.15, "• Gradients destroyed at each token sample (zero backprop in test-time)", ha='center', fontsize=7.0, color='#334155')
    ax1.text(5.0, 0.85, "• Irreversible context: bad tokens permanently bloat O(T²) KV-cache", ha='center', fontsize=7.0, color='#334155')
    ax1.text(5.0, 0.58, "• FLOPs wasted generating grammatical filler ('Wait, let me rethink...')", ha='center', fontsize=7.0, color='#334155')


    # ---------------- PANEL 2: Continuous Latent Planning ----------------
    p2_bg = patches.FancyBboxPatch((0.2, 0.2), 9.6, 9.6, boxstyle="round,pad=0.18",
                                   fc="#f8fafc", ec="#86efac", lw=1.5)
    ax2.add_patch(p2_bg)

    ax2.text(5.0, 9.3, "Continuous Latent Planning", ha='center', fontsize=11.5, fontweight='bold', color='#166534')
    ax2.text(5.0, 8.9, "Trajectory Optimization in Latent Space (JEPA / Latent World Models)", ha='center', fontsize=7.8, color='#64748b')

    # Continuous Manifold Area
    space_box = patches.FancyBboxPatch((0.8, 4.4), 8.4, 4.2, boxstyle="round,pad=0.12",
                                       fc="#ffffff", ec="#22c55e", lw=1.2)
    ax2.add_patch(space_box)
    ax2.text(1.2, 8.25, r"Continuous State Manifold $\mathcal{Z} \subset \mathbb{R}^d$", fontsize=8.0, fontweight='bold', color='#15803d')

    # Nodes
    z_nodes = [
        (2.0, 7.3, r"$\mathbf{z}_0$", "Problem State", '#1e3a8a', 0, 0.32, 0, -0.38),
        (3.8, 6.7, r"$\mathbf{z}_1$", "Hypothesis A", '#0284c7', 0, 0.32, 0, -0.38),
        (5.8, 7.3, r"$\mathbf{z}_2$", "Dead End (Pruned)", '#dc2626', 0, 0.32, 0, -0.38),
        (5.0, 5.5, r"$\mathbf{z}_3$", "Smooth Backtrack", '#059669', -0.5, 0.0, -0.5, -0.35),
        (7.8, 5.1, r"$\mathbf{z}^*$", "Energy Minima", '#16a34a', 0, 0.32, 0, -0.38)
    ]

    for x, y, lab, desc, col, ox, oy, dx, dy in z_nodes:
        ax2.scatter(x, y, color=col, s=65, zorder=5)
        ax2.text(x + ox, y + oy, lab, fontsize=7.5, fontweight='bold', color=col, ha='center', va='center')
        ax2.text(x + dx, y + dy, desc, fontsize=6.5, color='#475569', ha='center', va='center')

    # Trajectory arrows
    ax2.annotate("", xy=(3.5, 6.8), xytext=(2.3, 7.2), arrowprops=dict(arrowstyle="->", color="#0284c7", lw=1.8))
    ax2.annotate("", xy=(5.5, 7.2), xytext=(4.1, 6.8), arrowprops=dict(arrowstyle="->", color="#dc2626", lw=1.4, linestyle="--"))
    ax2.annotate("", xy=(5.1, 5.75), xytext=(5.7, 7.0), arrowprops=dict(arrowstyle="->", color="#059669", lw=1.8))
    ax2.annotate("", xy=(7.4, 5.2), xytext=(5.3, 5.5), arrowprops=dict(arrowstyle="->", color="#16a34a", lw=2.2))

    # Badge on continuous exploration
    ax2.text(5.0, 4.65, "[ Zero token emissions during exploration: 0 words written, 0 KV cache spent ]",
             ha='center', fontsize=6.5, fontstyle='italic', color='#15803d')

    # Downward arrow to Decoder
    ax2.annotate("", xy=(5.0, 3.88), xytext=(5.0, 4.3),
                 arrowprops=dict(arrowstyle="->", color="#16a34a", lw=2.0))

    # Terminal Sequence Decoder
    dec_box = patches.FancyBboxPatch((0.8, 2.25), 8.4, 1.55, boxstyle="round,pad=0.12",
                                     fc="#f0fdf4", ec="#16a34a", lw=1.2)
    ax2.add_patch(dec_box)
    ax2.text(5.0, 3.4, "Terminal Sequence Decoder (Language as Interface Only)", ha='center', fontsize=8.0, fontweight='bold', color='#15803d')
    ax2.text(5.0, 2.9, r"$\mathbf{z}^* \longrightarrow \text{Transformer Decoder} \longrightarrow \text{Human Language Answer}$", ha='center', fontsize=7.5, color='#1e293b')
    ax2.text(5.0, 2.5, "The model decodes to natural language ONLY after the solution is found in latent space",
             ha='center', fontsize=6.8, fontstyle='italic', color='#475569')

    # Bottom takeaway box
    b_bot2 = patches.FancyBboxPatch((0.8, 0.45), 8.4, 1.45, boxstyle="round,pad=0.1",
                                    fc="#ffffff", ec="#86efac", lw=1.0)
    ax2.add_patch(b_bot2)
    ax2.text(5.0, 1.5, "The Architectural Advantages:", ha='center', fontsize=7.5, fontweight='bold', color='#166534')
    ax2.text(5.0, 1.15, "• Continuous gradient guidance: optimization relaxes directly along dE/dz -> 0", ha='center', fontsize=7.0, color='#334155')
    ax2.text(5.0, 0.85, "• Reversible exploration: pruning bad trajectories incurs zero context memory cost", ha='center', fontsize=7.0, color='#334155')
    ax2.text(5.0, 0.58, "• Language decoupled from thought: no syntax or rhetorical filler overhead", ha='center', fontsize=7.0, color='#334155')

    plt.tight_layout()
    out_file = os.path.join(out_dir, "latent_planning_vs_token_serialization.png")
    plt.savefig(out_file, dpi=300)
    plt.close()
    print("Saved pixel-perfect latent_planning_vs_token_serialization.png")


# ==============================================================================
# 3. Reversal Curse (Flawless Alignment & Balanced Proportions)
# ==============================================================================
def create_clean_reversal_curse_plot():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11.5, 4.4), dpi=300)

    for ax in (ax1, ax2):
        ax.set_xlim(0, 10)
        ax.set_ylim(0, 10)
        ax.axis('off')

    # Card 1: Relational Knowledge (Human)
    c1_bg = patches.FancyBboxPatch((0.2, 0.2), 9.6, 9.6, boxstyle="round,pad=0.18",
                                   fc="#f8fafc", ec="#93c5fd", lw=1.5)
    ax1.add_patch(c1_bg)

    ax1.text(5.0, 9.2, "Relational Knowledge Graph (Human / Causal)", ha='center', fontsize=10.5, fontweight='bold', color='#1e3a8a')
    ax1.text(5.0, 8.65, "Concepts are persistent entities connected by symmetric relational edges", ha='center', fontsize=7.2, color='#64748b')

    # Node A & B
    node_a = patches.FancyBboxPatch((1.0, 5.0), 2.5, 1.8, boxstyle="round,pad=0.12", fc="#ffffff", ec="#2563eb", lw=1.8)
    ax1.add_patch(node_a)
    ax1.text(2.25, 6.05, "Entity", ha='center', fontsize=7.0, color='#64748b')
    ax1.text(2.25, 5.5, "Daphne", ha='center', fontsize=9.0, fontweight='bold', color='#1e293b')

    node_b = patches.FancyBboxPatch((6.5, 5.0), 2.5, 1.8, boxstyle="round,pad=0.12", fc="#ffffff", ec="#2563eb", lw=1.8)
    ax1.add_patch(node_b)
    ax1.text(7.75, 6.05, "Entity", ha='center', fontsize=7.0, color='#64748b')
    ax1.text(7.75, 5.5, "Mary", ha='center', fontsize=9.0, fontweight='bold', color='#1e293b')

    # Bidirectional Arrow
    ax1.annotate("", xy=(6.3, 5.9), xytext=(3.7, 5.9),
                 arrowprops=dict(arrowstyle="<->", color="#059669", lw=2.8))
    ax1.text(5.0, 6.35, "MotherOf / DaughterOf", ha='center', fontsize=7.8, fontweight='bold', color='#059669')
    ax1.text(5.0, 5.35, "Symmetric Relational Edge", ha='center', fontsize=6.8, color='#475569')

    # Query Evaluation Card
    ev1 = patches.FancyBboxPatch((0.8, 1.0), 8.4, 3.4, boxstyle="round,pad=0.12", fc="#ffffff", ec="#cbd5e1", lw=1.0)
    ax1.add_patch(ev1)
    ax1.text(5.0, 3.95, "Bidirectional Query Invariance:", ha='center', fontsize=7.5, fontweight='bold', color='#1e293b')

    # Row 1
    ax1.text(1.2, 3.1, "Query 1: 'Who is Daphne\'s mother?'", fontsize=7.2, color='#1e293b')
    ax1.text(8.8, 3.1, "Success: 'Mary' (100%)", ha='right', fontsize=7.5, fontweight='bold', color='#059669')

    # Row 2
    ax1.text(1.2, 2.2, "Query 2: 'Who is Mary\'s daughter?'", fontsize=7.2, color='#1e293b')
    ax1.text(8.8, 2.2, "Success: 'Daphne' (100%)", ha='right', fontsize=7.5, fontweight='bold', color='#059669')

    ax1.text(5.0, 1.4, "Both queries traverse the exact same relational link in memory.",
             ha='center', fontsize=6.8, fontstyle='italic', color='#64748b')


    # Card 2: Autoregressive Sequence (The Reversal Curse)
    c2_bg = patches.FancyBboxPatch((0.2, 0.2), 9.6, 9.6, boxstyle="round,pad=0.18",
                                   fc="#f8fafc", ec="#fca5a5", lw=1.5)
    ax2.add_patch(c2_bg)

    ax2.text(5.0, 9.2, "Autoregressive Token Sequence (LLM)", ha='center', fontsize=10.5, fontweight='bold', color='#991b1b')
    ax2.text(5.0, 8.65, "Stores directional transition paths conditioned on left-to-right text", ha='center', fontsize=7.2, color='#64748b')

    # Flow 1: Trained Direction
    f1 = patches.FancyBboxPatch((0.8, 5.0), 8.4, 3.2, boxstyle="round,pad=0.12", fc="#ffffff", ec="#22c55e", lw=1.2)
    ax2.add_patch(f1)
    ax2.text(1.1, 7.6, "Trained Sequence Path (Left-to-Right):", fontsize=7.2, fontweight='bold', color='#166534')
    ax2.text(1.1, 6.7, '"Daphne\'s mother is Mary"', fontsize=8.0, fontfamily='monospace', fontweight='bold', color='#0f172a')
    ax2.text(8.8, 6.7, "P(Mary | prefix) = 99.4%", ha='right', fontsize=7.8, fontweight='bold', color='#16a34a')
    ax2.text(1.1, 5.8, "Gradient updates reinforce this exact directional token sequence.", fontsize=6.8, color='#475569')

    # Flow 2: Inverted Direction (Fails)
    f2 = patches.FancyBboxPatch((0.8, 1.0), 8.4, 3.4, boxstyle="round,pad=0.12", fc="#ffffff", ec="#ef4444", lw=1.2)
    ax2.add_patch(f2)
    ax2.text(1.1, 3.9, "Inverted Query (Zero-Shot Test):", fontsize=7.2, fontweight='bold', color='#991b1b')
    ax2.text(1.1, 3.0, '"Mary\'s daughter is [???]"', fontsize=8.0, fontfamily='monospace', fontweight='bold', color='#991b1b')
    ax2.text(8.8, 3.0, "P(Daphne | prefix) ~ 0.8%", ha='right', fontsize=7.8, fontweight='bold', color='#dc2626')
    ax2.text(5.0, 2.15, "Failure: Model hallucinates random names or claims unknown.", ha='center', fontsize=7.2, fontweight='bold', color='#dc2626')
    ax2.text(5.0, 1.45, "The reverse transition received zero gradient updates during training.",
             ha='center', fontsize=6.8, fontstyle='italic', color='#64748b')

    plt.tight_layout()
    out_file = os.path.join(out_dir, "reversal_curse_graph.png")
    plt.savefig(out_file, dpi=300)
    plt.close()
    print("Saved pixel-perfect reversal_curse_graph.png")


if __name__ == "__main__":
    create_language_protocol_plot()
    create_clean_latent_planning_plot()
    create_clean_reversal_curse_plot()
