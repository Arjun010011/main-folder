import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';

import MultipleAdd from 'Components/MultipleAdd'
import { nameWithQuoteRegex } from 'Constants/regularExpression'
import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import './styles.scss';
import { Actions } from 'Constants/permissions';

const fieldDetails = [
    {
        label: 'Expenses Name', regex: nameWithQuoteRegex, autoFocus: true, name: 'name', md: 6, className: 'width-100',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 30
    },
]
const header = 'Add Hostel Expenses Type'
const subheader = 'Here we add the list of available Hostel Expenses types in the Entire System.'


class AddExpensesType extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
        }
        this.viewUrl = Actions.hostel_expenses_type.view.url
    }

    postMethod = (expense_type) => {
        let { year } = this.state;
        expense_type.map((data) => {
            data['expense_for'] = 2
        })
        let post_data = {
            academic_year: year,
            expense_type
        }
        this.setState({ submitDisable: true })
        let url = POST_URL.expensetype.api;
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
                    this.props.history.push(Actions.hostel_expenses_type.view.url)
                }
                this.setState({ submitDisable: false })
            });
    }
    render() {
        const { submitDisable, note } = this.state
        return (
            <div>
                <MultipleAdd
                    fieldDetails={fieldDetails}
                    header={header}
                    subheader={subheader}
                    name='Expenses Type'
                    viewUrl={this.viewUrl}
                    submitDisable={submitDisable}
                    postMethod={this.postMethod}
                    note={note}
                    idFormat={'expense_type_2022_08_11_2_pm_'}
                />
            </div>
        )
    }
}


export default withRouter(AddExpensesType)
