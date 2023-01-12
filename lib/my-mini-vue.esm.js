function isObject(target) {
    return typeof target === 'object' && target !== null;
}
function hasChange(oldValue, newValue) {
    return oldValue !== newValue && !(Number.isNaN(oldValue) && Number.isNaN(newValue));
}
function isArray(target) {
    return Array.isArray(target);
}
function isString(target) {
    return typeof target === 'string';
}
function isNumber(target) {
    return typeof target === 'number';
}
function isBoolean(target) {
    return typeof target === 'boolean';
}
function isFunction(target) {
    return typeof target == 'function';
}

var activeEffect; // global var for memorize effect
var effectStack = [];
function watchEffect(func, options) {
    if (options === void 0) { options = {}; }
    var watchFunc = function () {
        try {
            activeEffect = watchFunc; //循環依賴？還是只是把heap指針傳到全局變量？
            effectStack.push(activeEffect);
            return func();
        }
        finally {
            effectStack.pop();
            activeEffect = effectStack[effectStack.length - 1];
        }
    };
    if (!options.lazy) {
        watchFunc();
    }
    if (options.scheduler) {
        watchFunc.scheduler = options.scheduler;
    }
    return watchFunc;
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
var targetMap = new WeakMap(); //WeakMap只接受object當作key
function watchTrack(target, key) {
    if (!activeEffect)
        return;
    var depsMap = targetMap.get(target);
    // 假如沒有==init state，targetMap中創建new Map
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()));
    }
    var deps = depsMap.get(key);
    // 假如沒有==init state，depsMap 中創建new Set
    if (!deps) {
        depsMap.set(key, (deps = new Set()));
    }
    deps.add(activeEffect); // 建立依賴關係
}
function watchTrigger(target, key) {
    var depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    var deps = depsMap.get(key);
    if (!deps)
        return;
    deps.forEach(function (effectFunc) {
        if (effectFunc.scheduler) {
            effectFunc.scheduler(effectFunc);
        }
        else {
            effectFunc();
        }
    });
}

// in order to memorize
// 但基本上沒什麼用，因為在創建reactive時，是直接用創建的object
var proxyMap = new WeakMap();
function reactive(target) {
    // if target is not an object, just return?
    if (!isObject(target))
        return target;
    if (isReactive(target))
        return target;
    if (proxyMap.has(target)) {
        return proxyMap.get(target);
    }
    var proxy = new Proxy(target, {
        get: function (target, key, receiver) {
            if (key == '__isReactive')
                return true;
            var res = Reflect.get(target, key, receiver);
            watchTrack(target, key);
            //return res // 這個只代理了一層
            return isObject(res) ? reactive(res) : res; // 不是object的話，不會被依賴（watchEffect 到）
        },
        set: function (target, key, newValue, receiver) {
            var oldValue = target[key];
            var oldLength = target.length;
            var res = Reflect.set(target, key, newValue, receiver);
            // watchEffect trigger area
            if (hasChange(oldValue, newValue)) {
                watchTrigger(target, key);
                if (isArray(target) && hasChange(oldLength, target.length)) {
                    console.log('target.length, inside trigger:', target.length);
                    watchTrigger(target, 'length');
                }
            }
            return res;
        },
    });
    proxyMap.set(target, proxy);
    return proxy;
}
function isReactive(target) {
    return !!(target && target.__isReactive);
}

function ref(value) {
    if (isRef(value))
        return value;
    return new RefImpl(value);
}
function isRef(value) {
    return !!(value && value._isRef);
}
var RefImpl = /** @class */ (function () {
    function RefImpl(value) {
        this._isRef = true;
        this._value = isObject(value) ? reactive(value) : value;
    }
    Object.defineProperty(RefImpl.prototype, "value", {
        get: function () {
            watchTrack(this, 'value');
            return this._value;
        },
        set: function (newValue) {
            if (hasChange(newValue, this._value)) {
                watchTrigger(this, 'value');
                this._value = isObject(newValue) ? reactive(newValue) : newValue;
            }
        },
        enumerable: false,
        configurable: true
    });
    return RefImpl;
}());

function computed(getterOrObject) {
    var getter, setter;
    if (isFunction(getterOrObject)) {
        getter = getterOrObject;
        setter = function () {
            console.warn('computed value is readonly');
        };
    }
    else {
        getter = getterOrObject.getter;
        setter = getterOrObject.setter;
    }
    return new ComplutedImpl(getter, setter);
}
var ComplutedImpl = /** @class */ (function () {
    function ComplutedImpl(getter, setter) {
        var _this = this;
        this._value = undefined;
        this._setter = setter;
        this._dirty = true; // 依賴有沒有更新的flag
        this.effect = watchEffect(getter, {
            lazy: true,
            scheduler: function () {
                // 調度器，讓computed在數據有更新(dirty=fasle)時，觸發effect trigger
                if (!_this._dirty) {
                    _this._dirty = true;
                    watchTrigger(_this, 'value');
                }
            },
        });
    }
    Object.defineProperty(ComplutedImpl.prototype, "value", {
        get: function () {
            if (this._dirty) {
                // re-calculate value
                this._value = this.effect(); // 重新計算
                this._dirty = false;
                watchTrack(this, 'value');
            }
            return this._value;
        },
        set: function (newValue) {
            this._setter(newValue);
        },
        enumerable: false,
        configurable: true
    });
    return ComplutedImpl;
}());

var ShapeFlags;
(function (ShapeFlags) {
    ShapeFlags[ShapeFlags["ELEMENT"] = 1] = "ELEMENT";
    ShapeFlags[ShapeFlags["TEXT"] = 2] = "TEXT";
    ShapeFlags[ShapeFlags["FRAGMENT"] = 4] = "FRAGMENT";
    ShapeFlags[ShapeFlags["COMPONENT"] = 8] = "COMPONENT";
    ShapeFlags[ShapeFlags["TEXT_CHILDREN"] = 16] = "TEXT_CHILDREN";
    ShapeFlags[ShapeFlags["ARRAY_CHILDREN"] = 32] = "ARRAY_CHILDREN";
    ShapeFlags[ShapeFlags["CHILDREN"] = 48] = "CHILDREN";
})(ShapeFlags || (ShapeFlags = {}));

function render(vnode, container) {
    var prevVNode = container._vnode;
    console.log('prevVNode:', prevVNode);
    if (!vnode) {
        if (prevVNode) {
            unmount(prevVNode);
        }
    }
    else {
        patch(prevVNode, vnode, container);
    }
    container._vnode = vnode;
}
function unmount(vnode) {
    var _a;
    var shapeFlags = vnode.shapeFlags, el = vnode.el;
    if (shapeFlags & ShapeFlags.COMPONENT) {
        unmountComponent();
    }
    else if (shapeFlags & ShapeFlags.FRAGMENT) {
        unmountFragment();
    }
    else {
        (_a = el === null || el === void 0 ? void 0 : el.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(el);
    }
}
function patch(n1, n2, container, anchor) {
    console.log('patch anchor:', anchor);
    if (n1 && !isSameNode(n1, n2)) {
        unmount(n1);
        // n1 = null
    }
    var shapeFlags = n2.shapeFlags;
    if (shapeFlags & ShapeFlags.COMPONENT) ;
    else if (shapeFlags & ShapeFlags.TEXT) {
        processText(n1, n2, container, anchor);
    }
    else if (shapeFlags & ShapeFlags.FRAGMENT) {
        processFragment(n1, n2, container, anchor);
    }
    else {
        processElement(n1, n2, container, anchor);
    }
}
function isSameNode(n1, n2) {
    return n1.type === n2.type;
}
function processText(n1, n2, container, anchor) {
    if (n1) {
        n2.el = n1.el;
        n1.el.textContent = n2.children;
    }
    else {
        mountTextNode(n2, container, anchor);
    }
}
function processFragment(n1, n2, container, anchor) {
    // 建立兩個空的節點，讓fragment patch可以插入
    var fragmentStartAnchor = (n2.el = n1 ? n1.el : document.createTextNode(''));
    var fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : document.createTextNode(''));
    if (n1) {
        patchChildren(n1, n2, container, fragmentEndAnchor);
    }
    else {
        container.insertBefore(fragmentStartAnchor, anchor);
        container.insertBefore(fragmentEndAnchor, anchor);
        // 確保新插入的children在fragmentEndAnchor之前
        mountChildren(n2.children, container, fragmentEndAnchor);
    }
}
function processElement(n1, n2, container, anchor) {
    if (n1 == null) {
        // or UpdateElement
        mountElement(n2, container, anchor);
    }
    else {
        // TODO
        patchElement(n1, n2);
    }
}
function mountTextNode(vnode, container, anchor) {
    var textNode = document.createTextNode(vnode.children);
    container.insertBefore(textNode, anchor);
    vnode.el = textNode; // vnode 記錄掛載的真實的dom節點
}
function mountElement(vnode, container, anchor) {
    var shapeFlags = vnode.shapeFlags, type = vnode.type, props = vnode.props, children = vnode.children;
    var el = document.createElement(type);
    //mountProps(props!, el)
    patchProps(null, props, el);
    if (shapeFlags & ShapeFlags.TEXT_CHILDREN) {
        mountTextNode(vnode, el);
    }
    else if (shapeFlags & ShapeFlags.ARRAY_CHILDREN) {
        // 这里不能传anchor。因为anchor限制的是当前的element
        // 作为本element的children，不用指定anchor，append就行
        mountChildren(children, el);
    }
    // container.appendChild(el)
    container.insertBefore(el, anchor);
    vnode.el = el; // vnode 記錄掛載的真實的dom節點
}
var domPropsRE = /[A-Z]|^(value|checked|selected|muted|disabled)$/;
// function mountProps(props: Object, el: HTMLElement) {
//     for (const key in props) {
//         let value = props[key]
//         switch (key) {
//             case 'class':
//                 el.className = value
//                 break
//             case 'style':
//                 for (const styleName in value) {
//                     el.style[styleName] = value[styleName]
//                 }
//                 break
//             default:
//                 // deal with event
//                 if (/^on[^a-z]/.test(key)) {
//                     const eventName = key.slice(2).toLowerCase()
//                     el.addEventListener(eventName, value)
//                 } else if (domPropsRE.test(key)) {
//                     // need setAttribue key
//                     // deal with {'checked':''}
//                     if (value == '' && isBoolean(el[key])) {
//                         value = true
//                         el[key] = value
//                     } else {
//                         if (value == null || value === false) {
//                             // 像是移除disable
//                             el.removeAttribute(key)
//                         } else {
//                             el.setAttribute(key, value)
//                         }
//                     }
//                 } else {
//                     // like id
//                     el[key] = value
//                 }
//                 break
//         }
//     }
// }
function mountChildren(children, container, anchor) {
    children.forEach(function (child) {
        patch(null, child, container, anchor);
    });
}
function unmountComponent(vnode) {
    throw new Error('Function not implemented.');
}
function unmountFragment(vnode) {
    throw new Error('Function not implemented.');
}
function unmountChildren(children) {
    children.forEach(function (child) {
        unmount(child);
    });
}
// patchElement不需要anchor??
function patchElement(n1, n2) {
    n2.el = n1.el;
    patchProps(n1.props, n2.props, n2.el);
    patchChildren(n1, n2, n2.el);
}
function patchProps(oldProps, newProps, el) {
    if (oldProps === newProps) {
        return;
    }
    oldProps = oldProps || {};
    newProps = newProps || {}; // 不用ES6的默認寫法，是因為可能為null、就沒辦法賦值
    for (var key in newProps) {
        var nextValue = newProps[key];
        var prevValue = oldProps[key];
        if (prevValue == nextValue) {
            patchDomProps(prevValue, nextValue, key, el);
        }
    }
    for (var key in oldProps) {
        if (newProps[key] == null) {
            patchDomProps(oldProps[key], null, key, el);
        }
    }
}
function patchDomProps(prev, next, key, el) {
    switch (key) {
        case 'class':
            el.className = next || '';
            break;
        case 'style':
            for (var styleName in next) {
                el.style[styleName] = next[styleName];
            }
            // 去除掉prev中的css屬性（而且next沒有的屬性）
            if (prev) {
                for (var styleName in prev) {
                    if (next[styleName] == null) {
                        el.style[styleName] = '';
                    }
                }
            }
            break;
        default:
            // deal with event
            if (/^on[^a-z]/.test(key)) {
                var eventName = key.slice(2).toLowerCase();
                if (prev) {
                    el.removeEventListener(eventName, prev);
                }
                if (next) {
                    el.addEventListener(eventName, next);
                }
            }
            else if (domPropsRE.test(key)) {
                // need setAttribue key
                // deal with {'checked':''}
                if (next == '' && isBoolean(el[key])) {
                    next = true;
                    el[key] = next;
                }
                else {
                    if (next == null || next === false) {
                        // 像是移除disable
                        el.removeAttribute(key);
                    }
                    else {
                        el.setAttribute(key, next);
                    }
                }
            }
            else {
                // like id
                el[key] = next;
            }
            break;
    }
}
function patchChildren(n1, n2, container, anchor) {
    var prevShapeFlag = n1.shapeFlags, c1 = n1.children;
    var nextShapeFlag = n2.shapeFlags, c2 = n2.children;
    if (nextShapeFlag & ShapeFlags.TEXT) {
        //n2 is text-node
        if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            unmountChildren(c1);
        }
        if (c1 !== c2) {
            container.textContent = c2;
        }
    }
    else if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // n2 is array-children
        if (prevShapeFlag & ShapeFlags.TEXT) {
            container.textContent = '';
        }
        else if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            patchArrayChildren(c1, c2, container, anchor);
        }
        else {
            mountChildren(c2, container);
        }
    }
    else {
        //n2 null
        if (prevShapeFlag & ShapeFlags.TEXT) {
            container.textContent = '';
        }
        else if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            unmountChildren(c1);
        }
    }
}
function patchArrayChildren(c1, c2, container, anchor) {
    var oldLength = c1.length;
    var newLength = c2.length;
    var commonLength = Math.min(oldLength, newLength);
    for (var i = 0; i < commonLength; i++) {
        patch(c1[i], c2[i], container, anchor);
    }
    if (oldLength > newLength) {
        unmountChildren(c1.slice(commonLength));
    }
    else if (oldLength < newLength) {
        // should anchor??
        mountChildren(c2.slice(commonLength), container, anchor);
    }
}

var Text = Symbol('text');
var Fragment = Symbol('Fragment');
/**
 *
 * @param type
 * @param props
 * @param children
 * @returns VNode
 */
function h(type, props, children) {
    var shapeFlags;
    if (isString(type)) {
        shapeFlags = ShapeFlags.ELEMENT;
    }
    else if (type == Text) {
        shapeFlags = ShapeFlags.TEXT;
    }
    else if (type == Fragment) {
        shapeFlags = ShapeFlags.FRAGMENT;
    }
    else {
        shapeFlags = ShapeFlags.COMPONENT;
    }
    if (isString(children) || isNumber(children)) {
        shapeFlags |= ShapeFlags.TEXT_CHILDREN;
        children = children.toString();
    }
    else if (isArray(children)) {
        shapeFlags |= ShapeFlags.ARRAY_CHILDREN;
    }
    return {
        type: type,
        props: props,
        children: children,
        shapeFlags: shapeFlags,
    };
}

var observe1 = (window.observed = reactive({ count1: 1, count2: 2 }));
var observeArr = (window.observedArr = reactive([1]));
var observeRef = (window.observedRef = ref(1));
(window.computedData = computed(function () {
    console.log('computed!');
    return observeRef.value * 2;
}));
watchEffect(function () {
    console.log("current value: ".concat(observeRef.value));
});
watchEffect(function () {
    console.log("current arr length: ".concat(observeArr.length));
});
watchEffect(function () {
    watchEffect(function () {
        console.log("---watchEffect--count2:".concat(observe1.count2));
    });
    console.log("---watchEffect--count1:".concat(observe1.count1));
});
var demoVNode2 = h('ui', null, [
    h('li', null, 'first'),
    h(Fragment, null, [h('li', null, 'middle')]),
    h('li', null, 'last'),
]);
var demoVNode1 = h('ui', null, [
    h('li', null, 'first'),
    h(Fragment, null, []),
    h('li', null, 'last'),
]);
render(demoVNode1, document.querySelector('#app'));
setTimeout(function () {
    render(demoVNode2, document.querySelector('#app'));
}, 2000);
