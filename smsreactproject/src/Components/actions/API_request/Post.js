const post = async (URL,  data) => {
    // let url="http://192.168.0.114:8000"
    let url=process.env.REACT_APP_END_POINT
    let token = localStorage.getItem('token')

    // let url = "http://192.168.0.107:8080"
    let result = await(await fetch(`${url}/${URL}/`, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json',
            // 'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Token ${token}`

        },
        redirect: 'follow', // manual, *follow, error
        referrer: 'no-referrer', // no-referrer, *client
        body: JSON.stringify(data) // body data type must match "Content-Type" header
    })).json();


    return result

}


export default post