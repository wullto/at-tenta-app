#!/usr/bin/env python3
"""Extract images from AT-prov maj 2016 questions PDF."""
import fitz
import os

pdf_path = "/Users/olofwullt/Documents/AT-tenta-app/Tentor PDF/eAT_prov_maj_2016_fragor.pdf"
out_dir = "/Users/olofwullt/Documents/AT-tenta-app/public/images/exams/2016-05/"
os.makedirs(out_dir, exist_ok=True)

doc = fitz.open(pdf_path)

# Page 14 (index 13): EKG limb leads (I, II, III, aVR, aVL, aVF) - context for page 2.4
# Page 15 (index 14): EKG chest leads (V1-V6) - questions 2.4.1 and 2.4.2
# Page 20 (index 19): Throat/tonsil photo - intro image for Fall 3, question 3.1.1

image_map = {
    13: "ekg-limb-leads.jpeg",
    14: "ekg-chest-leads.jpeg",
    19: "hals-tonsillit.jpeg",
}

for page_idx, filename in image_map.items():
    page = doc[page_idx]
    images = page.get_images(full=True)
    print(f"Page {page_idx+1}: {len(images)} image(s)")
    for img_info in images:
        xref = img_info[0]
        base_image = doc.extract_image(xref)
        ext = base_image["ext"]
        imgbytes = base_image["image"]
        out_path = os.path.join(out_dir, filename)
        with open(out_path, "wb") as f:
            f.write(imgbytes)
        print(f"  -> Saved {filename} ({len(imgbytes)} bytes, ext={ext})")

print("Done.")
