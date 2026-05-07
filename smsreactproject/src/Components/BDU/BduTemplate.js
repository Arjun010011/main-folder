import React, { Component } from 'react'
import get from '../actions/API_request/Get';
import MUIDataTable from "mui-datatables";
import CircularProgress from '@material-ui/core/CircularProgress';
import { Paper } from '@material-ui/core';
import { Box } from '@material-ui/core';
import Link from '@material-ui/core/Link';

const options = {
    selectableRows: 'none',
    responsive: "scroll",
};

export default class Template extends Component {
    constructor(props) {
        super(props)
        this.state = {
            staffList: [{
                first_name: "Student1",
                email: "sada@asdfasd",
                mobile_num: "23232323",
                dob: "sdfasdf"

            }, {
                first_name: "Student2",
                email: "sada@asdfasd",
                mobile_num: "23232323",
                dob: "sdfasdf"


            }],
            dataReady: false,
            columns: [
                {
                    name: "first_name",
                    label: "Full Name",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "email",
                    label: "Email",
                    options: {
                        filter: true,
                        sort: false,
                    }
                },
                {
                    name: "mobile_num",
                    label: "Mobile Number",
                    options: {
                        filter: true,
                        sort: false,
                    }
                },
                {
                    name: "dob",
                    label: "Date Of Birth",
                    options: {
                        filter: true,
                        sort: false,
                    }
                },

                {
                    name: "Actions",
                    options: {
                        filter: false,
                        sort: false,
                        empty: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                // <button onClick={() => {
                                //     props.history.push("/bdu/upload")
                                // }}>
                                //     Upload
                            <Link href="" onClick={
                                () => {
                                        props.history.push("/bdu/upload")
                                    }
                            } >
                                        Link
                                </Link>
                                // </button>
                            );
                        }
                    }
                }
            ]
        }
    }

    // async componentDidMount() {
    //     let data = await get('staffs/staffalldetail');
    //     this.setState({
    //         staffList: data.data,
    //         dataReady: true
    //     })
    // }

    render() {
        return (
            <Box>
                <Paper >
                    <MUIDataTable
                        title={"Employee List"}
                        data={this.state.staffList}
                        columns={this.state.columns}
                        scrollMaxHeight={options}
                    />
                </Paper>
            </Box>
        )
    }
}
