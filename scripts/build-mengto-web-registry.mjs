import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = '/tmp/MengTo-Skills/agent-skills/web-design';
const target = '/home/ubuntu/kaghazobaad-repo/docs/MENGTO-WEB-DESIGN-SOURCE-REGISTRY.yaml';
const dirs = fs.readdirSync(sourceRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const lines = [
  '# Generated from MengTo/Skills main: agent-skills/web-design',
  '# Review status is an initial routing decision; implementation must verify each SKILL.md and REFERENCES.md.',
  `generated_at: ${new Date().toISOString()}`,
  'repository: https://github.com/MengTo/Skills',
  'path: agent-skills/web-design',
  `skill_count: ${dirs.length}`,
  'skills:',
];
const safe = (value) => String(value ?? '').replace(/\n/g, ' ').replace(/"/g, '\\"').trim();
for (const name of dirs) {
  const skillPath = path.join(sourceRoot, name, 'SKILL.md');
  const referencesPath = path.join(sourceRoot, name, 'REFERENCES.md');
  const raw = fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf8') : '';
  const frontmatter = raw.match(/^---\n([\s\S]*?)\n---/);
  const description = frontmatter?.[1].match(/^description:\s*(.*)$/m)?.[1] ?? '';
  const hasReferences = fs.existsSync(referencesPath);
  const visual = /webgl|threejs|globe|vanta|matterjs|shader|cursor|particle|gooey|blur|dither|laser|orbit/i.test(name);
  const initialDecision = visual ? 'spike' : 'audit';
  lines.push(`  - id: ${name}`);
  lines.push(`    source: "https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/${name}"`);
  lines.push(`    skill_file: "agent-skills/web-design/${name}/SKILL.md"`);
  lines.push(`    references_file: ${hasReferences ? `"agent-skills/web-design/${name}/REFERENCES.md"` : 'null'}`);
  lines.push(`    description: "${safe(description)}"`);
  lines.push(`    initial_decision: ${initialDecision}`);
  lines.push('    target: "Kaghaz-o-Baad component mapping pending capability audit"');
  lines.push('    fallback: "RTL/LTR, keyboard, touch, reduced-motion and no-JS required"');
}
fs.writeFileSync(target, `${lines.join('\n')}\n`);
console.log(`Wrote ${dirs.length} skills to ${target}`);
