#!/usr/bin/env bun
/**
 * Run — Cross-Platform GitHub Release Automation (TypeScript + Bun)
 *
 * Usage:
 *   bun scripts/release.ts [tag] [options]
 *
 * Options / Flags:
 *   --title <title>          Custom title (defaults to "Release <tag>")
 *   --notes <string>         Custom release notes body
 *   --notes-file <path>      Path to markdown release notes file
 *   --draft                  Create release as draft
 *   --prerelease             Mark as pre-release
 *   --target <branch>        Target branch (defaults to "main")
 *   --no-generate-notes      Disable auto-generating notes from commits/PRs
 *
 * Environment Variables (CI / Workflow compatible):
 *   GH_TOKEN / GITHUB_TOKEN  GitHub API token
 *   TAG_NAME / INPUT_TAG_NAME
 *   RELEASE_TITLE / INPUT_TITLE
 *   RELEASE_NOTES
 *   INPUT_PRERELEASE
 *   INPUT_DRAFT
 *   INPUT_GENERATE_NOTES
 */

import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';

// --- Color Helpers ---
const isTTY = process.stdout.isTTY ?? false;
const colors = {
	blue: (s: string) => (isTTY ? `\x1b[34m${s}\x1b[0m` : s),
	green: (s: string) => (isTTY ? `\x1b[32m${s}\x1b[0m` : s),
	yellow: (s: string) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s),
	red: (s: string) => (isTTY ? `\x1b[31m${s}\x1b[0m` : s),
	bold: (s: string) => (isTTY ? `\x1b[1m${s}\x1b[0m` : s)
};

function logInfo(msg: string) {
	console.log(`${colors.blue('[INFO]')} ${msg}`);
}
function logSuccess(msg: string) {
	console.log(`${colors.green('[SUCCESS]')} ${msg}`);
}
function logWarn(msg: string) {
	console.log(`${colors.yellow('[WARN]')} ${msg}`);
}
function logError(msg: string) {
	console.error(`${colors.red('[ERROR]')} ${msg}`);
}

// --- Process Execution Helper ---
function runCmd(cmd: string[], options: { allowFail?: boolean; env?: Record<string, string> } = {}): {
	success: boolean;
	stdout: string;
	stderr: string;
	exitCode: number;
} {
	const mergedEnv = {
		...process.env,
		...(options.env || {})
	};

	// Ensure GH_TOKEN is set if GITHUB_TOKEN is present
	if (mergedEnv.GITHUB_TOKEN && !mergedEnv.GH_TOKEN) {
		mergedEnv.GH_TOKEN = mergedEnv.GITHUB_TOKEN;
	}

	const res = Bun.spawnSync(cmd, {
		env: mergedEnv,
		stdout: 'pipe',
		stderr: 'pipe'
	});

	const stdout = res.stdout ? res.stdout.toString().trim() : '';
	const stderr = res.stderr ? res.stderr.toString().trim() : '';

	if (res.exitCode !== 0 && !options.allowFail) {
		logError(`Command failed: ${cmd.join(' ')}`);
		if (stderr) console.error(stderr);
		if (stdout) console.log(stdout);
	}

	return {
		success: res.exitCode === 0,
		stdout,
		stderr,
		exitCode: res.exitCode ?? 1
	};
}

// --- CLI Arguments Parsing ---
function parseArgs() {
	const rawArgs = process.argv.slice(2);
	let tag = '';
	let title = '';
	let notes = '';
	let notesFile = '';
	let target = 'main';
	let draft = false;
	let prerelease: boolean | null = null;
	let generateNotes = true;

	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i];
		if (arg === '--title' && i + 1 < rawArgs.length) {
			title = rawArgs[++i];
		} else if (arg === '--notes' && i + 1 < rawArgs.length) {
			notes = rawArgs[++i];
		} else if (arg === '--notes-file' && i + 1 < rawArgs.length) {
			notesFile = rawArgs[++i];
		} else if (arg === '--target' && i + 1 < rawArgs.length) {
			target = rawArgs[++i];
		} else if (arg === '--draft') {
			draft = true;
		} else if (arg === '--prerelease') {
			prerelease = true;
		} else if (arg === '--no-generate-notes') {
			generateNotes = false;
		} else if (!arg.startsWith('-') && !tag) {
			tag = arg;
		} else if (!arg.startsWith('-') && !title) {
			title = arg;
		}
	}

	// Environment variable fallbacks for CI / GitHub Actions
	tag = tag || process.env.TAG_NAME || process.env.INPUT_TAG_NAME || '';
	if (!tag && process.env.GITHUB_REF_NAME && process.env.GITHUB_REF?.startsWith('refs/tags/')) {
		tag = process.env.GITHUB_REF_NAME;
	}

	title = title || process.env.RELEASE_TITLE || process.env.INPUT_TITLE || '';
	notes = notes || process.env.RELEASE_NOTES || '';

	if (prerelease === null) {
		if (process.env.INPUT_PRERELEASE === 'true') prerelease = true;
		else if (process.env.INPUT_PRERELEASE === 'false') prerelease = false;
	}

	if (process.env.INPUT_DRAFT === 'true') draft = true;
	if (process.env.INPUT_GENERATE_NOTES === 'false') generateNotes = false;

	return { tag, title, notes, notesFile, target, draft, prerelease, generateNotes };
}

// --- Main Execution Flow ---
async function main() {
	logInfo('Starting GitHub Release Automation via Bun & TypeScript...');

	// 1. Check GitHub CLI installation
	const ghCheck = runCmd(['gh', '--version'], { allowFail: true });
	if (!ghCheck.success) {
		logError("GitHub CLI ('gh') is not installed or not in PATH.");
		console.log('Install gh via: https://cli.github.com/ or run winget/brew.');
		process.exit(1);
	}

	// 2. Check Authentication
	const authCheck = runCmd(['gh', 'auth', 'status'], { allowFail: true });
	if (!authCheck.success && !process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
		logError("GitHub CLI is not authenticated. Run 'gh auth login' or export GH_TOKEN.");
		process.exit(1);
	}

	const args = parseArgs();

	// 3. Resolve Tag Name
	let tag = args.tag;
	if (!tag) {
		const pkgPath = resolve(process.cwd(), 'package.json');
		if (existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
				if (pkg.version) {
					tag = `v${pkg.version.replace(/^v/, '')}`;
					logInfo(`Derived tag from package.json: ${colors.bold(tag)}`);
				}
			} catch (e) {
				logWarn(`Could not parse package.json: ${(e as Error).message}`);
			}
		}
	}

	if (!tag) {
		logError('No tag specified. Provide via argument: bun scripts/release.ts v1.2.0');
		process.exit(1);
	}

	if (!tag.startsWith('v')) {
		tag = `v${tag}`;
	}

	logInfo(`Target release tag: ${colors.bold(tag)}`);

	// 4. Resolve Title
	const title = args.title || `Release ${tag}`;

	// 5. Detect Pre-release
	let isPrerelease = args.prerelease;
	if (isPrerelease === null) {
		isPrerelease = /-(alpha|beta|rc|canary|next|preview)/i.test(tag);
	}

	// 6. Check if release already exists on GitHub
	const existingCheck = runCmd(['gh', 'release', 'view', tag, '--json', 'tagName,url'], {
		allowFail: true
	});
	if (existingCheck.success && existingCheck.stdout) {
		try {
			const info = JSON.parse(existingCheck.stdout);
			logWarn(`Release for tag '${tag}' already exists on GitHub: ${info.url}`);

			if (process.env.GITHUB_OUTPUT) {
				appendFileSync(process.env.GITHUB_OUTPUT, `release_url=${info.url}\n`);
				appendFileSync(process.env.GITHUB_OUTPUT, `tag_name=${tag}\n`);
				appendFileSync(process.env.GITHUB_OUTPUT, `already_existed=true\n`);
			}
			process.exit(0);
		} catch {
			// json parse error fallback
		}
	}

	// 7. Verify / Create Local Git Tag
	const tagCheck = runCmd(['git', 'tag', '-l', tag]);
	if (!tagCheck.stdout.split('\n').includes(tag)) {
		logInfo(`Git tag '${tag}' does not exist locally. Creating tag...`);
		runCmd(['git', 'tag', '-a', tag, '-m', title]);

		logInfo(`Pushing tag '${tag}' to origin...`);
		const pushCheck = runCmd(['git', 'push', 'origin', tag], { allowFail: true });
		if (!pushCheck.success) {
			logWarn("Could not push tag directly to origin; 'gh release create' will attempt tagging.");
		}
	}

	// 8. Build `gh release create` arguments
	const ghArgs: string[] = ['release', 'create', tag, '--title', title];

	if (args.draft) {
		ghArgs.push('--draft');
		logInfo('Option: Draft release');
	}

	if (isPrerelease) {
		ghArgs.push('--prerelease');
		logInfo('Option: Pre-release');
	}

	if (args.notesFile && existsSync(args.notesFile)) {
		ghArgs.push('--notes-file', args.notesFile);
		logInfo(`Option: Notes file (${args.notesFile})`);
	} else if (args.notes) {
		ghArgs.push('--notes', args.notes);
		logInfo('Option: Custom notes');
	} else if (args.generateNotes) {
		ghArgs.push('--generate-notes');
		logInfo('Option: Auto-generate release notes from commits/PRs');
	}

	if (args.target) {
		ghArgs.push('--target', args.target);
	}

	// 9. Execute Release Creation
	logInfo(`Executing: gh ${ghArgs.join(' ')}`);
	const createProc = runCmd(['gh', ...ghArgs]);

	if (!createProc.success) {
		logError('Failed to create GitHub release.');
		process.exit(createProc.exitCode);
	}

	const releaseUrl = createProc.stdout.trim() || `https://github.com/rinme/run/releases/tag/${tag}`;
	logSuccess(`GitHub release created successfully!`);
	logSuccess(`Release URL: ${colors.bold(releaseUrl)}`);

	// 10. Write GitHub Actions Output
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `release_url=${releaseUrl}\n`);
		appendFileSync(process.env.GITHUB_OUTPUT, `tag_name=${tag}\n`);
		appendFileSync(process.env.GITHUB_OUTPUT, `already_existed=false\n`);
	}
}

main().catch((err) => {
	logError(`Fatal error: ${(err as Error).message}`);
	process.exit(1);
});
