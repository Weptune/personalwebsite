import os
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

out_dir = r"c:\Users\abhin\personalwebsite\src\content\maths\the-math-of-transformers"
os.makedirs(out_dir, exist_ok=True)

plt.rcParams.update({
    'font.sans-serif': ['Segoe UI', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
    'font.family': 'sans-serif',
    'figure.facecolor': '#ffffff',
    'text.color': '#0f172a'
})

# ==============================================================================
# DIAGRAM 1: The Serialized Protocol Paradox
# ==============================================================================
def generate_protocol_paradox_plot():
    fig, ax = plt.subplots(figsize=(13.5, 7.6), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Main Figure Title
    ax.text(50, 97.2, "Language as a Serialized Wire Protocol vs. The Thinking Substrate",
            ha='center', va='center', fontsize=14.5, fontweight='bold', color='#0f172a')
    ax.text(50, 93.6, "Why forcing high-dimensional constraint satisfaction into an append-only token sequence is a category error",
            ha='center', va='center', fontsize=9.5, style='italic', color='#475569')

    # -------------------------------------------------------------------------
    # PANEL A: Biological Cognition (Language as Wire Protocol)
    # -------------------------------------------------------------------------
    card_a = FancyBboxPatch((2, 50), 96, 40.5, boxstyle="round,pad=1.0,rounding_size=1.2",
                            facecolor='#f8fafc', edgecolor='#cbd5e1', linewidth=1.2, zorder=1)
    ax.add_patch(card_a)

    ax.text(4, 87.5, "A. Biological Cognition: Language as an Inter-Skull Compression Protocol",
            fontsize=11.5, fontweight='bold', color='#1e293b', zorder=3)
    ax.text(4, 84.8, "Two continuous dynamical systems separated by physical space communicating via a narrow serialized channel",
            fontsize=8.5, color='#64748b', zorder=3)

    # Mind A Box
    box_a1 = FancyBboxPatch((4, 53), 26, 29, boxstyle="round,pad=0.8,rounding_size=1.0",
                            facecolor='#ffffff', edgecolor='#3b82f6', linewidth=1.4, zorder=2)
    ax.add_patch(box_a1)
    ax.text(17, 78.5, "Mind A: Continuous Manifold", ha='center', fontsize=10.0, fontweight='bold', color='#1d4ed8', zorder=3)
    ax.text(17, 75.8, "(Internal Thinking Substrate)", ha='center', fontsize=7.8, style='italic', color='#64748b', zorder=3)

    bullet_a = (
        "• ~100 Trillion Synaptic Parameters\n"
        "• Continuous dynamical relaxation\n"
        "• High-dimensional attractor basins\n"
        "• Parallel constraint satisfaction\n"
        "• Thought is non-verbal and fluid\n"
        "• Solutions reach internal equilibria"
    )
    ax.text(5.5, 62.0, bullet_a, fontsize=7.8, color='#334155', linespacing=1.45, zorder=3)

    # Compression Arrow into Wire
    arrow_comp = FancyArrowPatch((31, 67.5), (37.5, 67.5), arrowstyle='-|>',
                                 mutation_scale=13, color='#2563eb', linewidth=2.0, zorder=3)
    ax.add_patch(arrow_comp)
    ax.text(34.25, 73.0, "Serialization &\nExtreme Compression\n(>10⁹× Bandwidth Drop)",
            ha='center', va='center', fontsize=7.2, fontweight='bold', color='#1e40af', zorder=4)

    # Physical Barrier & Serialized Wire
    wire_box = FancyBboxPatch((38.5, 55), 23, 25, boxstyle="round,pad=0.6,rounding_size=0.8",
                             facecolor='#f1f5f9', edgecolor='#94a3b8', linewidth=1.2, linestyle='--', zorder=2)
    ax.add_patch(wire_box)
    ax.text(50, 76.5, "Physical Skull Barrier", ha='center', fontsize=8.5, fontweight='bold', color='#475569', zorder=3)
    ax.text(50, 73.5, "Skulls cannot touch; internal\nmanifolds cannot couple across air",
            ha='center', fontsize=7.0, color='#64748b', linespacing=1.2, zorder=3)

    # Discrete token stream inside wire
    tokens_box = FancyBboxPatch((40, 57.5), 20, 11, boxstyle="round,pad=0.4,rounding_size=0.6",
                                facecolor='#ffffff', edgecolor='#cbd5e1', linewidth=1.0, zorder=3)
    ax.add_patch(tokens_box)
    ax.text(50, 65.0, "Narrow Acoustic Wire Protocol", ha='center', fontsize=7.5, fontweight='bold', color='#0f172a', zorder=4)
    ax.text(50, 61.2, "w₁ → w₂ → w₃ ...", ha='center', fontsize=8.5, family='monospace', fontweight='bold', color='#dc2626', zorder=4)
    ax.text(50, 58.6, "(~39 to 50 bits / second)", ha='center', fontsize=6.8, color='#64748b', zorder=4)

    # Decompression Arrow into Mind B
    arrow_decomp = FancyArrowPatch((62.5, 67.5), (69, 67.5), arrowstyle='-|>',
                                   mutation_scale=13, color='#2563eb', linewidth=2.0, zorder=3)
    ax.add_patch(arrow_decomp)
    ax.text(65.75, 73.0, "De-serialization &\nLatent Reconstruction\n(Receiver Decoding)",
            ha='center', va='center', fontsize=7.2, fontweight='bold', color='#1e40af', zorder=4)

    # Mind B Box
    box_a2 = FancyBboxPatch((70, 53), 26, 29, boxstyle="round,pad=0.8,rounding_size=1.0",
                            facecolor='#ffffff', edgecolor='#3b82f6', linewidth=1.4, zorder=2)
    ax.add_patch(box_a2)
    ax.text(83, 78.5, "Mind B: Continuous Manifold", ha='center', fontsize=10.0, fontweight='bold', color='#1d4ed8', zorder=3)
    ax.text(83, 75.8, "(Reconstructed Internal State)", ha='center', fontsize=7.8, style='italic', color='#64748b', zorder=3)

    bullet_b = (
        "• Ingests discrete sequential phonemes\n"
        "• Re-expands into internal state space\n"
        "• Reconstructs continuous attractor\n"
        "• Resolves semantic ambiguity natively\n"
        "• Internal cognition remains non-verbal\n"
        "• Coordinates collective physical action"
    )
    ax.text(71.5, 62.0, bullet_b, fontsize=7.8, color='#334155', linespacing=1.45, zorder=3)

    # -------------------------------------------------------------------------
    # PANEL B: The Autoregressive Transformer (The Category Error)
    # -------------------------------------------------------------------------
    card_b = FancyBboxPatch((2, 3), 96, 44, boxstyle="round,pad=1.0,rounding_size=1.2",
                            facecolor='#fff7ed', edgecolor='#fdba74', linewidth=1.2, zorder=1)
    ax.add_patch(card_b)

    ax.text(4, 43.5, "B. The Autoregressive Transformer: Mistaking the Wire Protocol for the Mind",
            fontsize=11.5, fontweight='bold', color='#9a3412', zorder=3)
    ax.text(4, 40.8, "Eliminates the internal continuous manifold; forces complex multi-variable reasoning directly inside the 1D wire protocol",
            fontsize=8.5, color='#7c2d12', zorder=3)

    # Left Box: Monolithic Architecture & Token Conveyor
    tf_box = FancyBboxPatch((4, 5.5), 59, 32.5, boxstyle="round,pad=0.8,rounding_size=1.0",
                            facecolor='#ffffff', edgecolor='#f97316', linewidth=1.4, zorder=2)
    ax.add_patch(tf_box)

    ax.text(6, 34.5, "Monolithic Autoregressive Formulation:   $w_{t+1} \\sim P(w_{t+1} \\mid w_1, \\dots, w_t)$",
            fontsize=9.2, fontweight='bold', color='#c2410c', zorder=3)

    # Conveyor belt of tokens
    token_xs = [6.5, 17.5, 28.5, 39.5, 50.5]
    tokens = ["Token 1", "Token 2", "Error !", "Token 4", "w_{t+1} ?"]
    sub_labels = ["Premise", "Step 1", "Flawed step", "Continues...", "Next token"]
    colors = ["#f8fafc", "#f8fafc", "#fee2e2", "#f8fafc", "#eff6ff"]
    borders = ["#94a3b8", "#94a3b8", "#ef4444", "#94a3b8", "#3b82f6"]

    for i in range(len(token_xs)):
        tbox = FancyBboxPatch((token_xs[i], 24), 9.0, 7.5, boxstyle="round,pad=0.3,rounding_size=0.5",
                              facecolor=colors[i], edgecolor=borders[i], linewidth=1.2, zorder=3)
        ax.add_patch(tbox)
        t_color = '#b91c1c' if '!' in tokens[i] else ('#1d4ed8' if '?' in tokens[i] else '#1e293b')
        t_txt = r"$w_{t+1}\ ?$" if '?' in tokens[i] else tokens[i]
        ax.text(token_xs[i] + 4.5, 28.5, t_txt, ha='center', va='center',
                fontsize=8.2, fontweight='bold', color=t_color, zorder=4)
        ax.text(token_xs[i] + 4.5, 25.5, sub_labels[i], ha='center', va='center',
                fontsize=6.8, color='#64748b', zorder=4)
        if i < len(token_xs) - 1:
            arr = FancyArrowPatch((token_xs[i] + 9.3, 27.75), (token_xs[i+1] - 0.3, 27.75),
                                  arrowstyle='-|>', mutation_scale=10, color='#94a3b8', linewidth=1.2, zorder=3)
            ax.add_patch(arr)

    # Notes under conveyor
    tf_notes = (
        "• No Separate Thinking Manifold: Cognition is strictly serialized into the emitted string.\n"
        "• Append-Only KV Cache: Discarded errors & false steps become permanent prefix history.\n"
        "• Quadratic Attention Overhead: Every new token attends over all historical mistakes $O(T^2)$.\n"
        "• Entropy Dilution: Softmax attention mass dilutes as reasoning chain length expands."
    )
    ax.text(6.0, 11.5, tf_notes, fontsize=7.6, color='#334155', linespacing=1.45, zorder=3)

    # Right Box: The Category Error Diagnosis
    diag_box = FancyBboxPatch((65, 5.5), 31, 32.5, boxstyle="round,pad=0.8,rounding_size=1.0",
                              facecolor='#ffffff', edgecolor='#ef4444', linewidth=1.4, zorder=2)
    ax.add_patch(diag_box)
    ax.text(80.5, 34.5, "The Foundational Failure Modes", ha='center', fontsize=9.8, fontweight='bold', color='#dc2626', zorder=3)

    diag_text = (
        "1. Dimensional Bottleneck:\n"
        "   High-dimensional multi-variable graphs\n"
        "   are forced through a 1D sequence keyhole.\n\n"
        "2. Absence of Error Attractors:\n"
        "   Embeddings are continuous, but lack\n"
        "   discrete topological snap-to-grid bounds.\n\n"
        "3. Verbal Backtracking Illusion:\n"
        "   Cannot pop the stack; model must write\n"
        "   apologetic tokens to 'steer' past prior errors."
    )
    ax.text(66.5, 14.5, diag_text, fontsize=7.5, color='#334155', linespacing=1.3, zorder=3)

    plt.tight_layout()
    out_path = os.path.join(out_dir, "the_serialized_protocol_paradox.png")
    plt.savefig(out_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Generated: {out_path}")

# ==============================================================================
# DIAGRAM 2: The Grounded Dual-Representation Architecture Blueprint
# ==============================================================================
def generate_dual_representation_plot():
    fig, ax = plt.subplots(figsize=(14.0, 7.6), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Main Title
    ax.text(50, 97.2, "The Grounded Dual-Representation Architecture Blueprint",
            ha='center', va='center', fontsize=14.5, fontweight='bold', color='#0f172a')
    ax.text(50, 93.6, "Decoupling continuous hypothesis exploration from discrete symbolic verification and mutable memory",
            ha='center', va='center', fontsize=9.5, style='italic', color='#475569')

    # Outer Container Frame
    frame = FancyBboxPatch((1.5, 3.0), 97, 88.0, boxstyle="round,pad=1.0,rounding_size=1.2",
                           facecolor='#ffffff', edgecolor='#cbd5e1', linewidth=1.2, zorder=1)
    ax.add_patch(frame)

    # -------------------------------------------------------------------------
    # COLUMN 1: External World & User Interface (Left)
    # -------------------------------------------------------------------------
    user_box = FancyBboxPatch((3.0, 10), 16.5, 78, boxstyle="round,pad=0.8,rounding_size=1.0",
                             facecolor='#f8fafc', edgecolor='#94a3b8', linewidth=1.2, zorder=2)
    ax.add_patch(user_box)
    ax.text(11.25, 83.5, "External World\n& User", ha='center', fontsize=10.0, fontweight='bold', color='#0f172a', zorder=3)

    # Input Box
    in_box = FancyBboxPatch((4.2, 53), 14.1, 22, boxstyle="round,pad=0.5,rounding_size=0.6",
                            facecolor='#ffffff', edgecolor='#cbd5e1', linewidth=1.0, zorder=3)
    ax.add_patch(in_box)
    ax.text(11.25, 68.0, "Natural Language\nTask / Goal", ha='center', fontsize=8.5, fontweight='bold', color='#1e293b', zorder=4)
    ax.text(11.25, 59.0, "Ambiguous, raw\nhuman specification\n(English, math, code)",
            ha='center', fontsize=7.2, color='#64748b', linespacing=1.25, zorder=4)

    # Output Box
    out_box = FancyBboxPatch((4.2, 16), 14.1, 24, boxstyle="round,pad=0.5,rounding_size=0.6",
                             facecolor='#f0fdf4', edgecolor='#86efac', linewidth=1.0, zorder=3)
    ax.add_patch(out_box)
    ax.text(11.25, 32.5, "Verified Solution\n& Clean Artifact", ha='center', fontsize=8.5, fontweight='bold', color='#166534', zorder=4)
    ax.text(11.25, 23.0, "Grammatically fluent,\nformally sound,\nexecutable result",
            ha='center', fontsize=7.2, color='#15803d', linespacing=1.25, zorder=4)

    # -------------------------------------------------------------------------
    # COLUMN 2: Tier 1: Transformer Interface Compiler
    # -------------------------------------------------------------------------
    compiler_box = FancyBboxPatch((21.5, 10), 18.0, 78, boxstyle="round,pad=0.8,rounding_size=1.0",
                                  facecolor='#faf5ff', edgecolor='#c084fc', linewidth=1.4, zorder=2)
    ax.add_patch(compiler_box)
    ax.text(30.5, 84.5, "Tier 1: Transformer", ha='center', fontsize=10.2, fontweight='bold', color='#6b21a8', zorder=3)
    ax.text(30.5, 81.8, "Interface Compiler", ha='center', fontsize=8.5, fontweight='bold', color='#7e22ce', zorder=3)

    # Ingestion Block
    ingest_box = FancyBboxPatch((23.0, 51), 15.0, 26, boxstyle="round,pad=0.5,rounding_size=0.6",
                                facecolor='#ffffff', edgecolor='#d8b4fe', linewidth=1.1, zorder=3)
    ax.add_patch(ingest_box)
    ax.text(30.5, 71.5, "Sequence Ingestion\n& Schema Parser", ha='center', fontsize=8.2, fontweight='bold', color='#581c87', zorder=4)
    ax.text(30.5, 60.5, "Translates linear\nnatural text into\ncontinuous initial\nstate $z_0 \\in \\mathcal{Z}$ and formal\ngoal predicates $\\Phi$",
            ha='center', fontsize=7.2, color='#475569', linespacing=1.3, zorder=4)

    # Decompiler Block
    decomp_box = FancyBboxPatch((23.0, 14), 15.0, 28, boxstyle="round,pad=0.5,rounding_size=0.6",
                                facecolor='#ffffff', edgecolor='#d8b4fe', linewidth=1.1, zorder=3)
    ax.add_patch(decomp_box)
    ax.text(30.5, 36.5, "Solution Decompiler\n& Explanation Engine", ha='center', fontsize=8.2, fontweight='bold', color='#581c87', zorder=4)
    ax.text(30.5, 24.5, "Translates verified\nsolution trajectory\n$z^*$ back into clear,\nfluent human language\nat the interface boundary",
            ha='center', fontsize=7.2, color='#475569', linespacing=1.3, zorder=4)

    # Arrows between World and Transformer
    arr_in = FancyArrowPatch((18.0, 64), (22.5, 64), arrowstyle='-|>',
                             mutation_scale=12, color='#7c3aed', linewidth=1.8, zorder=4)
    ax.add_patch(arr_in)
    arr_out = FancyArrowPatch((22.5, 28), (18.0, 28), arrowstyle='-|>',
                              mutation_scale=12, color='#16a34a', linewidth=1.8, zorder=4)
    ax.add_patch(arr_out)

    # -------------------------------------------------------------------------
    # COLUMN 3: Tier 2 & Tier 3 (Continuous Latent + Discrete Symbolic)
    # -------------------------------------------------------------------------
    # Tier 2: Continuous Latent Exploration (Top)
    latent_box = FancyBboxPatch((41.5, 51), 30.0, 37, boxstyle="round,pad=0.8,rounding_size=1.0",
                                facecolor='#eff6ff', edgecolor='#60a5fa', linewidth=1.4, zorder=2)
    ax.add_patch(latent_box)
    ax.text(56.5, 83.5, "Tier 2: Continuous Latent Exploration", ha='center', fontsize=10.0, fontweight='bold', color='#1e40af', zorder=3)
    ax.text(56.5, 80.5, "High-Dimensional Dynamical Manifold (Z)", ha='center', fontsize=8.2, color='#2563eb', zorder=3)

    latent_desc = (
        "• Differentiable Energy Relaxation: $\\nabla_z \\mathcal{E}(z; \\Phi) \\to 0$\n"
        "• Multi-Trajectory Latent Diffusion / Speculation\n"
        "• Reversible, smooth hypothesis adjustments\n"
        "• Parallel constraint satisfaction in vector space\n"
        "• Explores plans without premature token collapse\n"
        "• Zero quadratic $O(T^2)$ attention tax on thoughts"
    )
    ax.text(42.8, 60.5, latent_desc, fontsize=7.4, color='#1e293b', linespacing=1.45, zorder=3)

    # Arrow from Ingestion to Continuous Latent
    arr_to_latent = FancyArrowPatch((38.5, 64), (41.0, 64), arrowstyle='-|>',
                                    mutation_scale=12, color='#2563eb', linewidth=1.8, zorder=4)
    ax.add_patch(arr_to_latent)
    ax.text(39.75, 66.5, "$z_0, \\Phi$", ha='center', fontsize=7.5, fontweight='bold', color='#1d4ed8', zorder=4)

    # Tier 3: Discrete Symbolic Checkpoints (Bottom)
    sym_box = FancyBboxPatch((41.5, 10), 30.0, 34, boxstyle="round,pad=0.8,rounding_size=1.0",
                             facecolor='#fefce8', edgecolor='#facc15', linewidth=1.4, zorder=2)
    ax.add_patch(sym_box)
    ax.text(56.5, 39.5, "Tier 3: Discrete Symbolic Checkpoints", ha='center', fontsize=10.0, fontweight='bold', color='#854d0e', zorder=3)
    ax.text(56.5, 36.5, "Topological Snap-to-Grid Attractors", ha='center', fontsize=8.2, color='#a16207', zorder=3)

    sym_desc = (
        "• External Grounded Oracles: Formal Proofs (Lean 4),\n"
        "  Compilers (Rust/Clang), Typed Unit Tests, SAT\n"
        "• Projects continuous state $z$ to discrete checks $\\Pi(z)$\n"
        "• Eliminates Analog Noise Drift: Purges cumulative\n"
        "  continuous drift with rigorous Boolean boundaries\n"
        "• Objective Oracles: Immune to Goodhart reward hacking"
    )
    ax.text(42.8, 18.5, sym_desc, fontsize=7.4, color='#1e293b', linespacing=1.4, zorder=3)

    # Vertical Projection & Error Correction between Tier 2 & Tier 3
    arr_proj = FancyArrowPatch((51.5, 50.5), (51.5, 44.5), arrowstyle='-|>',
                              mutation_scale=11, color='#d97706', linewidth=1.6, zorder=4)
    ax.add_patch(arr_proj)
    ax.text(49.0, 47.5, "Project $z$", ha='right', va='center', fontsize=7.2, fontweight='bold', color='#b45309', zorder=4)

    arr_snap = FancyArrowPatch((61.5, 44.5), (61.5, 50.5), arrowstyle='-|>',
                               mutation_scale=11, color='#059669', linewidth=1.6, zorder=4)
    ax.add_patch(arr_snap)
    ax.text(64.0, 47.5, "Snap to Grid", ha='left', va='center', fontsize=7.2, fontweight='bold', color='#047857', zorder=4)

    # -------------------------------------------------------------------------
    # COLUMN 4: Tier 4: Mutable Execution Stack & Garbage Collector (Right)
    # -------------------------------------------------------------------------
    stack_box = FancyBboxPatch((75.0, 10), 22.5, 78, boxstyle="round,pad=0.8,rounding_size=1.0",
                               facecolor='#f0fdf4', edgecolor='#4ade80', linewidth=1.4, zorder=2)
    ax.add_patch(stack_box)
    ax.text(86.25, 84.5, "Tier 4: Mutable Stack", ha='center', fontsize=10.2, fontweight='bold', color='#166534', zorder=3)
    ax.text(86.25, 81.8, "True State Revocation & GC", ha='center', fontsize=8.5, fontweight='bold', color='#15803d', zorder=3)

    # Stack Graphic Frames
    frame_y = [68, 58, 48, 38]
    frame_names = ["[Frame 4: Candidate Search]", "[Frame 3: Sub-proof Lemma B]", "[Frame 2: Verified Lemma A]", "[Frame 1: Problem Invariants]"]
    frame_status = ["FAILED (Trigger Pop)", "VALID (Verified)", "VALID (Verified)", "IMMUTABLE ROOT"]
    frame_fcolors = ["#fee2e2", "#f0fdf4", "#f0fdf4", "#e2e8f0"]
    frame_ecolors = ["#ef4444", "#22c55e", "#22c55e", "#64748b"]
    frame_tcolors = ["#b91c1c", "#15803d", "#15803d", "#334155"]

    for i in range(4):
        fbox = FancyBboxPatch((76.2, frame_y[i]), 20.0, 7.5, boxstyle="round,pad=0.3,rounding_size=0.5",
                              facecolor=frame_fcolors[i], edgecolor=frame_ecolors[i], linewidth=1.1, zorder=3)
        ax.add_patch(fbox)
        ax.text(86.2, frame_y[i] + 4.6, frame_names[i], ha='center', fontsize=7.2, fontweight='bold', color=frame_tcolors[i], zorder=4)
        ax.text(86.2, frame_y[i] + 1.8, frame_status[i], ha='center', fontsize=6.5, color=frame_tcolors[i], zorder=4)

    # O(1) Pop Callout inside Tier 4
    pop_box = FancyBboxPatch((76.2, 13), 20.0, 21, boxstyle="round,pad=0.4,rounding_size=0.6",
                             facecolor='#ffffff', edgecolor='#cbd5e1', linewidth=1.0, zorder=3)
    ax.add_patch(pop_box)
    ax.text(86.2, 29.5, "$O(1)$ Stack Pop & Reclaim:", ha='center', fontsize=7.6, fontweight='bold', color='#dc2626', zorder=4)
    pop_notes = (
        "• On check failure: Frame 4 is\n"
        "  immediately popped & freed.\n"
        "• Prior valid state restored.\n"
        "• Discarded dead ends never\n"
        "  pollute working memory.\n"
        "• Solves Attention Dilution."
    )
    ax.text(77.2, 16.0, pop_notes, fontsize=6.8, color='#334155', linespacing=1.3, zorder=4)

    # Arrow from Tier 3 to Tier 4 Check Outcome with clean spacing
    arr_check = FancyArrowPatch((71.8, 25.5), (74.6, 25.5), arrowstyle='-|>',
                                mutation_scale=11, color='#b45309', linewidth=1.6, zorder=4)
    ax.add_patch(arr_check)
    ax.text(73.2, 28.2, "Check\nSignal", ha='center', va='bottom', fontsize=6.5, fontweight='bold', color='#92400e', linespacing=1.1, zorder=4)

    # Return Verified Solution Path from Stack back to Decompiler (Under Tier 3!)
    ax.plot([86.2, 86.2, 30.5, 30.5], [10.0, 5.5, 5.5, 13.5], color='#16a34a', linestyle='--', linewidth=1.8, zorder=4)
    arr_final = FancyArrowPatch((30.5, 11.5), (30.5, 13.5), arrowstyle='-|>',
                                mutation_scale=12, color='#16a34a', linewidth=1.8, zorder=5)
    ax.add_patch(arr_final)

    # Clean label on the bottom corridor
    ax.text(58.0, 5.5, "Verified Trajectory $z^*$ Routed to Solution Decompiler",
            ha='center', va='center', fontsize=7.6, fontweight='bold', color='#15803d',
            bbox=dict(boxstyle="round,pad=0.3", fc="#ffffff", ec="#86efac", lw=0.9), zorder=5)

    plt.tight_layout()
    out_path = os.path.join(out_dir, "dual_representation_architecture.png")
    plt.savefig(out_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Generated: {out_path}")

if __name__ == "__main__":
    generate_protocol_paradox_plot()
    generate_dual_representation_plot()
