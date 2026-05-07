import React, { Component } from "react";
import { Paper, Box, Grid, Button, CircularProgress } from "@material-ui/core";
import Swal from "sweetalert2";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link } from "react-router-dom";
import classNames from "classnames";

import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, updatePermissions } from "Includes/functions";
import { options } from "Constants";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";

const fieldDetails = [
  {
    label: <FormattedMessage {...commonMessages.name} />,
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

class FeeCategoryList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("fee_category", ["update", "delete"]);
    this.state = {
      fee_categoryList: [],
      loading: true,
      selectedToDelete: [],
      tableUpdating: false,
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
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <ActionColumn
                    id={tableMeta.rowData[0]}
                    fieldValues={[tableMeta.rowData[1]]}
                    label={"Fee Category"}
                    fieldDetails={fieldDetails}
                    updateUrl={PUT_URL.feecategory.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    deleteUrl={DEL_URL.feecategory.api}
                    deleteType={this.deleteType}
                    baseClassName="action-basic-detail-width"
                    enabledActions={this.permission}
                  />
                </div>
              );
            },
          },
        },
      ],
    };
  }

  componentDidMount = () => {
    this.getFeeCategoryList();
  };

  updatePostFormat = (newData) => {
    let payload = {
      name: newData.name,
    };
    return payload;
  };

  updateType = (newData, id) => {
    let fee_category = this.state.fee_categoryList;
    for (const data of fee_category) {
      if (data.id === id) {
        data.name = newData.name;
        break;
      }
    }
    this.setState({
      fee_categoryList: [...fee_category],
    });
    return true;
  };

  getFeeCategoryList = () => {
    const url = GET_URL.feecategory.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          fee_categoryList: response.data.data,
          loading: false,
        });
      }
    });
  };

  deleteType = async (id) => {
    let fee_category = this.state.fee_categoryList;
    fee_category.map((data, index) => {
      if (data.id === id) {
        fee_category.splice(index, 1);
      }
    });
    this.setState({
      fee_categoryList: fee_category,
    });
  };

  render() {
    const { loading, fee_categoryList, columns, tableUpdating } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Paper className={classNames("paper-background")}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">Fee Category</Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission("fee_category", "create") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.fee_category.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.fee_category.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Grid container className={classNames("header-align")}>
              <Grid item md={6} xs={12}>
                <Paper>
                  <AllMUIDataTable
                    key={fee_categoryList}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={fee_categoryList}
                    columns={columns}
                    options={options}
                  />
                </Paper>
              </Grid>
            </Grid>

          </Paper>
        </Box>
      );
    }
  }
}
export default FeeCategoryList;
