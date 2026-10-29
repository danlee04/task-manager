from database import Base, engine
from models import Task

print("Creating database tables...")

Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")
print(f"Tables: {list(Base.metadata.tables.keys())}")
