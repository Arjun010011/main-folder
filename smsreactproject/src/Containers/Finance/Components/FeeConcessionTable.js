import React, { Component } from "react";
import { Box, Grid, CircularProgress, Snackbar } from "@material-ui/core";
import { withRouter } from "react-router-dom";
import _ from "lodash";

import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { PUT_URL, DEL_URL } from "Includes/urls";
import { DATATABLEROWSPERPAGEOPT } from "Constants";
import { validateAmount, validatePercent } from "Includes/validations";
import { isUserHasPermission, Alert } from "Includes/functions";
import { APPROVAL_STATUS, TRANSPORT_CODE } from 'Constants'
const fieldDetails = [
  {
    label: "Concession",
    regex: null,
    name: "rate",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    autoFocus: true,
    maxLength: 6,
  },
  {
    label: "Is Percentage?",
    regex: null,
    name: "is_percentage",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "checkbox",
    autoFocus: true,
    maxLength: 6,
  },
];

class FeeConcessionTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      year: 0,
      standard: 0,
      tableLoading: false,
      snackbar: false,
      alertData: "",
      pagination: this.props.pagination,
      assignedConcessions: this.props.data,
      enabledActions: [],
      columns: [
        {
          name: "conc_type",
          label: "Type",
          column_data_bind: 9,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "concession_type_name",
          label: "Concession Type",
          column_data_bind: 12,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "standard_fee_name",
          label: "Fee Type",
          column_data_bind: 13,
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "fee_amount",
          label: "Total Amount",
          options: {
            filter: false,
            sort: true,
            sort: false,
          },
        },
        {
          name: "concession_in_perc",
          label: "Concession %",
          options: {
            filter: false,
            sort: true,
            searchable: false,
            sort: false,
          },
        },
        {
          name: "concession_amount",
          label: "Concession Rs.",
          options: {
            filter: false,
            sort: true,
            searchable: false,
            sort: false,
          },
        },
        {
          name: "is_amount",
          options: {
            filter: false,
            display: false,
            searchable: false,
          },
        },
        {
          name: "id",
          options: {
            filter: false,
            display: false,
            searchable: false,
          },
        },
        {
          name: "approval_status",
          options: {
            filter: false,
            display: false,
            searchable: false,
          },
        },
        {
          name: "type",
          options: {
            filter: false,
            display: false,
            searchable: false,
          },
        },
        {
          name: "rate",
          options: {
            filter: false,
            display: false,
            searchable: false,
          },
        },
        {
          name: "standard_fee_codename",
          options: {
            filter: false,
            display: false,
            searchable: false,
          },
        },
        {
          name: "concession_type",
          options: {
            filter: true,
            display: false,
            searchable: false,
          },
        },
        {
          name: "standard_fee",
          options: {
            filter: true,
            display: false,
            searchable: false,
          },
        },
        {
          name: "Actions", 
          label: "Actions",
          options: {
            display: this.updatePermissions("display"),
            filter: false,
            sort: false,
            searchable: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              let fieldData = [
                parseFloat(tableMeta.rowData[10]),
                !tableMeta.rowData[6],
                tableMeta.rowData[3]
              ];
              const uapproved = tableMeta.rowData[8] === APPROVAL_STATUS.un_approved;
              const enabledActions = this.updatePermissions();
              return (
                <div>
                  <ActionColumn
                    id={tableMeta.rowData[7]}
                    fieldValues={fieldData}
                    label="Update Concession"
                    fieldDetails={tableMeta.rowData[11] === TRANSPORT_CODE ? [fieldDetails[0]] : fieldDetails}
                    updateUrl={PUT_URL.concessionfee.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    deleteUrl={DEL_URL.concessionfee.api}
                    deleteType={this.deleteType}
                    baseClassName="action-basic-detail-width"
                    enabledActions={uapproved ? enabledActions : []}
                    textToShow={uapproved ? '' : <Box style={{ wordBreak: 'initial' }} color='green'>Approved</Box>}
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
    this.updatePermissions();
    this.updateColumns();
  }

  updateColumns = () => {
    let { columns } = this.state;
    const { hideColumns } = this.props;
    if (hideColumns) {
      columns.forEach((col) => {
        if (hideColumns.includes(col.name)) {
          col.options.display = false
        }
      })
    }
    this.setState({ columns });
  }

  updatePostFormat = (newData, id) => {
    let payload = {
      rate: parseFloat(newData.rate),
      is_amount: !newData.is_percentage,
    };
    let test = null;
    const concession = this.state.assignedConcessions.concession_list.filter((conc) => conc.id === id)[0]
    let fee_amount = concession.type === 'total' ? concession.standard_fee_total_amount - 1 : concession.standard_fee_amount - 1;
    if (!newData.is_percentage) {
      test = validateAmount(newData.rate, true, 0, fee_amount);
    } else {
      test = validatePercent(newData.rate);
    }
    if (test && test.errorFound) {
      return { error: test.errorText };
    }
    return payload;
  };

  updateType = () => {
    this.setState({ tableUpdating: true });
    this.props.getAssignedConcessionTypes(null, this.state.columns);
    return true;
  };

  deleteType = () => {
    this.setState({ tableUpdating: true });
    this.props.getAssignedConcessionTypes(null, this.state.columns);
  };

  updatePermissions = (type) => {
    const hasEditPermission = isUserHasPermission(
      "assign_consission",
      "update"
    );
    const hasDeletePermission = isUserHasPermission(
      "assign_consission",
      "delete"
    );

    let enabledActions = [];
    if (hasEditPermission) {
      enabledActions.push("edit");
    }
    if (hasDeletePermission) {
      enabledActions.push("delete");
    }
    if (type === "display") {
      return enabledActions.length > 0;
    }
    return enabledActions
    // this.setState({ enabledActions });
  };

  getTitle = () => {
    if (this.state.tableLoading) {
      return <CircularProgress className="white-text" />;
    }
    return "Assigned Concessions";
  };

  onFilterChangeHandler = (type) => {
    const { pagination, columns } = this.state;
    if (type === "reset") {
      let data = _.cloneDeep(pagination);
      data["custom"] = {};
      this.props.getAssignedConcessionTypes(data, columns);
    }
  };

  handleClose = () => {
    this.setState({
      snackbar: false,
      alertData: "",
    });
  };

  static getDerivedStateFromProps(props, state) {
    return {
      assignedConcessions: props.data,
      tableLoading: props.loading,
    };
  }

  changePage = (tableState, action) => {
    this.setState({ tableUpdating: true }, () => {
      this.props.getAssignedConcessionTypes(tableState, this.state.columns);
    });
  };
  render() {
    const { assignedConcessions, columns, alertData, snackbar } = this.state;
    const { pagination, applyFilter, applySearch } = this.props;
    const options = {
      filterType: 'checkbox',
      selectableRows: "none",
      responsive: "simple",
      filter: true,
      search: applySearch,
      download: false,
      print: false,
      viewColumns: true,
      rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
      onFilterChange: (onFilterChange, filterList, type) => {
        this.onFilterChangeHandler(type);
      },
      viewColumns: false,
    };
    return (
      <>
        <Box className="margin-top-20">
          <Grid item md={12} xs={12} sm={12}>
            {assignedConcessions && (
              <AllMUIDataTable
                columns={columns}
                options={options}
                data={assignedConcessions.concession_list}
                key={assignedConcessions.concession_list}
                serverSide={true}
                pagination={pagination}
                count={assignedConcessions.count}
                onTableChange={this.changePage}
                title={this.getTitle()}
              />
            )}
          </Grid>
        </Box>

        <Snackbar
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          open={snackbar}
          autoHideDuration={10000}
          onClose={this.handleClose}
        >
          <Alert onClose={this.handleClose} severity="error">
            {alertData}
          </Alert>
        </Snackbar>
      </>
    );
  }
}

export default withRouter(FeeConcessionTable);
