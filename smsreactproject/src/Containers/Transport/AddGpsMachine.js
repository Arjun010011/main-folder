import React, { Component } from 'react'
import {
    Paper, Box, Button, Grid
} from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import { withRouter } from 'react-router-dom';
import _ from 'lodash';
import Snackbar from '@material-ui/core/Snackbar';
import Swal from 'sweetalert2'

import loadingBar from 'images/loading.gif'
import { Actions } from 'Constants/permissions';
import { getRequest, postRequest, putRequest, } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls';
import { nameWithQuoteRegex } from 'Constants/regularExpression';
import { Alert, dateFormat, getUrlParam, validateDate, isUserHasPermission } from 'Includes/functions';
import DynamicForm from 'Components/DynamicForm';
import './styles.scss';

const gpsDetails_global = [
    {
        label: 'Vendor Name', regex: nameWithQuoteRegex, name: 'vendor', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Vendor Code', regex: null, name: 'vendor_code', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'dropDown', list: [], hideSelect: true
    },
    {
        label: 'Object Name', regex: nameWithQuoteRegex, name: 'object_name', md: 4, className: 'width-form-95', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Object Type', regex: null, name: 'object_type', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'dropDown', list: [{ id: 'car', name: 'Car' }, { id: 'bike', name: 'Bike' }, { id: 'truck', name: 'Truck' }], hideSelect: true
    },
    {
        label: 'Device Type', regex: nameWithQuoteRegex, name: 'device_type', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'IMEI No.', regex: nameWithQuoteRegex, name: 'imei_no', md: 4, className: 'width-form-95', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Device Model', regex: nameWithQuoteRegex, name: 'device_model', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Sim Provider', regex: nameWithQuoteRegex, name: 'sim_provider', md: 4, className: 'width-form-95', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Sim Card No.', regex: nameWithQuoteRegex, name: 'sim_card_number', md: 4, className: 'width-form-95', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Object Category', regex: null, name: 'object_category', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'dropDown', list: [{ id: 'movable', name: 'Movable' }, { id: 'immovable', name: 'Immovable' }], hideSelect: true
    },
    {
        label: 'Object Model', regex: nameWithQuoteRegex, name: 'object_model', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Ign', regex: nameWithQuoteRegex, name: 'ign', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Power', regex: nameWithQuoteRegex, name: 'pwr', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Gps', regex: nameWithQuoteRegex, name: 'gps', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Battery estimation to charge', regex: nameWithQuoteRegex, name: 'battery_est_time_to_charge', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Speed Detection', regex: nameWithQuoteRegex, name: 'speed_detection', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Manufacture Date', regex: null, name: 'manufacture_date', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: null, rows: null, type: 'date', maxLength: null, minDate: new Date(), maxDate: '',
    },
    {
        label: 'Purchase Date', regex: null, name: 'purchase_date', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: null, rows: null, type: 'date', maxLength: null, minDate: new Date(), maxDate: '',
    },
    {
        label: 'GPS Installation Date', regex: null, name: 'gps_installation_date', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: null, rows: null, type: 'date', maxLength: null, minDate: new Date(), maxDate: '',
    },
    {
        label: 'Gps Warranty', regex: nameWithQuoteRegex, name: 'gps_warranty', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: null, rows: null, type: 'text', maxLength: 250
    },


]

class AddGpsMachine extends Component {
    constructor(props) {
        super(props)

        this.state = {
            yearName: '',
            selectedYear: '',
            gpsmachine: {},
            gpsDetails: null,
            isEditForm: false,
            loading: true,
            standardList: [],
            checkAll: false,
            fieldErrors: {},
            openError: false,
            alertData: '',
            gpsmachineID: '',
            header: 'Add',
            vendor_code_list: []
        }
    }

    async componentDidMount() {
        if (this.props.location.pathname === Actions.transport_gps_machine.update.url) {
            if (this.props.location.state && this.props.location.state.detail) {
                let id = this.props.location.state.detail
                this.updategpsDetails(id)
            }
            else {
                this.props.history.push(Actions.transport_gps_machine.view.url);
            }
        }
        else {
            this.getVendorList()
        }
    }

    getVendorList = () => {
        let temp = { vendor_code_list: 1 }
        const url = GET_URL.gpsmachine.api
        getRequest(url, temp, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    vendor_code_list: response.data.data
                }, () => {
                    this.updategpsmachineInf()
                })
            }
        })
    }

    updategpsDetails = (id) => {
        let { standardList, checkAll } = this.state;
        const url = GET_URL.gpsmachine.api + id + '/'
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.updategpsmachineInf(response.data.data)
                this.setState({
                    updatedDetails: response.data.data,
                    standardList,
                    checkAll,
                    isEditForm: true,
                    gpsmachineID: id,
                    header: 'Update',
                })
            }
        })
    }

    updategpsmachineInf = (gpsmachineInf) => {
        let { gpsmachine, toDate, fromDate, gpsmachineTypeList, gpsmachineTermList, vendor_code_list } = this.state
        let fieldDetail = _.cloneDeep(gpsDetails_global)
        let value
        fieldDetail.forEach((field) => {
            if (field.name === 'from_date' || field.name === 'to_date') {
                field.maxDate = toDate
                field.minDate = fromDate
            }
            else if (field.name === 'gpsmachine_type') {
                field.list = gpsmachineTypeList
            }
            else if (field.name === 'term') {
                field.list = gpsmachineTermList
            }
            else if (field.name === 'vendor_code') {
                field.list = vendor_code_list
            }
            if (gpsmachineInf) {
                value = gpsmachineInf[field['name']]
            }
            else {
                value = field.default
            }
            field.default = value
            gpsmachine[field['name']] = value
        })
        this.setState({
            gpsmachine,
            gpsDetails: fieldDetail,
            loading: false
        })
    }

    updateGPSMachine = (name, value) => {
        let { gpsmachine, gpsDetails } = this.state
        gpsDetails.some((field) => {
            if (field.name === name) {
                field.default = value
            }
        })
        gpsmachine[name] = value
        this.setState({
            gpsDetails,
            gpsmachine,
        })
    }

    validation = () => {
        let { gpsDetails, fieldErrors, openError, alertData, gpsmachine } = this.state;
        fieldErrors = {}
        let validate = true
        gpsDetails.forEach((field) => {
            let value = field.default;
            let name = field.name;
            if (field.required && (value === '' || value === null || value === 0)) {
                fieldErrors[name] = `${field.label} is Mandatory`
                validate = false
            }
            if (field.type === 'date' && field.default) {
                field.minDate = field.parentMinDate ? gpsmachine[field.parentMinDate] : field.minDate
                let error = validateDate(field.default, field.minDate, field.maxDate);
                if (error !== '') {
                    fieldErrors[name] = error
                    validate = false
                }
            }
            else if (field.regex && !field.regex.value.test(value) && value !== '') {
                fieldErrors[name] = field.regex.errorText;
                validate = false
            }
        })

        if (!validate) {
            this.refs.gpsmachine.updateErrors(fieldErrors)
            openError = true
            alertData = 'Clear Errors'
        }

        this.setState({
            fieldErrors,
            openError,
            alertData,
            submitDisable: true
        })
        let return_value = validate
        return return_value
    }

    postFormat = () => {
        let { gpsmachine } = this.state;
        let { isEditForm, gpsmachineID } = this.state;
        if (isEditForm) {
            gpsmachine['id'] = gpsmachineID
        }
        return [gpsmachine]
    }

    submit = () => {
        let validate = this.validation();
        if (validate) {
            let post_data = this.postFormat(validate);
            let url = POST_URL.gpsmachine.api;
            postRequest(url, post_data, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push(Actions.transport_gps_machine.view.url)
                    }
                    this.setState({ submitDisable: false })
                });
        }
        else {
            this.setState({
                submitDisable: false
            })
        }
    }

    handleClose = () => {
        this.setState({
            openError: false
        })
    }

    render() {
        let { gpsDetails, isEditForm, loading, openError, alertData, header } = this.state;
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <div>
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={8} xs={12} className='header-align'>
                                <Box className='heading'>
                                    {header} GPS Machine
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('transport_gps_machine', 'view') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.transport_gps_machine.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.transport_gps_machine.view.label}</Button>
                                    }
                                </Box>
                            </Grid>
                        </Grid>

                        <Paper className='add-exam-background'>
                            {gpsDetails &&
                                <DynamicForm
                                    fieldDetails={gpsDetails}
                                    updateParent={this.updateGPSMachine}
                                    isEditForm={isEditForm}
                                    loading={loading}
                                    ref={'gpsmachine'}
                                    idFormat={'gpsmachine_2022_08_11_01_23_pm_'}
                                />
                            }
                        </Paper>
                        <Grid item md={12}>
                            <Box display='flex' marginLeft='auto' justifyContent='flex-end'>
                                <Button variant="contained" color="primary"
                                    className='submit'
                                    disabled={this.state.submitDisable}
                                    onClick={this.submit}>
                                    Submit &nbsp;{' '}
                                </Button>
                            </Box>
                        </Grid>
                    </Paper>

                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openError} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </div >
            )
        }
    }
}

export default withRouter(AddGpsMachine);
