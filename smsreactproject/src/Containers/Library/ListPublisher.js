import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { Paper, Box, Grid, Button } from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link } from "react-router-dom";

import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from "Components/LoadingGif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, updatePermissions } from "Includes/functions";
import { options } from "Constants";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";

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
  },
];

class ListPublisher extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("library_publisher", [
      "update",
      "delete",
    ]);
    this.state = {
      loading: true,
      categoryTypeList: [],
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: true,
            sort: true,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "name",
          label: <FormattedMessage {...commonMessages.name} />,
          options: {
            filter: true,
            sort: true,
          },
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
                    label={
                      <FormattedMessage {...messages.libPublisher} />
                    }
                    fieldDetails={fieldDetails}
                    baseClassName="action-basic-detail-width"
                    updateUrl={PUT_URL.librarypublisher.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    deleteUrl={DEL_URL.librarypublisher.api}
                    deleteType={this.deleteType}
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

  componentDidMount() {
    this.getCategoryTypeList();
  }

  getCategoryTypeList = () => {
    let { categoryTypeList } = this.state;
    let url = GET_URL.librarypublisher.api;
    let params = { is_active: 1 };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        categoryTypeList = response.data.data;
        this.setState({
          categoryTypeList,
          loading: false,
        });
      }
    });
  };

  deleteType = async (id) => {
    let categoryType = this.state.categoryTypeList;
    let index = categoryType.findIndex((data) => data.id === id);
    categoryType.splice(index, 1);
    this.setState({
      categoryTypeList: [...categoryType],
    });
  };

  updatePostFormat = (newData) => {
    let payload = {
      publisher: { name: newData.name },
    };
    return payload;
  };

  updateType = (newData, id) => {
    let categoryType = this.state.categoryTypeList;
    for (const data of categoryType) {
      if (data.id === id) {
        data.name = newData.name;
        break;
      }
    }
    this.setState({
      categoryTypeList: [...categoryType],
    });
    return true;
  };

  render() {
    let { loading, categoryTypeList, columns } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <div>
          <Paper className={"paper-background"}>
            <Grid container>
              <Grid item md={7} xs={12} sm={12}>
                <div className="header-align heading">
                  <FormattedMessage {...messages.libPublisher} />
                </div>
              </Grid>
              <Grid item md={5} xs={12} sm={12}>
                <div className="end-flex-prop header-align">
                  {isUserHasPermission("library_publisher", "create") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.library_publisher.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.library_publisher.create.label}
                    </Button>
                  )}
                </div>
              </Grid>
            </Grid>
            <Grid container className="header-align">
              <Grid item md={8} xs={12}>
                <AllMUIDataTable
                  data={categoryTypeList}
                  columns={columns}
                  options={options}
                />
              </Grid>
            </Grid>
          </Paper>
        </div>
      );
    }
  }
}

export default withRouter(ListPublisher);
