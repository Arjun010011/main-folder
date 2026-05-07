import React, { Component } from "react";
import { Paper, Box, Button, Grid, Avatar } from "@material-ui/core";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { checkLocalAcademicYear, SetAcademicYear } from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { LEAVEOPTIONS } from "Constants";
import { Dropdown } from "Components/DropDown";
import { getUrlParam } from "Includes/functions";
import { Actions } from "Constants/permissions";
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import { getFullName } from "Includes/functions";

class StaffCertificateList extends Component {
  constructor() {
    super();
    let { certificateType,id } = getUrlParam();
    this.state = {
      year: "",
      // staffId:id ? parseInt(id) : "",
      yearList: [],
      staffList: [],
      loading: true,
      tableLoading: false,
      certificateList: [],
      certificateType: certificateType ? certificateType : "",
      columns: [
        {
          name: "profile_pic_details",
          label: "Profile Picture",
          options: {
            filter: false,
            sort: false,
            search: false,
            customBodyRender: (value, tableMeta) => (
              <Box>
                <Avatar
                  alt="Profile Pic"
                  src={tableMeta.rowData[0]?.file || "Profile Pic"}
                  className="staff-profile-pic"
                />
              </Box>
            ),
          },
        },
        // group_type_name
        {
            name: "full_name",
            label: "staffName", 
            options: {
              filter: false,
              sort: true,
              search: false,
              customBodyRender: (value, tableMeta) => {
                return value || "N/A"; // Use 'value' directly as it's coming from the API
              },
            },
          },
          {
            name: "group_type_name",
            label: "Group Name", 
            options: {
              filter: false,
              sort: true,
              search: false,
              customBodyRender: (value, tableMeta) => {
               
                return value || "N/A"; // Use 'value' directly as it's coming from the API
              },
            },
          },
        {
          name: "id",
          label: "Employee ID",
          options: { filter: false, sort: true,display: false, },
        },
        {
          name: "Actions",
          label: "Certificate Type",
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              const staffId = tableMeta.rowData[3];
              const { certificateType, certificateList } = this.state;
              const selectedCertificate = certificateList.find(cert => cert.id === certificateType);
              const certificateLabel = selectedCertificate ? selectedCertificate.name : "Actions";

              return (
                <Button
                  className="add-modify-button"
                  onClick={() => this.onChangeCertificate(certificateType, staffId)}
                >
                  {certificateLabel}
                </Button>
              );
            },
          },
        },
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
            this.getCertificates();
          }
        });
      }
    });
  };

  onChange = (e) => {
    const { name, value } = e.target;
    if (name === "year") {
      this.setState({ [name]: value, staffList: [], certificateType: "" }, () => {
        SetAcademicYear(value);
        this.getCertificates();
      });
    } else if (name === "certificateType") {
      this.setState({ [name]: value, staffList: [] }, () => {
        this.getStaffList();
      });
    }
  };
  
  getStaffList = () => {
      this.setState({ tableLoading: true });
      let { year } = this.state;
      getRequest(GET_URL.staff.api, { academic_year: year }).then((response) => {
          if (response && response.status === 200) {
              this.setState({ staffList: response.data.data, tableLoading: false });
            }
        });
    };
    
  getCertificates = () => {
    let { year } = this.state;
    getRequest(GET_URL.staffmultiplecertificate.api, { academic_year: year, is_active: true }, this.props).then((response) => {
      if (response && response.status === 200) {
        let certificateList = response.data.data.map((item) => ({ id: item.name, name: item.label }));
        this.setState({ certificateList, },
          () => {
            this.getStaffList();
          }
        );
      }
    });
  };
  

  onChangeCertificate = (certificateType, staffId) => {
    const { certificateList } = this.state;
    if (!certificateType) {
      alert("Please select a certificate type first!");
      return;
    }
    const selectedCertificate = certificateList.find(cert => cert.id === certificateType);
    const certificateLabel = selectedCertificate ? selectedCertificate.name : "";  

    switch (certificateType) {
      case "teacherappiontmentletter":
        this.props.history.push(Actions.multiple_staff_certificate.view.url + `/?id=${staffId}&certificateType=${certificateType}&certificateLabel=${certificateLabel}`);
        break;
      case "teacherexperienceletter":
          this.props.history.push(Actions.multiple_staff_certificate.view.url + `/?id=${staffId}&certificateType=${certificateType}&certificateLabel=${certificateLabel}`);
          break;
      case "joining_certificate":
        this.props.history.push(Actions.multiple_staff_certificate.view.url + `/?id=${staffId}&certificateType=${certificateType}&certificateLabel=${certificateLabel}`);
        break;
      default:
        alert("Invalid certificate type selected!");
    }
  };

  render() {
    let { loading, tableLoading, yearList, staffList, year, columns, certificateList, certificateType } = this.state;

    if (loading) return <LoadingGif />;

    return (
      <Paper className={classNames("paper-background")} style={{ background: "transparent", boxShadow: "none" }}>
        <Grid container>
          <Grid item md={6} xs={12} className={classNames("header-align")}>
            <Box className="heading">Staff Certificates</Box>
          </Grid>
        </Grid>
        <Grid container spacing={2} className={classNames("header-align")}>
          <Grid item lg={3} md={4} xs={6}>
            <Dropdown data={yearList} name="year" value={year} required onChange={this.onChange} label="Academic Year" />
          </Grid>
          <Grid item lg={3} md={4} xs={6}>
            <Dropdown data={certificateList} name="certificateType" value={certificateType} required onChange={this.onChange} label="Certificate Type" />
          </Grid>
        </Grid>
        <Grid container className={classNames("flex-justify-center", "header-align")}>
          <Grid item md={12} xs={12}>
            <Paper>
              <AllMUIDataTable data={staffList} columns={columns} options={LEAVEOPTIONS} />
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    );
  }
}

export default withRouter(StaffCertificateList);