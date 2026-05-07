import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameWithQuoteRegex, numberRegex, bankAccountNumberRegex, bankIfscRegex } from 'Constants/regularExpression'
import { postRequest, getRequest } from 'Includes/api/apicall';
import { POST_URL, GET_URL } from 'Includes/urls';
import './styles.scss';
import { Actions } from 'Constants/permissions';

const header = 'Bank Details'


class AddBank extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            fieldDetails: [],
        }
        this.viewUrl = Actions.manage_banks.view.url
    }

    componentDidMount() {
        this.getFinancialYearList()
    }

    getFinancialYearList = () => {
        const url = GET_URL.financialyear.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const list = response.data?.data || response.data || []
                const dataList = Array.isArray(list) ? list : (list.data_list || [])
                // Format display names
                const formattedList = dataList.map(fy => ({
                    ...fy,
                    name: `${new Date(fy.start_date).getFullYear()}-${new Date(fy.end_date).getFullYear()}`
                }))
                this.buildFieldDetails(formattedList)
            }
        })
    }

    buildFieldDetails = (financialYearList) => {
        this.setState({
            fieldDetails: [
                {
                    label: 'Bank Name', regex: nameWithQuoteRegex, name: 'bank_name', md: 6, maxLength: '25', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false, isDuplicateAllow: true
                },
                {
                    label: 'Bank ID', regex: numberRegex, name: 'bank_id', md: 6, maxLength: '10', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false,
                },
                {
                    label: 'Account Number', regex: bankAccountNumberRegex, name: 'account_num', md: 6, maxLength: '18', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false,
                },
                {
                    label: 'IFSC Code', regex: bankIfscRegex, name: 'ifsc', md: 6, maxLength: '15', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: false, isDuplicateAllow: true, convertUpperCase: true
                },
                {
                    label: 'Financial Year', regex: '', name: 'financial_year', md: 6, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-select', default: null, type: 'dropDownWithSearch', autoFocus: false,
                    list: financialYearList || [], isDuplicateAllow: true
                },
                {
                    label: 'Opening Balance', regex: null, name: 'opening_balance', md: 6, maxLength: '15', className: 'width-95-mt-30px', required: true,
                    id: 'outlined-textarea', default: '', rows: null, type: 'amount', autoFocus: false, isDuplicateAllow: true
                },
                {
                    label: 'Opening Balance Type', regex: '', name: 'opening_balance_type', md: 6, className: 'width-95-mt-30px', required: true,
                    id: 'outlined-select', default: { id: 'DEBIT', name: 'Debit' }, type: 'dropDownWithSearch', autoFocus: false,
                    list: [{ id: 'DEBIT', name: 'Debit' }, { id: 'CREDIT', name: 'Credit' }], isDuplicateAllow: true
                },
            ]
        })
    }

    postMethod = (bank_details) => {
        this.setState({ submitDisable: true })
        bank_details.map((data) => {
            data.opening_balance = parseFloat(data.opening_balance)
            data.opening_balance_type = data.opening_balance_type?.id || data.opening_balance_type || 'DEBIT'
            data.bank_id = data.bank_id
            data.financial_year = data.financial_year ? parseInt(data.financial_year) : null
        })
        // Validate financial year is selected for all entries
        const missingFY = bank_details.some(d => !d.financial_year)
        if (missingFY) {
            Swal.fire({
                type: 'warning',
                title: 'Please select a Financial Year for all entries',
                showConfirmButton: true,
            })
            this.setState({ submitDisable: false })
            return
        }
        let payload = { bank_details };
        let url = POST_URL.bankdetail.api;
        postRequest(url, payload, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.manage_banks.view.url)
                }
                this.setState({ submitDisable: false })
            });
    }
    render() {
        const { submitDisable, fieldDetails } = this.state
        return (
            <div>
                <MultipleAdd
                    fieldDetails={fieldDetails}
                    header={header}
                    name='Bank'
                    viewUrl={this.viewUrl}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12 }}
                    bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    idFormat={'bank_add_2022_08_11_2_pm_'}
                />
            </div>
        )
    }
}


export default withRouter(AddBank)