import React, { Component } from "react";
import { Paper, Box, Grid, Tooltip, Button, CircularProgress } from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link } from "react-router-dom";

import {
  DATATABLEROWSPERPAGEOPT,
} from "Constants";
import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL, POST_URL } from "Includes/urls";
import { nameWithQuoteRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, updatePermissions } from "Includes/functions";
import InfoIcon from "@material-ui/icons/Info";

const fieldDetails = [
  {
    label: "Fee Type",
    regex: nameWithQuoteRegex,
    name: "name",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    autoFocus: true,
    maxLength: "100",
  },
];

class AdditionalFeeTypeList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions('additional_fee_type', ['update', 'delete']);
    this.state = {
      financeTypeList: [],
      loading: true,
      selectedToDelete: [],
      standardMap: {},
      closeMenu: true,
      enabledActions: [],
      errorContent: "",
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "name",
          label: "Name",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
          },
        },
        {
          name: "codename",
          label: "Code Name",
          options: {
            filter: true,
            sort: true,
            display: true,
          },
        },
        {
          name: "Actions",
          label: "Actions",
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <>
                {tableMeta.rowData[2] ?
                  <Tooltip
                    title="Cant Edit/Delete default fee type"
                    placement="top-start"
                    arrow
                  >
                    <InfoIcon />
                  </Tooltip>
                  :
                  <div>
                    <ActionColumn
                      id={tableMeta.rowData[0]}
                      fieldValues={this.temp(tableMeta.rowData[1])}
                      label="Edit Additional Fee Type"
                      fieldDetails={fieldDetails}
                      updatePostFormat={(newData) =>
                        this.updatePostFormat(newData, tableMeta.rowData[0])
                      }
                      updateType={this.updateType}
                      postUrl={POST_URL.additionalchargetype.api}
                      deleteType={this.deleteType}
                      deleteUrl={DEL_URL.additionalchargetype.api}
                      baseClassName="action-basic-detail-width"
                      enabledActions={this.permission}
                      closeMenu={this.state.closeMenu}
                      errorContent={this.state.errorContent}
                      closeMenuAction={this.closeMenuAction}
                    />
                  </div>
                }
              </>
            },
          },
        },
      ]
    };
  }

  options = {
    filterType: "dropdown",
    responsive: "scroll",
    filter: false,
    download: false,
    print: false,
    viewColumns: false,
    rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
    rowsPerPage: 10,
    selectableRows: "none",
    // rowHover:true
  };
  temp(name) {
    let temp = [];
    temp.push(name);
    return temp;
  }

  closeMenuAction = (status) => {
    let { financeTypeList, columns } = this.state;
    this.setState({
      financeTypeList: [...financeTypeList],
      closeMenu: status,
      errorContent: "",
      columns: columns,
    });
  };

  updatePostFormat = (newData, id) => {
    let { financeTypeList } = this.state;
    let tableRow = null;
    for (let data of financeTypeList) {
      if (data.id === id) {
        tableRow = data;
      }
    }
    let payload = {
        data_list:[
            {
                name: newData.name,
                id:id
            }
        ]
    };
    return payload;
  };

  updateType = (newData, id) => {
    let { financeTypeList } = this.state;
    for (let data of financeTypeList) {
      if (data.id === id) {
        data.amount = newData.name;
        data.name = newData.name;
        break;
      }
    }
    this.setState({
      financeTypeList: [...financeTypeList],
      tableUpdating: false,
    });
    return true;
  };

  async componentDidMount() {
    this.getFinanceTypeList();
  }

  getFinanceTypeList = () => {
    const url = GET_URL.additionalchargetype.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          financeTypeList: response.data.data,
          loading: false,
        });
      }
    });
  };

  deleteType = async (id) => {
    let standard = [...this.state.financeTypeList];
    let { financeTypeList } = this.state
    for (const index in financeTypeList) {
      if (financeTypeList[index].id === id) {
        standard.splice(index, 1);
        break;
      }
    }
    this.setState({
      financeTypeList: standard,
    });
  };

  getTitle = () => {
    if (this.state.loading) {
      return <CircularProgress className="white-text" />;
    }
    return "";
  };


  render() {
    const { loading, financeTypeList, columns } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Paper className={"paper-background"}>
            <Grid container>
              <Grid item md={7} xs={12} sm={12}>
                <Box className="header-align heading">Additional Fee Type</Box>
              </Grid>
              <Grid item md={5} xs={12} sm={12}>
                <Box className="end-flex-prop header-align">
                  {isUserHasPermission("additional_fee_type", "create") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.additional_fee_type.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.additional_fee_type.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Grid container className="header-align">
              <Grid item lg={7} md={8} xs={12}>
                <AllMUIDataTable
                  title={this.getTitle()}
                  data={financeTypeList}
                  columns={columns}
                  options={this.options}
                  hideTextTransform={true}
                />
              </Grid>
            </Grid>
          </Paper>
        </Box>
      );
    }
  }
}
export default AdditionalFeeTypeList;
