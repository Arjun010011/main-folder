import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { amountRegexWithDecimals } from 'Constants/regularExpression'
import { postRequest, getRequest } from 'Includes/api/apicall';
import { POST_URL, GET_URL } from 'Includes/urls';
import '../styles.scss';
import { Actions } from 'Constants/permissions';

const TRANSACTION_TYPE_OPTIONS = [
    { id: 'RECOVERY', name: 'Recovery' },
    { id: 'ADJUSTMENT', name: 'Adjustment' },
    { id: 'WRITE_OFF', name: 'Write Off' },
]

class SalaryAdvanceAddRecovery extends Component {
    constructor(props) {
        super(props)
        this.state = {
            submitDisable: false,
            salaryAdvanceList: [],
            fieldDetails: [],
            preSelectedAdvance: null
        }
        this.viewUrl = Actions.salary_advance?.view?.url || '/finance/salary-advance/view'
    }

    componentDidMount() {
        const urlParams = new URLSearchParams(this.props.location.search)
        const advanceId = urlParams.get('advance_id') || this.props.location.state?.advanceId

        this.getSalaryAdvanceList(advanceId)
    }

    getSalaryAdvanceList = (preSelectedId = null) => {
        const url = GET_URL.salaryAdvance.api
        getRequest(url, { is_active: true, limit: 10, pageno: 1 }, this.props).then(response => {
            if (response && response.status === 200) {
                const dataList = response.data.data.data_list || response.data.data || []
                const salaryAdvanceList = dataList.map(sa => ({
                    id: sa.id,
                    name: sa.staff_name ? `${sa.staff_name} - ${sa.closing_balance || sa.total_amount}` : sa.name || sa.particulars
                }))

                let preSelectedAdvance = null
                if (preSelectedId) {
                    preSelectedAdvance = salaryAdvanceList.find(sa => sa.id === parseInt(preSelectedId))
                }

                this.setState({
                    salaryAdvanceList,
                    preSelectedAdvance,
                    fieldDetails: this.getFieldDetails(salaryAdvanceList, preSelectedAdvance)
                })
            }
        })
    }

    getFieldDetails = (salaryAdvanceList, preSelectedAdvance = null) => [
        {
            label: 'Salary Advance',
            name: 'salary_advance',
            md: 6,
            className: 'width-95-mt-30px',
            required: true,
            type: 'dropDownWithSearch',
            list: salaryAdvanceList,
            optionValue: 'name',
            isDuplicateAllow: true,
            default: preSelectedAdvance,
            autoFocus: true
        },
        {
            label: 'Transaction Date',
            name: 'transaction_date',
            md: 6,
            className: 'width-95-mt-30px',
            required: true,
            type: 'date',
            isDuplicateAllow: true,
            default: new Date()
        },
        {
            label: 'Transaction Type',
            name: 'transaction_type',
            md: 6,
            className: 'width-95-mt-30px',
            required: true,
            type: 'dropDownWithSearch',
            list: TRANSACTION_TYPE_OPTIONS,
            optionValue: 'name',
            isDuplicateAllow: true,
            default: TRANSACTION_TYPE_OPTIONS[0]
        },
        {
            label: 'Amount',
            regex: amountRegexWithDecimals,
            name: 'amount',
            md: 6,
            maxLength: '15',
            className: 'width-95-mt-30px',
            required: true,
            type: 'amount',
            isDuplicateAllow: true,
            default: ''
        },
        {
            label: 'Remarks',
            name: 'remarks',
            md: 12,
            maxLength: '500',
            className: 'width-95-mt-30px',
            required: false,
            rows: 3,
            type: 'textarea',
            isDuplicateAllow: true,
            default: ''
        },
    ]


    postMethod = (data_list) => {
        this.setState({ submitDisable: true })

        const data = data_list[0]
        let transactionDate = data.transaction_date

        if (transactionDate instanceof Date) {
            transactionDate = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}-${String(transactionDate.getDate()).padStart(2, '0')}`
        } else if (typeof transactionDate === 'string' && transactionDate.trim()) {
            transactionDate = transactionDate
        } else {
            transactionDate = null
        }

        const payload = {
            salary_advance: typeof data.salary_advance === 'object' ? data.salary_advance?.id : data.salary_advance,
            transaction_date: transactionDate,
            transaction_type: typeof data.transaction_type === 'object' ? data.transaction_type?.id : data.transaction_type,
            amount: parseFloat(data.amount) || 0,
            remarks: data.remarks || null
        }

        postRequest(POST_URL.salaryAdvanceRecovery.api, payload, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Recovery transaction has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(this.viewUrl)
                }
                this.setState({ submitDisable: false })
            })
            .catch(err => {
                console.error('Error adding recovery:', err)
                this.setState({ submitDisable: false })
            });
    }

    render() {
        const { submitDisable, fieldDetails } = this.state
        if (fieldDetails.length === 0) return <div>Loading...</div>

        return (
            <div>
                <MultipleAdd
                    fieldDetails={fieldDetails}
                    header="Add Salary Advance Recovery"
                    name='Recovery'
                    viewUrl={this.viewUrl}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12 }}
                    bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                    idFormat={'salary_advance_recovery_add_'}
                    showAddMore={false}
                />
            </div>
        )
    }
}

export default withRouter(SalaryAdvanceAddRecovery)
