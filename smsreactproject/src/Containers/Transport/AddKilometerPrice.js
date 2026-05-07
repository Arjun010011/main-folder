import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { Link, withRouter } from 'react-router-dom';

import { Grid, Paper, Box, Button, TextField } from '@material-ui/core';
import './styles.scss';
import { Actions } from 'Constants/permissions';
import classNames from 'classnames';
import { isUserHasPermission, getUrlParam, isObjectValuesEmpty, Alert } from 'Includes/functions';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import AddCircleIcon from '@material-ui/icons/AddCircle';
import CancelIcon from '@material-ui/icons/Cancel';
import Snackbar from '@material-ui/core/Snackbar';
import loadingBar from 'images/loading.gif';
import _ from 'lodash';

import { POST_URL, GET_URL } from 'Includes/urls';
import { postRequest, getRequest } from 'Includes/api/apicall';
import AddKilometerPricePerArea from 'Containers/Transport/AddKilometerPricePerArea';
import { getSettingValue } from 'Includes/functions'

const isPriceOnArea = parseInt(getSettingValue("price_on_area")) === 1 ? true : false

const header = 'Add Kilometer and Price'
const subheader = '  Here You can add kilometer price for the distance'

class AddKilometerPrice extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            fieldDetails: [
                { 'km': '', 'rate': '' }
            ],
            year: '',
            yearName: '',
            errorDetails: {},
            loading: true,
            snackbar: false,
            alertData: '',
        }
        this.viewUrl = Actions.transport_price.view.url
    }

    componentDidMount() {
        let { year, yearName, plan_id, planName } = getUrlParam()
        if ( !year ) {
            this.props.history.push(Actions.transport_price.view.url)
        } else {
            this.setState({
                year: year,
                yearName: yearName,
                loading: false,
                plan_id: plan_id,
                planName: planName,
            }, () => {
                if (isPriceOnArea === false){
                    this.getRouteData();
                }
            })
        }
    }


    async getRouteData() {
        let { fieldDetails, plan_id } = this.state;
        let params = { is_active: 1, academic_year: this.state.year, price_plan: plan_id };
        getRequest(GET_URL.routePrice.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                fieldDetails = [...response.data.data.data_list, ...fieldDetails];
                this.setState({
                    fieldDetails,
                    loading: false
                })
            }
        })
    }

    handleChange = (e, field, index) => {
        let { fieldDetails, errorDetails } = this.state;
        fieldDetails[index][e.target.name] = e.target.value;
        this.setState({
            fieldDetails,
        });
    }

    validateToKm = (type) => {
        let { fieldDetails, errorDetails } = this.state;
        errorDetails = {}
        let returnValue = true
        let maxAmount = 0;
        if (fieldDetails.length > 0) {
            fieldDetails.map((field, index) => {
                if (fieldDetails.length - 1 == index && field.km === '' && field.rate === '') {
                    return false;
                }
                if (field.km === '' || field.km < 0) {
                    errorDetails[index] = { 'tokm_error': 'To-Km should be greater than From-Km' };
                    returnValue=false
                }
                if (index == 0) {
                    maxAmount = field.rate;
                } else if (parseFloat(field.rate) <= parseFloat(maxAmount)) {
                    errorDetails[index] = { 'rate_error': `Price is lesser than or equal to ${maxAmount}` }
                    returnValue=false
                } else if ((field.rate === '' || field.rate <= 0) && ((type && type==='rate')||!type)) {
                    errorDetails[index] = { 'rate_error': 'Rate should be greater than 0' };
                    returnValue=false
                } else {
                    maxAmount = field.rate;
                }
                if (index > 0 && parseInt(fieldDetails[index - 1]['km']) >= parseInt(field.km)) {
                    errorDetails[index] = { 'tokm_error': 'To-Km should be greater than From-Km' }
                    returnValue=false
                }

            });
            this.setState({
                errorDetails
            })
            // if (Object.keys(errorDetails).length === 0) {
                // return true;
            // }
            return returnValue;
        } else {
            this.setState({
                snackbar: true,
                alertData: 'Fields cant be empty.'
            })
            return false;
        }
    }

    onBlurTextValidation = (name) => {
        this.validateToKm(name);
    }

    addNew = () => {
        let { fieldDetails, errorDetails } = this.state;
        errorDetails = {};
        fieldDetails.map((field, index) => {
            if (field.km === '') {
                errorDetails[index] = { 'tokm_error': 'Please fill the mandatory fields' };
            }
        });

        if (Object.keys(errorDetails).length === 0) {
            let defaultData = { 'km': '', 'rate': '' };
            fieldDetails.push(defaultData);
            this.setState({
                fieldDetails,
                errorDetails
            })
        }
        else {
            this.setState({
                errorDetails
            });
        }
    }

    removeField = (e, index) => {
        let { fieldDetails } = this.state;
        fieldDetails.splice(index, 1);
        this.setState({
            fieldDetails
        })
    }

    submit = () => {
        this.setState({
            submitDisable: true
        });
        let proceed = this.validateToKm();
        let { plan_id } = this.state;
        let fieldDetails = _.cloneDeep(this.state.fieldDetails)
        if( proceed && fieldDetails.length <= 0 ){
            proceed = false;
            this.setState({
                alertData: 'No Data To Submit',
                snackbar: true
            })
        }
        if (proceed) {
                fieldDetails.forEach((element, index) => {
                    if (isObjectValuesEmpty(element)) {
                        fieldDetails.splice(index, 1)
                    }
                    element['km'] = parseInt(element['km']);
                    element['rate'] = parseInt(element['rate']);
                });
                let postData = {
                    'price_plan': plan_id,
                    'rate': fieldDetails
                };
                const url = POST_URL.routePrice.api;
                postRequest(url, postData).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    }).then(
                        this.setState({
                            open: false,
                        }, () => {
                            let searchState = { plan_id: this.state.plan_id }
                            let searchParam = "?" + new URLSearchParams(searchState).toString()
                            this.props.history.push({
                                pathname: Actions.transport_price.view.url,
                                search: searchParam,
                            });
                        })
                    )
                }
                this.setState({submitDisable: false})
            });
        } else {
            this.setState({
                submitDisable: false
            });
        }
    }

    handleClose = () => {
        this.setState({
            snackbar: false
        })
    }

    ViewPage = () => {
        let searchState = { plan_id: this.state.plan_id, plan_name: this.state.planName }
        let searchParam = "?" + new URLSearchParams(searchState).toString()
        this.props.history.push({
            pathname: Actions.transport_price.view.url,
            search: searchParam,
        });
    }

    render() {
        const { submitDisable, fieldDetails, errorDetails, yearName, loading, snackbar, alertData, planName } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        } else {
            return (
                <Box>
                    {isPriceOnArea === false &&
                        <Paper className={classNames('paper-background')}>
                            <Box>
                                <Grid container >
                                    <Grid item md={6} xs={12} sm={12} className={classNames('header-align')}>
                                        <Box className='heading'>
                                            {header}
                                        </Box>
                                        <Box className='sub-heading'>
                                        </Box>
                                        <Box className='priceplan'>
                                            <Box className="year-std-box marign-right-30 ">
                                                <Box className="academic-std-head "> For Academic Year</Box>
                                                <Box className="aca-std-white-background">{yearName}</Box>
                                            </Box>
                                            <Box className="year-std-box marign-right-30 ">
                                                <Box className="academic-std-head "> Plan</Box>
                                                <Box className="aca-std-white-background">{planName}</Box>
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item md={6} xs={12} >
                                        <Box className={classNames('header-align', 'end-flex-prop')}>
                                            {isUserHasPermission('transport_price', 'view') && <Button
                                                variant="contained"
                                                onClick={() => this.ViewPage()}
                                                className='editbutton-view'
                                            ><VisibilityOutlinedIcon className='visibility-icon' /> 
                                            {Actions.transport_price.view.label}</Button>}
                                        </Box>
                                    </Grid>
                                    <Box className="margin-top-30">
                                        <Box className='add-vehicle-price-form'>
                                            {fieldDetails.map((field, index) => {
                                                return <Box display="flex" flexWrap="wrap">
                                                    <div className="" >
                                                        <TextField
                                                            id="to-km"
                                                            label="Upto Km"
                                                            name="km"
                                                            type="number"
                                                            value={field.km}
                                                            className="transport-text-field-km fixed-input-text-box"
                                                            onBlur={(e) => this.onBlurTextValidation('km')}
                                                            onInput={(e) => {
                                                                e.target.value = Math.max(0, parseInt(e.target.value)).toString().slice(0, 3)
                                                            }}
                                                            variant="outlined"
                                                            helperText={(Boolean(errorDetails[index]) && errorDetails[index]['tokm_error']) ? errorDetails[index]['tokm_error'] : ""}
                                                            error={(Boolean(errorDetails[index]) && errorDetails[index]['tokm_error']) ? true : false}
                                                            onChange={(e) => this.handleChange(e, field, index)}
                                                        />
                                                    </div>
                                                    <div className="" >
                                                        <TextField
                                                            id="price"
                                                            label="price"
                                                            name="rate"
                                                            type="number"
                                                            value={field.rate}
                                                            className="transport-text-field-km fixed-input-text-box"
                                                            onBlur={(e) => this.onBlurTextValidation('rate')}
                                                            onInput={(e) => {
                                                                e.target.value = Math.max(0, parseInt(e.target.value)).toString().slice(0, 5)
                                                            }}
                                                            variant="outlined"
                                                            inputProps={{ max: 99999, min: 0 }}
                                                            helperText={(Boolean(errorDetails[index]) && errorDetails[index]['rate_error']) ? errorDetails[index]['rate_error'] : ""}
                                                            error={(Boolean(errorDetails[index]) && errorDetails[index]['rate_error']) ? true : false}
                                                            onChange={(e) => this.handleChange(e, field, index)}
                                                        />
                                                    </div>
                                                    {(((fieldDetails.length - 1) != index)) &&
                                                        <Box onClick={(e) => this.removeField(e, index)}>
                                                            <CancelIcon className="pointer" style={{ color: "red" }} />
                                                        </Box>
                                                    }
                                                    {(fieldDetails.length - 1 === index) &&
                                                        <Box w="100" className="add-new-km-button">
                                                            <AddCircleIcon color="primary" onClick={this.addNew} className="pointer" />
                                                        </Box>
                                                    }
                                                </Box>
                                            })
                                            }


                                            <Box className='end-flex-prop  width-100'>
                                                <Box>
                                                    <Button variant="contained" color="primary"
                                                        className='submit'
                                                        disabled={this.state.submitDisable}
                                                        onClick={() => this.submit()}>
                                                        Submit &nbsp;{' '}
                                                    </Button>
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Grid>
                                <Snackbar
                                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                    open={snackbar}
                                    autoHideDuration={4000}
                                    onClose={this.handleClose}
                                >
                                    <Alert onClose={this.handleClose} severity="error">
                                        {alertData}
                                    </Alert>
                                </Snackbar>
                            </Box>
                        </Paper>
                    }
                    {isPriceOnArea === true &&
                        <AddKilometerPricePerArea
                            year={this.state.year}
                            yearName={this.state.yearName}
                            plan_id={this.state.plan_id}
                            planName={this.state.planName} />
                    }
                </Box>
            )
        }
    }
}


export default withRouter(AddKilometerPrice)
