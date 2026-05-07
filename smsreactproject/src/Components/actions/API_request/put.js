const put = async (URL,id,  data) => {
    // let url = "http://192.168.0.107:8080"
    // let url="http://192.168.0.114:8000"
    let url=process.env.REACT_APP_END_POINT
    let token = localStorage.getItem('token')
    let result = await(await fetch(`${url}/${URL}/${id}/`, {
        method: 'PUT', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`

            // 'Content-Type': 'application/x-www-form-urlencoded',
        },
        redirect: 'follow', // manual, *follow, error
        referrer: 'no-referrer', // no-referrer, *client
        body: JSON.stringify(data) // body data type must match "Content-Type" header
    })).json();


    return result

}



export default put