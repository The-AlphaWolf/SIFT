import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { HardwareProfile } from '../../../shared/contracts/ipc-api';

const execAsync = promisify(exec);

let cachedProfile: HardwareProfile | null = null;

function cleanCpuName(raw: string): string {
  const cleaned = raw
    .replace(/\(R\)|\(TM\)|with\s+Radeon\s+Graphics|Processor|CPU|\s+@.*$/gi, '')
    .replace(/^AMD\s+/i, '')
    .replace(/^Intel\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || 'Generic CPU';
}

function cleanGpuName(raw: string): string {
  const cleaned = raw
    .replace(/\(R\)|\(TM\)/gi, '')
    .replace(/GeForce\s+/i, '')
    .replace(/\s+Laptop\s+GPU/i, '')
    .replace(/\s+GPU/i, '')
    .replace(/\s+Graphics/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || 'Integrated GPU';
}

function snapToStandardRam(bytes: number): number {
  const gb = bytes / (1024 * 1024 * 1024);
  const standardSizes = [2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128];
  const matched = standardSizes.find((size) => Math.abs(size - gb) <= 1.5);
  return matched || Math.ceil(gb);
}

async function detectGpuName(): Promise<string> {
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execAsync(
        'powershell -NoProfile -NonInteractive -Command "(Get-CimInstance Win32_VideoController).Name"',
        { timeout: 3000 }
      );
      const lines = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length > 0) {
        // Prioritize discrete GPUs (NVIDIA, Radeon RX, Intel Arc)
        const discrete = lines.find((l) =>
          /nvidia|geforce|rtx|gtx|radeon\s+(?:rx|pro)|arc/i.test(l)
        );
        return discrete || lines[0];
      }
    } catch {
      // Fallback: try WMIC if PowerShell is restricted
      try {
        const { stdout: wmicOut } = await execAsync('wmic path win32_VideoController get name', {
          timeout: 2000,
        });
        const lines = wmicOut
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !/^name$/i.test(l));
        if (lines.length > 0) {
          const discrete = lines.find((l) =>
            /nvidia|geforce|rtx|gtx|radeon\s+(?:rx|pro)|arc/i.test(l)
          );
          return discrete || lines[0];
        }
      } catch {
        // Fallback to default
      }
    }
  }

  if (process.platform === 'darwin') {
    return 'Apple Metal GPU';
  }

  return 'Integrated GPU';
}

function detectOsString(): { platform: string; release: string } {
  if (process.platform === 'win32') {
    const parts = os.release().split('.');
    const build = parseInt(parts[2] || '0', 10);
    const osName = build >= 22000 ? 'Windows 11' : 'Windows 10';
    return {
      platform: `${osName} (${os.arch()})`,
      release: os.release(),
    };
  }

  if (process.platform === 'darwin') {
    return {
      platform: `macOS (${os.arch()})`,
      release: os.release(),
    };
  }

  return {
    platform: `Linux (${os.arch()})`,
    release: os.release(),
  };
}

export async function getHardwareProfile(): Promise<HardwareProfile> {
  if (cachedProfile) {
    return cachedProfile;
  }

  const cpus = os.cpus();
  const rawCpu = cpus[0]?.model || 'Generic Processor';
  const cpuModel = cleanCpuName(rawCpu);
  const cpuCores = cpus.length;

  const totalRamGb = snapToStandardRam(os.totalmem());
  const freeRamGb = Math.round((os.freemem() / (1024 * 1024 * 1024)) * 10) / 10;

  const rawGpu = await detectGpuName();
  const gpuName = cleanGpuName(rawGpu);

  const { platform, release } = detectOsString();

  // Create clean summary badges for UI
  const shortCpu = cpuModel.replace(/Core\s+/i, '').replace(/Ryzen\s+/i, 'R');
  const shortGpu = gpuName.replace(/NVIDIA\s+/i, '').replace(/AMD\s+/i, '').replace(/Intel\s+/i, '');

  const summaryBadge = `${shortCpu} • ${shortGpu}`;
  const ramBadge = `${totalRamGb} GB`;

  cachedProfile = {
    cpuModel,
    cpuCores,
    totalRamGb,
    freeRamGb,
    gpuName,
    osPlatform: platform,
    osRelease: release,
    summaryBadge,
    ramBadge,
  };

  return cachedProfile;
}
