"use client"
async function TaskPage() {

    const response = await fetch("http://localhost:3000/api/tasks")
    const tasks = await response.json
    
    console.log(tasks);
  return (
    <div>TaskPage</div>
  )
}

export default TaskPage 