import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { Box } from '@material-ui/core';

import loadingBar from 'images/loading.gif'
import MultipleAdd from 'Components/MultipleAdd'
import { amountRegexWithDecimals } from 'Constants/regularExpression'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { getUrlParam } from 'Includes/functions';
import './styles.scss';
import { Actions } from 'Constants/permissions';

const fieldDetails = [
    {
        label: 'Expenses Name', regex: '', autoFocus: true, name: 'expense_type', md: 6, className: 'width-80',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'dropDownWithSearch', list: []
    },
    {
        label: 'Max Budget', regex: null, autoFocus: false, name: 'max_amount', md: 6, className: 'width-80',
        required: false, id: 'outlined-textarea', default: '', rows: null, type: 'amount', isDuplicateAllow: true,
        maxLength: 15
    },
]
const header = 'Add Expenses Plan'
const subheader = 'Here we add the list of available Expenses Plans in the Financial Year.'


class AddExpensesPlan extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            header: '',
            loading: true
        }
        this.viewUrl = Actions.expenses_plan.view.url
    }


    componentDidMount = () => {
        let { year, yearName } = getUrlParam();
        this.setState({
            year: year,
            yearName: yearName,
            header: `Add Expenses Plan for ${yearName}`
        })
        this.getExpensesTypes(year);
    }

    getExpensesTypes = (year) => {
        const url = GET_URL.expensetype.api
        const params = { is_active: true, financial_year: year }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                fieldDetails.map((data) => {
                    data['list'] = response.data.data
                })
                this.setState({
                    expensesTypeList: response.data.data,
                    loading: false
                })
            }
        })
    }

    postMethod = (expense_plan) => {
        let { year } = this.state;
        expense_plan.map((data) => {
            if (!data.max_amount) {
                data.max_amount = null
            }
        })

        let post_data = {
            financial_year: year,
            expense_plan
        }
        this.setState({ submitDisable: true })
        let url = POST_URL.expenseplan.api;
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
                    this.props.history.push(Actions.expenses_plan.view.url)
                }
                this.setState({ submitDisable: false })
            });
    }

    render() {
        const { submitDisable, note, header, loading } = this.state
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
                    <MultipleAdd
                        fieldDetails={fieldDetails}
                        header={header}
                        subheader={subheader}
                        name='Expenses Plan'
                        viewUrl={this.viewUrl}
                        submitDisable={submitDisable}
                        postMethod={this.postMethod}
                        note={note}
                        headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                        buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12 }}
                        bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                        idFormat={'expense_plan_2022_08_11_2_pm_'}
                    />
                </div>
            )
        }
    }
}


export default withRouter(AddExpensesPlan)
