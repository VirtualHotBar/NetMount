import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trimEnd();
}

function readPackageVersion() {
  const pkgRaw = fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  if (!pkg?.version) throw new Error('package.json missing version');
  return String(pkg.version);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const repo = process.env.GITHUB_REPOSITORY || '';
const tagPrefix = process.env.TAG_PREFIX ?? 'v';
const currentTag =
  process.env.CURRENT_TAG?.trim() || `${tagPrefix}${readPackageVersion()}`;

git(['rev-parse', '--is-inside-work-tree']);

const tagsRaw = git(['tag', '--list', `${tagPrefix}*`, '--sort=-v:refname']).trim();
const allTags = tagsRaw ? tagsRaw.split('\n').map((t) => t.trim()).filter(Boolean) : [];

// Only keep stable SemVer tags (e.g. v1.2.3). Ignore legacy/non-semver tags like v1.0.0beta.
const stableSemverTagRe = new RegExp(`^${escapeRegExp(tagPrefix)}\\d+\\.\\d+\\.\\d+$`);
const tags = allTags.filter((t) => stableSemverTagRe.test(t));

if (tags.length === 0) {
  throw new Error(
    `No stable semver tags found matching ${tagPrefix}X.Y.Z; ensure checkout fetches tags/history.`,
  );
}

const latestTag = tags[0];
if (latestTag !== currentTag) {
  const msg = [
    `CURRENT_TAG (${currentTag}) is not the latest tag (${latestTag}).`,
    `Refusing to generate changelog for wrong range.`,
    `If you're backporting, set CURRENT_TAG explicitly and adjust tag ordering logic.`,
  ].join(' ');
  throw new Error(msg);
}

// Ensure the tag exists locally (create-release created it remotely).
try {
  git(['rev-parse', '--verify', `refs/tags/${currentTag}`]);
} catch {
  throw new Error(
    `Tag ${currentTag} not found locally. Did you run 'git fetch --tags' after creating the release?`,
  );
}

const prevTag = tags.find((t) => t !== currentTag) || '';
const range = prevTag ? `${prevTag}..${currentTag}` : currentTag;

const raw = git(['log', '--no-merges', '--pretty=format:%H\t%s', range]);
const lines = raw ? raw.split('\n') : [];

const typeToSection = new Map([
  ['feat', 'Features'],
  ['fix', 'Fixes'],
  ['perf', 'Performance'],
  ['refactor', 'Refactoring'],
  ['docs', 'Documentation'],
  ['build', 'Build'],
  ['ci', 'CI'],
  ['test', 'Tests'],
  ['chore', 'Chores'],
  ['revert', 'Reverts'],
  ['style', 'Style'],
  ['update', 'Chores'],
]);

const headerRe = /^(?<type>[a-zA-Z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?[：:]\s*(?<subject>.+)$/;

const groups = new Map();
function push(section, item) {
  const arr = groups.get(section) || [];
  arr.push(item);
  groups.set(section, arr);
}

for (const line of lines) {
  const [sha, subjectRaw = ''] = line.split('\t');
  const subject = subjectRaw.trim();
  if (!sha || !subject) continue;
  if (/^Merge\b/i.test(subject) || /^merge\b/i.test(subject)) continue;

  const m = headerRe.exec(subject);
  const type = m?.groups?.type?.toLowerCase();
  const scope = m?.groups?.scope?.trim();
  const breaking = Boolean(m?.groups?.breaking);
  const msg = m?.groups?.subject?.trim() ?? subject;

  const section = typeToSection.get(type) || 'Other';
  const short = sha.slice(0, 7);
  const link = repo ? `https://github.com/${repo}/commit/${sha}` : '';
  const scopePrefix = scope ? `${scope}: ` : '';
  const breakingPrefix = breaking ? '**BREAKING** ' : '';
  const suffix = link ? ` ([${short}](${link}))` : ` (${short})`;
  push(section, `- ${breakingPrefix}${scopePrefix}${msg}${suffix}`);
}

const sectionsOrder = [
  'Features',
  'Fixes',
  'Performance',
  'Refactoring',
  'Documentation',
  'Build',
  'CI',
  'Tests',
  'Chores',
  'Reverts',
  'Style',
  'Other',
];

let out = '';
out += `## ${currentTag}\n\n`;
if (prevTag && repo) {
  out += `Full Changelog: [${prevTag}...${currentTag}](https://github.com/${repo}/compare/${prevTag}...${currentTag})\n\n`;
} else if (prevTag) {
  out += `Full Changelog: ${prevTag}...${currentTag}\n\n`;
}

const hasAny = sectionsOrder.some((s) => (groups.get(s) || []).length > 0);
if (!hasAny) {
  out += '_No changes found._\n';
  process.stdout.write(out);
  process.exit(0);
}

for (const section of sectionsOrder) {
  const items = groups.get(section);
  if (!items?.length) continue;
  out += `### ${section}\n`;
  out += `${items.join('\n')}\n\n`;
}

process.stdout.write(out.replace(/\n{3,}/g, '\n\n'));
