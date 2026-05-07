import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { CircularProgress, Box, Button, Tooltip } from "@material-ui/core";
import { debounceSearchRender } from "mui-datatables";

import AllMUIDataTable from "Components/AllMUIDataTable";
import { DATATABLEROWSPERPAGEOPT } from "Constants";
import CustomToolbar from "./CustomToolBar";
import { postRequest } from "Includes/api/apicall";
import { POST_URL } from "Includes/urls";
import EnableMembershipDialog from "./EnableMembershipDialog";

import { isUserHasPermission, getSettingValue } from "Includes/functions";
import "../styles.scss";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import { cloneDeep } from "lodash";
import Swal from "sweetalert2";

const isResidentail = parseInt(getSettingValue("is_residential"));

class StudentMembershipList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tableData: props.data,
      dataReady: false,
      current_standard: null,
      studentTypes: [],
      showEnableDisable: true,
      columns: [
        {
          name: "user_id",
          label: "Id",
          options: {
            filter: false,
            sort: true,
            display: false,
          },
        },
        {
          name: "name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "admission_num",
          label: "Admission No.",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "standard",
          label: <FormattedMessage {...commonMessages.standard} />,
          options: {
            sort: true,
            display: true,
            filter: false ,
          },
        },
        {
          name: "gender",
          label: <FormattedMessage {...commonMessages.gender} />,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "is_library_member",
          label: <FormattedMessage {...commonMessages.status} />,
          options: {
            filter: false,
            sort: false,
            empty: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value ? (
                    <div className="text-green">Enabled</div>
                  ) : (
                    <div className="text-red">Disabled</div>
                  )}
                </div>
              );
            },
          },
        },
        {
          name: "is_library_member",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            filter: false,
            sort: false,
            empty: true,
            display: isUserHasPermission("library_membership", "create"),
            customBodyRender: (value, tableMeta, updateValue) => {
              let studentDetail = tableMeta.tableData[tableMeta.rowIndex];
              return (
                <Box display="flex">
                  {this.state.showEnableDisable && (
                    <Button
                      className={"collect-fees"}
                      onClick={() => {
                        this.showEnableFeaturePopup(
                          studentDetail,
                          "single",
                          value
                        );
                      }}
                    >
                      {value ? "Disable" : "Enable"}
                    </Button>
                  )}
                  <Box pl={2}></Box>
                </Box>
              );
            },
            customHeadRender: (columnMeta, updateDirection) => (
              <th className="mui-table-custom-header-center-align ">
                {columnMeta.label}
              </th>
            ),
          },
        },
      ],
    }; 
  }

  updatePermissions = () => {
    const hasFeatureEnablePermission = isUserHasPermission(
      "library_membership",
      "create"
    );
    if (hasFeatureEnablePermission) {
      return true;
    }
    return false;
  };

  showEnableFeaturePopup = (selected_rows, students, value) => {
    let new_value = value ? "Disable" : "Enable";
    let studentIds = [];
    let studentTypes = [];
    let currentStandard = this.props.standardId;
    if (students === "single") {
      studentIds = [selected_rows.user_id];
      studentTypes.push(selected_rows.student_type);
      Swal.fire({
        title: `<strong>Are you sure want to ${new_value} for ${selected_rows.name} </strong>`,
        type: "info",
        showCloseButton: true,
        showCancelButton: true,
        focusConfirm: true,
        confirmButtonText: `${new_value} Now`,
        cancelButtonText: "Cancel",
        confirmButtonColor: "green",
        cancelButtonColor: "orange",
      }).then((result) => {
        if (result.value) {
          this.setState(
            {
              tableUpdating: true,
            },
            () => {
              let post_data = {
                enabled_user_ids: [],
                disabled_user_ids: [],
              };
              if (value) {
                post_data["disabled_user_ids"].push(selected_rows.user_id);
              } else {
                post_data["enabled_user_ids"].push(selected_rows.user_id);
              }
              let postUrl = POST_URL.librarymembership.api;
              postRequest(postUrl, post_data, this.props).then((response) => {
                if (response && response.status === 200) {
                  Swal.fire({
                    position: "top-end",
                    type: "success",
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500,
                  });
                  this.props.getStudentList();
                }
                this.setState({
                  loadingSync: false,
                  loadingSyncId: "",
                });
              });
            }
          );
        }
      });
    } else {
      let selected_rows_data = [];
      for (const data of selected_rows.data) {
        selected_rows_data.push(data.dataIndex.toString());
      }
      for (const index in this.state.tableData.student_list) {
        if (selected_rows_data.includes(index)) {
          studentIds.push(this.state.tableData.student_list[index]);
          studentTypes.push(
            this.state.tableData.student_list[index]["student_type"]
          );
        }
      }
      this.setState({
        studentIds,
        showEnableFeaturePopup: true,
        current_standard: currentStandard,
        studentTypes,
      });
    }
  };

  closeMemberShipPopup = (isGetStudentList) => {
    this.setState({ showEnableFeaturePopup: false });
    if (isGetStudentList) {
      this.props.getStudentList();
    }
  };

  changePage = (tableState) => {
    this.setState({ tableUpdating: true }, () => {
      this.props.getStudentList(tableState);
    });
  };

  static getDerivedStateFromProps(props) {
    return {
      tableData: props.data,
      tableUpdating: false,
    };
  }

  getTitle = () => {
    if (this.state.tableUpdating || this.props.loading) {
      return <CircularProgress className="white-text" />;
    }
  };

  checkBoxSelected = (buttonShow) => {
    let { columns } = this.state;
    this.setState({
      // showEnableDisable: buttonShow,
      columns: cloneDeep(columns),
    });
  };

  rowSelectionChange = (tableState) => {
    if (!tableState.selectedRows.data.length) {
      this.checkBoxSelected(true);
    }
  };

  render() {
    const {
      studentIds,
      showEnableFeaturePopup,
      current_standard,
      tableData,
      studentTypes,
    } = this.state;
    const { yearId, data } = this.props;
    const selectOption = this.updatePermissions() ? "multiple" : "none";
    const options = {
      responsive: "responsive",
      filter: isUserHasPermission("library_membership", "create"),
      download: false,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
      selectableRows: selectOption,
      selectToolbarPlacement: "replace",
      filterType: "checkbox",
      customToolbarSelect: (selectedRows) => (
        <CustomToolbar
          selectedRows={selectedRows}
          showEnableFeaturePopup={this.showEnableFeaturePopup}
          checkBoxSelected={this.checkBoxSelected}
        />
      ),
    };
    return (
      <Box>
        <AllMUIDataTable
          data={tableData.student_list}
          key={tableData.student_list}
          title={this.getTitle()}
          columns={this.state.columns}
          options={options}
          serverSide={true}
          pagination={this.props.pagination}
          count={data.count}
          onTableChange={this.changePage}
          rowSelectionChange={this.rowSelectionChange}
        />
        {showEnableFeaturePopup && (
          <EnableMembershipDialog
            studentIds={studentIds}
            closeMemberShipPopup={this.closeMemberShipPopup}
            yearId={yearId}
            current_standard={current_standard}
            studentTypes={studentTypes}
            isViewOnly={!this.updatePermissions()}
          />
        )}
      </Box>
    );
  }
}

export default withRouter(StudentMembershipList);
