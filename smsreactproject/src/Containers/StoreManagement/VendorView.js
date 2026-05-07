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
import { nameWithHashedRegex, nameRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, updatePermissions } from "Includes/functions";
import { options } from "Constants";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";

const fieldDetails = [
  {
    label: <FormattedMessage {...messages.storeVendorName} />,
    regex: nameRegex,
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
  {
    label: <FormattedMessage {...messages.storeVendorAddress} />,
    regex: nameWithHashedRegex,
    name: "address",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text_area",
  },
];

class VendorView extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("store_inventory_vendors", [
      "update",
      "delete",
    ]);
    this.state = {
      loading: true,
      vendorList: [],
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
          name: "name",
          label: <FormattedMessage {...messages.storeVendorName} />,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "address",
          label: <FormattedMessage {...messages.storeVendorAddress} />,
          options: {
            filter: true,
            sort: true,
            display: true,
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
                    fieldValues={[tableMeta.rowData[1], tableMeta.rowData[2]]}
                    label={<FormattedMessage {...messages.editStoreVendor} />}
                    fieldDetails={fieldDetails}
                    baseClassName="action-basic-detail-width"
                    updateUrl={PUT_URL.vendor.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    deleteUrl={DEL_URL.vendor.api}
                    deleteType={this.deleteType}
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

  componentDidMount() {
    this.getVendorList();
  }

  getVendorList = () => {
    let { vendorList } = this.state;
    let url = GET_URL.vendor.api;
    let params = { is_active: 1 };
    getRequest(url, params).then((response) => {
      if (response && response.status === 200) {
        vendorList = response.data.data;
        this.setState({
          vendorList,
          loading: false,
        });
      }
    });
  };

  deleteType = async (id) => {
    let vendor = this.state.vendorList;
    let index = vendor.findIndex((data) => data.id === id);
    vendor.splice(index, 1);
    this.setState({
      vendorList: [...vendor],
    });
  };

  updatePostFormat = (newData) => {
    let payload = {
      name: newData.name,
      address: newData.address,
    };
    return payload;
  };

  updateType = (newData, id) => {
    let vendor = this.state.vendorList;
    for (const data of vendor) {
      if (data.id === id) {
        data.name = newData.name;
        data.address = newData.address;
        break;
      }
    }
    this.setState({
      vendorList: [...vendor],
    });
    return true;
  };

  render() {
    let { loading, vendorList, columns } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <div>
          <Paper className={"paper-background"}>
            <Grid container>
              <Grid item md={7} xs={12} sm={12}>
                <div className="header-align heading">
                  <FormattedMessage {...messages.storeVendorHeader} />
                </div>
                <div className="sub-heading">
                  <FormattedMessage {...messages.addVendorSubHeading} />
                </div>
              </Grid>
              <Grid item md={5} xs={12} sm={12}>
                <div className="end-flex-prop header-align">
                  {isUserHasPermission("store_inventory_vendors", "create") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.store_inventory_vendors.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.store_inventory_vendors.create.label}
                    </Button>
                  )}
                </div>
              </Grid>
            </Grid>
            <Grid container className="header-align">
              <Grid item md={10} xs={12}>
                <AllMUIDataTable
                  data={vendorList}
                  columns={columns}
                  options={options}
                />
              </Grid>
            </Grid>
          </Paper>
        </div>
      );
    }
  }
}

export default withRouter(VendorView);
