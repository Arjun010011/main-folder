import React from 'react';
import { Grid, Paper, Box,Button } from '@material-ui/core/';
import { withRouter ,Link} from 'react-router-dom';
import Swal from 'sweetalert2'
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';

import SchoolDetail from './../SchoolDetail';
import { getRequest, patchRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL } from 'Includes/urls'
import { Actions } from 'Constants/permissions';
import LoadingGif from 'Components/LoadingGif';
import { isUserHasPermission , getSettingValue} from 'Includes/functions';
import { isFormDefinitionEnabled } from "Includes/CheckFormDefinition";
import { getLocalStorageDetails } from "Includes/functions";

import messages from './../messages';
import { FormattedMessage } from 'react-intl';

// const is_google_places = Boolean(parseInt(getSettingValue("google_places")));
// const is_google_places = true;
 

class School extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            company_id: '',
            loading: true,
            id: '',
            submitDisable: false,
            open: false,
            isEditForm: false,
            currentSchool: null,
            isUploaded: true,
            // is_google_places: isFormDefinitionEnabled(
            //     "student_configuration",
            //     "address_google_map",
            //     1
            // ),
            is_google_places:true
        }
    }
    async componentDidMount() {
        if (this.props.location.pathname === Actions.school_details.update.url) {
            this.setState({
                isEditForm: true
            })
            this.getSchoolInformation()
        }
    }

    getSchoolInformation = () => {
        const url = GET_URL.institute.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                let schoolData = response.data;
                this.setState({
                    company_id: schoolData.data[0].company_id,
                    id: schoolData.data[0].id,
                    currentSchool: schoolData.data[0],
                    currentSchool_address_id: schoolData.data[0]['map_address_data']?.['id'] ?? ''
                })
            }
        })
    }

    submit = async (school) => {
        let { isUploadFailed, isUploaded, isEditForm, company_id, id, currentSchool_address_id, is_google_places } = this.state
        let address = school.address
        this.setState({ submitDisable: true, school: school })
        const user = getLocalStorageDetails('user', 'object');
        let post_data = {
            'institute': {
                name: Boolean(school.name) ? school.name.trim() : '',
                code: Boolean(school.code) ? school.code.trim() : '',
                logo: school.logo,
                type: Boolean(school.type) ? school.type.trim() : '',
                board_name: Boolean(school.board_name) ? school.board_name.trim() : '',
                gstin_num: Boolean(school.gstin_num) ? school.gstin_num.trim() : '',
                fax_num: Boolean(school.fax_num) ? school.fax_num.trim() : '',
                tel_num: school.tel_num,
                tel_num_2: school.tel_num_2,
                company_id: company_id.toString().trim(),
                enquiry_format: Boolean(school.enquiry_format) ? school.enquiry_format.trim() : '',
                trust_name: Boolean(school.trust_name) ? school.trust_name.trim() : '',
                email: Boolean(school.email) ? school.email.trim() : '',
                social_links: school.social_links || {},
            }
        }
        if (user.is_superuser) {
            post_data['institute']['poc'] = school.poc;
        }
        if(is_google_places){
            post_data['institute']['map_address_data']={}
            post_data['institute']['map_address_data']['id']=currentSchool_address_id
            post_data['institute']['map_address_data']['address_one_map']=address['address_one_map']
            post_data['institute']['map_address_data']['address_two_map']=address['address_two_map']
            post_data['institute']['map_address_data']['city_map']=address['city_map']
            post_data['institute']['map_address_data']['district_map']=address['district_map']
            post_data['institute']['map_address_data']['state_map']=address['state_map']
            post_data['institute']['map_address_data']['country_map']=address['country_map']
            post_data['institute']['map_address_data']['pincode_map']=address['pincode_map']
            post_data['institute']['map_address_data']['latitude_map']=address['latitude_and_langitude_map']['lat']
            post_data['institute']['map_address_data']['longitude_map']=address['latitude_and_langitude_map']['lng']
        }
        else{
            post_data['institute']['address']=Boolean(address.address) ? address.address.trim() : ''
            post_data['institute']['country']=address.country
            post_data['institute']['state']=address.state
            post_data['institute']['district']=address.district
            post_data['institute']['city']=address.city
            post_data['institute']['pincode']=address.pincode
        }
        if (isEditForm && isUploaded) {
            const put_url = PUT_URL.institute.api
            const url = put_url + id + '/';
            patchRequest(url, post_data, {}).then(response => {
                if (response && response.status === 200) {
                    const Response = response.data
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: Response.Reason,
                        text: 'School Information is Updated ',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(`view`)
                }
                this.setState({ submitDisable: false })
            })
        }
        else if (isUploadFailed) {
            Swal.fire({
                type: 'error',
                title: 'Something Went Wrong Upload Profile Pic Again',
                showConfirmButton: true,
            })
        }
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    loadingFalse = () => {
        this.setState({
            loading: false
        })
    }

    isUpload = (name) => {
        let { submitDisable, school, isUploadFailed } = this.state;
        if (submitDisable && name) {
            this.setState({
                isUploaded: true
            }, () => {
                this.submit(school)
            })
        }
        else if (name === 'failed') {
            isUploadFailed = true
            submitDisable = false
        }
        this.setState({
            isUploaded: name,
            isUploadFailed,
            submitDisable
        })
    }

    render() {
        let { loading } = this.state
        return (
            <Box>
                {loading &&
                    <Box>
                        <LoadingGif />
                    </Box>
                }
                <Box className={loading ? 'display-none' : 'ml-3-on-600'}>
                    <Paper className='paper-plain-background p-t-20px p-b-20px'>
                        <Grid container>
                            <Grid item md={6} xs={12} className='header-align'>
                                <Box className='heading'>
                                    <FormattedMessage {...messages.schoolBasisViewHead} />
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('subjects', 'view') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.school_details.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.school_details.view.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container className='margin-top-20'>
                            <Grid item md={12} xs={12}>
                                {(this.state.currentSchool || !this.state.isEditForm) &&
                                    <SchoolDetail
                                        classes={this.props.classes}
                                        currentSchool={this.state.currentSchool}
                                        errors={this.state.errors}
                                        isUpload={this.isUpload}
                                        ref={"schoolDetail"}
                                        isEditForm={this.state.isEditForm}
                                        loadingFalse={this.loadingFalse}
                                        loading={loading}
                                        submit={this.submit}
                                        submitDisable={this.state.submitDisable}
                                    >
                                    </SchoolDetail>}
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            </Box>
        )
    }
}



export default withRouter(School);
