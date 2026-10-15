import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Generate frames from screenshots
const framesDir = path.resolve('tmp_gif_frames');
if (!fs.existsSync(framesDir)) {
  fs.mkdirSync(framesDir, { recursive: true });
}

const images = [
  'docs/images/chunkcraft_inspector.png',
  'docs/images/chunkcraft_dashboard.png',
  'docs/images/chunkcraft_sandbox.png',
  'docs/images/chunkcraft_matrix.png'
];

// Create 30 frames per view (1.5 seconds each)
let frameCount = 0;
for (const img of images) {
  for (let f = 0; f < 30; f++) {
    const frameName = path.join(framesDir, `frame_${String(frameCount).padStart(4, '0')}.png`);
    fs.copyFileSync(img, frameName);
    frameCount++;
  }
}

console.log(`Generated ${frameCount} frames in ${framesDir}`);

const outputFile = path.resolve('docs/images/chunkcraft_demo.gif');
const paletteFile = path.join(framesDir, 'palette.png');

// 1. Generate optimal 256-color palette
execSync(
  `ffmpeg -y -framerate 20 -i "${framesDir}/frame_%04d.png" -vf "scale=1200:-1:flags=lanczos,palettegen=stats_mode=diff" "${paletteFile}"`,
  { stdio: 'inherit' }
);

// 2. Render optimized GIF using palette
execSync(
  `ffmpeg -y -framerate 20 -i "${framesDir}/frame_%04d.png" -i "${paletteFile}" -lavfi "scale=1200:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "${outputFile}"`,
  { stdio: 'inherit' }
);

console.log(`✓ Successfully rendered demo GIF to ${outputFile}`);

// Clean up temporary frames
fs.rmSync(framesDir, { recursive: true, force: true });
console.log('Cleaned up temporary frames.');
