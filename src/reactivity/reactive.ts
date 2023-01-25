import { hasChange, isArray, isObject } from '../utils'
import { watchTrack, watchTrigger } from './watchEffect'

// in order to memorize
// 但基本上沒什麼用，因為在創建reactive時，是直接用創建的object
const proxyMap = new WeakMap()

export function reactive(target) {
    // if target is not an object, just return?
    if (!isObject(target)) return target

    if (isReactive(target)) return target

    if (proxyMap.has(target)) {
        return proxyMap.get(target)
    }

    const proxy = new Proxy(target, {
        get(target, key, receiver) {
            if (key == '__isReactive') return true

            const res = Reflect.get(target, key, receiver)
            watchTrack(target, key)
            //return res // 這個只代理了一層
            return isObject(res) ? reactive(res) : res // 不是object的話，不會被依賴（watchEffect 到）
        },
        set(target, key, newValue, receiver) {
            const oldValue = target[key]
            let oldLength = target.length
            const res = Reflect.set(target, key, newValue, receiver)

            // watchEffect trigger area
            if (hasChange(oldValue, newValue)) {
                watchTrigger(target, key)
                if (isArray(target) && hasChange(oldLength, target.length)) {
                    console.log('target.length, inside trigger:', target.length)
                    watchTrigger(target, 'length')
                }
            }

            return res
        },
    })

    proxyMap.set(target, proxy)

    return proxy
}

export function isReactive(target) {
    return !!(target && target.__isReactive)
}
