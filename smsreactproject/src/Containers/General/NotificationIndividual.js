import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  Paper,
  Grid,
  Button,
  Tooltip,
  withStyles,
  Dialog,
  DialogActions,
  DialogContent,
} from "@material-ui/core";
import Box from "@material-ui/core/Box";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import EditTwoToneIcon from "@material-ui/icons/EditTwoTone";
import AllMUIDataTable from "Components/AllMUIDataTable";

import loadingBar from "images/loading.gif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import {
  dateFormat,
  isUserHasPermission,
  getFullName,
  getPaginationProps,
} from "Includes/functions";
import { Actions } from "Constants/permissions";
import { image_formats } from "Containers/Expenses/Constants";
import PreviewUsers from "./Components/PreviewUsers";
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";

const Styles = (theme) => ({
  studentLabel: {
    color: "#00000",
    fontSize: "12px",
    lineHeight: "23px",
    padding: "5px",
    wordBreak: "break-word",
  },
  studentValue: {
    color: "#00000",
    fontSize: "16px",
    lineHeight: "25px",
    padding: "5px",
    textTransform: "capitalize",
    wordBreak: "break-word",
  },
  studentValueEmpty: {
    padding: "5px",
    width: "40px",
  },
  header: {
    padding: "10px 25px",
  },
  innerBorder: {
    width: "2px",
    height: "80%",
    background: "#E4E7EB",
    // marginLeft: 'auto',
    marginRight: "5%",
  },
  displayFlex: {
    display: "flex",
    padding: "5px 5px",
  },
});

class NotificationIndividual extends Component {
  constructor(props) {
    super(props);

    this.state = {
      templateDetails: { reciever_type: "" },
      largeImagePreview: "",
      loading: true,
      buildingId: "",
      shift_schedules: [],
      isPreviewUsers: false,
      userLoading: false,
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      user_list: {},
    };
    this.columns = [
      {
        name: "id", // replacing id index will impact onRowChange functionality also
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
        label: "User Name",
      },
      {
        name: "delivery_status",
        label: "Delivery Status",
      },
      {
        name: "standard",
        label: "Standard",
        options: {
          filter: false,
          sort: false,
          viewColumns: false,
          display: true,
        },
      },
    ];
  }

  componentDidMount = () => {
    this.gettemplateDetails();
  };

  gettemplateDetails = () => {
    if (this.props.location.state) {
      const id = this.props.location.state.detail;
      const url = GET_URL.bulknotification.api + id + "/";
      getRequest(url, {}, this.props).then((response) => {
        if (response && response.status === 200) {
          let updatedDetails = response.data.data;
          updatedDetails["reciever_name"] =
            this.getRecieverType(updatedDetails);
          updatedDetails["data_list"] = [];
          if (updatedDetails.group_ids) {
            let temp_data_list = updatedDetails.group_names;
            temp_data_list.map((data) => {
              updatedDetails["data_list"].push(data);
            });
            updatedDetails["reciever_type"] = "group";
          } else if (updatedDetails.standard_section_ids) {
            let temp_data_list = updatedDetails.standard_section_names;
            let temp_section = [];
            let temp_section_names = [];
            temp_data_list.map((data) => {
              temp_section = [];
              temp_section_names = [];
              data["id"] = data["standard_id"];
              data.section_list.map((sectionData) => {
                sectionData["standard_section"] = sectionData.id;
                temp_section.push(sectionData);
                temp_section_names.push(sectionData.section_name);
              });
              data["sections"] = temp_section;
              data["name"] = `${data.standard_name} [${temp_section_names.join(
                ", "
              )}]`;
              updatedDetails["data_list"].push(data);
            });
            updatedDetails["reciever_type"] = "section";
          } else if (updatedDetails.user_ids) {
            let temp_data_list = updatedDetails.user_names;
            let is_student = temp_data_list[0]["staff"] ? "staff" : "student";
            temp_data_list.map((data) => {
              data["user_id"] = data["id"];
              data["name"] = data["student"]
                ? getFullName(
                    data["student"]["first_name"],
                    data["student"]["middle_name"],
                    data["student"]["last_name"]
                  )
                : data["staff"]["full_name"];
              data["standard"] = data["student"]
                ? `${data.student["enrollment_data"]["standard_section__standard__name"]} [${data.student["enrollment_data"]["standard_section__section__name"]}]`
                : "";
              updatedDetails["data_list"].push(data);
            });
            updatedDetails["reciever_type"] = is_student;
          }
          this.setState(
            {
              templateDetails: updatedDetails,
              isEditEnabled: response.data.schedule ? true : false,
              pageLoading: false,
              buildingId: id,
            },
            () => {
              this.updateExpenseView();
            }
          );
        }
      });
    } else {
      this.props.history.push(Actions.bulk_notification.view.url);
    }
  };

  getRecieverType = (details) => {
    if (details.group_ids) {
      return "Group";
    } else if (details.standard_section_ids) {
      return "Standard Section";
    } else if (details.user_ids) {
      if (details.user_names["staff"]) {
        return "Staff";
      } else {
        return "Student";
      }
    }
  };

  updateExpenseView = () => {
    let { templateDetails } = this.state;
    let template_details = [];
    let shift = {
      sub_heading: "",
      data: [
        { label: "Title", value: templateDetails.heading, md: 6 },
        {
          label: "Notification Medium",
          value: templateDetails?.notification_medium_name,
          md: 6,
        },
        { label: "Language", value: templateDetails?.language_name },
        {
          label: "Created",
          value: dateFormat(templateDetails?.created, "DD-MM-YYYY hh:mm A"),
        },
        {
          label: "Is Scheduled",
          value: templateDetails.schedule
            ? `Yes [${dateFormat(
                templateDetails.schedule,
                "DD-MM-YYYY hh:mm A"
              )}]`
            : "No",
        },
        { label: "Reciever Type", value: templateDetails?.reciever_name },
      ],
    };
    template_details.push(shift);
    this.setState({
      template_details,
      loading: false,
    });
  };

  handleViewImage = (image) => {
    let file_extension = `${image.slice(
      (Math.max(0, image.lastIndexOf(".")) || Infinity) + 1
    )}`;
    if (image_formats.includes(file_extension)) {
      this.setState({
        largeImagePreview: image,
      });
    } else {
      window.open(image);
    }
  };

  handleCloseLargeImage = () => {
    this.setState({
      largeImagePreview: "",
    });
  };

  handleEdit = () => {
    let { buildingId } = this.state;
    this.props.history.push({
      pathname: Actions.bulk_notification.update.url,
      state: { detail: buildingId },
    });
  };

  handlePreviewChange = () => {
    this.setState({
      isPreviewUsers: !this.state.isPreviewUsers,
      userLoading: true,
    });
    this.getUserList();
  };

  getUserList = (paginationProps) => {
    let { pagination, buildingId } = this.state;
    this.setState({ userLoading: true });
    let currentPagination = pagination;
    if (paginationProps) {
      currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(currentPagination);
    let params = {
      ...pagination_params,
      is_active: true,
      pagination: true,
      get_user_details: 1,
    };
    let url = GET_URL.bulknotification.api + buildingId + "/";
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.data_list.map((data) => {
          data["name"] = data.user["staff"]
            ? data.user["staff"]?.full_name
            : data.user["student"] &&
              getFullName(
                data.user["student"]["first_name"],
                data.user["student"]["middle_name"],
                data.user["student"]["last_name"]
              );
          data["standard"] = data.user?.["student"]?.["current_standard_name"];
          // ? `${data.user["student"]["enrollment_data"]?.standard_section__standard__name} [${data.user["student"]["enrollment_data"]?.standard_section__section__name}]`
          // : "";
        });
        this.setState({
          pagination: { ...currentPagination },
          user_list: response.data.data,
        });
      }
      this.setState({ userLoading: false });
    });
  };

  handleCloseLargeImage = () => {
    this.setState({
      largeImagePreview: "",
    });
  };

  handleLargePreview = (extension, image) => {
    if (image_formats.includes(extension)) {
      this.setState({
        largeImagePreview: image,
      });
    } else {
      window.open(image);
    }
  };

  render() {
    let {
      template_details,
      loading,
      templateDetails,
      isEditEnabled,
      isPreviewUsers,
      user_list,
      pagination,
      userLoading,
      largeImagePreview
    } = this.state;
    let { classes } = this.props;
    let columns_list = [...this.columns];
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: false,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [10],
      selectToolbarPlacement: "none",
      rowsPerPage: 10,
    };
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Paper className="paper-background">
          {largeImagePreview && (
            <Box className="set-question-large-image-preview-box">
              <img
                src={largeImagePreview}
                alt="Image Preview"
                className="set-question-large-image-preview"
              />
              <Tooltip title="Close Image" placement="top-start">
                <Box
                  className="set-question-large-image-remove-icon-box"
                  onClick={this.handleCloseLargeImage}
                >
                  <HighlightOffIcon className="set-question-large-image-remove-icon" />
                </Box>
              </Tooltip>
            </Box>
          )}
          <Grid container>
            <Grid item md={8} xs={12} className="header-align">
              <Box className="heading">Bulk Notification Details</Box>
            </Grid>
            <Grid item md={4} xs={12}>
              <Box className="header-align end-flex-prop">
                {isUserHasPermission("bulk_notification", "view") && (
                  <Button
                    variant="contained"
                    component={Link}
                    to={Actions.bulk_notification.view.url}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                    {Actions.bulk_notification.view.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <Paper className="header-align expense-individual-paper-background">
            <Grid container className="margin-top-30">
              {template_details.map((headingData, index) => {
                return (
                  <Grid
                    item
                    md={12}
                    xs={12}
                    sm={12}
                    key={index}
                    className={classes.displayFlex}
                  >
                    <Grid container>
                      {headingData.sub_heading && (
                        <Box className="form-left-heading">
                          {headingData.sub_heading}
                        </Box>
                      )}
                      {headingData.data.map((data, index) => {
                        return (
                          <Grid
                            item
                            md={6}
                            xs={12}
                            sm={12}
                            key={index}
                            className={classes.header}
                          >
                            <Box className="dataLabel break-word">
                              {data.label}
                            </Box>
                            {!data.value && data !== false && (
                              <Box className={classes.studentValueEmpty}>
                                <hr />
                              </Box>
                            )}
                            {data.value !== "" && (
                              <Box
                                className={
                                  data.className
                                    ? data.className
                                    : "view-expenses-data-value break-word"
                                }
                              >
                                {data.value}
                              </Box>
                            )}
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Grid>
                );
              })}
            </Grid>
            <div className={classes.header}>
              <div className="form-left-heading">{`Users`}</div>
              <div className="display-flex">
                <div className="fs-16">{`View User Status`}</div>
                <Tooltip
                  title={"View Users"}
                  enterDelay={400}
                  enterNextDelay={400}
                  placement="top-start"
                  classes={{ tooltip: "tooltip-show-data" }}
                >
                  <div
                    className="text-blue cursor-pointer pl-10"
                    onClick={this.handlePreviewChange}
                  >
                    <VisibilityOutlinedIcon />
                  </div>
                </Tooltip>
              </div>
            </div>
            <div className={classes.header}>
              <div className="form-left-heading">{`Attached Documents`}</div>
              <Box className="">
                {templateDetails.notification_list &&
                  templateDetails.notification_list.map((temp, index) => {
                    temp.file_extension = temp.title?`${temp.title.slice(
                      (Math.max(0, temp.title.lastIndexOf(".")) || Infinity) + 1
                    )}`:"";
                    return (
                      <div className="d-flex mt-20">
                        <div className="text-blue">{index + 1}.</div>
                        <Box className="set-question-image-preview-outer-box">
                          {image_formats.includes(temp.file_extension) ? (
                            <Tooltip
                              title="Preview Image"
                              placement="top-start"
                            >
                              <img
                                src={temp.document.file}
                                alt="image"
                                className="set-question-uploaded-image"
                              />
                            </Tooltip>
                          ) : (
                            <div className="text-blue text-underline">
                              {`${temp.document.file_name}.${temp.file_extension}`}
                            </div>
                          )}
                          <Box
                            onClick={() =>
                              this.handleLargePreview(
                                temp.file_extension,
                                temp.document.file
                              )
                            }
                            className="set-question-image-preview-icon"
                          >
                            <VisibilityOutlinedIcon />{" "}
                          </Box>
                        </Box>
                      </div>
                    );
                  })}
              </Box>
            </div>
            <Box className="form-left-heading mt-30 pl-30">{"Message"}</Box>
            <div
              className="dangerous-style pl-30"
              dangerouslySetInnerHTML={{ __html: templateDetails.message_data }}
            ></div>
            {isUserHasPermission("bulk_notification", "edit") &&
              isEditEnabled && (
                <Tooltip title="Edit" placement="top-start">
                  <Box className="expense-individual-view-edit">
                    <EditTwoToneIcon
                      onClick={this.handleEdit}
                      className="expense-individual-edit-icon"
                    />
                  </Box>
                </Tooltip>
              )}
          </Paper>
          {isPreviewUsers && (
            <PreviewUsers
              user_list={user_list}
              columns_list={columns_list}
              options={options}
              pagination={pagination}
              onTableChange={this.getUserList}
              handleCloseChange={this.handlePreviewChange}
              handleSubmit={this.handleSubmit}
              loading={userLoading}
            />
          )}
          {/* <Dialog
            open={isPreviewUsers}
            className="dialog-custom-video-setquestion-form"
            onClose={this.handlePreviewChange}
            aria-labelledby="form-dialog-title"
          >
            <DialogContent>
              <AllMUIDataTable
                title={`Total recievers ${templateDetails["data_list"].length}`}
                key={templateDetails["data_list"]}
                data={templateDetails["data_list"]}
                columns={columns_list}
                options={options}
              />
            </DialogContent>
            <DialogActions>
              <Box mt={3}>
                <Button
                  variant="contained"
                  color="primary"
                  className="apply-leave-reset-button"
                  onClick={this.handlePreviewChange}
                >
                  Close
                </Button>
              </Box>
            </DialogActions>
          </Dialog> */}
        </Paper>
      );
    }
  }
}

export default withRouter(withStyles(Styles)(NotificationIndividual));
