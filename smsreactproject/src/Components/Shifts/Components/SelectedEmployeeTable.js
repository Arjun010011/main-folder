import React, { Component } from 'react'
import MUIDataTable from "mui-datatables";
import CircularProgress from '@material-ui/core/CircularProgress';
import { Paper, Button } from '@material-ui/core';
import { Box } from '@material-ui/core';
import Link from '@material-ui/core/Link';

const options = {
    selectableRows: 'none',
    responsive: "scroll",
};

export default class SelectedEmployeeTable extends Component {
    constructor(props) {
        super(props)
        this.state = {
            staffList:props.data,
            // dataReady: false,
            columns: [
                {
                    name: "full_name",
                    label: "Full Name",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "id",
                    label: "id",
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
