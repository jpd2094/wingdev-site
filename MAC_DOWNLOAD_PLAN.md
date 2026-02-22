# Plan: Mac Download Button — End-to-End

## Context
The wingdev.ai splash page has a "Download for Mac" button that currently links to `#`. The goal is to wire it up so clicking it downloads the actual Wingdev Electron app as a `.dmg`. The app isn't complete yet, but this sets up the full pipeline so that when it's ready, a single build command produces a downloadable release.

**Distribution**: GitHub Releases (free, reliable, large file support)
**Code signing**: Skipped for now — friends-only distribution. Users right-click > Open to bypass Gatekeeper.

---

## Steps

### 1. Build the DMG locally
The build tooling is already configured in the wingdev repo.

```bash
cd ~/Development/wingdev
npm run electron:build    # runs scripts/build-electron.sh
```

This produces `release/Wingdev-0.1.0.dmg` (universal binary — arm64 + x64).

**Files involved:**
- `~/Development/wingdev/scripts/build-electron.sh` — orchestrates Next.js build → TS compile → native rebuild → electron-builder
- `~/Development/wingdev/electron-builder.yml` — DMG config (app ID, icon, entitlements, ASAR unpacking)
- `~/Development/wingdev/build/icon.icns` — Mac app icon
- `~/Development/wingdev/build/entitlements.mac.plist` — hardened runtime entitlements

### 2. Create a GitHub repo + first release
```bash
cd ~/Development/wingdev-site
git init && git add -A && git commit -m "Initial splash page"
gh repo create wingdev-site --public --source=. --push

# For the app repo (if not already on GitHub):
cd ~/Development/wingdev
gh release create v0.1.0 release/Wingdev-0.1.0.dmg \
  --title "Wingdev v0.1.0" \
  --notes "Initial release for friends. Right-click > Open to bypass Gatekeeper." \
  --prerelease
```

The DMG download URL will be:
`https://github.com/<user>/wingdev/releases/latest/download/Wingdev-0.1.0.dmg`

### 3. Update the download button in index.html
Change the Mac download button `href` from `#` to the GitHub Releases URL:
```html
<a href="https://github.com/<user>/wingdev/releases/latest/download/Wingdev-0.1.0.dmg" class="btn">
```

Using `/latest/download/` means the link always points to the most recent release — no need to update the site when pushing new versions.

### 4. Add a GitHub Actions workflow for automated releases (optional but recommended)
**File to create:** `~/Development/wingdev/.github/workflows/release.yml`

Triggers on git tag push (`v*`). Steps:
1. Checkout code
2. Setup Node.js
3. `npm ci`
4. `npm run electron:build`
5. Upload `release/*.dmg` to a GitHub Release via `softprops/action-gh-release`

This way, tagging a commit (`git tag v0.1.1 && git push --tags`) auto-builds and publishes the DMG.

---

## Verification
1. Run `npm run electron:build` in wingdev — confirm `release/Wingdev-0.1.0.dmg` exists
2. Create the GitHub release — confirm the DMG is downloadable from the release page
3. Update `index.html` with the real URL — open the splash page and click "Download for Mac"
4. Confirm the browser downloads the DMG
5. Open the DMG, drag Wingdev to Applications, right-click > Open to launch
