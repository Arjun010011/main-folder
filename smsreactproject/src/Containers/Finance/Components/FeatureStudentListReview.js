import React, { Component } from "react";
import Divider from "@material-ui/core/Divider";
import { makeStyles } from "@material-ui/core/styles";
import {
  Grid,
  Dialog,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Slide,
  TableContainer,
  Table,
  TableHead,
  TableCell,
  TableRow,
  TableBody,
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import { CUSTOM_CODE, STORE_CODE } from "Constants";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="left" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
  appBar: {
    position: "relative",
    backgroundColor: "#4680FF",
  },
  title: {
    flex: 1,
  },
}));

export default function FullScreenDialog(props) {
  const classes = useStyles();
  const handleClose = () => {
    props.handleClosePopup("close");
  };

  const {
    action,
    handleSubmit,
    enabledStoreFeatures,
    studentList,
    features,
    enabledFeatures,
  } = props;
  return (
    <Dialog fullScreen open={true} TransitionComponent={Transition}>
      <AppBar className={classes.appBar}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => handleClose("close")}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            Enable/Disable Non Mandatory Fee
          </Typography>
        </Toolbar>
      </AppBar>
      <div>
        <TableContainer className="mark-enter-bg header-align m-b-60px">
          <Table
            size="small"
            aria-label="simple table"
            className="exam-mark-row-table"
          >
            <TableHead>
              <TableRow className="">
                <TableCell className="selectable-table-head text-align-center">
                  Student
                </TableCell>
                {features.map((data) => {
                  let termArray =
                    data.codename === STORE_CODE
                      ? data[
                          "fee_standard_mapping_item_selling_price_fee_standard_mapping"
                        ]
                      : data.standard_fee;
                  return (
                    <>
                      {data.is_checked && (
                        <TableCell
                          className="selectable-table-head text-align-center"
                          colSpan={
                            data.codename === STORE_CODE
                              ? termArray.length * 2
                              : termArray.filter((item) => item.is_checked)
                                  .length * 2
                          }
                        >
                          {data.fee_type_name}
                        </TableCell>
                      )}
                    </>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableHead>
              <TableRow className="">
                <TableCell className="selectable-table-head text-align-center"></TableCell>
                {features.map((data) => {
                  let termArray =
                    data.codename === STORE_CODE
                      ? data[
                          "fee_standard_mapping_item_selling_price_fee_standard_mapping"
                        ]
                      : data.standard_fee;
                  return (
                    data.is_checked &&
                    termArray.map((termData) => {
                      return (
                        <>
                          {(data.codename === STORE_CODE ||
                            termData.is_checked) && (
                            <TableCell
                              className="selectable-table-head text-align-center"
                              colSpan={2}
                            >
                              {data.codename === STORE_CODE ? (
                                <div>
                                  <div>{termData.item_name}</div>
                                  <div>{termData.category_name}</div>
                                </div>
                              ) : (
                                termData?.term_alias ?? termData.terms
                              )}
                            </TableCell>
                          )}
                        </>
                      );
                    })
                  );
                })}
              </TableRow>
            </TableHead>
            <TableHead>
              <TableRow className="">
                <TableCell className="selectable-table-head text-align-center"></TableCell>
                {features.map((data) => {
                  let termArray =
                    data.codename === STORE_CODE
                      ? data[
                          "fee_standard_mapping_item_selling_price_fee_standard_mapping"
                        ]
                      : data.standard_fee;
                  return (
                    data.is_checked &&
                    termArray.map((termData) => {
                      return (
                        <>
                          {(data.codename === STORE_CODE ||
                            termData.is_checked) && (
                            <>
                              <TableCell className="selectable-table-head text-align-center">
                                OLD
                              </TableCell>
                              <TableCell className="selectable-table-head text-align-center">
                                NEW
                              </TableCell>
                            </>
                          )}
                        </>
                      );
                    })
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody className="selectable-row-table-body">
              {studentList.map((student, index) => {
                return (
                  <TableRow className="selectable-row-table-row" key={index}>
                    <TableCell
                      className="mark-add-table-cell"
                      component="th"
                      scope="row"
                    >
                      {student.name}
                    </TableCell>
                    {features.map((data) => {
                      let termArray =
                        data.codename === STORE_CODE
                          ? data[
                              "fee_standard_mapping_item_selling_price_fee_standard_mapping"
                            ]
                          : data.standard_fee;
                      return (
                        data.is_checked &&
                        termArray.map((termData) => {
                          return (
                            <>
                              {(data.codename === STORE_CODE ||
                                termData.is_checked) && (
                                <>
                                  <TableCell className="text-align-center">
                                    {data.codename === STORE_CODE
                                      ? enabledStoreFeatures?.[
                                          data["standard_fee"][0]["id"]
                                        ]?.[termData["id"]] === true &&
                                        action === "enable"
                                        ? "Yes"
                                        : "No"
                                      : termData.student_feature.hasOwnProperty(
                                          student.id
                                        ) &&
                                        enabledFeatures.hasOwnProperty(
                                          termData["id"]
                                        ) &&
                                        enabledFeatures[termData["id"]]
                                      ? data.codename === CUSTOM_CODE
                                        ? termData.student_feature[student.id][
                                            "amount"
                                          ]
                                        : termData.rate
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-align-center text-green">
                                    {data.codename === STORE_CODE
                                      ? enabledStoreFeatures?.[
                                          data["standard_fee"][0]["id"]
                                        ]?.[termData["id"]] === true &&
                                        action === "enable"
                                        ? "Yes"
                                        : "No"
                                      : action === "enable" &&
                                        enabledFeatures.hasOwnProperty(
                                          termData["id"]
                                        ) &&
                                        enabledFeatures[termData["id"]]
                                      ? termData.rate
                                      : "-"}
                                  </TableCell>
                                </>
                              )}
                            </>
                          );
                        })
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
      <div className="submt-button-float-bottom" mt={3}>
        <Button
          autoFocus
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          className="submit"
        >
          Submit
        </Button>
      </div>
    </Dialog>
  );
}
