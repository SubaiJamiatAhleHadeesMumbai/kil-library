from database import engine
from sqlalchemy import text

conn = engine.connect()
sql = "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name IN ('Education','SocialActivities') ORDER BY column_name"
result = conn.execute(text(sql))
print([row[0] for row in result.fetchall()])
conn.close()
