import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Tooltip,
  Button,
  CircularProgress,
} from "@material-ui/core";
import Swal from "sweetalert2";
import classNames from "classnames";

import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { dateFormat } from "Includes/functions";
import { options } from "Constants";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";

class SyncPage extends Component {
  constructor() {
    super();
    this.state = {
      syncList: [],
      loading: true,
      selectedToDelete: [],
      enabledActions: [],
      optionsLocal: {},
      tableUpdating: false,
      loadingSync: false,
      loadingSyncId: "",
      columns: [
        {
          name: "label",
          label: "Label",
          options: {
            filter: true,
            sort: true,
            viewColumns: true,
            display: true,
          },
        },
        {
          name: "sync_type",
          label: "Sync Type",
          options: {
            filter: true,
            sort: true,
            viewColumns: true,
            display: true,
          },
        },
        {
          name: "description",
          label: "Description",
          options: {
            filter: true,
            sort: true,
            viewColumns: true,
            display: true,
          },
        },
        {
          name: "sync_type",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {this.state.loadingSync ? (
                    this.state.loadingSyncId === tableMeta.rowData[1] ? (
                      <Button className="custom-button">
                        <CircularProgress className="height-width-25px" />
                        loading
                      </Button>
                    ) : (
                      <Button className="custom-button opacity-0-5">
                        Sync Now
                      </Button>
                    )
                  ) : (
                    <Button
                      className="custom-button"
                      onClick={() =>
                        this.updateSyncData(
                          tableMeta.rowData[1],
                          tableMeta.rowData[0],
                          tableMeta.rowData[2]
                        )
                      }
                    >
                      Sync Now
                    </Button>
                  )}
                </div>
              );
            },
          },
        },
      ],
    };
  }

  updateSyncData = (sync_type, title, description) => {
    Swal.fire({
      title: `<strong>Are you sure want to ${title}</strong>`,
      text: `${description}`,
      type: "info",
      showCloseButton: true,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: "Sync Now",
      cancelButtonText: "Cancel",
      confirmButtonColor: "green",
      cancelButtonColor: "orange",
    }).then((result) => {
      if (result.value) {
        this.setState(
          {
            loadingSync: true,
            syncList: [...this.state.syncList],
            loadingSyncId: sync_type,
          },
          () => {
            let post_data = {
              sync_type: sync_type,
            };
            let postUrl = POST_URL.syncdatas.api;
            postRequest(postUrl, post_data, this.props).then((response) => {
              if (response && response.status === 200) {
                Swal.fire({
                  position: "top-end",
                  type: "success",
                  title: response.data.Reason,
                  showConfirmButton: false,
                  timer: 1500,
                });
              }
              this.setState({
                loadingSync: false,
                syncList: [...this.state.syncList],
                loadingSyncId: "",
              });
            });
          }
        );
      }
    });
  };

  componentDidMount = () => {
    this.getsyncList();
    this.setState({
      optionsLocal: { ...options },
    });
  };

  getsyncList = () => {
    const url = GET_URL.syncdatas.api;
    const params = {};
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data["start_date_label"] = dateFormat(
            data["start_date"],
            "DD-MM-YYYY"
          );
          data["end_date_label"] = dateFormat(data["end_date"], "DD-MM-YYYY");
        });
        this.setState({
          syncList: response.data.data,
          loading: false,
        });
      }
    });
  };

  render() {
    const { loading, syncList, columns, optionsLocal, tableUpdating } =
      this.state;
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
                <Box className="heading">Sync Page</Box>
              </Grid>
            </Grid>
            <Grid container className={classNames("header-align")}>
              <Grid item md={12}>
                <Paper>
                  <AllMUIDataTable
                    key={syncList}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={syncList}
                    columns={columns}
                    options={optionsLocal}
                    onTableChange={this.onTableChange}
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
export default SyncPage;
