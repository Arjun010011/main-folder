import React, { Component } from 'react'
import { Paper, Box, Button, FormLabel, Typography } from '@material-ui/core'
// import { OutTable, ExcelRenderer } from 'react-excel-renderer';
import ReactDataSheet from 'react-datasheet';
import 'react-datasheet/lib/react-datasheet.css';
import post from '../actions/API_request/Post';
import { TextField } from '@material-ui/core';


export default class BduUpload extends Component {
    state = {
        cols: null,
        row: null,
        error: false,
        errorData: {},

    }

    uploadFile = async (event) => {


        let payload = new FormData();
        payload.append('students', event.target.files[0]);


        let fileObj = event.target.files[0];

        fetch(`${process.env.REACT_APP_END_POINT}/bdu/bdustudent/`, { // Your POST endpoint
            method: 'POST',
            body: payload // This is your file object
        }).then(
            response => response.json() // if the response is a JSON object
        ).then(
            success => {

                if (!success.Result) {
                    this.setState({
                        error: true,
                        errorData: success.Reason
                    })
                }
            }
        ).catch(
             // Handle the error response object
        );


        //just pass tde fileObj as parameter
        // ExcelRenderer(fileObj, (err, resp) => {

        //     if (err) {
               
        //     }
        //     else {
        //         this.setState({
        //             cols: resp.cols,
        //             rows: resp.rows
        //         });
        //     }
        // });

    }

    submit = async (payload) =>{
        
        let result = await post('bdu/bdustudent',payload)
        if(!result.Result){
           
            this.setState({
                errorData:result.Reason
            })
        }
        else{
            this.setState({
                errorData:{}
            })
        }
    }


    render() {
        alert('hi')
        const { error } = this.state;
        return (
            <div>
                <Paper>
                    <Box p={4}>
                        <Box pb={2}>

                            <Button
                                variant="contained"
                                component="label"
                            >
                                Upload File
                             <input
                                    type="file"
                                    style={{ display: "none" }}
                                    onChange={this.uploadFile}
                                />
                            </Button>
                            <FormLabel>
                                Please Upload xml format file
                        </FormLabel>

                        </Box>
                        <hr />
                        <Box pt={2}>
                            <Box textAlign="center">

                                <Typography variant="h4" >
                                    download a Sample SpreedSheet
                            </Typography>
                            </Box>
                            <Button
                                href={`${process.env.REACT_APP_END_POINT}/bdu/bdustudent/`}
                            >
                                {/* <a >download</a> */}
                                download

                            </Button>

                            {/* <a href="http://192.168.0.107:8080/bdu/bdu/" download>download</a> */}

                        </Box>
                    </Box>

                    {/* <OutTable data={this.state.rows} columns={this.state.cols} tableClassName="ExcelTable2007" tableHeaderRowClass="heading" /> */}
                    
                    {
                        error &&

                        <Test
                            data={this.state.rows}
                            errors={this.state.errorData}
                            submit={this.submit}
                        />
                    }
                </Paper>
            </div>
        )
    }
}









class Test extends React.Component {
    
    state = {
        data: this.props.data || [],
        error:this.props.errors
    }


    static getDerivedStateFromProps(props, state) {
        if (props.data ) {
            return {
                data: props.data,
                errors: {...props.errors}
            }
        }
        return null
    }


    onChange = (e, rowIndex, columnindex) => {
        const { value } = e.target;
        const { data } = this.state;
        data[rowIndex][columnindex] = value;
        this.setState({
            data
        })
    }


 


    render() {
        const { data, errors } = this.state
        if (data.length > 0 )
            return (<>
                <table style={{ width: "100%" }}>
                    <thead>

                        <tr>
                            {data[0].map(data => <th>{data}</th>)}
                        </tr>
                        {data.map((temp, index) => {

                            if (index !== 0)
                                return <tr key={index}>
                                    {data[0].map((t, indexx) => {
                                        let test = data[0][indexx];

                                        let i = index + 1;
                                        if (errors[i]) {

                                            
                                            return <td >
                                                <TextField
                                                    id="bank-name"

                                                    name="bank_name"
                                                    fullWidth
                                                    margin="normal"

                                                    autoComplete="off"
                                                    value={data[index][indexx]}
                                                    onChange={(e) => { this.onChange(e, index, indexx) }}
                                                    required={true}
                                                    // helperText={(typeof (errors.bank_name_b) == "undefined" || "") ? "" : errors.bank_name_b}
                                                    error={errors[i][test] ? true : false}
                                                />

                                            </td>
                                        }
                                        else {

                                            return <td >
                                                <TextField
                                                    id="bank-name"

                                                    name="bank_name"
                                                    fullWidth
                                                    margin="normal"

                                                    autoComplete="off"
                                                    value={data[index][indexx]}
                                                    onChange={(e) => { this.onChange(e, index, indexx) }}
                                                    required={true}
                                                // helperText={(typeof (errors.bank_name_b) == "undefined" || "") ? "" : errors.bank_name_b}
                                                // error={data[0][indexx] === errors[index][data[0][indexx]] ? true : true}
                                                />

                                            </td>
                                        }
                                    })}
                                </tr>
                        })}
                    </thead>
                </table>
                <Button onClick={()=>this.props.submit(this.state.data)}>
                    Save data
                </Button>
                </>
            )
        return null
    }
}