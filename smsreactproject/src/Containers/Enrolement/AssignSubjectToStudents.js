import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { Paper, Box, Button, Grid, CircularProgress } from "@material-ui/core";
import { FormattedMessage } from "react-intl";

import PropTypes from "prop-types";
import SubjectAssign from "Containers/Enrolement/SubjectAssign";
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from "Components/LoadingGif";
import { Dropdown } from "Components/DropDown";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import {
  SetAcademicYear,
  checkLocalAcademicYear,
  getKeyValueInArray,
  getSettingValue,
  getPaginationProps,
  getFullName,
  getFormatMessage,
  getCommaSeperatedArrayOfObjects,
} from "Includes/functions";
import commonMessages from "Constants/messages";
import messages from "./messages";
import "./styles.scss";

const number_of_language = parseInt(getSettingValue("number_of_language"));

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class AssignSubjectToStudents extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      year: '',
      yearList: [],
      standard: '',
      section: '',
      standardList: [],
      selectedStudentList: [],
      sectionList: [],
      subjectList: [],
      subject: [],
      subjectListSelected: [],
      enrollmentDetails: [],
      onchage: false,
      standardSelected: false,
      studentDetails: {},
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      tableLoading: false,
      openPopUp: false,
      popUpDetails: {},
    };
  }

  componentDidMount() {
    let pagination = { ...DEFAULT_PAGINATION_PROPS_ID_LIST };
    pagination.sortOrder.name = "name";
    pagination.sortOrder.direction = "asc";
    this.setState({ pagination }, () => {
      this.getAcademicYear();
    });
  }

  getAcademicYear = () => {
    const params = {};
    getRequest(GET_URL.getacademicyear.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let yearList = response.data.data;
          let year = checkLocalAcademicYear(yearList);
          if (year) {
            let yearName = getKeyValueInArray(yearList, "id", year, "name");
            this.setState({ yearList, year, yearName, loading: true }, () => {
              this.getStandard();
            });
          }
          else {
            this.setState({
              loading: false,
              yearList
            })
          }
        }
      }
    );
  };

  getStandard = () => {
    let { standard } = this.state;
    const params = { academic_year: this.state.year, is_active: true };
    getRequest(GET_URL.getstandardandsection.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          const standardList = response.data.data;
          let stdSelected = '';
          if (!standard) {
            // eslint-disable-next-line no-unused-vars
            for (const std of standardList) {
              if (std.id === standard) {
                stdSelected = standard;
              }
            }
          }
          this.setState({
            standardList,
            standard: stdSelected,
            section: '',
            loading: false,
          });
        }
      }
    );
  };

  getStandardSectionsList = () => {
    let { standard, standardList } = this.state;
    if (standard !== 0) {
      const sectionList = getKeyValueInArray(standardList, 'id', standard, 'sections');
      this.setState({ sectionList, loading: false });
    }
  }

  onChange = (e) => {
    let { value, name } = e.target;
    if (value && name === "year") {
      this.setState({ [name]: value }, () => {
        if (name === "year") {
          SetAcademicYear(value);
          this.setState(
            {
              standard: '',
              section: '',
              sectionList: [],
              standardSelected: false,
              studentDetails: {},
            },
            () => {
              this.getStandard();
            }
          );
        }
      });
    } else {
      if (value) {
        this.setState({ [name]: value }, () => {
          if (name === "standard") {
            this.setState({ standardSelected: true, studentDetails: {}, section: '' }, () => {
              this.getStandardSectionsList();
            });
          } else if (name === "section") {
            let { section, sectionList, standardSelected } = this.state;
            if (standardSelected === true) {
              let standard_section;
              section = value;
              // eslint-disable-next-line no-unused-vars
              for (const data of sectionList) {
                if (section === data.id) {
                  standard_section = data.standard_section;
                  break;
                }
              }
              this.getStudentList();
              this.setState({
                section: section,
                standard_section: standard_section,
              });
            }
          }
        });
      }
    }
  };

  handlePopupStatus = (selectedRows) => {
    let { studentDetails, selectedStudentList, year, standardList, sectionList, standard_section, standard, section, } =
      this.state;
    if (selectedRows && selectedRows.data) {
      const selectedIndices = selectedRows.data.map((data) => data.dataIndex);
      selectedStudentList = studentDetails.student_list.filter((data, index) =>
        selectedIndices.includes(index)
      );
    }
    const popUpDetails = {
      year,
      standardList,
      sectionList,
      student_id: selectedStudentList,
      standard_section,
      standard,
      section,
      studentDetails: studentDetails.student_list,
      multiple: true,
    };
    this.setState({
      openPopUp: true,
      selectedStudentList,
      popUpDetails
    });
  };

  getStudentList = (paginationProps, sortData) => {
    let { pagination, year, standard, section } = this.state;
    this.currentPagination = { ...pagination };
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    const url = GET_URL.getenrolledstudents.api;
    let params = {
      ...pagination_params,
      academic_year: year,
      standard: standard,
      section: section,
      pagination: 1,
      limit: pagination_params.limit,
      pageno: pagination_params.pageno,
      subject: 1,
    };
    if (sortData) {
      if (this.prevSortManner === 'asc') {
        this.prevSortManner = 'desc';
        params.ordering = `-${sortData.name}`
      } else {
        this.prevSortManner = 'asc';
        params.ordering = sortData.name
      }
    }
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let response_data = response.data.data;
        response_data.student_list.forEach((student) => {
          student.full_name = getFullName(
            student.student_first_name,
            student.student_middle_name,
            student.student_last_name
          );
          if (number_of_language > 1) {
            student.assigned_subject.map((sub) => {
              sub['subject_label'] = (sub.subject_sequence && number_of_language > 1) ? this.viewSubjects(sub) : sub['subject_name']
            })
            student['subjects'] = getCommaSeperatedArrayOfObjects(student.assigned_subject, 'subject_label')
          }
          else {
            student['subjects'] = getCommaSeperatedArrayOfObjects(student.assigned_subject, 'subject_name')
          }
        });

        this.setState({
          studentDetails: response_data,
          loading: false,
          // studentList: response_data,
          tableUpdating: false,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      }
    });
  };

  getBlankPageMessage = () => {
    let { standardSelected, section, year } = this.state;
    let message = "";
    if (!year) {
      message = `Select year, ${alias_names['standard']} and ${alias_names['section']}`
    }
    else if (!standardSelected) {
      message = `Select  ${alias_names['standard']} and ${alias_names['section']}`
    }
    else if (!section) {
      message = `Select  ${alias_names['section']}`
    }
    return message;
  };

  assignSubject = (student_id) => {
    let {
      year,
      standardList,
      sectionList,
      standard_section,
      standard,
      section,
      studentDetails,
    } = this.state;
    const popUpDetails = {
      year,
      student_id,
      standardList,
      sectionList,
      standard_section,
      standard,
      section,
      studentDetails: studentDetails.student_list,
    };
    this.setState({ openPopUp: true, popUpDetails });
  };

  onClosePopup = (status) => {
    if (status) {
      this.getStudentList();
    }
    this.setState({ openPopUp: false, popUpDetails: {} });
  };

  viewSubjects = (subjects) => {
    let return_value = ''
    if (subjects.subject_sequence === 1) {
      return_value = `${subjects.subject_name} [${(
        getFormatMessage(<FormattedMessage {...commonMessages.firstLang} />)
      )}]`
    }
    else if (subjects.subject_sequence === 2) {
      return_value = `${subjects.subject_name} [${(
        getFormatMessage(<FormattedMessage {...commonMessages.secondLang} />)
      )}]`
    }
    else if (subjects.subject_sequence === 3) {
      return_value = `${subjects.subject_name} [${(
        getFormatMessage(<FormattedMessage {...commonMessages.thirdLang} />)
      )}]`
    }
    return return_value
  };

  render() {
    let {
      loading,
      year,
      yearList,
      standardList,
      standard,
      section,
      sectionList,
      studentDetails,
      tableLoading,
      pagination,
      openPopUp,
      popUpDetails,
    } = this.state;

    let blankPageMessage = this.getBlankPageMessage();
    const options = {
      filterType: "multiselect",
      responsive: "standard",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [10, 25, 50, 100],
      selectableRows: "multiple",
      customToolbarSelect: (selectedRows) => (
        <MuiToolbar
          name={<FormattedMessage {...messages.enrollStudents} />}
          selectedRows={selectedRows}
          showEnableFeaturePopup={this.handlePopupStatus}
        />
      ),
      onDownload: (buildHead, buildBody, columns, data) => {
        const bodyData = data
        const bodyColumn = columns.map((column_name) => {
          column_name.label = getFormatMessage(column_name.label);
          return column_name;
        });
        return "\uFEFF" + buildHead(bodyColumn) + buildBody(bodyData);
      },
      downloadOptions: {
        filename: "assigned_subjects.csv",
        filterOptions: {
          useDisplayedColumnsOnly: true,
          useDisplayedRowsOnly: true,
        },
      },
    };

    const columns = [
      {
        name: "full_name",
        label: <FormattedMessage {...commonMessages.studentName} />,
        options: {
          filter: false,
          sort: false,
        },
      },
      {
        name: "current_reg_num",
        label: <FormattedMessage {...commonMessages.regNum} />,
        options: {
          filter: false,
          sort: false,
        },
      },
      {
        name: "id",
        label: "ID",
        options: {
          filter: false,
          sort: false,
          display: false,
          viewColumns: false,
          download: false,
        },
      },
      {
        name: "student",
        label: "student",
        options: {
          filter: false,
          sort: false,
          display: false,
          viewColumns: false,
          download: false,
        },
      },
      {
        name: "subjects",
        label: <FormattedMessage {...commonMessages.subjectList} />,
        options: {
          filter: true,
          sort: false,
          search: true,
        },
      },
      {
        name: "Actions",
        label: <FormattedMessage {...commonMessages.actions} />,
        options: {
          filter: false,
          sort: false,
          search: false,
          download: false,
          customBodyRender: (value, tableMeta) => {
            let hasSubjects = true;
            if (!tableMeta.rowData[4] || (tableMeta.rowData[4] && tableMeta.rowData[4].length === 0)) {
              hasSubjects = false;
            }
            return (
              <div>
                <Button
                  className="add-modify-button"
                  onClick={() => this.assignSubject(tableMeta.rowData[3])}
                >
                  {hasSubjects && (
                    <FormattedMessage {...commonMessages.modify} />
                  )}
                  {!hasSubjects && (
                    <FormattedMessage {...commonMessages.add} />
                  )}
                </Button>
              </div>
            );
          },
        },
      },
    ];
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Paper>
          <Box className="paper-background-modified">
            <Grid container>
              <Grid item md={12} xs={12} className="header-align">
                <Box className="heading">
                  <FormattedMessage {...messages.subToStu} />
                </Box>
              </Grid>
            </Grid>
            <Grid container>
              <Box className="margin dropdownpaddingright">
                <Dropdown
                  data={yearList}
                  name="year"
                  value={year}
                  onChange={(e) => this.onChange(e)}
                  label={<FormattedMessage {...commonMessages.academicYear} />}
                  hideSelect={true}
                />
              </Box>
              <Box className="margin dropdownpaddingright">
                <Dropdown
                  data={standardList}
                  name="standard"
                  value={standard}
                  onChange={(e) => this.onChange(e, "standard")}
                  label={<FormattedMessage {...commonMessages.standard} />}
                  hideSelect={true}
                />
              </Box>
              <Box className="margin dropdownpaddingright">
                <Dropdown
                  data={sectionList}
                  name="section"
                  value={section}
                  onChange={(e) => this.onChange(e, "section")}
                  label={<FormattedMessage {...commonMessages.section} />}
                  hideSelect={true}
                />
              </Box>
            </Grid>
            <Grid container spacing={3} className=" margin-top-30">
              {section && (
                <Grid item md={12} xs={12}>
                  <Paper>
                    <AllMUIDataTable
                      data={studentDetails.student_list}
                      title={
                        tableLoading ? (
                          <CircularProgress className="white-text" />
                        ) : (
                          ""
                        )
                      }
                      columns={columns}
                      options={options}
                      onTableChange={this.getStudentList}
                      serverSide={true}
                      pagination={pagination}
                      count={studentDetails.count}
                    />
                  </Paper>
                </Grid>
              )}
            </Grid>
            {section === '' && <BlankPagewithIcon data={blankPageMessage} />}
          </Box>
          {openPopUp && (
            <SubjectAssign {...popUpDetails} onClose={this.onClosePopup} />
          )}
        </Paper>
      );
    }
  }
}

export default withRouter(AssignSubjectToStudents);

const MuiToolbar = ({ selectedRows, showEnableFeaturePopup }) => {
  return (
    <div className="toolbar-select">
      <Button
        variant="contained"
        color="primary"
        className="mr-20 submit"
        onClick={() => showEnableFeaturePopup(selectedRows)}
      >
        Assign Subjects
      </Button>
    </div>
  );
};

MuiToolbar.propTypes = {
  selectedRows: PropTypes.array.isRequired,
  showEnableFeaturePopup: PropTypes.func.isRequired,
};
