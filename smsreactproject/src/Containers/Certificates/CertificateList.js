import React, { Component } from "react";
import { Paper, Box, Button, Grid, Avatar } from "@material-ui/core";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { dateFormat } from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { LEAVEOPTIONS } from "Constants";
import { Dropdown } from "Components/DropDown";
import { Actions } from "Constants/permissions";
import { checkLocalAcademicYear, SetAcademicYear } from "Includes/functions";
import { getKeyValueInArray, getFullName } from "Includes/functions";
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import { getUrlParam } from "Includes/functions";
import commonMessages from "Constants/messages";
import messages from "./messages";
import { FormattedMessage } from "react-intl";
import TcCertificateList from "./TcCertificateList";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class CertificateList extends Component {
  constructor() {
    super();
    let { standard, section, certificateType } = getUrlParam();
    this.state = {
      year: "",
      yearList: [],
      standard: standard ? parseInt(standard) : "",
      standardList: [],
      section: section ? parseInt(section) : "",
      sectionList: [],
      studentList: [],
      loading: true,
      tableLoading: false,
      certificateList: [],
      certificateType: certificateType ? certificateType : "",
      columns: [
        {
          name: "profile_pic_details",
          label: <FormattedMessage {...commonMessages.profilePic} />,
          options: {
            filter: false,
            sort: false,
            search: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <div className="mui-table-custom-value-left-align">
                  {tableMeta.rowData[0] != undefined && (
                    <Box>
                      <Avatar
                        alt="Profile Pic"
                        src={tableMeta.rowData[0].file}
                        className="student-profile-pic"
                      />
                    </Box>
                  )}
                  {tableMeta.rowData[0] === null && (
                    <Box>
                      <Avatar
                        alt={tableMeta.rowData[2]}
                        src="Profile Pic"
                        className="student-profile-pic"
                      />
                    </Box>
                  )}
                </div>
              );
            },
          },
        },
        {
          name: "name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: true,
            search: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <div className="mui-table-custom-value-left-align">
                  {getFullName(
                    tableMeta.rowData[2],
                    tableMeta.rowData[3],
                    tableMeta.rowData[4]
                  )}
                </div>
              );
            },
          },
        },
        {
          name: "student_first_name",
          label: <FormattedMessage {...commonMessages.firstName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "student_middle_name",
          label: <FormattedMessage {...commonMessages.middleName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "student_last_name",
          label: <FormattedMessage {...commonMessages.lastName} />,
          options: {
            filter: true,
            sort: false,
            display: false,
          },
        },
        {
          name: "current_reg_num",
          label: <FormattedMessage {...commonMessages.regNum} />,
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "dob",
          label: <FormattedMessage {...commonMessages.dob} />,
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value) => {
              return dateFormat(value, "DD-MM-YYYY");
            },
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
          },
        },
        {
  name: "Actions",
  label: <FormattedMessage {...commonMessages.certificateType} />,
  options: {
    filter: false,
    sort: false,
    customBodyRender: (value, tableMeta) => {
      const studentId = tableMeta.rowData[7];
      const { certificateType, certificateList } = this.state;

      // Find the display label for the selected certificate
      const selectedCertificate = certificateList.find(cert => cert.id === certificateType);
      const certificateLabel = selectedCertificate ? selectedCertificate.name : "";

      return (
        <div>
          <Button
            className="add-modify-button"
            onClick={() => this.onChangeCertificate(certificateType, studentId)}
          >
            {certificateLabel || <FormattedMessage {...commonMessages.actions} />}
          </Button>
        </div>
      );
    },
  },
}

      ],
    };
  }

  componentDidMount() {
    this.getAcademicYear();
  }

  getAcademicYear = () => {
    getRequest(GET_URL.getacademicyear.api, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        const yearList = response.data.data;
        const year = checkLocalAcademicYear(yearList);
        this.setState({ yearList, year, loading: false }, () => {
          if (year) {
            this.getStandard();
          }
        });
      }
    });
  };

  getStandard = () => {
    let { year } = this.state;
    const params = { academic_year: year, is_active: true };
    getRequest(GET_URL.getstandardandsection.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let standardList = response.data.data;
          this.setState(
            {
              standardList,
            },
            () => this.getSections()
          );
        }
      }
    );
  };

  getSections = () => {
    let { standard, standardList } = this.state;
    if (standard) {
      const sectionList = getKeyValueInArray(
        standardList,
        "id",
        standard,
        "sections"
      );
      this.setState(
        {
          sectionList,
        },
        () => {
          this.getCertificates();
        }
      );
    }
  };

  onChange = (e) => {
    const { name, value } = e.target;

    if (name === "year") {
      this.setState(
        {
          [name]: value,
          standard: "",
          section: "",
          studentList: [],
          certificateType: "",
        },
        () => {
          this.getStandard();
          SetAcademicYear(value);
        }
      );
    } else if (name === "standard") {
      this.setState(
        {
          [name]: value,
          section: "",
          studentList: [],
        },
        () => {
          this.getSections();
        }
      );
    }else if (name === "section") {
      this.setState(
        {
          [name]: value,
          certificateType: "",
          studentList: [],
        },
        () =>{
          this.getCertificates();
        }

      );
    } else if (name === "certificateType") {
      this.setState(
        {
          
          [name]: value,
          studentList: [],
        },
        () => {
          this.getStudentList();
        }
      );
    }
  };

  getStudentList = () => {
    this.setState({ tableLoading: true });
    let { year, standard, section } = this.state;
    if (section) {
      getRequest(GET_URL.getenrolledstudents.api, {
        academic_year: year,
        standard,
        section,
      }).then((response) => {
        if (response && response.status === 200) {
          let studentList = response.data.data;
          this.setState({
            studentList: studentList,
            tableLoading: false,
          });
        }
      });
    }
  };

  // StudyCertificate = (student) => {
  //   let { standard, section } = this.state;
  //   this.props.history.push(
  //     Actions.study_certificate.view.url +
  //       `/?id=${student}&standard=${standard}&section=${section}`
  //   );
  // };
  getCertificates = () => {
    let { year } = this.state;
    const params = { academic_year: year, is_active: true };
    getRequest(GET_URL.multipleothercertificate.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let certificateList = response.data.data.map((item) => ({
          id: item.name, // This will be used as the value of the dropdown option
          name: item.label, // This will be displayed in the dropdown
        }));
        this.setState({
          certificateList,
        },
        () => {
          this.getStudentList();
        });
      }
    });
  };

  
  onChangeCertificate = (certificateType, studentId) => {
    const { standard, section, certificateList } = this.state;

    if (!certificateType) {
      alert("Please select a certificateType from the dropdown first!");
      return;
    }

    const selectedCertificate = certificateList.find(cert => cert.id === certificateType);
    const certificateLabel = selectedCertificate ? selectedCertificate.name : "";

    switch (certificateType) {
      case "studycertificate":
        this.props.history.push(
          Actions.study_certificate.view.url +
            `/?id=${studentId}&standard=${standard}&section=${section}&certificateType=${certificateType}&certificateLabel=${certificateLabel}`
        );
        break;
      default:
        this.props.history.push(
          Actions.multiple_certificate.view.url +
            `/?id=${studentId}&standard=${standard}&section=${section}&certificateType=${certificateType}&certificateLabel=${certificateLabel}`
        );
    }
  };


  getBlankPageMessage = () => {
    let { section, standard, year,certificateType} = this.state;
    if (!certificateType){
     if (!section) {
       if (!standard) {
         if (!year) {
           return `Select the Academic year, ${alias_names["standard"]} and ${alias_names["section"]} to view the student List`;
         }
         return `Select the  ${alias_names["standard"]} and ${alias_names["section"]} to view the student List`;
       }
       return `Select the ${alias_names["section"]} to view the student List`;
     }
    return `Select the Academic year, ${alias_names["year"]} ${alias_names["standard"]} and ${alias_names["section"]} to view the student List`;
   }
  };
  render() {
    let {
      loading,
      tableLoading,
      yearList,
      standardList,
      standard,
      studentList,
      year,
      sectionList,
      section,
      columns,
      certificate,
      certificateList,
      certificateType,
    } = this.state;
    console.log("Current Certificate Value:",certificateType)
    if (loading) {
      return <LoadingGif />;
    } else {
      let options = {
        ...LEAVEOPTIONS,
        textLabels: {
          body: {
            noMatch: tableLoading
              ? "Loading..."
              : "Sorry, there is no matching data to display",
          },
        },
      };
      return (
        <Paper
          className={classNames("paper-background")}
          style={{ background: "transparent", boxShadow: "none" }}
        >
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">
                <FormattedMessage {...commonMessages.certificateType} />
              </Box>
            </Grid>
          </Grid>
          <Grid container spacing={2} className={classNames("header-align")}>
            <Grid item lg={3} md={4} xs={6}>
              <Dropdown
                data={yearList}
                name="year"
                value={year}
                required={true}
                hideSelect={true}
                onChange={(e) => this.onChange(e, "year")}
                label={<FormattedMessage {...commonMessages.academicYear} />}
              />
            </Grid>
            <Grid item lg={3} md={4} xs={6}>
              <Dropdown
                data={standardList}
                name="standard"
                value={standard}
                required={true}
                hideSelect={true}
                onChange={(e) => this.onChange(e, "standard")}
                label={<FormattedMessage {...commonMessages.standard} />}
              />
            </Grid>
            <Grid item lg={3} md={4} xs={6}>
              <Dropdown
                data={sectionList}
                name="section"
                value={section}
                required={true}
                hideSelect={true}
                onChange={(e) => this.onChange(e, "section")}
                label={<FormattedMessage {...commonMessages.section} />}
              />
            </Grid>
            <Grid item md={6} xs={12}>
            <Dropdown
                data={certificateList} // Ensure certificateList is updated in the state
                name="certificateType"
                value={certificateType}
                required={true}
                hideSelect={true}
                onChange={(e) => this.onChange(e, "certificateType")}
                label={<FormattedMessage {...commonMessages.certificateType} />}
              />
              </Grid>
          </Grid>
          <Grid
            container
            className={classNames("flex-justify-center", "header-align")}
          >
            <Grid item md={12} xs={12} className={classNames("header-align")}>
              {!section && (
                <BlankPagewithIcon data={this.getBlankPageMessage()} />
              )}
              {section && (
                <Paper>
                  <AllMUIDataTable
                    data={studentList}
                    columns={columns}
                    options={options}
                  />
                </Paper>
              )}
            </Grid>
          </Grid>
        </Paper>
      );
    }
  }
}

export default withRouter(CertificateList);
