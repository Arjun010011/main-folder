import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Avatar,
  Button,
  CircularProgress,
} from "@material-ui/core";
import Swal from "sweetalert2";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link } from "react-router-dom";
import classNames from "classnames";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import _ from "lodash";
import blankProfile from "images/blank_profile_pic.png";

import DynamicForm from "Components/DynamicForm";
import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, DEL_URL } from "Includes/urls";
import {
  dateFormat,
  getAcademicYear,
  isUserHasPermission,
  updatePermissions,
} from "Includes/functions";
import { minDate, maxDate, options } from "Constants";
import { Actions } from "Constants/permissions";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { cloneDeep } from "lodash";
// import birthdayImage from "images/birthdayCard2.jpeg";
import birthdayImage from "images/birthdaynew7.png";
import bluebelllogo from "images/bluebelllogo.png";
import { maxFileSize, image_formats, relation_ship } from "Constants";

import GetAppRoundedIcon from "@material-ui/icons/GetAppRounded";
import html2canvas from "html2canvas";

const user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

const fieldDetails_global = [
  {
    label: "Title 1",
    regex: "",
    name: "title1",
    md: 12,
    className: "width-form-95",
    required: false,
    id: "outlined-textarea",
    default: "Byadarahalli, Bengaluru - 560091",
    rows: null,
    type: "text",
    maxLength: 100,
    size: "small",
  },
  {
    label: "Title 2",
    regex: "",
    name: "title2",
    md: 12,
    className: "width-form-95",
    required: false,
    id: "outlined-textarea",
    default: "Student Name",
    rows: null,
    type: "text",
    maxLength: 25,
    size: "small",
  },
];

class TemplateCardCreate extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("academic_year", ["update", "delete"]);
    this.state = {
      academicYearList: [{ id: 1, name: "Birthday Card" }],
      loading: true,
      selectedToDelete: [],
      enabledActions: [],
      optionsLocal: {},
      tableUpdating: false,
      fieldDetails: null,
      enableUploadIcons: true,
      template_details: {
        title1: "Wish You Many Many Happy Returns of the day",
        preview: "",
      },
    };
  }

  componentDidMount = () => {
    this.updateTemplateDetails();
    this.setState({
      optionsLocal: { ...options },
    });
  };

  updateTemplateDetails = () => {
    let { template_details } = this.state;
    let fieldDetail = _.cloneDeep(fieldDetails_global);
    let value;
    fieldDetail.forEach((field) => {
      value = field.default;
      field.default = value;
      template_details[field["name"]] = value;
    });
    this.setState({
      template_details,
      fieldDetails: fieldDetail,
      loading: false,
    });
  };

  downloadURI = (uri, name) => {
    var link = document.createElement("a");
    link.download = name;
    link.href = uri;
    link.click();
    //after creating link you should delete dynamic link
    //clearDynamicLink(link);
  };

  handleDownloadImage = () => {
    html2canvas(document.querySelector("#capture"), { scale: 5 }).then(
      (canvas) => {
        var myImage = canvas
          .toDataURL("image/png")
          .replace("image/png", "image/octet-stream");
        // a.href = canvas.toDataURL("image/jpeg").replace("image/jpeg", "image/octet-stream");
        this.downloadURI("data:" + myImage, "yourImage.png");
      }
    );
  };

  updateParent = (name, value) => {
    let { template_details, fieldDetails } = this.state;
    fieldDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
      }
    });
    template_details[name] = value;
    this.setState({
      fieldDetails,
      template_details,
    });
  };

  handleChangeProfile = async (event, acceptFileType) => {
    let { template_details, enableUploadIcons } = this.state;
    if (event.target.files[0]) {
      let fileName = event.target.files[0]["name"];
      let file_extension = `${fileName.slice(
        (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
      )}`;
      let is_supported_types = true;
      is_supported_types = image_formats.type.includes(
        file_extension.toLowerCase()
      );
      if (
        event.target.files[0].size < maxFileSize[acceptFileType].size &&
        is_supported_types
      ) {
        let reader = new FileReader();
        let file = event.target.files[0];
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          template_details["preview"] = reader.result;
          // enableUploadIcons = false;
          this.setState({
            template_details,
            // enableUploadIcons,
          });
        };
      } else if (!is_supported_types) {
        this.setState({
          open: true,
          alertData: image_formats.error,
        });
      } else {
        this.setState({
          open: true,
          alertData: maxFileSize[acceptFileType].errorText,
        });
      }
    }
  };

  render() {
    const { loading, fieldDetails, template_details, enableUploadIcons } =
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
          <Paper className="paper-background">
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">Create Template</Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.template_card.view.url}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />
                    {Actions.template_card.view.label}
                  </Button>
                </Box>
              </Grid>
            </Grid>

            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <div>
                  <div
                    id="capture"
                    class="image"
                    style={{
                      height: "400px",
                      width: "270px",
                      backgroundSize: "contain",
                      // backgroundImage: `url(${birthdayImage})`,
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    <div style={{ position: "absolute" }}>
                      <img src={birthdayImage} style={{ height: "400px" }} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        textAlign: "center",
                        fontSize: "14px",
                        position: "relative",
                        color: "#ffffff",
                        fontWeight: "bolder",
                      }}
                    >
                      <div>
                        <img
                          src={bluebelllogo}
                          style={{
                            // width: "50px",
                            // backgroundColor: "aliceblue",
                            marginLeft: "5px",
                            marginTop: "5px",
                            marginRight: "5px",
                            height: "35px",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          // lineHeight: "5px",
                          textTransform: "capitalize",
                          marginTop: "12px",
                          color: "#3B56B2",
                          fontWeight: "bolder",
                          fontSize: "14px",
                        }}
                      >
                        {/* {user?.institute_details?.name} */}
                        Shiksha International School
                      </div>
                    </div>

                    <div
                      style={{
                        // paddingLeft: "10px",
                        textAlign: "center",
                        fontSize: "20px",
                        height: "335px",
                        // position:"relative",
                        // top:"50px"
                        // marginLeft: "30px",
                      }}
                    >
                      <Box
                        style={{
                          textAlign: "-webkit-center",
                          position: "relative",
                          top: "55px",
                          // height: "115px",
                          paddingTop:
                            template_details.preview === "" ? "0px" : "35px",
                        }}
                      >
                        {template_details.preview === "" && (
                          <label
                            htmlFor="upload-pic"
                            style={{
                              position: "relative",
                              top: "66px",
                              left: "50px",
                            }}
                            // className="staff-profile-camera-position"
                          >
                            <Button
                              variant="raised"
                              component="span"
                              className="profile-pic-button"
                            >
                              <i
                                class="fa fa-camera fa-lg"
                                aria-hidden="true"
                              ></i>
                            </Button>
                          </label>
                        )}
                        <input
                          type="file"
                          id="upload-pic"
                          className="display-none"
                          onChange={(e) => this.handleChangeProfile(e, "img")}
                          onClick={(e) => (e.target.value = null)}
                          accept=".jpg, .jpeg, .png"
                        />
                        {template_details.preview !== "" &&
                          enableUploadIcons && (
                            // <Avatar
                            //   src={template_details.preview}
                            //   alt="Preview"
                            //   // className="hr-profile-pic"
                            //   style={{ width: "70px", height: "70px" }}
                            // />
                            <img
                              src={template_details.preview}
                              width="130px"
                              style={{
                                border: "5px solid white",
                                borderRadius: "10px",
                              }}
                            />
                          )}
                        {!enableUploadIcons && (
                          <Box className="upload-profile-loading">
                            <CircularProgress />
                          </Box>
                        )}
                        {template_details.preview === "" &&
                          enableUploadIcons && (
                            <Avatar
                              src={blankProfile}
                              alt="Preview"
                              // className="hr-profile-pic"
                              style={{ width: "70px", height: "70px" }}
                            />
                          )}
                      </Box>
                      <div
                        className="template-card-title1"
                        style={{
                          position: "relative",
                          top: "50px",
                          color: "#3B56B2",
                          backgroundColor: "white"
                        }}
                      >
                        {template_details["title2"]}
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "center",
                        fontSize: "12px",
                        position: "relative",
                        color: "#ffffff",
                        fontWeight: "bolder",
                        // top:"100px"
                        color: "#3B56B2",
                        backgroundColor: "#ffffff"
                      }}
                    >
                      {template_details["title1"]}
                    </div>
                  </div>
                </div>
              </Grid>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Paper className="padding-20">
                  {fieldDetails && (
                    <DynamicForm
                      fieldDetails={fieldDetails}
                      updateParent={this.updateParent}
                      ref={"DynamicForm"}
                      idFormat={"company_2022_08_11_01_23_pm_"}
                    />
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    className="submit"
                  >
                    Update Details
                  </Button>
                </Paper>
              </Grid>
            </Grid>
            <Button
              variant="contained"
              color="secondary"
              className="hall-ticket-print-button"
              onClick={this.handleDownloadImage}
            >
              <div className="display-flex">
                <GetAppRoundedIcon className="hall-ticket-download-icon" />
                Download Image
              </div>
            </Button>
          </Paper>
        </Box>
      );
    }
  }
}
export default TemplateCardCreate;
