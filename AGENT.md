# Agent Operating Instructions & Release Automation Policy

For the complete architectural documentation, MCP schemas, REST API specs, and delivery modes, see [AGENT_GUIDE.md](./AGENT_GUIDE.md).

---

## Autonomous Release Protocol

Autonomous AI agents working on **Run** must adhere to the following release automation directives:

### 1. Automatic Release Creation
Create a new GitHub release automatically when:
1. **Commit Magnitude**: The commit or session represents a **large or significant update** (e.g., major feature additions such as dedicated `/m/` mobile layout, new delivery modes, architectural refactors, or critical security patches).
2. **Confidence & Verification**: You are **fully confident** that the feature or patch is working:
   - `bun run check` passes with **0 errors and 0 warnings**.
   - Edge runtime safety is preserved (no unsupported Node globals in edge resolver paths).
   - Live database compatibility verified.

**Execution Steps for Automatic Release:**
1. Bump version in `package.json` (SemVer: `patch` for bug fixes, `minor` for new features, `major` for breaking redesigns).
2. Commit: `git commit -am "chore(release): bump version to vX.Y.Z"`
3. Push: `git push origin main`
4. Create release:
   ```bash
   bun scripts/release.ts vX.Y.Z --title "vX.Y.Z: <Release Title>" --generate-notes
   ```

### 2. Redo / Rollback Policy ("Redo Previous Release")
If an issue or bug is discovered after a release is published:
- **Never leave a broken release live as latest.**
- If unverified or broken, redo the release:
  1. Fix the bug and verify via `bun run check`.
  2. Delete broken release and tag:
     ```bash
     gh release delete <tag> -y
     git tag -d <tag>
     git push --delete origin <tag>
     ```
  3. Re-cut the release once verified with full confidence:
     ```bash
     bun scripts/release.ts <tag> --title "vX.Y.Z: <Release Title>" --generate-notes
     ```
