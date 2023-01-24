function regex1(str) {
    const match = /^[\t\r\n\f ]+/.test(str)
    console.log('test:', match)
}
function regex2(str) {
    const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(str)
    console.log('test:', match)
}

regex2('<div hihi></div>')

const camolize = (str) => {
    // my-first-name => myFirstName
    const dataArr = str.split('-')

    if (dataArr.length <= 1) {
        return dataArr[0]
    } else {
        for (let i = 1; i < dataArr.length; i++) {
            dataArr[i] = dataArr[i].charAt(0).toUpperCase() + dataArr[i].slice(1)
        }
    }
    console.log(dataArr)

    return dataArr.join('')
}

console.log(camolize('my-first-name'))
