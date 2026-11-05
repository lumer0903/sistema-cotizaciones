import os
import io
import sys
import minio
from PIL import Image, ImageFilter, ImageEnhance

# MinIO client
minio_client = minio.Minio(
    'minio:9000',
    access_key='minioadmin',
    secret_key='minioadmin',
    secure=False
)

BUCKET = 'product-images'

def upscale_image(image_bytes, scale=2):
    """Upscale image using LANCZOS resampling with sharpening."""
    img = Image.open(io.BytesIO(image_bytes))
    
    # Convert to RGB if needed
    if img.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Calculate new size (2x or 3x)
    new_width = img.width * scale
    new_height = img.height * scale
    
    # Upscale with LANCZOS (high-quality resampling)
    img = img.resize((new_width, new_height), Image.LANCZOS)
    
    # Apply unsharp mask for sharpening
    img = img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=150, threshold=3))
    
    # Enhance contrast slightly
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.1)
    
    # Enhance sharpness
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(1.2)
    
    # Save to bytes
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=90, optimize=True)
    output.seek(0)
    return output.getvalue()

def main():
    print('=== UPSCALING IMAGES IN MINIO ===')
    
    minio_client = minio.Minio(
        'minio:9000',
        access_key='minioadmin',
        secret_key='minioadmin',
        secure=False
    )
    
    BUCKET = 'product-images'
    
    # List all objects in bucket
    print('Listing objects...')
    objects = list(minio_client.list_objects(BUCKET, recursive=True))
    print(f'Found {len(objects)} objects')
    
    upscaled = 0
    skipped = 0
    errors = 0
    
    for obj in objects:
        obj_name = obj.object_name
        if not obj_name.startswith('products/'):
            continue
            
        try:
            # Download image
            response = minio_client.get_object(BUCKET, obj_name)
            image_bytes = response.read()
            response.close()
            response.release_conn()
            
            # Check if already large enough (skip if > 50KB)
            if len(image_bytes) > 50000:
                skipped += 1
                continue
            
            # Upscale
            upscaled_bytes = upscale_image(image_bytes, scale=2)
            
            # Determine content type
            if obj_name.lower().endswith('.png'):
                content_type = 'image/png'
                # Save as JPEG for better compression at higher quality
                upscaled_img = Image.open(io.BytesIO(upscaled_bytes))
                if upscaled_img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', upscaled_img.size, (255, 255, 255))
                    if upscaled_img.mode == 'P':
                        upscaled_img = upscaled_img.convert('RGBA')
                    background.paste(upscaled_img, mask=upscaled_img.split()[-1] if upscaled_img.mode in ('RGBA', 'LA') else None)
                    upscaled_img = background
                output = io.BytesIO()
                upscaled_img.save(output, format='JPEG', quality=90, optimize=True)
                upscaled_bytes = output.getvalue()
                content_type = 'image/jpeg'
                # Update object name to .jpg
                new_obj_name = obj_name.rsplit('.', 1)[0] + '.jpg'
            else:
                content_type = 'image/jpeg'
                new_obj_name = obj_name
            
            # Upload upscaled version (overwrite)
            minio_client.put_object(
                'product-images',
                new_obj_name,
                io.BytesIO(upscaled_bytes),
                length=len(upscaled_bytes),
                content_type=content_type
            )
            
            # If renamed, delete old object
            if new_obj_name != obj_name:
                try:
                    minio_client.remove_object(BUCKET, obj_name)
                except:
                    pass
            
            upscaled += 1
            if upscaled % 50 == 0:
                print(f'Progress: {upscaled} upscaled, {skipped} skipped, {errors} errors')
                
        except Exception as e:
            errors += 1
            print(f'Error upscaling {obj_name}: {e}')
    
    print(f'\n=== UPSCALING COMPLETE ===')
    print(f'Upscaled: {upscaled}')
    print(f'Skipped (already large): {skipped}')
    print(f'Errors: {errors}')

if __name__ == '__main__':
    import io
    main()