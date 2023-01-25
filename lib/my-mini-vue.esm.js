function codegen(ast) {
    return "console.log('hello world')";
}

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
var HTML_TAGS = 'html,body,base,head,link,meta,style,title,address,article,aside,footer,' +
    'header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,div,dd,dl,dt,figcaption,' +
    'figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,' +
    'data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,s,samp,small,span,strong,sub,sup,' +
    'time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,' +
    'canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,' +
    'th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,' +
    'option,output,progress,select,textarea,details,dialog,menu,' +
    'summary,template,blockquote,iframe,tfoot';
var VOID_TAGS = 'area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr';
function makeMap(str) {
    var map = str.split(',').reduce(function (map, item) { return ((map[item] = true), map); }, Object.create(null));
    return function (val) { return !!map[val]; };
}
var isValidTag = makeMap(VOID_TAGS);
var isNativeTag = makeMap(HTML_TAGS);
var camelize = function (str) {
    // my-first-name => myFirstName
    // 官方寫法：正則匹配後替代
    return str.replace(/-(\w)/g, function (_, c) { return (c ? c.toUpperCase() : ''); });
};

var NodeTypes;
(function (NodeTypes) {
    NodeTypes[NodeTypes["ROOT"] = 0] = "ROOT";
    NodeTypes[NodeTypes["ELEMENT"] = 1] = "ELEMENT";
    NodeTypes[NodeTypes["TEXT"] = 2] = "TEXT";
    NodeTypes[NodeTypes["SIMPLE_EXPRESSION"] = 3] = "SIMPLE_EXPRESSION";
    NodeTypes[NodeTypes["INTERPOLATION"] = 4] = "INTERPOLATION";
    NodeTypes[NodeTypes["ATTRIBUTE"] = 5] = "ATTRIBUTE";
    NodeTypes[NodeTypes["DIRECTIVE"] = 6] = "DIRECTIVE";
    NodeTypes[NodeTypes["NULL"] = 7] = "NULL";
})(NodeTypes || (NodeTypes = {}));
var ElementTypes;
(function (ElementTypes) {
    ElementTypes[ElementTypes["ELEMENT"] = 0] = "ELEMENT";
    ElementTypes[ElementTypes["COMPONENT"] = 1] = "COMPONENT";
})(ElementTypes || (ElementTypes = {}));
function createRoot(children) {
    return {
        type: NodeTypes.ROOT,
        children: children,
    };
}

function parse(content) {
    // 因為Vue是選擇函數式的寫法、而不是OOP，
    // 所以會需要context來傳遞上下文（？
    var context = createParseContext(content);
    var children = parseChildren(context);
    return createRoot(children);
}
function createParseContext(content) {
    return {
        options: {
            delimiters: ['{{', '}}'],
            isValidTag: isValidTag,
            isNativeTag: isNativeTag,
        },
        source: content,
    };
}
function parseChildren(context) {
    var nodes = [];
    while (!isEnd(context)) {
        var s = context.source;
        var node = void 0;
        if (s.startsWith(context.options.delimiters[0])) {
            // parseInterpolation
            node = parseInterpolation(context);
        }
        else if (s[0] === '<') {
            // parseElement
            node = parseElement(context);
        }
        else {
            // parseText
            node = parseText(context);
        }
        nodes.push(node);
    }
    // 優化：對於多餘空白格的優化
    var removedWhitespacesFlag = false;
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node.type === NodeTypes.TEXT) {
            // 區分文本節點是否全是空白
            if (/[^\t\r\f\n ]/.test(node.content)) {
                // 文本節點有一些字符,用正則匹配空白
                node.content = node.content.replace(/[\t\r\f\n ]+/g, ' ');
            }
            else {
                // 文本節點全是空白
                var prev = nodes[i - 1];
                var next = nodes[i + 1];
                if (!prev ||
                    !next ||
                    (prev.type === NodeTypes.ELEMENT &&
                        next.type === NodeTypes.ELEMENT &&
                        /[\r\n]/.test(node.content))) {
                    // 刪除空白節點
                    removedWhitespacesFlag = true;
                    nodes[i] = { type: NodeTypes.NULL, content: null };
                }
                else {
                    node.content = ' ';
                }
            }
        }
    }
    return removedWhitespacesFlag ? nodes.filter(function (node) { return node.type !== NodeTypes.NULL; }) : nodes;
}
// 缺陷：
// 假如文本為`a<b`、`/`
function parseText(context) {
    var endToken = ['<', context.options.delimiters[0]];
    var endIndex = context.source.length; // 不減1是因為要用slice來截取
    for (var i = 0; i < endToken.length; i++) {
        var index = context.source.indexOf(endToken[i]);
        if (index !== -1 && index < endIndex) {
            endIndex = index;
        }
    }
    return {
        type: NodeTypes.TEXT,
        content: parseTextData(context, endIndex),
    };
}
function parseElement(context) {
    // start tag
    var element = parseTag(context);
    // 假如是element是自閉合，就直接返回element、不用繼續parse
    if (element.isSelfClosing || context.options.isValidTag(element.tag)) {
        return element;
    }
    // parseChildren
    element.children = parseChildren(context);
    // end tag
    parseTag(context);
    return element;
}
function parseTag(context) {
    var match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
    var tag = match[1]; //[0]為開頭符號'<',正則裡面有分組了
    advanceBy(context, match[0].length);
    advanceSpaces(context);
    var _a = parseAttributes(context), props = _a.props, directives = _a.directives;
    var isSelfClosing = context.source.startsWith('/>');
    advanceBy(context, isSelfClosing ? 2 : 1);
    var tagType = isComponent(context, tag) ? ElementTypes.COMPONENT : ElementTypes.ELEMENT;
    return {
        type: NodeTypes.ELEMENT,
        tag: tag,
        tagType: tagType,
        props: props,
        directives: directives,
        isSelfClosing: isSelfClosing,
        children: [],
    };
}
function parseAttributes(context) {
    var props = [];
    var directives = [];
    while (context.source.length &&
        !context.source.startsWith('>') &&
        !context.source.startsWith('/>')) {
        var attr = parseAttribute(context);
        if (attr.type === NodeTypes.DIRECTIVE) {
            directives.push(attr);
        }
        else {
            props.push(attr);
        }
    }
    return { props: props, directives: directives };
}
// <div v-if="hi"></div>
function parseAttribute(context) {
    var _a;
    var match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
    var name = match[0];
    advanceBy(context, name.length);
    advanceSpaces(context);
    var value;
    if (context.source[0] === '=') {
        advanceBy(context, 1); // 把等號去掉
        advanceSpaces(context); // 可能等號前面有空格
        value = parseAttributeValue(context);
        advanceSpaces(context); // 可能後面有空格
    }
    // Direction, 靠name來判別--- ‘v-*’ or ‘:*’
    if (/^(:|@|v-)/.test(name)) {
        // <div :class="foo">...</div>
        // <div @click="foo">...</div>
        // <div v-bind:class="foo">...</div>
        var dirName = void 0, attrContent = void 0;
        if (name[0] === ':') {
            dirName = 'bind';
            attrContent = name.slice(1);
        }
        else if (name[0] === '@') {
            dirName = 'on';
            attrContent = name.slice(1);
        }
        else if (name.startsWith('v-')) {
            _a = name.slice(2).split(':'), dirName = _a[0], attrContent = _a[1];
        }
        return {
            type: NodeTypes.DIRECTIVE,
            name: dirName,
            exp: value && {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: value.content,
                isStatic: false,
            },
            arg: attrContent && {
                type: NodeTypes.SIMPLE_EXPRESSION,
                content: camelize(attrContent),
                isStatic: true,
            }, // 表达式节点
        };
    }
    // Attribule
    return {
        type: NodeTypes.ATTRIBUTE,
        name: name,
        value: value && {
            type: NodeTypes.TEXT,
            content: value.content,
        }, // 纯文本节点
    };
}
function parseAttributeValue(context) {
    // 預設一定有個引號
    var quote = context.source[0];
    advanceBy(context, 1);
    var endIndex = context.source.indexOf(quote);
    var content = parseTextData(context, endIndex);
    advanceBy(context, 1); // 去掉最後一個引號
    return { content: content };
}
function parseInterpolation(context) {
    var _a = context.options.delimiters, openFlag = _a[0], closeFlag = _a[1];
    advanceBy(context, openFlag.length);
    var endIndex = context.source.indexOf(closeFlag);
    var content = parseTextData(context, endIndex).trim();
    advanceBy(context, closeFlag.length);
    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content: content,
            isStatic: false,
        },
    };
}
function parseTextData(context, length) {
    var text = context.source.slice(0, length);
    advanceBy(context, length);
    return text;
}
function isEnd(context) {
    var s = context.source;
    return s.startsWith('</') || !s;
}
// 吃掉字符
function advanceBy(context, numberOfCharacters) {
    context.source = context.source.slice(numberOfCharacters);
}
// 吃掉空格
function advanceSpaces(context) {
    var match = /^[\t\r\n\f ]+/.exec(context.source);
    if (match) {
        advanceBy(context, match[0].length);
    }
}
function isComponent(context, tag) {
    return !context.options.isNativeTag(tag);
}

function compile(template) {
    parse(template);
    return codegen();
}

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

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

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
        key: props && props['key'],
    };
}
function normalizeVNode(result) {
    if (isArray(result)) {
        return h(Fragment, null, result);
    }
    if (isObject(result)) {
        // 已經為VNode
        return result;
    }
    return h(Text, null, result.toString());
}

var queue = [];
var resolvedPromise = Promise.resolve();
var currFlushPromise = null;
var isFlushing = false;
function nextTick(fn) {
    var p = currFlushPromise || resolvedPromise;
    return fn == null ? p.then(fn) : p;
}
function queueJob(job) {
    if (!queue.length || !queue.includes(job)) {
        queue.push(job);
        queueFlush();
    }
}
function queueFlush() {
    if (!isFlushing) {
        isFlushing = true;
        currFlushPromise = resolvedPromise.then(flushJobs);
    }
}
function flushJobs() {
    try {
        for (var i = 0; i < queue.length; i++) {
            var job = queue[i];
            job();
        }
    }
    finally {
        isFlushing = false;
        queue.length = 0; // empty the queue
        currFlushPromise = null;
    }
}

function updateProps(instance, vnode) {
    var _a;
    // 這邊有點不太懂，
    var component = vnode.type, vnodeProps = vnode.props;
    var props = (instance.props = {});
    var attrs = (instance.attrs = {});
    for (var key in vnodeProps) {
        // 先假設vue component 的 props只接收array
        if ((_a = component['props']) === null || _a === void 0 ? void 0 : _a.includes(key)) {
            props[key] = vnodeProps[key];
        }
        else {
            attrs[key] = vnodeProps[key];
        }
    }
    // 更新了props，也要重新渲染，因此也要把props轉換成響應式
    // 不過Vue 源碼是用 shallowReactive
    instance.props = reactive(instance.props);
}
function mountComponent(vnode, container, anchor) {
    var component = vnode.type;
    var instance = (vnode.component = {
        props: null,
        attrs: null,
        setupState: null,
        ctx: null,
        isMounted: false,
        subtree: null,
        next: null,
        update: null,
    });
    updateProps(instance, vnode);
    if (component.setup) {
        instance.setupState = component.setup(instance.props, { attrs: instance.attrs });
    }
    // Vue3的源碼是用Proxy來代理
    instance.ctx = __assign(__assign({}, instance.props), instance.setupState);
    instance.update = watchEffect(function () {
        if (!instance.isMounted) {
            // mount state
            var subTree = (instance.subtree = normalizeVNode(component.render(instance.ctx)));
            // 繼承attrs
            if (Object.keys(instance.attrs).length) {
                subTree.props = __assign(__assign({}, subTree.props), instance.attrs);
            }
            patch(null, subTree, container, anchor);
            instance.isMounted = true;
        }
        else {
            // update state
            if (instance.next) {
                //被動更新
                vnode = instance.next;
                instance.next = null;
                updateProps(instance, vnode);
                instance.ctx = __assign(__assign({}, instance.props), instance.setupState);
            }
            // 主動更新
            var preSubtree = instance.subtree;
            var subTree = (instance.subtree = normalizeVNode(component.render(instance.ctx)));
            // 繼承attrs
            if (Object.keys(instance.attrs).length) {
                subTree.props = __assign(__assign({}, subTree.props), instance.attrs);
            }
            patch(preSubtree, subTree, container, anchor);
        }
    }, {
        scheduler: queueJob,
    });
}

function render(vnode, container) {
    var prevVNode = container._vnode;
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
        unmountComponent(vnode);
    }
    else if (shapeFlags & ShapeFlags.FRAGMENT) {
        unmountFragment(vnode);
    }
    else {
        (_a = el === null || el === void 0 ? void 0 : el.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(el);
    }
}
function patch(n1, n2, container, anchor) {
    if (n1 && !isSameNode(n1, n2)) {
        anchor = (n1.anchor || n1.el).nextSibling;
        unmount(n1);
        n1 = null;
    }
    var shapeFlags = n2.shapeFlags;
    if (shapeFlags & ShapeFlags.COMPONENT) {
        processComponent(n1, n2, container, anchor);
    }
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
function processComponent(n1, n2, container, anchor) {
    //TODO
    if (n1) {
        // TODO
        // shouldComponentUpdate
        updateComponent(n1, n2);
    }
    else {
        mountComponent(n2, container, anchor);
    }
}
function updateComponent(n1, n2) {
    var _a;
    n2.component = n1.component;
    n2.component.next = n2;
    (_a = n2.component) === null || _a === void 0 ? void 0 : _a.update();
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
    if (n1) {
        patchElement(n1, n2);
    }
    else {
        mountElement(n2, container, anchor);
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
    if (props) {
        patchProps(null, props, el);
    }
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
    var _a;
    unmount((_a = vnode.component) === null || _a === void 0 ? void 0 : _a.subtree);
}
function unmountFragment(vnode) {
    var curr = vnode.el;
    var end = vnode.anchor;
    var parentNode = curr.parentNode;
    while (curr !== end) {
        var next = curr.nextSibling;
        parentNode.removeChild(curr);
        curr = next;
    }
    parentNode.removeChild(end);
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
        if (key === 'key') {
            continue;
        }
        var nextValue = newProps[key];
        var prevValue = oldProps[key];
        if (prevValue !== nextValue) {
            patchDomProps(prevValue, nextValue, key, el);
        }
    }
    for (var key in oldProps) {
        if (key !== 'key' && newProps[key] == null) {
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
            if (!next) {
                el.removeAttribute('style');
            }
            else {
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
            }
            break;
        default:
            // 專案寫法：
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
                // {'checked': ''}
                if (next === '' && isBoolean(el[key])) {
                    next = true;
                }
                el[key] = next;
            }
            else {
                // attr
                if (next == null || next === false) {
                    el.removeAttribute(key);
                }
                else {
                    el.setAttribute(key, next);
                }
            }
            // // deal with event，原本的寫法
            // if (/^on[^a-z]/.test(key)) {
            //     const eventName = key.slice(2).toLowerCase()
            //     if (prev) {
            //         el.removeEventListener(eventName, prev)
            //     }
            //     if (next) {
            //         el.addEventListener(eventName, next)
            //     }
            // } else if (domPropsRE.test(key)) {
            //     // need setAttribue key
            //     // deal with {'checked':''}
            //     if (next == '' && isBoolean(el[key])) {
            //         next = true
            //         el[key] = next
            //     } else {
            //         if (next == null || next === false) {
            //             // 像是移除disable
            //             el.removeAttribute(key)
            //         } else {
            //             el.setAttribute(key, next)
            //         }
            //     }
            // } else {
            //     // like id
            //     el[key] = next
            // }
            break;
    }
}
function patchChildren(n1, n2, container, anchor) {
    var prevShapeFlag = n1.shapeFlags, c1 = n1.children;
    var nextShapeFlag = n2.shapeFlags, c2 = n2.children;
    if (nextShapeFlag & ShapeFlags.TEXT_CHILDREN) {
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
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
            container.textContent = '';
            mountChildren(c2, container, anchor);
        }
        else if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // use 'key' to apply diff
            // 偷懶：假如第一個元素有key，就當作都有key
            if (c1[0] &&
                c1[0].key !== null &&
                c2[0] &&
                c2[0].key !== null) {
                patchKeyedChildren(c1, c2, container, anchor);
            }
            else {
                patchUnkeyedChildren(c1, c2, container, anchor);
            }
        }
        else {
            mountChildren(c2, container);
        }
    }
    else {
        //n2 null
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
            container.textContent = '';
        }
        else if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            unmountChildren(c1);
        }
    }
}
function patchUnkeyedChildren(c1, c2, container, anchor) {
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
/**
 * 現在Vue3的diff算法
 * @param c1
 * @param c2
 * @param container
 * @param anchor
 */
function patchKeyedChildren(c1, c2, container, anchor) {
    var index = 0;
    var end01 = c1.length - 1;
    var end02 = c2.length - 1;
    // comparing from left to right
    while (index <= end01 && index <= end02 && c1[index].key == c2[index].key) {
        patch(c1[index], c2[index], container, anchor);
        index++;
    }
    // comparing from right to left
    while (index <= end01 && index <= end02 && c1[end01].key == c2[end02].key) {
        patch(c1[end01], c2[end02], container, anchor);
        end01--;
        end02--;
    }
    if (index > end01) {
        // 代表 prev-children 都比對完了，next-children剩下的直接mount
        for (var j = index; j <= end02; j++) {
            var nextPos = end02 + 1;
            var curAnchor = c2[nextPos] ? c2[nextPos].el : anchor;
            patch(null, c2[j], container, curAnchor);
        }
    }
    else if (index > end02) {
        // 代表比對完後，prev-children還有沒有比對的、代表需要unmount
        for (var j = index; j <= end01; j++) {
            unmount(c1[j]);
        }
    }
    else {
        // 經過由左至右和由右至左比對後，prev和next中間都還有剩
        // 就要用傳統的diff算法，但不添加和移動、只標記和刪除
        // 創建一個source array，記錄新節點在舊array中的index，沒有就-1
        var map = new Map();
        // 還要考慮c1的前後，也可能被diff截掉
        for (var preIndex = index; preIndex <= end01; preIndex++) {
            var prev = c1[preIndex];
            map.set(prev.key, { prev: prev, preIndex: preIndex });
        }
        // c1.forEach((prev, preIndex) => {
        //     map.set(prev.key, { prev, preIndex })
        // })
        var maxNewIndexSoFar = 0;
        var needMove = false;
        var source = new Array(end02 - index + 1).fill(-1);
        var toMounted = [];
        for (var i = 0; i < source.length; i++) {
            var next = c2[i + index];
            if (map.has(next.key)) {
                var _a = map.get(next.key), prev = _a.prev, preIndex = _a.preIndex;
                patch(prev, next, container, anchor);
                if (preIndex < maxNewIndexSoFar) {
                    needMove = true;
                }
                else {
                    maxNewIndexSoFar = preIndex;
                }
                source[i] = preIndex;
                map.delete(next.key);
            }
            else {
                // TODO,特殊情況（不需要移動，但有需要添加的元素）
                // 記錄下標
                toMounted.push(i + index);
            }
        }
        map.forEach(function (_a) {
            var prep = _a.prep;
            unmount(prep);
        });
        if (needMove) {
            // 需要移動時，使用最新的最長遞增子序列
            var seq = getSequence(source);
            var seqEnd = seq.length - 1;
            for (var i = source.length - 1; i >= 0; i--) {
                if (source[seqEnd] == i) {
                    // 代表不用移動
                    seqEnd--;
                }
                else {
                    var pos = i + index;
                    var nextPos = pos + 1;
                    var curAnchor = c2[nextPos] ? c2[nextPos].el : anchor;
                    if (source[i] == -1) {
                        // mount
                        patch(null, c2[pos], container, curAnchor);
                    }
                    else {
                        // 要移動
                        container.insertBefore(c2[pos].el, curAnchor);
                    }
                }
            }
        }
        if (toMounted.length !== 0) {
            for (var i = toMounted.length - 1; i >= 0; i--) {
                var pos = toMounted[i];
                var nextPos = pos + 1;
                var curAnchor = c2[nextPos] ? c2[nextPos].el : anchor;
                // mount
                patch(null, c2[pos], container, curAnchor);
            }
        }
    }
}
// 最長上升子序列的
function getSequence(nums) {
    var arr = [nums[0]];
    var position = [0];
    for (var i = 1; i < nums.length; i++) {
        if (nums[i] === -1) {
            // source[]裡面可能有-1，代表要新增的節點，因此不參與LIS
            continue;
        }
        if (nums[i] > arr[arr.length - 1]) {
            arr.push(nums[i]);
            position.push(arr.length - 1);
        }
        else {
            var l = 0, r = arr.length - 1;
            while (l <= r) {
                var mid = ~~((l + r) / 2);
                if (nums[i] > arr[mid]) {
                    l = mid + 1;
                }
                else if (nums[i] < arr[mid]) {
                    r = mid - 1;
                }
                else {
                    l = mid;
                    break;
                }
            }
            arr[l] = nums[i];
            position.push(l);
        }
    }
    var cur = arr.length - 1;
    for (var i = position.length - 1; i >= 0 && cur >= 0; i--) {
        if (position[i] === cur) {
            arr[cur--] = i;
        }
    }
    return arr;
}

function createApp(rootComponent) {
    var app = {
        mount: function (rootContainer) {
            if (isString(rootContainer)) {
                var container = document.querySelector(rootContainer);
                render(h(rootComponent), container);
            }
            else {
                render(h(rootComponent), rootContainer);
            }
        },
    };
    return app;
}

var MiniVue = (window.MiniVue = {
    createApp: createApp,
    render: render,
    h: h,
    Text: Text,
    Fragment: Fragment,
    nextTick: nextTick,
    reactive: reactive,
    ref: ref,
    computed: computed,
    effect: watchEffect,
    compile: compile,
    // renderList,
    // withModel,
    // resolveComponent,
});

export { MiniVue };
