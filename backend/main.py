from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from dependencies import get_db
from models import Task
from schemas import TaskCreate, TaskResponse, TaskUpdate


app = FastAPI(
    title="Task Manager API",
    description="Backend API for our Task Manager mobile app",
    version="1.0.0",
)


# General endpoints

@app.get("/")
def root():
    return {"message": "Task Manager API is running!"}


@app.get("/api/v1/health")
def health_check():
    return {"status": "healthy"}


@app.get("/api/v1/db-check")
def database_check(db: Session = Depends(get_db)):
    database_name = db.execute(
        text("SELECT current_database()")
    ).scalar_one()

    return {
        "status": "connected",
        "database": database_name,
    }


# Task endpoints

@app.post(
    "/api/v1/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
):
    task = Task(
        title=task_data.title.strip(),
        description=task_data.description,
    )

    if not task.title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Task title cannot be empty.",
        )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task


@app.get("/api/v1/tasks", response_model=list[TaskResponse])
def list_tasks(db: Session = Depends(get_db)):
    tasks = db.query(Task).order_by(Task.id.desc()).all()
    return tasks


@app.patch(
    "/api/v1/tasks/{task_id}",
    response_model=TaskResponse,
)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db),
):
    task = db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    update_data = task_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    return task

@app.delete(
    "/api/v1/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
):
    task = db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    db.delete(task)
    db.commit()
