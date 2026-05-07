
import React, { Component } from 'react'
import MUIDataTable from "mui-datatables";
import CircularProgress from '@material-ui/core/CircularProgress';
import { Paper } from '@material-ui/core';
import { Box, Grid, TextField, Button } from '@material-ui/core';
import Link from '@material-ui/core/Link';
import DeleteIcon from '@material-ui/icons/Delete';
import Fab from '@material-ui/core/Fab';
import UpdateFeeType from './UpdateFeeType'

import DeleteOutlineOutlinedIcon from '@material-ui/icons/DeleteOutlineOutlined';
const options = {
  selectableRows: 'none',
  responsive: "scroll",
};

export default class FeeTypeDataTable extends Component {
  constructor(props) {
    super(props)
    this.state = {
      tableData: [...props.data],
      dataReady: false,
      columns: [
        {
          name: "name",
          label: "Fee Type Name",
          options: {
            filter: true,
            sort: true,
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
                <Box display="flex">
                  <Fab aria-label="edit" style={{ background: "white", color: "blue" }}
                    onClick={() => {
                      let id = tableMeta.tableData[tableMeta.rowIndex][0];
                      let index = tableMeta.rowIndex;
                      let name = tableMeta.tableData[tableMeta.rowIndex][1];
                      props.deleteFeesType(id, index, name)
                    }}
                  >
                    <DeleteOutlineOutlinedIcon />
                  </Fab>

                  <Box pl={2}>
                    <UpdateFeeType
                      let id={tableMeta.tableData[tableMeta.rowIndex][0]}
                      let index={tableMeta.rowIndex}
                      let name={tableMeta.tableData[tableMeta.rowIndex][1]}
                      updateType={props.updateType}
                    />
                  </Box>
                </Box>
              );
            }
          }
        }
      ],
      input: ""
    }
  }
  static getDerivedStateFromProps(props, state) {
    return {
      tableData: props.data
    }

  }

  // async componentDidMount() {
  //     let data = await get('shared/getformdefinitionslist');
  //     this.setState({
  //         staffList: data.data,
  //         dataReady: true
  //     })
  // }

  pushFun = () => {
    let { input } = this.state;
    let path = input.trim();
    this.props.history.push(`/formdefinition/${path}`)
  }

  render() {
    const { input } = this.state
    return (
      <Box>
        <MUIDataTable
          data={this.state.tableData}
          columns={this.state.columns}
          scrollMaxHeight={options}
          options={{
            selectableRows: "none",
            print: false,
            download: false,
            filter: true,
          }}
        />
      </Box>
    )
  }
}

