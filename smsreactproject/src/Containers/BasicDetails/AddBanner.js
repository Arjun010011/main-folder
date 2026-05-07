import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  TextField,
  FormControlLabel,
  FormControl,
  FormHelperText,
  Switch,
  Tooltip,
} from "@material-ui/core";
import Swal from "sweetalert2";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import { maxFileSize } from "Constants";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import _ from "lodash";

import { supported_images_types } from "Containers/VideoTutorials/Constants";
import loadingBar from "images/loading.gif";
import { postRequest, getRequest } from "Includes/api/apicall";
import { POST_URL, GET_URL } from "Includes/urls";
import { numberRegex, nameWithQuoteRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, Alert, getUrlParam } from "Includes/functions";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";

class AddBanner extends Component {
  constructor() {
    super();
    this.state = {
      bannerList: [
        { heading: "", sequence: 1, background_image: {}, image: {}, empty_space_colour: "" },
      ],
      loading: true,
      open: false,
      alertData: "",
      fieldErrors: {},
      selected_type_name: "",
      selected_type: "",
    };
  }

  componentDidMount = () => {
    let currentSelectedList = getUrlParam();
    if (currentSelectedList.selected_type) {
      this.setState({
        selected_type_name:
          currentSelectedList.selected_type == 1 ? "Student" : "Staff",
        selected_type: currentSelectedList.selected_type,
      });
    }
    this.getBannerList();
  };

  handleColorChange = (e, index) => {
    const { value } = e.target;
    let { bannerList } = this.state;
    bannerList[index].empty_space_colour = value;
    this.setState({ bannerList });
  };

  getBannerList = () => {
    const url = GET_URL.banner.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data.length !== 0) {
          this.updateDetails(response.data.data);
        } else {
          this.setState({ loading: false });
        }
      }
    });
  };

  updateDetails = (updatedData) => {
    let bannerList = [];
    let temp = {};
    updatedData.map((data) => {
      temp = {};
      temp["id"] = data["id"];
      temp["heading"] = data["heading"];
      temp["empty_space_colour"] = data["empty_space_colour"]
      temp["sub_heading"] = data["sub_heading"];
      temp["sequence"] = data["sequence"];
      temp["link"] = data["link"];
      temp["image"] = {};
      temp["background_image"] = {};
      if (data["file_details"] && data["heading"]) {
        temp["image"]["url"] = data["file_details"]
          ? data["file_details"]["file"]
          : {};
        temp["image"]["uploadedId"] = data["file_details"]
          ? data["file_details"]["id"]
          : {};
      }
      if (data["file_details"] && !data["heading"]) {
        temp["background_image"]["url"] = data["file_details"]
          ? data["file_details"]["file"]
          : {};
        temp["background_image"]["uploadedId"] = data["file_details"]
          ? data["file_details"]["id"]
          : {};
        temp["is_background_image"] = true;
      }
      bannerList.push(temp);
    });
    this.setState({
      bannerList,
      loading: false,
    });
  };

  handleClose = () => {
    this.setState({
      openSnackbar: false,
    });
  };

  handleOnChange = (e, index) => {
    let { bannerList, fieldErrors } = this.state;
    let { name, value } = e.target;
    bannerList[index][name] = value;
    delete fieldErrors[`${name}${index}`];
    this.setState({
      bannerList,
      fieldErrors,
    });
  };

  handleSwitchOnChange = (e, index) => {
    let { bannerList } = this.state;
    let { name, value } = e.target;
    bannerList[index][name] = value === "true";
    this.setState({
      bannerList,
    });
  };

  handleImageChange = (event, index) => {
    const { name, value } = event.target;
    const { bannerList } = this.state;
    let fileName = event.target.files[0]["name"];
    let file_extension = `${fileName.slice(
      (Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1
    )}`;
    let is_supported_image_type = true;
    is_supported_image_type = supported_images_types.image_type.includes(
      file_extension.toLowerCase()
    );
    if (event.target.files[0] && is_supported_image_type) {
      if (event.target.files[0].size < maxFileSize["img"].size) {
        let post = new FormData();
        post.append("file", event.target.files[0]);
        let request = postRequest;
        let url = POST_URL.uploads.api;
        this.setState({ imageUploading: true });
        request(url, post, this.props).then((response) => {
          if (response && response.status === 200) {
            let uploadedId = response.data.data.id;
            let imagePreview = response.data.data.file;
            let imageName = fileName;
            let temp = {
              file_extension: file_extension,
              uploadedId: uploadedId,
              url: imagePreview,
              imageName: imageName,
            };
            bannerList[index][name] = temp;
            this.setState({
              bannerList,
            });
          }
          this.setState({
            imageUploading: false,
          });
        });
      } else {
        this.setState({
          openSnackbar: true,
          alertData: maxFileSize.errorText,
        });
      }
    } else if (!is_supported_image_type) {
      this.setState({
        alertData: supported_images_types.error,
        openSnackbar: true,
      });
    }
  };

  handleCreateBanner = () => {
    let validate = this.validateAndPostData();
    if (validate) {
      let { bannerList } = this.state;
      let sequenceTemp =
        parseInt(bannerList[bannerList.length - 1]["sequence"]) + 1;
      let temp = {
        heading: "",
        background_image: {},
        image: {},
        sequence: sequenceTemp,
      };
      bannerList.push(temp);
      this.setState({
        bannerList,
      });
    }
  };

  deleteField = (index) => {
    let { bannerList } = this.state;
    bannerList.splice(index, 1);
    this.setState({
      bannerList,
    });
  };

  deleteUploadedImage = (name, index) => {
    const { bannerList } = this.state;
    bannerList[index][name] = {};
    this.setState({
      bannerList,
    });
  };

  handleLargePreview = (image) => {
    this.setState({
      largeImagePreview: image,
    });
  };

  handleCloseLargeImage = () => {
    this.setState({
      largeImagePreview: "",
    });
  };

  validateAndPostData = () => {
    let { bannerList, fieldErrors, alertData, selected_type } = this.state;
    fieldErrors = {};
    alertData = "";
    let validate = true;
    let sequenceList = [];
    let post_data = [];
    let post_data_temp = {};
    bannerList.map((data, index) => {
      post_data_temp = {};
      if (data["id"]) {
        post_data_temp["id"] = data["id"];
      }
      post_data_temp["empty_space_colour"] = data["empty_space_colour"];
      post_data_temp["sequence"] = parseInt(parseInt(data["sequence"]));
      post_data_temp["link"] = data["link"];
      if (sequenceList.includes(parseInt(data["sequence"]))) {
        validate = false;
        fieldErrors[`sequence${index}`] = (
          <FormattedMessage {...commonMessages.duplicateFoundLabel} />
        );
      }
      if (data["sequence"] && !numberRegex.value.test(data["sequence"])) {
        fieldErrors[`sequence${index}`] = numberRegex.errorText;
      }
      if (data["is_background_image"]) {
        post_data_temp["file"] = data["background_image"]["uploadedId"];
        post_data_temp["heading"] = "";
        post_data_temp["sub_heading"] = "";
        if (!data["background_image"]["url"]) {
          validate = false;
          alertData = `${index + 1} -  Upload Background image is mandatory`;
        }
      } else {
        post_data_temp["heading"] = data["heading"];
        post_data_temp["sub_heading"] = data["sub_heading"];
        post_data_temp["file"] = data["image"]["uploadedId"]
          ? data["image"]["uploadedId"]
          : "";
        // if (!data["heading"]) {
        //   fieldErrors[`heading${index}`] = (
        //     <FormattedMessage {...commonMessages.fieldMandatoryError} />
        //   );
        //   validate = false;
        // }
        if (
          data["heading"] &&
          !nameWithQuoteRegex.value.test(data["sequence"])
        ) {
          fieldErrors[`sequence${index}`] = nameWithQuoteRegex.errorText;
        }
      }
      if (data["sequence"]) {
        sequenceList.push(parseInt(data["sequence"]));
      }
      post_data.push(post_data_temp);
    });
    this.setState({
      fieldErrors,
      openSnackbar: !validate,
      alertData: alertData ? (
        alertData
      ) : (
        <FormattedMessage {...commonMessages.clearAllErrors} />
      ),
    });
    if (validate) {
      validate = {
        banner: post_data,
        user_type: selected_type,
      };
    }
    return validate;
  };

  submit = () => {
    let validate = this.validateAndPostData();
    if (validate) {
      this.setState({ submitDisable: true });
      let url = POST_URL.banner.api;
      postRequest(url, validate, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          this.props.history.push(Actions.mobile_banner.view.url);
        }
        this.setState({ submitDisable: false });
      });
    }
  };

  renderFields = (data, index) => {
    const { bannerList, fieldErrors } = this.state;
    return (
      <Paper className="paper-plain-background" key={index}>
        <Grid container spacing={2} className="header-align m-t-25px">
          <Grid item md={11} xs={11}>
            <FormControlLabel
              control={
                <Switch
                  checked={data.is_background_image}
                  name="is_background_image"
                  value={!data.is_background_image}
                  color="primary"
                  onChange={(e) => this.handleSwitchOnChange(e, index)}
                />
              }
              label="Is Background Image"
            />
          </Grid>
          {(index !== 0 || bannerList.length > 1) && (
            <Grid item md={1} xs={1}>
              <Button
                color="secondary"
                className="min-max-w-0"
                onClick={() => this.deleteField(index)}
              >
                <DeleteOutlineIcon className="add-icon-stock-item" />
              </Button>
            </Grid>
          )}
          <Grid item md={6} xs={12}>
            <TextField
              id="sequence"
              autoComplete="off"
              variant="outlined"
              label="Sequence"
              name="sequence"
              value={data.sequence}
              className="text-field-style"
              inputProps={{ maxLength: 2 }}
              fullWidth
              onChange={(e) => this.handleOnChange(e, index)}
              error={
                fieldErrors[`sequence${index}`] &&
                fieldErrors[`sequence${index}`]
              }
              helperText={
                fieldErrors[`sequence${index}`] &&
                fieldErrors[`sequence${index}`]
              }
            />
          </Grid>
          <Grid item md={6} xs={12}>
            <TextField
              id="link"
              autoComplete="off"
              variant="outlined"
              multiline
              label="Link"
              name="link"
              value={data.link}
              className="text-field-style"
              inputProps={{ maxLength: 150 }}
              fullWidth
              onChange={(e) => this.handleOnChange(e, index)}
              error={fieldErrors[`link${index}`] && fieldErrors[`link${index}`]}
              helperText={
                fieldErrors[`link${index}`] && fieldErrors[`link${index}`]
              }
            />
          </Grid>
          <Grid item md={6} xs={12}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ marginRight: 10 }}>Select Color:</div>
              <input
                type="color"
                value={this.state.bannerList[index].empty_space_colour}
                onChange={(e) => this.handleColorChange(e, index)}
                style={{marginRight:"10px"}}
              />
              <div style={{ fontSize: "0.875rem" }}>
                Colour that will be used for the empty space in the banner.
              </div>
            </div>
          </Grid>
          {data.is_background_image ? (
            <>
              <Grid item md={6} xs={12} className="display-flex">
                {!data.background_image["url"] && (
                  <Tooltip title="Upload Image" placement="top-start">
                    <label
                      htmlFor={`${index}-background_image-upload-pic-options`}
                      className="align-self-center"
                    >
                      <Button
                        variant="raised"
                        component="span"
                        className="set-question-upload-image-button "
                      >
                        <Box className="upload-icon">
                          <i class="fa fa-upload" aria-hidden="true"></i>
                        </Box>
                        <Box className="pl-5 text-transform-none">
                          Upload Background Image
                        </Box>
                      </Button>
                    </label>
                  </Tooltip>
                )}
                <input
                  type="file"
                  id={`${index}-background_image-upload-pic-options`}
                  className="display-none"
                  onChange={(e) => this.handleImageChange(e, index)}
                  onClick={(e) => (e.target.value = null)}
                  name="background_image"
                />
                {data.background_image["url"] && (
                  <Box className="set-question-image-preview-outer-box">
                    <Tooltip title="Preview Image" placement="top-start">
                      <img
                        src={data.background_image["url"]}
                        alt="image"
                        className="set-question-uploaded-image"
                      />
                    </Tooltip>
                    <Box
                      onClick={() =>
                        this.handleLargePreview(data.background_image["url"])
                      }
                      className="set-question-image-preview-icon"
                    >
                      <VisibilityOutlinedIcon />{" "}
                    </Box>
                    <Box
                      className="set-question-delete-image-input"
                      onClick={() =>
                        this.deleteUploadedImage("background_image", index)
                      }
                    >
                      <HighlightOffIcon />
                    </Box>
                  </Box>
                )}
              </Grid>
            </>
          ) : (
            <>
              <Grid item md={12} xs={12}>
                <TextField
                  id="heading"
                  autoComplete="off"
                  multiline
                  variant="outlined"
                  label="Heading"
                  name="heading"
                  value={data.heading}
                  className="text-field-style"
                  inputProps={{ maxLength: 60 }}
                  fullWidth
                  onChange={(e) => this.handleOnChange(e, index)}
                  error={
                    fieldErrors[`heading${index}`] &&
                    fieldErrors[`heading${index}`]
                  }
                  helperText={
                    fieldErrors[`heading${index}`]
                      ? fieldErrors[`heading${index}`]
                      : "Heading is placed on the image"
                  }
                />
              </Grid>
              <Grid item md={12} xs={12}>
                <TextField
                  id="sub_heading"
                  multiline
                  autoComplete="off"
                  variant="outlined"
                  label="Sub Heading"
                  name="sub_heading"
                  value={data.sub_heading}
                  className="text-field-style"
                  inputProps={{ maxLength: 60 }}
                  fullWidth
                  onChange={(e) => this.handleOnChange(e, index)}
                  error={
                    fieldErrors[`sub_heading${index}`] &&
                    fieldErrors[`sub_heading${index}`]
                  }
                  helperText={
                    fieldErrors[`sub_heading${index}`] &&
                    fieldErrors[`sub_heading${index}`]
                  }
                />
              </Grid>
              <Grid item md={6} xs={12} className="display-flex">
                {!data.image["url"] && (
                  <Tooltip title="Upload Image" placement="top-start">
                    <label
                      htmlFor={`${index}-image-upload-pic-options`}
                      className="align-self-center"
                    >
                      <Button
                        variant="raised"
                        component="span"
                        className="set-question-upload-image-button "
                      >
                        <Box className="upload-icon">
                          <i class="fa fa-upload" aria-hidden="true"></i>
                        </Box>
                        <Box className="pl-5 text-transform-none">
                          Upload Image
                        </Box>
                      </Button>
                    </label>
                  </Tooltip>
                )}
                <input
                  type="file"
                  accept="image/*"
                  id={`${index}-image-upload-pic-options`}
                  className="display-none"
                  onChange={(e) => this.handleImageChange(e, index)}
                  onClick={(e) => (e.target.value = null)}
                  name="image"
                />
                {data.image["url"] && (
                  <Box className="set-question-image-preview-outer-box">
                    <Tooltip title="Preview Image" placement="top-start">
                      <img
                        src={data.image["url"]}
                        alt="image"
                        className="set-question-uploaded-image"
                      />
                    </Tooltip>
                    <Box
                      onClick={() => this.handleLargePreview(data.image["url"])}
                      className="set-question-image-preview-icon"
                    >
                      <VisibilityOutlinedIcon />{" "}
                    </Box>
                    <Box
                      className="set-question-delete-image-input"
                      onClick={() => this.deleteUploadedImage("image", index)}
                    >
                      <HighlightOffIcon />
                    </Box>
                  </Box>
                )}
              </Grid>
            </>
          )}
        </Grid>
      </Paper>
    );
  };

  handleClickMobileBanner = () => {
    let currentSelectedList = {
      selected_type: this.state.selected_type,
    };
    let searchParam = "?" + new URLSearchParams(currentSelectedList).toString();
    this.props.history.push({
      pathname: Actions.mobile_banner.view.url,
      search: searchParam,
    });
  };

  render() {
    const {
      loading,
      openSnackbar,
      alertData,
      bannerList,
      fieldErrors,
      largeImagePreview,
      submitDisable,
      selected_type_name,
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Paper className={classNames("paper-background")}>
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
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">
                Banner List For - {selected_type_name}
              </Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames("header-align", "end-flex-prop")}>
                {isUserHasPermission("subjects", "view") && (
                  <Button
                    variant="contained"
                    // component={Link}
                    // to={Actions.mobile_banner.view.url}
                    onClick={this.handleClickMobileBanner}
                    className="editbutton-view"
                  >
                    <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                    {Actions.mobile_banner.view.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <Grid container>
            <Grid item md={7} xs={12}>
              {bannerList.map((data, index) => {
                return this.renderFields(data, index);
              })}
              <Box className="m-t-25px text-align-right">
                <Button
                  className="form-next-pre-button"
                  onClick={() => this.handleCreateBanner()}
                >
                  {" "}
                  Add More
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Box className="submt-button-float-bottom" mt={3}>
            <Button
              variant="contained"
              color="primary"
              className="submit"
              disabled={submitDisable}
              onClick={this.submit}
            >
              <FormattedMessage {...commonMessages.submit} />
            </Button>
          </Box>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={openSnackbar}
            autoHideDuration={2000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </Paper>
      );
    }
  }
}
export default withRouter(AddBanner);
