"""
fix_images.py — Regenerate expired Together.xyz images → upload to Supabase Storage
"""
import os, time, requests
from supabase import create_client

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SECRET"]
TOGETHER_KEY = os.environ["TOGETHER_API_KEY"]

SERVICE_PROMPTS = {
    "std":     "A clean, professional medical clinic interior with soft green tones, privacy curtains, and modern equipment, Thai healthcare setting, no text",
    "glp1":    "A healthy lifestyle scene with fresh vegetables, a measuring tape, and soft green medical aesthetic, weight management clinic, no text",
    "ckd":     "A calm kidney health clinic with blue and green tones, medical charts, and caring doctor, Thai hospital setting, no text",
    "foreign": "A multicultural healthcare setting with diverse workers getting health checkups, professional clinic, green tones, no text",
    "general": "A modern Thai healthcare clinic with welcoming green interior, professional staff, calm atmosphere, no text",
}

def get_sb():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def generate_image(title: str, service: str):
    prompt = f"{SERVICE_PROMPTS.get(service, SERVICE_PROMPTS['general'])}. Context: {title[:80]}"
    try:
        resp = requests.post(
            "https://api.together.xyz/v1/images/generations",
            headers={"Authorization": f"Bearer {TOGETHER_KEY}", "Content-Type": "application/json"},
            json={"model": "black-forest-labs/FLUX.1-schnell", "prompt": prompt,
                  "width": 1200, "height": 624, "steps": 4, "n": 1},
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["data"][0]["url"]
    except Exception as e:
        print(f"  ❌ Image gen failed: {e}")
        return None

def upload_to_storage(image_url: str, post_id: str) -> str:
    img = requests.get(image_url, timeout=30)
    img.raise_for_status()
    sb = get_sb()
    file_path = f"blog/{post_id}.jpg"
    sb.storage.from_("images").upload(
        file_path, img.content,
        {"content-type": "image/jpeg", "upsert": "true"},
    )
    return sb.storage.from_("images").get_public_url(file_path)

def main():
    sb = get_sb()
    posts = sb.table("posts").select("id,slug,title,service").eq("status", "published").execute().data
    print(f"Found {len(posts)} posts to fix\n")

    for i, post in enumerate(posts):
        print(f"[{i+1}/{len(posts)}] {post['title'][:50]}")
        image_url = generate_image(post["title"], post["service"])
        if not image_url:
            print("  ⚠️ Skip\n")
            continue

        print(f"  ✅ Generated — uploading...")
        permanent_url = upload_to_storage(image_url, post["id"])
        sb.table("posts").update({"image_url": permanent_url}).eq("id", post["id"]).execute()
        print(f"  ☁️  Saved: {permanent_url[:60]}...\n")
        time.sleep(2)  # rate limit

    print("Done!")

if __name__ == "__main__":
    main()
