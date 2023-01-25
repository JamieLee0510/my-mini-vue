import { hasChange, isObject } from '../utils'
import { reactive } from './reactive'
import { watchTrack, watchTrigger } from './watchEffect'

export function ref(value) {
    if (isRef(value)) return value
    return new RefImpl(value)
}

function isRef(value) {
    return !!(value && value._isRef)
}

class RefImpl {
    private _isRef: boolean
    private _value: any

    constructor(value) {
        this._isRef = true
        this._value = isObject(value) ? reactive(value) : value
    }

    get value() {
        watchTrack(this, 'value')
        return this._value
    }

    set value(newValue) {
        if (hasChange(newValue, this._value)) {
            watchTrigger(this, 'value')
            this._value = isObject(newValue) ? reactive(newValue) : newValue
        }
    }
}
