import React, { Component } from "react";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import {
  Grid,
  FormLabel,
  Box,
  Button,
  Typography,
  Divider,
  CircularProgress,
  TextField,
  IconButton,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@material-ui/core";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import InstagramIcon from "@material-ui/icons/Instagram";
import FacebookIcon from "@material-ui/icons/Facebook";
import TwitterIcon from "@material-ui/icons/Twitter";
import LinkedInIcon from "@material-ui/icons/LinkedIn";
import YouTubeIcon from "@material-ui/icons/YouTube";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import PhoneIcon from "@material-ui/icons/Phone";
import LanguageIcon from "@material-ui/icons/Language";
import Swal from "sweetalert2";
import { getLocalStorageDetails } from "Includes/functions";
import DynamicForm from "Components/DynamicForm";
import AddressFields from "Components/AddressFields";
import { nameAndDotRegex, nameRegex, pinCodeRegex } from "Constants/regularExpression";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

import { postRequest } from "Includes/api/apicall";
import { PUT_URL, POST_URL } from "Includes/urls";

import {
  nameWithQuoteRegex,
  nameWithHashedRegex,
  nameAndNumberRegex,
  gstinNumberRegex,
  faxNumberRegex,
} from "Constants/regularExpression";
import { maxFileSize, image_formats } from "Constants";
import { validateMobileNumber, getSettingValue } from "Includes/functions";

import messages from "./messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import AutoCompleteAddress from "Components/AutoCompleteAddress";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

// const is_google_places = Boolean(parseInt(getSettingValue("google_places")));
// const is_google_places = true;
const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

const fieldDetails = [
  {
    label: <FormattedMessage {...messages.schoolName} />,
    regex: nameWithQuoteRegex,
    name: "name",
    md: 12,
    className: "width-form-95",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
  },
  {
    label: <FormattedMessage {...messages.trusts} />,
    regex: null,
    name: "trust_name",
    md: 12,
    className: "width-form-95",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
  },
  {
    label: <FormattedMessage {...messages.schoolCode} />,
    regex: nameAndNumberRegex,
    name: "code",
    md: 6,
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 25,
    disabled: true,
  },
  {
    label: <FormattedMessage {...messages.schoolType} />,
    regex: nameAndNumberRegex,
    name: "type",
    md: 6,
    className: "width-form-90",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 50,
  },
  {
    label: <FormattedMessage {...messages.boardName} />,
    regex: nameAndNumberRegex,
    name: "board_name",
    md: 6,
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 50,
  },
  {
    label: <FormattedMessage {...messages.schoolGst} />,
    regex: gstinNumberRegex,
    name: "gstin_num",
    md: 6,
    className: "width-form-90",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 25,
    helperText: "Format 22AAAAA0000A1Z2",
  },
  {
    label: <FormattedMessage {...messages.faxNumber} />,
    regex: faxNumberRegex,
    name: "fax_num",
    md: 6,
    className: "width-form-90",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 25,
    helperText: "Format: 11111111222",
  },
  {
    label: <FormattedMessage {...messages.schoolMobile} />,
    regex: null,
    name: "tel_num",
    md: 6,
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "phone_number",
  },
  {
    label: <FormattedMessage {...messages.alternateNum} />,
    regex: null,
    name: "tel_num_2",
    md: 6,
    className: "width-form-90",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "phone_number",
  },
  {
    label: <FormattedMessage {...messages.schoolEmail} />,
    regex: null,
    name: "email",
    md: 6,
    className: "width-form-90",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 254,
  },
  {
    label: <FormattedMessage {...messages.enquiryFormat} />,
    regex: null,
    name: "enquiry_format",
    md: 6,
    className: "width-form-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 25,
  },
];

const addressDetails = [
  {
    label: <FormattedMessage {...commonMessages.address} />,
    regex: nameWithHashedRegex,
    name: "address",
    md: 12,
    className: "width-form-95",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
  },
  {
    label: <FormattedMessage {...commonMessages.country} />,
    regex: null,
    name: "country",
    md: 6,
    className: "width-90",
    required: false,
    id: "outlined-textarea",
    default: null,
    rows: null,
    type: "DropDownWithSearch",
  },
  {
    label: <FormattedMessage {...commonMessages.state} />,
    regex: null,
    name: "state",
    md: 6,
    className: "width-90",
    parentRequired: "country",
    id: "outlined-textarea",
    default: null,
    rows: null,
    type: "DropDownWithSearch",
    required: false,
  },
  {
    label: <FormattedMessage {...commonMessages.district} />,
    regex: null,
    name: "district",
    md: 6,
    className: "width-90",
    parentRequired: "state",
    id: "outlined-textarea",
    default: null,
    rows: null,
    type: "DropDownWithSearch",
    required: false,
  },
  {
    label: <FormattedMessage {...commonMessages.city} />,
    regex: null,
    name: "city",
    md: 6,
    className: "width-90",
    parentRequired: "district",
    id: "outlined-textarea",
    default: null,
    rows: null,
    type: "DropDownWithSearch",
    required: false,
  },
  {
    label: <FormattedMessage {...commonMessages.pincode} />,
    regex: pinCodeRegex,
    name: "pincode",
    md: 6,
    className: "width-form-90",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 6,
  },
];

// Social link options with icons
const SOCIAL_LINK_OPTIONS = [
  { key: 'instagram', label: 'Instagram', icon: <InstagramIcon />, placeholder: 'https://instagram.com/yourpage' },
  { key: 'facebook', label: 'Facebook', icon: <FacebookIcon />, placeholder: 'https://facebook.com/yourpage' },
  { key: 'phone', label: 'Phone', icon: <PhoneIcon />, placeholder: '+919876543210' },
  { key: 'website', label: 'Website', icon: <LanguageIcon />, placeholder: 'https://yourwebsite.com' },
];

class SchoolDetail extends Component {
  constructor(props) {
    super(props);
    const user = getLocalStorageDetails('user', 'object');
    this.state = {
      fieldErrors: {},
      datalist: {},
      fieldDetails: null,
      addressDetails: null,
      addressValue: {},
      school: { preview: "", logo: null, address: {} },
      enableUploadIcons: true,
      fieldErrors: {},
      poc: '',
      isSuperUser: user.is_superuser,
      //   is_google_places: isFormDefinitionEnabled(
      //     "student_configuration",
      //     "address_google_map",
      //     1
      //   ),
      is_google_places: true,
      isAddressContains: false,
      socialLinks: [], // Array of { platform: '', value: '' }
    };
    this.handleChange = this.handleChange.bind(this);
  }

  componentDidMount() {
    if (this.props.isEditForm) {
      this.updateSchoolDetail(this.props.currentSchool);
      this.updateAddress(this.props.currentSchool);
      this.updateSocialLinks(this.props.currentSchool);
      if (this.props.currentSchool["poc"]) {
        this.setState({
          poc: this.props.currentSchool["poc"],
        });
      }
      if (
        this.props.currentSchool["country"]
      ) {
        this.setState({
          isAddressContains: true,
        });
      } 
    }
  }

  updateSocialLinks = (schoolData) => {
    if (schoolData && schoolData.social_links) {
      const socialLinksArray = Object.entries(schoolData.social_links).map(
        ([platform, value]) => ({ platform, value })
      );
      this.setState({ socialLinks: socialLinksArray });
    }
  };

  handleAddSocialLink = () => {
    this.setState(prevState => ({
      socialLinks: [...prevState.socialLinks, { platform: '', value: '' }]
    }));
  };

  handleRemoveSocialLink = (index) => {
    this.setState(prevState => ({
      socialLinks: prevState.socialLinks.filter((_, i) => i !== index)
    }));
  };

  handleSocialLinkChange = (index, field, value) => {
    this.setState(prevState => {
      const updatedLinks = [...prevState.socialLinks];
      updatedLinks[index] = { ...updatedLinks[index], [field]: value };
      return { socialLinks: updatedLinks };
    });
  };

  getSocialLinksObject = () => {
    const { socialLinks } = this.state;
    const socialLinksObj = {};
    socialLinks.forEach(link => {
      if (link.platform && link.value && link.value.trim()) {
        socialLinksObj[link.platform] = link.value.trim();
      }
    });
    return socialLinksObj;
  };

  getAvailablePlatforms = (currentIndex) => {
    const { socialLinks } = this.state;
    const usedPlatforms = socialLinks
      .filter((_, i) => i !== currentIndex)
      .map(link => link.platform);
    return SOCIAL_LINK_OPTIONS.filter(opt => !usedPlatforms.includes(opt.key));
  };

  updateAddress = (addressData) => {
    let { school, is_google_places } = this.state;
    if (is_google_places) {
      let address = {};
      if (addressData) {
        address["address_one_map"] =
          addressData["map_address_data"]?.["address_one_map"];
        address["address_two_map"] =
          addressData["map_address_data"]?.["address_two_map"];
        address["city_map"] = addressData["map_address_data"]?.["city_map"];
        address["district_map"] =
          addressData["map_address_data"]?.["district_map"];
        address["state_map"] = addressData["map_address_data"]?.["state_map"];
        address["country_map"] =
          addressData["map_address_data"]?.["country_map"];
        address["pincode_map"] =
          addressData["map_address_data"]?.["pincode_map"];
        address["latitude_and_langitude_map"] = addressData[
          "map_address_data"
        ]?.["latitude_map"] && {
          lat: addressData["map_address_data"]["latitude_map"],
          lng: addressData["map_address_data"]["longitude_map"],
        };
      }
      school["address"] = address;
      this.setState(
        {
          school,
        },
        () => {
          this.props.loadingFalse();
        }
      );
    } else {
      let addressDetail = [...addressDetails];
      let value;
      addressDetail.forEach((field) => {
        if (addressData) {
          value = addressData[field.name];
        } else {
          value = field.default;
        }
        school["address"][field.name] = value;
        field.default = value;
      });
      this.setState({
        addressDetails: addressDetail,
        school,
      });
    }
  };

  updateParent = (name, value) => {
    let { school, fieldDetails } = this.state;
    fieldDetails.some((field) => {
      if (field.name === name) {
        field.default = value;
      }
    });
    school[name] = value;
    this.setState({
      fieldDetails,
      school,
    });
  };

  updateParentAddress = (address) => {
    let { school } = this.state;
    school["address"] = address;
    this.setState({
      school,
    });
  };
  updateList = (datalist) => {
    this.setState(
      {
        datalist: datalist,
      },
      () => {
        if (this.props.isEditForm && Object.keys(datalist).length === 4) {
          this.props.loadingFalse();
        } else if (Object.keys(datalist).length === 1) {
          this.props.loadingFalse();
        }
      }
    );
  };
  getData = () => {
    return this.state;
  };
  updateSchoolDetail = (schoolInf) => {
    let { school } = this.state;
    let fieldDetail = [...fieldDetails];
    let value;
    fieldDetail.forEach((field) => {
      if (schoolInf) {
        value = schoolInf[field["name"]];
      } else {
        value = field.default;
      }
      field.default = value;
      school[field["name"]] = value;
    });
    school["logo"] = schoolInf["document_details"]
      ? schoolInf["document_details"]["id"]
      : null;
    school["preview"] = schoolInf["document_details"]
      ? schoolInf["document_details"]["file"]
      : "";
    this.setState({
      school,
      fieldDetails: fieldDetail,
    });
  };

  submit = () => {
    const { school, fieldDetails, addressDetails, poc, fieldErrors, is_google_places, isSuperUser } = this.state;
    let test = true;
    let addressTest = true;
    let pocTest = true;
    fieldDetails.forEach((field) => {
      let value = field.default;
      let name = field.name;
      if (field.required && (value === "" || value === null || value === 0)) {
        fieldErrors[name] = (
          <FormattedMessage {...commonMessages.fieldMandatoryError} />
        );
        test = false;
      } else if (field.type === "phone_number") {
        let returnValue = validateMobileNumber(field, value);
        if (!returnValue.test) {
          fieldErrors[name] = returnValue.error;
          test = false;
        } else {
          value = returnValue.value;
        }
      } else if (
        field.regex &&
        !field.regex.value.test(value) &&
        value !== ""
      ) {
        fieldErrors[name] = field.regex.errorText;
        test = false;
      }
    });

    if (is_google_places) {
      if (!school["address"]["address_one_map"]) {
        fieldErrors["address_one_map"] = "This field is mandatory";
        addressTest = false;
      }
    } else {
      addressDetails.forEach((field) => {
        let value = school["address"][field.name]
          ? school["address"][field.name]
          : field.default;
        let name = field.name;
        if (field.required && (value === "" || value === null || value === 0)) {
          fieldErrors[name] = (
            <FormattedMessage {...commonMessages.fieldMandatoryError} />
          );
          addressTest = false;
        } else if (
          field.regex && 
          !field.regex.value.test(value) &&
          value
        ) {
          fieldErrors[name] = field.regex.errorText;
          addressTest = false;
        }
      });
    }
    if (isSuperUser) {
      if (!poc.trim()) {
        fieldErrors.poc = "POC Details are required.";
        pocTest = false;
      }
    }
    if (test && addressTest && pocTest) {
      const socialLinks = this.getSocialLinksObject();
      const combineData = { ...school, poc, social_links: socialLinks };
      this.props.submit(combineData);
    } else {
      this.setState({
        open: true,
        alertData: <FormattedMessage {...commonMessages.clearAllErrors} />,
      });
      this.refs.DynamicForm.updateErrors(fieldErrors);
      this.refs.AddressFields.updateErrors(fieldErrors);
    }
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  handleChange(event, acceptFileType) {
    let { school, enableUploadIcons } = this.state;
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
        this.props.isUpload(false);
        let reader = new FileReader();
        let file = event.target.files[0];
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          school["preview"] = reader.result;
          enableUploadIcons = false;
          this.setState({
            school,
            enableUploadIcons,
          });
        };
        let post = new FormData();
        post.append("file", event.target.files[0]);
        const url = POST_URL.uploads.api;
        postRequest(url, post, this.props).then((response) => {
          if (response && response.status === 200) {
            school["logo"] = response.data.data.id;
            this.setState(
              {
                school,
              },
              () => {
                this.props.isUpload(true);
              }
            );
          } else {
            this.props.isUpload("failed");
          }
          enableUploadIcons = true;
          this.setState({
            enableUploadIcons,
          });
        });
      } else if (!is_supported_types) {
        this.setState({
          open: true,
          alertData: image_formats.error,
        });
      } else {
        this.setState({
          open: true,
          alertData: "Please Upload Below 3 MB Pic",
        });
      }
    }
  }

  removeLogo = () => {
    let { school } = this.state;
    school["preview"] = "";
    school["logo"] = null;
    this.setState(
      {
        school,
      },
      () => {
        this.props.isUpload(true);
      }
    );
  };

  handlePocChange = (e) => {
    this.setState({
      poc: e.target.value
    });
  };

  getSocialLinkIcon = (platform) => {
    const option = SOCIAL_LINK_OPTIONS.find(opt => opt.key === platform);
    return option ? option.icon : <LanguageIcon />;
  };

  getSocialLinkPlaceholder = (platform) => {
    const option = SOCIAL_LINK_OPTIONS.find(opt => opt.key === platform);
    return option ? option.placeholder : 'Enter link or number';
  };

  socialLinksSection = () => {
    const { socialLinks } = this.state;
    return (
      <>
        <Grid item xs={12}>
          <Box mt={3} mb={3}>
            <Divider />
          </Box>
        </Grid>

        <Grid container>
          <Grid item md={4} xs={12} sm={12}>
            <Box className="header-align">
              <Box className="form-left-heading">
                Social Links
              </Box>
            </Box>
            <Box className={classNames("form-inner-border", "hide-vl-on-900")}></Box>
          </Grid>

          <Grid item md={8} xs={12} sm={12}>
            {socialLinks.map((link, index) => (
              <Box key={index} display="flex" alignItems="center" mb={2}>
                <Box mr={1} display="flex" alignItems="center">
                  {this.getSocialLinkIcon(link.platform)}
                </Box>
                <FormControl variant="outlined" style={{ minWidth: 150, marginRight: 16 }}>
                  <InputLabel>Platform</InputLabel>
                  <Select
                    value={link.platform}
                    onChange={(e) => this.handleSocialLinkChange(index, 'platform', e.target.value)}
                    label="Platform"
                  >
                    {this.getAvailablePlatforms(index).map(opt => (
                      <MenuItem key={opt.key} value={opt.key}>
                        <Box display="flex" alignItems="center">
                          <Box mr={1} display="flex">{opt.icon}</Box>
                          {opt.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  variant="outlined"
                  label="Link / Number"
                  value={link.value}
                  onChange={(e) => this.handleSocialLinkChange(index, 'value', e.target.value)}
                  placeholder={this.getSocialLinkPlaceholder(link.platform)}
                  style={{ flex: 1 }}
                />
                <IconButton
                  color="secondary"
                  onClick={() => this.handleRemoveSocialLink(index)}
                  style={{ marginLeft: 8 }}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>
            ))}
            <Box mt={1}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddCircleOutlineIcon />}
                onClick={this.handleAddSocialLink}
                disabled={socialLinks.length >= SOCIAL_LINK_OPTIONS.length}
              >
                Add Social Link
              </Button>
            </Box>
          </Grid>
        </Grid>
      </>
    );
  };

  pocData = () => {
    const { poc, fieldErrors } = this.state;
    return (
      <>
        <Grid item xs={12}>
          <Box mt={3} mb={3}>
            <Divider />
          </Box>
        </Grid>

        <Grid container>
          <Grid item md={4} xs={12} sm={12}>
            <Box className="header-align">
              <Box className="form-left-heading">
                <FormattedMessage {...messages.pocName} />
              </Box>
            </Box>
            <Box className={classNames("form-inner-border", "hide-vl-on-900")}></Box>
          </Grid>

          <Grid item md={8} xs={12} sm={12}>
            <TextField
              label="POC Name"
              type="text"
              required
              variant="outlined"
              value={poc}
              className="width-100"
              onChange={this.handlePocChange}
              error={!!fieldErrors.poc}
              helperText={fieldErrors.poc}
            />
          </Grid>
        </Grid>
      </>
    );
  }  

  render() {
    const {
      open,
      alertData,
      fieldDetails,
      addressDetails,
      school,
      enableUploadIcons,
      isAddressContains,
      is_google_places,
      isSuperUser,
    } = this.state;
    const { submitDisable, isEditForm, loading } = this.props;
    return (
      <>
        <Box>
          <Grid container>
            <Grid item md={4} xs={12} sm={12}>
              <Box className="header-align">
                {enableUploadIcons && school.preview === "" && (
                  <label htmlFor="upload-pic">
                    <Button
                      variant="raised"
                      component="span"
                      className="upload-logo-button"
                    >
                      Upload Logo
                      <Box className="upload-icon">
                        <i class="fa fa-upload" aria-hidden="true"></i>
                      </Box>
                    </Button>
                  </label>
                )}
              </Box>
              <input
                type="file"
                id="upload-pic"
                accept="image/*"
                className="display-none"
                onChange={(e) => this.handleChange(e, "img")}
                onClick={(e) => (e.target.value = null)}
              />
              {school.preview !== "" && enableUploadIcons && (
                <Box className="header-align school-logo-position">
                  <img
                    src={school.preview}
                    className="school-logo"
                    alt="logo"
                  />
                  <HighlightOffIcon
                    className="school-logo-cross-remove"
                    onClick={() => this.removeLogo()}
                  />
                </Box>
              )}
              {!enableUploadIcons && (
                <Box className="upload-profile-loading">
                  <CircularProgress />
                </Box>
              )}
              <Box
                className={classNames("form-inner-border", "hide-vl-on-900")}
              ></Box>
            </Grid>
            <Grid item md={8} xs={12} sm={12}>
              {fieldDetails && (
                <DynamicForm
                  fieldDetails={fieldDetails}
                  updateParent={this.updateParent}
                  ref={"DynamicForm"}
                  idFormat={"school_2022_08_11_01_23_pm_"}
                />
              )}
              <Grid item xs={12}>
                <Box mt={3} mb={3}>
                  <Divider />
                </Box>
              </Grid>
            </Grid>
          </Grid>
          <Grid container>
            <Grid item md={4} xs={12} sm={12}>
              <Box className="header-align">
                <Box className="form-left-heading">
                  <FormattedMessage {...messages.schoolAddress} />
                </Box>
              </Box>
              <Box
                className={classNames("form-inner-border", "hide-vl-on-900")}
              ></Box>
            </Grid>
            <Grid item md={8} xs={12} sm={12}>
              {addressDetails && !is_google_places && ( 
                <AddressFields
                  addressDetails={addressDetails}
                  isEditForm={isAddressContains}
                  updateParentAddress={this.updateParentAddress}
                  updateList={this.updateList}
                  loadingCountry={loading}
                  ref={"AddressFields"}
                />
              )}
              {!loading && is_google_places && (
                <AutoCompleteAddress
                  addressDetails={school["address"]}
                  updateParentAddress={this.updateParentAddress}
                  isEditForm={isEditForm}
                  ref={"AddressFields"}
                  address_type={["school"]}
                  address_placeHolder={`Search ${alias_names["school"]} Name`}
                  showSearchOption={true}
                />
              )}
            </Grid>
          </Grid>
          <Grid container>
          {this.socialLinksSection()}
          {isSuperUser && this.pocData()}
            <Grid item md={12} xs={12}>
              <Box display="flex" justifyContent="flex-end">
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
            </Grid>
          </Grid>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={open}
            autoHideDuration={2000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </Box>
      </>
    );
  }
}

export default withRouter(SchoolDetail);
