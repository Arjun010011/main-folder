import React, { Component } from "react";
import { Paper, Box, Grid, CircularProgress } from "@material-ui/core";
import classNames from "classnames";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { Dropdown } from "Components/DropDown";
import { getRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL } from "Includes/urls";
import { getFullName, getAcademicYear, SetAcademicYear, getAdmissionHistory, updatePermissions } from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import MentorStudentListActions from "Containers/BasicDetails/MentorStudentListActions";
import { Actions } from "Constants/permissions";
import Swal from "sweetalert2";
import _ from "lodash";

class MentorStudentList extends Component {
  constructor() {
    super();
    // this.permission = updatePermissions("mentor_details", ["view"]);
    this.permission = ["edit"];
    this.state = {
      studentList: [],
      yearList: [],
      selectedYear: "",
      loading: true,
      tableUpdating: false,
      pagination: { page: 0, rowsPerPage: 10 },
    };
  }

  componentDidMount() {
    this.getYearList();
    if (getAcademicYear()) {
      let year = getAcademicYear();
      if (year !== 0) {
        this.setState({ selectedYear: year }, () => {
          this.getStudentList();
        });
      }
    } else {
      this.setState({ loading: false });
    }
    this.permission = [
      ...this.permission,
      ...updatePermissions("general_student_list", ["update", "delete"]),
    ];
  }

  getYearList = () => {
    getRequest(GET_URL.getacademicyear.api, {}, this.props).then((res) => {
      if (res?.status === 200) {
        this.setState({ yearList: res.data.data });
      }
    });
  };

  onChange = (e) => {
    let { value } = e.target;
    this.setState({ selectedYear: value }, () => {
      SetAcademicYear(value);
      this.getStudentList();
    });
  };

  getStudentList = () => {
    const { selectedYear } = this.state;
    if (!selectedYear) return;
  
    this.setState({ tableUpdating: true });
  
    getRequest(
      GET_URL.mentorstudentmapping.api,
      { academic_year_id: selectedYear, is_mapped_mentor_student: 1, is_active: true },
      this.props
    ).then((res) => {
      if (res?.status === 200) {
        // 🔹 API sometimes returns res.data as array, sometimes as { data: [...] }
        const apiData = Array.isArray(res.data) ? res.data : res.data?.data || [];
  
        const mappedStudents = apiData.map((s) => ({
          ...s,
          full_name: getFullName(s.first_name, s.middle_name, s.last_name),
        }));
  
        this.setState({
          studentList: { student_list: mappedStudents, count: mappedStudents.length },
          loading: false,
          tableUpdating: false,
        });
      } else {
        this.setState({
          studentList: { student_list: [], count: 0 },
          loading: false,
          tableUpdating: false,
        });
      }
    });
  };

  deleteStudent = (id, index) => {
    this.setState({ tableUpdating: true });
    const del_url = DEL_URL.studentall.api;
    const data = { data: [id] };
    deleteRequest(`${del_url}${id}/`, data, this.props).then((res) => {
      if (res?.status === 200) {
        let { studentList } = this.state;
        studentList.student_list.splice(index, 1);
        this.setState({ studentList: _.cloneDeep(studentList) });
        Swal.fire("Deleted!", "Student record deleted", "success");
      }
      this.setState({ tableUpdating: false });
    });
  };

  render() {
    const { yearList, selectedYear, studentList, loading, tableUpdating } = this.state;

    const columns = [
      {
        name: "name",
        label: <FormattedMessage {...commonMessages.studentName} />,
        options: { filter: false, sort: true },
      },
      {
        name: "standard_name",
        label: <FormattedMessage {...commonMessages.standard} />,
        options: { filter: false, sort: true },
      },
      {
        name: "section_name",
        label: <FormattedMessage {...commonMessages.sectionName} />,
        options: { filter: false, sort: true },
      },
    //   {
    //     name: "admission_num",
    //     label: "Admission No.",
    //     options: {
    //       filter: false,
    //       sort: true,
    //       customBodyRender: (value, tableMeta) => {
    //         return (
    //           <div>{getAdmissionHistory(value, tableMeta.rowData[7])}</div>
    //         );
    //       },
    //     },
    //   },
      {
        name: "id",
        label: "ID",
        options: { display: false },
      },
      {
        name: "admission_history",
        label: "History",
        options: { display: false },
      },
      {
        name: "Actions",
        label: "Actions",
        options: {
          filter: false,
          sort: false,
          customBodyRender: (value, tableMeta) => {
            const student = this.state.studentList.student_list[tableMeta.rowIndex];
            return (
              <MentorStudentListActions
                id={student.id}
                index={tableMeta.rowIndex}
                student={student}
                deleteStudent={this.deleteStudent}
                enabledActions={["view", "delete","edit"]}
              />
            );
          },
        },
      }
    ];

    if (loading) return <LoadingGif />;

    return (
      <Paper className={classNames("paper-background")}>
        <Box className="header-align" p={2}>
          <Box className="heading">Mentor Student List</Box>
        </Box>

        <Box className="flex-gaping header-align" p={2}>
          <Box>
            <Dropdown
              data={yearList}
              name="selectedYear"
              value={selectedYear}
              onChange={this.onChange}
              label={<FormattedMessage {...commonMessages.academicYear} />}
              className="width-100"
              hideSelect={true}
              size="small"
            />
          </Box>
        </Box>

        {selectedYear && (
          <Grid container className="flex-justify-center header-align">
            <Grid item xs={12}>
              <AllMUIDataTable
                title={tableUpdating ? <CircularProgress /> : "Student List"}
                data={studentList.student_list}
                columns={columns}
                options={{ selectableRows: "none", rowsPerPage: 10 }}
              />
            </Grid>
          </Grid>
        )}
      </Paper>
    );
  }
}

export default MentorStudentList;
