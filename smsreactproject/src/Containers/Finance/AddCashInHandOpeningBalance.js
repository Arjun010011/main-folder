import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { amountRegexWithDecimals } from 'Constants/regularExpression'
import { postRequest, getRequest } from 'Includes/api/apicall';
import { POST_URL, GET_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { getFullName, dateFormat } from 'Includes/functions';
import loadingBar from 'images/loading.gif';
import { Box } from '@material-ui/core';

const header = 'Cash In Hand Opening Balance'


class AddCashInHandOpeningBalance extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            fieldDetails: [],
            loading: true
        }
        this.viewUrl = Actions.cash_in_hand_opening_balance.view.url
    }

    componentDidMount = () => {
        this.loadStaffList()
    }

    loadStaffList = () => {
        const url = GET_URL.staff.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const staffData = response.data.data || []
                const staffOptions = staffData.map(s => ({
                    id: s.id,
                    name: getFullName(s.first_name, s.middle_name, s.last_name) || s.employee_id || `Staff ${s.id}`
                }))
                this.buildFieldDetails(staffOptions)
            }
        })
    }

    buildFieldDetails = (staffOptions) => {
        this.setState({
            fieldDetails: [
                {
                    label: 'Staff', regex: '', name: 'staff', md: 4, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-select', default: null, type: 'dropDownWithSearch', autoFocus: true,
                    list: staffOptions || []
                },
                {
                    label: 'Opening Balance', regex: amountRegexWithDecimals, name: 'opening_balance', md: 4, maxLength: '15', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'amount', autoFocus: false, isDuplicateAllow: true
                },
                {
                    label: 'Balance Type', regex: '', name: 'opening_balance_type', md: 2, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-select', default: { id: 'DEBIT', name: 'Debit' }, type: 'dropDownWithSearch', autoFocus: false,
                    list: [{ id: 'DEBIT', name: 'Debit' }, { id: 'CREDIT', name: 'Credit' }], isDuplicateAllow: true
                },
                {
                    label: 'Opening Date', name: 'opening_date', md: 4, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: new Date().toISOString().split('T')[0], type: 'date', autoFocus: false, isDuplicateAllow: true
                },
            ],
            loading: false
        })
    }

    postMethod = (data_list) => {
        this.setState({ submitDisable: true })
        const payload = data_list.map((data) => ({
            staff: data.staff ? parseInt(data.staff) : null,
            opening_balance: parseFloat(data.opening_balance),
            opening_balance_type: data.opening_balance_type?.id || data.opening_balance_type || 'DEBIT',
            opening_date: data.opening_date ? dateFormat(data.opening_date, 'YYYY-MM-DD') : null,
        }))
        const url = POST_URL.staffWallet.api;
        // Support bulk — post each one
        const promises = payload.map(item =>
            postRequest(url, item, this.props)
        )
        Promise.all(promises)
            .then((responses) => {
                const allSuccess = responses.every(r => r && (r.status === 200 || r.status === 201))
                if (allSuccess) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Opening balance(s) saved successfully',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(this.viewUrl)
                } else {
                    const failedResponse = responses.find(r => !(r && (r.status === 200 || r.status === 201)))
                    const errorMsg = failedResponse?.data?.detail ||
                        (Array.isArray(failedResponse?.data) ? failedResponse.data[0] : 'Failed to save some entries')
                    Swal.fire({
                        type: 'error',
                        title: 'Error',
                        text: errorMsg,
                    })
                }
                this.setState({ submitDisable: false })
            });
    }

    render() {
        const { submitDisable, fieldDetails, loading } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        return (
            <div>
                <MultipleAdd
                    fieldDetails={fieldDetails}
                    header={header}
                    name='Opening Balance'
                    viewUrl={this.viewUrl}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12 }}
                    bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    idFormat={'cash_in_hand_opening_balance_add_'}
                />
            </div>
        )
    }
}


export default withRouter(AddCashInHandOpeningBalance)
