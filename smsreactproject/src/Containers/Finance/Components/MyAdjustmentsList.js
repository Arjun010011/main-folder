import React, { Component } from "react";
import { Paper, Box, Grid, Tooltip, Typography, Button } from "@material-ui/core";
import { withRouter } from "react-router-dom";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import GetAppIcon from "@material-ui/icons/GetApp";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { getPaginationProps, numberWithCommas, getFullName } from "Includes/functions";
import { DEFAULT_PAGINATION_PROPS } from "Constants";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import { cloneDeep } from "lodash";

class MyAdjustmentsList extends Component {
  state = {
    adjustmentList: { data_list: [], count: 0 },
    loading: true,
    pagination: cloneDeep(DEFAULT_PAGINATION_PROPS),
  };

  componentDidMount() {
    this.getAdjustmentList();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.year !== this.props.year || prevProps.standard !== this.props.standard) {
      this.getAdjustmentList();
    }
  }

  getAdjustmentList = (paginationProps) => {
    let { pagination, year, standard } = this.props;
    this.setState({ loading: true });
    
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    } else {
      this.currentPagination = this.state.pagination || pagination || cloneDeep(DEFAULT_PAGINATION_PROPS);
    }

    let pagination_params = getPaginationProps(this.currentPagination);
    let params = {
      ...pagination_params,
      pagination: 1,
    };

    const url = GET_URL.myadjustments.api;
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const adjustmentData = response.data;
        const dataList = adjustmentData?.data?.data_list || [];
        
        // Process data to get parent name and reason
        dataList.forEach((item) => {
          // Get parent name from student_data
          if (item.student_data) {
            const studentData = item.student_data;
            if (studentData.student_parent) {
              const parent = studentData.student_parent.parent;
              const guardian = studentData.student_parent.guardian;
              if (parent) {
                item.parent_name = parent.father_name
                  ? `${parent.father_name} [F]`
                  : parent.mother_name
                  ? `${parent.mother_name} [M]`
                  : "";
              } else if (guardian) {
                item.parent_name = guardian.guardian_name ? `${guardian.guardian_name} [G]` : "";
              } else {
                item.parent_name = "";
              }
            } else {
              item.parent_name = "";
            }
          } else {
            item.parent_name = "";
          }
          
          // Get reason from first adjustment fee (combine all reasons if multiple)
          if (item.adjustment_fee_adjustment_fee_parent && item.adjustment_fee_adjustment_fee_parent.length > 0) {
            const reasons = item.adjustment_fee_adjustment_fee_parent
              .map(adj => adj.reason_name)
              .filter(r => r)
              .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
            item.reason = reasons.join(", ") || "";
          } else {
            item.reason = "";
          }
        });

        this.setState({
          adjustmentList: {
            data_list: dataList,
            count: adjustmentData?.data?.count || 0,
          },
          loading: false,
          pagination: this.currentPagination,
        });
      } else {
        this.setState({
          adjustmentList: { data_list: [], count: 0 },
          loading: false,
        });
      }
    }).catch((error) => {
      console.error("Error fetching adjustments:", error);
      this.setState({
        adjustmentList: { data_list: [], count: 0 },
        loading: false,
      });
    });
  };

  columns = [
    {
      name: "student_data",
      label: <FormattedMessage {...commonMessages.studentName} />,
      options: {
        filter: false,
        sort: true,
        search: true,
        customBodyRender: (value) => {
          return value ? value.name || getFullName(value.first_name, value.middle_name, value.last_name) : "";
        },
      },
    },
    {
      name: "parent_name",
      label: "Parent Name",
      options: {
        filter: false,
        sort: false,
        search: true,
        customBodyRender: (value) => {
          return value || "-";
        },
      },
    },
    {
      name: "admission_num",
      label: "Admission Number",
      options: {
        filter: false,
        sort: true,
        search: true,
        customBodyRender: (value) => {
          return value || "-";
        },
      },
    },
    {
      name: "total_amount",
      label: "Adjusted Amount",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value) => {
          return <Box>{numberWithCommas(value || 0)}</Box>;
        },
      },
    },
    {
      name: "approved_documents",
      label: "Attachments",
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value) => {
          if (!value || value.length === 0) {
            return <Typography variant="body2" style={{ color: "#999", fontSize: "12px" }}>-</Typography>;
          }
          return (
            <Box display="flex" alignItems="center" gap="8px" flexWrap="wrap">
              {value.map((doc, idx) => (
                <Button
                  key={doc.id || idx}
                  size="small"
                  startIcon={<GetAppIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (doc.file) {
                      window.open(doc.file, "_blank");
                    }
                  }}
                  style={{
                    textTransform: "none",
                    fontSize: "11px",
                    color: "#1976d2",
                    minWidth: "auto",
                    padding: "4px 8px",
                  }}
                >
                  {doc.file_name || "Document"}
                </Button>
              ))}
            </Box>
          );
        },
      },
    },
    {
      name: "reason",
      label: "Reason",
      options: {
        filter: false,
        sort: false,
        search: true,
        customBodyRender: (value) => {
          return value || "-";
        },
      },
    },
  ];

  render() {
    const { adjustmentList, loading, pagination } = this.state;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100],
      onTableChange: (action, tableState) => {
        if (action === "changePage" || action === "changeRowsPerPage" || action === "search") {
          const { page, rowsPerPage, searchText } = tableState;
          const paginationProps = {
            page: page + 1,
            rowsPerPage,
            searchText: searchText || "",
          };
          this.getAdjustmentList(paginationProps);
        }
      },
    };

    return (
      <Box>
        <AllMUIDataTable
          title=""
          data={adjustmentList.data_list}
          columns={this.columns}
          options={options}
          serverSide={true}
          pagination={pagination}
          count={adjustmentList.count}
          loading={loading}
        />
      </Box>
    );
  }
}

export default withRouter(MyAdjustmentsList);

