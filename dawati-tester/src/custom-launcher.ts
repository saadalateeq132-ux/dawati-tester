import { chromium } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CHROMIUM_PATH = '/nix/store/7xr3qnq93srn4dgak7qw74dw836wpp1y-chromium-138.0.7204.49/bin/chromium';

async function verifyChromium() {
  try {
    const { stdout } = await execAsync(`"${CHROMIUM_PATH}" --version`);
    return stdout.includes('Chromium');
  } catch (error) {
    return false;
  }
}

export async function launchCustomBrowser() {
  const isValid = await verifyChromium();
  if (!isValid) {
    throw new Error('Chromium binary verification failed');
  }

  return await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=9222'
    ]
  });
}