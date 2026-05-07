import React, { Component } from 'react'
import post from './Components/actions/API_request/Post'
import get from './Components/actions/API_request/Get'
import { async } from 'q';
export default class TestDownloadFile extends Component {

  async  handleFileUpload(e ) {
      
        // this.props.actions.uploadRequest({
        //    file,
        //    name: 'Awesome Cat Pic'
        // })
        let {files} = e.target;
        let result = await post("bdu/bdu",files[0]);
    //    let result = await (await fetch("https://jsonplaceholder.typicode.com/todos",{id:12})).json()
      }

      download = async () =>{
        let result = await get("bdu/bdu");

      }

      
    render() {
        return (
            <div>
                Download test

                <input type="file" onChange={this.handleFileUpload} />
    {/* let url="http://192.168.0.107:8080" */}
                <a href={`${process.env.REACT_APP_END_POINT}/bdu/bdu/`}>download</a>
                {/* <button onClick={this.download}>
                    download
                </button> */}
            </div>
        )
    }
}
