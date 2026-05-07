import React, { Component } from 'react'
import {
    Paper, Box, Button, Grid
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import _ from 'lodash';
import Snackbar from '@material-ui/core/Snackbar';
import Swal from 'sweetalert2'
import MultipleAddTextFields from 'Components/MultipleAddTextFields';

import loadingBar from 'images/loading.gif'
import { Actions } from 'Constants/permissions';
import { getRequest, postRequest, putRequest, } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls';
import { nameWithQuoteRegex } from 'Constants/regularExpression';
import { Alert, dateFormat, getUrlParam, validateDate, isUserHasPermission } from 'Includes/functions';
import DynamicForm from 'Components/DynamicForm';
// import './styles.scss';

const receipt_header_global = [
    {
        label: 'Receipt No.', regex: null, name: 'receipt_num', md: 4, className: 'width-form-95', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Student Name', regex: null, name: 'student_name', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Parent Name', regex: null, name: 'parent_name', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Course', regex: null, name: 'standard_name', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Due Date', regex: null, name: 'payment_end_date', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Transaction Date', regex: null, name: 'transaction_date', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Finance Fee Collection', regex: null, name: 'finance_fee_collection', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
]

const particular_global = [
    {
        label: 'Particular Name', regex: null, name: 'particular_name', md: 6, className: 'width-form-95', required: false,allowDuplicates:true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250, gridClassName: "margin-vertical-20",
    },
    {
        label: 'Amount', regex: null, name: 'particular_amount', md: 6, className: 'width-form-95', required: false,allowDuplicates:true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250, gridClassName: "margin-vertical-20",
    },
]

const receipt_footer_global = [
    {
        label: 'Amount To Pay', regex: null, name: 'group_total_amount', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Due Amount', regex: null, name: 'group_amount_pending', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Payment Mode', regex: null, name: 'mode_of_payment', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Reference No.', regex: null, name: 'payment_ref_num', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Notes', regex: null, name: 'payment_note', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Amount in words', regex: null, name: 'paid_amount_in_words', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
    {
        label: 'Amount Paid', regex: nameWithQuoteRegex, name: 'group_amount_paid', md: 4, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 250
    },
]

class DummyReciept extends Component {
    constructor(props) {
        super(props)

        this.state = {
            yearName: '',
            selectedYear: '',
            gpsmachine: {},
            receiptHeader: null,
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
        this.updategpsmachineInf()
    }

    updategpsmachineInf = () => {
        let gpsmachine = {}
        let fieldDetailHeader = _.cloneDeep(receipt_header_global)
        let value
        fieldDetailHeader.forEach((field) => {
            value = field.default
            field.default = value
            gpsmachine[field['name']] = value
        })
        gpsmachine['particular_list'] = []
        let fieldDetailFooter = _.cloneDeep(receipt_footer_global)
        fieldDetailFooter.forEach((field) => {
            value = field.default
            field.default = value
            gpsmachine[field['name']] = value
        })
        this.setState({
            gpsmachine,
            loading: false
        })
    }

    updateGPSMachine = (name, value) => {
        let { gpsmachine } = this.state
        gpsmachine[name] = value
        this.setState({
            gpsmachine,
        })
    }

    updateReasonsValue = (stateValue) => {
        let { gpsmachine } = this.state
        gpsmachine['particular_list'] = stateValue
        this.setState({
            gpsmachine
        })
    }

    submit = () => {
        const { gpsmachine } = this.state;
        let prop = {}
        prop.responseType = 'blob';
        let url = POST_URL.printdummyreceipt.api;
        postRequest(url, gpsmachine, prop)
            .then((response) => {
                if (response && response.status === 200) {
                    let Data = new Blob([response.data], { type: 'application/pdf' })
                    let fileURL = URL.createObjectURL(Data);
                    const height = (window.screen.height * 90) / 100
                    const width = (window.screen.width * 80) / 100
                    const mywindow = window.open(fileURL, 'PRINT', 'height=' + height + ',width=' + width + '');
                    mywindow.print();
                }
                this.setState({ submitDisable: false })
            });
    }

    handleClose = () => {
        this.setState({
            openError: false
        })
    }

    render() {
        let { receiptHeader, gpsmachine, isEditForm, loading, openError, alertData, header } = this.state;
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
                                    Create Fee Reciept Sample
                                </Box>
                            </Grid>
                        </Grid>

                        <Paper className='add-exam-background'>
                            <DynamicForm
                                fieldDetails={receipt_header_global}
                                updateParent={this.updateGPSMachine}
                                isEditForm={isEditForm}
                                loading={loading}
                                ref={'gpsmachine'}
                                idFormat={'gpsmachine_2022_08_11_01_23_pm_'}
                            />
                        </Paper>
                        <Grid container>
                            <Grid item md={8} xs={12} className='header-align'>
                                <MultipleAddTextFields
                                    fieldDefaultValue={[]}
                                    fieldDetails={particular_global}
                                    updateParent={this.updateReasonsValue}
                                    isEmptyNotAllowed={true}
                                    ref={'state'}
                                    NotAlignCenter={true}
                                    idFormat={'visitor_2022_08_11_2_pm_'}
                                />
                            </Grid>
                        </Grid>

                        <Paper className='add-exam-background'>
                            <DynamicForm
                                fieldDetails={receipt_footer_global}
                                updateParent={this.updateGPSMachine}
                                loading={loading}
                                ref={'gpsmachine'}
                                idFormat={'gpsmachine_2022_08_11_01_23_pm_'}
                            />
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

export default withRouter(DummyReciept);
