const queue: any[] = []
const resolvedPromise = Promise.resolve()
let currFlushPromise: Promise<void> | null = null
let isFlushing = false

export function nextTick(fn: () => void | null | undefined): Promise<void> {
    const p = currFlushPromise || resolvedPromise
    return fn == null ? p.then(fn) : p
}

export function queueJob(job) {
    if (!queue.length || !queue.includes(job)) {
        queue.push(job)
        queueFlush()
    }
}
function queueFlush() {
    if (!isFlushing) {
        isFlushing = true
        currFlushPromise = resolvedPromise.then(flushJobs)
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
        currFlushPromise = null
    }
}
