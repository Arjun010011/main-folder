import React, { Component } from "react";
import { Paper, Box, Grid, Button } from "@material-ui/core";
import Swal from "sweetalert2";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import { Link } from "react-router-dom";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";

import MultipleAddTextFields from "Components/MultipleAddTextFields";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import {
    nameWithQuoteRegex,
    nameAndNumberAndHyphenRegex,
    nameRegex,
} from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, getSettingValue } from "Includes/functions";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";
import ManageCourseOutcomeView from "./ManageCourseOutcomeView";

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const number_of_language = parseInt(getSettingValue("number_of_language"));

const programspecificoutcome_global = [
    {
        label: "Name",
        regex: nameWithQuoteRegex,
        autoFocus: false,
        name: "name",
        md: 8,
        className: "width-form-95",
        required: true,
        id: "outlined-textarea",
        default: "",
        rows: null,
        type: "text",
        maxLength: 250,
        gridClassName: "margin-vertical-20",
    },
    {
        label: "Code",
        regex: nameAndNumberAndHyphenRegex,
        autoFocus: false,
        name: "code",
        md: 4,
        className: "width-form-95",
        required: false,
        id: "outlined-textarea",
        default: "",
        rows: null,
        type: "text",
        maxLength: 30,
        gridClassName: "margin-vertical-20",
    }
];

class ManageProgramSpecificOutcome extends Component {
    constructor() {
        super();
        this.state = {
            subjects: [],
            loading: true,
            open: false,
            alertData: "",
            selectedCountry: "",
            subjectDetails: [],
            selected_branch: [],
            fieldError: {},
            programspecificoutcomeDetails:[]
        };
    }

    componentDidMount = () => {
        this.getProgramSpecificOutcomeList();
    };

    getProgramSpecificOutcomeList = () => {
        let { programspecificoutcomeDetails } = this.state;
        programspecificoutcomeDetails = programspecificoutcome_global;
        this.setState({
            programspecificoutcomeDetails,
            loading: false,
        });
    };

    updateProgramSpecificValueValue = (stateValue) => {
        let { programspecificoutcome } = this.state;
        programspecificoutcome = stateValue;
        this.setState({
            programspecificoutcome,
        });
    };

    validate = () => {
        let stateTest = true;
        let { programspecificoutcome } = this.state;
        stateTest = this.refs.state.validateFields();
        console.log(programspecificoutcome)

        let post_data = programspecificoutcome;
        this.setState({ submitDisable: true });
        let url = POST_URL.programspecificoutcome.api;
        postRequest(url, post_data, this.props).then((response) => {
            if (response && response.status === 200) {
                Swal.fire({
                    position: "top-end",
                    type: "success",
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500,
                });
                this.props.history.push(Actions.programspecificoutcomedata.view.url);
            }
            this.setState({ submitDisable: false });
        });
    };

    handleClose = () => {
        this.setState({
            open: false,
        });
    };

    handleStateViewButton = () => {
        this.props.history.push(Actions.programspecificoutcomedata.view.url);
    };


    render() {
        const {
            loading,
            open,
            programspecificoutcomeDetails,
            submitDisable,
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
                    <Paper className={classNames("paper-background")}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames("header-align")}>
                                <Box className="heading">
                                   Add Course Outcome
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12}>
                                <Box className={classNames("header-align", "end-flex-prop")}>
                                    {isUserHasPermission("programspecificoutcome", "view") && (
                                        <Button
                                            variant="contained"
                                            onClick={this.handleStateViewButton}
                                            className="editbutton-view"
                                        >
                                            <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                                            {Actions.programspecificoutcomedata.view.label}
                                        </Button>
                                    )}
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container className={classNames("header-align")}>
                            <Grid item md={10} xs={12}>
                                <MultipleAddTextFields
                                    fieldDefaultValue={[]}
                                    fieldDetails={programspecificoutcomeDetails}
                                    updateParent={this.updateProgramSpecificValueValue}
                                    isEmptyNotAllowed={true}
                                    ref={"state"}
                                    NotAlignCenter={true}
                                    idFormat={"subjects_2022_08_11_2_pm_"}
                                />
                                <Box className="submt-button-float-bottom" mt={3}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        className="submit"
                                        disabled={submitDisable}
                                        onClick={this.validate}
                                    >
                                       Submit
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
                            clear all error
                            </Alert>
                        </Snackbar>
                    </Paper>
                </Box>
            );
        }
    }}

export default withRouter(ManageProgramSpecificOutcome);