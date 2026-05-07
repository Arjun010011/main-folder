import React, { Component } from 'react'
import { Paper, Box, Grid, Button, Tooltip } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { withRouter, Link } from 'react-router-dom';
import classNames from 'classnames';
import loadingBar from 'images/loading.gif';
import { Actions } from 'Constants/permissions';
import ErrorHandler from 'Components/ErrorHandler';
import { putRequest } from 'Includes/api/apicall';
import { PUT_URL } from 'Includes/urls'
import { withStyles, Theme, createStyles, makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
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

class BduTableView extends Component {

    constructor(props) {
        super(props)
        this.state = {
            reason: {},
            data: [],
            columns: [],
            snackbar: false,
            errors: {},
            loading: false,
            alertData: ''
        }
    }

    componentDidMount = () => {
        this.setState({
            reason: this.props.location.state.Reason,
            data: this.props.location.state.data,
            columns: this.props.location.state.columns,
            errors: this.props.location.state.Reason
        })
    }

    handleSearchChange = (e, index, column, err) => {
        let { data, errors } = this.state;
        if (err) {
            delete errors[index]['non_field_errors']
        }
        if (errors && errors[index] && errors[index][column]) {
            delete errors[index][column];
        }
        data[index][column] = e.target.value;
        this.setState({
            data,
            errors
        })
    }


    submit = () => {
        this.setState({ loading: true });
        let { data, columns, reason, errors, alertData } = this.state;
        let valid = true;
        for (let key in reason) {
            if (Object.keys(errors[key]).length > 0) {
                valid = false;
                break;
            }
        }
        if (valid) {
            const id = this.props.location.state.id;
            let url = PUT_URL.bduupload.api + id + '/';
            putRequest(url, { data, columns }, { return_error: true }).then(response => {
                if (response && response.status === 200) {
                    this.setState(() => {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        })
                    })
                    this.props.history.push({
                        pathname: Actions.bdu_upload.view.url
                    })
                }
                else if (response && response.status === 400) {
                    if (response.data.Reason && response.data.data && response.data.columns) {
                        this.setState({
                            reason: response.data.Reason,
                            data: response.data.data,
                            columns: response.data.columns,
                            errors: response.data.Reason
                        })
                    }
                    else {
                        const error = { response }
                        ErrorHandler(error);
                    }
                }
            })

        }
        else {
            let alertData = 'please resolve all the error(s).'
            this.setState({
                snackbar: true,
                alertData: alertData

            });
        }
        this.setState({ loading: false });
    }

    handleClose = () => {
        this.setState({
            snackbar: false,
        });
    };

    deleteRow = (index) => {
        let { data, errors, reason } = this.state;
        if (index !== -1) {
            data.splice(index, 1);

            delete errors[index];
            delete reason[index];
            this.setState({
                data,
                errors,
                reason
            });

        }
    }



    render() {
        const { loading, reason, data, columns, snackbar, errors, alertData } = this.state
        let rowHeaderBackground = 'review-header-background';
        let heading = [];
        let err = {};
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box>
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    BDU Error(s)
                                    </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    <Button
                                        variant='contained'
                                        component={Link} to={Actions.bdu_upload.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> View {Actions.bdu_upload.view.label}</Button>
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12}>
                                <Paper>

                                    <TableContainer component={Paper}>
                                        <Table aria-label="customized table">
                                            <TableHead>
                                                <TableRow>
                                                    <StyledTableCell className={rowHeaderBackground} > Sl No. </StyledTableCell>
                                                    {
                                                        columns.map((row, i) => (
                                                            heading.push(row.replace('*', '')),
                                                            <StyledTableCell key={i} className={rowHeaderBackground} >
                                                                {row}
                                                            </StyledTableCell>

                                                        ))
                                                    }
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {
                                                    data.map((row, index) => (
                                                        err[index] = reason[index]?.["non_field_errors"] ? true : false,
                                                        <StyledTableRow key={index}>
                                                            <StyledTableCell>{index + 1}</StyledTableCell>

                                                            {heading.map((column, i) => (
                                                                <StyledTableCell key={i}>
                                                                    <Tooltip title={err[index] ? errors[index]?.[column] ? reason[index][column] + reason[index]['non_field_errors'] : reason[index]['non_field_errors'] : errors[index]?.[column] ? reason[index][column] : ''}
                                                                        enterDelay={400} key={i}
                                                                        enterNextDelay={400} placement='top-start'
                                                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                                                        <TextField
                                                                            key={i}
                                                                            className='margin-top-20'
                                                                            multiline
                                                                            value={row[column]}
                                                                            error={(err[index] || reason[index]?.[column]?.length) > 0 ? true : false}
                                                                            onChange={(e) => this.handleSearchChange(e, index, column, err[index])}
                                                                        />
                                                                    </Tooltip>
                                                                </StyledTableCell>
                                                            ))
                                                            }
                                                        </StyledTableRow>

                                                    ))
                                                }
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Box className="button-group">
                                        <Button
                                            className='submit margin-top-10'
                                            variant="contained"
                                            style={{ 'float': 'right' }}
                                            onClick={(e) => this.submit()}>
                                            Submit
                                        </Button>
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                    {
                        <Snackbar
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            open={snackbar}
                            autoHideDuration={2000}
                            onClose={this.handleClose}
                        >
                            <Alert severity="error">
                                {alertData}
                            </Alert>
                        </Snackbar>
                    }
                </Box>
            )
        }
    }
}

export default withRouter(BduTableView);