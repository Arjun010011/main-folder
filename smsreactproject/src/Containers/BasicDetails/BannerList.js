import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  CircularProgress,
  Tooltip,
} from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link } from "react-router-dom";
import classNames from "classnames";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  getSettingValue,
  updatePermissions,
  getUrlParam
} from "Includes/functions";
import { options } from "Constants";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { Dropdown } from "Components/DropDown";
import { withRouter } from "react-router-dom/cjs/react-router-dom.min";

const fieldDetails = [
  {
    label: <FormattedMessage {...commonMessages.subjectName} />,
    regex: nameAndNumberRegex,
    autoFocus: true,
    name: "name",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 30,
    gridClassName: "margin-vertical-20",
  },
  {
    label: <FormattedMessage {...commonMessages.isLanguage} />,
    regex: null,
    autoFocus: false,
    name: "is_language",
    md: 12,
    className: "width-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "checkbox",
    maxLength: 20,
    gridClassName: "margin-vertical-20",
    hide: parseInt(getSettingValue("number_of_language")) == 0 ? true : false,
  },
];
class BannerList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("subjects", ["update", "delete"]);
    this.state = {
      bannerList: [],
      loading: true,
      selectedToDelete: [],
      tableUpdating: false,
      selected_type: 1,
      type_list: [
        { id: 1, name: "Student" },
        { id: 2, name: "Staff" },
      ],
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "heading",
          label: "Heading",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "sub_heading",
          label: "Sub Heading",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "sequence",
          label: "Sequence",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "file_details",
          label: "Image",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                value && (
                  <Box className="set-question-image-preview-outer-box w-max-content">
                    <Tooltip title="Preview Image" placement="top-start">
                      <img
                        src={value["file"]}
                        alt="image"
                        className="set-question-uploaded-image"
                      />
                    </Tooltip>
                    <Box
                      onClick={() => this.handleLargePreview(value["file"])}
                      className="set-question-image-preview-icon"
                    >
                      <VisibilityOutlinedIcon />{" "}
                    </Box>
                  </Box>
                )
              );
            },
          },
        },
        {
          name: "link",
          label: "Links",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value) => {
              return <Box className="text-transform-none">{value}</Box>;
            },
          },
        },
      ],
    };
  }

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

  updatePostFormat = (newData) => {
    let payload = {
      name: newData.name,
      is_language: newData.is_language,
    };
    return payload;
  };

  componentDidMount = () => {
    let currentSelectedList = getUrlParam();
    if (currentSelectedList.selected_type) {
      this.setState({
        selected_type: currentSelectedList.selected_type,
      });
    }
    this.getBannerList();
  };

  getBannerList = () => {
    const url = GET_URL.banner.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          bannerList: response.data.data,
          loading: false,
        });
      }
    });
  };

  updateType = (newData, id) => {
    let subject = this.state.bannerList;
    for (const data of subject) {
      if (data.id === id) {
        data.name = newData.name;
        data.is_language = newData.is_language;
        break;
      }
    }
    this.setState({
      bannerList: [...subject],
    });
    return true;
  };

  deleteType = async (id) => {
    let subject = this.state.bannerList;
    subject.map((data, index) => {
      if (data.id === id) {
        subject.splice(index, 1);
      }
    });
    this.setState({
      bannerList: subject,
    });
  };

  onChange = (e) => {
    let { name, value } = e.target;
    this.setState({
      [name]: value,
    });
  };

  handleClickMobileBanner = () => {
    let currentSelectedList = {
      selected_type: this.state.selected_type,
    };
    let searchParam = "?" + new URLSearchParams(currentSelectedList).toString();
    this.props.history.push({
      pathname: Actions.mobile_banner.create.url,
      search: searchParam,
    });
  };

  render() {
    const {
      loading,
      bannerList,
      columns,
      tableUpdating,
      largeImagePreview,
      type_list,
      selected_type,
    } = this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
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
          <Paper className={classNames("paper-background")}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">Banner List</Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission("mobile_banner", "create") && (
                    <Button
                      variant="contained"
                      // component={Link}
                      // to={Actions.mobile_banner.create.url}
                      onClick={this.handleClickMobileBanner}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />
                      {Actions.mobile_banner.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <div>
              <Dropdown
                className="filter-dropdown"
                data={type_list}
                name="selected_type"
                value={selected_type}
                onChange={this.onChange}
                label="Selected Type"
                size="small"
                // style="width-100-perc"
                fullWidth
                hideSelect={true}
              />
            </div>
            <Grid container className={classNames("header-align")}>
              <Grid item md={12} xs={12}>
                <Paper>
                  <AllMUIDataTable
                    key={bannerList}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={bannerList}
                    columns={columns}
                    options={options}
                  />
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      );
    }
  }
}
export default withRouter(BannerList);
