import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

describe('PromptScript agent support', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('installs globally into the shared .agents/skills directory', async () => {
    const home = await mkdtemp(join(tmpdir(), 'skills-promptscript-home-'));
    const sourceRoot = await mkdtemp(join(tmpdir(), 'skills-promptscript-source-'));
    const skillDir = join(sourceRoot, 'promptscript-skill');
    const cwd = join(sourceRoot, 'project');
    vi.stubEnv('HOME', home);

    try {
      await mkdir(skillDir, { recursive: true });
      await mkdir(cwd, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        '---\nname: promptscript-skill\ndescription: PromptScript skill\n---\n# Skill\n',
        'utf-8'
      );

      const { agents, isUniversalAgent } = await import('../src/agents.ts');
      const { getAgentBaseDir, installSkillForAgent } = await import('../src/installer.ts');

      expect(agents.promptscript.globalSkillsDir).toBe(join(home, '.agents', 'skills'));
      expect(isUniversalAgent('promptscript')).toBe(true);
      expect(getAgentBaseDir('promptscript', true)).toBe(join(home, '.agents', 'skills'));

      const result = await installSkillForAgent(
        { name: 'promptscript-skill', description: 'PromptScript skill', path: skillDir },
        'promptscript',
        { global: true, cwd }
      );

      expect(result.success).toBe(true);
      expect(result.path).toBe(join(home, '.agents', 'skills', 'promptscript-skill'));
      expect(await readFile(join(result.path, 'SKILL.md'), 'utf-8')).toContain(
        'description: PromptScript skill'
      );
    } finally {
      await rm(home, { recursive: true, force: true });
      await rm(sourceRoot, { recursive: true, force: true });
    }
  });
});
