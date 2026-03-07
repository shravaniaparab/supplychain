import psycopg2
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bsas_supplychain.settings')
import django
django.setup()
from django.conf import settings

db = settings.DATABASES['default']
conn = psycopg2.connect(
    host=db['HOST'],
    database=db['NAME'],
    user=db['USER'],
    password=db['PASSWORD'],
    port=db['PORT']
)
cursor = conn.cursor()

# Check all columns in cropbatch table
cursor.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'supplychain_cropbatch'
    ORDER BY ordinal_position
""")
print("All columns in supplychain_cropbatch:")
for row in cursor.fetchall():
    print(f"  {row[0]}")

cursor.close()
conn.close()
