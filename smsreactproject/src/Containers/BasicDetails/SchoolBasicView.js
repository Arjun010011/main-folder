import React, { Component } from 'react'
import { Paper, Box, Grid, DialogActions, Dialog, DialogContent, DialogContentText, DialogTitle, Button, Link as MuiLink } from '@material-ui/core'
import { Link, withRouter } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';

import EditIcon from '@material-ui/icons/Edit';
import InstagramIcon from '@material-ui/icons/Instagram';
import FacebookIcon from '@material-ui/icons/Facebook';
import TwitterIcon from '@material-ui/icons/Twitter';
import LinkedInIcon from '@material-ui/icons/LinkedIn';
import YouTubeIcon from '@material-ui/icons/YouTube';
import WhatsAppIcon from '@material-ui/icons/WhatsApp';
import PhoneIcon from '@material-ui/icons/Phone';
import LanguageIcon from '@material-ui/icons/Language';
import classNames from "classnames";

import teacher from 'images/teacher.png'
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getSettingValue} from 'Includes/functions'
import messages from './messages';
import commonMessages from 'Constants/messages';

const SOCIAL_LINK_LABELS = {
  instagram: { label: 'Instagram', icon: <InstagramIcon style={{ marginRight: 8 }} /> },
  facebook: { label: 'Facebook', icon: <FacebookIcon style={{ marginRight: 8 }} /> },
  phone: { label: 'Phone', icon: <PhoneIcon style={{ marginRight: 8 }} /> },
  website: { label: 'Website', icon: <LanguageIcon style={{ marginRight: 8 }} /> },
};

const is_google_places = true;


class SchoolBasicView extends Component {
    constructor(props) {
        super(props)
        this.state = {
            school: {},
            schoolData: [],
            schoolAddress: [],
            socialLinks: {},
            open: false,
            loading: true,
            logo: ''
        }

    }

    handleClickOpen = () => {
        this.setState({
            open: true
        });
    };
    handleClose = () => {
        this.props.history.push('/help');
    };
    async componentDidMount() {
        let { schoolData, schoolAddress, logo, socialLinks } = this.state
        const url = GET_URL.institute.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                let school = response.data.data[0];
                if (!school) {
                    this.setState({
                        open: true,
                        loading: false
                    });
                }
                else {
                    this.updateSchool(school)
                    schoolData =
                        [{ label: <FormattedMessage {...messages.schoolName} />, value: school['name'], md: 12 },
                        { label: <FormattedMessage {...messages.trusts} />, value: school['trust_name'], md: 12 },
                        { label: <FormattedMessage {...messages.schoolCode} />, value: school['code'] }, { label: <FormattedMessage {...messages.schoolType} />, value: school['type'] },
                        { label: <FormattedMessage {...messages.boardName} />, value: school['board_name'] }, { label: <FormattedMessage {...messages.schoolGst} />, value: school['gstin_num'] },
                        { label: <FormattedMessage {...messages.faxNumber} />, value: school['fax_num'] }, { label: <FormattedMessage {...messages.schoolMobile} />, value: school['tel_num'] },
                        { label: <FormattedMessage {...messages.alternateNum} />, value: school['tel_num_2'] }, { label: <FormattedMessage {...messages.schoolEmail} />, value: school['email'] },
                        { label: <FormattedMessage {...messages.enquiryFormat} />, value: school['enquiry_format'] },
                        ]
                        ;
                        schoolAddress =
                        is_google_places ?
                            [{ label: <FormattedMessage {...commonMessages.address1} />, value: school['map_address_data']?.['address_one_map'], md: 6 },                            
                            { label: <FormattedMessage {...commonMessages.address2} />, value: school['map_address_data']?.['address_two_map'], md: 6 },                            
                            { label: <FormattedMessage {...commonMessages.city} />, value: school['map_address_data']?.['city_map'] },
                            { label: <FormattedMessage {...commonMessages.district} />, value: school['map_address_data']?.['district_map'] }, 
                            { label: <FormattedMessage {...commonMessages.state} />, value: school['map_address_data']?.['state_map'] },
                            { label: <FormattedMessage {...commonMessages.country} />, value: school['map_address_data']?.['country_map'] }, 
                            { label: <FormattedMessage {...commonMessages.pincode} />, value: school['map_address_data']?.['pincode_map'] }]
                        :
                            [{ label: <FormattedMessage {...commonMessages.address} />, value: school['address'], md: 12 },
                            { label: <FormattedMessage {...commonMessages.country} />, value: school['country_name'] }, 
                            { label: <FormattedMessage {...commonMessages.state} />, value: school['state_name'] },
                            { label: <FormattedMessage {...commonMessages.district} />, value: school['district_name'] }, 
                            { label: <FormattedMessage {...commonMessages.city} />, value: school['city_name'] },
                            { label: <FormattedMessage {...commonMessages.pincode} />, value: school['pincode'] }]
                    logo = school['document_details'] ? school['document_details']['file'] : ''
                    socialLinks = school['social_links'] || {}
                    this.setState({
                        schoolData,
                        logo,
                        schoolAddress,
                        socialLinks,
                        loading: false
                    })
                }
            }
        })
    }

    updateSchool = async (schoolData) => {
        this.setState({
            school: schoolData
        });
    }

    renderSocialLink = (platform, value) => {
        const linkConfig = SOCIAL_LINK_LABELS[platform];
        if (!linkConfig) return null;
        
        const isUrl = value.startsWith('http://') || value.startsWith('https://');
        const isPhone = platform === 'phone' || platform === 'whatsapp';
        
        return (
            <Box display="flex" alignItems="center">
                {linkConfig.icon}
                {isUrl ? (
                    <MuiLink href={value} target="_blank" rel="noopener noreferrer">
                        {value}
                    </MuiLink>
                ) : isPhone ? (
                    <MuiLink href={`tel:${value}`}>
                        {value}
                    </MuiLink>
                ) : (
                    <span>{value}</span>
                )}
            </Box>
        );
    };

    render() {
        const { school, loading, logo } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (<>
                {/* <Box item md={3} xs={12} className='school-logo-center'>
                    {logo !== '' &&
                        <Box className='logo-position'>
                            <img src={logo} className='logo-view' alt='logo' />
                        </Box>
                    }
                </Box> */}
                {
                    !this.state.open &&
                    <Paper className='paper-background'>
                        <Grid container >
                            <Grid item md={9} xs={12} className={logo ? 'header-align' : 'header-align'}>
                                <Box className='heading'>
                                    <FormattedMessage {...messages.schoolBasisViewHead} />
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container className='flex-justify-center'>
                            <Grid item md={10}>
                                <Paper className='paperBackground'>
                                    <Grid container spacing={3} >
                                        <Grid item md={12} xs={12}>
                                            <Box display='flex' className='flex-rv-on-600'>
                                                <Box className='header-align'>
                                                    <img src={teacher} alt='teacher' />
                                                    <Box className='basic-details'>
                                                        <FormattedMessage {...messages.basicDetTopic} />
                                                    </Box>
                                                </Box>
                                                <Box className='end-flex-prop width-90 header-align'>
                                                    {isUserHasPermission('school_details', 'update') && <Button variant="contained"
                                                        component={Link} to={Actions.school_details.update.url}
                                                        className='editbutton-view'
                                                    ><EditIcon className='visibility-icon' /> {Actions.school_details.update.label}</Button>}
                                                </Box>
                                            </Box>
                                        </Grid>
                                        {this.state.schoolData.map((data, index) => {
                                            return <Grid item md={data.md ? data.md : 6} xs={12} key={index}>
                                                <Box className='view-label'>
                                                    {data.label}
                                                </Box>
                                                <Box className='view-value'>
                                                    {data.value}
                                                </Box>
                                            </Grid>

                                        })
                                        }
                                    </Grid>
                                    <Grid item md={12}>
                                        <Grid container spacing={3} className='header-align'>
                                            {this.state.schoolAddress.map((data, index) => {
                                                return <Grid item md={data.md ? data.md : 6} xs={12} key={index}>
                                                    <Box className='view-label' >
                                                        {data.label}
                                                    </Box>
                                                    <Box className='view-value' >
                                                        {data.value}
                                                    </Box>
                                                </Grid>

                                            })
                                            }
                                        </Grid>
                                    </Grid>
                                    {Object.keys(this.state.socialLinks).length > 0 && (
                                        <Grid item md={12}>
                                            <Box mt={2} mb={1}>
                                                <Box className='view-label' style={{ fontWeight: 600 }}>
                                                    Social Links
                                                </Box>
                                            </Box>
                                            <Grid container spacing={2}>
                                                {Object.entries(this.state.socialLinks).map(([platform, value]) => (
                                                    <Grid item xs={12} md={6} key={platform}>
                                                        <Box className='view-label'>
                                                            {SOCIAL_LINK_LABELS[platform]?.label || platform}
                                                        </Box>
                                                        <Box className='view-value'>
                                                            {this.renderSocialLink(platform, value)}
                                                        </Box>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </Grid>
                                    )}
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                }
            </>
            )
        }
    }
}

export default withRouter(SchoolBasicView);
