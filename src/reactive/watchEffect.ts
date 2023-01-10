import { LazyOption } from '../utils/types'

let activeEffect // global var for memorize effect
const effectStack: any[] = []

export function watchEffect(func, options = {} as LazyOption) {
    const watchFunc = () => {
        try {
            activeEffect = watchFunc //循環依賴？還是只是把heap指針傳到全局變量？
            effectStack.push(activeEffect)
            return func()
        } finally {
            effectStack.pop()
            activeEffect = effectStack[effectStack.length - 1]
        }
    }
    if (!options.lazy) {
        watchFunc()
    }

    if (options.scheduler) {
        watchFunc.scheduler = options.scheduler
    }
    return watchFunc
}

/**
 * targetMap 收集side-effect，並建立副作用和依賴之間的關係
 *
 * 一個副作用對象可能依賴多個響應式對象、
 * 一個響應式對象裡可能有多個屬性
 *
 * 因此targetMap結構設計如下：
 * { //an WeakMap
 *  [target]:{   // key是reactiveObj，value是一個object
 *      [key]:[] // key是reactiveObj 的鍵值，value是一個set，在set存儲副作用
 *               // 使用Set，是因為它可以存儲唯一值
 *  }
 * }
 *
 * 而使用weakmap的原因，是因為當reactive對象不存在後，weakmap會自動GC
 */
const targetMap = new WeakMap() //WeakMap只接受object當作key

export function watchTrack(target, key) {
    if (!activeEffect) return

    let depsMap = targetMap.get(target)
    // 假如沒有==init state，targetMap中創建new Map
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }

    let deps = depsMap.get(key)
    // 假如沒有==init state，depsMap 中創建new Set
    if (!deps) {
        depsMap.set(key, (deps = new Set()))
    }

    deps.add(activeEffect) // 建立依賴關係
}

export function watchTrigger(target, key) {
    const depsMap = targetMap.get(target)
    if (!depsMap) return

    const deps = depsMap.get(key)
    if (!deps) return

    deps.forEach((effectFunc) => {
        if (effectFunc.scheduler) {
            effectFunc.scheduler(effectFunc)
        } else {
            effectFunc()
        }
    })
}
