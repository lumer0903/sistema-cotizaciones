import os
import sys
import io
import psycopg2
import psycopg2.extras
import minio

def get_all_images(dir_path):
    results = []
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                full_path = os.path.join(root, file)
                results.append({'name': file, 'fullPath': os.path.join(root, file)})
    return results

def get_mime_type(ext):
    ext = ext.lower()
    if ext == '.png':
        return 'image/png'
    elif ext == '.webp':
        return 'image/webp'
    elif ext in ('.jpg', '.jpeg'):
        return 'image/jpeg'
    else:
        return 'image/jpeg'

def main():
    print('=== IMPORTING PRODUCT IMAGES ===')
    
    minio_client = minio.Minio(
        'minio:9000',
        access_key='minioadmin',
        secret_key='minioadmin',
        secure=False
    )
    
    # Ensure bucket exists
    try:
        if not minio_client.bucket_exists('product-images'):
            minio_client.make_bucket('product-images', 'us-east-1')
            print('Bucket created')
    except Exception as e:
        print('Bucket check error:', e)
    
    images_dir = '/app/IMAGENES-FLORES'
    print('Scanning images...')
    all_images = []
    for root, dirs, files in os.walk('/app/IMAGENES-FLORES'):
        for file in files:
            if file.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                full_path = os.path.join(root, file)
                all_images.append({'name': file, 'fullPath': os.path.join(root, file)})
    
    print('Total images found:', len(all_images))

    img_by_base_name = {}
    img_by_lower_name = {}

    for img in all_images:
        lower = img['name'].lower()
        if lower not in img_by_lower_name:
            img_by_lower_name[lower] = img
        base = os.path.splitext(img['name'])[0].lower()
        if base not in img_by_base_name:
            img_by_base_name[base] = img

    print('Indexed', len(img_by_base_name), 'unique image base names')

    # Connect to database directly
    conn = psycopg2.connect(
        host='postgres',
        database='goldcontinent',
        user='goldcontinent',
        password='goldcontinent_dev'
    )
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    cur.execute("SELECT id_producto, codigo FROM productos")
    products = cur.fetchall()
    print('Products in DB:', len(products))

    uploaded = 0
    skipped = 0

    for prod in products:
        prod_id = prod['id_producto']
        codigo = prod['codigo']
        code_lower = codigo.lower()
        matched_image = None
        
        # Strategy 1: exact match on base name
        matched_image = img_by_base_name.get(code_lower)
        
        # Strategy 2: exact match on full name
        if not matched_image:
            for k in img_by_lower_name:
                if k == code_lower:
                    matched_image = img_by_lower_name[k]
                    break
        
        # Strategy 3: substring match on base name
        if not matched_image:
            match = None
            for k in img_by_base_name:
                if code_lower in k:
                    match = k
                    break
            if match:
                matched_image = img_by_base_name[match]
        
        # Strategy 4: substring match on full name
        if not matched_image:
            match = None
            for k in img_by_lower_name:
                if code_lower in k:
                    match = k
                    break
            if match:
                matched_image = img_by_lower_name[match]

        if not matched_image:
            skipped += 1
            continue

        try:
            with open(matched_image['fullPath'], 'rb') as f:
                file_data = f.read()
            
            ext = os.path.splitext(matched_image['name'])[1].lower()
            
            if ext == '.png':
                mimetype = 'image/png'
            elif ext == '.webp':
                mimetype = 'image/webp'
            elif ext in ('.jpg', '.jpeg'):
                mimetype = 'image/jpeg'
            else:
                mimetype = 'image/jpeg'
            
            ext_with_dot = os.path.splitext(matched_image['name'])[1]
            object_name = 'products/' + codigo + ext_with_dot
            
            minio_client.put_object(
                'product-images',
                object_name,
                io.BytesIO(file_data),
                length=len(file_data),
                content_type=mimetype
            )
            
            url = 'http://localhost:9000/product-images/' + object_name
            
            cur.execute(
                "UPDATE productos SET foto_url = %s WHERE id_producto = %s",
                (url, prod_id)
            )
            conn.commit()
            
            uploaded += 1
            if uploaded % 50 == 0:
                print('Progress:', uploaded, 'uploaded')
                
        except Exception as error:
            print('Error uploading for', codigo, ':', error)
            conn.rollback()
            continue

    cur.execute("SELECT count(*) FROM productos WHERE foto_url IS NOT NULL")
    with_images = cur.fetchone()['count']
    print()
    print('=== IMAGE IMPORT COMPLETE ===')
    print('Uploaded:', uploaded)
    print('Skipped:', skipped)
    print('Products with images:', with_images)

    conn.close()

if __name__ == '__main__':
    import io
    import psycopg2
    import psycopg2.extras
    import minio
    import os
    main()