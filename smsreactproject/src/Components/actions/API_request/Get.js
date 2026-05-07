const get = async (URL, id) => {

    let result;
    let url = process.env.REACT_APP_END_POINT
    let token = localStorage.getItem('token')

    // let url="http://192.168.0.107:8080"
    if (id) {
        result = await (await fetch(`${url}/${URL}/${id}`, {
            headers: {
                'Authorization': `Token ${token}`
            }
        })).json()
    }
    else {
        result = await (await fetch(`${url}/${URL}/`, {
            headers: {
                'Authorization': `Token ${token}`
            }
        })).json()

    }
    return (result)

}


export default get