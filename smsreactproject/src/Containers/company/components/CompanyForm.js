import React, { Component } from 'react';
import { Tabs, AppBar, Tab, Typography, Box, withStyles, Button, } from "@material-ui/core";
import PropTypes from 'prop-types'
import moment from 'moment';
import { Link, withRouter } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import { getRequest, postRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, POST_URL } from 'Includes/urls'
import Swal from 'sweetalert2'
import { Actions } from 'Constants/permissions';

import CompanyInformation from 'Containers/company/CompanyInformation';
import LoadingGif from 'Components/LoadingGif';


function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}




class CompanyForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: 0,
            errors: {},
            companyDetail: null,
            loading: false,
            isEditForm: false
        };
    }
    updateTab = () => {
        this.setState({ disable: false })
    }

    check = async (company) => {
        let post_data = {
            "name": company.name ? company.name.trim() : '',
            "code": company.code ? company.code.trim() : '',
            "tel_num": company.tel_num ? company.tel_num.trim() : '',
            "tel_num_2": company.tel_num_2 ? company.tel_num_2.trim() : '',
            "address": company.address ? company.address.trim() : '',
            "pincode": company.pincode ? company.pincode.trim() : '',
            "type": company.type ? company.type.trim() : '',
            "gstin_num": company.gstin_num ? company.gstin_num.trim() : '',
            "board_name": company.board_name,
            "fax_num": company.fax_num,
            "database_key": company.database_key,
            "database_name": company.database_name,
            "domain": company.domain,
        }
        if (this.props.isEditForm) {
            const put_url = PUT_URL.signup.api
            const url = put_url + this.props.match.params.id + '/';
            putRequest(url, post_data, this.props).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    }).then({
                        pathname: '/dashboard/hr/staff/view',
                        state: { detail: this.props.match.params.id } 
                    })
                }
            });
        } else {
            const url = POST_URL.signup.api
            postRequest(url, post_data, this.props).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    }).then(
                        this.props.history.push(Actions.staff_list.view.url)
                    )
                }
                else {
                }
            })

            // this.props.history.push(`/dashboard/companyDetails/admission/view/${data['data']['id']}`)

        }
    }



    loadingFalse = () => {
        this.setState({
            loading: false
        })
    }

    render() {
        const { companyDetail, isEditForm, loading } = this.state;
       
        return (
            <div>
                {loading &&
                    <Box>
                        <LoadingGif />
                    </Box>
                }
                <div className={loading ? 'display-none' : ''}>
                    <CompanyInformation
                        submit={this.check}
                    />
                </div>
            </div>
        );
    }
}

export default withRouter(CompanyForm);