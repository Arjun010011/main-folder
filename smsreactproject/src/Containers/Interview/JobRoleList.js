import React, { Component } from "react";
import { Paper, Box, Grid, Button, CircularProgress } from "@material-ui/core";
import { Link, withRouter } from "react-router-dom";
import classNames from "classnames";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import Swal from "sweetalert2";

import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import { options } from "Constants";
import StudentListActions from "Includes/StudentListActions";

class JobRoleList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loading: true,
      tableUpdating: false,
      totalCount: 0,
      pagination: {
        page: 1,
        limit: 10,
        searchText: "",
        sortOrder: "desc",
        sortField: "id",
      },
      columns: [
        {
          name: "id",
          label: "id",
          options: { filter: false, sort: false, display: false },
        },
        {
          name: "name",
          label: "Role Name",
          options: { filter: true, sort: true },
        },
        {
          name: "description",
          label: "Description",
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value) => value || "-",
          },
        },
        {
          name: "Actions",
          label: "Action",
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              const rowId = tableMeta.rowData[0];
              return (
                <div>
                  <StudentListActions
                    id={rowId}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.handleDelete}
                    editURL={"/interview/jobrole/edit"}
                    editExtraParams={{ id: rowId }}
                    enabledActions={["edit", "delete"]}
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
    this.fetchData();
  }

  fetchData = () => {
    const { pagination } = this.state;
    const url = `${GET_URL.jobrole.api}?pageno=${pagination.page}&limit=${pagination.limit}`;
    this.setState({ tableUpdating: true });

    getRequest(url, {}, this.props)
      .then((response) => {
        if (response && response.data && response.data.data) {
          this.setState({
            data: response.data.data.data_list || [],
            totalCount: response.data.data.count || 0,
            loading: false,
            tableUpdating: false,
          });
        } else {
          this.setState({ loading: false, tableUpdating: false });
        }
      })
      .catch(() => this.setState({ loading: false, tableUpdating: false }));
  };

  handleDelete = (id, index) => {
    Swal.fire({
      title: "Are you sure?",
      text: "Once deleted, you will not be able to recover this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.value) {
        const url = `${DEL_URL.jobrole.api}${id}/`;
        deleteRequest(url, {}, this.props).then((response) => {
          if (response && response.status === 200) {
            Swal.fire({
              position: "top-end",
              icon: "success",
              title: "Deleted Successfully",
              showConfirmButton: false,
              timer: 1500,
            });
            this.fetchData();
          }
        });
      }
    });
  };

  onTableChange = (tableState, action) => {
    if (action === "changePage") {
      let temp = { ...this.state.pagination };
      temp.page = tableState.page + 1;
      this.setState({ pagination: temp }, this.fetchData);
    } else if (action === "changeRowsPerPage") {
      let temp = { ...this.state.pagination };
      temp.limit = tableState.rowsPerPage;
      temp.page = 1;
      this.setState({ pagination: temp }, this.fetchData);
    }
  };

  render() {
    const { data, loading, tableUpdating, columns, totalCount, pagination } = this.state;

    if (loading) {
      return <LoadingGif />;
    }

    let modifiedOptions = {
      ...options,
      serverSide: true,
      textLabels: {
        body: {
          noMatch: tableUpdating
            ? "Loading..."
            : "Sorry, there is no matching data to display",
        },
      },
    };

    return (
      <Paper className={classNames("paper-background")}>
        <Grid container>
          <Grid item md={6} xs={12} className={classNames("header-align")}>
            <Box className="heading">Job Roles</Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box className={classNames("header-align", "end-flex-prop")}>
              <Button
                variant="contained"
                component={Link}
                to={"/interview/jobrole/add"}
                className="editbutton-view"
              >
                <AddCircleOutlineIcon className="visibility-icon" /> Add Role
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={3} className={classNames("flex-justify-center")}>
          <Grid item md={12} xs={12}>
            <Box mt={2} width="100%">
              <Paper>
                <AllMUIDataTable
                  key={data}
                  title={
                    tableUpdating ? (
                      <CircularProgress className="white-text" />
                    ) : (
                      ""
                    )
                  }
                  data={data}
                  columns={columns}
                  options={modifiedOptions}
                  onTableChange={this.onTableChange}
                  serverSide={true}
                  pagination={pagination}
                  count={totalCount}
                />
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    );
  }
}

export default withRouter(JobRoleList);
