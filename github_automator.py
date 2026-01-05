import requests
import json
import os

# SECURITY: Token must be provided via environment variable
TOKEN = os.environ.get("GITHUB_TOKEN", "")
if not TOKEN:
    print("❌ ERROR: GITHUB_TOKEN environment variable not set.")
    print("   Set it with: $env:GITHUB_TOKEN = 'your-token-here'")
    exit(1)

REPO = "21e8-miner/chrome-tamer"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
}

def update_repo_meta():
    print(f"--- Updating Metadata for {REPO} ---")
    
    # 1. Update Description & Homepage
    url = f"https://api.github.com/repos/{REPO}"
    payload = {
        "description": "A game-theoretic browser optimizer. Treats tabs as players in a non-cooperative resource game to enforce Nash Equilibrium for RAM usage.",
        "homepage": "https://chrome-tamer-beta-launch.loca.lt",
        "has_issues": True,
        "has_projects": True
    }
    resp = requests.patch(url, headers=HEADERS, json=payload)
    if resp.status_code == 200:
        print("✅ Description updated.")
    else:
        print(f"❌ Failed to update description: {resp.status_code} {resp.text}")

    # 2. Update Topics
    url_topics = f"https://api.github.com/repos/{REPO}/topics"
    payload_topics = {
        "names": ["performance", "chrome-extension", "game-theory", "memory-management", "nash-equilibrium", "browser-infrastructure"]
    }
    resp_topics = requests.put(url_topics, headers=HEADERS, json=payload_topics)
    if resp_topics.status_code == 200:
        print("✅ Topics updated.")
    else:
        print(f"❌ Failed to update topics: {resp_topics.status_code} {resp_topics.text}")

def create_release():
    print(f"--- Creating Release v2.2 ---")
    url = f"https://api.github.com/repos/{REPO}/releases"
    payload = {
        "tag_name": "v2.2",
        "target_commitish": "main",
        "name": "v2.2 (Nash Equilibrium)",
        "body": "Second public release with Dynamic RAM Pressure Gating.\n\n### Features\n* **Equilibrium-Driven Pruning**: Integrates `chrome.system.memory` for real-time pressure awareness.\n* **Resource Scarcity Pricing**: Costs scale exponentially with RAM pressure.\n* **Smoothed Pressure EMA**: Prevents pruning on transient spikes.",
        "draft": False,
        "prerelease": False,
        "generate_release_notes": True
    }
    resp = requests.post(url, headers=HEADERS, json=payload)
    if resp.status_code == 201:
        print("✅ Release created successfully.")
    else:
        print(f"❌ Failed to create release: {resp.status_code} {resp.text}")

def upload_asset(release_id, file_path):
    print(f"--- Uploading Asset {file_path} ---")
    file_name = os.path.basename(file_path)
    # GitHub uses a different domain for asset uploads
    url = f"https://uploads.github.com/repos/{REPO}/releases/{release_id}/assets?name={file_name}"
    
    headers = {
        **HEADERS,
        "Content-Type": "application/zip"
    }
    
    with open(file_path, "rb") as f:
        data = f.read()
        
    resp = requests.post(url, headers=headers, data=data)
    if resp.status_code == 201:
        print(f"✅ Asset {file_name} uploaded.")
    else:
        print(f"❌ Failed to upload asset: {resp.status_code} {resp.text}")

def get_latest_release():
    url = f"https://api.github.com/repos/{REPO}/releases/latest"
    resp = requests.get(url, headers=HEADERS)
    if resp.status_code == 200:
        return resp.json()["id"]
    return None

if __name__ == "__main__":
    update_repo_meta()
    
    # Try to get existing release or create it
    release_id = get_latest_release()
    if not release_id:
        create_release()
        release_id = get_latest_release()
    
    if release_id:
        zip_path = r"c:\Users\Bravias\.gemini\antigravity\playground\sidereal-solstice\webapp\dist\chrome_tamer_extension.zip"
        if os.path.exists(zip_path):
            upload_asset(release_id, zip_path)
        else:
            print(f"⚠️ Zip file not found at {zip_path}")
