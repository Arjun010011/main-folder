import React, { Component } from 'react'
import { Paper, Box, Grid, Button, Checkbox, TextField } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter, Link } from 'react-router-dom';
import classNames from 'classnames';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import { withStyles, Theme, createStyles, makeStyles } from '@material-ui/core/styles';
import loadingBar from 'images/loading.gif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, POST_URL } from 'Includes/urls';
import { postRequest } from 'Includes/api/apicall';
import { Actions } from 'Constants/permissions';
import FormHelperText from '@material-ui/core/FormHelperText';
import './styles.scss';
import { Dropdown } from 'Components/DropDown';
import Fab from '@material-ui/core/Fab';
import DeleteIcon from '@material-ui/icons/Delete';
import Swal from 'sweetalert2';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';
import { isUserHasPermission } from 'Includes/functions';



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

const headings = ['Sl No.', 'Column Name', 'Column Alias', 'Type', 'Length', 'Validation rules', 'Selected Rules', 'Required', 'Ignore', 'Update Allowed', 'Invisible', 'Delete']

class BDUAdd extends Component {
    constructor() {
        super()
        this.state = {
            modelList: [],
            bdu: { bdu: {}, columns: [], deletable_ids: [] },
            bduValidationList: [],
            loading: true,
            isEdit: false,
            fieldErrors: { alias: {}, schema_column: {} },
            snackbar: false,
            alertData: '',
            uploadType: [{ name: 'insert', id: 'insert' }, { name: 'update', id: 'update' }, { name: 'both', id: 'both' }],

        }
    }


    async componentDidMount() {
        // window.addEventListener('beforeunload', this.beforeunload.bind(this));
        if (this.props.location.pathname === Actions.bdu_upload.update.url) {
            if (this.props.location.state && this.props.location.state.detail) {
                this.getBDU();
            }
            else {
                this.props.history.push(Actions.bdu_upload.view.url);
            }
        }
        else {
            this.getmodelList()
        }
    }

    getBDU = () => {
        let { bdu, bduValidationList } = this.state
        const id = this.props.location.state.detail + '/';
        const url = GET_URL.getbdu.api + id;
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                bdu['bdu'] = response.data.data.bdu;
                bdu['columns'] = response.data.data.columns;
                bduValidationList = response.data.data.bdu_validation_class;
                this.setState({
                    bdu,
                    bduValidationList,
                    isEdit: true,
                    loading: false,
                })
            }
        })
    }

    getmodelList = () => {
        const url = GET_URL.model.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    modelList: response.data.data,
                    loading: false,
                    isEdit: false
                })

            }
        })
    }

    handleChangeGetRequest = async (e, index, obj, field, label) => {
        let { bdu, bduValidationList, fieldErrors } = this.state
        if (index.props.value == 0) {
            bdu['columns'] = [];
            bduValidationList = [];
            fieldErrors[field] = `${label} is required.`
            this.setState({
                bdu,
                bduValidationList
            })
            return
        }
        // fieldErrors[field] = '';
        const url = GET_URL.modelfield.api
        const params = { id: index.props.value };
        bdu[obj][field] = index.props.children;
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                bdu['columns'] = response.data.data.field_list;
                bduValidationList = response.data.data.bdu_validation_class;
                this.setState({
                    bdu,
                    fieldErrors: { alias: {} },
                    bduValidationList
                })

            }
        })

    }

    handleSearchChange = (e, obj, field, index) => {
        let { fieldErrors, bdu } = this.state

        if (index > -1) {
            // if (fieldErrors[field] == null) {
            //     fieldErrors[field] = {}
            // }
            if (fieldErrors?.[field]?.[index])
                fieldErrors[field][index] = "";
            bdu[obj][index][field] = e.target.value;
        } else {
            fieldErrors[field] = '';
            bdu[obj][field] = e.target.value;
        }
        this.setState({
            bdu,
            fieldErrors,
        })
    }

    handleCheckBoxChange = (e, obj, field, index, check) => {
        let { bdu } = this.state
        bdu[obj][index][field] = !check;
        this.setState({
            bdu
        })
    }

    handleValidationMessageChange = (e, i, index, obj, field) => {
        let { bdu } = this.state
        bdu[obj][index][field][i]['validation_value'] = e.target.value;
        this.setState({
            bdu
        })
    }

    delete = (i, index, obj, field) => {
        let { bdu } = this.state
        bdu[obj][index][field].splice(i, 1)
        this.setState({
            bdu
        })
    }

    handleValidationChange = (e, i, index, obj, field) => {
        let { bdu } = this.state
        let id = i.props.value;
        let name = i.props.children;
        if (id < 1 || name.toLowerCase().includes('none')) {
            bdu[obj][index][field] = [];
            this.setState({
                bdu
            })
            return;
        }
        if (bdu[obj][index][field] == null) {
            bdu[obj][index][field] = [];
        }
        const found = bdu[obj][index][field].some(obj => obj.id === id);
        if (!found) {
            bdu[obj][index][field].push({ bdu_validation_class: id, validation_type: name });
            this.setState({
                bdu
            })
        }
    }

    isValid = (bdu, fieldErrors) => {
        let valid = true;
        let new_column_schema = []
        let new_column_alias = []
        bdu.columns.map((column, index) => {
            if (!column.hasOwnProperty("bdu_validation_column")) {
                column['bdu_validation_column'] = []
            }
            if (column['alias'] === "") {
                fieldErrors['alias'][index] = 'This is required.'
                valid = false;
            }
            if (column['new']) {
                if (column['schema_column'] === "") {
                    fieldErrors['schema_column'][index] = 'This is required.'
                    valid = false;
                }
                if (new_column_schema.includes(column['schema_column'])) {
                    fieldErrors['schema_column'][index] = 'This is duplicate.'
                    valid = false;
                }
                if (new_column_alias.includes(column['alias'])) {
                    fieldErrors['alias'][index] = 'This is duplicate.'
                    valid = false;
                }
            }
            new_column_schema.push(column['schema_column'])
            new_column_alias.push(column['alias'])
        })
        if (!bdu.bdu['name'] || bdu.bdu['name'].trim() === '') {
            fieldErrors['name'] = `Name is required.`;
            valid = false;
        }
        if (!bdu.bdu['upload_type'] || bdu.bdu['upload_type'] === 0) {
            fieldErrors['upload_type'] = `Upload Type is required.`;
            valid = false;
        }
        return valid;
    }

    async export() {
        const { bdu, fieldErrors } = this.state;
        let valid = this.isValid(bdu, fieldErrors);


        if (valid) {
            // const id = this.props.location.state.id;
            const fileName = "bdu_json";
            let json = JSON.stringify(bdu);
            let blob = new Blob([json], { type: 'application/json' });
            let href = await URL.createObjectURL(blob);
            let link = document.createElement('a');
            link.href = href;
            link.download = fileName + ".json";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        }
        else {
            let alertData = 'please resolve all the error(s).'
            this.setState({
                snackbar: true,
                alertData: alertData,
                fieldErrors
            });
        }
    }

    submit = () => {
        this.setState({ loading: true });
        let { bdu, fieldErrors, reason, errors } = this.state;
        // let valid = true;
        // if (fieldErrors['alias'] == null) {
        //     fieldErrors['alias'] = {}
        // }
        let valid = this.isValid(bdu, fieldErrors);
        if (valid) {
            // const id = this.props.location.state.id;
            let url = POST_URL.bdu.api;
            postRequest(url, bdu, this.props).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.bdu_upload.view.url)
                }
            })

        }
        else {
            let alertData = 'please resolve all the error(s).'
            this.setState({
                snackbar: true,
                alertData: alertData,
                fieldErrors
            });
        }
        this.setState({ loading: false });
    }

    handleClose = () => {
        this.setState({
            snackbar: false,
        });
    };

    handleNewField = () => {
        let { bdu } = this.state;
        let temp = { new: true }
        bdu.columns.push(temp)
        this.setState({
            bdu
        })
    }

    handleDelete = (index) => {
        let { bdu } = this.state;
        if (bdu.columns[index]['id']) {
            bdu.deletable_ids.push(bdu.columns[index]['id'])
        }
        bdu.columns.splice(index, 1)
        this.setState({
            bdu,
        })
    }

    render() {
        const { loading, bdu, isEdit, bduValidationList, modelList, uploadType, fieldErrors,
            alertData, snackbar } = this.state
        let rowHeaderBackground = 'review-header-background';
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
                                    Add BDU
                                </Box>
                                <Box className='sub-heading'>
                                    A New BDU structure can be created.
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <TextField
                                    id="name"
                                    label="Name"
                                    required={true}
                                    name="name"
                                    value={bdu['bdu']['name']}
                                    className="width-form-95"
                                    inputProps={{ maxLength: 50 }}
                                    variant="outlined"
                                    error={fieldErrors['name'] && (fieldErrors['name'] === "" ? false : true)}
                                    onChange={(e) => this.handleSearchChange(e, 'bdu', 'name')}
                                />
                                {
                                    fieldErrors['name'] &&
                                    <FormHelperText error={true}>{fieldErrors['name']}</FormHelperText>
                                }
                            </Grid>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <TextField
                                    id="description"
                                    label="Description"
                                    required={false}
                                    name="description"
                                    value={bdu['bdu']['description']}
                                    className="width-form-95"
                                    inputProps={{ maxLength: 255 }}
                                    variant="outlined"
                                    error={fieldErrors['description'] && (fieldErrors['description'] === "" ? false : true)}
                                    onChange={(e) => this.handleSearchChange(e, 'bdu', 'description')}
                                />
                            </Grid>
                        </Grid>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                {!isEdit &&
                                    <Dropdown
                                        data={modelList}
                                        name="primary_table"
                                        value={bdu['bdu']['primary_table']}
                                        onChange={(e, index) => this.handleChangeGetRequest(e, index, 'bdu', 'primary_table', 'Model/Table Name')}
                                        error={fieldErrors['primary_table']}
                                        label="Model/Table Name"
                                        required={true}
                                    />
                                }
                                {isEdit &&
                                    <TextField
                                        id="primary_table"
                                        label="Model/Table Name"
                                        name="primary_table"
                                        value={bdu['bdu']['primary_table']}
                                        // className="width-form-95"
                                        inputProps={{ maxLength: 255 }}
                                        variant="outlined"
                                        disabled={true}
                                    />
                                }
                            </Grid>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Dropdown
                                    data={uploadType}
                                    name="upload_type"
                                    value={bdu['bdu']['upload_type']}
                                    onChange={(e) => this.handleSearchChange(e, 'bdu', 'upload_type')}
                                    error={fieldErrors['upload_type'] && (fieldErrors['upload_type'] === "" ? false : true)}
                                    label="Upload Type"
                                    // style={field.className}
                                    required={true}
                                />
                                {
                                    fieldErrors['upload_type'] &&
                                    <FormHelperText error={true}>{fieldErrors['upload_type']}</FormHelperText>
                                }
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12}>
                                <Paper>
                                    <TableContainer component={Paper}>
                                        <Table aria-label="customized table">
                                            <TableHead>
                                                <TableRow>
                                                    {
                                                        headings.map((row, i) => (
                                                            <StyledTableCell key={i} className={rowHeaderBackground} >
                                                                {row}
                                                            </StyledTableCell>
                                                        ))
                                                    }
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {
                                                    bdu.columns.map((row, index) => (

                                                        <StyledTableRow key={index}>
                                                            <StyledTableCell>{index + 1}</StyledTableCell>
                                                            <StyledTableCell>
                                                                {row['new'] &&
                                                                    <>
                                                                        <TextField
                                                                            className='margin-top-20'
                                                                            multiline
                                                                            value={row['schema_column']}
                                                                            error={fieldErrors['schema_column']?.[index] && (fieldErrors['schema_column']?.[index] === "" ? false : true)}
                                                                            onChange={(e) => this.handleSearchChange(e, 'columns', 'schema_column', index)}
                                                                        />
                                                                        {fieldErrors['schema_column']?.[index] &&
                                                                            <FormHelperText error={true}>{fieldErrors['schema_column']?.[index]}</FormHelperText>
                                                                        }
                                                                    </>
                                                                }
                                                                {!row['new'] &&
                                                                    row['schema_column']
                                                                }
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                <TextField
                                                                    className='margin-top-20'
                                                                    multiline
                                                                    value={row['alias']}
                                                                    disabled={row['schema_column'] == 'id' ? true : false}
                                                                    error={fieldErrors['alias']?.[index] && (fieldErrors['alias']?.[index] === "" ? false : true)}
                                                                    onChange={(e) => this.handleSearchChange(e, 'columns', 'alias', index)}
                                                                />
                                                                {
                                                                    fieldErrors['alias']?.[index] &&
                                                                    <FormHelperText error={true}>{fieldErrors['alias']?.[index]}</FormHelperText>
                                                                }
                                                            </StyledTableCell>
                                                            <StyledTableCell>{row['type']}</StyledTableCell>
                                                            <StyledTableCell>{row['max_length']}</StyledTableCell>
                                                            <StyledTableCell>
                                                                <Dropdown
                                                                    data={bduValidationList}
                                                                    name="bdu_validation_column"
                                                                    value={0}
                                                                    onChange={(e, i) => this.handleValidationChange(e, i, index, 'columns', 'bdu_validation_column')}
                                                                    label="Validation Rules"
                                                                />
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                {row['bdu_validation_column'] &&
                                                                    row['bdu_validation_column'].map((validation, i) => (
                                                                        <div >
                                                                            <label>{validation.validation_type}</label>
                                                                            <TextField
                                                                                className='margin-top-20'
                                                                                multiline
                                                                                value={validation.validation_value ? validation.validation_value : ''}
                                                                                // disabled={row['schema_column'] == 'id' ? true : false}
                                                                                // error={(0 > 1 ? true : false}
                                                                                onChange={(e) => this.handleValidationMessageChange(e, i, index, 'columns', 'bdu_validation_column')}//, row['schema_column'])}
                                                                            />
                                                                            <Fab color="secondary" aria-label="edit" onClick={() => this.delete(i, index, 'columns', 'bdu_validation_column')}>
                                                                                <DeleteIcon />
                                                                            </Fab>
                                                                        </div>
                                                                    ))
                                                                }

                                                            </StyledTableCell>
                                                            <StyledTableCell><Checkbox color='primary' checked={row['required']} onChange={(e) => this.handleCheckBoxChange(e, 'columns', 'required', index, row['required'])} /></StyledTableCell>
                                                            <StyledTableCell><Checkbox color='primary' checked={row['ignored']} onChange={(e) => this.handleCheckBoxChange(e, 'columns', 'ignored', index, row['ignored'])} /></StyledTableCell>
                                                            <StyledTableCell><Checkbox color='primary' checked={row['update_allowed']} onChange={(e) => this.handleCheckBoxChange(e, 'columns', 'update_allowed', index, row['update_allowed'])} /></StyledTableCell>
                                                            <StyledTableCell><Checkbox color='primary' checked={row['exclude_from_view']} onChange={(e) => this.handleCheckBoxChange(e, 'columns', 'exclude_from_view', index, row['exclude_from_view'])} /></StyledTableCell>
                                                            <StyledTableCell>
                                                                <DeleteIcon className="delete-icon-hover1 pointer text-red" onClick={() => this.handleDelete(index)} />
                                                            </StyledTableCell>
                                                        </StyledTableRow>

                                                    ))
                                                }
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Box>
                                        {isUserHasPermission('bdu_upload', 'create') &&
                                            <Button
                                                className={classNames('margin-top-10', 'margin-left-10', 'custom-button')}
                                                // className='submit margin-top-10'
                                                variant="contained"
                                                style={{ 'float': 'left' }}
                                                onClick={this.handleNewField}
                                            // className='editbutton-view'
                                            >
                                                Add New Field
                                            </Button>
                                        }
                                    </Box>
                                    <Box className="button-group">
                                        {bdu.columns.length > 0 &&
                                            <>
                                                <Grid container>
                                                    <Grid item md={6} xs={12} >
                                                        {isUserHasPermission('bdu_upload', 'create') &&
                                                            <Button
                                                                className={classNames('margin-top-10', 'margin-left-10')}
                                                                // className='submit margin-top-10'
                                                                variant="contained"
                                                                style={{ 'float': 'left' }}
                                                                onClick={(e) => this.export()}
                                                            // className='editbutton-view'
                                                            >
                                                                Export json
                                                            </Button>
                                                        }
                                                    </Grid>
                                                    <Grid item md={6} xs={12} >
                                                        <Button
                                                            className={classNames('submit', 'margin-top-10', 'margin-right-10')}
                                                            // className='submit margin-top-10'
                                                            variant="contained"
                                                            style={{ 'float': 'right' }}
                                                            onClick={(e) => this.submit()}>
                                                            Submit
                                                        </Button>
                                                    </Grid>
                                                </Grid>
                                            </>
                                        }
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

export default withRouter(BDUAdd);
