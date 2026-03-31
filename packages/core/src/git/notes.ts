import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function runGit(repoDir: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd: repoDir });
  return stdout.trim();
}

export async function getHeadCommit(repoDir: string): Promise<string> {
  return runGit(repoDir, ['rev-parse', 'HEAD']);
}

export async function readGitNote(repoDir: string, ref: string, object: string): Promise<string | null> {
  try {
    return await runGit(repoDir, ['notes', `--ref=${ref}`, 'show', object]);
  } catch (error) {
    const e = error as { stderr?: string };
    if (e.stderr?.includes('no note found') || e.stderr?.includes('cannot read note data')) {
      return null;
    }
    throw error;
  }
}

export async function writeGitNote(repoDir: string, ref: string, object: string, content: string): Promise<void> {
  await runGit(repoDir, ['notes', `--ref=${ref}`, 'add', '-f', '-m', content, object]);
}
