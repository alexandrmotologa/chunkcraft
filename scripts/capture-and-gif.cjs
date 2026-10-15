const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const WebSocket = require('ws');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9245;
const STUDIO_PORT = 50098;
const STUDIO_URL = `http://localhost:${STUDIO_PORT}`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else cb.resolve(msg.result);
        }
      });
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async captureScreenshot(outputPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    let cleanBase64 = res.data;
    if (typeof cleanBase64 !== 'string') {
      throw new Error(`Invalid screenshot data type: ${typeof cleanBase64}`);
    }
    const idx = cleanBase64.indexOf('base64,');
    if (idx !== -1) {
      cleanBase64 = cleanBase64.substring(idx + 7);
    }
    const buffer = Buffer.from(cleanBase64.trim(), 'base64');
    
    // Validate PNG magic number: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47) {
      throw new Error(`Corrupted PNG buffer captured for ${outputPath}! Header hex: ${buffer.slice(0, 8).toString('hex')}`);
    }

    fs.writeFileSync(outputPath, buffer);
    console.log(`✓ Saved valid PNG: ${outputPath} (${buffer.length} bytes)`);
    return buffer;
  }

  async evaluate(expression) {
    return this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
  }
}

async function main() {
  const imagesDir = path.resolve('docs/images');
  const framesDir = path.resolve('tmp_gif_frames');
  const tempProfile = path.resolve('tmp_chrome_profile');

  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });
  if (!fs.existsSync(tempProfile)) fs.mkdirSync(tempProfile, { recursive: true });

  console.log('1. Starting ChunkCraft Local Server on port', STUDIO_PORT);
  const sampleDocPath = path.resolve('examples/sample-docs/enterprise-policy.md');
  const { LocalServer } = await import('../dist/server/local-server.js');
  const server = new LocalServer({
    documentPath: sampleDocPath,
    staticDir: path.resolve('dist/studio')
  });
  await server.start(STUDIO_PORT, 'localhost');
  console.log('✓ Server active at', STUDIO_URL);

  console.log('2. Launching Headless Chrome on debug port', DEBUG_PORT);
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${tempProfile}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1280,820',
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  let client = null;
  const capturedScreenshots = [];

  try {
    // Wait for Chrome CDP to respond
    let connected = false;
    for (let i = 0; i < 20; i++) {
      try {
        await fetchJson(`http://localhost:${DEBUG_PORT}/json/version`);
        connected = true;
        break;
      } catch {
        await sleep(250);
      }
    }
    if (!connected) throw new Error('Chrome failed to start within timeout');

    const pages = await fetchJson(`http://localhost:${DEBUG_PORT}/json/list`);
    const targetPage = pages.find(p => p.type === 'page') || pages[0];
    if (!targetPage) throw new Error('No target page found in Chrome');

    client = new CdpClient(targetPage.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 820,
      deviceScaleFactor: 2,
      mobile: false
    });

    console.log('3. Navigating to', STUDIO_URL);
    await client.send('Page.navigate', { url: STUDIO_URL });
    await sleep(2500);

    // Capture 1: Inspector / Dashboard
    console.log('4. Capturing Inspector & Dashboard...');
    const p1 = path.join(imagesDir, 'chunkcraft_inspector.png');
    const p1b = path.join(imagesDir, 'chunkcraft_dashboard.png');
    await client.captureScreenshot(p1);
    fs.copyFileSync(p1, p1b);
    capturedScreenshots.push(p1);

    // Capture 2: Retrieval Sandbox
    console.log('5. Capturing Retrieval Sandbox...');
    await client.evaluate(`
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes('Sandbox'));
      if (btn) btn.click();
    `);
    await sleep(800);
    await client.evaluate(`
      const input = document.querySelector('input[type="text"]');
      if (input) {
        input.value = "What are the Multi-Factor Authentication requirements?";
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const retrieveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Retrieve'));
      if (retrieveBtn) retrieveBtn.click();
    `);
    await sleep(1500);
    const p2 = path.join(imagesDir, 'chunkcraft_sandbox.png');
    await client.captureScreenshot(p2);
    capturedScreenshots.push(p2);

    // Capture 3: Auto-Tuning Panel
    console.log('6. Capturing Auto-Tuning Panel...');
    await client.evaluate(`
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes('Auto-Tuning'));
      if (btn) btn.click();
    `);
    await sleep(800);
    await client.evaluate(`
      const tuneBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Run Parameter Tuning'));
      if (tuneBtn) tuneBtn.click();
    `);
    await sleep(2000);
    const p3 = path.join(imagesDir, 'chunkcraft_tuning.png');
    await client.captureScreenshot(p3);
    capturedScreenshots.push(p3);

    // Capture 4: Model Shootout Panel
    console.log('7. Capturing Model Shootout Panel...');
    await client.evaluate(`
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes('Shootout'));
      if (btn) btn.click();
    `);
    await sleep(800);
    await client.evaluate(`
      const shootoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Run Model Shootout'));
      if (shootoutBtn) shootoutBtn.click();
    `);
    await sleep(1500);
    const p4 = path.join(imagesDir, 'chunkcraft_shootout.png');
    await client.captureScreenshot(p4);
    capturedScreenshots.push(p4);

    // Capture 5: Golden Query Lab
    console.log('8. Capturing Golden Query Lab...');
    await client.evaluate(`
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes('Golden Lab'));
      if (btn) btn.click();
    `);
    await sleep(800);
    const p5 = path.join(imagesDir, 'chunkcraft_queries.png');
    await client.captureScreenshot(p5);

    // Capture 6: Strategy Comparison Matrix
    console.log('9. Capturing Comparison Matrix...');
    await client.evaluate(`
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes('Matrix'));
      if (btn) btn.click();
    `);
    await sleep(1200);
    const p6 = path.join(imagesDir, 'chunkcraft_matrix.png');
    await client.captureScreenshot(p6);
    capturedScreenshots.push(p6);

    // Capture 7: Cost & Sizer Modal
    console.log('10. Capturing Cost Sizer Modal...');
    await client.evaluate(`
      const sizerBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cost Sizer') || b.textContent.includes('Sizer'));
      if (sizerBtn) sizerBtn.click();
    `);
    await sleep(1000);
    const p7 = path.join(imagesDir, 'chunkcraft_sizer.png');
    await client.captureScreenshot(p7);
    capturedScreenshots.push(p7);

    // Close modal
    await client.evaluate(`
      const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Close');
      if (closeBtn) closeBtn.click();
    `);
    await sleep(600);

    // Capture 8: Mobile Responsiveness View (390x844 iPhone 14)
    console.log('11. Capturing Mobile View (390x844)...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await client.evaluate(`
      const btn = Array.from(document.querySelectorAll('nav button')).find(b => b.textContent.includes('Inspector'));
      if (btn) btn.click();
    `);
    await sleep(1000);
    const p8 = path.join(imagesDir, 'chunkcraft_mobile.png');
    await client.captureScreenshot(p8);

    // 12. Generate Frames and Animated Demo GIF
    console.log('12. Assembling animated demo GIF...');
    const sequence = [p1, p2, p3, p4, p6, p7];
    let frameIdx = 0;
    for (const imgPath of sequence) {
      // 25 frames per view at 20fps = 1.25s per view
      for (let f = 0; f < 25; f++) {
        const frameFile = path.join(framesDir, `frame_${String(frameIdx).padStart(4, '0')}.png`);
        fs.copyFileSync(imgPath, frameFile);
        frameIdx++;
      }
    }

    const gifOutput = path.join(imagesDir, 'chunkcraft_demo.gif');
    const palettePath = path.join(framesDir, 'palette.png');

    execSync(
      `ffmpeg -y -framerate 20 -i "${framesDir}/frame_%04d.png" -vf "scale=1200:-1:flags=lanczos,palettegen=stats_mode=diff" "${palettePath}"`,
      { stdio: 'pipe' }
    );
    execSync(
      `ffmpeg -y -framerate 20 -i "${framesDir}/frame_%04d.png" -i "${palettePath}" -lavfi "scale=1200:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" "${gifOutput}"`,
      { stdio: 'pipe' }
    );
    console.log(`✓ Animated demo GIF rendered: ${gifOutput} (${fs.statSync(gifOutput).size} bytes)`);

  } finally {
    if (client) client.close();
    chromeProcess.kill('SIGKILL');
    await server.stop();
    fs.rmSync(framesDir, { recursive: true, force: true });
    fs.rmSync(tempProfile, { recursive: true, force: true });
  }

  console.log('\n=== All authentic screenshots and demo GIF generated and verified successfully! ===');
}

main().catch(err => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
