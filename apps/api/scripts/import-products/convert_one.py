import io
import minio
from PIL import Image, ImageFilter, ImageEnhance

mc = minio.Minio('minio:9000', access_key='minioadmin', secret_key='minioadmin', secure=False)

fname = 'RYG9-J-02.png'
resp = mc.get_object('product-images', f'products/{fname}')
img_bytes = resp.read()
resp.close()
resp.release_conn()

img = Image.open(io.BytesIO(img_bytes))
if img.mode in ('RGBA', 'LA', 'P'):
    bg = Image.new('RGB', img.size, (255, 255, 255))
    if img.mode == 'P':
        img = img.convert('RGBA')
    bg.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
    img = bg
elif img.mode != 'RGB':
    img = img.convert('RGB')

img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)
img = img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=150, threshold=3))
from PIL import ImageEnhance
img = ImageEnhance.Contrast(img).enhance(1.1)
img = ImageEnhance.Sharpness(img).enhance(1.2)

out = io.BytesIO()
img.save(out, format='JPEG', quality=90, optimize=True)
out.seek(0)

mc = minio.Minio('minio:9000', access_key='minioadmin', secret_key='minioadmin', secure=False)
mc.put_object('product-images', 'products/RYG9-J-02.jpg', out, length=out.getbuffer().nbytes, content_type='image/jpeg')
print('Converted and uploaded RYG9-J-02.png -> RYG9-J-02.jpg')