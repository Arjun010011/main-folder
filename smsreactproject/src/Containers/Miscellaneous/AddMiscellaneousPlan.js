import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { getUrlParam } from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';
import { Actions } from 'Constants/permissions';
import _ from 'lodash';
import MultipleAdd from 'Components/MultipleAdd'
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import Swal from 'sweetalert2'
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';
import { amountgreaterthanzero } from "Constants/regularExpression";


class AddMiscellaneousPlan extends Component {
    constructor() {
        super()
        this.state = {
            year: 0,
            loading: true,
            miscDetails: [],
            additionalDetails: []
        };
    }

    componentDidMount() {
        let { year, yearName } = getUrlParam()
        let { additionalDetails } = this.state
        additionalDetails.push({
            name: <FormattedMessage {...commonMessages.academicYear} />,
            value: yearName
        })
        this.setState({
            year: year,
            additionalDetails: additionalDetails
        }, () => {
            this.getMiscellaneousType()
        })
    }

    getMiscellaneousType = () => {
        let fieldDetails
        let { miscDetails } = this.state
        let url = GET_URL.misctype.api
        let params = { is_active: 1, academic_year: this.state.year }
        getRequest(url, params).then((response) => {
            if (response && response.status === 200) {
                miscDetails = response.data.data
                fieldDetails = [
                    {
                        label: <FormattedMessage {...messages.miscellaneousType} />, regex: '',
                        autoFocus: true, name: 'misc_type', md: 6, className: 'width-80',
                        required: true, id: 'outlined-textarea', default: '', rows: null,
                        type: 'dropDownWithSearch', list: miscDetails
                    },
                    {
                        label: <FormattedMessage {...commonMessages.amount} />, regex: amountgreaterthanzero,
                        autoFocus: false, name: 'amount', md: 6, className: 'width-80',
                        required: true, id: 'outlined-textarea', default: '', rows: null,
                        type: 'text', isDuplicateAllow: true, maxLength: 8
                    },
                ]
            }
            this.setState({
                fieldDetails: fieldDetails,
                loading: false,
                miscDetails
            })
        })
    }


    postMethod = (miscellaneous_plan) => {
        let { year } = this.state;
        let post_data = {
            academic_year: year,
            misc_plan: miscellaneous_plan
        }
        this.setState({ submitDisable: true })
        let url = POST_URL.miscplan.api;
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
                    let searchState = { year: year }
                    let searchParam = "?" + new URLSearchParams(searchState).toString()
                    this.props.history.push({
                        pathname: Actions.miscellaneous_plan.view.url,
                        search: searchParam,
                    });
                }
                this.setState({ submitDisable: false })
            });
    }

    render() {
        let { loading, fieldDetails, additionalDetails, submitDisable } = this.state;
        if (loading) {
            return <LoadingGif />
        }
        else {
            return (
                <div>
                    {fieldDetails &&
                        <MultipleAdd
                            fieldDetails={fieldDetails}
                            header={<FormattedMessage {...messages.miscellaneousPlan} />}
                            name='Miscellaneous Plan'
                            viewUrl={Actions.miscellaneous_plan.view.url}
                            additionalDetails={additionalDetails}
                            submitDisable={submitDisable}
                            postMethod={this.postMethod}
                            headerGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                            buttonGrid={{ xl: 6, lg: 4, md: 4, xs: 12 }}
                            bodyGrid={{ xl: 6, lg: 8, md: 8, xs: 12 }}
                            idFormat={'leave_plan_2022_08_11_3_pm_'}
                        />
                    }
                </div>
            )
        }
    }
}

export default withRouter(AddMiscellaneousPlan);
