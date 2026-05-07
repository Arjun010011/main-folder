import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import { Paper, Box, Grid, Button } from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link } from "react-router-dom";

import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from "Components/LoadingGif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, updatePermissions } from "Includes/functions";
import { options } from "Constants";
import { INVOICE_MAPPING } from "Constants/invoiceMappingList";

const globlal_fieldDetails = [
  {
    label: "Name",
    regex: null,
    name: "name",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "dropDown",
    autoFocus: true,
    maxLength: "25",
    list: [],
  },
];

class ViewInvoiceMapping extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("invoice_mapping", [
      "update",
      "delete",
    ]);
    this.state = {
      loading: true,
      templateList: [],
      fieldDetails: [],
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: true,
            sort: true,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "template_type",
          label: "Type",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "module",
          label: "Module",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "name",
          label: "name",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "template_standard_mapping_template",
          label: "Academic Year",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value && value.length > 0 && this.getStandardNames(value,true)}
                </div>
              );
            },
          },
        },
        {
          name: "template_standard_mapping_template",
          label: "Standards",
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value && value.length > 0 && this.getStandardNames(value)}
                </div>
              );
            },
          },
        },
        {
          name: "Actions",
          label: "Actions",
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Box>
                  <ActionColumn
                    id={tableMeta.rowData[0]}
                    fieldValues={[tableMeta.rowData[3]]}
                    label=""
                    fieldDetails={this.state.fieldDetails}
                    baseClassName="action-basic-detail-width"
                    updateUrl={PUT_URL.templatemapping.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    deleteUrl={DEL_URL.templatemapping.api}
                    deleteType={this.deleteType}
                    enabledActions={this.permission}
                    getData={this.getFeeTypeList}
                    isGetData={true}
                  />
                </Box>
              );
            },
          },
        },
      ],
    };
  }

  getStandardNames = (value,isYear) => {
    let return_value = [];
    value.map((data) => {
      if(isYear && return_value.length===0 && data?.academic_year_value){
        return return_value.push(data.academic_year_value)
      }
      else if(!isYear){
        return_value.push(data?.standard_name);
      }
    });
    return return_value.join(", ");
  };

  componentDidMount() {
    this.getTemplateList();
    this.setState({
      fieldDetails: [...globlal_fieldDetails],
    });
  }

  getTemplateList = () => {
    let { templateList } = this.state;
    let url = GET_URL.templatemapping.api;
    let params = { is_active: 1 };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        templateList = response.data.data;
        this.setState({
          templateList,
          loading: false,
        });
      }
    });
  };

  deleteType = async (id) => {
    let templateLists = this.state.templateList;
    let index = templateLists.findIndex((data) => data.id === id);
    templateLists.splice(index, 1);
    this.setState({
      templateList: [...templateLists],
    });
  };

  updatePostFormat = (newData, id, value) => {
    let payload = {
      name: newData.name,
    };
    return payload;
  };

  updateType = (newData, id) => {
    let temptemplateList = this.state.templateList;
    for (const data of temptemplateList) {
      if (data.id === id) {
        data.name = newData.name;
        break;
      }
    }
    this.setState({
      templateList: [...temptemplateList],
    });
    return true;
  };

  getFeeTypeList = async (id) => {
    const { templateList, fieldDetails } = this.state;
    let nameList = [];
    for (const index in templateList) {
      if (templateList[index]["id"] === id) {
        for (const index1 in INVOICE_MAPPING) {
          if (
            INVOICE_MAPPING[index1]["module"] === templateList[index]["module"]
          ) {
            nameList.push({
              id: INVOICE_MAPPING[index1]["name"],
              name: INVOICE_MAPPING[index1]["name"],
            });
          }
        }
      }
    }
    fieldDetails[0]["list"] = nameList;
    this.setState({
      fieldDetails: [...fieldDetails],
      columns: [...this.state.columns],
    });
    return true;
  };

  render() {
    let { loading, templateList, columns } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Box>
          <Paper className={"paper-background"}>
            <Grid container>
              <Grid item md={7} xs={12} sm={12}>
                <Box className="header-align heading">Template List</Box>
              </Grid>
              <Grid item md={5} xs={12} sm={12}>
                <Box className="end-flex-prop header-align">
                  {isUserHasPermission("invoice_mapping", "create") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.invoice_mapping.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.invoice_mapping.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Grid container className="header-align">
              <Grid item md={10} xs={12}>
                <AllMUIDataTable
                  data={templateList}
                  columns={columns}
                  options={options}
                />
              </Grid>
            </Grid>
          </Paper>
        </Box>
      );
    }
  }
}

export default withRouter(ViewInvoiceMapping);
