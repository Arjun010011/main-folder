import React, { Component } from "react";
import { Paper, Box, Grid, Button, CircularProgress } from "@material-ui/core";
import Swal from "sweetalert2";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link, withRouter } from "react-router-dom";
import classNames from "classnames";
import EditIcon from "@material-ui/icons/Edit";

import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL } from "Includes/urls";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  updatePermissions,
  getAcademicYear,
  getKeyValueMap,
  SetAcademicYear,
} from "Includes/functions";
import { options } from "Constants";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { Dropdown } from "Components/DropDown";
import StudentListActions from "Includes/StudentListActions";

const fieldDetails = [
  {
    label: <FormattedMessage {...commonMessages.sectionName} />,
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

class GradePlanView extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("sections", ["update", "delete"]);
    this.state = {
      gradePlanList: [],
      loading: true,
      selectedToDelete: [],
      enabledActions: [],
      tableUpdating: false,
      error: {},
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
          label: "Plan Name",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
          },
        },
        {
          name: "grade_type",
          label: "Grade Type",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value === 0 ? (
                    <div className="text-green">Marks</div>
                  ) : value === 1 ? (
                    <div className="text-blue">Percentage</div>
                  ) : (
                    <div className="text-red">Grade Only</div>
                  )}
                </div>
              );
            },
          },
        },
        {
          name: "Action",
          label: "Action",
          options: {
            display: this.updatePermissions("display"),
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <StudentListActions
                    id={tableMeta.rowData[0]}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.deleteGradePlan}
                    editURL={Actions.exam_grade_plan.update.url}
                    editExtraParams={{ id: tableMeta.rowData[0] }}
                    enabledActions={this.state.enabledActions}
                    handleActive={this.handleActive}
                  />
                </div>
              );
            },
          },
        },
      ],
    };
  }

  deleteGradePlan = (id, index) => {
    let { gradePlanList } = this.state;
    let url = `${DEL_URL.studentgrade.api}${id}/`;
    deleteRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        gradePlanList.splice(index, 1);
        this.setState({
          gradePlanList: [...gradePlanList],
        });
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
  };

  updatePermissions = (name) => {
    let test = true;
    const hasEditPermission = isUserHasPermission("exam_grade_plan", "update");
    const hasDeletePermission = isUserHasPermission(
      "exam_grade_plan",
      "delete"
    );
    let permissions = [];
    let enabledActions = [];
    if (hasEditPermission) {
      enabledActions.push("edit");
      permissions.push("exam_grade_plan");
    }
    if (hasDeletePermission) {
      enabledActions.push("delete");
      permissions.push("exam_grade_plan");
    }
    if (enabledActions.length === 0) {
      test = false;
    }
    if (name === "display") {
      return test;
    } else {
      this.setState({
        enabledActions: enabledActions,
        permissions,
        columns: this.state.columns,
      });
    }
  };

  componentDidMount = () => {
    this.updatePermissions();
    this.getGradePlan();
  };

  updatePostFormat = (newData) => {
    let payload = {
      name: newData.name,
    };
    return payload;
  };

  updateType = (newData, id) => {
    let section = this.state.gradePlanList;
    for (const data of section) {
      if (data.id === id) {
        data.name = newData.name;
        break;
      }
    }
    this.setState({
      gradePlanList: [...section],
    });
    return true;
  };

  getGradePlan = () => {
    const url = GET_URL.studentgrade.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          gradePlanList: response.data.data,
          loading: false,
          tableUpdating: false,
        });
      }
    });
  };

  deleteType = async (id) => {
    let section = this.state.gradePlanList;
    section.map((data, index) => {
      if (data.id === id) {
        section.splice(index, 1);
      }
    });
    this.setState({
      gradePlanList: section,
    });
  };

  handleAddPlan = () => {
    this.props.history.push({
      pathname: Actions.exam_grade_plan.create.url,
    });
  };

  render() {
    const {
      loading,
      gradePlanList,
      columns,
      tableUpdating,
      yearList,
      selectedYear,
      error,
    } = this.state;
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
                <Box className="heading">
                  {Actions.exam_grade_plan.view.label}
                </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission("exam_grade_plan", "create") && (
                    <Button
                      variant="contained"
                      onClick={this.handleAddPlan}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />
                      {Actions.exam_grade_plan.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Grid container className={classNames("header-align")}>
              <Grid item md={6} xs={12}>
                <Paper>
                  <AllMUIDataTable
                    key={gradePlanList}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={gradePlanList}
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
export default withRouter(GradePlanView);
