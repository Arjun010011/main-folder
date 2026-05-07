import React from "react";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import {
  getUrlParam,
  numberWithCommas,
  getSettingValue,
  dateFormat,
  getPropertyValues,
} from "Includes/functions";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import { Box } from "@material-ui/core";
import { FormattedMessage } from "react-intl";
import messages from "../messages";
import commonMessages from "Constants/messages";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Toolbar from "@material-ui/core/Toolbar";
import Dialog from "@material-ui/core/Dialog";
import AppBar from "@material-ui/core/AppBar";
import { makeStyles } from "@material-ui/core/styles";
import Slide from "@material-ui/core/Slide";
import { Actions } from "Constants/permissions";
import { useHistory } from "react-router";
import "../styles.scss";
import { TRANSPORT_CODE } from "Constants";
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";

// import { DrawerForFilter } from 'Components/DrawerForFilter' // please create it
const isResidential = parseInt(getSettingValue("is_residential"));

const fee_config = JSON.parse(localStorage.getItem("fee_configurations"))
  ? JSON.parse(localStorage.getItem("fee_configurations"))
  : {};
const enableSequence = fee_config?.["hide_fee_term_sequence"]
  ? fee_config?.["hide_fee_term_sequence"] == 1
    ? false
    : true
  : true;
const is_fee_group_enabled = isFormDefinitionEnabled(
  "fee_configurations",
  "is_fee_group_enabled",
  1
);

const useStyles = makeStyles((theme) => ({
  appBar: {
    position: "relative",
    backgroundColor: "#4680FF",
  },
  title: {
    marginLeft: theme.spacing(2),
    flex: 1,
  },
}));

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function Row(props) {
  const { row, enableFine } = props;
  return (
    <>
      <TableRow>
        <TableCell className="noborder white-space pb-0 pt-0">
          <div className="display-flex margin-top-5 margin-left-5">
            {is_fee_group_enabled && (
              <div
                className="fee-term-view-heading"
                style={{ minWidth: "215px" }}
              >
                Fee Group: <b> {row["fee_group_name"]} </b>
              </div>
            )}
            <div
              className="fee-term-view-heading"
              style={{ minWidth: "215px" }}
            >
              <FormattedMessage {...messages.viewFeeTermFeeType} /> :{" "}
              <b> {row["fee_type_name"]} </b>
            </div>
            {row['student_group_name'] && (
              <div
                className="fee-term-view-heading"
                style={{ minWidth: "215px" }}
              >
                Student Group: <b> {row["student_group_name"]} </b>
              </div>
            )}
            <div className="fee-term-view-heading">
              Is Mandatory: <b> {row["is_mandatory"] == 1 ? "Yes" : "No"} </b>
            </div>
            <div className="fee-term-view-heading">
              {row.codename === TRANSPORT_CODE ? (
                <>
                  Number Of Months : <b> {row["amount"]} </b>
                </>
              ) : (
                <>
                  <FormattedMessage {...messages.viewFeeTermTotalAmount} /> :{" "}
                  <b> {numberWithCommas(row["amount"])} </b>
                </>
              )}
            </div>
            {row["codename"] !== "store" && (
              <div className="fee-term-view-heading">
                <FormattedMessage {...messages.viewFeeTermTotalTerms} /> :{" "}
                <b> {row["standard_fee"].length} </b>
              </div>
            )}
          </div>
        </TableCell>
      </TableRow>
      <TableRow>
        {row["codename"] === "store" ? (
          <TableCell className="noborder pt-0 pb-0 white-space">
            <Box margin={1}>
              <Table size="small" className="border">
                <TableHead>
                  <TableRow>
                    <TableCell> Item Name </TableCell>
                    <TableCell> Property Values </TableCell>
                    <TableCell> Quantity </TableCell>
                    <TableCell> Total Selling Price </TableCell>
                    <TableCell> Payment Start Date </TableCell>
                    <TableCell> Payment End Date </TableCell>
                    {enableSequence && <TableCell> Sequence </TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.fee_standard_mapping_item_selling_price_fee_standard_mapping.map(
                    (store, index2) => (
                      <TableRow key={index2}>
                        <TableCell>{store.item_name}</TableCell>
                        <TableCell>
                          {getPropertyValues(store?.property_values ?? [])}
                        </TableCell>
                        <TableCell>{store.quantity}</TableCell>
                        <TableCell>
                          <Box>{numberWithCommas(store.selling_price)}</Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                              {dateFormat(row.standard_fee[0]?.payment_start_date, "DD-MM-YYYY")}
                          </Box>
                        </TableCell>
                        <TableCell>
                            <Box>
                              {dateFormat(row.standard_fee[0]?.payment_end_date, "DD-MM-YYYY")}
                            </Box>
                        </TableCell>
                        {enableSequence && (
                          <TableCell>
                            <Box>
                              {(row["standard_fee"] &&
                                row["standard_fee"][0]?.sequence) ??
                                "-"}
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </Box>
          </TableCell>
        ) : (
          <TableCell className="noborder pt-0 pb-0 white-space" colSpan={6}>
            <Box margin={1}>
              <Table size="small" className="border">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      {" "}
                      <FormattedMessage
                        {...messages.viewFeeTermTermName}
                      />{" "}
                    </TableCell>
                    <TableCell>
                      {row.codename === TRANSPORT_CODE ? (
                        "Number Of Months"
                      ) : (
                        <FormattedMessage {...commonMessages.amount} />
                      )}
                    </TableCell>
                    <TableCell>
                      {" "}
                      <FormattedMessage
                        {...messages.viewFeeTermStartDate}
                      />{" "}
                    </TableCell>
                    <TableCell>
                      {" "}
                      <FormattedMessage {...messages.viewFeeTermEndDate} />{" "}
                    </TableCell>
                    <TableCell>
                      {" "}
                      <FormattedMessage
                        {...messages.viewFeeTermPaymentStartDate}
                      />{" "}
                    </TableCell>
                    <TableCell>
                      {" "}
                      <FormattedMessage
                        {...messages.viewFeeTermPaymentEndDate}
                      />
                    </TableCell>
                    {enableSequence && (
                      <TableCell>
                        {" "}
                        <FormattedMessage {...messages.sequence} />
                      </TableCell>
                    )}
                    {enableFine && (
                      <TableCell>
                        {" "}
                        <FormattedMessage
                          {...messages.fineFrequencyInDays}
                        />{" "}
                      </TableCell>
                    )}
                    {enableFine && (
                      <TableCell>
                        {" "}
                        <FormattedMessage
                          {...messages.fineAmountPerFreq}
                        />{" "}
                      </TableCell>
                    )}
                    {enableFine && (
                      <TableCell>
                        {" "}
                        <FormattedMessage {...messages.maxFineAmount} />
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.standard_fee.map((term, index2) => (
                    <TableRow key={index2}>
                      <TableCell>{term?.term_alias ?? term.terms}</TableCell>
                      <TableCell>
                        {row.codename === TRANSPORT_CODE ? (
                          <>{term.amount}</>
                        ) : (
                          numberWithCommas(term.amount)
                        )}
                      </TableCell>
                      <TableCell>
                        <Box>
                          {dateFormat(term.term_start_date, "DD-MM-YYYY")}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {dateFormat(term.term_end_date, "DD-MM-YYYY")}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {dateFormat(term.payment_start_date, "DD-MM-YYYY")}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {dateFormat(term.payment_end_date, "DD-MM-YYYY")}
                        </Box>
                      </TableCell>
                      {enableSequence && (
                        <TableCell>
                          <Box>{term?.sequence ?? "-"}</Box>
                        </TableCell>
                      )}
                      {enableFine && (
                        <TableCell>
                          <Box>{term.fee_fine_frequency_in_days}</Box>
                        </TableCell>
                      )}
                      {enableFine && (
                        <TableCell>
                          <Box>
                            {term.fee_fine_rate &&
                              numberWithCommas(term.fee_fine_rate)}
                          </Box>
                        </TableCell>
                      )}
                      {enableFine && (
                        <TableCell>
                          <Box>
                            {term.max_fee_fine_rate &&
                              numberWithCommas(term.max_fee_fine_rate)}
                          </Box>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </TableCell>
        )}
      </TableRow>
    </>
  );
}

export default function FeeTermViewIndividual(props) {
  const classes = useStyles();
  const history = useHistory();
  const [feeTermPlan, setFeeTermPlan] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(true);
  const [standard, setStandard] = React.useState("");
  const [standardName, setStandardName] = React.useState("");
  const [academicYearName, setAcademicYearName] = React.useState("");
  const [studentType, setStudentType] = React.useState("");
  const [enableFine, setEnableFine] = React.useState("");

  const getFeeTermPlan = () => {
    let { year, studentType, standardName, academicYearName, standard } =
      getUrlParam();
    if (!standard && !year) {
      handleClose();
    }
    setStandardName(standardName);
    setAcademicYearName(academicYearName);
    setStudentType(studentType);
    setStandard(standard);
    let params = {
      is_active: 1,
      academic_year: year,
      student_type: studentType,
      standard: standard,
    };
    getRequest(GET_URL.feeplan.api, params, props).then((response) => {
      if (response && response.status === 200) {
        let enableFine = false;
        response.data.data.plan.map((data) => {
          data.standard_fee.some((term) => {
            if (
              term.fee_fine_frequency_in_days ||
              term.fee_fine_rate ||
              term.max_fee_fine_rate
            ) {
              return (enableFine = true);
            }
          });
        });
        setEnableFine(() => enableFine);
        setFeeTermPlan(response.data.data.plan);
      }
      setLoading(false);
    });
  };

  const handleClose = () => {
    const searchParam = `?studentType=${studentType}`;
    setOpen(false);
    if (props.redirectOnClose) {
      history.push({ pathname: props.redirectOnClose, search: searchParam });
    } else {
      history.push({
        pathname: Actions.fee_term.view.url,
        search: searchParam,
      });
    }
  };

  React.useEffect(() => {
    getFeeTermPlan();
  }, []);

  return (
    <>
      <Dialog
        fullScreen
        open={open}
        TransitionComponent={Transition}
        onClose={() => handleClose("close")}
      >
        <AppBar className={classes.appBar} style={{ position: "sticky" }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="close"
              onClick={() => handleClose("close")}
            >
              <CloseIcon />
            </IconButton>
            <Box fontWeight="bold">
              <span className="margin-left-10 margin-right-10">
                <FormattedMessage {...messages.viewFeeTermHeading} />
              </span>
              <span className="margin-left-10 margin-right-10">
                {" "}
                {academicYearName}{" "}
              </span>
              <span className="margin-left-10 margin-right-10">
                {" "}
                {standardName}{" "}
              </span>
              {!!isResidential && (
                <span className="margin-left-10 margin-right-10">
                  {studentType === "D" ? "Day Scholar" : "Residential"}
                </span>
              )}
            </Box>
          </Toolbar>
        </AppBar>
        {loading ? (
          <LoadingGif />
        ) : (
          <div className="white-background-shadow margin-top-5 pb-30">
            <Table>
              <TableBody>
                {feeTermPlan.map((data) => {
                  return <Row row={data} enableFine={enableFine} />;
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Dialog>
    </>
  );
}
