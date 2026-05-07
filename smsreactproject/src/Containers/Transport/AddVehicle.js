import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { Grid, Paper, Box, Button, TextField, Typography, FormHelperText } from '@material-ui/core';
import { MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import moment from 'moment';
import ReactPhoneInput from 'react-phone-input-2';
import Swal from 'sweetalert2';
import _ from 'lodash';
import { Link } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { isUserHasPermission } from 'Includes/functions';

import { vehicleNumberRegex, numberZeroToHunRegex, nameAndNumberAndHyphenRegex } from 'Constants/regularExpression';
import { postRequest, getRequest, putRequest } from 'Includes/api/apicall';
import { isObjectValuesEmpty } from 'Includes/functions';
import { POST_URL, GET_URL, PUT_URL } from 'Includes/urls';
import DynamicForm from 'Components/DynamicForm';
import { Actions } from 'Constants/permissions';
import classNames from 'classnames';
import loadingBar from 'images/loading.gif'
import './styles.scss';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';

class AddVehicle extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fieldValues: null,
            payloadData: {},
            fieldErrors: {},
            isEditForm: true,
            disableSubmit: false,
            loading: true,
            fieldDetails: [
                { label: <FormattedMessage {...commonMessages.name} />, regex: nameAndNumberAndHyphenRegex, name: 'name', md: 6, className: 'md-up-width-85', required: false, id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 50 },
                { label: <FormattedMessage {...messages.vehicleCode} />, regex: null, name: 'vehicle_code', md: 6, className: 'md-up-width-85', required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 30 },
                { label: <FormattedMessage {...messages.vehicleNumber} />, regex: vehicleNumberRegex, name: 'vehicle_num', md: 6, className: 'md-up-width-85', required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 20 },
                { label: <FormattedMessage {...messages.capacity} />, regex: numberZeroToHunRegex, name: 'seat_capacity', md: 6, className: 'md-up-width-85', required: true, id: 'outlined-textarea', default: '', rows: null, type: 'number', maxNumber: 100, minNumber: 0 },
                { label: <FormattedMessage {...messages.model} />, regex: null, name: 'model', md: 6, className: 'md-up-width-85', required: false, id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 50 },
                { label: <FormattedMessage {...messages.brand} />, regex: null, name: 'manufacturer', md: 6, className: 'md-up-width-85', required: false, id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 50 },
                // {
                //     label: <FormattedMessage {...messages.department} />, regex: null, name: 'department', md: 6, className: 'md-up-width-85', required: false,
                //     id: 'outlined-textarea', default: '', rows: null, type: 'dropDown', maxLength: 25,
                //     list: []
                // },
                {
                    label: 'GPS Machine', regex: null, name: 'gps', md: 6, className: 'md-up-width-85', required: false,
                    id: 'outlined-textarea', default: '', rows: null, type: 'dropDown', maxLength: 25,
                    list: [], customName:'object_name',
                },
            ]
        };
    }

    componentDidMount() {
        const { match } = this.props;
        // this.setDepartmentList();
        this.fetchMachines()
        if (this.props.location.pathname === Actions.transport_vehicle.update.url) {
            if (this.props.location.state && this.props.location.state.detail) {
                this.getVehicleDetails(this.props.location.state.detail);
            }
            else {
                this.props.history.push(Actions.transport_vehicle.view.url);
            }
        }
        else {
            this.setDefaultValues();
            this.setState({
                isEditForm: false
            })
        }
    }

    fetchMachines = () => {
        let { fieldDetails } = this.state
        const params = { is_active: true, unmapped_data : true }
        getRequest(GET_URL.gpsmachine.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let machines = response.data.data;
                fieldDetails.forEach((field) => {
                    if (field.name == 'gps') {
                        field.list = machines
                    }
                })
                this.setState({ fieldValues: fieldDetails })
            }
        });
    }

    getVehicleDetails = (id) => {
        const params = { is_active: 1 };
        let { fieldDetails } = this.state
        let url = GET_URL.vehicle.api + id + '/'
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let vehicle = response.data.data;
                fieldDetails.forEach((field) => {
                    field.default = (vehicle[field.name]) ? vehicle[field.name] : ''
                    if(field.name==='gps' && vehicle.gps_details){
                        field.list.push(vehicle.gps_details)
                    }
                })
                this.setState({ fieldValues: fieldDetails, loading: false, id: id })
            }
        });
    }

    setDefaultValues = () => {
        this.setState({
            fieldValues: this.state.fieldDetails, loading: false
        })
    }

    setDepartmentList = () => {
        const params = { is_active: 1 }
        let url = GET_URL.department.api;
        let { fieldDetails } = this.state;
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let departments = response.data.data;
                fieldDetails.forEach((field) => {
                    if (field.name == 'department') {
                        field.list = departments
                    }
                })
                this.setState({ fieldValues: fieldDetails })
                return true
            }
        })
    }

    updateParent = (name, value) => {
        let { payloadData } = this.state
        if(name==='gps' && value===0){
            value=''
        }
        payloadData[name] = value
        this.setState({
            payloadData
        })
    }

    validate = (payload) => {
        let { fieldErrors } = this.state;
        let { fieldDetails } = this.state;
        fieldDetails.forEach(field => {
            let value = payload[field.name];
            if (field.required == true && (value === '' || value === null || value === 0)) {
                fieldErrors[field.name] = `${field.name} is mandatory`;
            }
            else if (field.regex && !field.regex.value.test(value) && value !== '') {
                fieldErrors[field.name] = field.regex.errorText;
            }
        });
        if (isObjectValuesEmpty(fieldErrors)) {
            return true
        } else {
            this.refs.vehicle.updateErrors(fieldErrors)
            this.setState({
                fieldErrors
            });
            return false
        }
    }


    enableSubmit = () => {
        this.setState({
            disableSubmit: false
        });
    }

    disableSubmit = () => {
        this.setState({
            disableSubmit: true
        });
    }

    getPayload = () => {
        let { payloadData } = this.state;
        let { fieldDetails } = this.state;
        fieldDetails.forEach(fieldData => {
            if (!(fieldData.name in payloadData)) {
                payloadData[fieldData.name] = fieldData.default
            }
        });
        if (!payloadData['department']) {
            payloadData['department'] = null;
        }
        return payloadData
    }

    submit = () => {
        this.disableSubmit();
        const payload = this.getPayload();
        if (this.validate(payload)) {
            if (this.state.isEditForm) {
                let url = PUT_URL.vehicle.api + '' + this.state.id + '/';
                putRequest(url, payload, this.props).then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push(Actions.transport_vehicle.view.url);
                    }
                    else {
                        this.enableSubmit();
                    }
                });

            }
            else {
                const url = POST_URL.vehicle.api;
                postRequest(url, payload, this.props).then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push(Actions.transport_vehicle.view.url)
                    } else {
                        this.enableSubmit();
                    }
                });
            }
        } else {
            this.enableSubmit()
        }
    }
    render() {
        const { disableSubmit, isEditForm, fieldValues, loading } = this.state;
        const action = isEditForm ? 'Update' : 'Add';
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        } else {
            return (
                <>
                    <Paper>
                        <Box className="paper-background">
                            <Grid container >
                                <Grid item md={6} xs={12} sm={12} >
                                    <Grid item md={6} xs={12} sm={12} className={classNames('header-align')}>
                                        <Box className='heading'>
                                            {action} Vehicle
                                        </Box>
                                        <Box className='sub-heading'>
                                            Can {action} vehicle
                                        </Box>
                                    </Grid>
                                </Grid>
                                <Grid item md={6} xs={12} >
                                    <Box className='header-align end-flex-prop'>
                                        {isUserHasPermission('transport_vehicle', 'view') && <Button
                                            variant="contained"
                                            component={Link} to={Actions.transport_vehicle.view.url}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' />  {Actions.transport_vehicle.view.label}</Button>}
                                    </Box>
                                </Grid>
                                {/* <Grid item md={12} xs={12} sm={12}> */}

                                {/* <Grid item xl={4} lg={4} xs={12} sm={12} className='add-vehicle-body'>
                                    <img src={vehiclePNG} alt='School Building' className='descriptive-img' />
                                </Grid> */}

                                <Grid item xl={7} lg={8} xs={12} sm={12} >
                                    <Grid container className='add-vehicle-body add-vehicle-form'>
                                        {fieldValues &&
                                            <DynamicForm
                                                fieldDetails={fieldValues}
                                                updateParent={this.updateParent}
                                                isEditForm={isEditForm}
                                                loading={loading}
                                                ref={'vehicle'}
                                                idFormat={'transport_vehicle_2022_08_11_01_23_pm_'}
                                            />
                                        }
                                        <Box className="button-group">
                                            <Button
                                                className={`submit`}
                                                variant="contained"
                                                disabled={disableSubmit}
                                                style={{ 'float': 'right' }}
                                                onClick={(e) => this.submit()}>
                                                Submit
                                            </Button>
                                        </Box>
                                    </Grid>
                                    <Grid item lg={2} md={2} xs={12} sm={12}>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Box>
                    </Paper>
                </>
            )
        }
    }
}

export default withRouter(AddVehicle);