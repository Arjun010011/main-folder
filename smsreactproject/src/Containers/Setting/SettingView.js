import React, { Component } from 'react'
import { withRouter, Link } from 'react-router-dom';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { withStyles, Theme, createStyles, makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import { Box, Button, Typography } from '@material-ui/core';
import _ from 'lodash';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';
import './styles.scss';
import Swal from 'sweetalert2';

const StyledTableCell = withStyles((theme: Theme) =>
    createStyles({
        head: {
            backgroundColor: theme.palette.common.black,
            color: theme.palette.common.white,
        },
        body: {
            fontSize: 14,
        },
    }),
)(TableCell);

const StyledTableRow = withStyles((theme: Theme) =>
    createStyles({
        root: {
            '&:nth-of-type(odd)': {
                backgroundColor: theme.palette.action.hover,
            },
        },
    }),
)(TableRow);

class SettingView extends Component {

    constructor(props) {
        super(props)

        this.state = {
            settingList: [],
            oldSettingList: [],
            changedValueList: [],
            snackbar: false,
            disableSubmit: false,
            errors: {}
        }
    }

    componentDidMount = () => {
        this.getsettingList();
    }

    getsettingList = () => {
        const url = GET_URL.setting.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    oldSettingList: _.cloneDeep(response.data.data),
                    settingList: response.data.data,
                    loading: false
                })
            }
        })
    }

    review = () => {
        let { oldSettingList, settingList, changedValueList, errors } = this.state;
        errors = {};
        changedValueList = [];
        let alertData = 'No Changes detected'
        settingList.map((data, index) => {
            if (!_.isEqual(data, oldSettingList[index])) {
                if (data['value'] === '') {
                    alertData = 'Value cannot be empty'
                    errors[index] = true
                } else {
                    changedValueList.push(data);
                }
            }
        })
        if (changedValueList.length == 0) {
            this.setState({
                snackbar: true,
                alertData: alertData,
                errors
            })
        } else {
            this.setState({
                changedValueList
            });
        }
    }

    handleSearchChange = (e, index) => {
        let { settingList, errors } = this.state;
        delete errors[index];
        let tempValue = e.target.value;
        settingList[index]['value'] = tempValue;
        this.setState({
            settingList,
            errors
        })
    }

    goBack = () => {
        this.setState({ changedValueList: [] });
    }

    enableSubmit = () => {
        this.setState({
            disableSubmit: false
        });
    }

    disableSubmit = () => {
        this.setState({
            disableSubmit: true
        });
    }

    submit = () => {
        let { changedValueList } = this.state;
        changedValueList.map((data) => {
            data['academic_year'] = null;
            data['standard'] = null;
        })
        let url = POST_URL.setting.api;
        this.disableSubmit();
        postRequest(url, changedValueList, this.props).then((response) => {
            if (response && response.status === 200) {
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
                this.getsettingList();
                this.enableSubmit();
            } else {
                this.enableSubmit();
            }
        });
    }

    handleClose = () => {
        this.setState({
            snackbar: false,
        });
    };


    render() {
        let { settingList, oldSettingList, changedValueList, alertData,
            snackbar, errors, disableSubmit } = this.state;
        let rowHeaderBackground = 'review-header-background';
        if (changedValueList.length > 0) {
            rowHeaderBackground = 'review-header-background';
        }
        return (
            <div>
                <div>
                    {
                        changedValueList.length > 0 ?
                            (
                                <Box className="heading" display="flex">
                                    <Typography variant="h5" color="primary">
                                        Review And Submission
                                    </Typography>
                                    <Box ml="auto">
                                        <Button variant="outlined" color="primary" onClick={() => this.goBack()}>
                                            Back
                                        </Button>
                                    </Box>
                                </Box>
                            )
                            :
                            (
                                <Box className="heading" display="flex">
                                    <Typography variant="h5" color="primary">
                                        Setting List
                                    </Typography>
                                    <Box ml="auto">
                                        <Button variant="contained" color="primary" onClick={() => this.review()}>
                                            Review
                                        </Button>

                                    </Box>
                                </Box>
                            )
                    }
                </div>
                <TableContainer component={Paper}>
                    <Table aria-label="customized table">
                        <TableHead>
                            <TableRow>
                                <StyledTableCell className={rowHeaderBackground}>Id</StyledTableCell>
                                <StyledTableCell className={rowHeaderBackground}>Name</StyledTableCell>
                                <StyledTableCell className={rowHeaderBackground}>Setting type&nbsp;</StyledTableCell>
                                <StyledTableCell className={rowHeaderBackground}>Value&nbsp;</StyledTableCell>
                                <StyledTableCell className={rowHeaderBackground}>Description&nbsp;</StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {
                                changedValueList.length > 0 ?
                                    (
                                        changedValueList.map((row, index) => (
                                            <StyledTableRow key={index}>
                                                <StyledTableCell component="th" scope="row">
                                                    {row.id}
                                                </StyledTableCell>
                                                <StyledTableCell>{row.name}</StyledTableCell>
                                                <StyledTableCell>{row.setting_type}</StyledTableCell>
                                                <StyledTableCell>
                                                    <TextField
                                                        className='margin-top-20'
                                                        multiline
                                                        value={row.value}
                                                        onChange={(e) => this.handleSearchChange(e, index)}
                                                    />
                                                </StyledTableCell>
                                                <StyledTableCell>{row.description}</StyledTableCell>
                                            </StyledTableRow>
                                        ))
                                    )
                                    :
                                    (
                                        settingList.map((row, index) => (
                                            <StyledTableRow key={index}>
                                                <StyledTableCell component="th" scope="row">
                                                    {row.id}
                                                </StyledTableCell>
                                                <StyledTableCell>{row.name}</StyledTableCell>
                                                <StyledTableCell>{row.setting_type}</StyledTableCell>
                                                <TextField
                                                    className='margin-top-20'
                                                    multiline
                                                    value={row.value}
                                                    onChange={(e) => this.handleSearchChange(e, index)}
                                                    error={errors[index] ? true : false}
                                                />
                                                <StyledTableCell>{row.description}</StyledTableCell>
                                            </StyledTableRow>
                                        ))

                                    )
                            }
                        </TableBody>
                    </Table>
                </TableContainer>
                {
                    changedValueList.length > 0 && (
                        <Box className="button-group">
                            <Button
                                className='submit margin-top-10'
                                variant="contained"
                                style={{ 'float': 'right' }}
                                disabled={disableSubmit}
                                onClick={(e) => this.submit()}>
                                Submit
                            </Button>
                        </Box>
                    )
                }

                <Snackbar
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    open={snackbar}
                    autoHideDuration={1000}
                    onClose={this.handleClose}
                >
                    <Alert severity="error">
                        {alertData}
                    </Alert>
                </Snackbar>

            </div>
        )
    }

}

export default withRouter(SettingView)