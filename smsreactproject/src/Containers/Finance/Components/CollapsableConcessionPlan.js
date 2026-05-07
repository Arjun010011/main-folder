import React, { Component } from "react";
import {
  Box,
  Button,
  Grid,
  ExpansionPanel,
  ExpansionPanelDetails,
  ExpansionPanelSummary,
} from "@material-ui/core";
import Icon from "@material-ui/core/Icon";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import CheckCircleOutlinedIcon from "@material-ui/icons/CheckCircleOutlined";
import classNames from "classnames";

import { GET_URL } from "Includes/urls";
import { getRequest } from "Includes/api/apicall";
import {
  getPaginationProps,
  getPercent,
  getPercentValue,
} from "Includes/functions";
import FeeConcessionTable from "./FeeConcessionTable";
import {
  APPROVAL_STATUS,
  DEFAULT_PAGINATION_PROPS,
  TRANSPORT_CODE,
} from "Constants";
import "./../styles.scss";
import { FormattedMessage } from 'react-intl';
import messages from '../messages';

class CollapsableConcessionPlan extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data,
      year: props.year,
      snackbar: false,
      alertData: "",
      tableLoading: false,
      standard: false,
      assignedConcessions: null,
      pagination: { ...DEFAULT_PAGINATION_PROPS },
      expanded: null,
    };
  }
  setExpanded = (standard, concession_type) => {
    if (this.state.expanded === concession_type) {
      this.setState({ standard: null, expanded: null });
    } else {
      this.setState(
        { standard, expanded: concession_type, assignedConcessions: null },
        () => this.getAssignedConcessionTypes()
      );
    }
  };

  approve = (concession_type) => {
    this.props.approveAction(concession_type);
  };

  getAssignedConcessionTypes = (paginationProps) => {
    this.setState({ tableLoading: true });
    let { pagination, standard, year, expanded } = this.state;
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);

    let params = {
      ...pagination_params,
      is_active: 1,
      academic_year: year,
      standard: standard,
      concession_type: expanded,
    };
    getRequest(GET_URL.concession.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const assignedConcessions = response.data.data;
        for (let concession of assignedConcessions.concession_list) {
          let fee_amount = concession.standard_fee_total_amount;
          concession.conc_type = <FormattedMessage {...messages.concessionOnTotalAmount} />;
          concession.fee_amount = `₹ ${concession.standard_fee_total_amount}`;
          if (concession.type === "feetype") {
            concession.fee_amount =
              concession.standard_fee_codename === TRANSPORT_CODE
                ? `${concession.standard_fee_amount} %`
                : `₹ ${concession.standard_fee_amount}`;
            fee_amount = concession.standard_fee_amount;
            concession.conc_type = <FormattedMessage {...messages.concessionOnfeeType} />;
          } else {
            concession.standard_fee_name = "-";
          }
          if (concession.is_amount) {
            concession.concession_in_perc = `${getPercent(
              fee_amount,
              concession.rate
            ).toFixed(2)} %`;
            concession.concession_amount = `₹ ${concession.rate.toFixed(0)}`;
          } else {
            if (concession.standard_fee_codename === TRANSPORT_CODE) {
              concession.concession_amount = "-";
            } else {
              concession.concession_amount = `₹ ${getPercentValue(
                concession.rate,
                fee_amount
              ).toFixed(0)} `;
            }
            concession.concession_in_perc = `${concession.rate.toFixed(2)}%`;
          }
          concession.is_percentage = !concession.is_amount;
        }
        this.setState({
          assignedConcessions,
          loading: false,
          tableLoading: false,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      }
    });
  };

  getHideColumn = (type, isApproved) => {
    let hideColumns = [
      "standard_fee_name",
      "conc_type",
      "concession_type_name",
    ];
    if (type === "feetype") {
      hideColumns = ["conc_type", "concession_type_name"];
    }
    if (isApproved) {
      hideColumns.push('Actions');
    }
    return hideColumns;
  }

  render() {
    const {
      expanded,
      data,
      year,
      pagination,
      tableLoading,
      assignedConcessions,
      standard,
    } = this.state;
    const { getAssignedConcessionTypes } = this;
    return (
      <>
        {data.map((standard_concession, index) => {
          const is_approved =
            standard_concession.approval_status ===
            APPROVAL_STATUS.approved;
          return (
            <ExpansionPanel
              key={index + "a"}
              expanded={
                expanded === standard_concession.concession_type &&
                standard === standard_concession.standard
              }
              onChange={(e) =>
                this.setExpanded(
                  standard_concession.standard,
                  standard_concession.concession_type
                )
              }
              className="feeplan-row-outer-box"
            >
              <ExpansionPanelSummary
                expandIcon={<ExpandMoreIcon />}
                className={index % 2 === 0 ? "even-row" : "odd-row"}
              >
                <Box
                  className="md-down-justify-center even-flex-prop"
                  width="100%"
                >
                  <Icon
                    className={classNames(
                      expanded === `panel${index}`
                        ? "fa fa-play-circle play-Icon play-fee-icon fa-rotate-90"
                        : "fa fa-play-circle play-Icon play-fee-icon"
                    )}
                  />
                  <Box className={"std-heading"}>
                    {standard_concession.standard_name}
                  </Box>
                  {is_approved && (
                    <Box className="border-right-line approve-border-line"></Box>
                  )}
                  {is_approved && (
                    <Box mr={2} pl={1} component="span">
                      <Button
                        className="approved-button"
                        variant="outlined"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Approved
                        <CheckCircleOutlinedIcon />
                      </Button>
                    </Box>
                  )}
                  <Box className={"secondary-heading"}>
                    <Box component="span" className="finance-total-amt">
                      {standard_concession.concession_type_name}
                    </Box>
                    {/* isUserHasPermission("approve_concession_plan", "create") &&  */}
                  </Box>
                </Box>
              </ExpansionPanelSummary>
              <ExpansionPanelDetails>
                <Grid container mt={4}>
                  <Grid item md={6} className="padding-0">
                    <Box className="font-weight-bold page-sub-head">
                      {standard_concession.type === "feetype"
                        ? "Concession on Fee Type"
                        : "Concession on Total Amount"}
                    </Box>
                  </Grid>
                  <Grid item md={6} className="padding-0">
                    {!is_approved && assignedConcessions && assignedConcessions.concession_list.length > 0 && (
                      <Box mr={2} className="float-right">
                        <Button
                          className="approve-button-finance"
                          variant="contained"
                          color="primary"
                          onClick={(e) => this.approve(standard_concession.id)}
                        >
                          Approve
                        </Button>
                      </Box>
                    )}
                  </Grid>
                  <Grid item md={12} className="padding-0">
                    <FeeConcessionTable
                      year={year}
                      standard={standard_concession}
                      data={assignedConcessions}
                      pagination={pagination}
                      getAssignedConcessionTypes={getAssignedConcessionTypes}
                      loading={tableLoading}
                      applyFilter={false}
                      applySearch={false}
                      hideColumns={
                        this.getHideColumn(standard_concession.type, is_approved)
                      }
                    />
                  </Grid>
                </Grid>
              </ExpansionPanelDetails>
            </ExpansionPanel>
          );
        })}
      </>
    );
  }
}

export default CollapsableConcessionPlan;
