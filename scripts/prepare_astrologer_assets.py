import os
from PIL import Image

artifact_dir = r"C:\Users\user\.gemini\antigravity\brain\a8e399c1-d15e-46b8-9701-70e6dbb6a6d8"
dest_dir = r"E:\rea\assets\astrologers"
masters_dir = os.path.join(dest_dir, "masters")

os.makedirs(dest_dir, exist_ok=True)
os.makedirs(masters_dir, exist_ok=True)

portraits = [
    {
        "src": os.path.join(artifact_dir, "acharya_devratan_1793223693295.jpg"),
        "webp": os.path.join(dest_dir, "acharya-devratan.webp"),
        "jpg_master": os.path.join(masters_dir, "acharya-devratan-master.jpg"),
        "name": "Acharya Devratan"
    },
    {
        "src": os.path.join(artifact_dir, "dr_sunita_shastri_1793223710815.jpg"),
        "webp": os.path.join(dest_dir, "dr-sunita-shastri.webp"),
        "jpg_master": os.path.join(masters_dir, "dr-sunita-shastri-master.jpg"),
        "name": "Dr. Sunita Shastri"
    },
    {
        "src": os.path.join(artifact_dir, "pandit_raghavendra_1793223730341.jpg"),
        "webp": os.path.join(dest_dir, "pandit-raghavendra.webp"),
        "jpg_master": os.path.join(masters_dir, "pandit-raghavendra-master.jpg"),
        "name": "Pandit Raghavendra"
    }
]

print("Converting and optimizing portraits...")
for p in portraits:
    with Image.open(p["src"]) as img:
        print(f"\n{p['name']}:")
        print(f"  Source Dimensions: {img.size[0]}x{img.size[1]} ({img.format})")
        
        # Save master copy
        img.save(p["jpg_master"], "JPEG", quality=95)
        print(f"  Saved master copy: {p['jpg_master']} ({os.path.getsize(p['jpg_master'])} bytes)")
        
        # Save high quality webp
        img.save(p["webp"], "WEBP", quality=88, method=6)
        print(f"  Saved WebP: {p['webp']} ({os.path.getsize(p['webp'])} bytes)")

print("\nAll assets prepared successfully!")
