import sqlite3
     import os

     def init_db():
         db_path = os.getenv('SQLITE_DB_PATH', 'epharma.db')
         conn = sqlite3.connect(db_path)
         with open('database_schema.sql', 'r') as f:
             conn.executescript(f.read())
         conn.commit()
         conn.close()

     if __name__ == '__main__':
         init_db()
