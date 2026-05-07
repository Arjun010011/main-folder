import React, { Component } from "react";
import {
  Box,
  Checkbox,
  Typography,
  CircularProgress,
  Grid,
  DialogActions,
  Button,
  TextField,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import PropTypes from "prop-types";
import AllMUIDataTable from "Components/AllMUIDataTable";

import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import loadingBar from "images/loading.gif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import { getFullName } from "Includes/functions";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import { options } from "Constants";
import { Dropdown } from "Components/DropDown";
import SelectStandardSection from "Containers/General/Components/SelectStandardSection";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { cloneDeep } from "lodash";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";

const muitable = ["department", "student", "staff"];
const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <Typography
      component="div"
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      <Box p={3}>{children}</Box>
    </Typography>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};

const select_types = [
  { id: "department", name: "Department" },
  { id: "section", name: "Standard Section" },
  { id: "student", name: "Students" },
  { id: "staff", name: "Staffs" },
];

class NotificationCreate extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      open: false,
      typeList: select_types,
      selected_type: "department",
      standardList: [],
      isYearApiCalled: false,
      isBlankPage: false,
      blankDataMessage: "",
      selected_year: "",
      yearList: [],
      selected_standard: "",
      is_api_called: false,
      sectionList: {},
      isEdit: false,
      selected_students: [],
      all_selected_students: [],
      selected_student_ids: [],
      routeList: [],
      selected_route: "",
      searchStudent: "",
      isAllChecked: false,
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            display: false,
          },
        },
        {
          name: "checked",
          label: "Select",
          options: {
            filter: false,
            sort: false,
            empty: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Checkbox
                  edge="end"
                  checked={value}
                  defaultChecked={value}
                  onChange={() => this.handleTableClick(tableMeta.rowIndex)}
                  className={"padding-0"}
                />
              );
            },
            customHeadRender: (columnMeta, updateDirection) => (
              <th className="mui-table-custom-header-left-align pl-7">
                <Checkbox
                  edge="end"
                  checked={this.state.isAllChecked}
                  defaultChecked={this.state.isAllChecked}
                  onChange={() => this.handleAllCheck()}
                  className={"padding-0"}
                />
              </th>
            ),
          },
        },
        {
          name: "name",
          label: "Department Name",
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
      ],
    };
  }

  handleAllCheck = () => {
    const { isAllChecked, data_list } = this.state;
    let data_list_temp = [...data_list];
    data_list_temp.forEach((data) => {
      data["checked"] = !isAllChecked;
    });
    this.setState({
      isAllChecked: !isAllChecked,
      data_list: [...data_list_temp],
    });
  };

  getAcademicYearList = () => {
    const url = GET_URL.getacademicyear.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          yearList: response.data.data,
        });
      }
    });
  };

  componentDidMount = () => {
    this.getAcademicYearList();
    this.setState({
      selected_year: this.props.selected_year,
    });
    if (this.props.isEdit) {
      const { selected_type, selected_details } = this.props;
      this.setState(
        {
          selected_type,
          selected_details,
          isEdit: this.props.isEdit,
        },
        () => {
          if (selected_type === "department") {
            this.getGroupList();
          } else if (selected_type === "section") {
            this.getStandardList();
          } else if (selected_type === "student") {
            this.setState({
              selected_students: selected_details.updated_list,
              selected_student_ids: selected_details.selected_student_ids,
              isBlankPage: false,
            });
            this.getStandardList();
          } else if (selected_type === "staff") {
            this.getStaffList();
          }
        }
      );
    } else {
      this.getGroupList();
    }
  };

  handleTableClick = (index) => {
    let { data_list } = this.state;
    let data_list_temp = [...data_list];
    data_list_temp[index]["checked"] = !data_list_temp[index]["checked"];
    this.setState({
      data_list: [...data_list_temp],
    });
  };

  getGroupList = () => {
    let selected_ids = [];
    const { is_api_called } = this.state;
    if (this.props.isEdit && !is_api_called) {
      let selected_details = this.props.selected_details;
      selected_details["updated_list"].forEach((element) => {
        selected_ids.push(element.id);
      });
    }
    getRequest(GET_URL.branch.api, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data["checked"] = false;
          if (selected_ids.includes(data["id"])) data["checked"] = true;
        });
        let groupList = response.data.data;
        this.setState({
          groupList,
          loading: false,
          data_list: groupList,
          is_api_called: true,
        });
      }
    });
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  handleStateViewButton = () => {
    this.props.history.push(Actions.bulk_notification.view.url);
  };

  onChange = (e) => {
    let { name, value } = e.target;
    const { selected_type } = this.state;
    if (value !== selected_type) {
      this.setState(
        {
          [name]: value,
          selected_standard: "",
          selected_section: "",
          data_list: [],
          selected_students: [],
          selected_student_ids: [],
          isAllChecked: false,
        },
        () => {
          if (value === "section" || value === "student") {
            this.setState(
              {
                isBlankPage: true,
                blankDataMessage: `Select ${alias_names["standard"]} and ${alias_names["section"]}`,
              },
              () => {
                this.getStandardList();
              }
            );
          }
          if (value === "staff") {
            this.setState(
              {
                isBlankPage: false,
              },
              () => {
                this.getStaffList();
              }
            );
          }
          if (value === "department") {
            this.setState(
              {
                isBlankPage: false,
              },
              () => {
                this.getGroupList();
              }
            );
          }
        }
      );
    }
  };

  getStaffList = () => {
    const { isEdit, is_api_called, selected_details } = this.state;
    let selected_ids = [];
    if (isEdit && !is_api_called) {
      selected_details["updated_list"].forEach((element) => {
        selected_ids.push(element.user_id);
      });
    }
    const url = GET_URL.getstafffullname.api;
    const params = { is_active: true };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data["name"] = getFullName(
            data["first_name"],
            data["middle_name"],
            data["last_name"]
          );
          data["checked"] = false;
          if (selected_ids.includes(data["user_id"])) {
            data["checked"] = true;
          }
        });
        this.setState({
          data_list: response.data.data,
          is_api_called: true,
          loading: false,
        });
      }
    });
  };

  getRoutePlanName = () => {
    let selected_ids =[];
    const{ selected_route , is_api_called} = this.state;
    if (this.props.isEdit && !is_api_called) {
      let selected_details = this.props.selected_details;
      selected_details["updated_list"].forEach((element) => {
        selected_ids.push(element.id);
      });
    }
    const url = GET_URL.route.api;
    const params = { is_active: 1 }
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        let routeList = response.data.data;
        routeList.map((data) => {
          data["checked"] = false;
          if (selected_route.includes(data["id"]))
            data["checked"] = true;
        });
        this.setState({
          routeList: response.data.data,
          loading: false,
          isBlankPage: true,
        });
        return;
      }
    })
  };

  onRouteChange = (data) => {
    let { selected_route } = this.state
    selected_route = data
    this.setState({
      selected_route,
    })
  }

  onChangeDropdown = (e) => {
    let { name, value } = e.target;
    this.setState(
      {
        [name]: value,
        isAllChecked: false,
      },
      () => {
        if (name === "selected_year") {
          this.setState(
            {
              selected_standard: "",
              selected_section: "",
              data_list: [],
              blankDataMessage: `Select  ${alias_names["standard"]}`,
            },
            () => {
              this.getStandardList();
            }
          );
        } else if (name === "selected_standard") {
          this.setState({
            selected_section: "",
            data_list: [],
            blankDataMessage: `Select  ${alias_names["section"]}`,
          });
        } else if (name === "selected_section") {
          this.setState({
            data_list: [],
          });
          this.getStudentList();
        }
      }
    );
  };

  getStudentList = () => {
    let {
      selected_year,
      selected_standard,
      selected_section,
      selected_student_ids,
    } = this.state;
    const params = {
      academic_year: selected_year,
      standard: selected_standard,
      section: selected_section,
    };
    getRequest(GET_URL.getenrolledstudents.api, params).then((response) => {
      if (response && response.status === 200) {
        let studentList = response.data.data;
        studentList.map((data) => {
          data["checked"] = false;
          if (selected_student_ids.includes(data["user_id"]))
            data["checked"] = true;
        });
        this.setState({
          data_list: studentList,
          isBlankPage: false,
        });
      }
    });
  };

  getStandardList = () => {
    let {
      selected_year,
      selected_type,
      isBlankPage,
      sectionList,
      isEdit,
      selected_details,
      is_api_called,
      blankDataMessage,
    } = this.state;
    const url = GET_URL.getstandardandsection.api;
    const params = { is_active: true, academic_year: selected_year };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (selected_type === "section") {
          let temp = {
            id: 0,
            name: "All",
            checked: false,
            expanded: false,
            sections: [],
          };
          response.data.data.unshift(temp);
          isBlankPage = response.data.data.length > 1 ? false : true;
          if (response.data.data.length === 1) {
            blankDataMessage = "There is no standards";
          }
        }
        let selected_standard_ids = [];
        let selected_section_ids = [];
        if (isEdit && !is_api_called && selected_type === "section") {
          selected_details["updated_list"].forEach((element) => {
            selected_standard_ids.push(element.id);
            element.sections.map((data) => {
              selected_section_ids.push(data["standard_section"]);
            });
          });
          response.data.data[0]["checked"] = true;
        }
        response.data.data.map((data) => {
          data.expanded = false;
          data["checked"] = false;
          if (selected_standard_ids.includes(data["id"])) {
            data["checked"] = true;
          } else {
            response.data.data[0]["checked"] = false;
          }
          data.sections.map((section) => {
            section["checked"] = false;
            if (selected_section_ids.includes(section["standard_section"])) {
              section["checked"] = true;
            } else {
              response.data.data[0]["checked"] = false;
            }
          });
          sectionList[data.id] = data.sections;
        });
        this.setState({
          standardList: response.data.data,
          loading: false,
          sectionList,
          is_api_called: true,
          isBlankPage,
          blankDataMessage,
        });
      }
    });
  };

  onChangegroup = (index) => {
    let { groupList } = this.state;
    groupList[index]["checked"] = !groupList[index]["checked"];
    this.setState({
      groupList,
    });
  };

  handleExpandClick = (index) => {
    let { standardList } = this.state;
    standardList[index]["expanded"] = !standardList[index]["expanded"];
    this.setState({
      standardList,
    });
  };

  handleCheckClick = (parentIndex, childIndex) => {
    let { standardList } = this.state;
    let temp_standard_list = cloneDeep(standardList);
    let is_all_checked = true;
    if (parentIndex === 0) {
      temp_standard_list[parentIndex]["checked"] =
        !temp_standard_list[parentIndex]["checked"];
      temp_standard_list.map((standard) => {
        standard.checked = temp_standard_list[parentIndex]["checked"];
        standard.sections.map((section) => {
          section.checked = temp_standard_list[parentIndex]["checked"];
        });
      });
    } else {
      if (childIndex !== undefined) {
        let is_section_checked = false;
        temp_standard_list[parentIndex]["sections"][childIndex]["checked"] =
          !temp_standard_list[parentIndex]["sections"][childIndex]["checked"];
        temp_standard_list[parentIndex]["sections"].map((section) => {
          if (section.checked) {
            is_section_checked = true;
          } else if (parentIndex !== 0) {
            is_all_checked = false;
          }
        });
        if (is_section_checked) {
          temp_standard_list[parentIndex]["checked"] = true;
        } else {
          temp_standard_list[parentIndex]["checked"] = false;
          temp_standard_list[parentIndex]["expanded"] = false;
        }
        temp_standard_list[0]["checked"] = is_all_checked;
      } else {
        temp_standard_list[parentIndex]["checked"] =
          !temp_standard_list[parentIndex]["checked"];
        temp_standard_list.map((standard, index) => {
          if (!standard["checked"] && index !== 0) {
            is_all_checked = false;
          }
        });
        temp_standard_list[parentIndex].sections.map((section) => {
          section.checked = temp_standard_list[parentIndex]["checked"];
        });
        temp_standard_list[0]["checked"] = is_all_checked;
      }
    }
    this.setState({
      standardList: [...temp_standard_list],
    });
  };

  handleSubmit = () => {
    let {
      data_list,
      selected_route,
      selected_type,
      standardList,
      selected_students,
      selected_student_ids,
    } = this.state;
    let tempStandardList = cloneDeep(standardList);
    let selected_details = { updated_list: [] };
    if (selected_type === "department") {
      data_list.map((data) => {
        if (data.checked) {
          selected_details["updated_list"].push(data);
        }
      });
    } else if (selected_type === "section") {
      let temp_section = [];
      let temp_section_names = [];
      tempStandardList.map((data) => {
        if (data["checked"] && data.name !== "All") {
          temp_section = [];
          temp_section_names = [];
          data.sections.map((sectionData) => {
            if (sectionData["checked"]) {
              temp_section.push(sectionData);
              temp_section_names.push(sectionData.name);
            }
          });
          data["sections"] = temp_section;
          data["name"] = `${data.name} [${temp_section_names.join(", ")}]`;
          selected_details["updated_list"].push(data);
        }
      });
    } else if (selected_type === "student") {
      selected_details["updated_list"] = [...selected_students];
      selected_details["selected_student_ids"] = [...selected_student_ids];
    } else if (selected_type === "staff") {
      data_list.map((data) => {
        if (data.checked) {
          selected_details["updated_list"].push(data);
        }
      });
    }
    this.props.updateParent(selected_details, selected_type);
  };

  getLabelName = () => {
    const { selected_type } = this.state;
    if (selected_type === "department") {
      return "Department Name";
    } else if (selected_type === "student") {
      return "Students";
    } else if (selected_type === "staff") {
      return "Staff";
    }
  };

  handleAddStudents = () => {
    const {
      data_list,
      selected_students,
      all_selected_students,
      selected_student_ids,
    } = this.state;
    data_list.map((data) => {
      if (data.checked && !selected_student_ids.includes(data["user_id"])) {
        selected_students.push(data);
        all_selected_students.push(data);
        selected_student_ids.push(data["user_id"]);
      }
    });
    this.setState({
      selected_students,
      all_selected_students,
      selected_student_ids,
      isAllChecked: false,
    });
  };

  handleFilter = (e) => {
    let { name, value, filterList } = e.target;
    let { all_selected_students, selected_students } = this.state;
    if (value !== "") {
      let lowerCasedFilter = value.toLowerCase().replace(/\s+/g, "");
      filterList = all_selected_students.filter((item) => {
        return Object.keys(item).some(
          (key) =>
            typeof item[key] === "string" &&
            item[key]
              .toLowerCase()
              .replace(/\s+/g, "")
              .includes(lowerCasedFilter)
        );
      });
      selected_students = filterList;
    } else {
      selected_students = [...all_selected_students];
      filterList = [];
    }
    this.setState({
      [name]: value,
      filterList,
      selected_students,
    });
  };

  handleDeleteStudent = (index) => {
    let { selected_students, selected_student_ids } = this.state;
    selected_students.splice(index, 1);
    selected_student_ids.splice(index, 1);
    this.setState({
      selected_students,
      selected_student_ids,
    });
  };

  render() {
    const {
      loading,
      open,
      selected_type,
      typeList,
      isBlankPage,
      sectionList,
      selected_section,
      data_list,
      tableUpdating,
      blankDataMessage,
      columns,
      standardList,
      selected_standard,
      selected_students,
      yearList,
      selected_year,
      routeList,
      selected_route,
    } = this.state;
    let columns_list = [...columns];
    columns_list[2]["label"] = this.getLabelName();
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <div className="margin-top-70">
          <Grid container className="mt-20" spacing={3}>
            <Grid item md={3} xs={12}>
              <Dropdown
                data={typeList}
                name="selected_type"
                value={selected_type}
                onChange={this.onChange}
                label="Select Type"
                hideSelect={true}
              />
            </Grid>
            {selected_type === "section" && (
              <Grid item md={3} xs={12}>
                <Dropdown
                  data={yearList}
                  name="selected_year"
                  value={selected_year}
                  onChange={this.onChangeDropdown}
                  label="Select Year"
                  hideSelect={true}
                />
              </Grid>
            )}
            {selected_type === "student" && (
              <>
                <Grid item md={3} xs={12}>
                  <Dropdown
                    data={yearList}
                    name="selected_year"
                    value={selected_year}
                    onChange={this.onChangeDropdown}
                    label="Select Year"
                    hideSelect={true}
                  />
                </Grid>
                <Grid item md={3} xs={12}>
                  <Dropdown
                    data={standardList}
                    name="selected_standard"
                    value={selected_standard}
                    onChange={this.onChangeDropdown}
                    label="Select Standard"
                    hideSelect={true}
                  />
                </Grid>
                <Grid item md={3} xs={12}>
                  <Dropdown
                    data={sectionList[selected_standard]}
                    name="selected_section"
                    value={selected_section}
                    onChange={this.onChangeDropdown}
                    label={`Select ${alias_names["section"]}`}
                    hideSelect={true}
                    disabled={!selected_standard}
                  />
                </Grid>
              </>
            )}
          </Grid>
          <Grid container className="mt-20" spacing={3}>
            {isBlankPage ? (
              <Grid item md={12} xs={12}>
                <BlankPagewithIcon data={blankDataMessage} />
              </Grid>
            ) : (
              <>
                <Grid item md={5} xs={12}>
                  <>
                    {muitable.includes(selected_type) && (
                      <AllMUIDataTable
                        key={data_list}
                        title={
                          tableUpdating ? (
                            <CircularProgress className="white-text" />
                          ) : (
                            ""
                          )
                        }
                        data={data_list}
                        columns={columns}
                        options={options}
                      />
                    )}
                    {selected_type === "section" && (
                      <SelectStandardSection
                        standardList={standardList}
                        handleExpandClick={this.handleExpandClick}
                        handleCheckClick={this.handleCheckClick}
                      />
                    )}
                  </>
                </Grid>
                {selected_type === "student" && (
                  <>
                    <Grid item md={2} xs={12}>
                      <Button
                        variant="contained"
                        color="primary"
                        className="custom-button"
                        onClick={this.handleAddStudents}
                      >
                        Add Students
                      </Button>
                    </Grid>
                    <Grid item md={5} xs={12} className="height-65vh">
                      {/* <TextField
                                                id="outlined-name"
                                                value={searchStudent}
                                                placeholder=""
                                                label="Search Student"
                                                name='searchStudent'
                                                onChange={(e) => { this.handleFilter(e) }}
                                            /> */}
                      <table width="100%" className="selectable-row-table">
                        <thead className="table-select-hostel-thead">
                          <th className={`selectable-table-head`}>
                            Student Name
                          </th>
                          <th className={`selectable-table-head`}>
                            {`${alias_names["standard"]} [${alias_names["section"]}]`}{" "}
                          </th>
                          <th className={`selectable-table-head`}> Action </th>
                        </thead>
                        <tbody className="selectable-row-table-body">
                          {selected_students.map((student, index) => {
                            return (
                              <tr
                                key={index}
                                className={"selectable-row-table-row"}
                              >
                                <td className={"textAlign pl-15 "}>
                                  {student.name}
                                </td>
                                <td className={"textAlign pl-15 "}>
                                  {`${student.standard_name} [${student.section_name}]`}
                                </td>
                                <td className={"textAlign pl-15 "}>
                                  <DeleteOutlineIcon
                                    onClick={() =>
                                      this.handleDeleteStudent(index)
                                    }
                                    className="text-red cursor-pointer"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                          {selected_students.length === 0 && (
                            <tr className="text-center font-weight-bold">
                              No Data Found
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </Grid>
                  </>
                )}
              </>
            )}
          </Grid>
          <DialogActions>
            {(selected_type !== "student" ||
              (selected_type === "student" &&
                selected_students.length > 0)) && (
                <Box className="submt-button-float-bottom" mt={3}>
                  <Button
                    variant="contained"
                    color="primary"
                    className="submit"
                    onClick={this.handleSubmit}
                  >
                    Select
                  </Button>
                </Box>
              )}
          </DialogActions>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={open}
            autoHideDuration={2000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              <FormattedMessage {...commonMessages.clearAllErrors} />
            </Alert>
          </Snackbar>
        </div>
      );
    }
  }
}
export default withRouter(NotificationCreate);
