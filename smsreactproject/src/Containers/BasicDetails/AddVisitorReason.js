import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

import MultipleAddTextFields from 'Components/MultipleAddTextFields';
import loadingBar from 'images/loading.gif'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls'
import { nameAndNumberRegex, nameRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getUrlParam } from 'Includes/functions';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages'

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const subjectDetails_global = [
    {
        label: 'Reason Name', regex: nameAndNumberRegex, autoFocus: false, name: 'name', md: 10, className: 'width-form-95', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 50, gridClassName: "margin-vertical-20",
    },
]
class AddVisitorReason extends Component {
    constructor() {
        super()
        this.state = {
            reasons: [],
            loading: true,
            open: false,
            alertData: '',
            selectedCountry: '',
            error: {},
            subjectDetails: []
        }
    }

    componentDidMount = () => {
        let { reasonType, reasonTypeName } = getUrlParam();
        let { subjectDetails } = this.state;
        subjectDetails = subjectDetails_global
        this.setState({
            reasonType,
            reasonTypeName,
            loading: false,
            subjectDetails
        })
    }


    updateReasonsValue = (stateValue) => {
        let { reasons } = this.state
        reasons = stateValue
        this.setState({
            reasons
        })
    }

    validate = () => {
        let stateTest = true;
        let { reasons ,reasonType} = this.state
        stateTest = this.refs.state.validateFields();
        if (stateTest) {
            reasons.map((data)=>{
                data['reason_type']=reasonType
            })
            let post_data = {
                'reason': reasons,
            }
            this.setState({ submitDisable: true })
            let url = POST_URL.reason.api;
            postRequest(url, post_data, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.handleVisitorReasonViewButton()
                    }
                    this.setState({ submitDisable: false })
                });
        }
    }


    handleClose = () => {
        this.setState({
            open: false
        })
    }

    handleVisitorReasonViewButton = () => {
        let { reasonType } = this.state
        let reasonTypeInformation = {
            reasonType: reasonType,
        }
        let searchParam = "?" + new URLSearchParams(reasonTypeInformation).toString()
        this.props.history.push({
            pathname: Actions.visitor_reasons.view.url,
            search: searchParam,
        });
    }

    render() {
        const { loading, open, subjectDetails, submitDisable, reasonTypeName} = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box>
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    {Actions.visitor_reasons.create.label}
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('visitor_reasons', 'view') && <Button
                                        variant="contained"
                                        onClick={this.handleVisitorReasonViewButton}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.visitor_reasons.view.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>

                        <Box className='md-down-justify-start md-up-justify-start mb-y-20'>
                        <Box className="year-std-box mr-40">
                            <Box className="academic-std-head"> Reason Type</Box>
                            <Box className=" exam-mark-add-heading-bg">{reasonTypeName}</Box>
                        </Box>
                    </Box>

                        <Grid container className={classNames('header-align')}>
                            <Grid item md={6} xs={12}>
                                <MultipleAddTextFields
                                    fieldDefaultValue={[]}
                                    fieldDetails={subjectDetails}
                                    updateParent={this.updateReasonsValue}
                                    isEmptyNotAllowed={true}
                                    ref={'state'}
                                    NotAlignCenter={true}
                                    idFormat={'visitor_2022_08_11_2_pm_'}
                                />
                                <Box className="submt-button-float-bottom" mt={3}>
                                    <Button variant='contained'
                                        color='primary' className='submit'
                                        disabled={submitDisable}
                                        onClick={this.validate}>
                                        <FormattedMessage {...commonMessages.submit} />
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                        <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                            <Alert onClose={this.handleClose} severity="error">
                                <FormattedMessage {...commonMessages.clearAllErrors} />
                            </Alert>
                        </Snackbar>
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(AddVisitorReason)




