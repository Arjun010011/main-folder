import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { CircularProgress, Box, Button, Tooltip } from "@material-ui/core";
import { debounceSearchRender } from "mui-datatables";

import AllMUIDataTable from "Components/AllMUIDataTable";
import { DATATABLEROWSPERPAGEOPT } from "Constants";
import CustomToolbar from "./CustomToolBar";
import EnableFeaturePopup from "./EnableFeaturePopup";
import { isUserHasPermission, getSettingValue , getFullName} from "Includes/functions";
import "../styles.scss";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import messages from "../messages";
import { cloneDeep } from "lodash";
import StudentProfileCard from "Components/StudentProfileCard";

const isResidentail = parseInt(getSettingValue("is_residential"));

class StudentDataTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tableData: props.data,
      dataReady: false,
      current_standard: null,
      studentTypes: [],
      showEnableDisable: true,
      studentList:[],
      columns: [
        {
          name: "id",
          label: "Id",
          options: {
            filter: false,
            sort: true,
            display: false,
          },
        },
        {
          name: "first_name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: true,
            search: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <StudentProfileCard
                  student_name={getFullName(
                    tableMeta.tableData[tableMeta.rowIndex]["first_name"],
                    tableMeta.tableData[tableMeta.rowIndex]["middle_name"],
                    tableMeta.tableData[tableMeta.rowIndex]["last_name"]
                  )}
                  id={tableMeta.tableData[tableMeta.rowIndex]["id"]}
                  isApiCall={true}
                />
              );
            },
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
          name: "email",
          label: <FormattedMessage {...commonMessages.email} />,
          options: {
            filter: false,
            sort: true,
            display: false,
          },
        },
        {
          name: "first_name",
          label: "First Name",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
          },
        },
        {
          name: "middle_name",
          label: "Middle Name",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
          },
        },
        {
          name: "last_name",
          label: "Last Name",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
          },
        },
        {
          name: "student_type",
          label: <FormattedMessage {...commonMessages.studentType} />,
          options: {
            filter: false,
            sort: false,
            display: isResidentail ? true : false,
            viewColumns: false,
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
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            filter: false,
            sort: false,
            empty: true,
            // display: this.updatePermissions("display"),
            customBodyRender: (value, tableMeta, updateValue) => {
              let studentDetail = tableMeta.tableData[tableMeta.rowIndex];
              return (
                <Box display="flex">
                  {this.state.showEnableDisable && (
                    <Button
                      className={"collect-fees"}
                      onClick={() => {
                        this.showEnableFeaturePopup(studentDetail, "single");
                      }}
                    >
                      {this.updatePermissions("display") ? (
                        <FormattedMessage {...messages.enableDisable} />
                      ) : (
                        "View Features"
                      )}
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
      "feature_enable",
      "create"
    );
    if (hasFeatureEnablePermission) {
      return true;
    }
    return false;
  };

  showEnableFeaturePopup = (selected_rows, students) => {
    let studentIds = [];
    let studentList=[];
    let studentTypes = [];
    let currentStandard = this.props.standardId;
    if (students === "single") {
      studentIds = [selected_rows.id];
      studentTypes.push(selected_rows.student_type);
    } else {
      let selected_rows_data = [];
      for (const data of selected_rows.data) {
        selected_rows_data.push(data.dataIndex.toString());
      }
      for (const index in this.state.tableData.student_list) {
        if (selected_rows_data.includes(index)) {
          studentIds.push(this.state.tableData.student_list[index]["id"]);
          studentList.push(this.state.tableData.student_list[index]);
          studentTypes.push(
            this.state.tableData.student_list[index]["student_type"]
          );
        }
      }
    }
    this.setState({
      studentIds,
      studentList,
      showEnableFeaturePopup: true,
      current_standard: currentStandard,
      studentTypes,
    });
  };

  closeFeaturePopup = () => {
    this.setState({ showEnableFeaturePopup: false });
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
      studentList
    } = this.state;
    const { yearId, data } = this.props;
    const selectOption = this.updatePermissions() ? "multiple" : "none";
    const options = {
      responsive: "responsive",
      filter: true,
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
          <EnableFeaturePopup
            studentIds={studentIds}
            closeFeaturePopup={this.closeFeaturePopup}
            yearId={yearId}
            current_standard={current_standard}
            studentTypes={studentTypes}
            studentList={studentList}
            isViewOnly={!this.updatePermissions()}
          />
        )}
      </Box>
    );
  }
}

export default withRouter(StudentDataTable);
