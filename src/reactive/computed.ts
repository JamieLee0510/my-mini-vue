import { isFunction } from '../utils'
import { watchEffect, watchTrack, watchTrigger } from './watchEffect'

export function computed(getterOrObject) {
    let getter, setter
    if (isFunction(getterOrObject)) {
        getter = getterOrObject
        setter = () => {
            console.warn('computed value is readonly')
        }
    } else {
        getter = getterOrObject.getter
        setter = getterOrObject.setter
    }
    return new ComplutedImpl(getter, setter)
}

class ComplutedImpl {
    private _dirty: boolean
    private _value: any
    private effect: () => any
    private _setter: any
    constructor(getter, setter) {
        this._value = undefined
        this._setter = setter
        this._dirty = true // 依賴有沒有更新的flag
        this.effect = watchEffect(getter, {
            lazy: true,
            scheduler: () => {
                // 調度器，讓computed在數據有更新(dirty=fasle)時，觸發effect trigger
                if (!this._dirty) {
                    this._dirty = true
                    watchTrigger(this, 'value')
                }
            },
        })
    }

    get value() {
        if (this._dirty) {
            // re-calculate value
            this._value = this.effect() // 重新計算
            this._dirty = false
            watchTrack(this, 'value')
        }
        return this._value
    }

    set value(newValue) {
        this._setter(newValue)
    }
}
