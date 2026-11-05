import os
import sys
import io
from PIL import Image, ImageFilter, ImageEnhance
import minio

minio_client = minio.Minio(
    'minio:9000',
    access_key='minioadmin',
    secret_key='minioadmin',
    secure=False
)

BUCKET = 'product-images'

# Files to convert: those that exist as PNG in MinIO but DB now expects JPG
files_to_convert = ['H-07.png', 'H-08.png', 'MS-03.png']

print('Converting remaining PNGs to JPG...')

for fname in files_to_convert:
    try:
        # Download from MinIO
        response = minio_client.get_object('product-images', f'products/{fname}')
        img_bytes = response.read()
        response.close()
        response.release_conn()
        
        # Convert
        img = Image.open(io.BytesIO(img_bytes))
        if img.mode in ('RGBA', 'LA', 'P'):
            bg = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            bg.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = bg
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Upscale 2x
        new_w, new_h = img.width * 2, img.height * 2
        img = img.resize((new_w, new_h), Image.LANCZOS)
        
        # Sharpen
        img = img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=150, threshold=3))
        
        # Enhance
        img = ImageEnhance.Contrast(img).enhance(1.1)
        img = ImageEnhance.Sharpness(img).enhance(1.2)
        
        # Save as JPEG
        out_bytes = io.BytesIO()
        img.save(out_bytes, format='JPEG', quality=90, optimize=True)
        out_bytes.seek(0)
        
        # Upload as JPG
        new_name = fname.replace('.png', '.jpg')
        out_bytes.seek(0)
        minio_client.put_object(
            'product-images',
            f'products/{new_name}',
            out_bytes,
            length=out_bytes.getbuffer().nbytes,
            content_type='image/jpeg'
        )
        print(f'Converted and uploaded {fname} -> {new_name}')
        
    except Exception as e:
        print(f'Error converting {fname}: {e}')

print('Done!')