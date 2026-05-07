import React, { Component } from "react";
import { Paper, Grid, Button, CircularProgress } from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";

import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from "Components/LoadingGif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { nameWithQuoteRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  getKeyValueMap,
  updatePermissions,
  getLibCategory,
} from "Includes/functions";
import { Dropdown } from "Components/DropDown";
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import { options } from "Constants";
import { getUrlParam } from "Includes/functions";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const fieldDetails = [
  {
    label: <FormattedMessage {...messages.libSubCategoryTypeName} />,
    regex: nameWithQuoteRegex,
    name: "name",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    autoFocus: true,
  },
];

class LibSubCategoryList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("library_sub_categegory", [
      "update",
      "delete",
    ]);
    this.state = {
      categoryList: [],
      selectedCategory: "",
      subCategoryList: [],
      loading: true,
      selectedToDelete: [],
      tableUpdating: false,
      error: {},
      alertData: "",
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: true,
            sort: true,
            display: false,
          },
        },
        {
          name: "name",
          label: <FormattedMessage {...messages.libSubCategoryTypeName} />,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <ActionColumn
                    id={tableMeta.rowData[0]}
                    fieldValues={[tableMeta.rowData[1]]}
                    label={
                      <FormattedMessage {...messages.editlibSubCategoryType} />
                    }
                    fieldDetails={fieldDetails}
                    updateUrl={PUT_URL.librarysubcategory.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    deleteUrl={DEL_URL.librarysubcategory.api}
                    deleteType={this.deleteType}
                    baseClassName="action-basic-detail-width"
                    enabledActions={this.permission}
                  />
                </div>
              );
            },
          },
        },
      ],
    };
  }

  componentDidMount = () => {
    let { categoryId } = getUrlParam();
    this.getCategoryList();
    this.setState(
      {
        options: options,
      },
      () => {
        if (categoryId) {
          this.getSubCategoryList(categoryId);
        }
      }
    );
  };

  getCategoryList = () => {
    const url = GET_URL.librarycategory.api;
    const params = { is_active: 1 };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          categoryList: response.data.data,
        });
        let selected = "";
        if (this.props.location.state) {
          selected = this.props.location.state.selectedCategory;
        }
        if(response.data.data.length==1){
          selected = response.data.data[0]["id"];
        }
        else if (getLibCategory()) {
          selected = getLibCategory();
          selected=selected["id"]
        }
        if (selected) {
          this.setState({
            selectedCategory: selected,
          });
          this.getSubCategoryList(selected);
        } else {
          this.setState({
            loading: false,
          });
        }
      }
    });
  };

  getSubCategoryList = (id) => {
    const g_url = GET_URL.librarysubcategory.api;
    const params = { is_active: 1, category: id };
    getRequest(g_url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          subCategoryList: response.data.data,
          tableUpdating: false,
          loading: false,
          selectedCategory: id,
        });
      }
    });
  };

  updatePostFormat = (newData) => {
    const { selectedCategory } = this.state;
    let payload = {
      sub_category: {
        name: newData.name,
        category: selectedCategory,
      },
    };
    return payload;
  };

  updateType = (newData, id) => {
    let categoryType = this.state.subCategoryList;
    for (const data of categoryType) {
      if (data.id === id) {
        data.name = newData.name;
        break;
      }
    }
    this.setState({
      subCategoryList: [...categoryType],
    });
    return true;
  };

  deleteType = async (id) => {
    let categoryType = this.state.subCategoryList;
    let index = categoryType.findIndex((data) => data.id === id);
    categoryType.splice(index, 1);
    this.setState({
      subCategoryList: [...categoryType],
    });
  };

  onChange = async (e) => {
    let { value, name, error } = e.target;
    if (value !== 0) {
      error = {};
      this.setState(
        {
          [name]: value,
          error,
          tableUpdating: true,
        },
        () => {
          this.getSubCategoryList(value);
        }
      );
    }
  };

  handleAddSubCategoryButton = () => {
    let { selectedCategory, error, categoryList } = this.state;
    if (selectedCategory) {
      let categorylist = getKeyValueMap(categoryList, "id", "name");
      let category = categorylist[selectedCategory];
      let searchState = {
        categoryType: category,
        selectedCategory: selectedCategory,
      };
      let searchParam = "?" + new URLSearchParams(searchState).toString();
      this.props.history.push({
        pathname: Actions.library_sub_categegory.create.url,
        search: searchParam,
      });
    } else {
      error.category = (
        <FormattedMessage {...messages.libSubCategoryAlertMessage} />
      );
      this.setState({
        open: true,
        alertData: error.category,
        error,
      });
    }
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  render() {
    const {
      loading,
      categoryList,
      selectedCategory,
      subCategoryList,
      columns,
      options,
      tableUpdating,
      open,
      error,
      alertData,
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <div>
          <Paper className={classNames("paper-background")}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <div className="heading">
                  <FormattedMessage {...messages.libSubCategoryType} />
                </div>
                <div className="sub-heading">
                  <FormattedMessage {...messages.addSubCategorySubHeading} />
                </div>
              </Grid>
              <Grid item md={6} xs={12}>
                <div className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission("library_sub_categegory", "create") && (
                    <Button
                      variant="contained"
                      onClick={this.handleAddSubCategoryButton}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.library_sub_categegory.create.label}
                    </Button>
                  )}
                </div>
              </Grid>
            </Grid>
            <Grid item md={3} xs={12} className="margin-top-20">
              <Dropdown
                data={categoryList}
                name="selectedCategory"
                style="width-100"
                value={selectedCategory}
                onChange={this.onChange}
                label={
                  <FormattedMessage {...messages.libCategorySelectCategory} />
                }
                error={error.category}
                hideSelect={true}
              />
            </Grid>
            {selectedCategory && (
              <Grid container className={classNames("header-align")}>
                <Grid item md={6}>
                  <AllMUIDataTable
                    key={subCategoryList}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={subCategoryList}
                    columns={columns}
                    options={options}
                  />
                </Grid>
              </Grid>
            )}
            {!selectedCategory && (
              <BlankPagewithIcon
                data={
                  <FormattedMessage {...messages.subCategoryBlankScreenView} />
                }
              />
            )}
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
          </Paper>
        </div>
      );
    }
  }
}
export default withRouter(LibSubCategoryList);
