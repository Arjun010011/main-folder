import React, { Component } from "react";
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

import AllMUIDataTable from "Components/AllMUIDataTable";
import ActionColumn from "Components/ActionColumnNew";
import { getRequest, putRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { isUserHasPermission } from "Includes/functions";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { DATATABLEROWSPERPAGEOPT } from "Constants";
import { Actions } from "Constants/permissions";
import loadingBar from "images/loading.gif";
import InfoIcon from "@material-ui/icons/Info";

const options = {
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

const fieldDetails = [
  {
    label: "Concession Type",
    regex: nameAndNumberRegex,
    name: "name",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    autoFocus: true,
    maxLength: "25",
  },
];

class AddConcessionType extends Component {
  constructor() {
    super();
    this.state = {
      concessionTypeList: [],
      loading: true,
      selectedToDelete: [],
      standardMap: {},
      closeMenu: true,
      enabledActions: [],
      errorContent: "",
    };
    this.columns = [
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
        label: "Concession Type",
        options: {
          filter: true,
          sort: true,
        },
      },

      {
        name: "code",
        label: "Code Name",
        options: {
          filter: true,
          sort: true,
          display: false,
        },
      },
      {
        name: "Actions",
        label: "Action",
        options: {
          filter: true,
          sort: false,
          customBodyRender: (value, tableMeta) => {
            return (
              <div>
                {tableMeta.rowData[2] ?
                  <Tooltip
                    title="Cant Edit/Delete default Concession type"
                    placement="top-start"
                    arrow
                  >
                    <InfoIcon />
                  </Tooltip>
                  :
                  <ActionColumn
                    id={tableMeta.rowData[0]}
                    fieldValues={[tableMeta.rowData[1]]}
                    label="Edit Concession Type"
                    fieldDetails={fieldDetails}
                    updateUrl={PUT_URL.concessiontypes.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    deleteUrl={DEL_URL.concessiontypes.api}
                    deleteType={this.deleteType}
                    baseClassName="action-basic-detail-width"
                    enabledActions={this.state.enabledActions}
                  />
                }

              </div>
            );
          },
        },
      },
    ];
  }

  temp(name) {
    let temp = [];
    temp.push(name);
    return temp;
  }

  closeMenuAction = (status) => {
    let { concessionTypeList, columns } = this.state;
    this.setState({
      concessionTypeList: [...concessionTypeList],
      closeMenu: status,
      errorContent: "",
      columns: columns,
    });
  };

  deleteType = async (id) => {
    let concessionTypeList = this.state.concessionTypeList.filter((data) => data.id !== id);
    this.setState({ concessionTypeList });
  };

  updateType = (newData, id) => {
    this.setState({ tableUpdating: true });
    let concessionTypeList = this.state.concessionTypeList;
    concessionTypeList.map((data, index) => {
      if (data.id === id) {
        concessionTypeList[index].name = newData.name;
      }
    });
    this.setState({
      concessionTypeList: [...concessionTypeList],
      tableUpdating: false,
      columns: this.state.columns,
    });
    return true;
  };

  updatePostFormat = (newData) => {
    let payload = {
      name: newData.name,
    };
    return payload;
  };

  componentDidMount() {
    this.getConcessionTypeList();
    this.updatePermissions();
  }
  updatePermissions = () => {
    const hasEditPermission = isUserHasPermission("concession_type", "update");
    const hasDeletePermission = isUserHasPermission(
      "concession_type",
      "delete"
    );

    let enabledActions = [];
    if (hasEditPermission) {
      enabledActions.push("edit");
    }
    if (hasDeletePermission) {
      enabledActions.push("delete");
    }

    this.setState({
      enabledActions,
      columns: this.columns,
    });
  };
  getConcessionTypeList = () => {
    const url = GET_URL.concessiontypes.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          concessionTypeList: response.data.data,
          loading: false,
        });
      }
    });
  };

  getTitle = () => {
    if (this.state.tableUpdating || this.props.loading) {
      return <CircularProgress className="white-text" />
    }
  }

  render() {
    const { loading, concessionTypeList, columns } = this.state;
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
                <Box className="header-align heading">Concession Type</Box>
              </Grid>
              <Grid item md={5} xs={12} sm={12}>
                <Box className="end-flex-prop header-align">
                  {isUserHasPermission("concession_type", "create") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.concession_type.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.concession_type.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Grid container className="header-align">
              <Grid item md={6} xs={8}>
                <AllMUIDataTable
                  title={loading ? this.getTitle() : ''}
                  data={concessionTypeList}
                  columns={columns}
                  options={options}
                />
              </Grid>
            </Grid>
          </Paper>
        </Box>
      );
    }
  }
}
export default AddConcessionType;
