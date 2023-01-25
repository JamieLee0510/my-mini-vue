const {ref, reactive, watchEffect, computed} = Vue;
const observe = reactive({count:0})
watchEffect(()=>{
    console.log("observe:",observe.count)
})