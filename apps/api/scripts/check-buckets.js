const Minio = require('minio');
const client = new Minio.Client({
  endPoint: 'localhost',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
});

// Try listObjects with just bucket name
console.log('=== Listing product-images (V1) ===');
client.listObjects('product-images', function(err, items) {
  if (err) { console.error('Error:', err.message); }
  else {
    let count = 0;
    items.forEach(function(item) { 
      count++; 
      if (count <= 5) console.log(' -', item.key);
    });
    console.log('Total:', count);
  }
  
  console.log('\\n=== Listing goldcontinent-media (V1) ===');
  client.listObjects('goldcontinent-media', function(err2, items2) {
    if (err2) { console.error('Error:', err2.message); }
    else {
      let count2 = 0;
      items2.forEach(function(item) { 
        count2++; 
        if (count2 <= 5) console.log(' -', item.key);
      });
      console.log('Total:', count2);
    }
  });
});