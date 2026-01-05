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
    print(f"--- Creating Release v2.1 ---")
    url = f"https://api.github.com/repos/{REPO}/releases"
    payload = {
        "tag_name": "v2.1",
        "target_commitish": "main",
        "name": "v2.1 (Nash Equilibrium)",
        "body": "First public release of the Equilibrium-Driven Pruning engine.\n\n### Features\n* **Nash Equilibrium Logic**: Replaces timers with Utility Scores.\n* **Hyperfocus Mode**: Middle-out compression for maximum RAM reclamation.\n* **Live Debugger**: View internal utility calculations in real-time.",
        "draft": False,
        "prerelease": False,
        "generate_release_notes": True
    }
    resp = requests.post(url, headers=HEADERS, json=payload)
    if resp.status_code == 201:
        print("✅ Release created successfully.")
    else:
        print(f"❌ Failed to create release: {resp.status_code} {resp.text}")

if __name__ == "__main__":
    update_repo_meta()
    create_release()
