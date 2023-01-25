export function isObject(target) {
    return typeof target === 'object' && target !== null
}

export function hasChange(oldValue, newValue) {
    return oldValue !== newValue && !(Number.isNaN(oldValue) && Number.isNaN(newValue))
}

export function isArray(target) {
    return Array.isArray(target)
}

export function isString(target) {
    return typeof target === 'string'
}

export function isNumber(target) {
    return typeof target === 'number'
}

export function isBoolean(target) {
    return typeof target === 'boolean'
}

export function isFunction(target) {
    return typeof target == 'function'
}

export const HTML_TAGS =
    'html,body,base,head,link,meta,style,title,address,article,aside,footer,' +
    'header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,div,dd,dl,dt,figcaption,' +
    'figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,' +
    'data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,s,samp,small,span,strong,sub,sup,' +
    'time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,' +
    'canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,' +
    'th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,' +
    'option,output,progress,select,textarea,details,dialog,menu,' +
    'summary,template,blockquote,iframe,tfoot'

export const VOID_TAGS = 'area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr'

function makeMap(str: string) {
    const map = str.split(',').reduce((map, item) => ((map[item] = true), map), Object.create(null))
    return (val: string) => !!map[val]
}
export const isValidTag = makeMap(VOID_TAGS)
export const isNativeTag = makeMap(HTML_TAGS)

export const camelize = (str: string) => {
    // my-first-name => myFirstName

    // 官方寫法：正則匹配後替代
    return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ''))

    const dataArr = str.split('-')

    if (dataArr.length <= 1) {
        return dataArr[0]
    } else {
        for (let i = 1; i < dataArr.length; i++) {
            dataArr[i] = dataArr[i].charAt(0).toUpperCase() + dataArr[i].slice(1)
        }
    }

    return dataArr.join('')
}

export const capitalize = (str: string) => {
    return str[0].toUpperCase() + str.slice(1)
}
