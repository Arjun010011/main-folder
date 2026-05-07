
import React, { Component } from 'react';
import { Paper, Box, Button, Grid, TextField } from '@material-ui/core';
import Swal from 'sweetalert2';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link, withRouter } from 'react-router-dom';
import classNames from 'classnames';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import Snackbar from '@material-ui/core/Snackbar';
import { FormattedMessage } from 'react-intl';

import loadingBar from 'images/loading.gif'
import { Dropdown } from 'Components/DropDown'
import { GET_URL, POST_URL } from 'Includes/urls';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { checkLocalAcademicYear, checkLocalStandard, 
    isUserHasPermission, Alert, NumberFormatCustom
} 
from 'Includes/functions';
import { amountRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { AMOUNT_MAX_VALUE } from 'Constants';
import { validateAmount } from 'Includes/validations';
import './styles.scss';
import commonMessages from 'Constants/messages'

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class AddApplicationFee extends Component {
    constructor(props) {
        super(props);
        this.state = {
            yearList: [],
            standardList: [],
            year: 0,
            yearName: '',
            standard: 0,
            fieldError: {},
            fieldValues: {},
            onlinePaymentAmountValues: {},
            textFieldShow: {},
            selectAllAmt: '',
            selectAllError: '',
            applicationplan: [],
            loading: true,
            submittingData: false,
            snackbar: false,
            alertData: '',
        };
    }

    componentDidMount() {
        if (this.props.location.state && this.props.location.state.year) {
            this.setState({ year: this.props.location.state.year, yearName: this.props.location.state.yearName }, () => {
                this.getStandardsList(this.state.year);
            })
        }
        else {
            this.props.history.push({ pathname: Actions.application_fees.view.url });
        }
    }

    getYearsList = () => {
        const params = {};
        getRequest(GET_URL.getacademicyear.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const yearList = response.data.data;
                const year = checkLocalAcademicYear(yearList);
                this.setState({ yearList, year }, () => {
                    if (year !== 0) {
                        this.getStandardsList(year);
                    }
                });
            }
            else {
                this.setState({ loading: false })
            }
        });
    }

    getStandardsList = (year) => {
        const params = { academic_year: year, is_active: true };
        getRequest(GET_URL.getstandard.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const standardList = response.data.data;
                const standard = checkLocalStandard(standardList);
                this.setState({ standardList, standard }, () => this.getApplicationFeesPlan());
            }
            else {
                this.setState({ loading: false })
            }
        });
    }

    getApplicationFeesPlan = () => {
        const params = { academic_year: this.state.year };
        getRequest(GET_URL.applicationFeesPlan.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                const applicationplan = response.data.data;
                let standardList = { ...this.state.standardList }
                let fieldValuesDup = {};
                let fieldValues = {};
                let onlinePaymentAmountValues = {};

                let textFieldShow = { ...this.state.textFieldShow }
                for (let stdapplication of applicationplan) {
                    if (stdapplication.is_active) {
                        fieldValuesDup[stdapplication.standard] = stdapplication.amount;
                        textFieldShow[stdapplication.standard] = false;
                    }
                }
                for (let std in standardList) {
                    if (!Object.keys(fieldValuesDup).includes(standardList[std].id.toString())) {
                        fieldValues[standardList[std].id] = '';
                        onlinePaymentAmountValues[standardList[std].id] = '';
                        textFieldShow[standardList[std].id] = true;
                    }
                }
                this.setState({ fieldValues, onlinePaymentAmountValues, applicationplan, textFieldShow, loading: false, submittingData: false });
            }
            else {
                this.setState({ loading: false, submittingData: false })
            }
        })
    }

    onChange = (e) => {
        let name = e.target.name;
        let value = e.target.value;

        this.setState({ [name]: value }, async () => {
            if (name === 'year') {
                this.getStandardsList(value);
            }
        });
    }

    onChangeSelectAllAmount = (e) => {
        let { value } = e.target;
        let { selectAllAmt } = this.state;
        this.setState({ selectAllAmt: value });
    }

    onChangeAmount = (e, id) => {
        let { value } = e.target;
        let fieldValues = { ...this.state.fieldValues };
        fieldValues[id] = value;
        this.setState({ fieldValues });
    }

    onChangeOnlinePaymentAmount = (e, id) => {
        let { value } = e.target;
        let onlinePaymentAmountValues = { ...this.state.onlinePaymentAmountValues };
        onlinePaymentAmountValues[id] = value;
        this.setState({ onlinePaymentAmountValues });
    }

    onSelectAllClick = () => {
        let { selectAllAmt, fieldValues } = this.state;
        for (let field in fieldValues) {
            fieldValues[field] = selectAllAmt;
        }
        this.setState({ selectAll: !this.state.selectAll })
    }

    validatePostData = () => {
        const { fieldValues } = this.state;
        for (let field in fieldValues) {
            if (fieldValues[field].trim() !== '' && fieldValues[field] < 0) {
                this.setState({ alertData: `application fees should be greater than or equal to 0`, snackbar: true, severity: "error" });
                return false;
            }
        }
        return true;
    }

    getParameters = () => {
        const { fieldValues, onlinePaymentAmountValues, applicationplan } = this.state;
        let params = [];
        let idStdMap = {};
        for (let plan of applicationplan) {
            idStdMap[plan.standard] = plan.id;
        }
        for (let field in fieldValues) {
            if (idStdMap[field] || fieldValues[field].trim() === '') {
                continue;
            }
            let data = {
                standard: field,
                amount: fieldValues[field],
                online_amount: Number(onlinePaymentAmountValues[field]) || 0
            };
            params.push(data);
        }
        return params;
    }

    saveData = () => {
        const url = POST_URL.applicationplan.api;
        const { year, fieldValues, submittingData } = this.state;
        const data = this.getParameters();
        const params = {
            academic_year: year,
            plan: data,
        };
        if( data.length === 0 ){
            this.setState({ alertData: `No change to update`, snackbar: true, severity: "error" });
            return false;
        }
        if (this.validatePostData(fieldValues) && !submittingData && data.length > 0) {
            this.setState({ submittingData: true });
            postRequest(url, params, this.props).then((response) => {
                if (response && response.status === 200) {
                    this.getApplicationFeesPlan();
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    }).then(
                        this.props.history.push(Actions.application_fees.view.url)
                    );
                }
                else {
                    this.setState({ submittingData: false });
                }
            });
        }
    }

    handleClose = () => {
        this.setState({
            snackbar: false
        })
    }
    render() {
        const { year, yearList, yearName, standardList, fieldError, fieldValues, onlinePaymentAmountValues, selectAllAmt, selectAllError, snackbar, alertData } = this.state;
        let nonConfiguredStandardList = []
        for( const standard of standardList ){
            if (fieldValues.hasOwnProperty(standard.id)) {
                nonConfiguredStandardList.push(standard)
            }
        }
        if (this.state.loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Paper>
                    <Box className="paper-background" >
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Application Fee
                                </Box>
                                <Box className="year-std-box mr-40">
                                    <Box className="academic-std-head "> { <FormattedMessage {...commonMessages.academicYear} /> }</Box>
                                    <Box className=" aca-std-white-background">{yearName}</Box>
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('application_fees', 'view') && <Button
                                        variant='contained'
                                        component={Link} to={Actions.application_fees.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.application_fees.view.label}</Button>}
                                </Box>
                            </Grid>

                            {nonConfiguredStandardList.length !== 0 && Object.keys(fieldValues).length > 0 &&
                                    <Paper className='margin-top-10'>
                                        <Grid container className={nonConfiguredStandardList.length > 0 ? "create-fee-term-body add-addmission-body" : "display-none"}>
                                            {Object.keys(fieldValues).length > 0 && nonConfiguredStandardList.length > 1 && <Grid item md={12} xs={12} sm={12} className="add-admission-block add-admission-all-block">
                                                <>
                                                    <TextField
                                                        id="outlined-name1"
                                                        InputProps={{
                                                            inputComponent: NumberFormatCustom,
                                                        }}
                                                        inputProps={{ maxLength: '15', style: { textAlign: 'right' } }}
                                                        label={<FormattedMessage {...commonMessages.enterAmount} />}
                                                        fullWidth
                                                        value={selectAllAmt ? selectAllAmt : ''}
                                                        onChange={(e) => this.onChangeSelectAllAmount(e)}
                                                        onBlur={(e) => this.onChangeSelectAllAmount(e)}
                                                        margin="normal"
                                                        variant="outlined"
                                                        autoComplete="off"
                                                        helperText={selectAllError !== "" && selectAllError}
                                                        error={selectAllError === "" || !selectAllError ? false : true}
                                                        className={"fee-type-inp"}
                                                    />
                                                    <Button className={`apply-all-button apply-all-app-fees`}
                                                    disabled={selectAllAmt ? false : true}
                                                    onClick={this.onSelectAllClick}>Apply All</Button>
                                                </>
                                            </Grid>}
                                            {
                                                nonConfiguredStandardList.map((standard, index) => {
                                                    if (fieldValues.hasOwnProperty(standard.id)) {
                                                        return <Grid key={index} item md={12} xs={12} sm={12} className="add-admission-block add-admission-text-block">
                                                            <Box className='add-admission-name-field'>{standard.name}</Box>
                                                            <Box className='margin-right-20' style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
                                                                <TextField
                                                                    id="outlined-name"
                                                                    label="Amount"
                                                                    InputProps={{
                                                                        inputComponent: NumberFormatCustom,
                                                                    }}
                                                                    inputProps={{ maxLength: '15', style: { textAlign: 'right' } }}
                                                                    fullWidth
                                                                    style={{ minWidth: 140, flex: 1 }}
                                                                    value={fieldValues[standard.id] ? fieldValues[standard.id] : ''}
                                                                    onChange={(e) => this.onChangeAmount(e, standard.id)}
                                                                    margin="normal"
                                                                    variant="outlined"
                                                                    autoComplete="off"
                                                                    helperText={fieldError[standard.id] !== "" && fieldError[standard.id]}
                                                                    error={fieldError[standard.id] === "" || !fieldError[standard.id] ? false : true}
                                                                    className={"fee-type-inp std-fee-type-inp"}
                                                                />
                                                                <TextField
                                                                    id="outlined-online-amount"
                                                                    label="Online Payment Amount"
                                                                    InputProps={{
                                                                        inputComponent: NumberFormatCustom,
                                                                    }}
                                                                    inputProps={{ maxLength: '15', style: { textAlign: 'right' } }}
                                                                    fullWidth
                                                                    style={{ minWidth: 140, flex: 1 }}
                                                                    value={onlinePaymentAmountValues[standard.id] != null ? onlinePaymentAmountValues[standard.id] : ''}
                                                                    onChange={(e) => this.onChangeOnlinePaymentAmount(e, standard.id)}
                                                                    margin="normal"
                                                                    variant="outlined"
                                                                    autoComplete="off"
                                                                    className={"fee-type-inp std-fee-type-inp"}
                                                                />
                                                            </Box>
                                                        </Grid>
                                                    }
                                                })
                                            }

                                        </Grid>
                                    </Paper>}
                            {
                                Object.keys(fieldValues).length === 0 && nonConfiguredStandardList.length !== 0 && <Box mt={2} className="width-100-perc">
                                    <BlankPagewithIcon data="Fees already filled" errorOutline={true} />
                                </Box>
                            }
                            {
                                nonConfiguredStandardList.length === 0 && <Grid item md={12} xs={12} className="margin-top-20"> <BlankPagewithIcon 
                                    data={`No ${alias_names['standard']} exist(s) to the add Application Fee in the Academic Year`}
                                    errorOutline={true} /></Grid>
                            }
                            <Box className="submt-button-float-bottom" mt={3}>
                                {(Object.keys(fieldValues).length > 0 || nonConfiguredStandardList.length === 0) &&
                                    <Button variant='contained'
                                        color='primary' className='submit'
                                        disabled={false}//{submitDisable}
                                        onClick={this.saveData}>submit
                                    </Button>
                                }
                            </Box>
                        </Grid>
                    </Box>

                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={snackbar} autoHideDuration={10000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Paper>
            )
        }
    }
}

export default withRouter(AddApplicationFee);
