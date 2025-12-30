import requests
import json
import time
from datetime import datetime
from pathlib import Path

# --- Configuration ---
SUBREDDITS = ["chrome", "pcmasterrace", "browsers", "techsupport", "windows"]
KEYWORDS = ["ram", "memory", "slow", "usage", "leak", "bloat", "lag", "cpu"]
PAIN_TRIGGERS = ["hate", "sucks", "eating", "gb", "gigabytes", "freeze", "crash"]
OUTPUT_FILE = Path("growth/leads.md")

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def analyze_post(post):
    title = post.get('title', '').lower()
    selftext = post.get('selftext', '').lower()
    content = f"{title} {selftext}"
    
    score = 0
    # 1. Relevance Score
    if any(k in content for k in KEYWORDS):
        score += 10
    else:
        return None # Irrelevant
        
    # 2. Pain Score (The "Perfect Client" Indicator)
    pain_hits = [p for p in PAIN_TRIGGERS if p in content]
    score += len(pain_hits) * 5
    
    # 3. Recency Boost (Hot leads)
    created_utc = post.get('created_utc', 0)
    hours_old = (time.time() - created_utc) / 3600
    if hours_old < 24:
        score += 20
    elif hours_old < 48:
        score += 10
        
    return {
        "title": post.get('title'),
        "url": post.get('url'),
        "author": post.get('author'),
        "subreddit": post.get('subreddit'),
        "score": score,
        "pain_points": pain_hits,
        "hours_old": round(hours_old, 1)
    }

def hunt_leads():
    print(f"🕵️ Starting Reddit RAM Hunter... Scanning {len(SUBREDDITS)} sectors.")
    all_leads = []
    
    for sub in SUBREDDITS:
        print(f"  > Scanning r/{sub}...")
        try:
            url = f"https://www.reddit.com/r/{sub}/new.json?limit=25"
            resp = requests.get(url, headers=headers)
            
            if resp.status_code != 200:
                print(f"    ! Error {resp.status_code}: Blocked or rate limited.")
                continue
                
            data = resp.json()
            posts = data.get('data', {}).get('children', [])
            
            for p in posts:
                post_data = p.get('data', {})
                analysis = analyze_post(post_data)
                if analysis and analysis['score'] >= 20: # Quality Threshold
                    all_leads.append(analysis)
                    
            time.sleep(1) # Be polite
            
        except Exception as e:
            print(f"    ! Failed to scan {sub}: {e}")

    # Sort by 'Pain Score' (Highest first)
    all_leads.sort(key=lambda x: x['score'], reverse=True)
    
    generate_report(all_leads)

def generate_report(leads):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    md_content = f"# 🏹 Reddit Hunter: Active High-Value Targets\n"
    md_content += f"*Scan Time: {timestamp} | Total High-Quality Leads: {len(leads)}*\n\n"
    
    if not leads:
        md_content += "No active complaints found in the last batch. The world is too quiet...\n"
    
    for lead in leads:
        pain_badge = "🔥 CRITICAL" if lead['score'] > 40 else "⚠️ HIGH"
        md_content += f"### {pain_badge} [{lead['hours_old']}h ago] {lead['title']}\n"
        md_content += f"- **Subreddit**: r/{lead['subreddit']}\n"
        md_content += f"- **Pain Triggers**: {', '.join(lead['pain_points']) if lead['pain_points'] else 'Standard Lag'}\n"
        md_content += f"- **Action Link**: [Reply Here]({lead['url']})\n"
        md_content += f"- **Suggested Pitch**: *\"I saw you're struggling with RAM. I built a free extension that uses the native Discard API to fix exactly this. Try Focus Mode: [Link]\"*\n"
        md_content += "---\n"
        
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(md_content)
        
    print(f"\n✅ Hunt Complete. {len(leads)} targets identified. Report saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    hunt_leads()
