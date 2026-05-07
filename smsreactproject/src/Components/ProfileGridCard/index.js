
import React, { Component } from 'react'
import { Box, Grid, Paper, Avatar } from '@material-ui/core';
import { Link } from 'react-router-dom';
import Tooltip from "@material-ui/core/Tooltip";
import EditOutlinedIcon from '@material-ui/icons/EditOutlined';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import DeleteOutlineOutlinedIcon from '@material-ui/icons/DeleteOutlineOutlined';

import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import profile_Background from 'images/profile_background.png';
import './styles.scss';
import { dateFormat } from 'Includes/functions';


class EnquiryStudentGridCard extends Component {
    render() {
        let { list, name, editURL, viewURL, enabledActions } = this.props;
        return (
            <div>
                <Box className={list.length === 0 ? '' : 'display-none'}>
                    <BlankPagewithIcon data="Please Add Form to View Grid Card" />
                </Box>
                <Grid container className={list.length !== 0 ? ' profile-card-position' : 'display-none'}>
                    {
                        list.map((data, index) => {
                            return <Paper className='grid-card-width'>
                                <Paper className='grid-card-paper'>
                                    <img src={profile_Background} className='grid-profile-background' alt='profile_Background' />

                                    {data.profile_pic_details &&
                                        <Box className='grid-profile-pic-position'>
                                            <Avatar alt='Profile Pic' src={data.profile_pic_details.file} className='grid-profile-pic' />
                                        </Box>
                                    }
                                    {!data.profile_pic_details &&
                                        <Box className='grid-profile-pic-position'>
                                            <Avatar className='grid-profile-pic'>
                                                {data.first_name && data.first_name.charAt(0)}{data.last_name && data.last_name.charAt(0)}
                                            </Avatar>
                                        </Box>
                                    }
                                </Paper>
                                <Box className='grid-card-profile-name break-word'>
                                    {data.first_name ? `${data.first_name} ${data.middle_name} ${data.last_name}` : data.name && data.name}
                                </Box>
                                <Box className='grid-card-standard'>{data.current_standard_name && data.current_standard_name}{data.group_name && data.group_name[0]}</Box>
                                {(data.enquiry_num || data.application_num || data.admission_num) &&
                                    <Box display='flex' pt={1}>
                                        <Box className='grid-card-label'>{name} Number</Box>
                                        <Box className='grid-card-value'>
                                            {(data.enquiry_num && data.enquiry_num)}
                                            {(data.application_num && data.application_num)}
                                            {(data.admission_num && data.admission_num)}
                                        </Box>
                                    </Box>
                                }
                                <Box display='flex' pt={1}>
                                    <Box className='grid-card-label'>Email</Box>
                                    <Box className='grid-card-value'>{data.email ? data.email : '------'}</Box>
                                </Box>
                                <Box display='flex' pt={1}>
                                    <Box className='grid-card-label'>Phone No</Box>
                                    <Box className='grid-card-value'>{data.mobile_num ? data.mobile_num : '------'}</Box>
                                </Box>
                                <Box display='flex' pt={1}>
                                    <Box className='grid-card-label'>Date of Birth</Box>
                                    <Box className='grid-card-value'>{dateFormat(data.dob, 'DD-MM-YYYY')}</Box>
                                </Box>
                                {data.date_joined &&
                                    <Box display='flex' pt={1}>
                                        <Box className='grid-card-label'>Joining Date</Box>
                                        <Box className='grid-card-value'>{dateFormat(data.date_joined, 'DD-MM-YYYY')}</Box>
                                    </Box>
                                }
                                <Box pt={3} pb={1}>
                                    <Grid container style={{ display: 'flex', justifyContent: 'space-evenly', textAlign: 'center' }}>
                                        {enabledActions.includes('edit') &&
                                            <Grid item md={2} xs={2}>
                                                <Link
                                                    to={{
                                                        pathname: editURL,
                                                        state: {
                                                            detail: data.id
                                                        }
                                                    }}
                                                    className='grid-card-actions'><EditOutlinedIcon /> Edit</Link>
                                            </Grid>
                                        }
                                        {enabledActions.includes('view') &&
                                            <Grid item md={2} xs={2}>
                                                <Link
                                                    to={{
                                                        pathname: viewURL,
                                                        state: {
                                                            detail: data.id
                                                        }
                                                    }}
                                                    className='grid-card-actions'> <VisibilityOutlinedIcon />View</Link>
                                            </Grid>
                                        }
                                        {enabledActions.includes('delete') &&
                                            <Grid item md={2} xs={2}>
                                                <Box
                                                    onClick={e => this.props.delete(data.id, index)}
                                                    className='grid-card-actions flex-center'> <DeleteOutlineOutlinedIcon />Delete
                                        </Box>
                                            </Grid>
                                        }
                                    </Grid>
                                </Box>
                            </Paper>
                        })
                    }
                </Grid>
            </div>
        )
    }
}

export default EnquiryStudentGridCard;

