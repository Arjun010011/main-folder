import React, { Component } from 'react';
import { Box, Avatar } from '@material-ui/core';
import './styles.scss'

export const viewTime = (value) => {
    let startTimeSplit = []
    startTimeSplit = value.split(':')
    const hours = startTimeSplit[0]
    const minutes = startTimeSplit[1]

    return (
        <Box className='time-outer-box'>
            <Box className='word-break-initial'>
                <Box className='hours-title' >Hours</Box>
                <Box className='hours-value'>{hours}</Box>
            </Box>
            <Box className='between-hour-minutes-line'></Box>
            <Box className='word-break-initial'>
                <Box className='hours-title'>Minutes</Box>
                <Box className='hours-value' >{minutes}</Box>
            </Box>
        </Box>
    )
}

export const studentImgColView = (data, rowIndex) => {
    let firstName = '';
    let middleName = '';
    let lastName = '';
    let description = '';
    let value = {};
    if (data && data.hasOwnProperty('firstName')) {
        firstName = data['firstName'];
        middleName = data['middleName'];
        lastName = data['lastName'];
        description = data['description'];
        if (data.hasOwnProperty('value')) {
            value = data['value'];
        }
    }
    return <Box className='student-profile-position'>
        {value && value.hasOwnProperty('file') &&
            <Box>
                <Avatar alt='Profile Pic' src={value['file']} className='round-profile-pic' />
            </Box>
        }
        {(!value || (value && !value.hasOwnProperty('file'))) &&
            <Box>
                <Avatar
                    className={rowIndex / 2 === 0
                        ? 'orange-profile-pic round-profile-pic' : 'green-profile-pic round-profile-pic'}>
                    {firstName && firstName.charAt(0)}{lastName && lastName.charAt(0)}
                </Avatar>
            </Box>
        }
        <Box>
            <Box className='hr-subject-view-staff-name'>
                {firstName} {middleName} {lastName}
            </Box>
            {description &&
                <Box className='hr-subject-view-staff-designation'>
                    {description}
                </Box>
            }
        </Box>
    </Box>
}