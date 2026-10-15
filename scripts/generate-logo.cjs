const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

function buildLogoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <clipPath id="squircle-clip">
      <rect x="24" y="24" width="976" height="976" rx="220" />
    </clipPath>

    <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f5ff"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>

    <linearGradient id="cyan-blade" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#00f5ff"/>
    </linearGradient>

    <linearGradient id="titanium" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>

    <linearGradient id="slate-facets-l" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>

    <linearGradient id="slate-facets-d" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>

    <filter id="subtle-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.16" />
    </filter>
  </defs>

  <!-- Luxury White Squircle Container -->
  <rect x="24" y="24" width="976" height="976" rx="220" fill="#ffffff" stroke="#e2e8f0" stroke-width="6" />

  <g clip-path="url(#squircle-clip)">
    <g transform="translate(512, 512)" filter="url(#subtle-shadow)">

      <!-- Hexagonal Architectural Gateway Frame -->
      <polygon points="
        0,-390
        338,-195
        338,195
        0,390
        -338,195
        -338,-195
      " fill="none" stroke="#0f172a" stroke-width="38" stroke-linejoin="round" />

      <polygon points="
        0,-355
        307,-177
        307,177
        0,355
        -307,177
        -307,-177
      " fill="none" stroke="#00f5ff" stroke-width="4" opacity="0.45" stroke-dasharray="16, 12" />

      <!-- Watertight Base Silhouette: Origami Beaver Engineer -->
      <path d="
        M 0 -290
        L 95 -290 L 170 -335 L 210 -290 L 180 -230 L 225 -160 L 245 -40 L 255 90 L 210 210 L 140 280 L 0 315
        L -140 280 L -210 210 L -255 90 L -245 -40 L -225 -160 L -180 -230 L -210 -290 L -170 -335 L -95 -290 Z
      " fill="#0b0f19" />

      <!-- Ears: Left and Right -->
      <!-- Left Ear (x < 0) -->
      <polygon points="-95,-290 -170,-335 -210,-290 -180,-230" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
      <polygon points="-130,-295 -175,-320 -195,-285 -165,-250" fill="#334155" stroke="#0f172a" stroke-width="2" />
      <polygon points="-145,-285 -175,-305 -180,-275" fill="#00f5ff" opacity="0.85" />

      <!-- Right Ear (x > 0) -->
      <polygon points="95,-290 170,-335 210,-290 180,-230" fill="#334155" stroke="#0f172a" stroke-width="2" />
      <polygon points="130,-295 175,-320 195,-285 165,-250" fill="#475569" stroke="#0f172a" stroke-width="2" />
      <polygon points="145,-285 175,-305 180,-275" fill="#00f5ff" opacity="0.85" />

      <!-- Forehead & Crown Poly Mesh -->
      <polygon points="0,-290 95,-290 0,-180" fill="#475569" stroke="#0f172a" stroke-width="2" />
      <polygon points="0,-290 -95,-290 0,-180" fill="#334155" stroke="#0f172a" stroke-width="2" />
      <polygon points="-95,-290 -180,-230 -100,-170 0,-180" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
      <polygon points="95,-290 180,-230 100,-170 0,-180" fill="#475569" stroke="#0f172a" stroke-width="2" />

      <!-- Temples & Upper Cheeks -->
      <polygon points="-180,-230 -225,-160 -150,-100 -100,-170" fill="#0f172a" stroke="#0f172a" stroke-width="2" />
      <polygon points="180,-230 225,-160 150,-100 100,-170" fill="#334155" stroke="#0f172a" stroke-width="2" />

      <!-- Central Brow and Nose Bridge -->
      <polygon points="0,-180 -100,-170 -60,-80 0,-60" fill="#64748b" stroke="#0f172a" stroke-width="2" />
      <polygon points="0,-180 100,-170 60,-80 0,-60" fill="#475569" stroke="#0f172a" stroke-width="2" />

      <!-- Optical Eye Sockets (Slanted Upward, Sharp Predator Cant) -->
      <!-- Left Eye -->
      <polygon points="-100,-170 -150,-100 -70,-80" fill="#0b0f19" stroke="#0f172a" stroke-width="2" />
      <polygon points="-135,-125 -80,-105 -120,-95" fill="#00f5ff" filter="url(#cyan-glow)" />
      <polygon points="-115,-115 -90,-107 -110,-100" fill="#ffffff" />

      <!-- Right Eye -->
      <polygon points="100,-170 150,-100 70,-80" fill="#0f172a" stroke="#0f172a" stroke-width="2" />
      <polygon points="135,-125 80,-105 120,-95" fill="#00f5ff" filter="url(#cyan-glow)" />
      <polygon points="115,-115 90,-107 110,-100" fill="#ffffff" />

      <!-- Wide Beaver Zygomatic Cheeks -->
      <polygon points="-225,-160 -245,-40 -160,20 -150,-100" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
      <polygon points="225,-160 245,-40 160,20 150,-100" fill="#334155" stroke="#0f172a" stroke-width="2" />
      <polygon points="-245,-40 -255,90 -170,120 -160,20" fill="#0f172a" stroke="#0f172a" stroke-width="2" />
      <polygon points="245,-40 255,90 170,120 160,20" fill="#1e293b" stroke="#0f172a" stroke-width="2" />

      <!-- Beaver Muzzle & Snout (Broad, Architecturally Structured) -->
      <polygon points="0,-60 -60,-80 -50,15 0,35" fill="#475569" stroke="#0f172a" stroke-width="2" />
      <polygon points="0,-60 60,-80 50,15 0,35" fill="#334155" stroke="#0f172a" stroke-width="2" />
      <polygon points="-60,-80 -150,-100 -160,20 -50,15" fill="#334155" stroke="#0f172a" stroke-width="2" />
      <polygon points="60,-80 150,-100 160,20 50,15" fill="#475569" stroke="#0f172a" stroke-width="2" />

      <!-- Geometric Nose Diamond -->
      <polygon points="0,10 -35,35 0,60 35,35" fill="#0f172a" stroke="#00f5ff" stroke-width="2.5" />

      <!-- Whisker Pads / Muzzle Spread (Lateral, Silver-Slate Titanium) -->
      <polygon points="0,60 -35,35 -90,75 -60,135 0,115" fill="url(#titanium)" stroke="#0f172a" stroke-width="2" />
      <polygon points="0,60 35,35 90,75 60,135 0,115" fill="#64748b" stroke="#0f172a" stroke-width="2" />
      <polygon points="-90,75 -160,20 -170,120 -120,165 -60,135" fill="#334155" stroke="#0f172a" stroke-width="2" />
      <polygon points="90,75 160,20 170,120 120,165 60,135" fill="#475569" stroke="#0f172a" stroke-width="2" />

      <!-- The Beaver Chisel / Chunking Precision Blades (Pair of Polished Cyan/Titanium Cutters) -->
      <!-- Left Precision Cutter -->
      <polygon points="-36,115 -6,115 -6,175 -36,170" fill="url(#cyan-blade)" stroke="#0f172a" stroke-width="2.5" />
      <polygon points="-36,170 -6,175 -6,188 -36,183" fill="#00f5ff" stroke="#0f172a" stroke-width="1.5" />

      <!-- Right Precision Cutter -->
      <polygon points="6,115 36,115 36,170 6,175" fill="url(#cyan-blade)" stroke="#0f172a" stroke-width="2.5" />
      <polygon points="6,175 36,170 36,183 6,188" fill="#00f5ff" stroke="#0f172a" stroke-width="1.5" />

      <!-- Lower Jaw & Sturdy Chin Structure -->
      <polygon points="-60,135 -36,170 -60,210 -120,165" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
      <polygon points="60,135 36,170 60,210 120,165" fill="#334155" stroke="#0f172a" stroke-width="2" />
      <polygon points="-36,185 0,200 0,265 -50,230" fill="#0f172a" stroke="#0f172a" stroke-width="2" />
      <polygon points="36,185 0,200 0,265 50,230" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
      <polygon points="-120,165 -170,120 -210,210 -110,245 -60,210" fill="#0b0f19" stroke="#0f172a" stroke-width="2" />
      <polygon points="120,165 170,120 210,210 110,245 60,210" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
      <polygon points="0,265 -50,230 -110,245 -140,280 0,315" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
      <polygon points="0,265 50,230 110,245 140,280 0,315" fill="#334155" stroke="#0f172a" stroke-width="2" />

      <!-- Cyan Chevron Precision Markings on Brow -->
      <polyline points="-40,-130 0,-105 40,-130" fill="none" stroke="#00f5ff" stroke-width="3" opacity="0.8" />
      <polyline points="-25,-145 0,-125 25,-145" fill="none" stroke="#00f5ff" stroke-width="2" opacity="0.6" stroke-dasharray="4,4" />

    </g>
  </g>
</svg>`;
}

function run() {
  const outputDir = path.resolve('docs/images');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const svg = buildLogoSvg();
  const svgPath = path.join(outputDir, 'chunkcraft_logo.svg');
  const pngPath = path.join(outputDir, 'chunkcraft_logo.png');

  fs.writeFileSync(svgPath, svg, 'utf8');
  console.log('✓ Wrote ' + svgPath);

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1024 }
  });
  const pngBuffer = resvg.render().asPng();
  fs.writeFileSync(pngPath, pngBuffer);
  console.log('✓ Rendered ' + pngPath + ' at 1024x1024 (' + pngBuffer.length + ' bytes)');
}

run();
