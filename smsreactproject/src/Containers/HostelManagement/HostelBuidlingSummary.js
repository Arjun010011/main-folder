import React, { useState, useEffect, useImperativeHandle } from 'react'
import {
    Box, Grid, Paper
} from '@material-ui/core';
import LoadingGif from 'Components/LoadingGif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import './styles.scss'
import { withRouter } from 'react-router-dom';
import { Actions } from 'Constants/permissions';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { Dropdown } from 'Components/DropDown';
import { numberWithCommas } from 'Includes/functions';

import SummaryBasicChart from 'Components/SummaryBasicChart';



const HostelBuildingSummary = React.forwardRef((props, ref) => {

    const [loadingDetails, set_loadingDetails] = useState(true)
    const [buildingDetails, set_buildingDetails] = useState(false)
    const [chartDetails, set_chartDetails] = useState({})
    const [buildingList, set_buildingList] = useState([])
    const [isBlankPage, set_isBlankPage] = useState(true)
    const [selectedBuilding, set_selectedBuilding] = useState('all')



    React.useEffect(() => {
        getHostelBuildingList()
    }, []);

    const getHostelBuildingList = () => {
        const url = GET_URL.buildingdata.api
        const params = { is_active: true, building_type: 'Hostel' }
        getRequest(url, params, props).then(response => {
            if (response && response.status === 200) {
                let temp = { id: 'all', name: 'All' }
                response.data.data.unshift(temp)
                set_buildingList(() => response.data.data)
                set_loadingDetails(() => false)
                getBuildingSummary()
                set_isBlankPage(() => false)
            }
        })
    }


    const getBuildingSummary = (id) => {
        set_loadingDetails(() => true)
        const url = GET_URL.hostelsummary.api
        let param = {}
        if (id && id !== 'all') {
            param = { building: id }
        }
        getRequest(url, param, props).then(response => {
            if (response && response.status === 200) {
                let chartDetailsTemp = {
                    "categories": response.data.data.year_list,
                    "series":
                        [{
                            "name": "No. of students ",
                            "data": response.data.data.data_list
                        }],
                    "heading": 'Student List',
                }
                set_buildingDetails(() => response.data.data)
                set_loadingDetails(() => false)
                set_chartDetails(() => chartDetailsTemp)
            }
        })
    }

    const handleOnChange = (e) => {
        let { value } = e.target;
        set_selectedBuilding(() => value)
        set_isBlankPage(() => false)
        getBuildingSummary(value)
    }


    return (
        <Box>
            {loadingDetails ?
                <LoadingGif />
                :
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={6} xs={12} className={'header-align'}>
                            <Box className='heading'>
                                Hostel Building Summary
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container spacing={2}>
                        <Grid item md={3} xs={12} className='mt-20'>
                            <Dropdown
                                data={buildingList}
                                name='selectedBuilding'
                                fullWidth
                                value={selectedBuilding}
                                onChange={handleOnChange}
                                label='Building'
                                hideSelect={true}
                            />
                        </Grid>
                    </Grid>
                    {isBlankPage &&
                        <Box className='header-align'>
                            <BlankPagewithIcon data={'Select Building'} />
                        </Box>
                    }
                    {!isBlankPage &&
                        <Paper className='padding-20 mt-20'>
                            {chartDetails['series'] &&
                                <Grid container >
                                    <Grid item md={6} xs={12}>
                                        <div className='hostel-student-paper'>
                                            <table width="100%" className="selectable-row-table mt-20">
                                                <thead className='table-select-hostel-thead'>
                                                    <th className={`selectable-table-head`}> Total </th>
                                                    <th className={`selectable-table-head`}> Counts  </th>
                                                </thead>
                                                <tbody className="selectable-row-table-body">
                                                    <tr className={"selectable-row-table-row"}>
                                                        <td className={'textAlign pl-15 '}> Number of rooms </td>
                                                        <td className={'textAlign pl-15 font-weight-bold'}>{buildingDetails['total_no_of_rooms']}</td>
                                                    </tr>
                                                    <tr className={"selectable-row-table-row"}>
                                                        <td className={'textAlign pl-15 '}> Number of seats </td>
                                                        <td className={'textAlign pl-15 font-weight-bold'}>{buildingDetails['total_no_of_seats']} </td>
                                                    </tr>
                                                    <tr className={"selectable-row-table-row"}>
                                                        <td className={'textAlign pl-15 '}> Students opted for hostel </td>
                                                        <td className={'textAlign pl-15 font-weight-bold'}>{buildingDetails['total_students']} </td>
                                                    </tr>
                                                    <tr className={"selectable-row-table-row"}>
                                                        <td className={'textAlign pl-15 '}> Allocated students to room </td>
                                                        <td className={'textAlign pl-15 font-weight-bold text-green'}>{buildingDetails['occupied_seats']}</td>
                                                    </tr>
                                                    <tr className={"selectable-row-table-row"}>
                                                        <td className={'textAlign pl-15 '}> Number of available seats </td>
                                                        <td className={'textAlign pl-15 font-weight-bold'}>{buildingDetails['total_available_seats']} </td>
                                                    </tr>
                                                    {/* <tr className={"selectable-row-table-row"}>
                                                        <td className={'textAlign pl-15 '}> Un-allocated students to room </td>
                                                        <td className={'textAlign pl-15 font-weight-bold text-red'}>{buildingDetails['unallocated_students']}</td>
                                                    </tr> */}
                                                    {/* <tr className={"selectable-row-table-row"}>
                                                        <td className={'textAlign pl-15 '}> Deposited amount </td>
                                                        <td className={'textAlign pl-15 font-weight-bold'}>{numberWithCommas(buildingDetails['total_pocket_collected'])} </td>
                                                    </tr>
                                                    <tr className={"selectable-row-table-row"}>
                                                        <td className={'textAlign pl-15 '}> Distributed amount </td>
                                                        <td className={'textAlign pl-15 font-weight-bold'}>{numberWithCommas(buildingDetails['total_pocket_distributed'])} </td>
                                                    </tr>
                                                    <tr className={"selectable-row-table-row"}>
                                                        <td className={'textAlign pl-15 '}> Balance amount </td>
                                                        <td className={'textAlign pl-15 font-weight-bold'}>{numberWithCommas(buildingDetails['total_pocket_balance'])} </td>
                                                    </tr> */}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Grid>

                                    <Grid item md={3} xs={12}>
                                        <div className='hostel-student-paper'>
                                            <table width="100%" className="selectable-row-table mt-20">
                                                {/* <thead className='table-select-hostel-thead'> */}
                                                    {/* <th className={`selectable-table-head`}> Total </th> */}
                                                    {/* <th className={`selectable-table-head`}> Counts  </th> */}
                                                {/* </thead> */}
                                                <tbody className="selectable-row-table-body">
                                                    <tr className={"selectable-row-table-row"}>
                                                        <td className={'textAlign pl-15 text-blue fs-18'}> Deposited amount </td>
                                                        <td className={'textAlign pl-15 font-weight-bold'}>{numberWithCommas(buildingDetails['total_pocket_collected'])} </td>
                                                    </tr>
                                                    <tr className={"selectable-row-table-row"}>
                                                        <td className={'textAlign pl-15 text-red fs-18'}> Distributed amount </td>
                                                        <td className={'textAlign pl-15 font-weight-bold'}>{numberWithCommas(buildingDetails['total_pocket_distributed'])} </td>
                                                    </tr>
                                                    <tr className={"selectable-row-table-row"}>
                                                        <td className={'textAlign pl-15 text-green fs-18'}> Balance amount </td>
                                                        <td className={'textAlign pl-15 font-weight-bold'}>{numberWithCommas(buildingDetails['total_pocket_balance'])} </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </Grid>
                                    {/* <Box className='create-expenses-right-part-paper'>

                                            <Box>
                                                <Box className='expense-add-fuel-review'>
                                                    Total Counts
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='hostel-summary-label'>Num of rooms</Box>
                                                    <Box className='hostel-summary-value font-weight-bold'>{buildingDetails['total_no_of_rooms']}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='hostel-summary-label'>Num of seats</Box>
                                                    <Box className='hostel-summary-value font-weight-bold'>{buildingDetails['total_no_of_seats']}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='hostel-summary-label'>Students opted for hostel</Box>
                                                    <Box className='hostel-summary-value font-weight-bold'>{buildingDetails['total_students']}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='hostel-summary-label'>Students allocated to room </Box>
                                                    <Box className='hostel-summary-value font-weight-bold'>{buildingDetails['occupied_seats']}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='hostel-summary-label'>Deposited amount</Box>
                                                    <Box className='hostel-summary-value font-weight-bold'>{buildingDetails['total_pocket_collected']}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='hostel-summary-label'>Distributed amount</Box>
                                                    <Box className='hostel-summary-value font-weight-bold'>{buildingDetails['total_pocket_distributed']}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='hostel-summary-label'>Balance amount</Box>
                                                    <Box className='hostel-summary-value font-weight-bold'>{buildingDetails['total_pocket_balance']}</Box>
                                                </Box>
                                            </Box>
                                        </Box> */}
                                </Grid>
                            }
                        </Paper>
                    }
                </Paper>
            }
        </Box>
    )
}
)
export default withRouter(HostelBuildingSummary)