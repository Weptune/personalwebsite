import os
import time
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By

out_dir = r"c:\Users\abhin\personalwebsite\src\content\maths\the-math-of-transformers"
os.makedirs(out_dir, exist_ok=True)

# ==============================================================================
# 0. Shared Selenium Renderer for Architectural Infographics
# ==============================================================================
def render_html_element(html_content, output_path, element_id="canvas", width=1280, height=900, dpr=2):
    opts = Options()
    opts.add_argument('--headless')
    opts.add_argument('--disable-gpu')
    opts.add_argument(f'--force-device-scale-factor={dpr}')
    opts.add_argument('--hide-scrollbars')
    
    driver = webdriver.Edge(options=opts)
    temp_html = os.path.abspath(f"scripts/temp_render_{int(time.time()*1000)}.html")
    try:
        with open(temp_html, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        driver.set_window_size(width, height)
        driver.get(f"file:///{temp_html}")
        time.sleep(0.6)
        
        el = driver.find_element(By.ID, element_id)
        el.screenshot(output_path)
        print(f"Rendered infographic: {output_path}")
    finally:
        driver.quit()
        if os.path.exists(temp_html):
            os.remove(temp_html)


# ==============================================================================
# FIGURE 1: The Communication Protocol Fallacy
# ==============================================================================
def generate_figure_1():
    html = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: transparent; padding: 10px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  #canvas {
    width: 1040px;
    background: #090d16;
    border: 1.5px solid #1e293b;
    border-radius: 18px;
    padding: 36px 40px 38px;
    color: #f1f5f9;
    position: relative;
    overflow: hidden;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
  }
  #canvas::before {
    content: "";
    position: absolute;
    top: -100px; left: 15%; width: 700px; height: 320px;
    background: radial-gradient(ellipse, rgba(56, 189, 248, 0.12), transparent 70%);
    pointer-events: none;
  }
  .header { text-align: center; margin-bottom: 28px; position: relative; z-index: 2; }
  .header h1 { font-size: 29px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; margin-bottom: 6px; }
  .header p { font-size: 16px; color: #94a3b8; }

  .pipeline {
    display: flex; align-items: stretch; justify-content: space-between; gap: 16px;
    position: relative; z-index: 2; margin-bottom: 26px;
  }
  .card {
    flex: 1; background: #101623; border: 1.5px solid #1e3a8a; border-radius: 14px;
    padding: 24px 22px; display: flex; flex-direction: column; justify-content: space-between;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4); min-height: 250px;
  }
  .card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .card-icon {
    width: 32px; height: 32px; border-radius: 8px; background: rgba(56, 189, 248, 0.18);
    display: flex; align-items: center; justify-content: center; font-size: 17px; color: #38bdf8;
  }
  .card-title { font-size: 20px; font-weight: 800; color: #38bdf8; }
  .card-sub { font-size: 14px; color: #7dd3fc; font-family: "JetBrains Mono", Consolas, monospace; margin-bottom: 14px; font-weight: 600; }
  .card-list { list-style: none; font-size: 15px; color: #e2e8f0; line-height: 1.6; }
  .card-list li { margin-bottom: 8px; display: flex; align-items: flex-start; gap: 8px; }
  .card-list li::before { content: "•"; color: #38bdf8; font-size: 18px; line-height: 1; }
  .card-badge {
    align-self: flex-start; margin-top: 14px; background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; font-size: 12px; font-weight: 800;
    padding: 6px 14px; border-radius: 6px; letter-spacing: 0.05em; text-transform: uppercase;
  }

  .connector { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
  .connector-arrow { width: 34px; height: 22px; }
  .connector-label { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
  .red { color: #f43f5e; } .green { color: #34d399; }

  .channel-box {
    width: 240px; background: #1c1119; border: 2px dashed #f43f5e; border-radius: 14px;
    padding: 20px 14px; text-align: center; box-shadow: 0 0 25px rgba(244, 63, 94, 0.15);
    display: flex; flex-direction: column; justify-content: center;
  }
  .channel-tag { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #fb7185; margin-bottom: 8px; }
  .channel-quote {
    font-family: "JetBrains Mono", Consolas, monospace; font-size: 16px; font-weight: 700;
    color: #ffffff; background: #0f070e; border: 1px solid rgba(244, 63, 94, 0.3);
    padding: 8px 10px; border-radius: 8px; margin-bottom: 8px;
  }
  .channel-speed { font-size: 15px; font-weight: 800; color: #fca5a5; }
  .channel-sub { font-size: 12px; color: #94a3b8; margin-top: 3px; font-style: italic; }

  .footer-banner {
    background: #101623; border: 1px solid #1e293b; border-radius: 10px;
    padding: 16px 22px; text-align: center; position: relative; z-index: 2;
  }
  .footer-banner p { font-size: 15px; line-height: 1.5; color: #e2e8f0; }
  .footer-banner strong { color: #38bdf8; }
  .footer-banner em { color: #fb7185; font-style: normal; font-weight: 700; }
</style>
</head>
<body>
  <div id="canvas">
    <div class="header">
      <h1>The Communication Protocol Fallacy</h1>
      <p>Language is an acoustic compression channel between biological minds, not the substrate of thought</p>
    </div>

    <div class="pipeline">
      <!-- Mind A -->
      <div class="card">
        <div>
          <div class="card-top">
            <div class="card-icon">⚡</div>
            <div class="card-title">Mind A (Internal Cognition)</div>
          </div>
          <div class="card-sub">Latent State z_A ∈ ℝ^d</div>
          <ul class="card-list">
            <li>Continuous neural attractors</li>
            <li>Parallel constraint relaxation</li>
            <li>High-dimensional simulation</li>
          </ul>
        </div>
        <div class="card-badge">Dynamic Equilibrium</div>
      </div>

      <!-- Connector A -->
      <div class="connector">
        <span class="connector-label red">Serialize</span>
        <svg class="connector-arrow" viewBox="0 0 34 22" fill="none">
          <path d="M4 11H28M28 11L18 3M28 11L18 19" stroke="#f43f5e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="connector-label red">Lossy</span>
      </div>

      <!-- Channel -->
      <div class="channel-box">
        <div class="channel-tag">Narrow Acoustic Channel</div>
        <div class="channel-quote">"The apple is red"</div>
        <div class="channel-speed">~40 bits / second</div>
        <div class="channel-sub">(Severe Quantization Bottleneck)</div>
      </div>

      <!-- Connector B -->
      <div class="connector">
        <span class="connector-label green">Decode</span>
        <svg class="connector-arrow" viewBox="0 0 34 22" fill="none">
          <path d="M4 11H28M28 11L18 3M28 11L18 19" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="connector-label green">Priors</span>
      </div>

      <!-- Mind B -->
      <div class="card">
        <div>
          <div class="card-top">
            <div class="card-icon">⚡</div>
            <div class="card-title">Mind B (Internal Cognition)</div>
          </div>
          <div class="card-sub">Latent State z_B ∈ ℝ^d</div>
          <ul class="card-list">
            <li>Decodes serialized acoustic symbols</li>
            <li>Reconstructs attractor landscape</li>
            <li>Resolves ambiguity via internal priors</li>
          </ul>
        </div>
        <div class="card-badge">Reconstructed State</div>
      </div>
    </div>

    <div class="footer-banner">
      <p><strong>The Category Error:</strong> Autoregressive LLMs mistake the <em>40-bit/s inter-agent communication protocol</em> for the internal computational engine of thought itself.</p>
    </div>
  </div>
</body>
</html>
"""
    out_file = os.path.join(out_dir, "language_communication_protocol.png")
    render_html_element(html, out_file, element_id="canvas", width=1280, height=850, dpr=2)


# ==============================================================================
# FIGURE 2: Discrete Token Autoregression vs Continuous Latent Planning
# ==============================================================================
def generate_figure_2():
    html = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: transparent; padding: 10px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  #canvas {
    width: 1080px;
    background: #090d16;
    border: 1.5px solid #1e293b;
    border-radius: 18px;
    padding: 34px 38px 40px;
    color: #f1f5f9;
    position: relative;
    overflow: hidden;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
  }
  .header { text-align: center; margin-bottom: 24px; }
  .header h1 { font-size: 29px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; margin-bottom: 6px; }
  .header p { font-size: 16px; color: #94a3b8; }

  .columns { display: flex; gap: 20px; align-items: stretch; margin-bottom: 24px; }
  
  /* Column 1: Discrete Autoregression */
  .col-discrete {
    flex: 1; background: #141018; border: 1.5px solid #881337; border-radius: 14px;
    padding: 22px 20px; display: flex; flex-direction: column; justify-content: space-between;
    box-shadow: 0 8px 25px rgba(244, 63, 94, 0.08);
  }
  .col-title-red { font-size: 20px; font-weight: 800; color: #fb7185; margin-bottom: 4px; }
  .col-sub { font-size: 13px; color: #94a3b8; margin-bottom: 16px; }

  .step-box {
    background: #1c1420; border: 1px solid rgba(244, 63, 94, 0.35); border-radius: 8px;
    padding: 10px 14px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;
  }
  .step-label { font-size: 13px; font-weight: 700; color: #fb7185; }
  .step-text { font-family: "JetBrains Mono", Consolas, monospace; font-size: 13px; color: #ffffff; }
  .step-note { font-size: 11px; color: #fca5a5; font-style: italic; }

  .down-arrow { text-align: center; font-size: 13px; color: #f43f5e; margin: -4px 0 6px; font-weight: 800; }

  /* Column 2: Continuous Latent Planning */
  .col-latent {
    flex: 1; background: #0c1815; border: 1.5px solid #065f46; border-radius: 14px;
    padding: 22px 20px; display: flex; flex-direction: column; justify-content: space-between;
    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.08);
  }
  .col-title-green { font-size: 20px; font-weight: 800; color: #34d399; margin-bottom: 4px; }

  .latent-diagram {
    background: #091310; border: 1.5px solid rgba(16, 185, 129, 0.35); border-radius: 10px;
    padding: 16px; margin-bottom: 14px; position: relative; height: 185px;
  }
  .latent-title { font-size: 13px; font-weight: 700; color: #34d399; margin-bottom: 10px; }

  .decoder-box {
    background: #13241b; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 8px;
    padding: 12px 14px; text-align: center;
  }
  .decoder-tag { font-size: 12px; font-weight: 700; color: #34d399; text-transform: uppercase; margin-bottom: 4px; }
  .decoder-formula { font-family: "JetBrains Mono", Consolas, monospace; font-size: 13px; color: #ffffff; }

  /* Comparison takeaway footer */
  .footer-row { display: flex; gap: 20px; }
  .footer-box-red {
    flex: 1; background: #1c1420; border: 1.5px solid #881337; border-radius: 10px;
    padding: 16px 20px; font-size: 14px; color: #fca5a5; line-height: 1.5;
  }
  .footer-box-red strong { color: #f43f5e; font-size: 15px; display: block; margin-bottom: 4px; }
  
  .footer-box-green {
    flex: 1; background: #0c1815; border: 1.5px solid #065f46; border-radius: 10px;
    padding: 16px 20px; font-size: 14px; color: #a7f3d0; line-height: 1.5;
  }
  .footer-box-green strong { color: #34d399; font-size: 15px; display: block; margin-bottom: 4px; }
</style>
</head>
<body>
  <div id="canvas">
    <div class="header">
      <h1>Discrete Token Autoregression vs. Continuous Latent Planning</h1>
      <p>Serial quantization into vocabulary tokens vs. trajectory optimization directly on representation manifolds</p>
    </div>

    <div class="columns">
      <!-- Left: Discrete Token Autoregression -->
      <div class="col-discrete">
        <div>
          <div class="col-title-red">Discrete Token Autoregression</div>
          <div class="col-sub">The Serial Quantization Trap (o1 / R1 / Autoregressive LLMs)</div>

          <!-- Discretization Step -->
          <div class="step-box" style="border-color: #f43f5e; background: #26121a;">
            <span class="step-label">Continuous Vector h_t</span>
            <span style="color: #fb7185; font-weight: bold;">-- Softmax --></span>
            <span class="step-text" style="color: #fca5a5;">Token w_t ∈ {1...100k}</span>
          </div>
          <div class="down-arrow">▼ Gradients destroyed; irreversible token committed to KV cache</div>

          <div class="step-box">
            <span class="step-label">Token t+1</span>
            <span class="step-text">"Assume x &gt; 0"</span>
            <span class="step-note">Deductive premise</span>
          </div>
          <div class="down-arrow">▼</div>

          <div class="step-box" style="border-color: #eab308; background: #241d10;">
            <span class="step-label" style="color: #facc15;">Token t+2</span>
            <span class="step-text">"Contradiction at step 2..."</span>
            <span class="step-note" style="color: #fde047;">Uncaught error generated</span>
          </div>
          <div class="down-arrow">▼ Attention attends to error as ground truth</div>

          <div class="step-box" style="border-color: #f43f5e; background: #26121a;">
            <span class="step-label">Token t+3</span>
            <span class="step-text">"Therefore, x must be..."</span>
            <span class="step-note">Cannot backtrack; must rationalize</span>
          </div>
          <div class="down-arrow">▼</div>

          <div class="step-box" style="border-color: #f43f5e; background: #26121a;">
            <span class="step-label">Token t+4</span>
            <span class="step-text">"Hence proved by lemma..."</span>
            <span class="step-note">Confident hallucination</span>
          </div>
        </div>
      </div>

      <!-- Right: Continuous Latent Planning -->
      <div class="col-latent">
        <div>
          <div class="col-title-green">Continuous Latent Planning</div>
          <div class="col-sub">Trajectory Optimization in Latent Space (JEPA / Latent World Models)</div>

          <!-- SVG Continuous Manifold -->
          <div class="latent-diagram">
            <div class="latent-title">Continuous State Manifold Z ⊂ ℝ^d</div>
            <svg width="100%" height="135" viewBox="0 0 440 135" fill="none">
              <!-- Manifold curve contour lines -->
              <path d="M 20 110 Q 150 20, 280 90 T 420 40" stroke="rgba(16, 185, 129, 0.15)" stroke-width="20" stroke-linecap="round" fill="none"/>
              <path d="M 30 110 Q 160 30, 280 95 T 410 45" stroke="rgba(16, 185, 129, 0.25)" stroke-width="2" stroke-dasharray="4 4" fill="none"/>

              <!-- Valid trajectory arrow z0 -> z1 -->
              <path d="M 50 95 Q 110 50, 150 65" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" fill="none"/>
              <polygon points="150,65 140,61 143,69" fill="#38bdf8"/>

              <!-- Pruned trajectory z1 -> z2 (Dead end) -->
              <path d="M 150 65 Q 210 20, 250 35" stroke="#f43f5e" stroke-width="2.5" stroke-dasharray="4 4" fill="none"/>
              <circle cx="250" cy="35" r="7" fill="#f43f5e"/>
              <text x="250" y="20" fill="#fca5a5" font-size="11" font-weight="bold" text-anchor="middle">z_2 (Dead End - Pruned)</text>

              <!-- Reversible gradient backtrack z1 -> z3 -->
              <path d="M 150 65 Q 200 95, 270 90" stroke="#34d399" stroke-width="3" stroke-linecap="round" fill="none"/>
              <polygon points="270,90 260,86 262,94" fill="#34d399"/>
              <text x="220" y="112" fill="#86efac" font-size="11" font-weight="bold" text-anchor="middle">Smooth Gradient Backtrack</text>

              <!-- Solution trajectory z3 -> z* -->
              <path d="M 270 90 Q 340 85, 385 50" stroke="#34d399" stroke-width="3.5" stroke-linecap="round" fill="none"/>
              <polygon points="385,50 375,54 380,44" fill="#34d399"/>

              <!-- Nodes -->
              <circle cx="50" cy="95" r="8" fill="#38bdf8"/>
              <text x="50" y="118" fill="#38bdf8" font-size="12" font-weight="bold" text-anchor="middle">z_0 (Start)</text>

              <circle cx="150" cy="65" r="8" fill="#38bdf8"/>
              <text x="150" y="52" fill="#7dd3fc" font-size="11" font-weight="bold" text-anchor="middle">z_1</text>

              <circle cx="270" cy="90" r="8" fill="#34d399"/>
              <text x="270" y="76" fill="#86efac" font-size="11" font-weight="bold" text-anchor="middle">z_3</text>

              <circle cx="385" cy="50" r="10" fill="#10b981" stroke="#34d399" stroke-width="3"/>
              <text x="385" y="32" fill="#34d399" font-size="13" font-weight="bold" text-anchor="middle">z* (Minima)</text>
            </svg>
            <div style="text-align: center; font-size: 11px; color: #34d399; font-weight: 600; margin-top: 4px;">
              [ Zero tokens emitted • Zero KV cache wasted during internal search ]
            </div>
          </div>

          <!-- Terminal Sequence Decoder -->
          <div class="decoder-box">
            <div class="decoder-tag">Terminal Sequence Decoder (Output Boundary Only)</div>
            <div class="decoder-formula">z* ──> Transformer Decoder ──> Human Language Answer</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
              Language is emitted ONLY after the solution is found in latent space
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Takeaways Footer -->
    <div class="footer-row">
      <div class="footer-box-red">
        <strong>The Discrete Penalty:</strong>
        Sampling discrete tokens obliterates test-time gradient flow. Mistakes permanently pollute the O(T²) KV-cache, forcing subsequent tokens to rationalize false premises rather than backtrack.
      </div>
      <div class="footer-box-green">
        <strong>The Continuous Advantage:</strong>
        Optimization relaxes directly along energy gradients (∇E → 0). Pruning dead ends incurs zero memory or token overhead because exploration remains in fluid latent space.
      </div>
    </div>
  </div>
</body>
</html>
"""
    out_file = os.path.join(out_dir, "latent_planning_vs_token_serialization.png")
    render_html_element(html, out_file, element_id="canvas", width=1280, height=900, dpr=2)


# ==============================================================================
# FIGURE 3: The Reversal Curse: Relational Graphs vs Directional Tokens
# ==============================================================================
def generate_figure_3():
    html = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: transparent; padding: 10px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  #canvas {
    width: 1040px;
    background: #090d16;
    border: 1.5px solid #1e293b;
    border-radius: 18px;
    padding: 34px 38px 38px;
    color: #f1f5f9;
    position: relative;
    overflow: hidden;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
  }
  .header { text-align: center; margin-bottom: 26px; }
  .header h1 { font-size: 29px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; margin-bottom: 6px; }
  .header p { font-size: 16px; color: #94a3b8; }

  .columns { display: flex; gap: 20px; align-items: stretch; margin-bottom: 24px; }

  /* Left: Human Relational Knowledge */
  .col-human {
    flex: 1; background: #0f172a; border: 1.5px solid #1e40af; border-radius: 14px;
    padding: 22px 20px; display: flex; flex-direction: column; justify-content: space-between;
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.08);
  }
  .title-blue { font-size: 19px; font-weight: 800; color: #38bdf8; margin-bottom: 4px; }
  .sub-text { font-size: 13px; color: #94a3b8; margin-bottom: 16px; }

  /* Graph visualization */
  .graph-container {
    background: #0b1120; border: 1px solid #1e293b; border-radius: 10px;
    padding: 16px 14px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;
  }
  .entity-node {
    background: #1e293b; border: 1.5px solid #38bdf8; border-radius: 10px;
    padding: 10px 18px; text-align: center; box-shadow: 0 0 15px rgba(56, 189, 248, 0.15);
  }
  .entity-tag { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 2px; }
  .entity-name { font-size: 18px; font-weight: 800; color: #ffffff; }

  .edge-middle { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; padding: 0 10px; }
  .edge-label { font-size: 12px; font-weight: 800; color: #34d399; text-transform: uppercase; letter-spacing: 0.04em; }
  .edge-arrow { width: 100%; height: 22px; }

  /* Query results */
  .query-card {
    background: #0b1120; border: 1px solid #1e293b; border-radius: 10px; padding: 14px 16px;
  }
  .query-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; }
  .query-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 14px; }
  .query-q { color: #f1f5f9; font-weight: 500; }
  .query-ans-green { color: #34d399; font-weight: 800; }

  /* Right: LLM Directional Token Sequence */
  .col-llm {
    flex: 1; background: #180e15; border: 1.5px solid #9f1239; border-radius: 14px;
    padding: 22px 20px; display: flex; flex-direction: column; justify-content: space-between;
    box-shadow: 0 8px 25px rgba(244, 63, 94, 0.08);
  }
  .title-red { font-size: 19px; font-weight: 800; color: #fb7185; margin-bottom: 4px; }

  .seq-card {
    background: #11080e; border: 1px solid rgba(244, 63, 94, 0.3); border-radius: 10px;
    padding: 14px 16px; margin-bottom: 12px;
  }
  .seq-label { font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
  .seq-text {
    font-family: "JetBrains Mono", Consolas, monospace; font-size: 14px; font-weight: 700;
    color: #ffffff; background: rgba(0, 0, 0, 0.4); padding: 8px 10px; border-radius: 6px; margin-bottom: 6px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .seq-prob { font-size: 13px; font-weight: 800; }

  .footer-row { display: flex; gap: 20px; }
  .footer-box-blue {
    flex: 1; background: #0f172a; border: 1.5px solid #1e3a8a; border-radius: 10px;
    padding: 16px 20px; font-size: 14px; color: #93c5fd; line-height: 1.5;
  }
  .footer-box-blue strong { color: #38bdf8; font-size: 15px; display: block; margin-bottom: 4px; }

  .footer-box-red {
    flex: 1; background: #180e15; border: 1.5px solid #881337; border-radius: 10px;
    padding: 16px 20px; font-size: 14px; color: #fca5a5; line-height: 1.5;
  }
  .footer-box-red strong { color: #fb7185; font-size: 15px; display: block; margin-bottom: 4px; }
</style>
</head>
<body>
  <div id="canvas">
    <div class="header">
      <h1>The Reversal Curse: Symmetric Graphs vs. Directional Sequences</h1>
      <p>Why autoregressive sequence models fail to generalize in reverse without explicit bidirectional training</p>
    </div>

    <div class="columns">
      <!-- Left: Human / Relational Knowledge -->
      <div class="col-human">
        <div>
          <div class="title-blue">Relational Knowledge Graph (Human / Causal)</div>
          <div class="sub-text">Persistent conceptual entities linked by invariant symmetric relations</div>

          <!-- Graph -->
          <div class="graph-container">
            <div class="entity-node">
              <div class="entity-tag">Entity</div>
              <div class="entity-name">Daphne</div>
            </div>

            <div class="edge-middle">
              <div class="edge-label">MotherOf / DaughterOf</div>
              <svg class="edge-arrow" viewBox="0 0 100 20" fill="none">
                <path d="M5 10H95M5 10L15 4M5 10L15 16M95 10L85 4M95 10L85 16" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <div style="font-size: 10px; color: #94a3b8;">Symmetric Invariant Link</div>
            </div>

            <div class="entity-node">
              <div class="entity-tag">Entity</div>
              <div class="entity-name">Mary</div>
            </div>
          </div>

          <!-- Query evaluation -->
          <div class="query-card">
            <div class="query-title">Bidirectional Query Invariance</div>
            <div class="query-row">
              <span class="query-q">Query 1: "Who is Daphne's mother?"</span>
              <span class="query-ans-green">✓ "Mary" (100%)</span>
            </div>
            <div class="query-row">
              <span class="query-q">Query 2: "Who is Mary's daughter?"</span>
              <span class="query-ans-green">✓ "Daphne" (100%)</span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 6px; font-style: italic;">
              Both queries traverse the exact same relational link in memory.
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Autoregressive Token Sequence -->
      <div class="col-llm">
        <div>
          <div class="title-red">Autoregressive Token Sequence (LLM)</div>
          <div class="sub-text">Conditional transition probabilities conditioned strictly on left-to-right text</div>

          <!-- Forward Trained Path -->
          <div class="seq-card" style="border-color: rgba(16, 185, 129, 0.4); background: #0b1712;">
            <div class="seq-label" style="color: #34d399;">Trained Sequence Path (Left-to-Right):</div>
            <div class="seq-text">
              <span>"Daphne's mother is Mary"</span>
              <span class="seq-prob" style="color: #34d399;">P = 99.4%</span>
            </div>
            <div style="font-size: 11px; color: #94a3b8;">
              Gradient descent strongly reinforces this exact directional transition.
            </div>
          </div>

          <!-- Reverse Inversion -->
          <div class="seq-card" style="border-color: rgba(244, 63, 94, 0.5); background: #220d14;">
            <div class="seq-label" style="color: #fb7185;">Inverted Query (Zero-Shot Test):</div>
            <div class="seq-text">
              <span style="color: #fca5a5;">"Mary's daughter is [???]"</span>
              <span class="seq-prob" style="color: #f43f5e;">P ~ 0.8%</span>
            </div>
            <div style="font-size: 11px; color: #fca5a5; font-weight: bold; margin-top: 4px;">
              ✕ Failure: Model hallucinates random names or claims unknown.
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; font-style: italic;">
              The reverse transition received zero gradient updates during training.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footers -->
    <div class="footer-row">
      <div class="footer-box-blue">
        <strong>The Relational Mind:</strong>
        Biological and formal cognition represents facts as persistent entities connected by invariant relations that can be traversed from any direction with identical ease.
      </div>
      <div class="footer-box-red">
        <strong>The Sequence Trap:</strong>
        The transformer does not represent entities; it represents directed statistical trajectories across tokens. If the prompt inverts the sequence, the model's conditional probability collapses.
      </div>
    </div>
  </div>
</body>
</html>
"""
    out_file = os.path.join(out_dir, "reversal_curse_graph.png")
    render_html_element(html, out_file, element_id="canvas", width=1280, height=850, dpr=2)


# ==============================================================================
# Matplotlib Config for Quantitative Dataviz (Figures 4 - 9)
# ==============================================================================
BG_CANVAS = "#090d16"
BG_CARD = "#101623"
BORDER_COLOR = "#1e293b"
TEXT_MAIN = "#ffffff"
TEXT_MUTED = "#94a3b8"
ACCENT_BLUE = "#38bdf8"
ACCENT_GREEN = "#34d399"
ACCENT_RED = "#f43f5e"
ACCENT_AMBER = "#fbbf24"

plt.rcParams.update({
    'font.sans-serif': 'Segoe UI, Helvetica, Arial, sans-serif',
    'font.family': 'sans-serif',
    'text.color': TEXT_MAIN,
    'axes.labelcolor': TEXT_MAIN,
    'axes.edgecolor': BORDER_COLOR,
    'xtick.color': TEXT_MUTED,
    'ytick.color': TEXT_MUTED,
    'figure.facecolor': BG_CANVAS,
    'axes.facecolor': BG_CARD,
    'grid.color': '#1a2333',
    'grid.linestyle': '--',
    'grid.alpha': 0.7,
})


# ==============================================================================
# FIGURE 4: Autoregressive Error Compounding & Trajectory Divergence
# ==============================================================================
def generate_figure_4():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.0, 5.4), dpi=300)
    fig.patch.set_facecolor(BG_CANVAS)

    # Subplot 1: The Gambler's Walk (Cumulative Reasoning Survival)
    ax1.set_facecolor(BG_CARD)
    K = np.linspace(1, 200, 300)
    
    p999 = (0.999 ** K) * 100
    p990 = (0.990 ** K) * 100
    p980 = (0.980 ** K) * 100
    p950 = (0.950 ** K) * 100

    ax1.plot(K, p999, color=ACCENT_GREEN, lw=3.2, label="p = 99.9% (Superhuman per-step)")
    ax1.plot(K, p990, color=ACCENT_BLUE, lw=3.2, label="p = 99.0% (Near-flawless reasoning)")
    ax1.plot(K, p980, color=ACCENT_AMBER, lw=2.6, label="p = 98.0% (Strong human)")
    ax1.plot(K, p950, color=ACCENT_RED, lw=3.2, label="p = 95.0% (Typical LLM step)")

    ax1.axhline(50, color=TEXT_MUTED, ls=':', lw=2.0, label="50% Accuracy (Coin Flip Threshold)")
    
    # Mark step 100 for p=99%
    ax1.scatter([100], [0.99**100 * 100], color=ACCENT_RED, s=100, zorder=5)
    ax1.annotate("Step 100:\n36.6% accuracy", xy=(100, 36.6), xytext=(112, 48),
                 color=ACCENT_RED, fontsize=11, fontweight='bold',
                 arrowprops=dict(arrowstyle="->", color=ACCENT_RED, lw=2.2))

    ax1.set_title("The Gambler's Walk: Cumulative Reasoning Survival", fontsize=13, fontweight='bold', pad=14, color=TEXT_MAIN)
    ax1.set_xlabel("Reasoning Steps (K Deductive Tokens)", fontsize=11, fontweight='bold', labelpad=8)
    ax1.set_ylabel("Probability of Chain Soundness (%)", fontsize=11, fontweight='bold', labelpad=8)
    ax1.set_xlim(1, 200)
    ax1.set_ylim(-2, 105)
    ax1.grid(True)
    ax1.legend(loc="upper right", framealpha=0.9, facecolor="#090d16", edgecolor=BORDER_COLOR, fontsize=9.5)

    # Subplot 2: Trajectory Divergence in State Space
    ax2.set_facecolor(BG_CARD)
    x = np.linspace(0, 100, 200)
    ground_truth = np.sin(x / 14.0) * 35.0 + 40.0
    ax2.plot(x, ground_truth, color=ACCENT_GREEN, lw=3.6, label="Ground-Truth Reasoning Manifold")

    # Divergence starting at step 35
    split_idx = 70
    x_split = x[split_idx]
    y_split = ground_truth[split_idx]

    x_err = np.linspace(x_split, 100, 130)
    err_traj = y_split + 0.018 * (x_err - x_split)**2.1
    ax2.plot(x_err, err_traj, color=ACCENT_RED, lw=3.6, ls='--', label="Hallucinatory Trajectory (Irreversible)")

    # Multiple branching lines
    for factor in [0.012, 0.024]:
        branch = y_split + factor * (x_err - x_split)**2.0
        ax2.plot(x_err, branch, color=ACCENT_RED, lw=1.2, ls=':', alpha=0.5)

    ax2.scatter([x_split], [y_split], color=ACCENT_RED, s=120, zorder=6)
    
    # Place error callout safely above without hitting y-axis
    ax2.annotate("Uncaught Error at Step 35\n(Attended as Ground Truth)",
                 xy=(x_split, y_split), xytext=(x_split - 20, y_split + 22),
                 color=ACCENT_RED, fontsize=10.5, fontweight='bold',
                 arrowprops=dict(arrowstyle="->", color=ACCENT_RED, lw=2.2))

    ax2.annotate("Attention heads reinforce\ninitial mistake as fact", xy=(88, 80), xytext=(66, 75),
                 color="#fca5a5", fontsize=10, fontstyle='italic')

    ax2.set_title("Trajectory Divergence Under Autoregression", fontsize=13, fontweight='bold', pad=14, color=TEXT_MAIN)
    ax2.set_xlabel("Sequence Progress (Tokens Generated)", fontsize=11, fontweight='bold', labelpad=8)
    ax2.set_ylabel("Representation State Space", fontsize=11, fontweight='bold', labelpad=8)
    ax2.set_xticks([])
    ax2.set_yticks([])
    ax2.legend(loc="lower left", framealpha=0.9, facecolor="#090d16", edgecolor=BORDER_COLOR, fontsize=9.5)

    plt.tight_layout()
    out_file = os.path.join(out_dir, "autoregressive_error_compounding.png")
    plt.savefig(out_file, dpi=300, facecolor=BG_CANVAS)
    plt.close()
    print("Rendered: autoregressive_error_compounding.png")


# ==============================================================================
# FIGURE 5: The Verification Landscape (Verifiable vs Open-Ended)
# ==============================================================================
def generate_figure_5():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.0, 5.2), dpi=300)
    fig.patch.set_facecolor(BG_CANVAS)

    # Panel 1: Verifiable Domains
    ax1.set_facecolor(BG_CARD)
    search_compute = np.linspace(1, 100, 150)
    verifiable_acc = 22.0 + 73.0 * (1.0 - np.exp(-search_compute / 22.0))

    ax1.plot(search_compute, verifiable_acc, color=ACCENT_GREEN, lw=3.8, label="Math / Code (Formal Verifiers)")
    ax1.axhline(95, color=ACCENT_GREEN, ls='--', lw=1.6, alpha=0.6)
    
    # Callout
    ax1.annotate("External Oracle (Compiler / Lean 4)\nPrunes False Branches Deterministically",
                 xy=(50, 85), xytext=(15, 52),
                 color=ACCENT_BLUE, fontsize=10.5, fontweight='bold',
                 bbox=dict(boxstyle="round,pad=0.5", fc="#09131d", ec=ACCENT_BLUE, lw=1.2),
                 arrowprops=dict(arrowstyle="->", color=ACCENT_BLUE, lw=2.0))

    ax1.set_title("Verifiable Domains (Compilers & Proof Checkers)", fontsize=12.5, fontweight='bold', pad=14)
    ax1.set_xlabel("Inference Search Compute (Tokens / Candidates Explored)", fontsize=10.5, fontweight='bold', labelpad=8)
    ax1.set_ylabel("Success Rate on Task (%)", fontsize=10.5, fontweight='bold', labelpad=8)
    ax1.set_xlim(0, 100)
    ax1.set_ylim(0, 105)
    ax1.grid(True)
    ax1.legend(loc="lower right", facecolor="#090d16", edgecolor=BORDER_COLOR, fontsize=10)

    # Panel 2: Open-Ended Domains
    ax2.set_facecolor(BG_CARD)
    apparent_score = 30.0 + 65.0 * (1.0 - np.exp(-search_compute / 18.0))
    true_quality = 30.0 + 16.0 * (1.0 - np.exp(-search_compute / 14.0)) - 0.12 * (search_compute - 30.0).clip(min=0)

    ax2.plot(search_compute, apparent_score, color=ACCENT_AMBER, lw=3.2, ls='--', label="Apparent Score (Graded by Reward Model)")
    ax2.plot(search_compute, true_quality, color=ACCENT_RED, lw=3.8, label="Actual Truth / Robustness (Human Experts)")

    ax2.annotate("Goodhart Divergence:\nModel hacks reward model with\npseudo-intellectual flattery",
                 xy=(75, 42), xytext=(35, 68),
                 color=ACCENT_RED, fontsize=10.5, fontweight='bold',
                 bbox=dict(boxstyle="round,pad=0.5", fc="#200d14", ec=ACCENT_RED, lw=1.2),
                 arrowprops=dict(arrowstyle="->", color=ACCENT_RED, lw=2.0))

    ax2.set_title("Open-Ended Domains (Law, Medicine, Strategy)", fontsize=12.5, fontweight='bold', pad=14)
    ax2.set_xlabel("Inference Search Compute (Tokens / Candidates Explored)", fontsize=10.5, fontweight='bold', labelpad=8)
    ax2.set_ylabel("Quality / Veracity (%)", fontsize=10.5, fontweight='bold', labelpad=8)
    ax2.set_xlim(0, 100)
    ax2.set_ylim(0, 105)
    ax2.grid(True)
    ax2.legend(loc="upper left", facecolor="#090d16", edgecolor=BORDER_COLOR, fontsize=9.5)

    plt.tight_layout()
    out_file = os.path.join(out_dir, "verification_landscape.png")
    plt.savefig(out_file, dpi=300, facecolor=BG_CANVAS)
    plt.close()
    print("Rendered: verification_landscape.png")


# ==============================================================================
# FIGURE 6: Chinchilla Power-Law Asymptote and Marginal Efficiency
# ==============================================================================
def generate_figure_6():
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.0, 5.0), dpi=300)
    fig.patch.set_facecolor(BG_CANVAS)

    # Compute range log10: 21 to 27 FLOPs
    log_c = np.linspace(21, 27, 200)
    C = 10.0**log_c
    
    # Properly calibrated Chinchilla parameters:
    # L(C) = E + A * C^(-gamma), gamma = 0.154, E = 1.65
    # At C = 10^21, L = 3.00 => A * (10^21)^(-0.154) = 1.35 => A = 1.35 * 10^(21*0.154) = 2315
    E = 1.65
    gamma = 0.154
    A = 1.35 * (10.0**(21.0 * gamma))
    L = E + A * (C**(-gamma))

    # Panel 1: Loss flattening
    ax1.set_facecolor(BG_CARD)
    ax1.plot(log_c, L, color=ACCENT_BLUE, lw=3.8, label=r"Cross-Entropy Loss $L(C) = E + A \cdot C^{-\gamma}$")
    ax1.axhline(E, color=ACCENT_RED, ls='--', lw=2.5, label=f"Irreducible Loss Floor (E ≈ {E})")
    
    ax1.set_title("The Chinchilla Loss Asymptote", fontsize=13, fontweight='bold', pad=14)
    ax1.set_xlabel(r"Compute $\log_{10}$ (FLOPs)", fontsize=11, fontweight='bold', labelpad=8)
    ax1.set_ylabel("Cross-Entropy Loss L", fontsize=11, fontweight='bold', labelpad=8)
    ax1.set_xlim(21, 27)
    ax1.set_ylim(1.5, 3.2)
    ax1.grid(True)
    ax1.legend(loc="upper right", facecolor="#090d16", edgecolor=BORDER_COLOR, fontsize=10)

    # Panel 2: Marginal Return per FLOP (derivative)
    ax2.set_facecolor(BG_CARD)
    dL_dC = gamma * A * (C**(-gamma - 1.0))
    ax2.semilogy(log_c, dL_dC, color=ACCENT_AMBER, lw=3.8)

    ax2.set_title(r"Marginal Loss Drop per Compute Unit $(|\partial L / \partial C|)$", fontsize=13, fontweight='bold', pad=14)
    ax2.set_xlabel(r"Compute $\log_{10}$ (FLOPs)", fontsize=11, fontweight='bold', labelpad=8)
    ax2.set_ylabel(r"Marginal Efficiency $|\partial L / \partial C|$ (Log Scale)", fontsize=11, fontweight='bold', labelpad=8)
    ax2.set_xlim(21, 27)
    ax2.grid(True, which="both")

    plt.tight_layout()
    out_file = os.path.join(out_dir, "chinchilla_power_law.png")
    plt.savefig(out_file, dpi=300, facecolor=BG_CANVAS)
    plt.close()
    print("Rendered: chinchilla_power_law.png")


# ==============================================================================
# FIGURE 7: Training Tokens vs The Planetary Data Wall
# ==============================================================================
def generate_figure_7():
    fig, ax = plt.subplots(figsize=(10.5, 5.2), dpi=300)
    fig.patch.set_facecolor(BG_CANVAS)
    ax.set_facecolor(BG_CARD)

    models = [
        "GPT-3\n(2020)",
        "Chinchilla\n(2022)",
        "LLaMA 1\n(2023)",
        "LLaMA 2\n(2023)",
        "LLaMA 3\n(2024)",
        "Frontier Model\n(2025/2026)",
        "Total High-Quality\nHuman Text (Epoch AI)"
    ]
    tokens = [0.3, 1.4, 1.4, 2.0, 15.0, 45.0, 150.0]
    colors = [
        "#334155", "#475569", "#475569", "#3b82f6", "#2563eb",
        ACCENT_AMBER, ACCENT_RED
    ]

    bars = ax.bar(models, tokens, color=colors, edgecolor=BORDER_COLOR, width=0.6, zorder=3)
    
    # Ceiling line
    ax.axhline(150, color=ACCENT_RED, ls='--', lw=2.2, zorder=4, label="Estimated High-Quality Human Text Ceiling (~150T Tokens)")

    # Data value labels on bars
    for bar, val in zip(bars, tokens):
        y = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, y + 3.5, f"{val:.1f}T",
                ha='center', va='bottom', fontsize=11, fontweight='bold', color=TEXT_MAIN)

    ax.set_title("Training Tokens Ingested vs. The Planetary Data Wall", fontsize=13, fontweight='bold', pad=16)
    ax.set_ylabel("Training Tokens (Trillions)", fontsize=11, fontweight='bold', labelpad=8)
    ax.set_ylim(0, 185)
    ax.grid(axis='y', zorder=0)
    ax.legend(loc="upper left", facecolor="#090d16", edgecolor=BORDER_COLOR, fontsize=10)

    plt.tight_layout()
    out_file = os.path.join(out_dir, "human_data_ceiling.png")
    plt.savefig(out_file, dpi=300, facecolor=BG_CANVAS)
    plt.close()
    print("Rendered: human_data_ceiling.png")


# ==============================================================================
# FIGURE 8: Model Collapse Under Recursive Synthetic Training
# ==============================================================================
def generate_figure_8():
    fig, ax = plt.subplots(figsize=(10.5, 5.2), dpi=300)
    fig.patch.set_facecolor(BG_CANVAS)
    ax.set_facecolor(BG_CARD)

    x = np.linspace(-4.5, 4.5, 400)
    
    gen_data = [
        ("Gen 0: Ground Truth p_0(x) (Rich tails, full diversity)", 1.0, ACCENT_BLUE, 0.20),
        ("Gen 2: Variance shrinking", 0.75, "#06b6d4", 0.15),
        ("Gen 5: Tails vanish, mode collapse begins", 0.45, ACCENT_AMBER, 0.12),
        ("Gen 10: Heavy degeneration", 0.20, "#fb923c", 0.10),
        ("Gen 20: Information Entropy Collapse H(p_n) -> 0", 0.08, ACCENT_RED, 0.0)
    ]

    for label, sigma, color, fill_alpha in gen_data:
        y = (1.0 / (sigma * np.sqrt(2 * np.pi))) * np.exp(-0.5 * (x / sigma)**2)
        ax.plot(x, y, label=label, color=color, lw=3.2 if sigma == 0.08 else 2.6)
        if fill_alpha > 0:
            ax.fill_between(x, 0, y, color=color, alpha=fill_alpha)

    ax.set_title("Model Collapse: Distribution Degeneration Under Recursive Synthetic Training", fontsize=12.5, fontweight='bold', pad=14)
    ax.set_xlabel("Latent Representation Space x", fontsize=11, fontweight='bold', labelpad=8)
    ax.set_ylabel(r"Probability Density $p_n(x)$", fontsize=11, fontweight='bold', labelpad=8)
    ax.set_xlim(-4.5, 4.5)
    ax.set_ylim(0, 5.2)
    ax.grid(True)
    ax.legend(loc="upper right", facecolor="#090d16", edgecolor=BORDER_COLOR, fontsize=9.5)

    plt.tight_layout()
    out_file = os.path.join(out_dir, "model_collapse_entropy.png")
    plt.savefig(out_file, dpi=300, facecolor=BG_CANVAS)
    plt.close()
    print("Rendered: model_collapse_entropy.png")


# ==============================================================================
# FIGURE 9: The Hardware Lottery (Cluster MFU on GPUs)
# ==============================================================================
def generate_figure_9():
    fig, ax = plt.subplots(figsize=(11.0, 5.4), dpi=300)
    fig.patch.set_facecolor(BG_CANVAS)
    ax.set_facecolor(BG_CARD)

    archs = [
        "Transformers\n(16k H100 Cluster)",
        "State Space Models\n(Mamba / Custom Kernels)",
        "Recurrent Networks\n(LSTMs / RWKV)",
        "Graph Neural Nets\n(Dynamic Sparsity)",
        "Energy-Based Models\n(Iterative Sampling)"
    ]
    mfu_vals = [41.0, 24.5, 14.0, 8.5, 10.0]
    colors = [ACCENT_BLUE, "#0284c7", ACCENT_AMBER, "#ea580c", ACCENT_RED]

    bars = ax.bar(archs, mfu_vals, color=colors, edgecolor=BORDER_COLOR, width=0.55, zorder=3)

    # Baseline line for frontier cluster
    ax.axhline(40, color=ACCENT_BLUE, ls='--', lw=2.0, zorder=4, label="Frontier Cluster MFU Baseline (38–43%)")

    # Clean annotations on top of bars
    for bar, val in zip(bars, mfu_vals):
        y = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2.0, y + 1.2, f"{val:.1f}% MFU",
                ha='center', va='bottom', fontsize=11, fontweight='bold', color=TEXT_MAIN)

    # Sub-descriptions placed nicely below bars or inside tall bars
    sub_notes = [
        ("Dense GEMM +\nMegatron-LM Native", 12.0, "#ffffff"),
        ("Associative Scan\nImmature Scale Tooling", 6.0, "#ffffff"),
        ("Sequential Recurrence\nMemory Bandwidth Bound", 3.0, "#ffffff"),
        ("Irregular Pointers\nLatency Stalls", 1.8, "#ffffff"),
        ("Iterative Relaxation\nLow Systolic Fit", 2.0, "#ffffff")
    ]
    for bar, (note, y_pos, text_col) in zip(bars, sub_notes):
        ax.text(bar.get_x() + bar.get_width()/2.0, y_pos, note,
                ha='center', va='bottom', fontsize=8.2, fontweight='bold', color=text_col, alpha=0.95, zorder=5)

    ax.set_title("The Hardware Lottery: Real-World Model FLOPs Utilization (MFU) on GPU Clusters", fontsize=13, fontweight='bold', pad=16)
    ax.set_ylabel("Cluster MFU (%)", fontsize=11, fontweight='bold', labelpad=8)
    ax.set_ylim(0, 52)
    ax.grid(axis='y', zorder=0)
    ax.legend(loc="upper right", facecolor="#090d16", edgecolor=BORDER_COLOR, fontsize=10)

    plt.tight_layout()
    out_file = os.path.join(out_dir, "hardware_lottery_comparison.png")
    plt.savefig(out_file, dpi=300, facecolor=BG_CANVAS)
    plt.close()
    print("Rendered: hardware_lottery_comparison.png")


if __name__ == "__main__":
    print("Generating Figure 1...")
    generate_figure_1()
    print("Generating Figure 2...")
    generate_figure_2()
    print("Generating Figure 3...")
    generate_figure_3()
    print("Generating Figure 4...")
    generate_figure_4()
    print("Generating Figure 5...")
    generate_figure_5()
    print("Generating Figure 6...")
    generate_figure_6()
    print("Generating Figure 7...")
    generate_figure_7()
    print("Generating Figure 8...")
    generate_figure_8()
    print("Generating Figure 9...")
    generate_figure_9()
    print("All 9 publication assets generated successfully!")
