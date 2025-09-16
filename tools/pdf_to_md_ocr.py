import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import os

pdf_path = "D:/operait/backend/data/fitness_connection/training_coaching_manager_tenant_0912325.pdf"
output_md_path = "D:/operait/backend/data/fitness_connection/training_coaching_manager_tenant_0912325_ocr.md"
doc = fitz.open(pdf_path)
text_blocks = []

for page_num in range(len(doc)):
    # Render page as image
    pix = doc[page_num].get_pixmap(dpi=300)  
    img = Image.open(io.BytesIO(pix.tobytes("png")))

    # Run OCR
    page_text = pytesseract.image_to_string(img, lang="eng")  
    text_blocks.append(page_text.strip())

# Join with Markdown page separators
md_content = "\n\n---\n\n".join(text_blocks)

with open(output_md_path, "w", encoding="utf-8") as f:
    f.write(md_content)

print(f"OCR-cleaned Markdown saved to {output_md_path}")
