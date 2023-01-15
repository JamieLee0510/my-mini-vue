const queue: any[] = []
let isFlushing = false

export function queueJob(job) {
    if (!queue.length || !queue.includes(job)) {
        queue.push(job)
        queueFlush()
    }
}
function queueFlush() {
    if (!isFlushing) {
        isFlushing = true
        Promise.resolve().then(() => {
            //flush jobs
            flushJobs()
            isFlushing = false
        })
    }
}

function flushJobs() {
    try {
        for (let i = 0; i < queue.length; i++) {
            const job = queue[i]
            job()
        }
    } finally {
        isFlushing = false
        queue.length = 0 // empty the queue
    }
}
